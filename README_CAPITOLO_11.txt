NEXUS MVP Capitolo 11 — Trust & Safety
Backend:
- marketplace_reports workflow: open / reviewing / resolved / dismissed
- reviewed_by, reviewed_at, resolution
- moderation_audit append-only per le azioni di revisione
- RPC admin_review_marketplace_report protetta da controllo public.is_admin()
- moderazione listing: approved / pending_review / rejected / blocked
- nessuna cancellazione automatica del listing
- segnalazioni utente già integrate nella scheda prodotto dal Capitolo 10

Principio: segnalazione -> revisione -> decisione auditabile. I contenuti dubbi possono essere trattenuti senza cancellazione automatica.
