<script lang="ts">
  import { formatEuro, type CategorySummary } from '../lib/budget';

  let { row, href }: { row: CategorySummary; href: string } = $props();

  const width = $derived(row.percent === null ? (row.spent > 0 ? 100 : 0) : Math.min(100, row.percent));
  const remaining = $derived(row.budget - row.spent);
  const detail = $derived.by(() => {
    if (row.budget === 0) return row.spent > 0 ? 'Aucun budget fixé' : 'Aucune dépense';
    if (remaining >= 0) return `Reste ${formatEuro(remaining, true)}`;
    return `Dépassé de ${formatEuro(-remaining, true)}`;
  });
</script>

<a class="gauge fc-card" {href} data-level={row.level} aria-label="{row.name} : {formatEuro(row.spent)} dépensés">
  <div class="top">
    <span class="name">{row.name}</span>
    <span class="amounts">
      <strong>{formatEuro(row.spent, true)}</strong>
      {#if row.budget > 0}<span class="fc-muted"> / {formatEuro(row.budget, true)}</span>{/if}
    </span>
  </div>
  <div
    class="track"
    role="meter"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(width)}
    aria-label="Part du budget utilisée"
  >
    <div class="fill" style:width="{width}%"></div>
  </div>
  <div class="bottom">
    <span class="pct">{row.percent === null ? '—' : `${Math.round(row.percent)} %`}</span>
    <span class="fc-muted">{detail}</span>
  </div>
</a>

<style>
  .gauge {
    display: block;
    padding: 14px 16px;
    color: inherit;
    text-decoration: none;
    min-height: 48px;
  }
  .gauge:active {
    transform: scale(0.99);
  }
  .top,
  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .name {
    font-weight: 600;
    font-size: 1.05rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .amounts {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .track {
    height: 14px;
    margin: 10px 0 8px;
    border-radius: 999px;
    background: var(--fc-border);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 999px;
    background: var(--g-color);
    transition: width 0.3s ease;
  }
  .bottom {
    font-size: 0.92rem;
  }
  .pct {
    font-weight: 700;
    color: var(--g-color);
    font-variant-numeric: tabular-nums;
  }
  [data-level='ok'] {
    --g-color: var(--g-ok);
  }
  [data-level='warn'] {
    --g-color: var(--g-warn);
  }
  [data-level='over'] {
    --g-color: var(--g-over);
  }
  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }
  }
</style>
