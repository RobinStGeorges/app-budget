<script lang="ts">
  import Gauge from './Gauge.svelte';
  import MonthNav from './MonthNav.svelte';
  import { formatEuro, gaugeLevel, type MonthSummary } from '../lib/budget';
  import { href } from '../lib/route';

  let {
    month,
    currentMonth,
    onMonth,
    summary,
    loading,
    hasCategories,
    onSeed,
  }: {
    month: string;
    currentMonth: string;
    onMonth: (m: string) => void;
    summary: MonthSummary;
    loading: boolean;
    hasCategories: boolean;
    onSeed: () => void;
  } = $props();

  const totalPct = $derived(summary.totalBudget > 0 ? (summary.total / summary.totalBudget) * 100 : null);
</script>

<MonthNav {month} {currentMonth} {onMonth} />

{#if loading}
  <p class="fc-muted center">Chargement…</p>
{:else if !hasCategories}
  <div class="fc-card empty">
    <h2>Aucune catégorie pour l'instant</h2>
    <p class="fc-muted">
      Une catégorie = une enveloppe avec son budget du mois. Commence avec les catégories proposées, tu
      pourras les modifier ensuite.
    </p>
    <button class="fc-btn fc-btn-primary fc-btn-block" onclick={onSeed}>Utiliser les catégories proposées</button>
    <a class="fc-btn fc-btn-block" href={href({ name: 'settings' })}>Créer mes propres catégories</a>
  </div>
{:else}
  <a
    class="total fc-card"
    href={href({ name: 'list', categoryId: null })}
    data-level={totalPct === null ? 'ok' : gaugeLevel(totalPct)}
  >
    <span class="fc-muted">Dépensé ce mois-ci</span>
    <strong class="big">{formatEuro(summary.total)}</strong>
    {#if summary.totalBudget > 0}
      <span class="fc-muted">
        sur {formatEuro(summary.totalBudget, true)} de budget ·
        <span class="pct">{Math.round(totalPct ?? 0)} %</span>
      </span>
    {/if}
  </a>

  <ul class="gauges">
    {#each summary.categories as row (row.id)}
      <li><Gauge {row} href={href({ name: 'list', categoryId: row.id })} /></li>
    {/each}
  </ul>
{/if}

<style>
  .center {
    text-align: center;
    padding: 32px 0;
  }
  .empty {
    padding: 20px;
    display: grid;
    gap: 12px;
  }
  .empty h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .empty p {
    margin: 0;
  }
  .total {
    display: grid;
    gap: 2px;
    padding: 16px 18px;
    color: inherit;
    text-decoration: none;
    margin-bottom: 14px;
  }
  .big {
    font-size: 2rem;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
  }
  .pct {
    font-weight: 700;
  }
  [data-level='ok'] .pct {
    color: var(--g-ok);
  }
  [data-level='warn'] .pct {
    color: var(--g-warn);
  }
  [data-level='over'] .pct {
    color: var(--g-over);
  }
  .gauges {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
</style>
