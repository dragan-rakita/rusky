<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { NAV_TABS, PROFILE_TAB } from '../constants';

  const path = $derived(page.url.pathname);
  const onProfile = $derived(PROFILE_TAB.match(path));
</script>

{#snippet tab(href: string, label: string, active: boolean, icon: Snippet)}
  <a
    {href}
    aria-current={active ? 'page' : undefined}
    class={[
      'group flex h-[52px] flex-col items-center justify-center gap-1 text-[11px] leading-none',
      active ? 'font-semibold text-ink' : 'font-medium text-muted',
    ]}
  >
    <span
      class={[
        'flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-150 group-active:scale-90',
        active && 'bg-edge',
      ]}
    >
      {@render icon()}
    </span>
    {label}
  </a>
{/snippet}

<nav
  aria-label="Main"
  class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-nav/90 pb-[max(0.375rem,var(--safe-bottom))] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
>
  <div class="mx-auto grid max-w-[480px] grid-cols-4 pt-1.5">
    {#each NAV_TABS as t (t.href)}
      {@const active = t.match(path)}
      {#snippet icon()}
        <t.icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
      {/snippet}
      {@render tab(t.href, t.label, active, icon)}
    {/each}
    {#snippet avatar()}
      <span
        aria-hidden="true"
        class={[
          'flex size-6 items-center justify-center rounded-full bg-btn text-[11px] font-bold text-btn-fg',
          onProfile && 'ring-2 ring-ink ring-offset-[1.5px] ring-offset-edge',
        ]}
      >
        {auth.initial}
      </span>
    {/snippet}
    {@render tab(PROFILE_TAB.href, PROFILE_TAB.label, onProfile, avatar)}
  </div>
</nav>
