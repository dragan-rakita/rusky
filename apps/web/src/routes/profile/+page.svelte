<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';
  import { MCP_PATH, type Connection, type ConnectionsResponse } from '@rusky/core';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { content } from '$lib/modules/content/content.svelte';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import { MONO_LABEL, PROFILE_ACTION } from '$lib/modules/ui/constants';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';

  const connectorUrl = `${window.location.origin}${MCP_PATH}`;

  let name = $state(auth.user?.name ?? '');
  let nameNote = $state('');
  let devices = $state<number | null>(null);
  let connections = $state<Connection[] | null>(null);
  let busy = $state<'devices' | 'disconnect' | 'signout' | null>(null);
  let error = $state('');
  let copied = $state(false);

  async function loadDevices() {
    devices = await auth.deviceCount();
  }

  async function loadConnections() {
    try {
      const res = await fetch('/api/connections', { credentials: 'include' });
      connections = res.ok ? ((await res.json()) as ConnectionsResponse).connections : null;
    } catch {
      connections = null;
    }
  }

  onMount(() => {
    void loadDevices();
    void loadConnections();
  });

  async function saveName() {
    const next = name.trim();
    if (!next) {
      name = auth.user?.name ?? '';
      return;
    }
    if (next === auth.user?.name) return;
    nameNote = 'Saving…';
    try {
      await auth.updateName(next);
      name = next;
      nameNote = 'Saved';
    } catch (e) {
      nameNote = e instanceof Error ? e.message : 'Could not save the name';
    }
  }

  const syncedLabel = $derived.by(() => {
    if (progress.syncing) return 'Syncing…';
    if (progress.syncError) return progress.syncError;
    if (!progress.lastSyncAt) return 'Not synced yet';
    const minutes = Math.round((Date.now() - progress.lastSyncAt) / 60_000);
    const when = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : 'earlier today';
    return progress.pending
      ? `${progress.pending} reviews waiting · synced ${when}`
      : `Synced ${when}`;
  });

  const devicesLabel = $derived(
    devices === null
      ? 'Needs a connection'
      : devices <= 1
        ? 'Only this device'
        : `This device and ${devices - 1} other${devices === 2 ? '' : 's'}`,
  );

  const day = (at: number | null) => {
    if (!at) return '';
    const d = new Date(at);
    return ` since ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  };

  async function signOutOthers() {
    busy = 'devices';
    error = '';
    try {
      await auth.signOutOthers();
      await loadDevices();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not sign the other devices out';
    }
    busy = null;
  }

  async function disconnect(c: Connection) {
    if (!confirm(`Disconnect ${c.name}? It can no longer read or change your cards.`)) return;
    busy = 'disconnect';
    error = '';
    try {
      const res = await fetch(`/api/connections/${encodeURIComponent(c.clientId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Could not disconnect (${res.status})`);
      await loadConnections();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not disconnect';
    }
    busy = null;
  }

  async function copyConnectorUrl() {
    try {
      await navigator.clipboard.writeText(connectorUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // No clipboard over plain http; the address is on screen to copy by hand.
    }
  }

  async function signOut() {
    busy = 'signout';
    // Reviews not uploaded yet stay on this device and go up at the next sign-in.
    await progress.sync();
    await progress.resetSync();
    await content.clear();
    await auth.signOut();
  }
</script>

<div class="contents lg:mx-auto lg:block lg:w-full lg:max-w-[560px]">
  <BackLink href="/" label="Today" />

  <h1 class="px-5 pt-1 text-3xl leading-tight font-bold tracking-[-0.02em]">Profile</h1>

  <div class="mx-5 mt-3.5 flex items-center gap-3.5">
    <span
      aria-hidden="true"
      class="flex size-14 shrink-0 items-center justify-center rounded-full bg-btn text-[22px] font-bold text-btn-fg"
    >
      {auth.initial}
    </span>
    <div class="flex min-w-0 flex-col gap-px">
      <span class="truncate text-xl font-bold tracking-[-0.01em]">{auth.user?.name}</span>
      <span class="truncate text-sm text-muted">{auth.user?.email}</span>
    </div>
  </div>

  <h2 class={[MONO_LABEL, 'mx-5 mt-5 mb-2 text-muted']}>ACCOUNT</h2>
  <div class="mx-5 overflow-hidden rounded-2xl border border-line bg-card">
    <div class="flex min-h-[52px] items-center justify-between gap-3 border-b border-row pr-2 pl-4">
      <label for="profile-name" class="flex flex-col text-[15px]">
        Name
        {#if nameNote}
          <span class="text-xs text-muted" aria-live="polite">{nameNote}</span>
        {/if}
      </label>
      <input
        id="profile-name"
        type="text"
        autocomplete="name"
        enterkeyhint="done"
        maxlength="80"
        bind:value={name}
        onblur={saveName}
        onkeydown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        class="h-9 w-[190px] rounded-[9px] border border-edge bg-bg px-2.5 text-right text-[15px] text-ink outline-none focus:border-ink"
      />
    </div>
    <div class="flex min-h-[52px] items-center justify-between gap-3 border-b border-row px-4">
      <span class="text-[15px]">Email</span>
      <span class="truncate text-[15px] text-muted">{auth.user?.email}</span>
    </div>
    <a
      href="/profile/password"
      class="flex min-h-[52px] items-center justify-between gap-3 pr-3 pl-4 text-ink"
    >
      <span class="text-[15px]">Password</span>
      <span class="flex items-center gap-1.5 text-[15px] text-muted">
        Change
        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </span>
    </a>
  </div>

  <h2 class={[MONO_LABEL, 'mx-5 mt-4 mb-2 text-muted']}>SYNC AND DEVICES</h2>
  <div class="mx-5 overflow-hidden rounded-2xl border border-line bg-card">
    <div class="flex min-h-[60px] items-center justify-between gap-3 border-b border-row pr-2 pl-4">
      <div class="flex min-w-0 flex-col py-2">
        <span class="text-[15px] font-semibold">Sync</span>
        <span class={['text-[13px]', progress.syncError ? 'text-target' : 'text-muted']}>
          {syncedLabel}
        </span>
      </div>
      <button
        type="button"
        onclick={() => progress.sync()}
        disabled={progress.syncing}
        class={PROFILE_ACTION}
      >
        Sync now
      </button>
    </div>
    <div class="flex min-h-[60px] items-center justify-between gap-3 pr-2 pl-4">
      <div class="flex min-w-0 flex-col py-2">
        <span class="text-[15px] font-semibold">Devices</span>
        <span class="text-[13px] text-muted">{devicesLabel}</span>
      </div>
      <button
        type="button"
        onclick={signOutOthers}
        disabled={busy !== null || devices === null || devices <= 1}
        class={PROFILE_ACTION}
      >
        Sign out others
      </button>
    </div>
  </div>

  <h2 class={[MONO_LABEL, 'mx-5 mt-4 mb-2 text-muted']}>CLAUDE</h2>
  <div class="mx-5 overflow-hidden rounded-2xl border border-line bg-card">
    {#each connections ?? [] as c (c.clientId)}
      <div
        class="flex min-h-[60px] items-center justify-between gap-3 border-b border-row pr-2 pl-4"
      >
        <div class="flex min-w-0 flex-col py-2">
          <span class="truncate text-[15px] font-semibold">{c.name}</span>
          <span class="text-[13px] text-muted">Connected{day(c.connectedAt)}</span>
        </div>
        <button
          type="button"
          onclick={() => disconnect(c)}
          disabled={busy !== null}
          class={PROFILE_ACTION}
        >
          Disconnect
        </button>
      </div>
    {:else}
      <p class="border-b border-row px-4 py-3 text-[15px] leading-snug">
        {#if connections === null}
          <span class="text-muted">Needs a connection to show what is connected.</span>
        {:else}
          Not connected. In Claude, add a custom connector with the address below, so Claude can add
          the words and grammar from your lessons.
        {/if}
      </p>
    {/each}
    <div class="flex min-h-[60px] items-center justify-between gap-2.5 pr-2 pl-4">
      <div class="flex min-w-0 flex-col py-2">
        <span class="text-[13px] text-muted">Connector address</span>
        <code class="truncate font-mono text-[13px] font-medium">{connectorUrl}</code>
      </div>
      <button type="button" onclick={copyConnectorUrl} class={PROFILE_ACTION}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  </div>

  {#if error}
    <p role="alert" class="mx-5 mt-3 text-[15px] text-target">{error}</p>
  {/if}

  <div class="mx-5 mt-5 flex flex-col gap-2 pb-[max(1.75rem,var(--safe-bottom))]">
    <button
      type="button"
      onclick={signOut}
      disabled={busy !== null}
      class="h-[52px] rounded-[14px] border-[1.5px] border-strong bg-card text-base font-semibold text-target disabled:opacity-60"
    >
      {busy === 'signout' ? 'Signing out…' : 'Sign out'}
    </button>
    <p class="text-center text-[13px] leading-snug text-muted">
      This device forgets your cards. They stay in your account.
    </p>
  </div>
</div>
