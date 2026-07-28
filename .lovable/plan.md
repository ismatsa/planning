## Objectif

Ajouter un module CRM à PowerTech : fiches clients (particuliers / sociétés), véhicules identifiés par leur VIN, historique des propriétaires successifs, et carnet d'entretiens. Le véhicule devient une entité durable : un transfert de propriété ne fait perdre ni le VIN, ni les RDV, ni les devis, ni les entretiens.

Aucune donnée existante (planning, rendez-vous, demandes de devis, devis envoyés) n'est supprimée, réinitialisée ni modifiée automatiquement.

## 1. Base de données

### `clients`
`type_client` (particulier / societe), `nom`, `prenom`, `raison_sociale`, `telephone`, `telephone_secondaire`, `email`, `adresse`, `ville`, `notes_internes`, `statut` (actif / archive), `created_by`, dates automatiques.
Contrainte : `nom` requis pour un particulier, `raison_sociale` requise pour une société. Index de recherche sur téléphone, e-mail, nom / raison sociale.

### `vehicules`
`vin` (obligatoire, unique, indexé — identifiant métier principal), `immatriculation`, `marque`, `modele`, `annee`, `motorisation`, `carburant`, `boite_vitesses`, `kilometrage_actuel`, `statut` (actif / vendu / archive), `client_id` (propriétaire actuel, peut être vide), dates automatiques.

### `vehicule_proprietaires` (historique)
`vehicule_id`, `client_id`, `date_debut`, `date_fin` (vide = propriétaire actuel), `motif` (achat, vente, transfert), `created_by`. Un seul propriétaire actif à la fois par véhicule ; le changement clôture la ligne précédente et en ouvre une nouvelle — rien n'est effacé.

### `entretiens` (carnet PowerTech)
`vehicule_id`, `date_entretien`, `type_entretien` (révision, vidange, reprogrammation, lavage, réparation, autre), `kilometrage`, `description`, `pieces_utilisees`, `intervenant`/`realise_par`, `rdv_id` et `devis_id` optionnels pour relier l'entretien à son origine, `cout`, dates automatiques.

### Rattachement aux tables existantes (non destructif)
Ajout de colonnes **optionnelles** `client_id` et `vehicule_id` sur `rendez_vous` et `devis`. Les champs texte actuels (`client_nom`, `client_tel`, `marque`, `modele`, `vin`…) sont conservés tels quels et continuent d'alimenter l'affichage existant. Aucune migration automatique des anciennes lignes.

### Droits d'accès
- Lecture : tout utilisateur connecté.
- Création / modification clients, véhicules, entretiens : tout utilisateur connecté (admin et contributeur).
- Archivage (client / véhicule) et changement de propriétaire : administrateurs uniquement.
- Aucune suppression définitive n'est exposée dans cette version.

## 2. Interface

Nouvelle section « Clients » dans la barre latérale, avec deux entrées : **Clients** et **Véhicules**.

### Liste clients (`/clients`)
Recherche (nom, raison sociale, téléphone, e-mail), filtres type et statut, badge particulier/société, nombre de véhicules. Les clients archivés sont masqués par défaut.

### Fiche client (`/clients/:id`)
- En-tête : identité, contacts, WhatsApp (selon les règles de confidentialité existantes), statut.
- Onglets : Véhicules (actuels et anciennement possédés), Rendez-vous, Devis, Notes internes.
- Actions : modifier, rattacher un véhicule, créer un RDV ou une demande de devis pré-remplis, archiver (admin, confirmation explicite).
- Détection de doublons à la création : si téléphone, e-mail ou identité proche existe déjà, un avertissement listant les fiches similaires s'affiche — jamais de fusion automatique, la création reste possible.

### Liste véhicules (`/vehicules`)
Recherche par VIN, immatriculation, marque/modèle ou nom du propriétaire ; filtres statut et marque.

### Fiche véhicule (`/vehicules/:id`)
- En-tête : VIN, immatriculation, marque/modèle/année, propriétaire actuel, statut.
- Onglets : Carnet d'entretien (chronologique, ajout/édition), Rendez-vous, Devis, Historique des propriétaires (frise des périodes successives).
- Actions : modifier, ajouter un entretien, créer un RDV / une demande de devis, **changer de propriétaire** (admin uniquement, dialogue de confirmation rappelant que l'historique est conservé), archiver (admin).

### Intégration aux modules existants
Dans les formulaires RDV et devis, un sélecteur optionnel « Client » et « Véhicule » (recherche par VIN) qui pré-remplit les champs texte actuels. Si aucun client n'est choisi, le fonctionnement reste strictement identique à aujourd'hui. Les clients et véhicules archivés ne sont pas proposés par défaut.

## 3. Détails techniques

- Migration Supabase unique : enums `client_type`, `client_statut`, `vehicule_statut`, `carburant`, `boite_vitesses`, `entretien_type` ; tables ci-dessus avec `GRANT` explicites, RLS activée et policies alignées sur `has_role(auth.uid(), 'administrateur')` pour l'archivage et le changement de propriétaire ; trigger `update_updated_at_column` sur chaque table ; trigger garantissant un seul propriétaire actif ; contrainte d'unicité `UPPER(vin)` ; colonnes `client_id` / `vehicule_id` `NULL` ajoutées à `rendez_vous` et `devis`.
- Nouveaux types dans `src/types/crm.ts`, store `src/store/useCrmStore.ts` branché sur `StoreContext` à côté de `useDevisStore` (même pattern de chargement/mutation).
- Pages `src/pages/ClientsList.tsx`, `ClientDetail.tsx`, `VehiculesList.tsx`, `VehiculeDetail.tsx` ; composants `src/components/crm/` (`ClientForm`, `VehiculeForm`, `EntretienForm`, `OwnerHistory`, `DuplicateWarning`, `ClientVehiculePicker`).
- Validation zod côté client sur tous les formulaires : e-mail au bon format, VIN normalisé en majuscules, kilométrage positif, longueurs bornées ; normalisation des téléphones via l'utilitaire `+212` existant.
- Routes ajoutées dans `App.tsx`, entrées de navigation dans `AppSidebar.tsx`.

## 4. Hors périmètre de cette version

Fusion de doublons, suppression définitive, import/export de fichiers clients, rappels d'entretien automatiques.
