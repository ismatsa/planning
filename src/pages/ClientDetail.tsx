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
  ArrowLeft, Pencil, Archive, Plus, Car, MessageCircle, Building2, User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import ClientFormDialog from '@/components/crm/ClientFormDialog';
import VehiculeFormDialog from '@/components/crm/VehiculeFormDialog';
import {
  clientDisplayName, CLIENT_TYPE_LABELS, VEHICULE_STATUT_LABELS,
} from '@/types/crm';
import { STATUT_DEVIS_LABELS } from '@/types/devis';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigateWithReturn = useNavigateWithReturn();
  const { goBack, label: backLabel } = useBackNavigation('/clients');
  const { crm, rdvs, devis: devisStore } = useStore();
  const { user, isAdmin } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [vehiculeOpen, setVehiculeOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const client = crm.clients.find(c => c.id === id);

  const ownedVehicules = useMemo(
    () => crm.vehicules.filter(v => v.clientId === id),
    [crm.vehicules, id],
  );

  const pastVehicules = useMemo(() => {
    const ids = new Set(
      crm.proprietaires
        .filter(p => p.clientId === id && p.dateFin)
        .map(p => p.vehiculeId),
    );
    return crm.vehicules.filter(v => ids.has(v.id) && v.clientId !== id);
  }, [crm.proprietaires, crm.vehicules, id]);

  const vins = useMemo(
    () => new Set([...ownedVehicules, ...pastVehicules].map(v => v.vin.toUpperCase())),
    [ownedVehicules, pastVehicules],
  );

  const clientTelNumber = client ? parsePhone(client.telephone).number.replace(/\D/g, '') : '';

  const matchesClient = (row: { vin?: string; clientTel?: string }) => {
    if (row.vin && vins.has(row.vin.trim().toUpperCase())) return true;
    if (clientTelNumber && row.clientTel) {
      return parsePhone(row.clientTel).number.replace(/\D/g, '') === clientTelNumber;
    }
    return false;
  };

  const clientRdvs = useMemo(
    () => rdvs.filter(matchesClient).sort((a, b) => b.debut.localeCompare(a.debut)),
    [rdvs, vins, clientTelNumber],
  );

  const clientDevis = useMemo(
    () => devisStore.devisList.filter(matchesClient).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [devisStore.devisList, vins, clientTelNumber],
  );

  if (!client) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={goBack} title={`Retour à ${backLabel}`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <p className="mt-6 text-muted-foreground">Client introuvable.</p>
      </div>
    );
  }

  const isCreator = !!user && client.createdBy === user.id;
  const tel = parsePhone(client.telephone);

  const handleArchive = async () => {
    try {
      await crm.archiveClient(client.id);
      toast.success('Client archivé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'archivage');
    }
    setArchiveOpen(false);
  };

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
              {client.typeClient === 'societe'
                ? <Building2 className="h-5 w-5 text-muted-foreground" />
                : <UserIcon className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-display font-bold">{clientDisplayName(client)}</h1>
                <Badge variant="secondary">{CLIENT_TYPE_LABELS[client.typeClient]}</Badge>
                {client.statut === 'archive' && <Badge variant="outline">Archivé</Badge>}
              </div>
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-2">
                  <span>{tel.countryCode} {tel.number}</span>
                  {(isCreator || isAdmin) && (
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(tel.countryCode, tel.number)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-600 hover:opacity-80"
                      aria-label="Contacter sur WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {client.telephoneSecondaire && <div>{parsePhone(client.telephoneSecondaire).number}</div>}
                {client.typeClient === 'societe' && client.ice && <div>ICE : {client.ice}</div>}
                {client.email && <div>{client.email}</div>}
                {(client.adresse || client.ville) && (
                  <div>{[client.adresse, client.ville].filter(Boolean).join(', ')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVehiculeOpen(true)}>
              <Car className="h-4 w-4 mr-1" /> Ajouter un véhicule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/devis/creer', {
                state: {
                  prefill: {
                    clientNom: clientDisplayName(client),
                    clientTel: client.telephone,
                    clientId: client.id,
                  },
                },
              })}
            >
              <Plus className="h-4 w-4 mr-1" /> Demande de devis
            </Button>
            {isAdmin && client.statut === 'actif' && (
              <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                <Archive className="h-4 w-4 mr-1" /> Archiver
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="vehicules">
        <TabsList>
          <TabsTrigger value="vehicules">Véhicules</TabsTrigger>
          <TabsTrigger value="rdv">Rendez-vous</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="notes">Notes internes</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicules" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card divide-y">
            {ownedVehicules.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun véhicule</div>
            )}
            {ownedVehicules.map(v => (
              <button
                key={v.id}
                onClick={() => navigateWithReturn(`/vehicules/${v.id}`)}
                className="w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3"
              >
                <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{v.marque} {v.modele} {v.annee || ''}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">VIN {v.vin}</div>
                </div>
                <Badge variant="outline">{VEHICULE_STATUT_LABELS[v.statut]}</Badge>
              </button>
            ))}
          </div>

          {pastVehicules.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Anciennement possédés</h3>
              <div className="rounded-lg border bg-card divide-y">
                {pastVehicules.map(v => (
                  <button
                    key={v.id}
                    onClick={() => navigateWithReturn(`/vehicules/${v.id}`)}
                    className="w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3 opacity-80"
                  >
                    <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{v.marque} {v.modele}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">VIN {v.vin}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rdv" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {clientRdvs.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun rendez-vous</div>
            )}
            {clientRdvs.map(r => (
              <div key={r.id} className="p-4 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {format(new Date(r.debut), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[r.marque, r.modele].filter(Boolean).join(' ')}
                    {r.vin ? ` • VIN ${r.vin}` : ''}
                  </div>
                </div>
                <Badge variant="outline">{r.statut}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="devis" className="mt-4">
          <div className="rounded-lg border bg-card divide-y">
            {clientDevis.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Aucun devis</div>
            )}
            {clientDevis.map(d => (
              <button
                key={d.id}
                onClick={() => navigateWithReturn(`/devis/${d.id}`)}
                className="w-full text-left p-4 text-sm flex items-center justify-between gap-3 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {[d.marque, d.modele].filter(Boolean).join(' ') || 'Demande de devis'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(d.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
                <Badge variant="outline">{STATUT_DEVIS_LABELS[d.statut]}</Badge>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap">
            {client.notesInternes || <span className="text-muted-foreground">Aucune note interne</span>}
          </div>
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <VehiculeFormDialog open={vehiculeOpen} onOpenChange={setVehiculeOpen} defaultClientId={client.id} />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le client restera visible dans les historiques mais ne sera plus proposé par défaut
              lors de la création d'un rendez-vous ou d'un devis. Aucune donnée n'est supprimée.
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
