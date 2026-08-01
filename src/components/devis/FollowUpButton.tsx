import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';

const UNAVAILABLE = 'Numéro WhatsApp indisponible ou accès non autorisé';
const POLL_MS = 1500;
const TIMEOUT_MS = 60000;

/** Extrait un texte lisible du résultat Hermes (jamais d'objet brut). */
function readableMessage(result: any): string | null {
  const candidates = [result?.message, result?.result?.message, result?.summary, result?.text];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export default function FollowUpButton({
  devisId,
  phone,
  canSeeContact,
}: {
  devisId: string;
  phone?: string;
  canSeeContact: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = phone ? parsePhone(phone) : null;
  const waNumber = parsed ? toWhatsAppNumber(parsed.countryCode, parsed.number) : '';
  const disabled = !canSeeContact || !waNumber || waNumber.length < 8;

  const prepare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('prepare-devis-followup', {
        body: { devis_id: devisId },
      });
      if (fnError || !data?.job_id) {
        setError("La préparation de la relance a échoué. Réessayez dans un instant.");
        return;
      }

      const deadline = Date.now() + TIMEOUT_MS;
      let text: string | null = null;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, POLL_MS));
        const { data: job } = await supabase
          .from('hermes_jobs')
          .select('status, result')
          .eq('id', data.job_id)
          .maybeSingle();
        if (!job) continue;
        if (job.status === 'completed') {
          text = readableMessage(job.result);
          break;
        }
        if (['failed', 'needs_information', 'confirmation_required'].includes(job.status)) {
          setError(readableMessage(job.result) || "L'assistant n'a pas pu préparer la relance.");
          return;
        }
      }

      if (!text) {
        setError("Le brouillon de relance n'est pas encore disponible. Réessayez dans un instant.");
        return;
      }

      const number = data.wa_number || waNumber;
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-noopen
      disabled={disabled || loading}
      onClick={prepare}
      className="h-7 w-full gap-1.5 text-[11px]"
    >
      {loading
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Préparation de la relance…</>
        : <><MessageCircle className="h-3.5 w-3.5" /> Envoyer une relance</>}
    </Button>
  );

  return (
    <div onClick={e => e.stopPropagation()} className="space-y-1">
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild><span tabIndex={0} className="block">{button}</span></TooltipTrigger>
          <TooltipContent>{UNAVAILABLE}</TooltipContent>
        </Tooltip>
      ) : button}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
