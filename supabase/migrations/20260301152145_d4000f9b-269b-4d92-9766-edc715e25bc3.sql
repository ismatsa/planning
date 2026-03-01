
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('administrateur', 'contributeur');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Create user_permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poste_id text NOT NULL REFERENCES public.postes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, poste_id)
);

-- 5. Add created_by to rendez_vous
ALTER TABLE public.rendez_vous ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. RLS policies for profiles
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));

-- 8. RLS policies for user_roles
CREATE POLICY "Authenticated can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));

-- 9. RLS policies for user_permissions
CREATE POLICY "Authenticated can read permissions" ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert permissions" ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can update permissions" ON public.user_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Admins can delete permissions" ON public.user_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrateur'));

-- 10. Migrate existing users: create profiles and assign admin role
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 11. Set created_by for existing RDVs to the first existing user
UPDATE public.rendez_vous SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
