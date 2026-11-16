<script lang="ts">
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { MIN_PASSWORD_LENGTH } from '$lib/modules/auth/constants';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';
  import Switch from '$lib/modules/ui/components/switch.svelte';

  let current = $state('');
  let next = $state('');
  let signOutOthers = $state(true);
  let busy = $state(false);
  let changed = $state(false);
  let error = $state('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      await auth.changePassword(current, next, signOutOthers);
      changed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not change the password';
    }
    busy = false;
  }
</script>

<div class="contents lg:mx-auto lg:block lg:w-full lg:max-w-[560px]">
  <BackLink href="/profile" label="Profile" />

  <div class="px-5 pt-1">
    <h1 class="text-3xl leading-tight font-bold tracking-[-0.02em]">
      {changed ? 'Password changed' : 'Change password'}
    </h1>
    <p class="mt-1.5 text-[15px] leading-snug text-muted">
      {#if changed}
        Use the new one the next time you sign in.
      {:else}
        You stay signed in on this device.
      {/if}
    </p>
  </div>

  {#if changed}
    <a
      href="/profile"
      class="mx-5 mt-6 flex h-14 items-center justify-center rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg"
    >
      Back to profile
    </a>
  {:else}
    <form onsubmit={submit} class="mx-5 mt-6 flex flex-col gap-3.5 pb-32 lg:pb-0">
      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-semibold text-muted">Current password</span>
        <input
          type="password"
          bind:value={current}
          required
          autocomplete="current-password"
          class="h-12 rounded-xl border border-edge bg-card px-3.5 text-base text-ink outline-none focus:border-ink"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-semibold text-muted">New password</span>
        <input
          type="password"
          bind:value={next}
          required
          minlength={MIN_PASSWORD_LENGTH}
          autocomplete="new-password"
          class="h-12 rounded-xl border border-edge bg-card px-3.5 text-base text-ink outline-none focus:border-ink"
        />
        <span class="text-[13px] text-muted">At least {MIN_PASSWORD_LENGTH} characters</span>
      </label>

      <div class="mt-1.5">
        <Switch
          label="Sign out my other devices"
          checked={signOutOthers}
          onchange={(v) => (signOutOthers = v)}
        />
        <p class="mt-2 text-[13px] leading-snug text-muted">Claude stays connected either way.</p>
      </div>

      {#if error}
        <p role="alert" class="text-[15px] text-target">{error}</p>
      {/if}

      <div
        class="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] bg-bg px-5 pt-3 pb-[max(1.75rem,var(--safe-bottom))] lg:sticky lg:mx-0 lg:mt-2 lg:max-w-none lg:px-0"
      >
        <button
          type="submit"
          disabled={busy}
          class="h-14 w-full rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg disabled:opacity-60"
        >
          {busy ? 'One moment…' : 'Change password'}
        </button>
      </div>
    </form>
  {/if}
</div>
