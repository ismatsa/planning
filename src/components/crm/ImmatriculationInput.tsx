import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MOROCCAN_PLATE_LETTERS,
  PLATE_COUNTRIES,
  buildMoroccanPlate,
  cleanGenericPlate,
  digitsOnly,
  moroccanPartsFromValue,
  normalizePlateCountry,
  parseMoroccanPlate,
} from '@/lib/immatriculation';
import ImmatriculationBadge from './ImmatriculationBadge';

interface Props {
  value: string;
  country: string;
  onChange: (value: string, country: string) => void;
  disabled?: boolean;
}

export default function ImmatriculationInput({ value, country, onChange, disabled = false }: Props) {
  const code = normalizePlateCountry(country);
  const parts = moroccanPartsFromValue(value);
  const complete = code === 'MA' ? parseMoroccanPlate(value) : null;

  const updatePart = (key: 'numero' | 'lettre' | 'region', nextValue: string) => {
    const next = { ...parts, [key]: nextValue };
    onChange(buildMoroccanPlate(next), code);
  };

  return (
    <div className="space-y-2">
      <Select
        value={code}
        onValueChange={nextCountry => onChange('', nextCountry)}
        disabled={disabled}
      >
        <SelectTrigger aria-label="Pays d'immatriculation">
          <SelectValue placeholder="Choisir le pays" />
        </SelectTrigger>
        <SelectContent>
          {PLATE_COUNTRIES.map(item => (
            <SelectItem key={item.code} value={item.code}>{item.name} ({item.code})</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {code === 'MA' ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,0.55fr)_4.5rem] gap-2">
          <Input
            aria-label="Numéro de série de la plaque"
            inputMode="numeric"
            autoComplete="off"
            placeholder="82913"
            value={parts.numero}
            onChange={event => updatePart('numero', digitsOnly(event.target.value, 5))}
            disabled={disabled}
            className="font-mono"
          />
          <Select value={parts.lettre} onValueChange={letter => updatePart('lettre', letter)} disabled={disabled}>
            <SelectTrigger aria-label="Lettre arabe de la plaque">
              <SelectValue placeholder="Lettre" />
            </SelectTrigger>
            <SelectContent>
              {MOROCCAN_PLATE_LETTERS.map(letter => (
                <SelectItem key={letter.arabic} value={letter.arabic}>
                  <span dir="ltr" className="inline-flex items-center gap-2">
                    <span className="text-lg leading-none">{letter.arabic}</span>
                    <span className="text-muted-foreground">({letter.latin})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Région de la plaque"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1"
            value={parts.region}
            onChange={event => updatePart('region', digitsOnly(event.target.value, 2))}
            disabled={disabled}
            className="px-2 text-center font-mono"
          />
        </div>
      ) : (
        <Input
          aria-label="Numéro d'immatriculation"
          autoComplete="off"
          placeholder="AB-123-CD"
          value={value}
          onChange={event => onChange(cleanGenericPlate(event.target.value), code)}
          disabled={disabled}
          className="uppercase font-mono"
        />
      )}

      {value.trim() && (
        <div className="flex min-h-7 items-center gap-2">
          {complete || code !== 'MA' ? (
            <ImmatriculationBadge value={value} country={code} />
          ) : (
            <p className="text-xs text-muted-foreground">Complétez le numéro, la lettre arabe et la région.</p>
          )}
        </div>
      )}
    </div>
  );
}
