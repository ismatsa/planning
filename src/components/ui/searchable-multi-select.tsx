import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X } from 'lucide-react';

interface SearchableMultiSelectProps {
  label?: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  required?: boolean;
  getLabel: (id: string) => string;
  placeholder?: string;
  /** Compact mode hides label and uses smaller trigger */
  compact?: boolean;
}

export function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  disabled,
  required,
  getLabel,
  placeholder,
  compact,
}: SearchableMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const s = searchTerm.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(s));
  }, [options, searchTerm]);

  return (
    <div>
      {label && (
        <Label className="text-xs font-medium text-muted-foreground mb-1.5">
          {label}{required && ' *'}
        </Label>
      )}
      {disabled ? (
        <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] items-center rounded-md border border-input bg-background px-3 py-2">
          {selected.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : (
            selected.map(id => (
              <Badge key={id} variant="secondary" className="text-xs">
                {getLabel(id)}
              </Badge>
            ))
          )}
        </div>
      ) : (
        <Popover open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setSearchTerm(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start font-normal h-auto min-h-[2.5rem] py-1.5 ${compact ? 'min-h-[2.25rem]' : ''}`}
            >
              {selected.length === 0 ? (
                <span className="text-muted-foreground text-sm">{placeholder || 'Sélectionner…'}</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selected.map(id => (
                    <Badge key={id} variant="secondary" className="text-xs gap-1">
                      {getLabel(id)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(selected.filter(s => s !== id));
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start" onWheel={(e) => e.stopPropagation()}>
            <div className="p-2 border-b">
              <Input
                placeholder={placeholder || 'Rechercher…'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto overscroll-contain p-1">
              {filtered.map(opt => (
                <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer py-1.5 px-2 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selected.includes(opt.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selected, opt.id]);
                      } else {
                        onChange(selected.filter(s => s !== opt.id));
                      }
                    }}
                  />
                  {opt.label}
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">Aucun résultat</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
