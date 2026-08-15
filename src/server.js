import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { load, save, id } from './store.js';
import { verifyPassword, hashPassword, signSession, readSession, parseCookies } from './auth.js';
import { matchChannels } from './connectors.js';

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.resolve('public');
const rate = new Map();

function send(res, status, data, headers={}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {'content-type': typeof data === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'x-content-type-options':'nosniff', 'referrer-policy':'same-origin', ...headers});
  res.end(body);
}
function json(req) { return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>{s+=c;if(s.length>2_000_000) req.destroy();}); req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});}); }
function userFrom(req, db) { const s=readSession(parseCookies(req).nexus_session); return s ? db.users.find(u=>u.id===s.userId) || null : null; }
function requireUser(req,res,db){ const u=userFrom(req,db); if(!u) send(res,401,{error:'Autenticazione richiesta'}); return u; }
function sanitizeUser(u){ if(!u) return null; const {passwordHash,...safe}=u; return safe; }
function hit(req){ const key=req.socket.remoteAddress||'x'; const now=Date.now(); const arr=(rate.get(key)||[]).filter(t=>now-t<60_000); arr.push(now); rate.set(key,arr); return arr.length<=180; }

const server = http.createServer(async (req,res)=>{
  if (!hit(req)) return send(res,429,{error:'Troppe richieste'});
  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = load();
  if (url.pathname === '/') return send(res, 200, 'Nexus DP online');
  try {
    if (url.pathname === '/api/health') return send(res,200,{ok:true,name:'Nexus V1'});
    if (url.pathname === '/api/session' && req.method==='GET') return send(res,200,{user:sanitizeUser(userFrom(req,db))});
    if (url.pathname === '/api/register' && req.method==='POST') {
      const b=await json(req); if(!b.email||!b.password||!b.companyName||!b.vat) return send(res,400,{error:'Campi obbligatori mancanti'});
      if(db.users.some(u=>u.email.toLowerCase()===b.email.toLowerCase())) return send(res,409,{error:'Email già registrata'});
      const companyId=id('c'), userId=id('u');
      db.companies.push({id:companyId,name:b.companyName,vat:b.vat,sector:b.sector||'',city:b.city||'',province:b.province||'',ships:Boolean(b.ships),verified:false});
      db.users.push({id:userId,companyId,name:b.name||'Referente',email:b.email.toLowerCase(),phone:b.phone||'',role:'seller',passwordHash:hashPassword(b.password),createdAt:new Date().toISOString()});
      db.analytics.push({event:'registration',userId,at:new Date().toISOString()}); save(db);
      const token=signSession({userId}); return send(res,201,{ok:true},{'set-cookie':`nexus_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
    }
    if (url.pathname === '/api/login' && req.method==='POST') {
      const b=await json(req); const u=db.users.find(x=>x.email.toLowerCase()===String(b.email||'').toLowerCase());
      if(!u||!verifyPassword(b.password,u.passwordHash)) return send(res,401,{error:'Credenziali non valide'});
      const token=signSession({userId:u.id}); return send(res,200,{user:sanitizeUser(u)},{'set-cookie':`nexus_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
    }
    if (url.pathname === '/api/logout' && req.method==='POST') return send(res,200,{ok:true},{'set-cookie':'nexus_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
    if (url.pathname === '/api/listings' && req.method==='GET') {
      let list=db.listings.filter(x=>x.status==='active'); const q=(url.searchParams.get('q')||'').toLowerCase(); const cat=url.searchParams.get('category'); const lot=url.searchParams.get('lot');
      if(q) list=list.filter(x=>`${x.title} ${x.description} ${x.category} ${x.location}`.toLowerCase().includes(q)); if(cat) list=list.filter(x=>x.category===cat); if(lot==='1') list=list.filter(x=>x.fullLotPrice>0);
      return send(res,200,{items:list.map(x=>({...x,company:db.companies.find(c=>c.id===x.companyId)}))});
    }
    if (url.pathname === '/api/listings' && req.method==='POST') {
      const u=requireUser(req,res,db); if(!u) return; const b=await json(req); if(!b.title||!Number(b.quantity)||!Number(b.unitPrice)) return send(res,400,{error:'Titolo, quantità e prezzo sono obbligatori'});
      const l={id:id('l'),companyId:u.companyId,title:b.title,description:b.description||'',category:b.category||'Altro',quantity:Number(b.quantity),unit:b.unit||'pz',condition:b.condition||'Nuovo',location:b.location||'',ships:Boolean(b.ships),unitPrice:Number(b.unitPrice),minQty:Number(b.minQty||1),fullLotPrice:Number(b.fullLotPrice||0),pricingTiers:Array.isArray(b.pricingTiers)?b.pricingTiers:[],acceptsOffers:b.acceptsOffers!==false,liquidateFast:Boolean(b.liquidateFast),status:'active',images:Array.isArray(b.images)?b.images.slice(0,5):[],createdAt:new Date().toISOString(),views:0};
      db.listings.push(l); db.analytics.push({event:'listing_published',userId:u.id,listingId:l.id,at:new Date().toISOString()}); save(db); return send(res,201,l);
    }
    const listingMatch=url.pathname.match(/^\/api\/listings\/([^/]+)$/);
    if(listingMatch && req.method==='GET'){ const l=db.listings.find(x=>x.id===listingMatch[1]); if(!l) return send(res,404,{error:'Annuncio non trovato'}); l.views=(l.views||0)+1; save(db); return send(res,200,{...l,company:db.companies.find(c=>c.id===l.companyId),channels:matchChannels(l,db.channels)}); }
    if (url.pathname === '/api/my/listings' && req.method==='GET'){ const u=requireUser(req,res,db); if(!u)return; return send(res,200,{items:db.listings.filter(x=>x.companyId===u.companyId)}); }
    if (url.pathname === '/api/offers' && req.method==='POST'){
      const u=requireUser(req,res,db); if(!u)return; const b=await json(req); const l=db.listings.find(x=>x.id===b.listingId); if(!l) return send(res,404,{error:'Annuncio non trovato'}); if(l.companyId===u.companyId) return send(res,400,{error:'Non puoi fare offerte sul tuo annuncio'});
      const o={id:id('o'),listingId:l.id,buyerCompanyId:u.companyId,sellerCompanyId:l.companyId,quantity:Number(b.quantity),price:Number(b.price),message:b.message||'',status:'pending',history:[{status:'pending',price:Number(b.price),quantity:Number(b.quantity),by:u.companyId,at:new Date().toISOString()}],createdAt:new Date().toISOString()}; db.offers.push(o); db.analytics.push({event:'offer_created',userId:u.id,listingId:l.id,at:new Date().toISOString()}); save(db); return send(res,201,o);
    }
    if (url.pathname === '/api/my/offers' && req.method==='GET'){ const u=requireUser(req,res,db); if(!u)return; return send(res,200,{items:db.offers.filter(o=>o.buyerCompanyId===u.companyId||o.sellerCompanyId===u.companyId)}); }
    const offerMatch=url.pathname.match(/^\/api\/offers\/([^/]+)\/(accept|reject|counter)$/);
    if(offerMatch && req.method==='POST'){ const u=requireUser(req,res,db); if(!u)return; const o=db.offers.find(x=>x.id===offerMatch[1]); if(!o) return send(res,404,{error:'Offerta non trovata'}); const action=offerMatch[2]; const b=await json(req); if(action==='accept'){ if(u.companyId!==o.sellerCompanyId)return send(res,403,{error:'Non autorizzato'}); o.status='accepted'; o.history.push({status:'accepted',by:u.companyId,at:new Date().toISOString()}); const l=db.listings.find(x=>x.id===o.listingId); if(l){ l.quantity=Math.max(0,l.quantity-o.quantity); if(l.quantity===0) l.status='sold'; } db.analytics.push({event:'offer_accepted',userId:u.id,listingId:o.listingId,at:new Date().toISOString()}); }
      if(action==='reject'){ if(u.companyId!==o.sellerCompanyId)return send(res,403,{error:'Non autorizzato'}); o.status='rejected'; o.history.push({status:'rejected',by:u.companyId,at:new Date().toISOString()}); }
      if(action==='counter'){ if(![o.sellerCompanyId,o.buyerCompanyId].includes(u.companyId))return send(res,403,{error:'Non autorizzato'}); o.status='countered'; o.price=Number(b.price); o.quantity=Number(b.quantity||o.quantity); o.history.push({status:'countered',price:o.price,quantity:o.quantity,by:u.companyId,at:new Date().toISOString()}); }
      save(db); return send(res,200,o); }
    if(url.pathname==='/api/channels/match'&&req.method==='POST'){ const u=requireUser(req,res,db); if(!u)return; const b=await json(req); const l=db.listings.find(x=>x.id===b.listingId&&x.companyId===u.companyId); if(!l)return send(res,404,{error:'Annuncio non trovato'}); return send(res,200,{channels:matchChannels(l,db.channels)}); }
    if(url.pathname==='/api/admin/stats'&&req.method==='GET'){ const u=requireUser(req,res,db); if(!u)return; if(u.role!=='admin')return send(res,403,{error:'Admin richiesto'}); return send(res,200,{users:db.users.length,companies:db.companies.length,activeListings:db.listings.filter(x=>x.status==='active').length,offers:db.offers.length,acceptedOffers:db.offers.filter(x=>x.status==='accepted').length,events:db.analytics.length}); }
    if(url.pathname==='/api/account'&&req.method==='DELETE'){ const u=requireUser(req,res,db); if(!u)return; db.users=db.users.filter(x=>x.id!==u.id); db.companies=db.companies.filter(x=>x.id!==u.companyId); db.listings=db.listings.filter(x=>x.companyId!==u.companyId); db.offers=db.offers.filter(x=>x.buyerCompanyId!==u.companyId&&x.sellerCompanyId!==u.companyId); save(db); return send(res,200,{ok:true},{'set-cookie':'nexus_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'}); }

    const rel=url.pathname==='/'?'index.html':url.pathname.slice(1); const p=path.join(publicDir,rel); if(p.startsWith(publicDir)&&fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p); const type=ext==='.css'?'text/css':ext==='.js'?'text/javascript':ext==='.svg'?'image/svg+xml':'text/html; charset=utf-8'; res.writeHead(200,{'content-type':type}); return fs.createReadStream(p).pipe(res); }
    return send(res,404,{error:'Not found'});
  } catch (e) { console.error(e); return send(res,500,{error:'Errore interno'}); }
});
server.listen(PORT,()=>console.log(`Nexus V1 http://localhost:${PORT}`));
