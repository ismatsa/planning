import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ExternalLink, UserCheck } from 'lucide-react';
import DevisForm from './DevisForm';
import DevisCommentFeed from './DevisCommentFeed';
import DevisAttachments from './DevisAttachments';
import DevisLines from './DevisLines';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/StoreContext';
import { Devis } from '@/types/devis';

interface ProfileOption { id: string; email: string; company: string; }

interface Props {
  devis: Devis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DevisDetailDialog({ devis, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { devis: devisStore } = useStore();
  const { devisMetiers, devisResponsibles, devisIntervenants } = devisStore;

  const [assignedUserId, setAssignedUserId] = useState('');
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from('profiles').select('id, email, company').then(({ data }) => {
      if (!data) return;
      setProfileOptions(
        (data as any[])
          .filter(p => p.company && p.company.trim() !== '')
          .map(p => ({ id: p.id, email: p.email, company: p.company }))
      );
    });
  }, [open]);

  useEffect(() => {
    setAssignedUserId(devis?.assignedUserId || '');
  }, [devis]);

  if (!devis) return null;

  const isSent = devis.statut === 'envoye';

  function handleConvert() {
    if (!devis) return;
    onOpenChange(false);
    navigate('/', {
      state: {
        convertFromDevis: {
          ...devis,
          metierIds: devisMetiers[devis.id] || [],
          responsibleIds: devisResponsibles[devis.id] || [],
          intervenantIds: devisIntervenants[devis.id] || [],
          sourceDevisId: devis.id,
        },
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[100vw] sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-none sm:rounded-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="flex-1 text-left">
              {isSent ? 'Devis envoyé' : 'Demande de devis'}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); navigate(`/devis/${devis.id}`); }}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir la fiche complète
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
          <div className="lg:col-span-3">
            <div className="rounded-lg border bg-card p-5">
              <DevisForm
                devis={devis}
                onSaved={() => onOpenChange(false)}
                onDeleted={() => onOpenChange(false)}
                onConvert={handleConvert}
                assignedUserId={assignedUserId}
                onAssignedUserIdChange={setAssignedUserId}
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className={`rounded-lg border-2 p-4 transition-colors ${
              assignedUserId ? 'bg-primary/5 border-primary/30' : 'bg-destructive/5 border-destructive/40'
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

            <div className="rounded-lg border bg-card p-5 h-[420px] flex flex-col">
              <DevisCommentFeed devisId={devis.id} />
            </div>

            <div className="rounded-lg border bg-card p-5">
              <DevisAttachments devisId={devis.id} />
            </div>
          </div>
        </div>

        <DevisLines devisId={devis.id} />
      </DialogContent>
    </Dialog>
  );
}
