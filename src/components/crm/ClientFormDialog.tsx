import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PhoneInput, parsePhone, serializePhone } from '@/components/ui/phone-input';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import {
  Client, ClientType, CLIENT_TYPE_LABELS, clientDisplayName,
} from '@/types/crm';

const schema = z.object({
  typeClient: z.enum(['particulier', 'societe']),
  nom: z.string().trim().max(100).optional(),
  prenom: z.string().trim().max(100).optional(),
  raisonSociale: z.string().trim().max(150).optional(),
  ice: z.string().trim().max(30).optional(),
  telephone: z.string().trim().min(1, 'Le téléphone est obligatoire'),
  telephoneSecondaire: z.string().trim().optional(),
  email: z.string().trim().max(255).email('Adresse e-mail invalide').optional().or(z.literal('')),
  adresse: z.string().trim().max(500).optional(),
  ville: z.string().trim().max(100).optional(),
  notesInternes: z.string().trim().max(2000).optional(),
}).refine(
  (d) => d.typeClient !== 'particulier' || !!d.nom,
  { message: 'Le nom est obligatoire pour un particulier', path: ['nom'] },
).refine(
  (d) => d.typeClient !== 'societe' || !!d.raisonSociale,
  { message: 'La raison sociale est obligatoire pour une société', path: ['raisonSociale'] },
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
  /** Pré-remplissage lors d'une création rapide depuis un formulaire opérationnel */
  defaultValues?: {
    nom?: string;
    prenom?: string;
    raisonSociale?: string;
    telephone?: string;
    email?: string;
  };
}


export default function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { crm } = useStore();
  const isEdit = !!client;

  const [typeClient, setTypeClient] = useState<ClientType>('particulier');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [ice, setIce] = useState('');
  const [telCode, setTelCode] = useState('+212');
  const [telNum, setTelNum] = useState('');
  const [tel2Code, setTel2Code] = useState('+212');
  const [tel2Num, setTel2Num] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [notesInternes, setNotesInternes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTypeClient(client?.typeClient || 'particulier');
    setNom(client?.nom || '');
    setPrenom(client?.prenom || '');
    setRaisonSociale(client?.raisonSociale || '');
    setIce(client?.ice || '');
    const p = client?.telephone ? parsePhone(client.telephone) : { countryCode: '+212', number: '' };
    setTelCode(p.countryCode); setTelNum(p.number);
    const p2 = client?.telephoneSecondaire ? parsePhone(client.telephoneSecondaire) : { countryCode: '+212', number: '' };
    setTel2Code(p2.countryCode); setTel2Num(p2.number);
    setEmail(client?.email || '');
    setAdresse(client?.adresse || '');
    setVille(client?.ville || '');
    setNotesInternes(client?.notesInternes || '');
  }, [open, client]);

  const duplicates = useMemo(() => {
    const tel = telNum.replace(/\D/g, '');
    const mail = email.trim().toLowerCase();
    const identity = (typeClient === 'societe'
      ? raisonSociale
      : `${nom} ${prenom}`).trim().toLowerCase();
    if (!tel && !mail && identity.length < 3) return [];
    return crm.clients.filter((c) => {
      if (client && c.id === client.id) return false;
      const cTel = parsePhone(c.telephone).number.replace(/\D/g, '');
      const cTel2 = c.telephoneSecondaire ? parsePhone(c.telephoneSecondaire).number.replace(/\D/g, '') : '';
      if (tel.length >= 6 && (cTel === tel || cTel2 === tel)) return true;
      if (mail && c.email && c.email.toLowerCase() === mail) return true;
      if (identity.length >= 3 && clientDisplayName(c).toLowerCase() === identity) return true;
      return false;
    });
  }, [crm.clients, telNum, email, nom, prenom, raisonSociale, typeClient, client]);

  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      typeClient,
      nom: nom.trim() || undefined,
      prenom: prenom.trim() || undefined,
      raisonSociale: raisonSociale.trim() || undefined,
      ice: ice.trim() || undefined,
      telephone: telNum.trim(),
      telephoneSecondaire: tel2Num.trim() || undefined,
      email: email.trim(),
      adresse: adresse.trim() || undefined,
      ville: ville.trim() || undefined,
      notesInternes: notesInternes.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        typeClient,
        nom: typeClient === 'particulier' ? nom.trim() : (nom.trim() || undefined),
        prenom: prenom.trim() || undefined,
        raisonSociale: typeClient === 'societe' ? raisonSociale.trim() : (raisonSociale.trim() || undefined),
        ice: typeClient === 'societe' ? (ice.trim() || undefined) : undefined,
        telephone: serializePhone(telCode, telNum.trim()),
        telephoneSecondaire: tel2Num.trim() ? serializePhone(tel2Code, tel2Num.trim()) : undefined,
        email: email.trim() || undefined,
        adresse: adresse.trim() || undefined,
        ville: ville.trim() || undefined,
        notesInternes: notesInternes.trim() || undefined,
        statut: client?.statut || ('actif' as const),
      };
      const saved = isEdit
        ? await crm.updateClient(client!.id, payload)
        : await crm.addClient(payload);
      toast.success(isEdit ? 'Client mis à jour' : 'Client créé');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type de client *</Label>
            <Select value={typeClient} onValueChange={(v) => setTypeClient(v as ClientType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map(t => (
                  <SelectItem key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {typeClient === 'societe' ? (
            <>
              <div>
                <Label>Raison sociale *</Label>
                <Input className="mt-1" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
              </div>
              <div>
                <Label>Numéro ICE</Label>
                <Input className="mt-1" value={ice} onChange={e => setIce(e.target.value)} placeholder="000000000000000" />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom *</Label>
                <Input className="mt-1" value={nom} onChange={e => setNom(e.target.value)} />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input className="mt-1" value={prenom} onChange={e => setPrenom(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Téléphone *</Label>
            <div className="mt-1">
              <PhoneInput countryCode={telCode} number={telNum} onCountryCodeChange={setTelCode} onNumberChange={setTelNum} />
            </div>
          </div>

          <div>
            <Label>Téléphone secondaire</Label>
            <div className="mt-1">
              <PhoneInput countryCode={tel2Code} number={tel2Num} onCountryCodeChange={setTel2Code} onNumberChange={setTel2Num} />
            </div>
          </div>

          <div>
            <Label>E-mail</Label>
            <Input className="mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ville</Label>
              <Input className="mt-1" value={ville} onChange={e => setVille(e.target.value)} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input className="mt-1" value={adresse} onChange={e => setAdresse(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes internes</Label>
            <Textarea className="mt-1" rows={3} value={notesInternes} onChange={e => setNotesInternes(e.target.value)} />
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Doublons potentiels détectés
              </div>
              <ul className="mt-2 space-y-1 text-amber-900">
                {duplicates.slice(0, 5).map(d => (
                  <li key={d.id}>
                    {clientDisplayName(d)} — {parsePhone(d.telephone).number}
                    {d.email ? ` — ${d.email}` : ''}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                Aucune fusion n'est effectuée automatiquement. Vous pouvez enregistrer malgré tout.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
