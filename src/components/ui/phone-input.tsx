import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const COUNTRY_CODES = [
  { code: '+212', flag: '🇲🇦', name: 'Maroc', country: 'MA' },
  { code: '+33', flag: '🇫🇷', name: 'France', country: 'FR' },
  { code: '+1', flag: '🇺🇸', name: 'États-Unis', country: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni', country: 'GB' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne', country: 'ES' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne', country: 'DE' },
  { code: '+39', flag: '🇮🇹', name: 'Italie', country: 'IT' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique', country: 'BE' },
  { code: '+31', flag: '🇳🇱', name: 'Pays-Bas', country: 'NL' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie', country: 'TN' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie', country: 'DZ' },
  { code: '+966', flag: '🇸🇦', name: 'Arabie Saoudite', country: 'SA' },
  { code: '+971', flag: '🇦🇪', name: 'Émirats Arabes Unis', country: 'AE' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse', country: 'CH' },
];

// Sort by code length descending so longer codes match first
const SORTED_CODES = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

function cleanPhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, '');
}

function detectCountryCode(cleaned: string): { countryCode: string; number: string } | null {
  if (!cleaned.startsWith('+')) return null;
  for (const cc of SORTED_CODES) {
    if (cleaned.startsWith(cc.code)) {
      return { countryCode: cc.code, number: cleaned.slice(cc.code.length) };
    }
  }
  // Try to extract unknown code: +XX or +XXX
  const match = cleaned.match(/^(\+\d{1,3})(.*)/);
  if (match) {
    return { countryCode: match[1], number: match[2] };
  }
  return null;
}

function normalizeNumber(num: string, countryCode: string): string {
  // Remove leading zeros for processing
  let n = num;
  if (countryCode === '+212') {
    // If starts with 6 or 7 (no leading 0), add 0
    if (/^[67]\d{8}$/.test(n)) {
      n = '0' + n;
    }
  }
  return n;
}

function formatDisplay(num: string): string {
  // Format as XX XX XX XX XX for 10-digit numbers
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  return num;
}

/** Combine country code + number into a WhatsApp-compatible string (no leading 0) */
export function toWhatsAppNumber(countryCode: string, number: string): string {
  const code = countryCode.replace('+', '');
  let num = number.replace(/\D/g, '');
  // Remove leading 0
  if (num.startsWith('0')) {
    num = num.slice(1);
  }
  return code + num;
}

/** Build a full tel string for storage: e.g. "+212|0619113324" */
export function serializePhone(countryCode: string, number: string): string {
  if (!number) return '';
  return `${countryCode}|${number}`;
}

/** Parse stored phone back into parts */
export function parsePhone(stored: string): { countryCode: string; number: string } {
  if (!stored) return { countryCode: '+212', number: '' };
  if (stored.includes('|')) {
    const [cc, num] = stored.split('|', 2);
    return { countryCode: cc, number: num };
  }
  // Legacy: try to detect from raw string
  const cleaned = cleanPhone(stored);
  const detected = detectCountryCode(cleaned);
  if (detected) {
    return {
      countryCode: detected.countryCode,
      number: normalizeNumber(detected.number, detected.countryCode),
    };
  }
  return { countryCode: '+212', number: cleaned };
}

interface PhoneInputProps {
  countryCode: string;
  number: string;
  onCountryCodeChange: (code: string) => void;
  onNumberChange: (num: string) => void;
  className?: string;
}

export function PhoneInput({
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  className,
}: PhoneInputProps) {
  function processInput(raw: string) {
    const cleaned = cleanPhone(raw);
    const detected = detectCountryCode(cleaned);
    if (detected) {
      const known = COUNTRY_CODES.find(c => c.code === detected.countryCode);
      if (known) {
        onCountryCodeChange(detected.countryCode);
      }
      onNumberChange(normalizeNumber(detected.number, detected.countryCode || countryCode));
    } else {
      onNumberChange(normalizeNumber(cleaned, countryCode));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    processInput(e.target.value);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    processInput(pasted);
  }

  function handleBlur() {
    // Re-normalize on blur
    const cleaned = cleanPhone(number);
    onNumberChange(normalizeNumber(cleaned, countryCode));
  }

  return (
    <div className={cn('flex gap-1.5', className)}>
      <Select value={countryCode} onValueChange={onCountryCodeChange}>
        <SelectTrigger className="w-[52px] shrink-0 px-2">
          <span className="text-base">{COUNTRY_CODES.find(c => c.code === countryCode)?.flag ?? '🌐'}</span>
        </SelectTrigger>
        <SelectContent className="max-h-48 bg-popover z-50">
          {COUNTRY_CODES.map(cc => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.flag} {cc.code} {cc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="06 19 11 33 24"
        value={formatDisplay(number)}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={handleBlur}
      />
    </div>
  );
}
