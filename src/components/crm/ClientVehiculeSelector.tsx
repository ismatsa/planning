import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, User, Car, Plus, ExternalLink, AlertTriangle, X, ChevronDown, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/StoreContext';
import { parsePhone } from '@/components/ui/phone-input';
import {
  Client, Vehicule, clientDisplayName, normalizeVin,
} from '@/types/crm';
import ClientFormDialog from './ClientFormDialog';
import VehiculeFormDialog from './VehiculeFormDialog';

export interface ClientVehiculeValue {
  clientId?: string;
  vehiculeId?: string;
  clientNom?: string;
  clientTel?: string;
  marque?: string;
  modele?: string;
  annee?: string;
  vin?: string;
}

interface Props {
  value: ClientVehiculeValue;
  onChange: (value: ClientVehiculeValue) => void;
  readOnly?: boolean;
  /** Masque les liens vers les fiches CRM */
  hideLinks?: boolean;
}

interface Match<T> { item: T; reason: string }

function digits(s?: string) {
  return (s || '').replace(/\D/g, '');
}

function maskVin(vin: string) {
  if (vin.length <= 6) return vin;
  return `${vin.slice(0, 3)}••••${vin.slice(-4)}`;
}

function fmtPhone(tel?: string) {
  if (!tel) return '';
  const p = parsePhone(tel);
  return `${p.countryCode} ${p.number}`.trim();
}

export default function ClientVehiculeSelector({ value, onChange, readOnly, hideLinks }: Props) {
  const { crm } = useStore();

  // Champs de saisie / recherche
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [vinInput, setVinInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [telQ, setTelQ] = useState('');
  const [societeQ, setSocieteQ] = useState('');
  const [emailQ, setEmailQ] = useState('');
  const [immatQ, setImmatQ] = useState('');
  const [marqueQ, setMarqueQ] = useState('');
  const [modeleQ, setModeleQ] = useState('');

  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [vehiculeCreateOpen, setVehiculeCreateOpen] = useState(false);
  const [ownerWarning, setOwnerWarning] = useState(false);

  const initRef = useRef(false);

  const selectedClient = useMemo(
    () => crm.clients.find(c => c.id === value.clientId) || null,
    [crm.clients, value.clientId],
  );
  const selectedVehicule = useMemo(
    () => crm.vehicules.find(v => v.id === value.vehiculeId) || null,
    [crm.vehicules, value.vehiculeId],
  );

  // Initialisation depuis les valeurs existantes (édition)
  useEffect(() => {
    if (initRef.current) return;
    if (!crm.crmLoaded) return;
    initRef.current = true;
    if (!value.clientId && value.clientNom) {
      const parts = value.clientNom.trim().split(/\s+/);
      setNom(parts[0] || '');
      setPrenom(parts.slice(1).join(' '));
    }
    if (!value.vehiculeId && value.vin) setVinInput(normalizeVin(value.vin));
  }, [crm.crmLoaded, value]);

  const currentOwnerOf = (vehiculeId: string): Client | null => {
    const active = crm.proprietaires
      .filter(p => p.vehiculeId === vehiculeId && !p.dateFin)
      .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))[0];
    const clientId = active?.clientId
      || crm.vehicules.find(v => v.id === vehiculeId)?.clientId;
    return crm.clients.find(c => c.id === clientId) || null;
  };

  const vehiculesOfClient = (clientId: string) =>
    crm.vehicules.filter(v => v.statut === 'actif' && currentOwnerOf(v.id)?.id === clientId);

  // ---- Recherche clients ----
  const clientMatches: Match<Client>[] = useMemo(() => {
    const n = nom.trim().toLowerCase();
    const p = prenom.trim().toLowerCase();
    const soc = societeQ.trim().toLowerCase();
    const mail = emailQ.trim().toLowerCase();
    const tel = digits(telQ);
    if (!n && !p && !soc && !mail && tel.length < 4) return [];
    const out: Match<Client>[] = [];
    for (const c of crm.clients) {
      if (c.statut !== 'actif') continue;
      let reason = '';
      if (n && (c.nom || '').toLowerCase().includes(n)) reason = 'Nom correspondant';
      else if (p && (c.prenom || '').toLowerCase().includes(p)) reason = 'Prénom correspondant';
      else if ((n || soc) && (c.raisonSociale || '').toLowerCase().includes(soc || n)) reason = 'Raison sociale correspondante';
      else if (mail && (c.email || '').toLowerCase().includes(mail)) reason = 'E-mail correspondant';
      else if (tel.length >= 4 && (digits(c.telephone).includes(tel) || digits(c.telephoneSecondaire).includes(tel))) reason = 'Téléphone correspondant';
      if (reason) out.push({ item: c, reason });
    }
    return out.slice(0, 8);
  }, [crm.clients, nom, prenom, societeQ, emailQ, telQ]);

  // ---- Recherche véhicules ----
  const vinNorm = normalizeVin(vinInput);
  const vehiculeMatches: Match<Vehicule>[] = useMemo(() => {
    const imm = immatQ.trim().toUpperCase();
    const mq = marqueQ.trim().toLowerCase();
    const md = modeleQ.trim().toLowerCase();
    if (vinNorm.length < 3 && !imm && !mq && !md) return [];
    const out: Match<Vehicule>[] = [];
    for (const v of crm.vehicules) {
      let reason = '';
      if (vinNorm.length >= 3 && normalizeVin(v.vin).includes(vinNorm)) reason = 'VIN correspondant';
      else if (imm && (v.immatriculation || '').toUpperCase().includes(imm)) reason = 'Immatriculation correspondante';
      else if (mq && v.marque.toLowerCase().includes(mq)) reason = 'Marque correspondante';
      else if (md && v.modele.toLowerCase().includes(md)) reason = 'Modèle correspondant';
      if (reason) out.push({ item: v, reason });
    }
    return out.slice(0, 8);
  }, [crm.vehicules, vinNorm, immatQ, marqueQ, modeleQ]);

  // ---- Sélection ----
  const selectClient = (c: Client) => {
    // Changement de client => la sélection véhicule est vidée
    const keepVehicule = selectedVehicule && currentOwnerOf(selectedVehicule.id)?.id === c.id;
    onChange({
      ...value,
      clientId: c.id,
      clientNom: clientDisplayName(c),
      clientTel: c.telephone,
      ...(keepVehicule ? {} : { vehiculeId: undefined, marque: undefined, modele: undefined, annee: undefined, vin: undefined }),
    });
    setOwnerWarning(false);
  };

  const selectVehicule = (v: Vehicule) => {
    const owner = currentOwnerOf(v.id);
    const patch: ClientVehiculeValue = {
      ...value,
      vehiculeId: v.id,
      vin: v.vin,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee ? String(v.annee) : undefined,
    };
    if (owner && owner.id !== value.clientId) {
      // Le propriétaire actuel est proposé, jamais modifié automatiquement
      patch.clientId = owner.id;
      patch.clientNom = clientDisplayName(owner);
      patch.clientTel = owner.telephone;
      if (value.clientId) setOwnerWarning(true);
    }
    onChange(patch);
    setVinInput(normalizeVin(v.vin));
  };

  const clearClient = () => {
    onChange({
      ...value,
      clientId: undefined, clientNom: undefined, clientTel: undefined,
      vehiculeId: undefined, vin: undefined, marque: undefined, modele: undefined, annee: undefined,
    });
    setOwnerWarning(false);
  };

  const clearVehicule = () => {
    onChange({ ...value, vehiculeId: undefined, vin: undefined, marque: undefined, modele: undefined, annee: undefined });
    setOwnerWarning(false);
  };

  // Saisie libre (aucune fiche liée) : on remonte quand même les infos texte
  useEffect(() => {
    if (value.clientId || readOnly) return;
    const label = [nom.trim(), prenom.trim()].filter(Boolean).join(' ');
    const nextVin = vinNorm || undefined;
    if ((value.clientNom || '') === label && (value.vin || '') === (nextVin || '')) return;
    onChange({ ...value, clientNom: label || undefined, vin: value.vehiculeId ? value.vin : nextVin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nom, prenom, vinNorm]);

  const clientVehicules = selectedClient ? vehiculesOfClient(selectedClient.id) : [];
  const vinBelongsToClient = selectedClient && vinNorm.length >= 5
    ? clientVehicules.some(v => normalizeVin(v.vin) === vinNorm)
    : false;
  const vinFoundElsewhere = vinNorm.length >= 5
    ? crm.vehicules.find(v => normalizeVin(v.vin) === vinNorm) || null
    : null;

  const noResults = !selectedClient && !selectedVehicule
    && clientMatches.length === 0 && vehiculeMatches.length === 0
    && (nom.trim() || prenom.trim() || vinNorm.length >= 3);

  if (readOnly) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value.clientNom || '—'}</span>
          {value.clientTel && <span className="text-muted-foreground">{fmtPhone(value.clientTel)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span>{[value.marque, value.modele, value.annee].filter(Boolean).join(' ') || '—'}</span>
          {value.vin && <span className="text-muted-foreground font-mono text-xs">{maskVin(normalizeVin(value.vin))}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        Client &amp; véhicule
      </div>

      {/* Champs de saisie initiaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">Nom</Label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom ou société" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">Prénom</Label>
          <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5">VIN</Label>
          <Input
            className="uppercase font-mono"
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="N° de châssis"
          />
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowAdvanced(s => !s)}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Recherche avancée (téléphone, société, e-mail, immatriculation, marque, modèle)
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Input placeholder="Téléphone" value={telQ} onChange={e => setTelQ(e.target.value)} />
          <Input placeholder="Raison sociale" value={societeQ} onChange={e => setSocieteQ(e.target.value)} />
          <Input placeholder="E-mail" value={emailQ} onChange={e => setEmailQ(e.target.value)} />
          <Input placeholder="Immatriculation" value={immatQ} onChange={e => setImmatQ(e.target.value.toUpperCase())} />
          <Input placeholder="Marque" value={marqueQ} onChange={e => setMarqueQ(e.target.value)} />
          <Input placeholder="Modèle" value={modeleQ} onChange={e => setModeleQ(e.target.value)} />
        </div>
      )}

      {/* Suggestions clients */}
      {!selectedClient && clientMatches.length > 0 && (
        <div className="rounded-md border divide-y">
          <div className="px-3 py-1.5 text-xs font-semibold bg-muted/50">
            Clients ({clientMatches.length})
          </div>
          {clientMatches.map(({ item, reason }) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectClient(item)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{clientDisplayName(item)}</span>
                <Badge variant="outline" className="text-[10px]">{reason}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {fmtPhone(item.telephone)}
                {item.email ? ` · ${item.email}` : ''}
                {` · ${vehiculesOfClient(item.id).length} véhicule(s) actif(s)`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Suggestions véhicules */}
      {!selectedVehicule && vehiculeMatches.length > 0 && (
        <div className="rounded-md border divide-y">
          <div className="px-3 py-1.5 text-xs font-semibold bg-muted/50">
            Véhicules ({vehiculeMatches.length})
          </div>
          {vehiculeMatches.map(({ item, reason }) => {
            const owner = currentOwnerOf(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectVehicule(item)}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {item.marque} {item.modele}{item.annee ? ` (${item.annee})` : ''}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{reason}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.immatriculation ? `${item.immatriculation} · ` : ''}
                  <span className="font-mono">{maskVin(normalizeVin(item.vin))}</span>
                  {` · ${clientDisplayName(owner)}`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Cas D — rien trouvé */}
      {noResults && (
        <div className="rounded-md border border-dashed p-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Aucun client ni véhicule existant ne correspond aux informations saisies.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setClientCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Créer un nouveau client
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setVehiculeCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Créer un nouveau véhicule
            </Button>
          </div>
        </div>
      )}

      {/* Client sélectionné */}
      {selectedClient && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{clientDisplayName(selectedClient)}</span>
            </div>
            <div className="flex items-center gap-1">
              {!hideLinks && (
                <Button asChild type="button" size="sm" variant="ghost" className="h-7 px-2">
                  <Link to={`/clients/${selectedClient.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Fiche client
                  </Link>
                </Button>
              )}
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={clearClient}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {fmtPhone(selectedClient.telephone)}
            {selectedClient.email ? ` · ${selectedClient.email}` : ''}
            {selectedClient.ville ? ` · ${selectedClient.ville}` : ''}
          </div>
        </div>
      )}

      {/* Véhicule sélectionné */}
      {selectedVehicule && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {selectedVehicule.marque} {selectedVehicule.modele}
                {selectedVehicule.annee ? ` (${selectedVehicule.annee})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!hideLinks && (
                <Button asChild type="button" size="sm" variant="ghost" className="h-7 px-2">
                  <Link to={`/vehicules/${selectedVehicule.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Fiche véhicule
                  </Link>
                </Button>
              )}
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={clearVehicule}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedVehicule.immatriculation ? `${selectedVehicule.immatriculation} · ` : ''}
            <span className="font-mono">{normalizeVin(selectedVehicule.vin)}</span>
            {selectedVehicule.motorisation ? ` · ${selectedVehicule.motorisation}` : ''}
            {selectedVehicule.kilometrageActuel != null ? ` · ${selectedVehicule.kilometrageActuel} km` : ''}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Propriétaire actuel : {clientDisplayName(currentOwnerOf(selectedVehicule.id))}. Le changement de
            propriétaire se fait depuis la fiche véhicule.
          </p>
        </div>
      )}

      {/* Cas C — tentative d'associer un véhicule à un autre client */}
      {ownerWarning && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Ce véhicule possède déjà un propriétaire actif. Le changement de propriétaire doit être effectué
            depuis la fiche véhicule par un administrateur. Le propriétaire actuel a été sélectionné.
          </span>
        </div>
      )}

      {/* Cas E — client sélectionné, choix parmi ses véhicules */}
      {selectedClient && !selectedVehicule && (
        <div className="space-y-2">
          {clientVehicules.length > 0 ? (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5">
                Véhicules de ce client
              </Label>
              <Select value="" onValueChange={(id) => {
                const v = crm.vehicules.find(x => x.id === id);
                if (v) selectVehicule(v);
              }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un véhicule" /></SelectTrigger>
                <SelectContent>
                  {clientVehicules.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.marque} {v.modele}{v.immatriculation ? ` — ${v.immatriculation}` : ''} — {maskVin(normalizeVin(v.vin))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ce client n'a aucun véhicule actif enregistré.</p>
          )}

          {/* Cas B — VIN saisi mais pas rattaché à ce client */}
          {vinNorm.length >= 5 && !vinBelongsToClient && !vinFoundElsewhere && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Aucun véhicule avec ce VIN n'est associé à ce client.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setVehiculeCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {vinNorm.length >= 5 && !vinBelongsToClient
                ? 'Ajouter ce véhicule à ce client'
                : 'Ajouter un véhicule à ce client'}
            </Button>
            <Badge variant="secondary" className="text-[10px]">Véhicule à compléter</Badge>
          </div>
        </div>
      )}

      {/* Cas D bis — véhicule seul, pas de client */}
      {!selectedClient && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setClientCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Créer un client
          </Button>
        </div>
      )}

      <ClientFormDialog
        open={clientCreateOpen}
        onOpenChange={setClientCreateOpen}
        defaultValues={{ nom: nom.trim(), prenom: prenom.trim(), telephone: telQ.trim(), email: emailQ.trim(), raisonSociale: societeQ.trim() }}
        onSaved={(c) => selectClient(c)}
      />
      <VehiculeFormDialog
        open={vehiculeCreateOpen}
        onOpenChange={setVehiculeCreateOpen}
        defaultVin={vinNorm}
        defaultClientId={selectedClient?.id}
        onSaved={(v) => selectVehicule(v)}
      />
    </div>
  );
}
