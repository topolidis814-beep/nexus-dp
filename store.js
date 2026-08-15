import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.js';

const file = path.resolve('data/db.json');
const seed = () => ({
  users: [
    { id:'u_admin', companyId:'c_admin', name:'Admin Nexus', email:'admin@nexus.local', phone:'', role:'admin', passwordHash:hashPassword('admin123!'), createdAt:new Date().toISOString() },
    { id:'u_vivaio', companyId:'c_vivaio', name:'Luca Verdi', email:'vivaio@nexus.local', phone:'3330000000', role:'seller', passwordHash:hashPassword('demo123!'), createdAt:new Date().toISOString() },
    { id:'u_buyer', companyId:'c_buyer', name:'Marta Rossi', email:'buyer@nexus.local', phone:'3331111111', role:'buyer', passwordHash:hashPassword('demo123!'), createdAt:new Date().toISOString() }
  ],
  companies: [
    { id:'c_admin', name:'Nexus', vat:'IT00000000000', sector:'Marketplace', city:'Milano', province:'MI', ships:true, verified:true },
    { id:'c_vivaio', name:'Vivaio Verde Demo', vat:'IT01234567890', sector:'Vivai e giardinaggio', city:'Pistoia', province:'PT', ships:true, verified:true },
    { id:'c_buyer', name:'Garden Trade Demo', vat:'IT09876543210', sector:'Distribuzione garden', city:'Bologna', province:'BO', ships:false, verified:true }
  ],
  listings: [
    { id:'l_1', companyId:'c_vivaio', title:'Lotto 300 Laurus nobilis vaso 18', description:'Alloro professionale, uniforme, pronto per rivendita o messa a dimora.', category:'Piante', quantity:300, unit:'pz', condition:'Nuovo', location:'Pistoia (PT)', ships:true, unitPrice:10, minQty:20, fullLotPrice:1800, pricingTiers:[{qty:50,price:8.5},{qty:100,price:7}], acceptsOffers:true, liquidateFast:true, status:'active', images:['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1000&q=80'], createdAt:new Date().toISOString(), views:34 },
    { id:'l_2', companyId:'c_vivaio', title:'100 vasi terracotta professionali Ø 30 cm', description:'Rimanenza di magazzino, imballati e pronti al ritiro.', category:'Giardinaggio', quantity:100, unit:'pz', condition:'Nuovo', location:'Pistoia (PT)', ships:false, unitPrice:6.9, minQty:10, fullLotPrice:500, pricingTiers:[{qty:50,price:5.5}], acceptsOffers:true, liquidateFast:false, status:'active', images:['https://images.unsplash.com/photo-1617173944883-3b20e9c4d07f?auto=format&fit=crop&w=1000&q=80'], createdAt:new Date().toISOString(), views:19 }
  ],
  offers: [], favorites: [], channels: [
    {id:'nexus', name:'Nexus', type:'B2B', country:'IT', status:'active', api:true, feed:false, autoPublish:true, inventorySync:true},
    {id:'external_demo', name:'Canale esterno non verificato', type:'B2B', country:'IT', status:'inactive', api:false, feed:false, autoPublish:false, inventorySync:false}
  ],
  channelListings: [], subscriptions: [], analytics: []
});

export function load() {
  if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(seed(), null, 2)); }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function save(db) { fs.writeFileSync(file, JSON.stringify(db, null, 2)); }
export function id(prefix) { return `${prefix}_${crypto.randomUUID().slice(0,8)}`; }
export function reset() { const db = seed(); save(db); return db; }
