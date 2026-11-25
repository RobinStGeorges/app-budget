<script lang="ts">
  import { centsToInput, parseAmount, toDateKey, type Category, type Expense } from '../lib/budget';
  import type { ExpenseInput } from '../lib/store';

  let {
    categories,
    initial = null,
    presetCategory = null,
    onSave,
    onDelete,
    onCancel,
  }: {
    categories: Category[];
    initial?: Expense | null;
    presetCategory?: string | null;
    onSave: (input: ExpenseInput) => void;
    onDelete?: () => void;
    onCancel: () => void;
  } = $props();

  // Valeurs de départ, lues une seule fois à l'ouverture du formulaire.
  const start = (() => ({
    amount: initial ? centsToInput(initial.amount) : '',
    categoryId: initial?.categoryId ?? presetCategory ?? '',
    label: initial?.label ?? '',
    date: initial?.date ?? toDateKey(new Date()),
  }))();

  let amountText = $state(start.amount);
  let categoryId = $state(start.categoryId);
  let label = $state(start.label);
  let date = $state(start.date);
  let tried = $state(false);
  let confirmDelete = $state(false);

  const amount = $derived(parseAmount(amountText));
  const categoryOk = $derived(categories.some((c) => c.id === categoryId));
  const valid = $derived(amount !== null && categoryOk && /^\d{4}-\d{2}-\d{2}$/.test(date));

  function submit(e: SubmitEvent) {
    e.preventDefault();
    tried = true;
    if (!valid || amount === null) return;
    onSave({ amount, categoryId, label, date });
  }

  function focus(node: HTMLInputElement) {
    if (!initial) node.focus();
  }
</script>

<form class="form" onsubmit={submit} novalidate>
  <h2>{initial ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>

  <label class="field">
    <span>Montant</span>
    <div class="amount">
      <input
        class="fc-input"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0,00"
        bind:value={amountText}
        use:focus
        aria-invalid={tried && amount === null}
      />
      <span class="euro">€</span>
    </div>
    {#if tried && amount === null}<span class="fc-error">Indique un montant, par exemple 12,50.</span>{/if}
  </label>

  <fieldset class="field">
    <legend>Catégorie</legend>
    <div class="chips">
      {#each categories as c (c.id)}
        <button
          type="button"
          class="chip"
          class:selected={categoryId === c.id}
          aria-pressed={categoryId === c.id}
          onclick={() => (categoryId = c.id)}>{c.name}</button
        >
      {/each}
    </div>
    {#if tried && !categoryOk}<span class="fc-error">Choisis une catégorie.</span>{/if}
  </fieldset>

  <label class="field">
    <span>Libellé <span class="fc-muted">(facultatif)</span></span>
    <input class="fc-input" maxlength="80" placeholder="Ex. : Leclerc, cadeau anniversaire…" bind:value={label} />
  </label>

  <label class="field">
    <span>Date</span>
    <input class="fc-input" type="date" bind:value={date} />
  </label>

  <div class="actions">
    <button type="submit" class="fc-btn fc-btn-primary fc-btn-block">{initial ? 'Enregistrer' : 'Ajouter la dépense'}</button>
    <button type="button" class="fc-btn fc-btn-block" onclick={onCancel}>Annuler</button>
    {#if onDelete}
      {#if confirmDelete}
        <button type="button" class="fc-btn fc-btn-danger fc-btn-block" onclick={onDelete}>Confirmer la suppression</button>
      {:else}
        <button type="button" class="fc-btn fc-btn-danger fc-btn-block" onclick={() => (confirmDelete = true)}>
          Supprimer cette dépense
        </button>
      {/if}
    {/if}
  </div>
</form>

<style>
  .form {
    display: grid;
    gap: 18px;
  }
  h2 {
    margin: 0;
    font-size: 1.3rem;
  }
  .field {
    display: grid;
    gap: 8px;
    border: 0;
    padding: 0;
    margin: 0;
  }
  .field > span,
  legend {
    font-weight: 600;
    padding: 0;
  }
  .amount {
    position: relative;
  }
  .amount input {
    font-size: 1.8rem;
    font-weight: 700;
    padding-right: 44px;
    min-height: 60px;
    font-variant-numeric: tabular-nums;
  }
  .euro {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.4rem;
    color: var(--fc-muted);
  }
  .fc-input {
    min-height: 48px;
    width: 100%;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    min-height: 48px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1.5px solid var(--fc-border);
    background: var(--fc-surface);
    color: var(--fc-text);
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
  }
  .chip.selected {
    background: var(--fc-primary);
    border-color: var(--fc-primary);
    color: var(--fc-primary-text);
    font-weight: 600;
  }
  .actions {
    display: grid;
    gap: 10px;
    margin-top: 4px;
  }
</style>
