import { useState, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/store/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

// ... keep existing code (JOURS_LABELS)
const JOURS_LABELS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

interface Intervenant {
  id: string;
  name: string;
  created_at: string;
}

export default function Parametres() {
  const { postes, metiers, settings, setSettings, setPostes, addMetier, renameMetier, deleteMetier, addPoste, renamePoste } = useStore();
  const { isAdmin } = useAuth();

  // Add category modal
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatNom, setNewCatNom] = useState('');

  // Rename category inline
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renamingCatValue, setRenamingCatValue] = useState('');

  // Add poste modal
  const [addPosteOpen, setAddPosteOpen] = useState(false);
  const [addPosteMetierId, setAddPosteMetierId] = useState('');
  const [newPosteNom, setNewPosteNom] = useState('');

  // Rename poste inline
  const [renamingPosteId, setRenamingPosteId] = useState<string | null>(null);
  const [renamingPosteValue, setRenamingPosteValue] = useState('');

  // --- Intervenants state ---
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [addIntOpen, setAddIntOpen] = useState(false);
  const [newIntName, setNewIntName] = useState('');
  const [savingInt, setSavingInt] = useState(false);
  const [renamingIntId, setRenamingIntId] = useState<string | null>(null);
  const [renamingIntValue, setRenamingIntValue] = useState('');
  const [deleteIntTarget, setDeleteIntTarget] = useState<Intervenant | null>(null);

  // Load intervenants
  async function loadIntervenants() {
    const { data } = await supabase.from('intervenants').select('*').order('name');
    if (data) setIntervenants(data as Intervenant[]);
  }

  useEffect(() => { loadIntervenants(); }, []);

  // Add intervenant
  async function handleAddIntervenant() {
    const name = newIntName.trim();
    if (!name) return;
    if (intervenants.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Un intervenant avec ce nom existe déjà.');
      return;
    }
    setSavingInt(true);
    const { error } = await supabase.from('intervenants').insert({ name });
    setSavingInt(false);
    if (error) { toast.error('Erreur lors de l\'ajout.'); return; }
    toast.success(`Intervenant « ${name} » ajouté.`);
    setAddIntOpen(false);
    setNewIntName('');
    loadIntervenants();
  }

  // Rename intervenant
  async function handleRenameIntervenant(id: string) {
    const name = renamingIntValue.trim();
    if (!name) return;
    if (intervenants.some(i => i.id !== id && i.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Ce nom est déjà utilisé.');
      return;
    }
    const { error } = await supabase.from('intervenants').update({ name }).eq('id', id);
    if (error) { toast.error('Erreur lors du renommage.'); return; }
    toast.success('Intervenant renommé.');
    setRenamingIntId(null);
    loadIntervenants();
  }

  // Delete intervenant
  async function handleDeleteIntervenant() {
    if (!deleteIntTarget) return;
    const { error } = await supabase.from('intervenants').delete().eq('id', deleteIntTarget.id);
    if (error) { toast.error('Erreur lors de la suppression.'); return; }
    toast.success('Intervenant supprimé.');
    setDeleteIntTarget(null);
    loadIntervenants();
  }

  // ... keep existing code (toggleJour, togglePosteActif, category CRUD, poste CRUD)
  function toggleJour(jour: number) {
    setSettings(prev => ({
      ...prev,
      joursOuvres: prev.joursOuvres.includes(jour)
        ? prev.joursOuvres.filter(j => j !== jour)
        : [...prev.joursOuvres, jour].sort(),
    }));
  }

  function togglePosteActif(posteId: string) {
    setPostes(prev => prev.map(p => p.id === posteId ? { ...p, actif: !p.actif } : p));
  }

  async function handleAddCategory() {
    const nom = newCatNom.trim();
    if (!nom) return;
    if (metiers.some(m => m.nom.toLowerCase() === nom.toLowerCase())) {
      toast.error('Une catégorie avec ce nom existe déjà.');
      return;
    }
    const id = nom.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    if (metiers.some(m => m.id === id)) {
      toast.error('Un identifiant identique existe déjà.');
      return;
    }
    const ok = await addMetier({ id, nom, couleur: 'default' });
    if (ok) {
      toast.success(`Catégorie « ${nom} » ajoutée.`);
      setAddCatOpen(false);
      setNewCatNom('');
    } else {
      toast.error('Erreur lors de l\'ajout.');
    }
  }

  async function handleRenameCategory(id: string) {
    const nom = renamingCatValue.trim();
    if (!nom) return;
    if (metiers.some(m => m.id !== id && m.nom.toLowerCase() === nom.toLowerCase())) {
      toast.error('Ce nom est déjà utilisé.');
      return;
    }
    const ok = await renameMetier(id, nom);
    if (ok) {
      toast.success('Catégorie renommée.');
      setRenamingCatId(null);
    } else {
      toast.error('Erreur lors du renommage.');
    }
  }

  async function handleDeleteCategory(id: string) {
    const hasPostes = postes.some(p => p.metierId === id);
    if (hasPostes) {
      toast.error('Impossible : cette catégorie contient des postes.');
      return;
    }
    const ok = await deleteMetier(id);
    if (ok) {
      toast.success('Catégorie supprimée.');
    } else {
      toast.error('Erreur lors de la suppression.');
    }
  }

  function openAddPoste(metierId: string) {
    setAddPosteMetierId(metierId);
    setNewPosteNom('');
    setAddPosteOpen(true);
  }

  async function handleAddPoste() {
    const nom = newPosteNom.trim();
    if (!nom) return;
    const existing = postes.filter(p => p.metierId === addPosteMetierId);
    if (existing.some(p => p.nom.toLowerCase() === nom.toLowerCase())) {
      toast.error('Un poste avec ce nom existe déjà dans cette catégorie.');
      return;
    }
    const id = `${addPosteMetierId}-${nom.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
    if (postes.some(p => p.id === id)) {
      toast.error('Un identifiant identique existe déjà.');
      return;
    }
    const ok = await addPoste({ id, metierId: addPosteMetierId, nom, actif: true });
    if (ok) {
      toast.success(`Poste « ${nom} » ajouté.`);
      setAddPosteOpen(false);
      setNewPosteNom('');
    } else {
      toast.error('Erreur lors de l\'ajout.');
    }
  }

  async function handleRenamePoste(id: string) {
    const nom = renamingPosteValue.trim();
    if (!nom) return;
    const poste = postes.find(p => p.id === id);
    const siblings = postes.filter(p => p.metierId === poste?.metierId && p.id !== id);
    if (siblings.some(p => p.nom.toLowerCase() === nom.toLowerCase())) {
      toast.error('Ce nom est déjà utilisé dans cette catégorie.');
      return;
    }
    const ok = await renamePoste(id, nom);
    if (ok) {
      toast.success('Poste renommé.');
      setRenamingPosteId(null);
    } else {
      toast.error('Erreur lors du renommage.');
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration générale de l'atelier.</p>
      </div>

      <div className="grid gap-6">
        {/* Jours ouvrés */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Jours ouvrés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {JOURS_LABELS.map(j => (
              <label key={j.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={settings.joursOuvres.includes(j.value)}
                  onCheckedChange={() => toggleJour(j.value)}
                  disabled={!isAdmin}
                />
                <span className="text-sm">{j.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Plages horaires */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Plages horaires affichées</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Heure min</Label>
              <Input
                type="time"
                value={settings.heureMin}
                onChange={e => setSettings(prev => ({ ...prev, heureMin: e.target.value }))}
                className="w-32"
                disabled={!isAdmin}
              />
            </div>
            <span className="text-muted-foreground mt-4">→</span>
            <div>
              <Label className="text-xs text-muted-foreground">Heure max</Label>
              <Input
                type="time"
                value={settings.heureMax}
                onChange={e => setSettings(prev => ({ ...prev, heureMax: e.target.value }))}
                className="w-32"
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ressources */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Ressources / Postes</CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => { setNewCatNom(''); setAddCatOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />
                Catégorie
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {metiers.map(m => {
                const mPostes = postes.filter(p => p.metierId === m.id);
                return (
                  <div key={m.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {renamingCatId === m.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            value={renamingCatValue}
                            onChange={e => setRenamingCatValue(e.target.value)}
                            className="h-7 text-sm w-40"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameCategory(m.id);
                              if (e.key === 'Escape') setRenamingCatId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRenameCategory(m.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRenamingCatId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge className={`metier-${m.couleur} shrink-0`}>{m.nom}</Badge>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 ml-auto">
                              <Button
                                size="icon" variant="ghost" className="h-6 w-6"
                                onClick={() => { setRenamingCatId(m.id); setRenamingCatValue(m.nom); }}
                                title="Renommer"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {mPostes.length === 0 && (
                                <Button
                                  size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteCategory(m.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mPostes.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          {renamingPosteId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={renamingPosteValue}
                                onChange={e => setRenamingPosteValue(e.target.value)}
                                className="h-7 text-xs w-28"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenamePoste(p.id);
                                  if (e.key === 'Escape') setRenamingPosteId(null);
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleRenamePoste(p.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setRenamingPosteId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <Checkbox
                                checked={p.actif}
                                onCheckedChange={() => togglePosteActif(p.id)}
                                disabled={!isAdmin}
                              />
                              {p.nom}
                              {isAdmin && (
                                <Button
                                  size="icon" variant="ghost" className="h-5 w-5 ml-0.5"
                                  onClick={(e) => { e.preventDefault(); setRenamingPosteId(p.id); setRenamingPosteValue(p.nom); }}
                                  title="Renommer"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </label>
                          )}
                        </div>
                      ))}
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => openAddPoste(m.id)}>
                          <Plus className="h-3 w-3" />
                          Poste
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Intervenants */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Intervenants</CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => { setNewIntName(''); setAddIntOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />
                Intervenant
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {intervenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun intervenant pour le moment.</p>
            ) : (
              <div className="grid gap-1.5">
                {intervenants.map(i => (
                  <div key={i.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                    {renamingIntId === i.id ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          value={renamingIntValue}
                          onChange={e => setRenamingIntValue(e.target.value)}
                          className="h-7 text-sm w-48"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameIntervenant(i.id);
                            if (e.key === 'Escape') setRenamingIntId(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRenameIntervenant(i.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRenamingIntId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm flex-1">{i.name}</span>
                        {isAdmin && (
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => { setRenamingIntId(i.id); setRenamingIntValue(i.name); }}
                              title="Renommer"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                              onClick={() => setDeleteIntTarget(i)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={v => !v && setAddCatOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter une catégorie</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Nom de la catégorie</Label>
              <Input
                value={newCatNom}
                onChange={e => setNewCatNom(e.target.value)}
                placeholder="Ex: Carrosserie"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCatOpen(false)}>Annuler</Button>
            <Button onClick={handleAddCategory} disabled={!newCatNom.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Poste Dialog */}
      <Dialog open={addPosteOpen} onOpenChange={v => !v && setAddPosteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter un poste</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Catégorie</Label>
              <Input value={metiers.find(m => m.id === addPosteMetierId)?.nom || ''} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label>Nom du poste</Label>
              <Input
                value={newPosteNom}
                onChange={e => setNewPosteNom(e.target.value)}
                placeholder="Ex: Pont 4"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddPoste()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPosteOpen(false)}>Annuler</Button>
            <Button onClick={handleAddPoste} disabled={!newPosteNom.trim()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Intervenant Dialog */}
      <Dialog open={addIntOpen} onOpenChange={v => !v && setAddIntOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter un intervenant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Nom de l'intervenant</Label>
              <Input
                value={newIntName}
                onChange={e => setNewIntName(e.target.value)}
                placeholder="Nom de l'intervenant"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddIntervenant()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddIntOpen(false)}>Annuler</Button>
            <Button onClick={handleAddIntervenant} disabled={savingInt || !newIntName.trim()}>
              {savingInt ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Intervenant Confirmation */}
      <AlertDialog open={!!deleteIntTarget} onOpenChange={v => !v && setDeleteIntTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet intervenant ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'intervenant <strong>{deleteIntTarget?.name}</strong> sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntervenant} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
