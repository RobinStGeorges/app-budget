<script lang="ts">
  import MonthNav from './MonthNav.svelte';
  import Gauge from './Gauge.svelte';
  import { dayLabel, formatEuro, sortExpenses, NO_CATEGORY, type Category, type Expense, type MonthSummary } from '../lib/budget';
  import { href } from '../lib/route';

  let {
    month,
    currentMonth,
    onMonth,
    categories,
    expenses,
    summary,
    categoryId,
    loading,
  }: {
    month: string;
    currentMonth: string;
    onMonth: (m: string) => void;
    categories: Category[];
    expenses: Expense[];
    summary: MonthSummary;
    categoryId: string | null;
    loading: boolean;
  } = $props();

  const names = $derived(new Map(categories.map((c) => [c.id, c.name])));
  const known = $derived(new Set(categories.map((c) => c.id)));
  const shown = $derived(
    sortExpenses(
      categoryId === null
        ? expenses
        : categoryId === NO_CATEGORY
          ? expenses.filter((e) => !known.has(e.categoryId))
          : expenses.filter((e) => e.categoryId === categoryId),
    ),
  );
  const row = $derived(categoryId ? summary.categories.find((c) => c.id === categoryId) : undefined);
  /** « ven. 20 nov. · Amazon · Robin » (la catégorie seulement dans la liste complète). */
  function metaLine(e: Expense): string {
    const parts = [dayLabel(e.date)];
    if (categoryId === null) parts.push(names.get(e.categoryId) ?? 'Sans catégorie');
    if (e.byName) parts.push(e.byName);
    return parts.join(' · ');
  }
  const title = $derived(categoryId === null ? 'Toutes les dépenses' : (row?.name ?? names.get(categoryId) ?? 'Catégorie'));
</script>

<MonthNav {month} {currentMonth} {onMonth} />

<h2>{title}</h2>
{#if row}
  <div class="gauge"><Gauge {row} href={href({ name: 'home' })} /></div>
{/if}

{#if loading}
  <p class="fc-muted">Chargement…</p>
{:else if shown.length === 0}
  <p class="fc-muted empty">Aucune dépense ce mois-ci.</p>
{:else}
  <ul class="list fc-card">
    {#each shown as e (e.id)}
      <li>
        <a href={href({ name: 'edit', id: e.id })}>
          <span class="main">
            <span class="label">{e.label || names.get(e.categoryId) || 'Sans catégorie'}</span>
            <span class="fc-muted meta">{metaLine(e)}</span>
          </span>
          <strong class="amt">{formatEuro(e.amount)}</strong>
        </a>
      </li>
    {/each}
  </ul>
  <p class="fc-muted count">{shown.length} dépense{shown.length > 1 ? 's' : ''} · touche une ligne pour la modifier</p>
{/if}

<style>
  h2 {
    margin: 0 0 12px;
    font-size: 1.25rem;
  }
  .gauge {
    margin-bottom: 14px;
  }
  .empty {
    padding: 24px 0;
    text-align: center;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  li + li {
    border-top: 1px solid var(--fc-border);
  }
  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    min-height: 56px;
    color: inherit;
    text-decoration: none;
  }
  a:active {
    background: var(--fc-bg);
  }
  .main {
    display: grid;
    min-width: 0;
  }
  .label {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 0.88rem;
  }
  .amt {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .count {
    font-size: 0.88rem;
    text-align: center;
  }
</style>
