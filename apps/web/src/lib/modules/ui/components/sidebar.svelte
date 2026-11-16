<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import { page } from '$app/state';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { content } from '$lib/modules/content/content.svelte';
  import { MONO_LABEL, SIDEBAR_LINKS } from '../constants';
  import SettingsSheet from './settings-sheet.svelte';

  let sheetOpen = $state(false);

  const path = $derived(page.url.pathname);
  const onProfile = $derived(path.startsWith('/profile'));
</script>

<aside
  class="hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-60 lg:shrink-0 lg:flex-col lg:self-start lg:px-3 lg:pt-6 lg:pb-5"
>
  <button
    type="button"
    onclick={() => (sheetOpen = true)}
    class="flex min-h-11 items-center gap-2.5 self-start rounded-xl px-3 text-ink hover:bg-card"
  >
    <span lang={content.language.code} class="text-xl font-bold tracking-[-0.01em]">
      {content.language.name}
    </span>
    <span class={[MONO_LABEL, 'rounded-md border-[1.5px] border-ink px-[7px] py-[3px]']}>
      {content.level.level.toUpperCase()}
    </span>
    <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" />
  </button>

  <nav aria-label="Main" class="mt-6 flex flex-col gap-1">
    {#each SIDEBAR_LINKS as link (link.href)}
      {@const active = link.match(path)}
      <a
        href={link.href}
        aria-current={active ? 'page' : undefined}
        class={[
          'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px]',
          active
            ? 'bg-card font-bold text-ink'
            : 'font-medium text-muted hover:bg-card/60 hover:text-ink',
        ]}
      >
        <link.icon size={20} strokeWidth={2} aria-hidden="true" />
        {link.label}
      </a>
    {/each}
  </nav>

  <a
    href="/profile"
    aria-current={onProfile ? 'page' : undefined}
    class={[
      'mt-auto flex h-11 items-center gap-3 rounded-xl px-2 text-[15px]',
      onProfile ? 'bg-card font-bold text-ink' : 'font-medium text-ink hover:bg-card/60',
    ]}
  >
    <span
      aria-hidden="true"
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-btn text-sm font-bold text-btn-fg"
    >
      {auth.initial}
    </span>
    <span class="min-w-0 truncate">{auth.user?.name || auth.user?.email}</span>
  </a>
</aside>

<SettingsSheet bind:open={sheetOpen} />
