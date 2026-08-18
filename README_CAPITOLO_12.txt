NEXUS MVP Capitolo 12 — Performance
Frontend:
- immagini lazy + decoding async
- ricerca debounce 120ms
- cache/guard breve per evitare richieste marketplace duplicate
- rendering e filtri restano client-side sul set MVP corrente
- content visibility per media/card

Backend audit:
- RPC marketplace_feed, offer_inbox e my_transactions già paginati con limit/offset
- indici esistenti verificati; nessuna migrazione speculativa aggiunta senza evidenza di query lenta
- prossimo capitolo: regression test completo, dove eventuali colli di bottiglia reali verranno trattati sulla base dei test.
