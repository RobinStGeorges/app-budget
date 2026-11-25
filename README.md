# Budget — Le Petit Perchoir

Mini-app du portail familial : on note chaque dépense dans une catégorie, et l'accueil montre une
jauge par catégorie, c'est-à-dire la part du budget mensuel déjà dépensée.

- **Vert** sous 60 %, **orange** de 60 à 80 %, **rouge** à partir de 80 %.
- Les jauges repartent à zéro le 1er de chaque mois ; l'historique reste consultable (flèches ‹ ›).
- Les catégories et leurs budgets se règlent dans ⚙︎ Réglages : curseur, montant exact, ordre,
  ajout et suppression. Une catégorie supprimée ne supprime pas ses dépenses : elles apparaissent
  dans « Sans catégorie ».

Adresse : `https://lepetitperchoir.fr/budget/` · Worker Cloudflare : `famille-budget`.

## Données

Tout est stocké dans Firestore sous `families/{familyId}/apps/budget/`, partagé par les membres de
la famille :

| Collection | Un document par… | Champs |
| --- | --- | --- |
| `categories` | catégorie | `name`, `budget` (centimes / mois), `order` |
| `expenses` | dépense | `amount` (centimes), `categoryId`, `label`, `date` (AAAA-MM-JJ), `month` (AAAA-MM), `byUid`, `byName` |

Les montants sont en centimes (entiers) pour éviter les erreurs d'arrondi. Les catégories proposées
au premier lancement ont des identifiants fixes : si deux téléphones les créent en même temps, aucun
doublon n'apparaît. Aucune règle de sécurité n'est à modifier : la règle générique `apps/{id}/`
s'applique.

Hors connexion : les saisies sont enregistrées dans le cache local et envoyées au retour du réseau
(l'interface n'attend jamais le serveur ; un refus est signalé par un message).

## Développement

```
npm install
npm run dev        # http://localhost:5178/budget/  (projet Firebase famille-dev)
npm test           # tests Vitest
npm run check      # svelte-check
npm run build      # dist/ (projet Firebase famille-prod)
```

En développement, un petit formulaire de connexion apparaît si la session n'est pas ouverte. En
production, l'app renvoie vers le portail.

## Déploiement

Cloudflare Workers Builds depuis ce dépôt :

- commande de build : `npm run build`
- commande de déploiement : `npx wrangler deploy`
- nom du Worker : `famille-budget` (déjà dans `wrangler.jsonc`)

Socle commun figé : `famille-core#v0.2.0`.
