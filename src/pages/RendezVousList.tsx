import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { METIERS, STATUT_LABELS, StatutRdv } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, X, Search } from 'lucide-react';
import RdvModal from '@/components/planning/RdvModal';
import type { RendezVous } from '@/types';
import { toast } from 'sonner';

const statusBadgeClass: Record<StatutRdv, string> = {
  prevu: 'bg-muted text-muted-foreground',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-destructive/10 text-destructive',
  noshow: 'bg-mecanique-light text-mecanique',
};

export default function RendezVousList() {
  const { rdvs, postes, updateRdv } = useStore();
  const [filterMetier, setFilterMetier] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);

  const filtered = useMemo(() => {
    return rdvs
      .filter(r => {
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
        return true;
      })
      .sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());
  }, [rdvs, postes, filterMetier, filterStatut, search]);

  async function quickConfirm(rdv: RendezVous) {
    await updateRdv({ ...rdv, statut: 'confirme' });
    toast.success('Rendez-vous confirmé.');
  }

  async function quickCancel(rdv: RendezVous) {
    await updateRdv({ ...rdv, statut: 'annule' });
    toast.success('Rendez-vous annulé.');
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
            {METIERS.map(m => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
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
                const metier = METIERS.find(m => m.id === poste?.metierId);
                return (
                  <tr
                    key={r.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => { setEditRdv(r); setModalOpen(true); }}
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
                    <td className="px-4 py-3">{r.clientNom || '—'}</td>
                    <td className="px-4 py-3 text-xs">{[r.marque, r.modele].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={statusBadgeClass[r.statut]}>
                        {STATUT_LABELS[r.statut]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {r.statut === 'prevu' && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => quickConfirm(r)} title="Confirmer">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => quickCancel(r)} title="Annuler">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
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
