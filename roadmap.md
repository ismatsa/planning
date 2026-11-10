# Roadmap — Booking Powertech sur o2switch

## Fait (v1.2.0 — booking-o2switch-v1.2.0.zip)
- [x] API SYNC sécurisée (localhost + clé) : clients, véhicules, transfert

## Fait (v1.1.0 — booking-o2switch-v1.1.0.zip)
- [x] Immatriculation : choix du pays, format marocain structuré (numéro, lettre arabe, région), validation et badge d'affichage
- [x] Migration MySQL 001_immatriculation_pays.sql + guide de mise à jour

## Fait (v1.0.0 — booking-o2switch-v1.0.0.zip)
- [x] Back-end PHP 8.3 : bootstrap, config .env, connexion MySQL (PDO)
- [x] Schéma MySQL : users, sessions, metiers, postes, rendez_vous, clients, vehicules, devis, lignes, commentaires…
- [x] Auth : login/logout/session (cookie sécurisé + CSRF), rôles admin/contributeur
- [x] Routeur REST /api/* : rendez-vous, clients, véhicules, devis, ressources, intervenants, utilisateurs
- [x] Couche API front-end (src/lib/api) remplaçant Supabase
- [x] Build front-end + .htaccess SPA + ZIP de livraison + guide d'installation

## À faire (prochaines livraisons)
- [ ] Test en conditions réelles sur o2switch (le bac à sable n'a pas de MySQL : syntaxe PHP vérifiée, logique relue, mais pas d'exécution réelle)
- [ ] Pièces jointes / photos (stockage privé PHP, comme scan)
- [ ] Points à traiter (notifications)
- [ ] Historique des modifications de RDV
- [ ] Organisation personnalisée des lignes du planning
- [ ] Assistant Powertech (Hermes) et API externe v1
- [ ] Migration des données Supabase → MySQL (export CSV puis import)
- [ ] Permissions par poste pour les contributeurs
