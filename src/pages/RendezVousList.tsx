import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { STATUT_LABELS, StatutRdv } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Search, MoreHorizontal, MessageCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import RdvModal from '@/components/planning/RdvModal';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import type { RendezVous } from '@/types';
import { toast } from 'sonner';
import { getEventState, roundToNearest15Minutes, isUnresolved } from '@/lib/planning';
import { useAuth } from '@/store/AuthContext';

const statusBadgeClass: Record<StatutRdv, string> = {
  prevu: 'bg-muted text-muted-foreground',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-destructive/10 text-destructive',
  noshow: 'bg-black text-white',
  termine: 'bg-emerald-100 text-emerald-700',
};

export default function RendezVousList() {
  const { rdvs, postes, updateRdv, metiers } = useStore();
  const { user, isAdmin, permissions } = useAuth();
  const [filterMetier, setFilterMetier] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [hidePastEvents, setHidePastEvents] = useState(false);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rdvs
      .filter(r => {
        if (!isAdmin && !permissions.includes(r.posteId)) return false;
        const poste = postes.find(p => p.id === r.posteId);
        if (filterMetier !== 'all' && poste?.metierId !== filterMetier) return false;
        if (filterStatut !== 'all' && r.statut !== filterStatut) return false;
        if (search) {
          const s = search.toLowerCase();
          const vehicleStr = [r.marque, r.modele].filter(Boolean).join(' ').toLowerCase();
          if (
            !r.clientNom?.toLowerCase().includes(s) &&
            !vehicleStr.includes(s) &&
            !poste?.nom.toLowerCase().includes(s)
          ) return false;
        }
        if (hidePastEvents) {
          const endTime = r.fin ? new Date(r.fin).getTime() : new Date(r.debut).getTime();
          const isPast = endTime < now;
          if (isPast && ['noshow', 'annule', 'termine'].includes(r.statut)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());
  }, [rdvs, postes, filterMetier, filterStatut, search, hidePastEvents, isAdmin, permissions]);

  async function changeStatut(rdv: RendezVous, newStatut: StatutRdv) {
    let fin = rdv.fin;
    let debut = rdv.debut;
    // If switching to 'termine' or 'noshow' while event is en_cours, snap fin to nearest 15min
    const state = getEventState(rdv.debut, rdv.fin);
    if ((newStatut === 'termine' || newStatut === 'noshow') && state === 'en_cours') {
      fin = roundToNearest15Minutes(new Date()).toISOString();
    }
    await updateRdv({ ...rdv, statut: newStatut, debut, fin });
    toast.success(`Statut changé en « ${STATUT_LABELS[newStatut]} ».`);
  }

  function getAvailableStatuts(rdv: RendezVous): StatutRdv[] {
    const state = getEventState(rdv.debut, rdv.fin);
    return (Object.keys(STATUT_LABELS) as StatutRdv[]).filter(k => {
      if (k === 'termine' && state === 'futur') return false;
      return true;
    });
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Rendez-vous</h1>
        <p className="text-sm text-muted-foreground">{rdvs.length} rendez-vous au total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
        <Select value={filterMetier} onValueChange={setFilterMetier}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Métier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les métiers</SelectItem>
            {metiers.map(m => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none ml-1">
          <Checkbox checked={hidePastEvents} onCheckedChange={(v) => setHidePastEvents(!!v)} />
          Masquer les événements passés
        </label>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucun rendez-vous</p>
          <p className="text-sm mt-1">Ajoutez-en un depuis le planning pour démarrer.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Horaire</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Poste</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Véhicule</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const poste = postes.find(p => p.id === r.posteId);
                const metier = metiers.find(m => m.id === poste?.metierId);
                const unresolved = isUnresolved(r.debut, r.fin, r.statut);
                return (
                  <tr
                    key={r.id}
                    className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${unresolved ? 'text-destructive' : ''}`}
                    onClick={() => {
                      if (r.createdBy !== user?.id) {
                        toast.error("Vous ne pouvez modifier que vos propres rendez-vous.");
                        return;
                      }
                      setEditRdv(r); setModalOpen(true);
                    }}
                  >
                    <td className="px-4 py-3 font-medium">
                      {format(new Date(r.debut), 'EEE d MMM', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      {format(new Date(r.debut), 'HH:mm')} – {format(new Date(r.fin), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium metier-${metier?.couleur}-light`}>
                        {poste?.nom}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.createdBy === user?.id ? (r.clientNom || '—') : '—'}</td>
                    <td className="px-4 py-3 text-xs">{[r.marque, r.modele].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={statusBadgeClass[r.statut]}>
                        {STATUT_LABELS[r.statut]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {r.createdBy === user?.id ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getAvailableStatuts(r).map(s => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === r.statut}
                                onClick={() => changeStatut(r, s)}
                                className={s === r.statut ? 'font-semibold' : ''}
                              >
                                <Badge variant="secondary" className={`${statusBadgeClass[s]} mr-2 pointer-events-none`}>
                                  {STATUT_LABELS[s]}
                                </Badge>
                                {s === r.statut && '(actuel)'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RdvModal open={modalOpen} onClose={() => setModalOpen(false)} rdv={editRdv} />
    </div>
  );
}
