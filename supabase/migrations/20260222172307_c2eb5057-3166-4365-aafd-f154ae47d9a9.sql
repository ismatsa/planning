
-- Replace vehicule column with marque, modele, annee, vin
ALTER TABLE public.rendez_vous ADD COLUMN marque text;
ALTER TABLE public.rendez_vous ADD COLUMN modele text;
ALTER TABLE public.rendez_vous ADD COLUMN annee text;
ALTER TABLE public.rendez_vous ADD COLUMN vin text;

-- Migrate existing data (put old vehicule value into notes if it exists)
UPDATE public.rendez_vous SET notes = CASE 
  WHEN notes IS NOT NULL AND vehicule IS NOT NULL THEN notes || ' | Ancien véhicule: ' || vehicule
  WHEN vehicule IS NOT NULL THEN 'Ancien véhicule: ' || vehicule
  ELSE notes
END WHERE vehicule IS NOT NULL;

ALTER TABLE public.rendez_vous DROP COLUMN vehicule;
