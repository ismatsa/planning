import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, FileText, Percent, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface DevisLine {
  id: string;
  devis_id: string;
  type: string;
  name: string;
  oem_reference: string | null;
  internal_reference: string | null;
  quantity: number;
  realisation_user_id: string | null;
  commande_user_id: string | null;
  unit_price: number;
  sort_order: number;
  description: string | null;
  discount_amount: number;
  discount_percent: number;
}

interface ProfileOption { id: string; company: string; }

function getLineGross(line: DevisLine) {
  return line.quantity * line.unit_price;
}

function getLineNet(line: DevisLine) {
  return Math.max(0, getLineGross(line) - line.discount_amount);
}

export default function DevisLines({ devisId }: { devisId: string }) {
  const [lines, setLines] = useState<DevisLine[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Description modal
  const [descLineId, setDescLineId] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState('');

  // Discount modal
  const [discLineId, setDiscLineId] = useState<string | null>(null);
  const [discAmount, setDiscAmount] = useState(0);
  const [discPercent, setDiscPercent] = useState(0);

  useEffect(() => {
    async function load() {
      const [linesRes, profilesRes] = await Promise.all([
        supabase.from('devis_lines').select('*').eq('devis_id', devisId).order('sort_order'),
        supabase.from('profiles').select('id, company'),
      ]);
      if (linesRes.data) setLines(linesRes.data as any[]);
      if (profilesRes.data) {
        setProfiles(
          (profilesRes.data as any[])
            .filter((p: any) => p.company && p.company.trim() !== '')
            .map((p: any) => ({ id: p.id, company: p.company }))
        );
      }
    }
    load();
  }, [devisId]);

  function addLine() {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(),
      devis_id: devisId,
      type: 'produit',
      name: '',
      oem_reference: null,
      internal_reference: null,
      quantity: 1,
      realisation_user_id: null,
      commande_user_id: null,
      unit_price: 0,
      sort_order: prev.length,
      description: null,
      discount_amount: 0,
      discount_percent: 0,
    }]);
  }

  function updateLine(id: string, field: keyof DevisLine, value: any) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'type' && value === 'service') updated.commande_user_id = null;
      return updated;
    }));
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  // Description
  function openDescription(lineId: string) {
    const line = lines.find(l => l.id === lineId);
    setDescDraft(line?.description || '');
    setDescLineId(lineId);
  }
  function saveDescription() {
    if (descLineId) updateLine(descLineId, 'description', descDraft || null);
    setDescLineId(null);
  }

  // Discount
  function openDiscount(lineId: string) {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    setDiscAmount(line.discount_amount);
    setDiscPercent(line.discount_percent);
    setDiscLineId(lineId);
  }
  function handleDiscAmountChange(val: number) {
    setDiscAmount(val);
    const line = lines.find(l => l.id === discLineId);
    if (!line) return;
    const gross = getLineGross(line);
    setDiscPercent(gross > 0 ? Math.round((val / gross) * 10000) / 100 : 0);
  }
  function handleDiscPercentChange(val: number) {
    setDiscPercent(val);
    const line = lines.find(l => l.id === discLineId);
    if (!line) return;
    const gross = getLineGross(line);
    setDiscAmount(Math.round(gross * val) / 100);
  }
  function saveDiscount() {
    if (discLineId) {
      setLines(prev => prev.map(l =>
        l.id === discLineId ? { ...l, discount_amount: discAmount, discount_percent: discPercent } : l
      ));
    }
    setDiscLineId(null);
  }

  const saveLines = useCallback(async () => {
    setSaving(true);
    try {
      await supabase.from('devis_lines').delete().eq('devis_id', devisId);
      if (lines.length > 0) {
        const rows = lines.map((l, i) => ({
          id: l.id, devis_id: devisId, type: l.type, name: l.name,
          oem_reference: l.oem_reference || null,
          internal_reference: l.internal_reference || null,
          quantity: l.quantity,
          realisation_user_id: l.realisation_user_id || null,
          commande_user_id: l.type === 'service' ? null : (l.commande_user_id || null),
          unit_price: l.unit_price, sort_order: i,
          description: l.description || null,
          discount_amount: l.discount_amount, discount_percent: l.discount_percent,
        }));
        const { error } = await supabase.from('devis_lines').insert(rows as any);
        if (error) throw error;
      }
      toast.success('Lignes enregistrées');
    } catch {
      toast.error('Erreur lors de la sauvegarde des lignes');
    } finally {
      setSaving(false);
    }
  }, [lines, devisId]);

  const total = lines.reduce((sum, l) => sum + getLineNet(l), 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">Lignes du devis</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
          <Button size="sm" onClick={saveLines} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Aucune ligne. Cliquez sur « Ajouter » pour commencer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]"></TableHead>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Réf. OEM</TableHead>
                <TableHead>Réf. interne</TableHead>
                <TableHead className="w-[80px]">Qté</TableHead>
                <TableHead className="w-[150px]">Réalisation</TableHead>
                <TableHead className="w-[150px]">Commande</TableHead>
                <TableHead className="w-[110px]">Prix unit.</TableHead>
                <TableHead className="w-[100px]">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => {
                const isService = line.type === 'service';
                const hasDesc = !!line.description?.trim();
                const hasDisc = line.discount_amount > 0;
                const net = getLineNet(line);
                return (
                  <TableRow key={line.id}>
                    {/* Icons: description + discount */}
                    <TableCell className="p-1.5">
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost" size="icon"
                          className={`h-7 w-7 ${hasDesc ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={() => openDescription(line.id)} title="Description"
                        >
                          <FileText className={`h-3.5 w-3.5 ${hasDesc ? 'fill-primary/20' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={`h-7 w-7 ${hasDisc ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={() => openDiscount(line.id)} title="Remise"
                        >
                          <Percent className={`h-3.5 w-3.5 ${hasDisc ? 'fill-primary/20' : ''}`} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Select value={line.type} onValueChange={v => updateLine(line.id, 'type', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="produit">Produit</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input className="h-8 text-xs" value={line.name}
                        onChange={e => updateLine(line.id, 'name', e.target.value)} placeholder="Nom" />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input className={`h-8 text-xs ${isService ? 'opacity-40' : ''}`}
                        value={line.oem_reference || ''}
                        onChange={e => updateLine(line.id, 'oem_reference', e.target.value)}
                        placeholder="Réf. OEM" disabled={isService} />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input className="h-8 text-xs" value={line.internal_reference || ''}
                        onChange={e => updateLine(line.id, 'internal_reference', e.target.value)}
                        placeholder="Réf. interne" />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input className="h-8 text-xs" type="number" min={1} value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)} />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Select value={line.realisation_user_id || undefined}
                        onValueChange={v => updateLine(line.id, 'realisation_user_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isService ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Select value={line.commande_user_id || undefined}
                          onValueChange={v => updateLine(line.id, 'commande_user_id', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Input className="h-8 text-xs" type="number" min={0} step={0.01}
                        value={line.unit_price}
                        onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="p-1.5 text-right whitespace-nowrap">
                      <span className="text-xs font-medium">{net.toFixed(2)} Dhs</span>
                      {hasDisc && (
                        <span className="block text-[10px] text-muted-foreground line-through">
                          {getLineGross(line).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5">
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-3 pr-2">
            <span className="text-sm font-bold text-foreground">
              Total : {total.toFixed(2)} Dhs
            </span>
          </div>
        </div>
      )}

      {/* Description modal */}
      <Dialog open={!!descLineId} onOpenChange={open => { if (!open) setDescLineId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Description</DialogTitle></DialogHeader>
          <Textarea value={descDraft} onChange={e => setDescDraft(e.target.value)}
            placeholder="Ajouter une description…" rows={5} />
          <DialogFooter className="flex-row gap-2">
            <Button variant="ghost" onClick={() => setDescLineId(null)}>Annuler</Button>
            <Button onClick={saveDescription}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount modal */}
      <Dialog open={!!discLineId} onOpenChange={open => { if (!open) setDiscLineId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remise</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Montant de la remise (Dhs)</Label>
              <Input type="number" min={0} step={0.01} value={discAmount}
                onChange={e => handleDiscAmountChange(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Pourcentage de remise (%)</Label>
              <Input type="number" min={0} max={100} step={0.01} value={discPercent}
                onChange={e => handleDiscPercentChange(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="ghost" onClick={() => setDiscLineId(null)}>Annuler</Button>
            <Button onClick={saveDiscount}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
