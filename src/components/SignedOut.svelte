<script lang="ts">
  import { signIn, toFrenchMessage } from 'famille-core';

  let { status }: { status: 'loading' | 'signedOut' | 'noFamily' } = $props();

  // En développement uniquement : petit formulaire pour se connecter sans passer par le portail.
  const dev = import.meta.env.DEV;
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  async function login(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      await signIn(email, password);
    } catch (err) {
      error = toFrenchMessage(err);
    } finally {
      busy = false;
    }
  }
</script>

<div class="box fc-card">
  {#if status === 'loading'}
    <p class="fc-muted">Chargement…</p>
  {:else if status === 'noFamily'}
    <h2>Aucune famille sélectionnée</h2>
    <p class="fc-muted">Crée ou rejoins une famille depuis le portail, puis reviens ici.</p>
    <a class="fc-btn fc-btn-primary fc-btn-block" href="/">Aller au portail</a>
  {:else}
    <h2>Connectez-vous depuis le portail</h2>
    <p class="fc-muted">Le Budget utilise le compte de la famille du Petit Perchoir.</p>
    <a class="fc-btn fc-btn-primary fc-btn-block" href="/">Aller au portail</a>
    {#if dev}
      <form class="dev" onsubmit={login}>
        <p class="fc-muted">Développement : connexion directe</p>
        <input class="fc-input" type="email" placeholder="E-mail" autocomplete="email" bind:value={email} />
        <input class="fc-input" type="password" placeholder="Mot de passe" autocomplete="current-password" bind:value={password} />
        {#if error}<p class="fc-error">{error}</p>{/if}
        <button class="fc-btn fc-btn-block" disabled={busy}>Se connecter</button>
      </form>
    {/if}
  {/if}
</div>

<style>
  .box {
    padding: 22px;
    display: grid;
    gap: 12px;
    margin-top: 24px;
  }
  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  p {
    margin: 0;
  }
  .dev {
    display: grid;
    gap: 10px;
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--fc-border);
  }
  .dev .fc-input {
    min-height: 48px;
    width: 100%;
  }
</style>
