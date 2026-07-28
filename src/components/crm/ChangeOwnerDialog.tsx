import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/StoreContext';
import { Vehicule, ProprietaireMotif, MOTIF_LABELS, clientDisplayName } from '@/types/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicule: Vehicule;
}

export default function ChangeOwnerDialog({ open, onOpenChange, vehicule }: Props) {
  const { crm } = useStore();
  const [clientId, setClientId] = useState('');
  const [motif, setMotif] = useState<ProprietaireMotif>('transfert');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentOwner = useMemo(
    () => crm.clients.find(c => c.id === vehicule.clientId),
    [crm.clients, vehicule.clientId],
  );

  const options = useMemo(
    () => crm.clients.filter(c => c.statut === 'actif' && c.id !== vehicule.clientId),
    [crm.clients, vehicule.clientId],
  );

  const handleConfirm = async () => {
    if (!clientId) {
      toast.error('Sélectionnez le nouveau propriétaire');
      return;
    }
    setSaving(true);
    try {
      await crm.transferVehicule(vehicule.id, clientId, motif, new Date(date).toISOString());
      toast.success('Propriétaire mis à jour, historique conservé');
      onOpenChange(false);
      setConfirmed(false);
      setClientId('');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors du transfert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmed(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Changer de propriétaire</DialogTitle>
          <DialogDescription>
            Le VIN, les rendez-vous, les devis et le carnet d'entretien du véhicule sont conservés.
            L'ancien propriétaire reste visible dans l'historique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Propriétaire actuel : <span className="font-medium text-foreground">{clientDisplayName(currentOwner)}</span>
          </div>

          <div>
            <Label>Nouveau propriétaire *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {options.map(c => (
                  <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date du transfert</Label>
              <Input className="mt-1" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Motif</Label>
              <Select value={motif} onValueChange={(v) => setMotif(v as ProprietaireMotif)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MOTIF_LABELS) as ProprietaireMotif[]).map(m => (
                    <SelectItem key={m} value={m}>{MOTIF_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            <span>Je confirme le changement de propriétaire de ce véhicule.</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!confirmed || saving}>
            {saving ? 'Transfert…' : 'Confirmer le transfert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
