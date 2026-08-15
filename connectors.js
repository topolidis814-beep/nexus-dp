export class NexusConnector {
  id = 'nexus';
  async publish(listing) { return { ok:true, externalId:listing.id, url:`/listing/${listing.id}` }; }
  async updateInventory(externalId, quantity) { return { ok:true, externalId, quantity }; }
}

export class InactiveExternalConnector {
  constructor(config) { this.config = config; this.id = config.id; }
  async publish() { return { ok:false, reason:'Connector non attivo: richiede API/feed/partnership ufficiale verificata.' }; }
  async updateInventory() { return { ok:false, reason:'Connector non attivo.' }; }
}

export function matchChannels(listing, channels) {
  return channels.map(c => ({
    ...c,
    score: c.status === 'active' ? 100 : 20,
    compatible: c.status === 'active' || c.status === 'inactive',
    reason: c.status === 'active' ? 'Pubblicazione disponibile' : 'Canale candidato: integrazione da verificare prima dell’attivazione'
  })).sort((a,b)=>b.score-a.score);
}
