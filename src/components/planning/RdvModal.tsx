import { useState, useEffect, useMemo, useCallback } from 'react';
import DevisAttachments from '@/components/devis/DevisAttachments';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { PhoneInput, parsePhone, serializePhone } from '@/components/ui/phone-input';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/store/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RendezVous, MetierType, STATUT_LABELS, StatutRdv } from '@/types';
import { format, addMinutes } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle, Eye, X } from 'lucide-react';
import { roundToNearest15Minutes, getEventState } from '@/lib/planning';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Props {
  open: boolean;
  onClose: () => void;
  rdv?: RendezVous | null;
  readOnly?: boolean;
  defaultDate?: Date;
  defaultPosteId?: string;
  defaultTime?: string;
  prefillFromDevis?: any;
}

interface ProfileOption {
  id: string;
  email: string;
  company: string;
}

interface IntervenantOption {
  id: string;
  name: string;
}

export default function RdvModal({ open, onClose, rdv, readOnly, defaultDate, defaultPosteId, defaultTime, prefillFromDevis }: Props) {
  const { postes, addRdv, updateRdv, deleteRdv, checkConflict, disponibilites, settings, metiers, appointmentResponsibles, appointmentIntervenants } = useStore();
  const { user } = useAuth();
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

  // Responsable & Intervenant
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([]);
  const [selectedIntervenants, setSelectedIntervenants] = useState<string[]>([]);
  const [billingResponsible, setBillingResponsible] = useState<string>('');
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [intervenantOptions, setIntervenantOptions] = useState<IntervenantOption[]>([]);

  const filteredPostes = useMemo(() => postes.filter(p => p.metierId === metierId && p.actif), [postes, metierId]);

  // Load profile options (users with company) and intervenant options
  useEffect(() => {
    if (!open) return;
    async function loadOptions() {
      const [profilesRes, intervenantsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, company'),
        supabase.from('intervenants').select('id, name').order('name'),
      ]);
      if (profilesRes.data) {
        setProfileOptions(
          (profilesRes.data as any[])
            .filter(p => p.company && p.company.trim() !== '')
            .map(p => ({ id: p.id, email: p.email, company: p.company }))
        );
      }
      if (intervenantsRes.data) {
        setIntervenantOptions((intervenantsRes.data as any[]).map(i => ({ id: i.id, name: i.name })));
      }
    }
    loadOptions();
  }, [open]);

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
      const parsed = parsePhone(rdv.clientTel || '');
      setClientTelCode(parsed.countryCode);
      setClientTelNum(parsed.number);
      setMarque(rdv.marque || '');
      setModele(rdv.modele || '');
      setAnnee(rdv.annee || '');
      setVin(rdv.vin || '');
      setNotes(rdv.notes || '');
      setStatut(rdv.statut);
      // Load pivot data
      setSelectedResponsibles(appointmentResponsibles[rdv.id] || []);
      setSelectedIntervenants(appointmentIntervenants[rdv.id] || []);
      setBillingResponsible(rdv.billingResponsibleUserId || '');
    } else {
      // Prefill from devis conversion if available
      const devis = prefillFromDevis;
      const poste = defaultPosteId ? postes.find(p => p.id === defaultPosteId) : null;
      
      if (devis) {
        // If devis has a single metier, use it; otherwise default
        const devisMetierIds = devis.metierIds || [];
        if (devisMetierIds.length === 1) {
          setMetierId(devisMetierIds[0]);
          const firstPoste = postes.find(p => p.metierId === devisMetierIds[0] && p.actif);
          setPosteId(firstPoste?.id || '');
        } else {
          setMetierId(poste?.metierId || (devisMetierIds[0] || 'lavage'));
          setPosteId(defaultPosteId || '');
        }
        setClientNom(devis.clientNom || '');
        const parsed = parsePhone(devis.clientTel || '');
        setClientTelCode(parsed.countryCode);
        setClientTelNum(parsed.number);
        setMarque(devis.marque || '');
        setModele(devis.modele || '');
        setAnnee(devis.annee || '');
        setVin(devis.vin || '');
        setNotes(devis.notes || '');
        setSelectedResponsibles(devis.responsibleIds || []);
        setSelectedIntervenants(devis.intervenantIds || []);
        setBillingResponsible(devis.billingResponsibleUserId || '');
      } else {
        setMetierId(poste?.metierId || 'lavage');
        setPosteId(defaultPosteId || filteredPostes[0]?.id || '');
        setClientNom('');
        setClientTelCode('+212');
        setClientTelNum('');
        setMarque('');
        setModele('');
        setAnnee('');
        setVin('');
        setNotes('');
        setBillingResponsible('');
        // Auto-prefill current user as responsible
        if (user) {
          const currentProfile = profileOptions.find(p => p.id === user.id);
          setSelectedResponsibles(currentProfile ? [currentProfile.id] : []);
        } else {
          setSelectedResponsibles([]);
        }
        setSelectedIntervenants([]);
      }
      setDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setDateFin(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setHeureDebut(defaultTime || '09:00');
      setDuree(60);
      setStatut('prevu');
    }
    setConflict(null);
    setSaving(false);
  }, [open, rdv, defaultDate, defaultPosteId, defaultTime, profileOptions, user, prefillFromDevis]);

  // When profileOptions load after modal opens (for new RDV), auto-prefill if not yet set
  useEffect(() => {
    if (!open || isEdit || !user) return;
    if (selectedResponsibles.length === 0) {
      const currentProfile = profileOptions.find(p => p.id === user.id);
      if (currentProfile) {
        setSelectedResponsibles([currentProfile.id]);
      }
    }
  }, [profileOptions]);

  useEffect(() => {
    if (!isEdit) {
      const first = postes.find(p => p.metierId === metierId && p.actif);
      if (first) setPosteId(first.id);
    }
  }, [metierId, postes, isEdit]);

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

  const syncFinFromDuree = useCallback((startDate: string, startTime: string, totalMinutes: number) => {
    if (!startDate || !startTime) return;
    const fin = addMinutes(new Date(`${startDate}T${startTime}:00`), totalMinutes);
    setDateFin(format(fin, 'yyyy-MM-dd'));
    setHeureFin(format(fin, 'HH:mm'));
  }, []);

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

  const eventState = useMemo(() => {
    if (!rdv) return 'futur' as const;
    const debutStr = `${date}T${heureDebut}:00`;
    const finStr = `${dateFin}T${heureFin}:00`;
    return getEventState(debutStr, finStr);
  }, [rdv, date, heureDebut, dateFin, heureFin]);

  async function handleSubmit() {
    if (!posteId || !date || !heureDebut) return;

    // Validate responsibles
    if (selectedResponsibles.length === 0) {
      toast.error('Veuillez sélectionner au moins un responsable.');
      return;
    }

    let debut = new Date(`${date}T${heureDebut}:00`);
    let fin = new Date(`${dateFin}T${heureFin}:00`);

    if (
      (statut === 'termine' || statut === 'noshow') &&
      rdv &&
      getEventState(rdv.debut, rdv.fin) === 'en_cours'
    ) {
      fin = roundToNearest15Minutes(new Date());
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
      const effectiveBilling = selectedResponsibles.length >= 2 ? (billingResponsible || undefined) : undefined;
      await updateRdv({
        ...rdv!,
        posteId,
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        clientNom: clientNom || undefined,
        clientTel: serializePhone(clientTelCode, clientTelNum) || undefined,
        marque: marque || undefined,
        modele: modele || undefined,
        annee: annee || undefined,
        vin: vin || undefined,
        notes: notes || undefined,
        statut,
        billingResponsibleUserId: effectiveBilling,
      }, selectedResponsibles, selectedIntervenants);
      toast.success('Rendez-vous modifié.');
    } else {
      const effectiveBilling = selectedResponsibles.length >= 2 ? (billingResponsible || undefined) : undefined;
      await addRdv({
        posteId,
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        clientNom: clientNom || undefined,
        clientTel: serializePhone(clientTelCode, clientTelNum) || undefined,
        marque: marque || undefined,
        modele: modele || undefined,
        annee: annee || undefined,
        vin: vin || undefined,
        notes: notes || undefined,
        statut,
        billingResponsibleUserId: effectiveBilling,
        sourceDevisId: prefillFromDevis?.sourceDevisId || undefined,
      } as any, selectedResponsibles, selectedIntervenants);
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

  // Use shared SearchableMultiSelect component (imported at top)

  const responsibleOptions = useMemo(() => 
    profileOptions.map(p => ({ id: p.id, label: p.company })),
    [profileOptions]
  );

  const intervenantOpts = useMemo(() => 
    intervenantOptions.map(i => ({ id: i.id, label: i.name })),
    [intervenantOptions]
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl animate-slide-in max-h-[85dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg">
            {readOnly ? 'Détails du rendez-vous' : isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </DialogTitle>
          {readOnly && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Eye className="h-3.5 w-3.5" />
              Consultation uniquement — seuls les responsables peuvent modifier ce rendez-vous.
            </p>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto flex-1 -mx-6 px-6 pb-4 [&_input:focus]:ring-2 [&_input:focus]:ring-primary/50 [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-primary/50 [&_input:focus]:scroll-mt-4 [&_textarea:focus]:scroll-mt-4" onFocus={(e) => {
            if (window.innerWidth < 768 && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }
          }}>
          {/* Responsable & Intervenant - top row */}
          <div className="grid grid-cols-2 gap-3">
            <SearchableMultiSelect
              label="Responsable"
              options={responsibleOptions}
              selected={selectedResponsibles}
              onChange={(ids) => {
                setSelectedResponsibles(ids);
                // Clean billing if selected billing responsible was removed
                if (billingResponsible && !ids.includes(billingResponsible)) {
                  setBillingResponsible('');
                }
                // If going from 2+ to 1, clear billing
                if (ids.length < 2) {
                  setBillingResponsible('');
                }
              }}
              disabled={readOnly}
              required
              placeholder="Rechercher un responsable..."
              getLabel={(id) => {
                const p = profileOptions.find(p => p.id === id);
                return p ? p.company : id;
              }}
            />
            <SearchableMultiSelect
              label="Intervenant"
              options={intervenantOpts}
              selected={selectedIntervenants}
              onChange={setSelectedIntervenants}
              disabled={readOnly}
              placeholder="Rechercher un intervenant..."
              getLabel={(id) => {
                const i = intervenantOptions.find(i => i.id === id);
                return i ? i.name : id;
              }}
            />
          </div>

          {/* Facturation - only visible when 2+ responsibles */}
          {selectedResponsibles.length >= 2 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Facturation</Label>
              <Select value={billingResponsible} onValueChange={setBillingResponsible} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Qui facture le client ?" /></SelectTrigger>
                <SelectContent>
                  {selectedResponsibles.map(id => {
                    const p = profileOptions.find(p => p.id === id);
                    return (
                      <SelectItem key={id} value={id}>
                        {p ? p.company : id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Métier</Label>
              <Select value={metierId} onValueChange={v => setMetierId(v as MetierType)} disabled={readOnly}>
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
              <Select value={posteId} onValueChange={setPosteId} disabled={readOnly}>
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
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Date fin</Label>
              <Input type="date" value={dateFin} onChange={e => handleDateFinChange(e.target.value)} disabled={readOnly} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Heure début</Label>
              <Select value={heureDebut} onValueChange={setHeureDebut} disabled={readOnly}>
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
              <Select value={heureFin} onValueChange={handleHeureFinChange} disabled={readOnly}>
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
              <Input type="number" min="0" value={dureeJours} onChange={e => handleDureeJoursChange(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée (h)</Label>
              <Input type="number" min="0" max="23" value={dureeHeures} onChange={e => handleDureeHeuresChange(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Durée (min)</Label>
              <Input type="number" min="0" step="15" value={dureeMinutes} onChange={e => handleDureeMinutesChange(e.target.value)} disabled={readOnly} />
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
              <Input placeholder="Nom du client" value={clientNom} onChange={e => setClientNom(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Téléphone</Label>
              <PhoneInput
                countryCode={clientTelCode}
                number={clientTelNum}
                onCountryCodeChange={setClientTelCode}
                onNumberChange={setClientTelNum}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Marque</Label>
              <Input placeholder="Ex: BMW" value={marque} onChange={e => setMarque(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Modèle</Label>
              <Input placeholder="Ex: Série 3" value={modele} onChange={e => setModele(e.target.value)} disabled={readOnly} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Année</Label>
              <Input placeholder="Ex: 2020" value={annee} onChange={e => setAnnee(e.target.value)} disabled={readOnly} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">VIN</Label>
              <Input placeholder="N° de châssis" value={vin} onChange={e => setVin(e.target.value)} disabled={readOnly} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Notes internes</Label>
            <Textarea placeholder="Ex: prévoir huile, carto stage 1…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={readOnly} />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Statut</Label>
            <Select value={statut} onValueChange={v => setStatut(v as StatutRdv)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUT_LABELS).map(([k, v]) => {
                  if (k === 'termine' && eventState === 'futur') return null;
                  return <SelectItem key={k} value={k}>{v}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0">
          {readOnly ? (
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          ) : (
            <>
              {isEdit && (
                <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto" disabled={saving}>
                  Supprimer
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le rendez-vous'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
