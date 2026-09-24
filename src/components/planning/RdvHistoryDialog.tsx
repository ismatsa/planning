import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { STATUT_LABELS } from '@/types';
import { format } from 'date-fns';
import { History, Loader2 } from 'lucide-react';

interface Entry {
  id: string;
  action: 'create' | 'update' | 'delete';
  user_name: string | null;
  changes: Record<string, { old: any; new: any }>;
  created_at: string;
}

const LABELS: Record<string, string> = {
  horaire: 'Horaire', poste_id: 'Poste de travail', client_nom: 'Client', client_tel: 'Téléphone',
  notes: 'Notes internes', statut: 'Statut', marque: 'Marque', modele: 'Modèle', annee: 'Année', vin: 'VIN',
  billing_responsible_user_id: 'Facturation', client_id: 'Client (fiche)', vehicule_id: 'Véhicule (fiche)',
  responsables_ajoutes: 'Responsable ajouté', responsables_retires: 'Responsable retiré',
  intervenants_ajoutes: 'Intervenant ajouté', intervenants_retires: 'Intervenant retiré',
};

type Maps = Record<string, Record<string, string>>;

function fmtDate(v: any) {
  if (!v) return '—';
  try { return format(new Date(v), "dd/MM/yyyy HH'h'mm"); } catch { return String(v); }
}

function fmtValue(key: string, v: any, m: Maps): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.map(x => fmtValue(key, x, m)).join(', ');
  switch (key) {
    case 'poste_id': return m.postes[v] || v;
    case 'statut': return (STATUT_LABELS as any)[v] || v;
    case 'billing_responsible_user_id':
    case 'responsables_ajoutes':
    case 'responsables_retires': return m.profiles[v] || 'Utilisateur supprimé';
    case 'intervenants_ajoutes':
    case 'intervenants_retires': return m.intervenants[v] || 'Intervenant supprimé';
    case 'client_id': return m.clients[v] || v;
    case 'vehicule_id': return m.vehicules[v] || v;
    case 'client_tel': return String(v).replace('|', ' ');
    case 'notes': return `« ${v} »`;
    default: return String(v);
  }
}

function rows(e: Entry) {
  const c = { ...e.changes };
  const out: { key: string; old: any; new: any }[] = [];
  if (c.debut || c.fin) {
    const o = [c.debut?.old, c.fin?.old], n = [c.debut?.new, c.fin?.new];
    out.push({ key: 'horaire', old: o, new: n });
    delete c.debut; delete c.fin;
  }
  Object.entries(c).forEach(([k, v]) => out.push({ key: k, old: v?.old, new: v?.new }));
  return out;
}

export default function RdvHistoryDialog({ open, onClose, rdvId }: { open: boolean; onClose: () => void; rdvId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [maps, setMaps] = useState<Maps>({ postes: {}, profiles: {}, intervenants: {}, clients: {}, vehicules: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('rdv_history' as any).select('*').eq('rdv_id', rdvId).order('created_at', { ascending: false });
      const list = ((data as any[]) || []) as Entry[];
      const ids = { clients: new Set<string>(), vehicules: new Set<string>() };
      list.forEach(e => Object.entries(e.changes || {}).forEach(([k, v]) => {
        const s = k === 'client_id' ? ids.clients : k === 'vehicule_id' ? ids.vehicules : null;
        if (s) [v?.old, v?.new].forEach(x => x && s.add(x));
      }));
      const [p, pr, it, cl, ve] = await Promise.all([
        supabase.from('postes').select('id, nom'),
        supabase.from('profiles').select('id, company, email'),
        supabase.from('intervenants').select('id, name'),
        ids.clients.size ? supabase.from('clients').select('id, nom, prenom, raison_sociale').in('id', [...ids.clients]) : Promise.resolve({ data: [] as any[] }),
        ids.vehicules.size ? supabase.from('vehicules').select('id, marque, modele, immatriculation').in('id', [...ids.vehicules]) : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancel) return;
      const toMap = (arr: any[] | null, f: (x: any) => string) => Object.fromEntries((arr || []).map(x => [x.id, f(x)]));
      setMaps({
        postes: toMap(p.data, x => x.nom),
        profiles: toMap(pr.data, x => x.company || x.email),
        intervenants: toMap(it.data, x => x.name),
        clients: toMap(cl.data, x => x.raison_sociale || [x.prenom, x.nom].filter(Boolean).join(' ')),
        vehicules: toMap(ve.data, x => [x.marque, x.modele, x.immatriculation].filter(Boolean).join(' ')),
      });
      setEntries(list);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [open, rdvId]);

  const show = (key: string, v: any) => key === 'horaire'
    ? `${fmtDate(v[0])} – ${v[1] ? format(new Date(v[1]), "HH'h'mm") : '—'}`
    : fmtValue(key, v, maps);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <History className="h-5 w-5" /> Historique du rendez-vous
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune modification enregistrée depuis la mise en place de l'historique.
            </p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-5 py-2">
              {entries.map(e => (
                <li key={e.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                  <p className="text-sm font-semibold">
                    {format(new Date(e.created_at), "dd/MM/yyyy 'à' HH'h'mm")} – {e.user_name || 'Utilisateur inconnu'}
                  </p>
                  {e.action === 'create' && <p className="text-sm text-muted-foreground">Création du rendez-vous.</p>}
                  {e.action === 'delete' && <p className="text-sm text-destructive">Suppression du rendez-vous.</p>}
                  {e.action === 'update' && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-muted-foreground">Modification du rendez-vous :</p>
                      <ul className="space-y-1">
                        {rows(e).map(r => (
                          <li key={r.key} className="text-sm break-words">
                            <span className="font-medium">{LABELS[r.key] || r.key} : </span>
                            {r.key.endsWith('_ajoutes') || r.key.endsWith('_retires')
                              ? show(r.key, r.new)
                              : <>{show(r.key, r.old)} <span className="text-muted-foreground">→</span> {show(r.key, r.new)}</>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
