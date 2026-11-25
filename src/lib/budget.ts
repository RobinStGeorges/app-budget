// Logique pure de l'app Budget : aucun accès à Firebase ni au DOM ici, tout est testable.

/** Une catégorie de dépenses avec son budget mensuel (en centimes). */
export interface Category {
  id: string;
  name: string;
  /** Budget mensuel autorisé, en centimes (0 = pas de limite fixée). */
  budget: number;
  /** Ordre d'affichage (plus petit = plus haut). */
  order: number;
}

/** Une dépense saisie. Le montant est en centimes pour éviter les erreurs d'arrondi. */
export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  label: string;
  /** Date locale « AAAA-MM-JJ ». */
  date: string;
  /** Mois « AAAA-MM », dérivé de la date (sert à filtrer côté serveur). */
  month: string;
  byName: string;
}

export type GaugeLevel = 'ok' | 'warn' | 'over';

/** Identifiant réservé aux dépenses dont la catégorie a été supprimée. */
export const NO_CATEGORY = '__none__';

/** Catégories proposées au premier lancement (budgets en euros). */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ id: string; name: string; euros: number }> = [
  { id: 'courses', name: 'Courses', euros: 320 },
  { id: 'jardin-bricolage', name: 'Jardin & bricolage', euros: 120 },
  { id: 'amazon', name: 'Amazon', euros: 100 },
  { id: 'restos', name: 'Restos', euros: 40 },
  { id: 'petits-plaisirs', name: 'Petits plaisirs', euros: 30 },
  { id: 'loisirs', name: 'Loisirs', euros: 30 },
];

// ---------------------------------------------------------------- montants

/**
 * Lit un montant saisi par l'utilisateur (« 12,50 », « 12.5 », « 1 234,56 € ») et le renvoie
 * en centimes. Renvoie null si la saisie n'est pas un montant strictement positif.
 */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return cents > 0 && Number.isFinite(cents) ? cents : null;
}

const euroFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const euroFmtRound = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** 1250 → « 12,50 € ». Avec `round`, sans décimales (« 13 € »). */
export function formatEuro(cents: number, round = false): string {
  return (round ? euroFmtRound : euroFmt).format(cents / 100);
}

/** Centimes → texte modifiable dans un champ (« 12,5 » → « 12,50 »). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

// ---------------------------------------------------------------- dates (heure locale)

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale → « AAAA-MM-JJ ». */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date locale → « AAAA-MM ». */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** « AAAA-MM-JJ » → « AAAA-MM » (null si la date est invalide). */
export function monthOfDate(dateKey: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey.slice(0, 7) : null;
}

/** Décale un mois « AAAA-MM » de `delta` mois, sans arithmétique en millisecondes. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return toMonthKey(d);
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 2026-11 » → « novembre 2026 ». */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1] ?? '?'} ${y}`;
}

/** « 2026-11-25 » → « mer. 25 nov. ». */
export function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ---------------------------------------------------------------- jauges

/** Seuils demandés : vert sous 60 %, orange sous 80 %, rouge au-delà. */
export function gaugeLevel(percent: number): GaugeLevel {
  if (percent < 60) return 'ok';
  if (percent < 80) return 'warn';
  return 'over';
}

export interface CategorySummary {
  id: string;
  name: string;
  budget: number;
  spent: number;
  /** Part du budget consommée (peut dépasser 100). null si aucun budget n'est fixé. */
  percent: number | null;
  level: GaugeLevel;
  count: number;
}

export interface MonthSummary {
  total: number;
  totalBudget: number;
  categories: CategorySummary[];
}

/**
 * Résume un mois : dépensé par catégorie, pourcentage du budget et niveau de la jauge.
 * Les dépenses dont la catégorie n'existe plus sont regroupées dans « Sans catégorie ».
 */
export function summarize(categories: readonly Category[], expenses: readonly Expense[]): MonthSummary {
  const known = new Set(categories.map((c) => c.id));
  const spent = new Map<string, { sum: number; count: number }>();
  for (const e of expenses) {
    const key = known.has(e.categoryId) ? e.categoryId : NO_CATEGORY;
    const cur = spent.get(key) ?? { sum: 0, count: 0 };
    cur.sum += e.amount;
    cur.count += 1;
    spent.set(key, cur);
  }
  const rows: CategorySummary[] = [...categories]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'))
    .map((c) => {
      const s = spent.get(c.id) ?? { sum: 0, count: 0 };
      const percent = c.budget > 0 ? (s.sum / c.budget) * 100 : null;
      return {
        id: c.id,
        name: c.name,
        budget: c.budget,
        spent: s.sum,
        percent,
        level: percent === null ? (s.sum > 0 ? 'over' : 'ok') : gaugeLevel(percent),
        count: s.count,
      };
    });
  const orphan = spent.get(NO_CATEGORY);
  if (orphan) {
    rows.push({
      id: NO_CATEGORY,
      name: 'Sans catégorie',
      budget: 0,
      spent: orphan.sum,
      percent: null,
      level: 'over',
      count: orphan.count,
    });
  }
  return {
    total: expenses.reduce((s, e) => s + e.amount, 0),
    totalBudget: categories.reduce((s, c) => s + c.budget, 0),
    categories: rows,
  };
}

// ---------------------------------------------------------------- lecture tolérante

const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

/** Lit un document catégorie, même incomplet. */
export function readCategory(id: string, data: Record<string, unknown> | undefined): Category {
  const d = data ?? {};
  return {
    id,
    name: str(d.name, '').trim() || 'Sans nom',
    budget: Math.max(0, Math.round(num(d.budget, 0))),
    order: num(d.order, 0),
  };
}

/** Lit un document dépense, même incomplet. Renvoie null s'il est inutilisable. */
export function readExpense(id: string, data: Record<string, unknown> | undefined): Expense | null {
  const d = data ?? {};
  const amount = Math.round(num(d.amount, 0));
  const date = str(d.date, '');
  const month = monthOfDate(date) ?? str(d.month, '');
  if (amount <= 0 || !month) return null;
  return {
    id,
    amount,
    categoryId: str(d.categoryId, NO_CATEGORY),
    label: str(d.label, '').trim(),
    date,
    month,
    byName: str(d.byName, ''),
  };
}

/** Transforme un nom de catégorie en identifiant de document stable. */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'categorie';
}

/** Trie les dépenses de la plus récente à la plus ancienne. */
export function sortExpenses(list: readonly Expense[]): Expense[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
