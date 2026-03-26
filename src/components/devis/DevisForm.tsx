import { useState, useEffect, useMemo } from 'react';
import { UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { PhoneInput, parsePhone, serializePhone } from '@/components/ui/phone-input';
import { useAuth } from '@/store/AuthContext';
import { useStore } from '@/store/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { Devis, StatutDevis, STATUT_DEVIS_LABELS } from '@/types/devis';
import { toast } from 'sonner';

interface ProfileOption { id: string; email: string; company: string; }
interface IntervenantOption { id: string; name: string; }

interface Props {
  devis?: Devis | null;
  onSaved?: (devis: Devis) => void;
  onDeleted?: () => void;
  onConvert?: (devis: Devis) => void;
  /** Controlled assignment — when provided, the form uses these instead of internal state */
  assignedUserId?: string;
  onAssignedUserIdChange?: (id: string) => void;
}

export default function DevisForm({ devis, onSaved, onDeleted, onConvert }: Props) {
  const { user } = useAuth();
  const { metiers, devis: devisStore } = useStore();
  const { addDevis, updateDevis, deleteDevis, devisResponsibles, devisIntervenants, devisMetiers } = devisStore;
  const isEdit = !!devis;

  const [clientNom, setClientNom] = useState('');
  const [clientTelCode, setClientTelCode] = useState('+212');
  const [clientTelNum, setClientTelNum] = useState('');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [annee, setAnnee] = useState('');
  const [vin, setVin] = useState('');
  const [notes, setNotes] = useState('');
  const [statut, setStatut] = useState<StatutDevis>('demande_recue');
  const [saving, setSaving] = useState(false);

  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([]);
  const [selectedIntervenants, setSelectedIntervenants] = useState<string[]>([]);
  const [selectedMetiers, setSelectedMetiers] = useState<string[]>([]);
  const [billingResponsible, setBillingResponsible] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [intervenantOptions, setIntervenantOptions] = useState<IntervenantOption[]>([]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (devis) {
      setClientNom(devis.clientNom || '');
      const parsed = parsePhone(devis.clientTel || '');
      setClientTelCode(parsed.countryCode);
      setClientTelNum(parsed.number);
      setMarque(devis.marque || '');
      setModele(devis.modele || '');
      setAnnee(devis.annee || '');
      setVin(devis.vin || '');
      setNotes(devis.notes || '');
      setStatut(devis.statut);
      setSelectedResponsibles(devisResponsibles[devis.id] || []);
      setSelectedIntervenants(devisIntervenants[devis.id] || []);
      setSelectedMetiers(devisMetiers[devis.id] || []);
      setBillingResponsible(devis.billingResponsibleUserId || '');
      setAssignedUserId(devis.assignedUserId || '');
    }
  }, [devis, devisResponsibles, devisIntervenants, devisMetiers]);

  // Auto-prefill current user for new devis
  useEffect(() => {
    if (isEdit || !user || profileOptions.length === 0) return;
    if (selectedResponsibles.length === 0) {
      const currentProfile = profileOptions.find(p => p.id === user.id);
      if (currentProfile) setSelectedResponsibles([currentProfile.id]);
    }
  }, [profileOptions, user, isEdit]);

  const responsibleOptions = useMemo(() =>
    profileOptions.map(p => ({ id: p.id, label: p.company })), [profileOptions]);
  const intervenantOpts = useMemo(() =>
    intervenantOptions.map(i => ({ id: i.id, label: i.name })), [intervenantOptions]);
  const metierOpts = useMemo(() =>
    metiers.map(m => ({ id: m.id, label: m.nom })), [metiers]);

  async function handleSubmit() {
    if (selectedResponsibles.length === 0) {
      toast.error('Veuillez sélectionner au moins un responsable.');
      return;
    }
    if (selectedMetiers.length === 0) {
      toast.error('Veuillez sélectionner au moins un métier.');
      return;
    }

    setSaving(true);
    const effectiveBilling = selectedResponsibles.length >= 2 ? (billingResponsible || undefined) : undefined;
    const devisData = {
      clientNom: clientNom || undefined,
      clientTel: serializePhone(clientTelCode, clientTelNum) || undefined,
      marque: marque || undefined,
      modele: modele || undefined,
      annee: annee || undefined,
      vin: vin || undefined,
      notes: notes || undefined,
      statut,
      billingResponsibleUserId: effectiveBilling,
      assignedUserId: assignedUserId || undefined,
    };

    if (isEdit && devis) {
      await updateDevis({ ...devis, ...devisData }, selectedResponsibles, selectedIntervenants, selectedMetiers);
      toast.success('Devis modifié.');
      onSaved?.({ ...devis, ...devisData } as Devis);
    } else {
      const result = await addDevis(devisData as any, selectedResponsibles, selectedIntervenants, selectedMetiers);
      toast.success('Devis créé.');
      if (result) onSaved?.(result);
    }
    setSaving(false);
  }

  const activeProfiles = useMemo(() =>
    profileOptions.filter(p => p.company && p.company.trim() !== ''), [profileOptions]);

  return (
    <div className="grid gap-4">
      {/* Responsable & Intervenant pressenti */}
      <div className="grid grid-cols-2 gap-3">
        <SearchableMultiSelect
          label="Responsable"
          options={responsibleOptions}
          selected={selectedResponsibles}
          onChange={(ids) => {
            setSelectedResponsibles(ids);
            if (billingResponsible && !ids.includes(billingResponsible)) setBillingResponsible('');
            if (ids.length < 2) setBillingResponsible('');
          }}
          required
          placeholder="Rechercher un responsable..."
          getLabel={(id) => profileOptions.find(p => p.id === id)?.company || id}
        />
        <SearchableMultiSelect
          label="Intervenant pressenti"
          options={intervenantOpts}
          selected={selectedIntervenants}
          onChange={setSelectedIntervenants}
          placeholder="Rechercher un intervenant..."
          getLabel={(id) => intervenantOptions.find(i => i.id === id)?.name || id}
        />
      </div>

      {/* Assigné à — bloc mis en évidence */}
      <div className={`rounded-lg p-4 -mx-1 border-2 transition-colors ${
        assignedUserId
          ? 'bg-primary/5 border-primary/30'
          : 'bg-destructive/5 border-destructive/40'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className={`h-4 w-4 ${assignedUserId ? 'text-primary' : 'text-destructive'}`} />
          <span className="text-sm font-semibold text-foreground">Responsable du traitement</span>
        </div>
        {!assignedUserId && (
          <p className="text-xs text-destructive font-medium mb-2 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Aucun utilisateur assigné — ce champ détermine qui doit traiter ce devis
          </p>
        )}
        <Select value={assignedUserId || '__none__'} onValueChange={v => setAssignedUserId(v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Non assigné</SelectItem>
            {activeProfiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Facturation */}
      {selectedResponsibles.length >= 2 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">Facturation</Label>
          <Select value={billingResponsible} onValueChange={setBillingResponsible}>
            <SelectTrigger><SelectValue placeholder="Qui facture le client ?" /></SelectTrigger>
            <SelectContent>
              {selectedResponsibles.map(id => {
                const p = profileOptions.find(p => p.id === id);
                return <SelectItem key={id} value={id}>{p ? p.company : id}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Métiers */}
      <SearchableMultiSelect
        label="Métier"
        options={metierOpts}
        selected={selectedMetiers}
        onChange={setSelectedMetiers}
        required
        placeholder="Rechercher un métier..."
        getLabel={(id) => metiers.find(m => m.id === id)?.nom || id}
      />

      {/* Client info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">Client (nom)</Label>
          <Input placeholder="Nom du client" value={clientNom} onChange={e => setClientNom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">Téléphone</Label>
          <PhoneInput
            countryCode={clientTelCode}
            number={clientTelNum}
            onCountryCodeChange={setClientTelCode}
            onNumberChange={setClientTelNum}
          />
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
        <Label className="text-xs font-medium text-muted-foreground mb-1.5">Notes du devis</Label>
        <Textarea placeholder="Détails sur le devis à réaliser…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5">Statut</Label>
        <Select value={statut} onValueChange={v => setStatut(v as StatutDevis)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUT_DEVIS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        {isEdit && devis?.statut === 'valide' && onConvert && (
          <Button size="sm" variant="outline" onClick={() => onConvert(devis)}>
            Convertir en rendez-vous
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le devis'}
        </Button>
      </div>
    </div>
  );
}
