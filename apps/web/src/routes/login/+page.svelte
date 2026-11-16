<script lang="ts">
  import { onMount } from 'svelte';
  import { oauthResumeUrl } from '@rusky/core';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { MIN_PASSWORD_LENGTH } from '$lib/modules/auth/constants';
  import { content } from '$lib/modules/content/content.svelte';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import { MONO_LABEL } from '$lib/modules/ui/constants';

  // Claude sends the browser here mid-connection; after sign-in the authorize step picks it up.
  const resume = oauthResumeUrl(window.location.search);

  let email = $state('');
  let password = $state('');
  let mode = $state<'signin' | 'signup'>('signin');
  let canRegister = $state(false);
  let busy = $state(false);
  let error = $state('');

  onMount(async () => {
    if (auth.user && !resume) {
      await goto('/', { replaceState: true });
      return;
    }
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
      if (resume) {
        window.location.href = resume;
        return;
      }
      // Whatever an earlier account left on this device is replaced by this one's cards.
      await content.clear();
      await progress.sync();
      await goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong';
    } finally {
      busy = false;
    }
  }
</script>

<div
  class="flex min-h-[calc(100svh-var(--safe-top))] flex-col px-5 pb-[max(1.75rem,var(--safe-bottom))]"
>
  <div class="pt-[min(84px,10svh)]">
    <div aria-hidden="true" class="relative h-24 w-[196px]">
      <span
        class="absolute top-4 left-[18px] block h-[72px] w-[168px] rotate-[5deg] rounded-[5px] border border-strong bg-paper"
      >
        <span class="mt-4 block h-0.5 bg-native"></span>
      </span>
      <span
        class="absolute top-1.5 left-0.5 block h-[72px] w-[168px] -rotate-[3deg] rounded-[5px] border border-strong bg-paper shadow-lift"
      >
        <span class="mt-4 block h-0.5 bg-target"></span>
        <span class="block text-center text-[26px] leading-[50px] font-bold tracking-[-0.02em]">
          Rusky
        </span>
      </span>
    </div>

    <h1 class="mt-7 text-3xl leading-tight font-bold tracking-[-0.02em]">
      {mode === 'signup' ? 'Create your account' : 'Sign in'}
    </h1>
    <p class="mt-1.5 text-[15px] leading-snug text-muted">
      Your words, grammar and boxes are kept in your account.
    </p>
  </div>

  {#if resume}
    <div
      class="mt-[18px] flex flex-col gap-0.5 rounded-[14px] border border-line bg-card px-3.5 py-3"
    >
      <span class={[MONO_LABEL, 'text-native']}>CLAUDE</span>
      <span class="text-[15px] leading-snug">
        Claude is waiting. Sign in to finish connecting it to your cards.
      </span>
    </div>
  {/if}

  <form onsubmit={submit} class="mt-6 flex flex-col gap-3.5">
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
        minlength={MIN_PASSWORD_LENGTH}
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

  <p class="mt-auto pt-8 text-center text-[13px] leading-snug text-muted">
    Once you are signed in, Rusky opens without a connection too.
  </p>
</div>
