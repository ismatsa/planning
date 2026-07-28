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
import { useStore } from '@/store/StoreContext';
import {
  Vehicule, VehiculeStatut, CarburantType, BoiteVitessesType,
  CARBURANT_LABELS, BOITE_LABELS, VEHICULE_STATUT_LABELS,
  clientDisplayName, normalizeVin,
} from '@/types/crm';

const NONE = '__none__';

const schema = z.object({
  vin: z.string().trim().min(5, 'Le VIN est obligatoire').max(32, 'VIN trop long'),
  immatriculation: z.string().trim().max(20).optional(),
  marque: z.string().trim().min(1, 'La marque est obligatoire').max(60),
  modele: z.string().trim().min(1, 'Le modèle est obligatoire').max(80),
  annee: z.number().int().min(1900).max(2100).optional(),
  kilometrageActuel: z.number().int().min(0, 'Le kilométrage doit être positif').optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicule?: Vehicule | null;
  defaultClientId?: string;
  defaultVin?: string;
  onSaved?: (v: Vehicule) => void;
}

export default function VehiculeFormDialog({ open, onOpenChange, vehicule, defaultClientId, defaultVin, onSaved }: Props) {
  const { crm } = useStore();
  const isEdit = !!vehicule;

  const [vin, setVin] = useState('');
  const [immatriculation, setImmatriculation] = useState('');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [annee, setAnnee] = useState('');
  const [motorisation, setMotorisation] = useState('');
  const [carburant, setCarburant] = useState<string>(NONE);
  const [boite, setBoite] = useState<string>(NONE);
  const [km, setKm] = useState('');
  const [statut, setStatut] = useState<VehiculeStatut>('actif');
  const [clientId, setClientId] = useState<string>(NONE);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVin(vehicule?.vin || defaultVin || '');
    setImmatriculation(vehicule?.immatriculation || '');
    setMarque(vehicule?.marque || '');
    setModele(vehicule?.modele || '');
    setAnnee(vehicule?.annee ? String(vehicule.annee) : '');
    setMotorisation(vehicule?.motorisation || '');
    setCarburant(vehicule?.carburant || NONE);
    setBoite(vehicule?.boiteVitesses || NONE);
    setKm(vehicule?.kilometrageActuel != null ? String(vehicule.kilometrageActuel) : '');
    setStatut(vehicule?.statut || 'actif');
    setClientId(vehicule?.clientId || defaultClientId || NONE);
    setNotes(vehicule?.notes || '');
  }, [open, vehicule, defaultClientId, defaultVin]);

  const clientOptions = useMemo(
    () => crm.clients.filter(c => c.statut === 'actif' || c.id === vehicule?.clientId),
    [crm.clients, vehicule],
  );

  const vinConflict = useMemo(() => {
    const v = normalizeVin(vin);
    if (v.length < 5) return null;
    return crm.vehicules.find(x => normalizeVin(x.vin) === v && x.id !== vehicule?.id) || null;
  }, [vin, crm.vehicules, vehicule]);

  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      vin: vin.trim(),
      immatriculation: immatriculation.trim() || undefined,
      marque: marque.trim(),
      modele: modele.trim(),
      annee: annee ? Number(annee) : undefined,
      kilometrageActuel: km ? Number(km) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (vinConflict) {
      toast.error('Ce VIN est déjà enregistré sur un autre véhicule');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vin: normalizeVin(vin),
        immatriculation: immatriculation.trim() || undefined,
        marque: marque.trim(),
        modele: modele.trim(),
        annee: annee ? Number(annee) : undefined,
        motorisation: motorisation.trim() || undefined,
        carburant: carburant === NONE ? undefined : (carburant as CarburantType),
        boiteVitesses: boite === NONE ? undefined : (boite as BoiteVitessesType),
        kilometrageActuel: km ? Number(km) : undefined,
        statut,
        clientId: clientId === NONE ? undefined : clientId,
        notes: notes.trim() || undefined,
      };
      const saved = isEdit
        ? await crm.updateVehicule(vehicule!.id, payload)
        : await crm.addVehicule(payload);
      toast.success(isEdit ? 'Véhicule mis à jour' : 'Véhicule créé');
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
          <DialogTitle>{isEdit ? 'Modifier le véhicule' : 'Nouveau véhicule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>VIN *</Label>
            <Input
              className="mt-1 uppercase"
              value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())}
              placeholder="Identifiant principal du véhicule"
            />
            {vinConflict && (
              <p className="mt-1 text-xs text-destructive">
                Déjà utilisé par {vinConflict.marque} {vinConflict.modele}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Immatriculation</Label>
              <Input className="mt-1 uppercase" value={immatriculation} onChange={e => setImmatriculation(e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Année</Label>
              <Input className="mt-1" type="number" value={annee} onChange={e => setAnnee(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marque *</Label>
              <Input className="mt-1" value={marque} onChange={e => setMarque(e.target.value)} />
            </div>
            <div>
              <Label>Modèle *</Label>
              <Input className="mt-1" value={modele} onChange={e => setModele(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Motorisation</Label>
              <Input className="mt-1" value={motorisation} onChange={e => setMotorisation(e.target.value)} />
            </div>
            <div>
              <Label>Kilométrage actuel</Label>
              <Input className="mt-1" type="number" min={0} value={km} onChange={e => setKm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Carburant</Label>
              <Select value={carburant} onValueChange={setCarburant}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(Object.keys(CARBURANT_LABELS) as CarburantType[]).map(c => (
                    <SelectItem key={c} value={c}>{CARBURANT_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Boîte de vitesses</Label>
              <Select value={boite} onValueChange={setBoite}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(Object.keys(BOITE_LABELS) as BoiteVitessesType[]).map(b => (
                    <SelectItem key={b} value={b}>{BOITE_LABELS[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as VehiculeStatut)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICULE_STATUT_LABELS) as VehiculeStatut[]).map(s => (
                    <SelectItem key={s} value={s}>{VEHICULE_STATUT_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEdit && (
              <div>
                <Label>Propriétaire</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {clientOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Le propriétaire se modifie via l'action « Changer de propriétaire », qui conserve l'historique.
            </p>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
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
