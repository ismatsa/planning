import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import DevisForm from '@/components/devis/DevisForm';
import DevisCommentFeed from '@/components/devis/DevisCommentFeed';
import DevisAttachments from '@/components/devis/DevisAttachments';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function DevisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devis: devisStore } = useStore();
  const { devisList, devisMetiers, devisResponsibles, devisIntervenants } = devisStore;

  const devis = devisList.find(d => d.id === id);

  if (!devis) {
    return (
      <div className="p-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/devis')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <p className="text-muted-foreground">Devis introuvable.</p>
      </div>
    );
  }

  function handleConvert() {
    if (!devis) return;
    const metierIds = devisMetiers[devis.id] || [];
    const responsibleIds = devisResponsibles[devis.id] || [];
    const intervenantIds = devisIntervenants[devis.id] || [];
    navigate('/', {
      state: {
        convertFromDevis: {
          ...devis,
          metierIds,
          responsibleIds,
          intervenantIds,
          sourceDevisId: devis.id,
        },
      },
    });
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/devis/${devis!.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papiers.');
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/devis')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <h1 className="text-xl font-display font-bold flex-1">Détail du devis</h1>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <LinkIcon className="h-4 w-4 mr-1" /> Copier le lien
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: form + attachments */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <DevisForm
              devis={devis}
              onSaved={() => {}}
              onDeleted={() => navigate('/devis')}
              onConvert={handleConvert}
            />
          </div>

          <div className="rounded-lg border bg-card p-5">
            <DevisAttachments devisId={devis.id} />
          </div>
        </div>

        {/* Right column: comment feed */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-5 h-[calc(100vh-12rem)] flex flex-col">
            <DevisCommentFeed devisId={devis.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
