import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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
import { Eye } from 'lucide-react';

interface ProfileOption { id: string; email: string; company: string; }
interface IntervenantOption { id: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  devis?: Devis | null;
  readOnly?: boolean;
  devisResponsibles: Record<string, string[]>;
  devisIntervenants: Record<string, string[]>;
  devisMetiers: Record<string, string[]>;
  onAdd: (d: Omit<Devis, 'id' | 'createdAt' | 'updatedAt'>, r: string[], i: string[], m: string[]) => Promise<any>;
  onUpdate: (d: Devis, r?: string[], i?: string[], m?: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvert?: (devis: Devis) => void;
}

export default function DevisModal({
  open, onClose, devis, readOnly,
  devisResponsibles, devisIntervenants, devisMetiers,
  onAdd, onUpdate, onDelete, onConvert,
}: Props) {
  const { user } = useAuth();
  const { metiers } = useStore();
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
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [intervenantOptions, setIntervenantOptions] = useState<IntervenantOption[]>([]);

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
    } else {
      setClientNom('');
      setClientTelCode('+212');
      setClientTelNum('');
      setMarque('');
      setModele('');
      setAnnee('');
      setVin('');
      setNotes('');
      setStatut('demande_recue');
      setBillingResponsible('');
      setSelectedIntervenants([]);
      setSelectedMetiers([]);
      if (user) {
        const currentProfile = profileOptions.find(p => p.id === user.id);
        setSelectedResponsibles(currentProfile ? [currentProfile.id] : []);
      } else {
        setSelectedResponsibles([]);
      }
    }
    setSaving(false);
  }, [open, devis, profileOptions, user]);

  // Auto-prefill when profileOptions load for new devis
  useEffect(() => {
    if (!open || isEdit || !user) return;
    if (selectedResponsibles.length === 0) {
      const currentProfile = profileOptions.find(p => p.id === user.id);
      if (currentProfile) setSelectedResponsibles([currentProfile.id]);
    }
  }, [profileOptions]);

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
    };

    if (isEdit) {
      await onUpdate({ ...devis!, ...devisData }, selectedResponsibles, selectedIntervenants, selectedMetiers);
      toast.success('Devis modifié.');
    } else {
      await onAdd(devisData as any, selectedResponsibles, selectedIntervenants, selectedMetiers);
      toast.success('Devis créé.');
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (devis) {
      setSaving(true);
      await onDelete(devis.id);
      toast.success('Devis supprimé.');
      setSaving(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl animate-slide-in max-h-[85dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg">
            {readOnly ? 'Détails du devis' : isEdit ? 'Modifier le devis' : 'Nouveau devis'}
          </DialogTitle>
          {readOnly && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Eye className="h-3.5 w-3.5" />
              Consultation uniquement — seuls les responsables peuvent modifier ce devis.
            </p>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto flex-1 -mx-6 px-6 pb-4">
          {/* Responsable & Intervenant */}
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
              disabled={readOnly}
              required
              placeholder="Rechercher un responsable..."
              getLabel={(id) => profileOptions.find(p => p.id === id)?.company || id}
            />
            <SearchableMultiSelect
              label="Intervenant"
              options={intervenantOpts}
              selected={selectedIntervenants}
              onChange={setSelectedIntervenants}
              disabled={readOnly}
              placeholder="Rechercher un intervenant..."
              getLabel={(id) => intervenantOptions.find(i => i.id === id)?.name || id}
            />
          </div>

          {/* Facturation */}
          {selectedResponsibles.length >= 2 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">Facturation</Label>
              <Select value={billingResponsible} onValueChange={setBillingResponsible} disabled={readOnly}>
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
            disabled={readOnly}
            required
            placeholder="Rechercher un métier..."
            getLabel={(id) => metiers.find(m => m.id === id)?.nom || id}
          />

          {/* Client info */}
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
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Notes du devis</Label>
            <Textarea placeholder="Détails sur le devis à réaliser…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={readOnly} />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5">Statut</Label>
            <Select value={statut} onValueChange={v => setStatut(v as StatutDevis)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUT_DEVIS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0">
          {readOnly ? (
            <>
              {devis?.statut === 'valide' && onConvert && (
                <Button onClick={() => { onConvert(devis); onClose(); }} className="mr-auto">
                  Convertir en rendez-vous
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </>
          ) : (
            <>
              {isEdit && (
                <div className="flex gap-2 mr-auto">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                    Supprimer
                  </Button>
                  {devis?.statut === 'valide' && onConvert && (
                    <Button size="sm" variant="outline" onClick={() => { onConvert(devis); onClose(); }}>
                      Convertir en rendez-vous
                    </Button>
                  )}
                </div>
              )}
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le devis'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
