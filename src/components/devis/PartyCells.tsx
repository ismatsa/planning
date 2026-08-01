import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            navigate(`/clients/${clientId}`);
          }}
          aria-label={`Ouvrir la fiche client ${name}`}
          className={`inline-flex items-center gap-1 text-left hover:underline text-primary font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
        >
          <span>{name}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Ouvrir la fiche client</TooltipContent>
    </Tooltip>
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

/** Vehicle: "Marque Modèle Année" + "VIN : …", whole cell clickable to the vehicle record. */
export function VehiculeCell({
  label,
  vin,
  vehiculeId,
}: {
  label: string;
  vin?: string;
  vehiculeId?: string;
}) {
  const navigate = useNavigate();
  if (!label || label === NOT_SET) return <span className="text-muted-foreground text-xs">{NOT_SET}</span>;

  const content = (
    <>
      <span className="text-xs font-medium block">{label}</span>
      {vin && <span className="text-[11px] text-muted-foreground block">{vin}</span>}
    </>
  );

  if (!vehiculeId) return <div className="text-xs">{content}</div>;

  const open = () => navigate(`/vehicules/${vehiculeId}`);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="link"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            open();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              open();
            }
          }}
          className="-mx-1 px-1 py-0.5 rounded cursor-pointer hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          {content}
        </div>
      </TooltipTrigger>
      <TooltipContent>Ouvrir la fiche véhicule</TooltipContent>
    </Tooltip>
  );
}
