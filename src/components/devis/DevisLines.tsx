import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
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
}

interface ProfileOption { id: string; company: string; }

interface DevisLinesProps {
  devisId: string;
}

export default function DevisLines({ devisId }: DevisLinesProps) {
  const [lines, setLines] = useState<DevisLine[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [saving, setSaving] = useState(false);

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
    const newLine: DevisLine = {
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
      sort_order: lines.length,
    };
    setLines(prev => [...prev, newLine]);
  }

  function updateLine(id: string, field: keyof DevisLine, value: any) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // If switching to service, clear commande_user_id
      if (field === 'type' && value === 'service') {
        updated.commande_user_id = null;
      }
      return updated;
    }));
  }

  function removeLine(id: string) {
    setLines(prev => prev.filter(l => l.id !== id));
  }

  const saveLines = useCallback(async () => {
    setSaving(true);
    try {
      // Delete existing lines for this devis
      await supabase.from('devis_lines').delete().eq('devis_id', devisId);

      if (lines.length > 0) {
        const rows = lines.map((l, i) => ({
          id: l.id,
          devis_id: devisId,
          type: l.type,
          name: l.name,
          oem_reference: l.oem_reference || null,
          internal_reference: l.internal_reference || null,
          quantity: l.quantity,
          realisation_user_id: l.realisation_user_id || null,
          commande_user_id: l.type === 'service' ? null : (l.commande_user_id || null),
          unit_price: l.unit_price,
          sort_order: i,
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

  const total = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);

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
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Réf. OEM</TableHead>
                <TableHead>Réf. interne</TableHead>
                <TableHead className="w-[80px]">Qté</TableHead>
                <TableHead className="w-[150px]">Réalisation</TableHead>
                <TableHead className="w-[150px]">Commande</TableHead>
                <TableHead className="w-[110px]">Prix unit.</TableHead>
                <TableHead className="w-[90px]">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => {
                const isService = line.type === 'service';
                return (
                  <TableRow key={line.id}>
                    {/* Type */}
                    <TableCell className="p-1.5">
                      <Select value={line.type} onValueChange={v => updateLine(line.id, 'type', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="produit">Produit</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Nom */}
                    <TableCell className="p-1.5">
                      <Input
                        className="h-8 text-xs"
                        value={line.name}
                        onChange={e => updateLine(line.id, 'name', e.target.value)}
                        placeholder="Nom"
                      />
                    </TableCell>
                    {/* Réf OEM */}
                    <TableCell className="p-1.5">
                      <Input
                        className={`h-8 text-xs ${isService ? 'opacity-40' : ''}`}
                        value={line.oem_reference || ''}
                        onChange={e => updateLine(line.id, 'oem_reference', e.target.value)}
                        placeholder="Réf. OEM"
                        disabled={isService}
                      />
                    </TableCell>
                    {/* Réf interne */}
                    <TableCell className="p-1.5">
                      <Input
                        className="h-8 text-xs"
                        value={line.internal_reference || ''}
                        onChange={e => updateLine(line.id, 'internal_reference', e.target.value)}
                        placeholder="Réf. interne"
                      />
                    </TableCell>
                    {/* Quantité */}
                    <TableCell className="p-1.5">
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </TableCell>
                    {/* Réalisation */}
                    <TableCell className="p-1.5">
                      <Select
                        value={line.realisation_user_id || undefined}
                        onValueChange={v => updateLine(line.id, 'realisation_user_id', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Commande */}
                    <TableCell className="p-1.5">
                      {isService ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={line.commande_user_id || undefined}
                          onValueChange={v => updateLine(line.id, 'commande_user_id', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    {/* Prix unitaire */}
                    <TableCell className="p-1.5">
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unit_price}
                        onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    {/* Total ligne */}
                    <TableCell className="p-1.5 text-xs font-medium text-right">
                      {(line.quantity * line.unit_price).toFixed(2)} €
                    </TableCell>
                    {/* Supprimer */}
                    <TableCell className="p-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Total */}
          <div className="flex justify-end mt-3 pr-2">
            <span className="text-sm font-bold text-foreground">
              Total : {total.toFixed(2)} €
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
