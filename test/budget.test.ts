import { describe, expect, it } from 'vitest';
import {
  NO_CATEGORY,
  formatEuro,
  gaugeLevel,
  monthLabel,
  monthOfDate,
  parseAmount,
  readCategory,
  readExpense,
  shiftMonth,
  slugify,
  sortExpenses,
  summarize,
  toDateKey,
  toMonthKey,
  type Category,
  type Expense,
} from '../src/lib/budget';

const cat = (id: string, budget: number, order = 0): Category => ({ id, name: id, budget, order });
const exp = (id: string, categoryId: string, amount: number, date = '2026-11-10'): Expense => ({
  id,
  categoryId,
  amount,
  date,
  month: date.slice(0, 7),
  label: '',
  byName: '',
});

describe('parseAmount', () => {
  it('lit les formats français et anglais en centimes', () => {
    expect(parseAmount('12,50')).toBe(1250);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount('  7 ')).toBe(700);
    expect(parseAmount('1 234,56 €')).toBe(123456);
    expect(parseAmount('0,1')).toBe(10);
  });
  it('évite les erreurs d’arrondi des flottants', () => {
    expect(parseAmount('19,99')).toBe(1999);
    expect(parseAmount('0,29')).toBe(29);
  });
  it('refuse les saisies invalides ou nulles', () => {
    for (const bad of ['', 'abc', '0', '0,00', '-5', '12,345', '1,2,3']) expect(parseAmount(bad)).toBeNull();
  });
});

describe('formatEuro', () => {
  it('formate en euros à la française', () => {
    expect(formatEuro(123456).replace(/\s/g, ' ')).toBe('1 234,56 €');
    expect(formatEuro(1250, true).replace(/\s/g, ' ')).toBe('13 €');
  });
});

describe('mois', () => {
  it('calcule les clés de date en heure locale', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toMonthKey(new Date(2026, 10, 30, 23, 59))).toBe('2026-11');
  });
  it('décale les mois en changeant d’année', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
  });
  it('ne dépend pas du jour courant (31 mars - 1 mois = février)', () => {
    expect(shiftMonth('2026-03', -1)).toBe('2026-02');
  });
  it('affiche le mois en français', () => {
    expect(monthLabel('2026-08')).toBe('août 2026');
  });
  it('extrait le mois d’une date valide seulement', () => {
    expect(monthOfDate('2026-11-25')).toBe('2026-11');
    expect(monthOfDate('25/11/2026')).toBeNull();
  });
});

describe('gaugeLevel : vert < 60 %, orange < 80 %, rouge sinon', () => {
  it('respecte les seuils exacts', () => {
    expect(gaugeLevel(0)).toBe('ok');
    expect(gaugeLevel(59.9)).toBe('ok');
    expect(gaugeLevel(60)).toBe('warn');
    expect(gaugeLevel(79.9)).toBe('warn');
    expect(gaugeLevel(80)).toBe('over');
    expect(gaugeLevel(150)).toBe('over');
  });
});

describe('summarize', () => {
  it('calcule dépensé, pourcentage et niveau par catégorie', () => {
    const s = summarize(
      [cat('amazon', 10000, 1), cat('courses', 32000, 0)],
      [exp('1', 'amazon', 5000), exp('2', 'amazon', 2000), exp('3', 'courses', 10000)],
    );
    expect(s.total).toBe(17000);
    expect(s.totalBudget).toBe(42000);
    expect(s.categories.map((c) => c.id)).toEqual(['courses', 'amazon']);
    const amazon = s.categories.find((c) => c.id === 'amazon')!;
    expect(amazon.spent).toBe(7000);
    expect(amazon.percent).toBe(70);
    expect(amazon.level).toBe('warn');
    expect(amazon.count).toBe(2);
    expect(s.categories.find((c) => c.id === 'courses')!.level).toBe('ok');
  });
  it('affiche une catégorie sans dépense à 0 %', () => {
    const s = summarize([cat('loisirs', 3000)], []);
    expect(s.categories[0]).toMatchObject({ spent: 0, percent: 0, level: 'ok' });
  });
  it('regroupe les dépenses de catégories supprimées dans « Sans catégorie »', () => {
    const s = summarize([cat('amazon', 10000)], [exp('1', 'supprimee', 1500)]);
    const orphan = s.categories.find((c) => c.id === NO_CATEGORY)!;
    expect(orphan.name).toBe('Sans catégorie');
    expect(orphan.spent).toBe(1500);
    expect(s.total).toBe(1500);
  });
  it('gère une catégorie sans budget', () => {
    const s = summarize([cat('divers', 0)], [exp('1', 'divers', 500)]);
    expect(s.categories[0].percent).toBeNull();
  });
});

describe('lecture tolérante', () => {
  it('complète une catégorie incomplète', () => {
    expect(readCategory('x', { name: '  ' })).toEqual({ id: 'x', name: 'Sans nom', budget: 0, order: 0 });
    expect(readCategory('y', { name: 'Amazon', budget: 10000.4, order: 2 })).toMatchObject({ budget: 10000, order: 2 });
    expect(readCategory('z', undefined).name).toBe('Sans nom');
  });
  it('rejette une dépense inutilisable et répare le mois manquant', () => {
    expect(readExpense('a', { amount: 0, date: '2026-11-01' })).toBeNull();
    expect(readExpense('b', { amount: 500 })).toBeNull();
    expect(readExpense('c', { amount: 500, date: '2026-11-03', categoryId: 'amazon' })).toMatchObject({
      month: '2026-11',
      label: '',
      byName: '',
    });
    expect(readExpense('d', { amount: 500, date: '2026-11-03' })!.categoryId).toBe(NO_CATEGORY);
  });
});

describe('divers', () => {
  it('fabrique des identifiants propres', () => {
    expect(slugify('Jardin & Bricolage')).toBe('jardin-bricolage');
    expect(slugify('Vêtements été')).toBe('vetements-ete');
    expect(slugify('!!!')).toBe('categorie');
  });
  it('trie les dépenses de la plus récente à la plus ancienne', () => {
    const list = sortExpenses([exp('1', 'a', 1, '2026-11-02'), exp('2', 'a', 1, '2026-11-20'), exp('3', 'a', 1, '2026-11-10')]);
    expect(list.map((e) => e.id)).toEqual(['2', '3', '1']);
  });
});
