-- Booking Powertech — Schéma MySQL 8 (utf8mb4)
-- À importer via phpMyAdmin lors de la première installation.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  login VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','contributor') NOT NULL DEFAULT 'contributor',
  company VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id CHAR(64) PRIMARY KEY, -- sha256 du jeton
  user_id INT UNSIGNED NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (expires_at)
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(190) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (login), INDEX (ip), INDEX (attempted_at)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NULL,
  details VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE settings (
  k VARCHAR(60) PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB;

-- ---------- Référentiels atelier ----------

CREATE TABLE metiers (
  id VARCHAR(40) PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  couleur VARCHAR(40) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE postes (
  id VARCHAR(40) PRIMARY KEY,
  metier_id VARCHAR(40) NOT NULL REFERENCES metiers(id) ON DELETE CASCADE,
  nom VARCHAR(80) NOT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  color_hex CHAR(7) NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE disponibilite_postes (
  poste_id VARCHAR(40) NOT NULL REFERENCES postes(id) ON DELETE CASCADE,
  jour_semaine TINYINT NOT NULL, -- 0=dim … 6=sam
  plages JSON NOT NULL,
  duree_defaut INT NOT NULL DEFAULT 60,
  durees_autorisees JSON NOT NULL,
  tampon INT NOT NULL DEFAULT 0,
  PRIMARY KEY (poste_id, jour_semaine)
) ENGINE=InnoDB;

CREATE TABLE exception_disponibilites (
  id CHAR(36) PRIMARY KEY,
  poste_id VARCHAR(40) NOT NULL REFERENCES postes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ferme TINYINT(1) NOT NULL DEFAULT 0,
  plages_override JSON NULL
) ENGINE=InnoDB;

-- ---------- CRM ----------

CREATE TABLE clients (
  id CHAR(36) PRIMARY KEY,
  type_client ENUM('particulier','societe') NOT NULL DEFAULT 'particulier',
  nom VARCHAR(120) NULL,
  prenom VARCHAR(120) NULL,
  raison_sociale VARCHAR(190) NULL,
  ice VARCHAR(40) NULL,
  telephone VARCHAR(60) NULL,
  telephone_secondaire VARCHAR(60) NULL,
  email VARCHAR(190) NULL,
  adresse VARCHAR(255) NULL,
  ville VARCHAR(120) NULL,
  notes_internes TEXT NULL,
  statut ENUM('actif','archive') NOT NULL DEFAULT 'actif',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (nom), INDEX (raison_sociale), INDEX (telephone)
) ENGINE=InnoDB;

CREATE TABLE vehicules (
  id CHAR(36) PRIMARY KEY,
  vin VARCHAR(17) NULL UNIQUE,
  immatriculation VARCHAR(40) NULL,
  marque VARCHAR(80) NOT NULL,
  modele VARCHAR(120) NOT NULL,
  annee SMALLINT NULL,
  motorisation VARCHAR(120) NULL,
  carburant VARCHAR(40) NULL,
  boite_vitesses VARCHAR(40) NULL,
  kilometrage_actuel INT NULL,
  statut ENUM('actif','archive') NOT NULL DEFAULT 'actif',
  client_id CHAR(36) NULL REFERENCES clients(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (immatriculation), INDEX (marque, modele)
) ENGINE=InnoDB;

CREATE TABLE vehicule_proprietaires (
  id CHAR(36) PRIMARY KEY,
  vehicule_id CHAR(36) NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  client_id CHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date_debut DATETIME NOT NULL,
  date_fin DATETIME NULL,
  motif ENUM('achat','transfert','reprise','autre') NOT NULL DEFAULT 'achat',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (vehicule_id), INDEX (client_id)
) ENGINE=InnoDB;

CREATE TABLE entretiens (
  id CHAR(36) PRIMARY KEY,
  vehicule_id CHAR(36) NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  date_entretien DATE NOT NULL,
  type_entretien VARCHAR(120) NOT NULL,
  kilometrage INT NULL,
  description TEXT NULL,
  pieces_utilisees TEXT NULL,
  realise_par VARCHAR(120) NULL,
  rdv_id CHAR(36) NULL,
  devis_id CHAR(36) NULL,
  cout DECIMAL(10,2) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (vehicule_id)
) ENGINE=InnoDB;

-- ---------- Rendez-vous ----------

CREATE TABLE rendez_vous (
  id CHAR(36) PRIMARY KEY,
  poste_id VARCHAR(40) NULL REFERENCES postes(id) ON DELETE SET NULL,
  debut DATETIME NOT NULL,
  fin DATETIME NOT NULL,
  client_nom VARCHAR(190) NULL,
  client_tel VARCHAR(60) NULL,
  marque VARCHAR(80) NULL,
  modele VARCHAR(120) NULL,
  annee VARCHAR(20) NULL,
  vin VARCHAR(17) NULL,
  notes TEXT NULL,
  statut ENUM('prevu','confirme','annule','noshow','termine') NOT NULL DEFAULT 'prevu',
  billing_responsible_user_id INT UNSIGNED NULL,
  source_devis_id CHAR(36) NULL,
  client_id CHAR(36) NULL,
  vehicule_id CHAR(36) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (poste_id, debut), INDEX (debut)
) ENGINE=InnoDB;

CREATE TABLE appointment_responsibles (
  appointment_id CHAR(36) NOT NULL REFERENCES rendez_vous(id) ON DELETE CASCADE,
  user_id INT UNSIGNED NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE intervenants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  responsable_id INT UNSIGNED NULL REFERENCES users(id) ON DELETE SET NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE appointment_intervenants (
  appointment_id CHAR(36) NOT NULL REFERENCES rendez_vous(id) ON DELETE CASCADE,
  intervenant_id INT UNSIGNED NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, intervenant_id)
) ENGINE=InnoDB;

-- ---------- Devis ----------

CREATE TABLE devis (
  id CHAR(36) PRIMARY KEY,
  client_nom VARCHAR(190) NULL,
  client_tel VARCHAR(60) NULL,
  marque VARCHAR(80) NULL,
  modele VARCHAR(120) NULL,
  annee VARCHAR(20) NULL,
  vin VARCHAR(17) NULL,
  notes TEXT NULL,
  statut ENUM('demande_recue','a_chiffrer','en_cours_de_devis','en_attente_infos','devis_pret','envoye','valide','refuse','annule') NOT NULL DEFAULT 'demande_recue',
  billing_responsible_user_id INT UNSIGNED NULL,
  assigned_user_id INT UNSIGNED NULL,
  client_id CHAR(36) NULL,
  vehicule_id CHAR(36) NULL,
  sent_at DATETIME NULL,
  status_changed_at DATETIME NULL,
  follow_up_count INT NOT NULL DEFAULT 0,
  last_follow_up_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (statut)
) ENGINE=InnoDB;

CREATE TABLE devis_responsibles (
  devis_id CHAR(36) NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  user_id INT UNSIGNED NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (devis_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE devis_intervenants (
  devis_id CHAR(36) NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  intervenant_id INT UNSIGNED NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
  PRIMARY KEY (devis_id, intervenant_id)
) ENGINE=InnoDB;

CREATE TABLE devis_metiers (
  devis_id CHAR(36) NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  metier_id VARCHAR(40) NOT NULL REFERENCES metiers(id) ON DELETE CASCADE,
  PRIMARY KEY (devis_id, metier_id)
) ENGINE=InnoDB;

CREATE TABLE devis_comments (
  id CHAR(36) PRIMARY KEY,
  devis_id CHAR(36) NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  user_id INT UNSIGNED NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (devis_id)
) ENGINE=InnoDB;

-- ---------- Données initiales ----------

INSERT INTO settings (k, v) VALUES
  ('jours_ouvres', '[1,2,3,4,5,6]'),
  ('heure_min', '08:00'),
  ('heure_max', '19:00');

INSERT INTO metiers (id, nom, couleur) VALUES
  ('lavage', 'Lavage', 'lavage'),
  ('reprog', 'Reprogrammation', 'reprog'),
  ('mecanique', 'Mécanique', 'mecanique');

INSERT INTO postes (id, metier_id, nom, actif, sort_order) VALUES
  ('lavage-a', 'lavage', 'Poste A', 1, 1),
  ('lavage-b', 'lavage', 'Poste B', 1, 2),
  ('reprog-banc1', 'reprog', 'Banc 1', 1, 1),
  ('meca-pont1', 'mecanique', 'Pont 1', 1, 1),
  ('meca-pont2', 'mecanique', 'Pont 2', 1, 2),
  ('meca-pont3', 'mecanique', 'Pont 3', 1, 3);
