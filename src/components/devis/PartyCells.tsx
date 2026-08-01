import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import { NOT_SET } from '@/lib/devisDisplay';

export const MASKED = 'Accès non autorisé';

/** Client name — clickable when the CRM client record exists. */
export function ClientNameCell({
  name,
  clientId,
  canSee,
  className = '',
}: {
  name: string;
  clientId?: string;
  canSee: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  if (!canSee) return <span className="text-muted-foreground">{MASKED}</span>;
  if (!name || name === NOT_SET) return <span className="text-muted-foreground">{NOT_SET}</span>;
  if (!clientId) return <span className={className}>{name}</span>;
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        navigate(`/clients/${clientId}`);
      }}
      className={`text-left hover:underline text-primary font-medium ${className}`}
    >
      {name}
    </button>
  );
}

/** Phone with a green WhatsApp icon opening https://wa.me/<normalized>. */
export function ClientPhoneCell({
  phone,
  canSee,
  compact = false,
}: {
  phone?: string;
  canSee: boolean;
  compact?: boolean;
}) {
  if (!canSee) return <span className="text-muted-foreground">{MASKED}</span>;
  if (!phone) return <span className="text-muted-foreground">{NOT_SET}</span>;

  const { countryCode, number } = parsePhone(phone);
  const waNum = toWhatsAppNumber(countryCode, number);
  if (!waNum) return <span className="text-muted-foreground">{NOT_SET}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`https://wa.me/${waNum}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center gap-1.5 hover:underline ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: '#25D366' }}
        >
          <MessageCircle className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
          <span>{countryCode} {number}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent>Contacter le client sur WhatsApp</TooltipContent>
    </Tooltip>
  );
}
