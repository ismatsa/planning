
-- ENUMS
CREATE TYPE public.client_type AS ENUM ('particulier','societe');
CREATE TYPE public.client_statut AS ENUM ('actif','archive');
CREATE TYPE public.vehicule_statut AS ENUM ('actif','vendu','archive');
CREATE TYPE public.carburant_type AS ENUM ('essence','diesel','hybride','electrique','gpl','autre');
CREATE TYPE public.boite_vitesses_type AS ENUM ('manuelle','automatique','autre');
CREATE TYPE public.entretien_type AS ENUM ('revision','vidange','reprogrammation','lavage','reparation','autre');
CREATE TYPE public.proprietaire_motif AS ENUM ('achat','vente','transfert','autre');

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_client public.client_type NOT NULL DEFAULT 'particulier',
  nom text,
  prenom text,
  raison_sociale text,
  telephone text NOT NULL,
  telephone_secondaire text,
  email text,
  adresse text,
  ville text,
  notes_internes text,
  statut public.client_statut NOT NULL DEFAULT 'actif',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_identite_check CHECK (
    (type_client = 'particulier' AND nom IS NOT NULL AND length(trim(nom)) > 0)
    OR (type_client = 'societe' AND raison_sociale IS NOT NULL AND length(trim(raison_sociale)) > 0)
  )
);
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    statut = 'actif' OR public.has_role(auth.uid(), 'administrateur')
  );
CREATE INDEX idx_clients_telephone ON public.clients (telephone);
CREATE INDEX idx_clients_email ON public.clients (lower(email));
CREATE INDEX idx_clients_nom ON public.clients (lower(coalesce(nom,'') || ' ' || coalesce(raison_sociale,'')));
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VEHICULES
CREATE TABLE public.vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin text NOT NULL,
  immatriculation text,
  marque text NOT NULL,
  modele text NOT NULL,
  annee integer,
  motorisation text,
  carburant public.carburant_type,
  boite_vitesses public.boite_vitesses_type,
  kilometrage_actuel integer CHECK (kilometrage_actuel IS NULL OR kilometrage_actuel >= 0),
  statut public.vehicule_statut NOT NULL DEFAULT 'actif',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vehicules TO authenticated;
GRANT ALL ON public.vehicules TO service_role;
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read vehicules" ON public.vehicules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create vehicules" ON public.vehicules FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update vehicules" ON public.vehicules FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE UNIQUE INDEX idx_vehicules_vin_unique ON public.vehicules (upper(vin));
CREATE INDEX idx_vehicules_immat ON public.vehicules (upper(coalesce(immatriculation,'')));
CREATE INDEX idx_vehicules_client ON public.vehicules (client_id);
CREATE TRIGGER trg_vehicules_updated_at BEFORE UPDATE ON public.vehicules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HISTORIQUE PROPRIETAIRES
CREATE TABLE public.vehicule_proprietaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_debut timestamptz NOT NULL DEFAULT now(),
  date_fin timestamptz,
  motif public.proprietaire_motif NOT NULL DEFAULT 'achat',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vehicule_proprietaires TO authenticated;
GRANT ALL ON public.vehicule_proprietaires TO service_role;
ALTER TABLE public.vehicule_proprietaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read owners" ON public.vehicule_proprietaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create owners" ON public.vehicule_proprietaires FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update owners" ON public.vehicule_proprietaires FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur')) WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE UNIQUE INDEX idx_vehicule_proprietaire_actif ON public.vehicule_proprietaires (vehicule_id) WHERE date_fin IS NULL;
CREATE INDEX idx_vehicule_proprietaires_client ON public.vehicule_proprietaires (client_id);

-- ENTRETIENS
CREATE TABLE public.entretiens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  date_entretien date NOT NULL DEFAULT current_date,
  type_entretien public.entretien_type NOT NULL DEFAULT 'revision',
  kilometrage integer CHECK (kilometrage IS NULL OR kilometrage >= 0),
  description text,
  pieces_utilisees text,
  realise_par uuid,
  rdv_id uuid REFERENCES public.rendez_vous(id) ON DELETE SET NULL,
  devis_id uuid REFERENCES public.devis(id) ON DELETE SET NULL,
  cout numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.entretiens TO authenticated;
GRANT ALL ON public.entretiens TO service_role;
ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read entretiens" ON public.entretiens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create entretiens" ON public.entretiens FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update entretiens" ON public.entretiens FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_entretiens_vehicule ON public.entretiens (vehicule_id, date_entretien DESC);
CREATE TRIGGER trg_entretiens_updated_at BEFORE UPDATE ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LIENS OPTIONNELS SUR L'EXISTANT
ALTER TABLE public.rendez_vous
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL;
ALTER TABLE public.devis
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL;
CREATE INDEX idx_rendez_vous_vehicule ON public.rendez_vous (vehicule_id);
CREATE INDEX idx_devis_vehicule ON public.devis (vehicule_id);
