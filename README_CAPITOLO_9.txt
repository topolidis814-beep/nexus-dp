NEXUS MVP Capitolo 9 — DEAL
Implementazione MVP leggera, senza schema aggiuntivo:
- Liquidazioni usa listings.liquidate_fast
- Lotto completo usa listings.full_lot_price
- Accetta offerte usa listings.accepts_offers
- badge e filtri rapidi nel marketplace
La struttura esistente resta compatibile con evoluzioni future (promozioni temporanee, sconti quantità, group deal), rinviate per evitare complessità prematura.
