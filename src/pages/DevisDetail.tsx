import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import DevisForm from '@/components/devis/DevisForm';
import DevisCommentFeed from '@/components/devis/DevisCommentFeed';
import DevisAttachments from '@/components/devis/DevisAttachments';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Link as LinkIcon, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProfileOption { id: string; email: string; company: string; }

export default function DevisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devis: devisStore } = useStore();
  const { devisList, devisMetiers, devisResponsibles, devisIntervenants } = devisStore;

  const devis = devisList.find(d => d.id === id);

  const [assignedUserId, setAssignedUserId] = useState('');
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);

  // Load profiles for the assignment selector
  useEffect(() => {
    supabase.from('profiles').select('id, email, company').then(({ data }) => {
      if (data) {
        setProfileOptions(
          (data as any[])
            .filter(p => p.company && p.company.trim() !== '')
            .map(p => ({ id: p.id, email: p.email, company: p.company }))
        );
      }
    });
  }, []);

  // Sync assignment from devis
  useEffect(() => {
    if (devis) setAssignedUserId(devis.assignedUserId || '');
  }, [devis]);

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
              assignedUserId={assignedUserId}
              onAssignedUserIdChange={setAssignedUserId}
            />
          </div>

          <div className="rounded-lg border bg-card p-5">
            <DevisAttachments devisId={devis.id} />
          </div>
        </div>

        {/* Right column: assignment + comment feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Assignment block */}
          <div className={`rounded-lg border-2 p-4 transition-colors ${
            assignedUserId
              ? 'bg-primary/5 border-primary/30'
              : 'bg-destructive/5 border-destructive/40'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className={`h-4.5 w-4.5 ${assignedUserId ? 'text-primary' : 'text-destructive'}`} />
              <span className="text-sm font-bold text-foreground">Assigner à</span>
            </div>
            {!assignedUserId && (
              <p className="text-xs text-destructive font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Veuillez assigner ce devis à un utilisateur
              </p>
            )}
            <Select value={assignedUserId || undefined} onValueChange={setAssignedUserId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
              <SelectContent>
                {profileOptions.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discussion */}
          <div className="rounded-lg border bg-card p-5 h-[calc(100vh-16rem)] flex flex-col">
            <DevisCommentFeed devisId={devis.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
