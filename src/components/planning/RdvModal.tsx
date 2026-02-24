import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const { postes, addRdv, updateRdv, deleteRdv, checkConflict, disponibilites, settings } = useStore();
  const isEdit = !!rdv;

  const [metierId, setMetierId] = useState<MetierType>('lavage');
  const [posteId, setPosteId] = useState('');
  const [date, setDate] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [duree, setDuree] = useState(60);
  const [heureFin, setHeureFin] = useState('');
  const [dureeHeures, setDureeHeures] = useState('1');
  const [dureeMinutes, setDureeMinutes] = useState('0');
  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [annee, setAnnee] = useState('');
  const [vin, setVin] = useState('');
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
      setDureeHeures(Math.floor(dur / 60).toString());
      setDureeMinutes((dur % 60).toString());
      setHeureFin(format(new Date(rdv.fin), 'HH:mm'));
      setClientNom(rdv.clientNom || '');
      setClientTel(rdv.clientTel || '');
      setMarque(rdv.marque || '');
      setModele(rdv.modele || '');
      setAnnee(rdv.annee || '');
      setVin(rdv.vin || '');
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
      setMarque('');
      setModele('');
      setAnnee('');
      setVin('');
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

  // Sync heureFin when heureDebut or duree changes
  const syncFinFromDuree = useCallback((start: string, minutes: number) => {
    if (!start) return;
    const fin = addMinutes(new Date(`2000-01-01T${start}:00`), minutes);
    setHeureFin(format(fin, 'HH:mm'));
  }, []);

  // When user changes heure début, recalculate heure fin from current durée
  useEffect(() => {
    if (heureDebut && duree > 0) {
      syncFinFromDuree(heureDebut, duree);
    }
  }, [heureDebut]);

  function handleDureeHeuresChange(val: string) {
    const h = parseInt(val) || 0;
    const m = parseInt(dureeMinutes) || 0;
    const total = h * 60 + m;
    setDureeHeures(val);
    setDuree(total);
    syncFinFromDuree(heureDebut, total);
  }

  function handleDureeMinutesChange(val: string) {
    const h = parseInt(dureeHeures) || 0;
    const m = parseInt(val) || 0;
    const total = h * 60 + m;
    setDureeMinutes(val);
    setDuree(total);
    syncFinFromDuree(heureDebut, total);
  }

  function handleHeureFinChange(val: string) {
    setHeureFin(val);
    if (!heureDebut || !val) return;
    const start = new Date(`2000-01-01T${heureDebut}:00`);
    const end = new Date(`2000-01-01T${val}:00`);
    let diff = (end.getTime() - start.getTime()) / 60000;
    if (diff <= 0) diff = 0;
    setDuree(diff);
    setDureeHeures(Math.floor(diff / 60).toString());
    setDureeMinutes((diff % 60).toString());
  }

  // Generate quarter-hour options based on business hours
  const timeSlotOptions = useMemo(() => {
    const options: string[] = [];
    const [minH, minM] = settings.heureMin.split(':').map(Number);
    const [maxH, maxM] = settings.heureMax.split(':').map(Number);
    const startMin = minH * 60 + minM;
    const endMin = maxH * 60 + maxM;
    for (let t = startMin; t <= endMin; t += 15) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
    return options;
  }, [settings.heureMin, settings.heureMax]);
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
        marque: marque || undefined,
        modele: modele || undefined,
        annee: annee || undefined,
        vin: vin || undefined,
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
        marque: marque || undefined,
        modele: modele || undefined,
        annee: annee || undefined,
        vin: vin || undefined,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Heure début</Label>
              <Select value={heureDebut} onValueChange={setHeureDebut}>
                <SelectTrigger><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent className="max-h-48 bg-popover z-50">
                  {timeSlotOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Heure fin</Label>
              <Select value={heureFin} onValueChange={handleHeureFinChange}>
                <SelectTrigger><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent className="max-h-48 bg-popover z-50">
                  {timeSlotOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée (h)</Label>
              <Input type="number" min="0" max="23" value={dureeHeures} onChange={e => handleDureeHeuresChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée (min)</Label>
              <Input type="number" min="0" step="15" value={dureeMinutes} onChange={e => handleDureeMinutesChange(e.target.value)} />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Marque</Label>
              <Input placeholder="Ex: BMW" value={marque} onChange={e => setMarque(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Modèle</Label>
              <Input placeholder="Ex: Série 3" value={modele} onChange={e => setModele(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Année</Label>
              <Input placeholder="Ex: 2020" value={annee} onChange={e => setAnnee(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">VIN</Label>
              <Input placeholder="N° de châssis" value={vin} onChange={e => setVin(e.target.value)} />
            </div>
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
