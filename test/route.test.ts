import { describe, expect, it } from 'vitest';
import { href, parseHash, type Route } from '../src/lib/route';

describe('navigation par hash', () => {
  it('reconnaît chaque écran', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/ajout')).toEqual({ name: 'add', categoryId: null });
    expect(parseHash('#/ajout/amazon')).toEqual({ name: 'add', categoryId: 'amazon' });
    expect(parseHash('#/depense/abc')).toEqual({ name: 'edit', id: 'abc' });
    expect(parseHash('#/depense')).toEqual({ name: 'home' });
    expect(parseHash('#/liste')).toEqual({ name: 'list', categoryId: null });
    expect(parseHash('#/reglages')).toEqual({ name: 'settings' });
    expect(parseHash('#/inconnu')).toEqual({ name: 'home' });
  });

  it('fait l’aller-retour href → parseHash', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'add', categoryId: 'jardin-bricolage' },
      { name: 'edit', id: 'x/y z' },
      { name: 'list', categoryId: null },
      { name: 'settings' },
    ];
    for (const r of routes) expect(parseHash(href(r))).toEqual(r);
  });
});
