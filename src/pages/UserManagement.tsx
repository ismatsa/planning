import { useState, useEffect } from 'react';
import { api, type ApiUser } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

export default function UserManagement() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'contributor'>('contributor');
  const [newCompany, setNewCompany] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'contributor'>('contributor');
  const [editCompany, setEditCompany] = useState('');
  const [editPassword, setEditPassword] = useState('');

  async function loadUsers() {
    try {
      const data = await api.get<ApiUser[]>('/users');
      setUsers(data);
    } catch {
      toast.error('Impossible de charger les utilisateurs.');
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  function resetCreateForm() {
    setNewName('');
    setNewLogin('');
    setNewPassword('');
    setNewRole('contributor');
    setNewCompany('');
  }

  async function handleCreate() {
    if (!newName || !newLogin || !newPassword) return;
    setSaving(true);
    try {
      await api.post('/users', {
        name: newName,
        login: newLogin,
        password: newPassword,
        role: newRole,
        company: newCompany || null,
      });
      toast.success('Utilisateur créé avec succès.');
      setCreateOpen(false);
      resetCreateForm();
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la création');
    }
    setSaving(false);
  }

  async function handleToggleActive(user: ApiUser) {
    try {
      await api.patch(`/users/${user.id}`, { is_active: user.is_active ? 0 : 1 });
      toast.success(user.is_active ? 'Utilisateur désactivé.' : 'Utilisateur réactivé.');
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.del(`/users/${deleteTarget.id}`);
      toast.success('Utilisateur supprimé.');
      setDeleteTarget(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
    setSaving(false);
  }

  function openEdit(user: ApiUser) {
    setEditUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditCompany(user.company || '');
    setEditPassword('');
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        role: editRole,
        company: editCompany || null,
      };
      if (editPassword.length >= 8) payload.password = editPassword;
      await api.patch(`/users/${editUser.id}`, payload);
      toast.success('Utilisateur mis à jour.');
      setEditUser(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
    setSaving(false);
  }

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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Identifiant</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Société</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Rôle</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.login}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.company || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={u.role === 'admin' ? 'bg-primary/10 text-primary' : ''}>
                      {u.role === 'admin' ? 'Administrateur' : 'Contributeur'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleActive(u)} title={u.is_active ? 'Désactiver' : 'Réactiver'}>
                        {u.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
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
              <Label>Nom complet</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Prénom Nom" />
            </div>
            <div className="grid gap-1.5">
              <Label>Identifiant</Label>
              <Input value={newLogin} onChange={e => setNewLogin(e.target.value)} placeholder="ex. ismail" autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label>Mot de passe initial</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" />
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
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="contributor">Contributeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !newName || !newLogin || newPassword.length < 8}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{editUser?.login}</p>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nom complet</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Société</Label>
              <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Nom de la société" />
            </div>
            <div className="grid gap-1.5">
              <Label>Rôle</Label>
              <Select value={editRole} onValueChange={v => setEditRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="contributor">Contributeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Nouveau mot de passe (optionnel)</Label>
              <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName}>
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
              L'utilisateur <strong>{deleteTarget?.name}</strong> sera définitivement supprimé. Cette action est irréversible.
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
