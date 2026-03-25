import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/StoreContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ban, CheckCircle } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  company: string | null;
  role: 'administrateur' | 'contributeur';
  active: boolean;
  posteIds: string[];
}

export default function UserManagement() {
  const { postes, metiers } = useStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrateur' | 'contributeur'>('contributeur');
  const [newPosteIds, setNewPosteIds] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');

  // Edit form
  const [editPosteIds, setEditPosteIds] = useState<string[]>([]);
  const [editCompany, setEditCompany] = useState('');

  async function loadUsers() {
    const [profilesRes, rolesRes, permsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('user_permissions').select('*'),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const perms = permsRes.data || [];

    const merged: UserRow[] = profiles.map((p: any) => ({
      id: p.id,
      email: p.email,
      company: p.company || null,
      role: (roles.find((r: any) => r.user_id === p.id)?.role as 'administrateur' | 'contributeur') || 'contributeur',
      active: p.active,
      posteIds: perms.filter((perm: any) => perm.user_id === p.id).map((perm: any) => perm.poste_id),
    }));

    setUsers(merged);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  function resetCreateForm() {
    setNewEmail('');
    setNewPassword('');
    setNewRole('contributeur');
    setNewPosteIds([]);
    setNewCompany('');
  }

  async function handleCreate() {
    if (!newEmail || !newPassword) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', email: newEmail, password: newPassword, role: newRole, poste_ids: newRole === 'contributeur' ? newPosteIds : [], company: newCompany || null },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur lors de la création');
      return;
    }
    toast.success('Utilisateur créé avec succès.');
    setCreateOpen(false);
    resetCreateForm();
    loadUsers();
  }

  async function handleToggleActive(user: UserRow) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update', user_id: user.id, active: !user.active },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur');
      return;
    }
    toast.success(user.active ? 'Utilisateur désactivé.' : 'Utilisateur réactivé.');
    loadUsers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', user_id: deleteTarget.id },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur');
      return;
    }
    toast.success('Utilisateur et ses RDV supprimés.');
    setDeleteTarget(null);
    loadUsers();
  }

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditPosteIds(user.posteIds);
    setEditCompany(user.company || '');
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update', user_id: editUser.id, poste_ids: editPosteIds, company: editCompany || null },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erreur');
      return;
    }
    toast.success('Permissions mises à jour.');
    setEditUser(null);
    loadUsers();
  }

  function togglePoste(posteId: string, checked: boolean, target: 'new' | 'edit') {
    const setter = target === 'new' ? setNewPosteIds : setEditPosteIds;
    setter(prev => checked ? [...prev, posteId] : prev.filter(id => id !== posteId));
  }

  function getPosteNames(ids: string[]) {
    return ids.map(id => postes.find(p => p.id === id)?.nom || id).join(', ');
  }

  const PosteSelector = ({ selected, onChange }: { selected: string[]; onChange: (id: string, checked: boolean) => void }) => (
    <div className="grid gap-2 max-h-48 overflow-auto border rounded-lg p-3">
      {metiers.map(m => {
        const mPostes = postes.filter(p => p.metierId === m.id);
        if (mPostes.length === 0) return null;
        return (
          <div key={m.id}>
            <p className="text-xs font-semibold text-muted-foreground mb-1">{m.nom}</p>
            {mPostes.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={(v) => onChange(p.id, !!v)} />
                {p.nom}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un utilisateur
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Chargement…</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Société</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Rôle</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Postes autorisés</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.company || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={u.role === 'administrateur' ? 'bg-primary/10 text-primary' : ''}>
                      {u.role === 'administrateur' ? 'Administrateur' : 'Contributeur'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={u.active ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'}>
                      {u.active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">
                    {u.role === 'administrateur' ? 'Tous les postes' : (getPosteNames(u.posteIds) || 'Aucun')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleActive(u)} title={u.active ? 'Désactiver' : 'Réactiver'}>
                        {u.active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(u)} title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) { setCreateOpen(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Créer un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>Mot de passe initial</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" />
            </div>
            <div className="grid gap-1.5">
              <Label>Société</Label>
              <Input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Nom de la société" />
            </div>
            <div className="grid gap-1.5">
              <Label>Rôle</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrateur">Administrateur</SelectItem>
                  <SelectItem value="contributeur">Contributeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === 'contributeur' && (
              <div className="grid gap-1.5">
                <Label>Postes autorisés</Label>
                <PosteSelector selected={newPosteIds} onChange={(id, checked) => togglePoste(id, checked, 'new')} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !newEmail || !newPassword}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{editUser?.email}</p>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Société</Label>
              <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Nom de la société" />
            </div>
            {editUser?.role === 'contributeur' && (
              <div className="grid gap-1.5">
                <Label>Postes autorisés</Label>
                <PosteSelector selected={editPosteIds} onChange={(id, checked) => togglePoste(id, checked, 'edit')} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur <strong>{deleteTarget?.email}</strong> et tous ses rendez-vous seront définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
