<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { page } from '$app/state';
  import { content } from '$lib/modules/content/content.svelte';
  import { sessionUrl, trapTopics } from '$lib/modules/practice/session';
  import MiniCard from '$lib/modules/ui/components/mini-card.svelte';
  import { DESKTOP_QUERY } from '$lib/modules/ui/constants';

  let { heading = 'h1' }: { heading?: 'h1' | 'h2' } = $props();

  const traps = $derived(trapTopics(content.level));
  const open = $derived(page.params.slug ?? content.level.topics[0]?.slug);

  const reveal = (slug: string) => (el: HTMLElement) => {
    if (slug !== open || !matchMedia(DESKTOP_QUERY).matches) return;
    // Row heights settle once the web font is in.
    void document.fonts.ready.then(() => el.scrollIntoView({ block: 'nearest' }));
  };
</script>

<div class="px-5 pt-5 lg:p-0">
  <svelte:element this={heading} class="text-3xl leading-tight font-bold tracking-[-0.02em]">
    Grammar
  </svelte:element>
  <p class="mt-0.5 text-[15px] text-muted">
    {content.level.level.toUpperCase()} · {content.level.topics.length} topics from your notes
  </p>
</div>

<a
  href={sessionUrl({ mode: 'custom', deck: 'grammar', size: 20 })}
  class="mx-5 mt-4 flex items-center gap-3.5 rounded-2xl bg-btn p-4 text-btn-fg lg:mx-0"
>
  <span aria-hidden="true" class="relative block h-11 w-[72px] shrink-0">
    <MiniCard width={62} side="none" class="absolute top-0.5 left-1.5 rotate-[5deg] opacity-60" />
    <MiniCard width={62} text="зна́ешь" class="absolute top-2.5 left-0 -rotate-[3deg] text-ink" />
  </span>
  <span class="flex min-w-0 flex-1 flex-col gap-0.5">
    <span class="text-[17px] font-semibold">Drill grammar as cards</span>
    <span class="text-[13px] leading-snug text-btn-sub">
      {content.level.grammarCards.length} cards: conjugations, cases, mistakes, false friends
    </span>
  </span>
  <ChevronRight size={20} strokeWidth={2.2} aria-hidden="true" />
</a>

<ul class="mx-5 mt-4 overflow-hidden rounded-2xl border border-line bg-card lg:mx-0">
  {#each content.level.topics as t, i (t.slug)}
    <li class={i > 0 ? 'border-t border-row' : ''}>
      <a
        href="/grammar/{t.slug}"
        aria-current={t.slug === page.params.slug ? 'page' : undefined}
        {@attach reveal(t.slug)}
        class={[
          'flex min-h-14 items-center gap-3 py-2.5 pr-3 pl-3.5',
          t.slug === open ? 'lg:bg-row' : 'lg:hover:bg-row/50',
        ]}
      >
        <span
          class={[
            'w-[22px] shrink-0 font-mono text-xs font-semibold',
            traps.includes(t.number) ? 'text-target' : 'text-muted',
          ]}
        >
          {String(t.number).padStart(2, '0')}
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-base font-semibold">{t.title}</span>
          <span class="truncate text-[13px] text-muted">{t.summary}</span>
        </span>
        <ChevronRight class="text-muted" size={18} strokeWidth={2.2} aria-hidden="true" />
      </a>
    </li>
  {/each}
</ul>
