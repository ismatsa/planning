import { useState, useEffect } from 'react';
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
import { Entretien, EntretienType, ENTRETIEN_TYPE_LABELS } from '@/types/crm';
import ClientVehiculeSelector, { ClientVehiculeValue } from '@/components/crm/ClientVehiculeSelector';
import { toast as _toast } from 'sonner';

const schema = z.object({
  dateEntretien: z.string().min(1, 'La date est obligatoire'),
  kilometrage: z.number().int().min(0, 'Le kilométrage doit être positif').optional(),
  description: z.string().trim().max(2000).optional(),
  piecesUtilisees: z.string().trim().max(2000).optional(),
  cout: z.number().min(0, 'Le coût doit être positif').optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si absent, un sélecteur client/véhicule est affiché */
  vehiculeId?: string;
  entretien?: Entretien | null;
}

export default function EntretienFormDialog({ open, onOpenChange, vehiculeId, entretien }: Props) {
  const { crm } = useStore();
  const isEdit = !!entretien;

  const [date, setDate] = useState('');
  const [type, setType] = useState<EntretienType>('revision');
  const [km, setKm] = useState('');
  const [description, setDescription] = useState('');
  const [pieces, setPieces] = useState('');
  const [cout, setCout] = useState('');
  const [saving, setSaving] = useState(false);
  const [cv, setCv] = useState<ClientVehiculeValue>({});
  const effectiveVehiculeId = vehiculeId || cv.vehiculeId;

  useEffect(() => {
    if (!open) return;
    setCv({ vehiculeId: entretien?.vehiculeId });
    setDate(entretien?.dateEntretien || new Date().toISOString().slice(0, 10));
    setType(entretien?.typeEntretien || 'revision');
    setKm(entretien?.kilometrage != null ? String(entretien.kilometrage) : '');
    setDescription(entretien?.description || '');
    setPieces(entretien?.piecesUtilisees || '');
    setCout(entretien?.cout != null ? String(entretien.cout) : '');
  }, [open, entretien]);

  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      dateEntretien: date,
      kilometrage: km ? Number(km) : undefined,
      description: description.trim() || undefined,
      piecesUtilisees: pieces.trim() || undefined,
      cout: cout ? Number(cout) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!effectiveVehiculeId) {
      toast.error('Veuillez sélectionner un véhicule');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vehiculeId: effectiveVehiculeId,
        dateEntretien: date,
        typeEntretien: type,
        kilometrage: km ? Number(km) : undefined,
        description: description.trim() || undefined,
        piecesUtilisees: pieces.trim() || undefined,
        cout: cout ? Number(cout) : undefined,
      };
      if (isEdit) await crm.updateEntretien(entretien!.id, payload);
      else await crm.addEntretien(payload);
      toast.success(isEdit ? 'Entretien mis à jour' : 'Entretien ajouté');
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
          <DialogTitle>{isEdit ? 'Modifier l\'entretien' : 'Nouvel entretien'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!vehiculeId && (
            <ClientVehiculeSelector key={String(open)} value={cv} onChange={setCv} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input className="mt-1" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EntretienType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENTRETIEN_TYPE_LABELS) as EntretienType[]).map(t => (
                    <SelectItem key={t} value={t}>{ENTRETIEN_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kilométrage</Label>
              <Input className="mt-1" type="number" min={0} value={km} onChange={e => setKm(e.target.value)} />
            </div>
            <div>
              <Label>Coût (Dhs)</Label>
              <Input className="mt-1" type="number" min={0} step="0.01" value={cout} onChange={e => setCout(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Description des travaux</Label>
            <Textarea className="mt-1" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div>
            <Label>Pièces utilisées</Label>
            <Textarea className="mt-1" rows={2} value={pieces} onChange={e => setPieces(e.target.value)} />
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
