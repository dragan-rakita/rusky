<script lang="ts">
  import { Layers, List, Table2 } from '@lucide/svelte';
  import { page } from '$app/state';

  const tabs = [
    { href: '/', label: 'Today', icon: Layers, match: (p: string) => p === '/' },
    { href: '/words', label: 'Words', icon: List, match: (p: string) => p.startsWith('/words') },
    {
      href: '/grammar',
      label: 'Grammar',
      icon: Table2,
      match: (p: string) => p.startsWith('/grammar'),
    },
  ];
</script>

<nav
  aria-label="Main"
  class="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-line bg-nav pb-[max(0.75rem,var(--safe-bottom))]"
>
  <div class="grid grid-cols-3 pt-1.5">
    {#each tabs as tab (tab.href)}
      {@const active = tab.match(page.url.pathname)}
      <a
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        class={[
          'flex h-14 flex-col items-center justify-center gap-[3px] text-xs',
          active ? 'font-bold text-ink' : 'font-medium text-muted',
        ]}
      >
        <tab.icon size={24} strokeWidth={2} aria-hidden="true" />
        {tab.label}
      </a>
    {/each}
  </div>
</nav>
