// Navigation par hash (#/…), pour fonctionner sous /budget/ sans configuration serveur.

export type Route =
  | { name: 'home' }
  | { name: 'add'; categoryId: string | null }
  | { name: 'edit'; id: string }
  | { name: 'list'; categoryId: string | null }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '');
  const [head, arg] = path.split('/');
  const value = arg ? decodeURIComponent(arg) : null;
  switch (head) {
    case 'ajout':
      return { name: 'add', categoryId: value };
    case 'depense':
      return value ? { name: 'edit', id: value } : { name: 'home' };
    case 'liste':
      return { name: 'list', categoryId: value };
    case 'reglages':
      return { name: 'settings' };
    default:
      return { name: 'home' };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'add':
      return route.categoryId ? `#/ajout/${encodeURIComponent(route.categoryId)}` : '#/ajout';
    case 'edit':
      return `#/depense/${encodeURIComponent(route.id)}`;
    case 'list':
      return route.categoryId ? `#/liste/${encodeURIComponent(route.categoryId)}` : '#/liste';
    case 'settings':
      return '#/reglages';
    default:
      return '#/';
  }
}
