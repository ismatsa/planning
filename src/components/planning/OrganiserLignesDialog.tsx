import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GripVertical, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ColorPickerControl from '@/components/ColorPickerControl';
import { normalizeHex, DEFAULT_POSTE_COLOR } from '@/lib/colors';
import {
  buildGroups, defaultGroups, flattenGroups, groupsToPayload, newRowKey,
  type LayoutGroup, type LayoutRow,
} from '@/lib/planningLayout';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DragState =
  | { kind: 'row'; groupIdx: number; rowIdx: number }
  | { kind: 'group'; groupIdx: number }
  | null;

export default function OrganiserLignesDialog({ open, onClose }: Props) {
  const { postes, metiers, layoutItems, layoutVersion, savePlanningLayout } = useStore();

  const [groups, setGroups] = useState<LayoutGroup[]>([]);
  const [baseVersion, setBaseVersion] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroups(buildGroups(postes, metiers, layoutItems));
    setBaseVersion(layoutVersion);
    setDrag(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const posteById = useMemo(() => new Map(postes.map(p => [p.id, p])), [postes]);
  const metierById = useMemo(() => new Map(metiers.map(m => [m.id, m])), [metiers]);

  function moveRow(fromGroup: number, fromRow: number, toGroup: number, toRow: number) {
    // Un poste ne peut jamais quitter sa catégorie
    if (fromGroup !== toGroup) return;
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, rows: [...g.rows] }));
      const [moved] = next[fromGroup].rows.splice(fromRow, 1);
      const target = Math.max(0, Math.min(next[toGroup].rows.length, toRow));
      next[toGroup].rows.splice(target, 0, moved);
      return next;
    });
  }

  function moveGroup(from: number, to: number) {
    setGroups(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
      return next;
    });
  }

  function addSeparator(metierId: string, type: 'small_separator' | 'large_separator') {
    setGroups(prev => prev.map(g => g.metierId === metierId
      ? {
          ...g,
          rows: [...g.rows, {
            key: newRowKey('sep'),
            type,
            label: type === 'large_separator' ? '' : undefined,
          } as LayoutRow],
        }
      : g));
  }

  function removeRow(groupIdx: number, rowIdx: number) {
    setGroups(prev => prev.map((g, gi) => gi === groupIdx
      ? { ...g, rows: g.rows.filter((_, ri) => ri !== rowIdx) }
      : g));
  }

  function setLabel(groupIdx: number, rowIdx: number, label: string) {
    setGroups(prev => prev.map((g, gi) => gi === groupIdx
      ? { ...g, rows: g.rows.map((r, ri) => ri === rowIdx ? { ...r, label } : r) }
      : g));
  }

  async function handleSave() {
    setSaving(true);
    const res = await savePlanningLayout(groupsToPayload(groups), baseVersion);
    setSaving(false);
    if (res.ok) {
      toast.success('Organisation du planning enregistrée.');
      onClose();
      return;
    }
    if (res.conflict) { setConflictOpen(true); return; }
    toast.error(res.error || "Erreur lors de l'enregistrement.");
  }

  function reloadLatest() {
    setGroups(buildGroups(postes, metiers, layoutItems));
    setBaseVersion(layoutVersion);
    setConflictOpen(false);
    toast.info('Dernière organisation rechargée.');
  }

  const preview = flattenGroups(groups);

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Organisation des lignes du planning</DialogTitle>
            <DialogDescription>
              Glissez-déposez les postes à l'intérieur de leur catégorie, ou déplacez un bloc catégorie entier.
              Les catégories des postes ne sont jamais modifiées ici.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Ajouter un séparateur
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Petit séparateur</DropdownMenuLabel>
                {groups.map(g => (
                  <DropdownMenuItem key={`s-${g.metierId}`} onClick={() => addSeparator(g.metierId, 'small_separator')}>
                    {metierById.get(g.metierId)?.nom ?? g.metierId}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Grand séparateur</DropdownMenuLabel>
                {groups.map(g => (
                  <DropdownMenuItem key={`l-${g.metierId}`} onClick={() => addSeparator(g.metierId, 'large_separator')}>
                    {metierById.get(g.metierId)?.nom ?? g.metierId}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Réinitialiser l'organisation
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden flex-1">
            {/* Éditeur */}
            <div className="md:col-span-3 overflow-y-auto pr-1 space-y-4">
              {groups.map((group, gi) => {
                const metier = metierById.get(group.metierId);
                return (
                  <div
                    key={group.metierId}
                    className="rounded-lg border bg-card"
                    onDragOver={e => {
                      if (drag?.kind === 'group') { e.preventDefault(); }
                    }}
                    onDrop={e => {
                      if (drag?.kind === 'group') {
                        e.preventDefault();
                        moveGroup(drag.groupIdx, gi);
                        setDrag(null);
                      }
                    }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40 rounded-t-lg cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() => setDrag({ kind: 'group', groupIdx: gi })}
                      onDragEnd={() => setDrag(null)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{metier?.nom ?? group.metierId}</span>
                      <Badge variant="secondary" className="text-[10px]">Catégorie</Badge>
                    </div>

                    <div className="p-2 space-y-1">
                      {group.rows.map((row, ri) => {
                        const poste = row.posteId ? posteById.get(row.posteId) : undefined;
                        return (
                          <div
                            key={row.key}
                            draggable
                            onDragStart={e => { e.stopPropagation(); setDrag({ kind: 'row', groupIdx: gi, rowIdx: ri }); }}
                            onDragEnd={() => setDrag(null)}
                            onDragOver={e => {
                              if (drag?.kind === 'row' && drag.groupIdx === gi) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onDrop={e => {
                              if (drag?.kind === 'row' && drag.groupIdx === gi) {
                                e.preventDefault();
                                e.stopPropagation();
                                moveRow(drag.groupIdx, drag.rowIdx, gi, ri);
                                setDrag(null);
                              }
                            }}
                            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 bg-background cursor-grab active:cursor-grabbing ${
                              row.type === 'large_separator' ? 'border-dashed py-3' : row.type === 'small_separator' ? 'border-dashed py-1' : ''
                            }`}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                            {row.type === 'poste' && poste && (
                              <>
                                <span
                                  className="h-3 w-3 rounded-full shrink-0 border"
                                  style={{ backgroundColor: poste.colorHex || 'hsl(var(--muted-foreground))' }}
                                />
                                <span className="text-sm font-medium truncate">{poste.nom}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {metier?.nom ?? group.metierId}
                                </Badge>
                                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Poste</span>
                              </>
                            )}

                            {row.type === 'small_separator' && (
                              <>
                                <Minus className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Petit séparateur</span>
                                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7"
                                  onClick={() => removeRow(gi, ri)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            )}

                            {row.type === 'large_separator' && (
                              <>
                                <Input
                                  value={row.label ?? ''}
                                  onChange={e => setLabel(gi, ri, e.target.value)}
                                  placeholder="Libellé (ex. Préparation, Ponts…)"
                                  className="h-8 text-xs"
                                  onDragStart={e => e.preventDefault()}
                                />
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                                  Grand
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => removeRow(gi, ri)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Zone de dépôt en fin de groupe */}
                      <div
                        className="h-3 rounded"
                        onDragOver={e => { if (drag?.kind === 'row' && drag.groupIdx === gi) e.preventDefault(); }}
                        onDrop={e => {
                          if (drag?.kind === 'row' && drag.groupIdx === gi) {
                            e.preventDefault();
                            moveRow(drag.groupIdx, drag.rowIdx, gi, group.rows.length);
                            setDrag(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aperçu */}
            <div className="md:col-span-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Aperçu du planning
              </p>
              <div className="space-y-1">
                {preview.map(({ row, metierId }) => {
                  if (row.type === 'small_separator') {
                    return <div key={row.key} className="h-px bg-border my-1" />;
                  }
                  if (row.type === 'large_separator') {
                    return (
                      <div key={row.key} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-y border-dashed my-1">
                        {row.label?.trim() || '—'}
                      </div>
                    );
                  }
                  const poste = row.posteId ? posteById.get(row.posteId) : undefined;
                  if (!poste) return null;
                  return (
                    <div key={row.key} className="flex items-center gap-2 text-xs py-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 border"
                        style={{ backgroundColor: poste.colorHex || 'hsl(var(--muted-foreground))' }}
                      />
                      <span className="truncate">{poste.nom}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {metierById.get(metierId)?.nom}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : "Enregistrer l'organisation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser l'organisation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'ordre initial dérivé des catégories et de l'ordre des postes sera restauré,
              et les séparateurs ajoutés seront retirés. Rien n'est enregistré avant de cliquer sur « Enregistrer l'organisation ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setGroups(defaultGroups(postes, metiers))}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organisation plus récente détectée</AlertDialogTitle>
            <AlertDialogDescription>
              Un autre utilisateur a enregistré une organisation du planning pendant votre édition.
              Vos modifications n'ont pas été enregistrées pour ne pas écraser les siennes.
              Vous pouvez recharger la dernière organisation puis réappliquer vos changements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder mes modifications</AlertDialogCancel>
            <AlertDialogAction onClick={reloadLatest}>Recharger la dernière organisation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
