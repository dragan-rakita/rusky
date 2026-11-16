<script lang="ts">
  import { parseGap, type GapResult, type GrammarCard } from '@rusky/core';
  import Stressed from '$lib/modules/ui/components/stressed.svelte';
  import { cardTextSize } from '../faces';

  let { card, lang, result }: { card: GrammarCard; lang: string; result: GapResult | null } =
    $props();

  const gap = $derived(parseGap(card.prompt));
  const shown = $derived(result ? (gap?.answers[0] ?? '') : card.hint);
  const size = $derived(
    cardTextSize(
      (gap?.before ?? '') + (shown.length > 3 ? shown : '·····') + (gap?.after ?? card.prompt),
    ),
  );
</script>

<div
  class="@container relative mx-auto aspect-[7/3] w-full max-w-[440px] lg:max-w-[560px]"
  aria-live="polite"
>
  <div
    aria-hidden="true"
    class="absolute inset-0 translate-y-4 scale-95 rotate-[1.8deg] rounded-md border border-edge bg-paper"
  ></div>
  <div
    aria-hidden="true"
    class="absolute inset-0 translate-y-2 scale-[0.975] -rotate-[1.4deg] rounded-md border border-edge bg-paper"
  ></div>
  <div
    class="absolute inset-0 overflow-hidden rounded-md border border-paper-edge bg-paper text-ink shadow-lift"
  >
    <span class="absolute inset-x-0 top-[21.5%] h-0.5 bg-target"></span>
    <span
      class="absolute inset-x-3.5 top-[6%] font-mono text-[11px] leading-4 font-semibold tracking-[0.06em] text-target"
    >
      {card.label}
    </span>
    <p
      {lang}
      class="absolute inset-x-[5%] top-[23%] bottom-0 flex items-center justify-center text-center leading-[1.3] font-semibold tracking-[-0.01em]"
      style:font-size="{size}cqw"
    >
      <span>
        {#if gap}
          <Stressed text={gap.before} />
          <span
            class={[
              'inline-block min-w-[2.5em] border-b-2 px-1 leading-[1.15]',
              result ? 'border-target' : 'border-dashed border-strong font-medium text-muted',
            ]}
          >
            {#if result}
              <Stressed text={shown} />
            {:else if shown}
              <span class="text-[0.8em]"><Stressed text={shown} stress={false} /></span>
            {:else}
              <span class="sr-only">gap</span>&nbsp;
            {/if}
          </span>
          <Stressed text={gap.after} />
        {:else}
          <Stressed text={card.prompt} />
        {/if}
      </span>
    </p>
  </div>
</div>
