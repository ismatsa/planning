import { api, type ApiUser } from '@/lib/api';

export interface ProfileOption {
  id: string;
  email: string;
  company: string | null;
  name: string;
}

/** Liste des utilisateurs (remplace l'ancienne table profiles). */
export async function fetchProfiles(): Promise<ProfileOption[]> {
  const users = await api.get<ApiUser[]>('/users');
  return users
    .filter(u => u.is_active)
    .map(u => ({ id: String(u.id), email: u.login, company: u.company, name: u.name }));
}
