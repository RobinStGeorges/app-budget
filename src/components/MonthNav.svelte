<script lang="ts">
  import { monthLabel, shiftMonth } from '../lib/budget';

  let { month, currentMonth, onMonth }: { month: string; currentMonth: string; onMonth: (m: string) => void } =
    $props();
</script>

<div class="nav">
  <button class="fc-btn arrow" aria-label="Mois précédent" onclick={() => onMonth(shiftMonth(month, -1))}>‹</button>
  <div class="label">
    <strong>{monthLabel(month)}</strong>
    {#if month !== currentMonth}
      <button class="link" onclick={() => onMonth(currentMonth)}>Revenir au mois en cours</button>
    {/if}
  </div>
  <button
    class="fc-btn arrow"
    aria-label="Mois suivant"
    disabled={month >= currentMonth}
    onclick={() => onMonth(shiftMonth(month, 1))}>›</button
  >
</div>

<style>
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 14px;
  }
  .arrow {
    min-width: 48px;
    min-height: 48px;
    padding: 0;
    font-size: 1.6rem;
    line-height: 1;
  }
  .label {
    display: grid;
    justify-items: center;
    text-align: center;
  }
  .label strong {
    font-size: 1.15rem;
    text-transform: capitalize;
  }
  .link {
    border: 0;
    background: none;
    color: var(--fc-primary);
    font: inherit;
    font-size: 0.9rem;
    padding: 6px 8px;
    min-height: 36px;
    cursor: pointer;
  }
</style>
