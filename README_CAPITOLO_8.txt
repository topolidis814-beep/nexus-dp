NEXUS MVP Capitolo 8
Transazioni visuali con foto prodotto, titolo, buyer/seller, quantità, prezzo concordato, totale, data e stato italiano.
Usa my_transactions e mantiene i riferimenti offer_id/listing_id già protetti dal database.
Il backend possiede UNIQUE(offer_id), FK RESTRICT e controlli quantità/prezzo; accept_offer_atomic scala stock sotto lock.
