<script lang="ts">
  import { onMount } from 'svelte';
  import { Check } from '@lucide/svelte';
  import {
    OAUTH_CONSENT_PATH,
    OAUTH_PUBLIC_CLIENT_PATH,
    OAUTH_SCOPE_LABELS,
    redirectHost,
    signedOAuthQuery,
  } from '@rusky/core';
  import MiniCard from '$lib/modules/ui/components/mini-card.svelte';

  const search = window.location.search;
  const params = new URLSearchParams(search);
  const clientId = params.get('client_id');
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);
  const host = redirectHost(search);
  const oauthQuery = signedOAuthQuery(search);

  let clientName = $state<string | null>(null);
  let pending = $state<'allow' | 'deny' | null>(null);
  let error = $state('');

  onMount(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(
        `${OAUTH_PUBLIC_CLIENT_PATH}?client_id=${encodeURIComponent(clientId)}`,
      );
      if (res.ok) clientName = (await res.json()).client_name ?? null;
    } catch {
      // The host the code goes to is still named below.
    }
  });

  async function respond(accept: boolean) {
    pending = accept ? 'allow' : 'deny';
    error = '';
    try {
      const res = await fetch(OAUTH_CONSENT_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accept, oauth_query: oauthQuery }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.url) {
        window.location.href = body.url;
        return;
      }
      error =
        res.status === 401
          ? 'Your session has ended. Sign in again, then connect from Claude once more.'
          : 'This request has expired. Start connecting again from Claude.';
    } catch {
      error = 'Could not reach Rusky. Check your connection and try again.';
    }
    pending = null;
  }
</script>

<div class="flex min-h-[calc(100svh-var(--safe-top))] flex-col justify-center px-5 py-10">
  <div class="rounded-[18px] border border-line bg-card p-6 shadow-soft">
    <div aria-hidden="true" class="relative mb-5 h-[54px] w-[96px]">
      <MiniCard class="absolute top-0 left-3 rotate-[5deg]" side="native" />
      <MiniCard class="absolute top-3 left-0 -rotate-[4deg] shadow-lift" text="дом" />
    </div>

    {#if oauthQuery}
      <h1 class="text-[26px] leading-tight font-bold tracking-[-0.02em]">
        Allow {clientName ?? 'this app'} to use Rusky?
      </h1>
      {#if host}
        <p class="mt-1.5 text-sm text-muted">
          Approving sends you back to <span class="font-semibold text-ink">{host}</span>
        </p>
      {/if}

      <p class="mt-5 mb-2.5 text-[13px] font-semibold text-muted">It will be able to:</p>
      <ul class="flex flex-col gap-2.5">
        {#each scopes as scope (scope)}
          <li class="flex items-start gap-2.5 text-[15px] leading-snug">
            <Check
              class="mt-0.5 shrink-0 text-native"
              size={18}
              strokeWidth={2.4}
              aria-hidden="true"
            />
            <span>{OAUTH_SCOPE_LABELS[scope] ?? scope}</span>
          </li>
        {/each}
      </ul>

      {#if error}
        <p role="alert" class="mt-5 text-[15px] text-target">{error}</p>
      {/if}

      <div class="mt-6 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={pending !== null}
          onclick={() => respond(false)}
          class="h-[52px] rounded-[14px] border-[1.5px] border-strong bg-card text-base font-semibold disabled:opacity-50"
        >
          {pending === 'deny' ? 'Denying…' : 'Deny'}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onclick={() => respond(true)}
          class="h-[52px] rounded-[14px] bg-btn text-base font-semibold text-btn-fg disabled:opacity-50"
        >
          {pending === 'allow' ? 'Allowing…' : 'Allow'}
        </button>
      </div>
    {:else}
      <h1 class="text-[26px] leading-tight font-bold tracking-[-0.02em]">Nothing to approve</h1>
      <p class="mt-1.5 text-[15px] text-muted">
        This page opens when Claude asks to connect to Rusky.
      </p>
      <a
        href="/"
        class="mt-6 flex h-[52px] items-center justify-center rounded-[14px] bg-btn text-base font-semibold text-btn-fg"
      >
        Back to Today
      </a>
    {/if}
  </div>
</div>
