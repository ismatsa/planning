# Roadmap — Booking Powertech sur o2switch

## Objectif
Application vierge (aucune migration de données) hébergée sur o2switch :
- Front-end SPA React compilé (booking.powertech.ma)
- Back-end privé PHP 8.3 + MySQL (architecture inspirée du projet « scan »)
- Livraison en ZIP à extraire + guide d'installation

## Tâches
- [ ] Back-end PHP : bootstrap, config, connexion MySQL (PDO)
- [ ] Schéma MySQL : users, sessions, metiers, postes, rendez_vous, clients, vehicules, devis…
- [ ] Auth : login/logout/session (cookie sécurisé), rôles admin/contributor
- [ ] Routeur REST /api/* : rendez-vous, clients, véhicules, devis, ressources
- [ ] Couche API front-end (src/lib/api) remplaçant Supabase
- [ ] Build front-end + .htaccess SPA
- [ ] ZIP de livraison + guide d'installation o2switch

## Plus tard (hors scope actuel)
- Migration des données Supabase → MySQL
- Pièces jointes / stockage privé
- Assistant Hermes, API v1 externe
