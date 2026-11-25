<script lang="ts">
  import CategoryEditor from './CategoryEditor.svelte';
  import { formatEuro, parseAmount, type Category } from '../lib/budget';

  let {
    categories,
    onRename,
    onBudget,
    onMove,
    onDelete,
    onCreate,
  }: {
    categories: Category[];
    onRename: (id: string, name: string) => void;
    onBudget: (id: string, cents: number) => void;
    onMove: (id: string, dir: -1 | 1) => void;
    onDelete: (id: string) => void;
    onCreate: (name: string, cents: number) => void;
  } = $props();

  const total = $derived(categories.reduce((s, c) => s + c.budget, 0));

  let newName = $state('');
  let newBudget = $state('');
  let tried = $state(false);
  const exists = $derived(categories.some((c) => c.name.toLowerCase() === newName.trim().toLowerCase()));
  const newCents = $derived(newBudget.trim() === '' ? 0 : parseAmount(newBudget));

  function add(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (!newName.trim() || exists || newCents === null) return;
    onCreate(newName.trim(), newCents);
    newName = '';
    newBudget = '';
    tried = false;
  }
</script>

<h2>Réglages des catégories</h2>
<p class="fc-muted intro">
  Fais glisser le curseur pour fixer le budget mensuel de chaque catégorie. La jauge de l'accueil passe à
  l'orange à 60 % et au rouge à 80 %. Budget total : <strong>{formatEuro(total, true)}</strong> par mois.
</p>

<ul class="list">
  {#each categories as c, i (c.id)}
    <li>
      <CategoryEditor
        category={c}
        isFirst={i === 0}
        isLast={i === categories.length - 1}
        onRename={(n) => onRename(c.id, n)}
        onBudget={(v) => onBudget(c.id, v)}
        onMove={(d) => onMove(c.id, d)}
        onDelete={() => onDelete(c.id)}
      />
    </li>
  {/each}
</ul>

<form class="add fc-card" onsubmit={add} novalidate>
  <h3>Ajouter une catégorie</h3>
  <input class="fc-input" placeholder="Nom (ex. : Vêtements)" maxlength="40" bind:value={newName} aria-label="Nom de la nouvelle catégorie" />
  <input class="fc-input" inputmode="decimal" placeholder="Budget du mois en € (facultatif)" bind:value={newBudget} aria-label="Budget de la nouvelle catégorie" />
  {#if tried && !newName.trim()}<span class="fc-error">Donne un nom à la catégorie.</span>{/if}
  {#if exists}<span class="fc-error">Cette catégorie existe déjà.</span>{/if}
  {#if tried && newCents === null}<span class="fc-error">Budget invalide : indique un nombre, par exemple 50.</span>{/if}
  <button class="fc-btn fc-btn-primary fc-btn-block" type="submit">Ajouter</button>
</form>

<style>
  h2 {
    margin: 0 0 6px;
    font-size: 1.3rem;
  }
  .intro {
    margin: 0 0 14px;
  }
  .list {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .add {
    padding: 16px;
    display: grid;
    gap: 10px;
  }
  .add h3 {
    margin: 0;
    font-size: 1.05rem;
  }
  .add .fc-input {
    min-height: 48px;
    width: 100%;
  }
</style>
