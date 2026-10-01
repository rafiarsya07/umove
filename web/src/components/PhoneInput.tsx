import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { ChevronDownIcon } from "./Icon";

/**
 * WhatsApp number with a country code picker. UM has students from all over
 * Asia and beyond, so Malaysia is the default but not the only choice.
 *
 * The value going in and out is one string: "+<code><number>" in E.164, or
 * "" when empty. The server normalises and checks it again, so this is about
 * making the right thing easy, not about trusting the browser.
 */
export const COUNTRIES: { iso: string; name: string; dial: string; example?: string }[] = [
  { iso: "MY", name: "Malaysia", dial: "60", example: "12 345 6789" },
  { iso: "ID", name: "Indonesia", dial: "62", example: "812 3456 7890" },
  { iso: "SG", name: "Singapore", dial: "65", example: "8123 4567" },
  { iso: "BN", name: "Brunei", dial: "673", example: "712 3456" },
  { iso: "TH", name: "Thailand", dial: "66", example: "81 234 5678" },
  { iso: "VN", name: "Vietnam", dial: "84", example: "91 234 56 78" },
  { iso: "PH", name: "Philippines", dial: "63", example: "912 345 6789" },
  { iso: "MM", name: "Myanmar", dial: "95", example: "9 212 3456" },
  { iso: "KH", name: "Cambodia", dial: "855", example: "12 345 678" },
  { iso: "LA", name: "Laos", dial: "856", example: "20 2345 6789" },
  { iso: "CN", name: "China", dial: "86", example: "131 2345 6789" },
  { iso: "HK", name: "Hong Kong", dial: "852", example: "5123 4567" },
  { iso: "TW", name: "Taiwan", dial: "886", example: "912 345 678" },
  { iso: "KR", name: "South Korea", dial: "82", example: "10 2345 6789" },
  { iso: "JP", name: "Japan", dial: "81", example: "90 1234 5678" },
  { iso: "IN", name: "India", dial: "91", example: "81234 56789" },
  { iso: "BD", name: "Bangladesh", dial: "880", example: "1812 345678" },
  { iso: "PK", name: "Pakistan", dial: "92", example: "301 2345678" },
  { iso: "LK", name: "Sri Lanka", dial: "94", example: "71 234 5678" },
  { iso: "NP", name: "Nepal", dial: "977", example: "984 1234567" },
  { iso: "MV", name: "Maldives", dial: "960", example: "771 2345" },
  { iso: "AF", name: "Afghanistan", dial: "93" },
  { iso: "UZ", name: "Uzbekistan", dial: "998" },
  { iso: "KZ", name: "Kazakhstan", dial: "7" },
  { iso: "SA", name: "Saudi Arabia", dial: "966", example: "51 234 5678" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", example: "50 123 4567" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "YE", name: "Yemen", dial: "967", example: "712 345 678" },
  { iso: "IQ", name: "Iraq", dial: "964", example: "791 234 5678" },
  { iso: "IR", name: "Iran", dial: "98", example: "912 345 6789" },
  { iso: "JO", name: "Jordan", dial: "962" },
  { iso: "PS", name: "Palestine", dial: "970" },
  { iso: "SY", name: "Syria", dial: "963" },
  { iso: "TR", name: "Türkiye", dial: "90" },
  { iso: "EG", name: "Egypt", dial: "20", example: "100 123 4567" },
  { iso: "SD", name: "Sudan", dial: "249" },
  { iso: "LY", name: "Libya", dial: "218" },
  { iso: "DZ", name: "Algeria", dial: "213" },
  { iso: "MA", name: "Morocco", dial: "212" },
  { iso: "NG", name: "Nigeria", dial: "234", example: "802 123 4567" },
  { iso: "SO", name: "Somalia", dial: "252" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "US", name: "United States / Canada", dial: "1" },
];
const OTHER = "other";

/** "+6281234567890" → Indonesia + "81234567890". Longest matching code wins (+673 before +6...). */
function split(value: string): { iso: string; rest: string } {
  const v = value.replace(/[\s()-]/g, "");
  if (!v) return { iso: "MY", rest: "" };
  if (!v.startsWith("+")) return { iso: "MY", rest: v.replace(/^0/, "") };
  const digits = v.slice(1);
  const hit = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
  return hit ? { iso: hit.iso, rest: digits.slice(hit.dial.length) } : { iso: OTHER, rest: v };
}

export function PhoneInput({
  value,
  onChange,
  className,
  invalid,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  invalid?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  const initial = useMemo(() => split(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [iso, setIso] = useState(initial.iso);
  const [rest, setRest] = useState(initial.rest);
  const country = COUNTRIES.find((c) => c.iso === iso);

  // Re-sync when the saved value changes from outside (after saving).
  useEffect(() => {
    const cur = compose(iso, rest);
    if (value !== cur && value.replace(/[\s()-]/g, "") !== cur) {
      const s = split(value);
      setIso(s.iso);
      setRest(s.rest);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function compose(i: string, r: string): string {
    const digits = r.replace(/[^\d+]/g, "");
    if (!digits) return "";
    if (i === OTHER) return digits.startsWith("+") ? digits : `+${digits.replace(/^0+/, "")}`;
    const c = COUNTRIES.find((x) => x.iso === i)!;
    // Local habits: Malaysians type 012..., Indonesians 0812...; the trunk 0 is dropped.
    return `+${c.dial}${digits.replace(/^\+/, "").replace(/^0+/, "")}`;
  }

  const typeNumber = (raw: string) => {
    // Pasted a full international number: pick the country for them.
    const clean = raw.replace(/[\s()-]/g, "");
    if (clean.startsWith("+") || clean.startsWith("00")) {
      const s = split(clean.startsWith("00") ? `+${clean.slice(2)}` : clean);
      setIso(s.iso);
      setRest(s.rest);
      onChange(compose(s.iso, s.rest));
      return;
    }
    setRest(raw);
    onChange(compose(iso, raw));
  };

  const pickCountry = (next: string) => {
    setIso(next);
    onChange(compose(next, rest));
  };

  return (
    <div className="mt-1.5 flex gap-2">
      <label className="relative shrink-0">
        <span className="sr-only">{t.settings.countryCode}</span>
        <span
          aria-hidden="true"
          className={`${className} pointer-events-none flex items-center gap-1.5 pr-2.5 font-medium tabular-nums ${
            invalid ? "border-danger" : ""
          }`}
        >
          <span className="text-[0.75rem] text-muted-foreground">{iso === OTHER ? "" : iso}</span>
          {country ? `+${country.dial}` : t.settings.countryOther}
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </span>
        <select
          value={iso}
          onChange={(e) => pickCountry(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} (+{c.dial})
            </option>
          ))}
          <option value={OTHER}>{t.settings.countryOther}</option>
        </select>
      </label>
      <input
        id={id}
        className={`${className} min-w-0 flex-1`}
        value={rest}
        onChange={(e) => typeNumber(e.target.value)}
        placeholder={iso === OTHER ? "+44 7700 900123" : (country?.example ?? "")}
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={20}
        aria-invalid={invalid}
        aria-label={t.settings.whatsapp}
      />
    </div>
  );
}
