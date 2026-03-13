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
import { PhoneInput, parsePhone, serializePhone } from '@/components/ui/phone-input';
import { useStore } from '@/store/StoreContext';
import { RendezVous, MetierType, STATUT_LABELS, StatutRdv } from '@/types';
import { format, addMinutes } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { roundToNearest15Minutes, getEventState } from '@/lib/planning';

interface Props {
  open: boolean;
  onClose: () => void;
  rdv?: RendezVous | null;
  defaultDate?: Date;
  defaultPosteId?: string;
  defaultTime?: string;
}

export default function RdvModal({ open, onClose, rdv, defaultDate, defaultPosteId, defaultTime }: Props) {
  const { postes, addRdv, updateRdv, deleteRdv, checkConflict, disponibilites, settings, metiers } = useStore();
  const isEdit = !!rdv;

  const [metierId, setMetierId] = useState<MetierType>('lavage');
  const [posteId, setPosteId] = useState('');
  const [date, setDate] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [duree, setDuree] = useState(60);
  const [heureFin, setHeureFin] = useState('');
  const [dureeJours, setDureeJours] = useState('0');
  const [dureeHeures, setDureeHeures] = useState('1');
  const [dureeMinutes, setDureeMinutes] = useState('0');
  const [clientNom, setClientNom] = useState('');
  const [clientTelCode, setClientTelCode] = useState('+212');
  const [clientTelNum, setClientTelNum] = useState('');
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
      setDateFin(format(new Date(rdv.fin), 'yyyy-MM-dd'));
      setHeureDebut(format(new Date(rdv.debut), 'HH:mm'));
      const dur = (new Date(rdv.fin).getTime() - new Date(rdv.debut).getTime()) / 60000;
      setDuree(dur);
      const j = Math.floor(dur / (24 * 60));
      const rem = dur - j * 24 * 60;
      setDureeJours(j.toString());
      setDureeHeures(Math.floor(rem / 60).toString());
      setDureeMinutes((rem % 60).toString());
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
      setDateFin(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
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

  // Compute full duration in minutes from date+time start to date+time end
  function computeTotalMinutes(startDate: string, startTime: string, endDate: string, endTime: string): number {
    if (!startDate || !startTime || !endDate || !endTime) return 0;
    const s = new Date(`${startDate}T${startTime}:00`);
    const e = new Date(`${endDate}T${endTime}:00`);
    const diff = (e.getTime() - s.getTime()) / 60000;
    return diff > 0 ? diff : 0;
  }

  function setDureeFields(totalMinutes: number) {
    const j = Math.floor(totalMinutes / (24 * 60));
    const remaining = totalMinutes - j * 24 * 60;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    setDureeJours(j.toString());
    setDureeHeures(h.toString());
    setDureeMinutes(m.toString());
    setDuree(totalMinutes);
  }

  // Sync fin date+time from duree when start changes
  const syncFinFromDuree = useCallback((startDate: string, startTime: string, totalMinutes: number) => {
    if (!startDate || !startTime) return;
    const fin = addMinutes(new Date(`${startDate}T${startTime}:00`), totalMinutes);
    setDateFin(format(fin, 'yyyy-MM-dd'));
    setHeureFin(format(fin, 'HH:mm'));
  }, []);

  // When user changes heure début or date début, recalculate fin from current durée
  useEffect(() => {
    if (heureDebut && date && duree > 0) {
      syncFinFromDuree(date, heureDebut, duree);
    }
  }, [heureDebut, date]);

  function handleDureeJoursChange(val: string) {
    const j = parseInt(val) || 0;
    const h = parseInt(dureeHeures) || 0;
    const m = parseInt(dureeMinutes) || 0;
    const total = j * 24 * 60 + h * 60 + m;
    setDureeJours(val);
    setDuree(total);
    syncFinFromDuree(date, heureDebut, total);
  }

  function handleDureeHeuresChange(val: string) {
    const j = parseInt(dureeJours) || 0;
    const h = parseInt(val) || 0;
    const m = parseInt(dureeMinutes) || 0;
    const total = j * 24 * 60 + h * 60 + m;
    setDureeHeures(val);
    setDuree(total);
    syncFinFromDuree(date, heureDebut, total);
  }

  function handleDureeMinutesChange(val: string) {
    const j = parseInt(dureeJours) || 0;
    const h = parseInt(dureeHeures) || 0;
    const m = parseInt(val) || 0;
    const total = j * 24 * 60 + h * 60 + m;
    setDureeMinutes(val);
    setDuree(total);
    syncFinFromDuree(date, heureDebut, total);
  }

  function handleHeureFinChange(val: string) {
    setHeureFin(val);
    const total = computeTotalMinutes(date, heureDebut, dateFin, val);
    setDureeFields(total);
  }

  function handleDateFinChange(val: string) {
    setDateFin(val);
    const total = computeTotalMinutes(date, heureDebut, val, heureFin);
    setDureeFields(total);
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
  // Determine if the current RDV (in edit mode) is future/en_cours/past
  // Use form values so it stays reactive to user edits
  const eventState = useMemo(() => {
    if (!rdv) return 'futur' as const;
    const debutStr = `${date}T${heureDebut}:00`;
    const finStr = `${dateFin}T${heureFin}:00`;
    return getEventState(debutStr, finStr);
  }, [rdv, date, heureDebut, dateFin, heureFin]);

  async function handleSubmit() {
    if (!posteId || !date || !heureDebut) return;

    let debut = new Date(`${date}T${heureDebut}:00`);
    let fin = new Date(`${dateFin}T${heureFin}:00`);

    // If switching to 'termine' or 'noshow' while event is en_cours, snap fin to nearest 15min
    if (
      (statut === 'termine' || statut === 'noshow') &&
      rdv &&
      getEventState(rdv.debut, rdv.fin) === 'en_cours'
    ) {
      fin = roundToNearest15Minutes(new Date());
      // Keep debut unchanged from original
      debut = new Date(rdv.debut);
    }

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
                  {metiers.map(m => (
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
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Date début</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Date fin</Label>
              <Input type="date" value={dateFin} onChange={e => handleDateFinChange(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée (j)</Label>
              <Input type="number" min="0" value={dureeJours} onChange={e => handleDureeJoursChange(e.target.value)} />
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
                {Object.entries(STATUT_LABELS).map(([k, v]) => {
                  // 'termine' only available for past or en_cours events
                  if (k === 'termine' && eventState === 'futur') return null;
                  return <SelectItem key={k} value={k}>{v}</SelectItem>;
                })}
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
