import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBackNavigation, useNavigateWithReturn } from '@/lib/returnNav';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Pencil, Archive, Plus, Car, Users, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import VehiculeFormDialog from '@/components/crm/VehiculeFormDialog';
import EntretienFormDialog from '@/components/crm/EntretienFormDialog';
import ChangeOwnerDialog from '@/components/crm/ChangeOwnerDialog';
import {
  clientDisplayName, VEHICULE_STATUT_LABELS, CARBURANT_LABELS, BOITE_LABELS,
  ENTRETIEN_TYPE_LABELS, MOTIF_LABELS, Entretien,
} from '@/types/crm';
import { STATUT_DEVIS_LABELS } from '@/types/devis';

export default function VehiculeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigateWithReturn = useNavigateWithReturn();
  const { goBack, label: backLabel } = useBackNavigation('/vehicules');
  const { crm, rdvs, devis: devisStore } = useStore();
  const { isAdmin } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [entretienOpen, setEntretienOpen] = useState(false);
  const [editingEntretien, setEditingEntretien] = useState<Entretien | null>(null);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const vehicule = crm.vehicules.find(v => v.id === id);
  const owner = crm.clients.find(c => c.id === vehicule?.clientId);

  const history = useMemo(
    () => crm.proprietaires
      .filter(p => p.vehiculeId === id)
      .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)),
    [crm.proprietaires, id],
  );

  const entretiens = useMemo(
    () => crm.entretiens
      .filter(e => e.vehiculeId === id)
      .sort((a, b) => b.dateEntretien.localeCompare(a.dateEntretien)),
    [crm.entretiens, id],
  );

  const vin = vehicule?.vin.toUpperCase();

  const vehiculeRdvs = useMemo(
    () => rdvs
      .filter(r => r.vin && r.vin.trim().toUpperCase() === vin)
      .sort((a, b) => b.debut.localeCompare(a.debut)),
    [rdvs, vin],
  );

  const vehiculeDevis = useMemo(
    () => devisStore.devisList
      .filter(d => d.vin && d.vin.trim().toUpperCase() === vin)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [devisStore.devisList, vin],
  );

  if (!vehicule) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={goBack} title={`Retour à ${backLabel}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <p className="mt-6 text-muted-foreground">Véhicule introuvable.</p>
      </div>
    );
  }

  const handleArchive = async () => {
    try {
      await crm.archiveVehicule(vehicule.id);
      toast.success('Véhicule archivé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'archivage');
    }
    setArchiveOpen(false);
  };

  const openNewEntretien = () => { setEditingEntretien(null); setEntretienOpen(true); };
  const openEditEntretien = (e: Entretien) => { setEditingEntretien(e); setEntretienOpen(true); };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={goBack} title={`Retour à ${backLabel}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Car className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-display font-bold">
                  {vehicule.marque} {vehicule.modele}
                </h1>
                {vehicule.annee && <span className="text-muted-foreground">{vehicule.annee}</span>}
                <Badge variant="secondary">{VEHICULE_STATUT_LABELS[vehicule.statut]}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                <div className="font-mono">VIN {vehicule.vin}</div>
                {vehicule.immatriculation && <div>Immatriculation : {vehicule.immatriculation}</div>}
                <div>
                  {[
                    vehicule.motorisation,
                    vehicule.carburant ? CARBURANT_LABELS[vehicule.carburant] : null,
                    vehicule.boiteVitesses ? BOITE_LABELS[vehicule.boiteVitesses] : null,
                    vehicule.kilometrageActuel != null ? `${vehicule.kilometrageActuel.toLocaleString('fr-FR')} km` : null,
                  ].filter(Boolean).join(' • ')}
                </div>
                <div>
                  Propriétaire actuel :{' '}
                  {owner ? (
                    <button className="text-primary hover:underline" onClick={() => navigateWithReturn(`/clients/${owner.id}`)}>
                      {clientDisplayName(owner)}
                    </button>
                  ) : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={openNewEntretien}>
              <Wrench className="h-4 w-4 mr-1" /> Ajouter un entretien
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/devis/creer', {
                state: {
                  prefill: {
                    clientNom: owner ? clientDisplayName(owner) : '',
                    clientTel: owner?.telephone,
                    marque: vehicule.marque,
                    modele: vehicule.modele,
                    annee: vehicule.annee ? String(vehicule.annee) : '',
                    vin: vehicule.vin,
                    clientId: owner?.id,
                    vehiculeId: vehicule.id,
                  },
                },
              })}
            >
              <Plus className="h-4 w-4 mr-1" /> Demande de devis
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setOwnerOpen(true)}>
                <Users className="h-4 w-4 mr-1" /> Changer de propriétaire
              </Button>
            )}
            {isAdmin && vehicule.statut !== 'archive' && (
              <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                <Archive className="h-4 w-4 mr-1" /> Archiver
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="entretiens">
        <TabsList>
          <TabsTrigger value="entretiens">Carnet d'entretien</TabsTrigger>
          <TabsTrigger value="rdv">Rendez-vous</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="proprietaires">Propriétaires</TabsTrigger>
        </TabsList>

        <TabsContent value="entretiens" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {entretiens.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun entretien enregistré</div>
            )}
            {entretiens.map(e => (
              <div key={e.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {format(new Date(e.dateEntretien), 'dd MMM yyyy', { locale: fr })}
                    </span>
                    <Badge variant="secondary">{ENTRETIEN_TYPE_LABELS[e.typeEntretien]}</Badge>
                    {e.kilometrage != null && (
                      <span className="text-xs text-muted-foreground">
                        {e.kilometrage.toLocaleString('fr-FR')} km
                      </span>
                    )}
                    {e.cout != null && (
                      <span className="text-xs text-muted-foreground">{e.cout.toLocaleString('fr-FR')} Dhs</span>
                    )}
                  </div>
                  {e.description && <p className="mt-1 text-sm whitespace-pre-wrap">{e.description}</p>}
                  {e.piecesUtilisees && (
                    <p className="mt-1 text-xs text-muted-foreground">Pièces : {e.piecesUtilisees}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEditEntretien(e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rdv" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {vehiculeRdvs.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun rendez-vous</div>
            )}
            {vehiculeRdvs.map(r => (
              <div key={r.id} className="p-4 text-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {format(new Date(r.debut), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.clientNom || '—'}</div>
                </div>
                <Badge variant="outline">{r.statut}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="devis" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {vehiculeDevis.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun devis</div>
            )}
            {vehiculeDevis.map(d => (
              <button
                key={d.id}
                onClick={() => navigateWithReturn(`/devis/${d.id}`)}
                className="w-full text-left p-4 text-sm flex items-center justify-between gap-3 hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">{d.clientNom || 'Demande de devis'}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(d.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
                <Badge variant="outline">{STATUT_DEVIS_LABELS[d.statut]}</Badge>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proprietaires" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {history.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun historique</div>
            )}
            {history.map(p => {
              const c = crm.clients.find(x => x.id === p.clientId);
              return (
                <div key={p.id} className="p-4 text-sm flex items-center justify-between gap-3">
                  <div>
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => c && navigateWithReturn(`/clients/${c.id}`)}
                    >
                      {clientDisplayName(c)}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Du {format(new Date(p.dateDebut), 'dd MMM yyyy', { locale: fr })}
                      {p.dateFin
                        ? ` au ${format(new Date(p.dateFin), 'dd MMM yyyy', { locale: fr })}`
                        : ' — en cours'}
                    </div>
                  </div>
                  <Badge variant="outline">{MOTIF_LABELS[p.motif]}</Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <VehiculeFormDialog open={editOpen} onOpenChange={setEditOpen} vehicule={vehicule} />
      <EntretienFormDialog
        open={entretienOpen}
        onOpenChange={setEntretienOpen}
        vehiculeId={vehicule.id}
        entretien={editingEntretien}
      />
      <ChangeOwnerDialog open={ownerOpen} onOpenChange={setOwnerOpen} vehicule={vehicule} />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le véhicule, son VIN, ses rendez-vous, ses devis et son carnet d'entretien sont conservés.
              Il ne sera simplement plus proposé par défaut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
