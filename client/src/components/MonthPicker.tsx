import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Choix d'un mois, en deux listes.
 *
 * `<input type="month">` n'existe pas partout : Safari et Firefox le rendent
 * comme un simple champ texte, où la valeur retapée à chaque frappe se
 * corrompt. Deux listes se comportent de la même façon dans tous les
 * navigateurs, et se remplissent plus vite à la souris.
 */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

interface MonthPickerProps {
  /** Date ISO « AAAA-MM-JJ ». Le jour est ignoré. */
  value: string;
  /** Rend « AAAA-MM-01 » : le premier du mois choisi. */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Nombre d'années passées proposées. Un contrat repris peut être ancien. */
  yearsBack?: number;
  id?: string;
}

export function MonthPicker({
  value,
  onChange,
  disabled = false,
  yearsBack = 6,
  id,
}: MonthPickerProps) {
  const now = new Date();
  const [yearStr, monthStr] = (value || "").split("-");
  const year = parseInt(yearStr) || now.getFullYear();
  const month = parseInt(monthStr) || now.getMonth() + 1;

  // On propose aussi l'année prochaine : un contrat peut être signé d'avance.
  const currentYear = now.getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - yearsBack; y--) years.push(y);
  if (!years.includes(year)) years.push(year);

  const emit = (m: number, y: number) =>
    onChange(`${y}-${String(m).padStart(2, "0")}-01`);

  return (
    <div className="flex gap-2">
      <Select
        value={String(month)}
        onValueChange={(v) => emit(parseInt(v), year)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="flex-1" data-testid="select-month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((label, i) => (
            <SelectItem key={label} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(v) => emit(month, parseInt(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px]" data-testid="select-year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years
            .sort((a, b) => b - a)
            .map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
