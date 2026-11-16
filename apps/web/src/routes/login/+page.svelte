<script lang="ts">
  import { onMount } from 'svelte';
  import { oauthResumeUrl } from '@rusky/core';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';

  let email = $state('');
  let password = $state('');
  let mode = $state<'signin' | 'signup'>('signin');
  let canRegister = $state(false);
  let busy = $state(false);
  let error = $state('');

  onMount(async () => {
    canRegister = await auth.registrationOpen();
    if (canRegister) mode = 'signup';
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      if (mode === 'signup') await auth.signUp(email, password);
      else await auth.signIn(email, password);
      const resume = oauthResumeUrl(window.location.search);
      if (resume) {
        // Claude sent the browser here mid-connection; the authorize step picks it up again.
        window.location.href = resume;
        return;
      }
      await progress.sync();
      await goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong';
    } finally {
      busy = false;
    }
  }
</script>

<BackLink href="/" label="Today" />

<div class="px-5 pt-1">
  <h1 class="text-3xl leading-tight font-bold tracking-[-0.02em]">
    {mode === 'signup' ? 'Create your account' : 'Sign in'}
  </h1>
  <p class="mt-1.5 text-[15px] leading-snug text-muted">
    Your boxes sync between every device you sign in on. Practising works without it, offline too.
  </p>
</div>

<form onsubmit={submit} class="mx-5 mt-6 flex flex-col gap-3.5">
  <label class="flex flex-col gap-1.5">
    <span class="text-[13px] font-semibold text-muted">Email</span>
    <input
      type="email"
      bind:value={email}
      required
      autocomplete="email"
      class="h-12 rounded-xl border border-edge bg-card px-3.5 text-base text-ink outline-none focus:border-ink"
    />
  </label>
  <label class="flex flex-col gap-1.5">
    <span class="text-[13px] font-semibold text-muted">Password</span>
    <input
      type="password"
      bind:value={password}
      required
      minlength="8"
      autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
      class="h-12 rounded-xl border border-edge bg-card px-3.5 text-base text-ink outline-none focus:border-ink"
    />
  </label>

  {#if error}
    <p role="alert" class="text-[15px] text-target">{error}</p>
  {/if}

  <button
    type="submit"
    disabled={busy}
    class="mt-2 h-14 rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg disabled:opacity-60"
  >
    {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
  </button>

  {#if canRegister}
    <button
      type="button"
      onclick={() => (mode = mode === 'signup' ? 'signin' : 'signup')}
      class="min-h-11 text-[15px] font-semibold text-native"
    >
      {mode === 'signup' ? 'I already have an account' : 'Create an account instead'}
    </button>
  {/if}
</form>
