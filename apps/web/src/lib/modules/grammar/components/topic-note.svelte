<script lang="ts">
  import type { GrammarTopic } from '@rusky/core';
  import { content } from '$lib/modules/content/content.svelte';
  import { sessionUrl } from '$lib/modules/practice/session';
  import { MONO_LABEL } from '$lib/modules/ui/constants';

  let { topic, heading = 'h1' }: { topic: GrammarTopic; heading?: 'h1' | 'h2' } = $props();

  const drillUrl = $derived(
    sessionUrl({ mode: 'custom', deck: 'grammar', topics: [topic.number], size: 'all' }),
  );
</script>

<div class="px-5 pt-0.5 lg:flex lg:items-end lg:justify-between lg:gap-6 lg:pt-0">
  <div class="min-w-0">
    <div class={[MONO_LABEL, 'text-muted']}>
      {String(topic.number).padStart(2, '0')} · {content.level.level.toUpperCase()} GRAMMAR
    </div>
    <svelte:element this={heading} class="mt-1 text-3xl leading-tight font-bold tracking-[-0.02em]">
      {topic.title}
    </svelte:element>
  </div>
  {#if topic.cardCount > 0}
    <a
      href={drillUrl}
      class="hidden h-11 shrink-0 items-center rounded-xl bg-btn px-4 text-[15px] font-semibold text-btn-fg lg:flex"
    >
      Drill {topic.cardCount}
      {topic.cardCount === 1 ? 'card' : 'cards'}
    </a>
  {/if}
</div>

<!-- Built from the repo's own grammar notes at build time, never from user input. -->
<article lang={content.language.code} class="grammar mx-5 mt-3 lg:mt-4 lg:max-w-[720px]">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html topic.html}
</article>

{#if topic.cardCount > 0}
  <div class="h-20 lg:hidden"></div>
  <div
    class="fixed inset-x-0 bottom-[calc(5rem+max(0.75rem,var(--safe-bottom)))] z-10 mx-auto max-w-[480px] px-5 pb-3 lg:hidden"
  >
    <a
      href={drillUrl}
      class="flex h-14 items-center justify-center rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg shadow-lift"
    >
      Drill {topic.title.toLowerCase()} · {topic.cardCount} cards
    </a>
  </div>
{/if}
