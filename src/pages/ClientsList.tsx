import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Building2, User as UserIcon, Car } from 'lucide-react';
import { parsePhone } from '@/components/ui/phone-input';
import ClientFormDialog from '@/components/crm/ClientFormDialog';
import { clientDisplayName, CLIENT_TYPE_LABELS, ClientType } from '@/types/crm';

export default function ClientsList() {
  const { crm } = useStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const vehiculeCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of crm.vehicules) {
      if (v.clientId) map[v.clientId] = (map[v.clientId] || 0) + 1;
    }
    return map;
  }, [crm.vehicules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crm.clients
      .filter(c => showArchived || c.statut === 'actif')
      .filter(c => filterType === 'all' || c.typeClient === filterType)
      .filter(c => {
        if (!q) return true;
        const tel = parsePhone(c.telephone).number;
        const tel2 = c.telephoneSecondaire ? parsePhone(c.telephoneSecondaire).number : '';
        return [clientDisplayName(c), c.email || '', tel, tel2, c.ville || '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)));
  }, [crm.clients, search, filterType, showArchived]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-display font-bold">Clients</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau client
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Nom, société, téléphone, e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map(t => (
              <SelectItem key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</SelectItem>
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
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun client</div>
        )}
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => navigate(`/clients/${c.id}`)}
            className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              {c.typeClient === 'societe'
                ? <Building2 className="h-4 w-4 text-muted-foreground" />
                : <UserIcon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{clientDisplayName(c)}</span>
                <Badge variant="secondary">{CLIENT_TYPE_LABELS[c.typeClient]}</Badge>
                {c.statut === 'archive' && <Badge variant="outline">Archivé</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {parsePhone(c.telephone).number}
                {c.email ? ` • ${c.email}` : ''}
                {c.ville ? ` • ${c.ville}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Car className="h-3.5 w-3.5" />
              {vehiculeCount[c.id] || 0}
            </div>
          </button>
        ))}
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />
    </div>
  );
}
