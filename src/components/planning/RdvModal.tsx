import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/StoreContext';
import { RendezVous, MetierType, METIERS, STATUT_LABELS, StatutRdv } from '@/types';
import { format, addMinutes } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  rdv?: RendezVous | null;
  defaultDate?: Date;
  defaultPosteId?: string;
  defaultTime?: string;
}

export default function RdvModal({ open, onClose, rdv, defaultDate, defaultPosteId, defaultTime }: Props) {
  const { postes, addRdv, updateRdv, deleteRdv, checkConflict, disponibilites } = useStore();
  const isEdit = !!rdv;

  const [metierId, setMetierId] = useState<MetierType>('lavage');
  const [posteId, setPosteId] = useState('');
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [duree, setDuree] = useState(60);
  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [notes, setNotes] = useState('');
  const [statut, setStatut] = useState<StatutRdv>('prevu');
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredPostes = useMemo(() => postes.filter(p => p.metierId === metierId && p.actif), [postes, metierId]);

  useEffect(() => {
    if (!open) return;
    if (rdv) {
      const poste = postes.find(p => p.id === rdv.posteId);
      setMetierId(poste?.metierId || 'lavage');
      setPosteId(rdv.posteId);
      setDate(format(new Date(rdv.debut), 'yyyy-MM-dd'));
      setHeureDebut(format(new Date(rdv.debut), 'HH:mm'));
      const dur = (new Date(rdv.fin).getTime() - new Date(rdv.debut).getTime()) / 60000;
      setDuree(dur);
      setClientNom(rdv.clientNom || '');
      setClientTel(rdv.clientTel || '');
      setVehicule(rdv.vehicule || '');
      setNotes(rdv.notes || '');
      setStatut(rdv.statut);
    } else {
      const poste = defaultPosteId ? postes.find(p => p.id === defaultPosteId) : null;
      setMetierId(poste?.metierId || 'lavage');
      setPosteId(defaultPosteId || filteredPostes[0]?.id || '');
      setDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setHeureDebut(defaultTime || '09:00');
      setDuree(60);
      setClientNom('');
      setClientTel('');
      setVehicule('');
      setNotes('');
      setStatut('prevu');
    }
    setConflict(null);
    setSaving(false);
  }, [open, rdv, defaultDate, defaultPosteId, defaultTime]);

  useEffect(() => {
    if (!isEdit) {
      const first = postes.find(p => p.metierId === metierId && p.actif);
      if (first) setPosteId(first.id);
    }
  }, [metierId, postes, isEdit]);

  const dureesAutorisees = useMemo(() => {
    const dispo = disponibilites.find(d => d.posteId === posteId);
    return dispo?.dureesAutorisees || [30, 60, 90, 120];
  }, [disponibilites, posteId]);

  async function handleSubmit() {
    if (!posteId || !date || !heureDebut) return;

    const debut = new Date(`${date}T${heureDebut}:00`);
    const fin = addMinutes(debut, duree);

    const conflicting = checkConflict(posteId, debut.toISOString(), fin.toISOString(), rdv?.id);
    if (conflicting) {
      const conflictTime = `${format(new Date(conflicting.debut), 'HH:mm')} – ${format(new Date(conflicting.fin), 'HH:mm')}`;
      setConflict(`Ce poste est occupé de ${conflictTime}. Essayez un autre créneau.`);
      return;
    }

    setSaving(true);

    if (isEdit) {
      await updateRdv({
        ...rdv!,
        posteId,
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        clientNom: clientNom || undefined,
        clientTel: clientTel || undefined,
        vehicule: vehicule || undefined,
        notes: notes || undefined,
        statut,
      });
      toast.success('Rendez-vous modifié.');
    } else {
      await addRdv({
        posteId,
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        clientNom: clientNom || undefined,
        clientTel: clientTel || undefined,
        vehicule: vehicule || undefined,
        notes: notes || undefined,
        statut,
      });
      toast.success('Rendez-vous ajouté.');
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (rdv) {
      setSaving(true);
      await deleteRdv(rdv.id);
      toast.success('Rendez-vous supprimé.');
      setSaving(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg animate-slide-in">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Métier</Label>
              <Select value={metierId} onValueChange={v => setMetierId(v as MetierType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METIERS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Poste</Label>
              <Select value={posteId} onValueChange={setPosteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredPostes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Heure début</Label>
              <Input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée</Label>
              <Select value={duree.toString()} onValueChange={v => setDuree(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dureesAutorisees.map(d => (
                    <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {conflict && (
            <div className="flex items-start gap-2 rounded-lg bg-mecanique/10 p-3 text-sm text-foreground animate-slide-in">
              <AlertCircle className="h-4 w-4 text-mecanique shrink-0 mt-0.5" />
              <span>{conflict}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Client (nom)</Label>
              <Input placeholder="Nom du client" value={clientNom} onChange={e => setClientNom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Téléphone</Label>
              <Input placeholder="06 00 00 00 00" value={clientTel} onChange={e => setClientTel(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Véhicule (immatriculation)</Label>
            <Input placeholder="AA-123-BB" value={vehicule} onChange={e => setVehicule(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Notes internes</Label>
            <Textarea placeholder="Ex: prévoir huile, carto stage 1…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Statut</Label>
            <Select value={statut} onValueChange={v => setStatut(v as StatutRdv)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto" disabled={saving}>
              Supprimer
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le rendez-vous'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
