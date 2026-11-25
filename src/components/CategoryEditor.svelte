<script lang="ts">
  import { formatEuro, type Category } from '../lib/budget';

  let {
    category,
    isFirst,
    isLast,
    onRename,
    onBudget,
    onMove,
    onDelete,
  }: {
    category: Category;
    isFirst: boolean;
    isLast: boolean;
    onRename: (name: string) => void;
    onBudget: (cents: number) => void;
    onMove: (dir: -1 | 1) => void;
    onDelete: () => void;
  } = $props();

  // Copies locales : on écrit en base au relâchement du curseur, pas à chaque pixel.
  let name = $state('');
  let euros = $state(0);
  let dragging = $state(false);
  let confirmDelete = $state(false);

  $effect(() => {
    name = category.name;
  });
  $effect(() => {
    const v = Math.round(category.budget / 100);
    if (!dragging) euros = v;
  });

  const max = $derived(Math.max(1000, Math.ceil((euros + 1) / 500) * 500));

  function commitName() {
    const n = name.trim();
    if (!n) {
      name = category.name;
      return;
    }
    if (n !== category.name) onRename(n);
  }

  function commitBudget() {
    dragging = false;
    const v = Math.max(0, Math.round(Number(euros) || 0));
    euros = v;
    if (v * 100 !== category.budget) onBudget(v * 100);
  }
</script>

<div class="editor fc-card">
  <div class="row">
    <input
      class="fc-input name"
      aria-label="Nom de la catégorie"
      maxlength="40"
      bind:value={name}
      onchange={commitName}
      onblur={commitName}
    />
    <div class="move">
      <button class="fc-btn icon" aria-label="Monter" disabled={isFirst} onclick={() => onMove(-1)}>↑</button>
      <button class="fc-btn icon" aria-label="Descendre" disabled={isLast} onclick={() => onMove(1)}>↓</button>
    </div>
  </div>

  <label class="slider">
    <span class="budget-line">
      <span>Budget du mois</span>
      <strong>{euros > 0 ? formatEuro(euros * 100, true) : 'Pas de limite'}</strong>
    </span>
    <input
      type="range"
      min="0"
      {max}
      step="5"
      bind:value={euros}
      oninput={() => (dragging = true)}
      onchange={commitBudget}
      aria-label="Budget mensuel de {category.name}"
    />
  </label>

  <div class="row bottom">
    <label class="exact">
      <span class="fc-muted">Montant exact</span>
      <input
        class="fc-input"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        bind:value={euros}
        onchange={commitBudget}
        aria-label="Budget exact en euros"
      />
      <span class="fc-muted">€</span>
    </label>
    {#if confirmDelete}
      <button class="fc-btn fc-btn-danger" onclick={onDelete}>Confirmer</button>
    {:else}
      <button class="fc-btn fc-btn-danger" onclick={() => (confirmDelete = true)}>Supprimer</button>
    {/if}
  </div>
  {#if confirmDelete}
    <p class="fc-muted note">
      Les dépenses déjà saisies restent et apparaîtront « Sans catégorie ».
      <button class="link" onclick={() => (confirmDelete = false)}>Annuler</button>
    </p>
  {/if}
</div>

<style>
  .editor {
    padding: 14px 16px;
    display: grid;
    gap: 12px;
  }
  .row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .name {
    flex: 1;
    min-height: 48px;
    font-weight: 600;
    font-size: 1.05rem;
    min-width: 0;
  }
  .move {
    display: flex;
    gap: 6px;
  }
  .icon {
    min-width: 48px;
    min-height: 48px;
    padding: 0;
    font-size: 1.2rem;
  }
  .slider {
    display: grid;
    gap: 6px;
  }
  .budget-line {
    display: flex;
    justify-content: space-between;
  }
  input[type='range'] {
    width: 100%;
    height: 36px;
    accent-color: var(--fc-primary);
  }
  .bottom {
    justify-content: space-between;
  }
  .exact {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .exact input {
    width: 96px;
    min-height: 48px;
    text-align: right;
  }
  .bottom .fc-btn {
    min-height: 48px;
  }
  .note {
    margin: 0;
    font-size: 0.9rem;
  }
  .link {
    border: 0;
    background: none;
    color: var(--fc-primary);
    font: inherit;
    padding: 4px;
    cursor: pointer;
  }
</style>
