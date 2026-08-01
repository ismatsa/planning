import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReturnOriginProvider, useNavigateWithReturn } from '@/lib/returnNav';
import { useStore } from '@/store/StoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Car } from 'lucide-react';
import VehiculeFormDialog from '@/components/crm/VehiculeFormDialog';
import { clientDisplayName, VEHICULE_STATUT_LABELS, VehiculeStatut } from '@/types/crm';

export default function VehiculesList() {
  const { crm } = useStore();
  const navigate = useNavigate();
  const navigateWithReturn = useNavigateWithReturn();
  const location = useLocation();
  const restored = (location.state || {}) as any;

  /** Restore the scroll position when returning from a client / vehicle / quote record. */
  useEffect(() => {
    if (typeof restored.scrollY === 'number') {
      requestAnimationFrame(() => window.scrollTo({ top: restored.scrollY }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState(restored.search ?? '');
  const [filterStatut, setFilterStatut] = useState(restored.filterStatut ?? 'all');
  const [filterMarque, setFilterMarque] = useState(restored.filterMarque ?? 'all');
  const [showArchived, setShowArchived] = useState(restored.showArchived ?? false);
  const [formOpen, setFormOpen] = useState(false);

  const marques = useMemo(
    () => Array.from(new Set(crm.vehicules.map(v => v.marque).filter(Boolean))).sort(),
    [crm.vehicules],
  );

  const clientById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of crm.clients) map[c.id] = clientDisplayName(c);
    return map;
  }, [crm.clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crm.vehicules
      .filter(v => showArchived || v.statut !== 'archive')
      .filter(v => filterStatut === 'all' || v.statut === filterStatut)
      .filter(v => filterMarque === 'all' || v.marque === filterMarque)
      .filter(v => {
        if (!q) return true;
        return [v.vin, v.immatriculation || '', v.marque, v.modele, v.clientId ? clientById[v.clientId] || '' : '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => `${a.marque} ${a.modele}`.localeCompare(`${b.marque} ${b.modele}`));
  }, [crm.vehicules, search, filterStatut, filterMarque, showArchived, clientById]);

  return (
    <ReturnOriginProvider value={() => ({ label: 'Véhicules', state: { search, filterStatut, filterMarque, showArchived, scrollY: window.scrollY } })}>
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-display font-bold">Véhicules</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau véhicule
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="VIN, immatriculation, marque, modèle, propriétaire…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterMarque} onValueChange={setFilterMarque}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes marques</SelectItem>
            {marques.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(VEHICULE_STATUT_LABELS) as VehiculeStatut[]).map(s => (
              <SelectItem key={s} value={s}>{VEHICULE_STATUT_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
          Afficher les archivés
        </label>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun véhicule</div>
        )}
        {filtered.map(v => (
          <button
            key={v.id}
            onClick={() => navigateWithReturn(`/vehicules/${v.id}`)}
            className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{v.marque} {v.modele}</span>
                {v.annee && <span className="text-xs text-muted-foreground">{v.annee}</span>}
                <Badge variant={v.statut === 'actif' ? 'secondary' : 'outline'}>
                  {VEHICULE_STATUT_LABELS[v.statut]}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate font-mono">
                VIN {v.vin}{v.immatriculation ? ` • ${v.immatriculation}` : ''}
              </div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0 truncate max-w-[160px]">
              {v.clientId ? clientById[v.clientId] : 'Sans propriétaire'}
            </div>
          </button>
        ))}
      </div>

      <VehiculeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(v) => navigateWithReturn(`/vehicules/${v.id}`)}
      />
    </div>
    </ReturnOriginProvider>
  );
}
