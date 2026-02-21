import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function WeekNavigation({ currentDate, onDateChange }: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(addWeeks(currentDate, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDateChange(new Date())}
        className="text-xs font-medium text-muted-foreground"
      >
        Aujourd'hui
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(addWeeks(currentDate, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold font-display capitalize">
        {format(weekStart, 'd MMM', { locale: fr })} — {format(weekEnd, 'd MMM yyyy', { locale: fr })}
      </span>
    </div>
  );
}
