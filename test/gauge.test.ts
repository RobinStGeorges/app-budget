import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Gauge from '../src/components/Gauge.svelte';
import { summarize } from '../src/lib/budget';

let app: Record<string, unknown> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(spentCents: number, budgetCents: number) {
  const row = summarize(
    [{ id: 'amazon', name: 'Amazon', budget: budgetCents, order: 0 }],
    spentCents > 0
      ? [{ id: 'e', amount: spentCents, categoryId: 'amazon', date: '2026-11-01', month: '2026-11', label: '', byName: '' }]
      : [],
  ).categories[0];
  app = mount(Gauge, { target: document.body, props: { row, href: '#/liste/amazon' } });
  flushSync();
  return document.body.querySelector('a.gauge') as HTMLAnchorElement;
}

describe('jauge', () => {
  it('est verte sous 60 % et affiche le reste', () => {
    const el = render(5000, 10000);
    expect(el.dataset.level).toBe('ok');
    expect(el.textContent).toContain('50 %');
    expect(el.textContent).toContain('Reste');
    expect((el.querySelector('.fill') as HTMLElement).style.width).toBe('50%');
  });

  it('est orange entre 60 et 80 %', () => {
    expect(render(7000, 10000).dataset.level).toBe('warn');
  });

  it('est rouge à partir de 80 % et plafonne la barre à 100 %', () => {
    const el = render(13000, 10000);
    expect(el.dataset.level).toBe('over');
    expect(el.textContent).toContain('130 %');
    expect(el.textContent).toContain('Dépassé de');
    expect((el.querySelector('.fill') as HTMLElement).style.width).toBe('100%');
  });

  it('mène à la liste de la catégorie', () => {
    expect(render(0, 10000).getAttribute('href')).toBe('#/liste/amazon');
  });
});
