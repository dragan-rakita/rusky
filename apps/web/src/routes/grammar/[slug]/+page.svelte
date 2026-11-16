<script lang="ts">
  import { page } from '$app/state';
  import { content } from '$lib/modules/content/content.svelte';
  import { sessionUrl } from '$lib/modules/practice/session';
  import { MONO_LABEL } from '$lib/modules/ui/constants';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';

  const topic = $derived(content.topic(page.params.slug ?? ''));
</script>

<BackLink href="/grammar" label="Grammar" />

{#if topic}
  <div class="px-5 pt-0.5">
    <div class={[MONO_LABEL, 'text-muted']}>
      {String(topic.number).padStart(2, '0')} · {content.level.level.toUpperCase()} GRAMMAR
    </div>
    <h1 class="mt-1 text-3xl leading-tight font-bold tracking-[-0.02em]">{topic.title}</h1>
  </div>

  <!-- Built from the repo's own grammar notes at build time, never from user input. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <article lang={content.language.code} class="grammar mx-5 mt-3">{@html topic.html}</article>

  {#if topic.cardCount > 0}
    <div class="h-20"></div>
    <div
      class="fixed inset-x-0 bottom-[calc(5rem+max(0.75rem,var(--safe-bottom)))] z-10 mx-auto max-w-[480px] px-5 pb-3"
    >
      <a
        href={sessionUrl({ mode: 'custom', deck: 'grammar', topics: [topic.number], size: 'all' })}
        class="flex h-14 items-center justify-center rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg shadow-lift"
      >
        Drill {topic.title.toLowerCase()} · {topic.cardCount} cards
      </a>
    </div>
  {/if}
{:else}
  <p class="mx-5 mt-6 text-[15px] text-muted">There is no such grammar topic.</p>
{/if}
