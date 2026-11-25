<script lang="ts">
  import { onMount } from 'svelte';
  import { session, toFrenchMessage } from 'famille-core';
  import { registerSW } from 'virtual:pwa-register';
  import Home from './components/Home.svelte';
  import ExpenseForm from './components/ExpenseForm.svelte';
  import ExpenseList from './components/ExpenseList.svelte';
  import Settings from './components/Settings.svelte';
  import SignedOut from './components/SignedOut.svelte';
  import { summarize, toMonthKey, monthOfDate, type Category, type Expense } from './lib/budget';
  import { href, parseHash, type Route } from './lib/route';
  import {
    addExpense,
    createCategory,
    deleteCategory,
    deleteExpense,
    seedDefaultCategories,
    updateCategory,
    updateExpense,
    watchCategories,
    watchExpenses,
    type ExpenseInput,
  } from './lib/store';

  // ------------------------------------------------------------ navigation
  let route = $state<Route>(parseHash(location.hash));
  let movedInApp = false;

  function go(r: Route) {
    location.hash = href(r);
  }
  function back() {
    if (movedInApp) history.back();
    else go({ name: 'home' });
  }

  // ------------------------------------------------------------ bandeaux
  let online = $state(navigator.onLine);
  let needRefresh = $state(false);
  let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
  let toast = $state<{ text: string; error: boolean } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  function notify(text: string, error = false) {
    toast = { text, error };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = null), error ? 6000 : 2200);
  }
  /** Écriture sans attente : on ne signale que le refus éventuel du serveur. */
  function report(p: Promise<unknown>) {
    p.catch((e) => notify(toFrenchMessage(e), true));
  }

  onMount(() => {
    const onHash = () => {
      movedInApp = true;
      route = parseHash(location.hash);
      window.scrollTo(0, 0);
    };
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    updateSW = registerSW({ onNeedRefresh: () => (needRefresh = true) });
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });

  // ------------------------------------------------------------ données
  const familyId = $derived($session.status === 'ready' ? $session.familyId : null);
  const displayName = $derived($session.status === 'ready' ? $session.displayName : '');

  // Le mois en cours est relu quand l'app revient au premier plan (passage au 1er du mois).
  let currentMonth = $state(toMonthKey(new Date()));
  let month = $state(toMonthKey(new Date()));
  onMount(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const now = toMonthKey(new Date());
      if (now !== currentMonth) {
        if (month === currentMonth) month = now;
        currentMonth = now;
      }
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  });

  let categories = $state.raw<Category[]>([]);
  let catsLoaded = $state(false);
  let expenses = $state.raw<Expense[]>([]);
  let expLoaded = $state(false);
  let loadError = $state('');

  $effect(() => {
    const fid = familyId;
    categories = [];
    catsLoaded = false;
    if (!fid) return;
    return watchCategories(
      fid,
      (list) => {
        categories = [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
        catsLoaded = true;
        loadError = '';
      },
      (e) => (loadError = toFrenchMessage(e)),
    );
  });

  $effect(() => {
    const fid = familyId;
    const m = month;
    expenses = [];
    expLoaded = false;
    if (!fid) return;
    return watchExpenses(
      fid,
      m,
      (list) => {
        expenses = list;
        expLoaded = true;
        loadError = '';
      },
      (e) => (loadError = toFrenchMessage(e)),
    );
  });

  const summary = $derived(summarize(categories, expenses));
  const editId = $derived(route.name === 'edit' ? route.id : null);
  const editing = $derived(editId ? (expenses.find((e) => e.id === editId) ?? null) : null);
  const listCategory = $derived(route.name === 'list' ? route.categoryId : null);

  // ------------------------------------------------------------ actions
  function vibrate() {
    try {
      navigator.vibrate?.(30);
    } catch {
      /* non pris en charge */
    }
  }

  function saveNew(input: ExpenseInput) {
    if (!familyId) return;
    report(addExpense(familyId, input, displayName));
    vibrate();
    const m = monthOfDate(input.date);
    if (m && m !== month) month = m;
    notify('Dépense ajoutée');
    back();
  }

  function saveEdit(id: string, input: ExpenseInput) {
    if (!familyId) return;
    report(updateExpense(familyId, id, input));
    vibrate();
    notify('Dépense modifiée');
    back();
  }

  function removeExpense(id: string) {
    if (!familyId) return;
    report(deleteExpense(familyId, id));
    notify('Dépense supprimée');
    back();
  }

  function move(id: string, dir: -1 | 1) {
    if (!familyId) return;
    const list = [...categories];
    const i = list.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((c, k) => {
      if (c.order !== k) report(updateCategory(familyId, c.id, { order: k }));
    });
    categories = list.map((c, k) => ({ ...c, order: k }));
  }

  function create(name: string, cents: number) {
    if (!familyId) return;
    const order = categories.reduce((m, c) => Math.max(m, c.order + 1), 0);
    report(createCategory(familyId, name, cents, order).done);
    notify('Catégorie ajoutée');
  }
</script>

{#if !online}
  <div class="banner offline" role="status">Hors connexion : tes saisies seront envoyées au retour du réseau.</div>
{/if}
{#if needRefresh}
  <div class="banner update" role="status">
    <span>Nouvelle version disponible.</span>
    <button class="fc-btn" onclick={() => updateSW?.(true)}>Mettre à jour</button>
  </div>
{/if}

<header class="bar">
  {#if route.name === 'home' || $session.status !== 'ready'}
    <a class="nav-btn" href="/" aria-label="Retour au portail">‹ Portail</a>
  {:else}
    <button class="nav-btn" onclick={back} aria-label="Retour">‹ Retour</button>
  {/if}
  <h1>Budget</h1>
  {#if $session.status === 'ready' && route.name !== 'settings'}
    <a class="nav-btn gear" href={href({ name: 'settings' })} aria-label="Réglages">⚙︎</a>
  {:else}
    <span class="nav-btn placeholder"></span>
  {/if}
</header>

<main>
  {#if $session.status !== 'ready'}
    <SignedOut status={$session.status} />
  {:else}
    {#if loadError}<p class="fc-error err">{loadError}</p>{/if}

    {#if route.name === 'home'}
      <Home
        {month}
        {currentMonth}
        onMonth={(m) => (month = m)}
        {summary}
        loading={!catsLoaded || !expLoaded}
        hasCategories={categories.length > 0}
        onSeed={() => familyId && report(seedDefaultCategories(familyId))}
      />
    {:else if route.name === 'list'}
      <ExpenseList
        {month}
        {currentMonth}
        onMonth={(m) => (month = m)}
        {categories}
        {expenses}
        {summary}
        categoryId={route.categoryId}
        loading={!expLoaded}
      />
    {:else if route.name === 'add'}
      {#if !catsLoaded}
        <p class="fc-muted">Chargement…</p>
      {:else if categories.length === 0}
        <div class="fc-card pad">
          <p>Crée d'abord une catégorie.</p>
          <a class="fc-btn fc-btn-primary fc-btn-block" href={href({ name: 'settings' })}>Aller aux réglages</a>
        </div>
      {:else}
        <ExpenseForm {categories} presetCategory={route.categoryId} onSave={saveNew} onCancel={back} />
      {/if}
    {:else if route.name === 'edit'}
      {#if !expLoaded || !catsLoaded}
        <p class="fc-muted">Chargement…</p>
      {:else if editing}
        {@const exp = editing}
        {#key exp.id}
          <ExpenseForm
            {categories}
            initial={exp}
            onSave={(input) => saveEdit(exp.id, input)}
            onDelete={() => removeExpense(exp.id)}
            onCancel={back}
          />
        {/key}
      {:else}
        <div class="fc-card pad">
          <p>Cette dépense n'existe plus (supprimée sur un autre téléphone ?).</p>
          <a class="fc-btn fc-btn-block" href={href({ name: 'home' })}>Retour à l'accueil</a>
        </div>
      {/if}
    {:else if route.name === 'settings'}
      {#if !catsLoaded}
        <p class="fc-muted">Chargement…</p>
      {:else}
        <Settings
          {categories}
          onRename={(id, name) => familyId && report(updateCategory(familyId, id, { name }))}
          onBudget={(id, budget) => familyId && report(updateCategory(familyId, id, { budget }))}
          onMove={move}
          onDelete={(id) => {
            if (familyId) report(deleteCategory(familyId, id));
            notify('Catégorie supprimée');
          }}
          onCreate={create}
        />
      {/if}
    {/if}
  {/if}
</main>

{#if $session.status === 'ready' && (route.name === 'home' || route.name === 'list') && categories.length > 0}
  <div class="fab-wrap">
    <a
      class="fc-btn fc-btn-primary fc-btn-block fab"
      href={href({
        name: 'add',
        categoryId: listCategory && categories.some((c) => c.id === listCategory) ? listCategory : null,
      })}>+ Ajouter une dépense</a
    >
  </div>
{/if}

{#if toast}
  <div class="toast" class:error={toast.error} role="status">{toast.text}</div>
{/if}
