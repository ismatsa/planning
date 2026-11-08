-- Booking Powertech v1.1.0 — pays associé à l'immatriculation.
-- À importer une seule fois dans phpMyAdmin sur une installation v1.0.0 existante.
ALTER TABLE vehicules
  ADD COLUMN immatriculation_pays CHAR(2) NULL DEFAULT 'MA' AFTER immatriculation;

UPDATE vehicules SET immatriculation_pays = 'MA' WHERE immatriculation_pays IS NULL;
