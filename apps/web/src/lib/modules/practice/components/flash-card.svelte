<script lang="ts">
  import { visibleLength } from '@rusky/core';
  import Stressed from '$lib/modules/ui/components/stressed.svelte';
  import { CARD_TEXT_STEPS } from '../constants';

  let {
    front,
    back,
    meta = '',
    flipped,
    instant = false,
    onflip,
  }: {
    front: CardFace;
    back: CardFace;
    meta?: string;
    flipped: boolean;
    instant?: boolean;
    onflip: () => void;
  } = $props();

  const textSize = (text: string) => {
    const n = visibleLength(text);
    return (CARD_TEXT_STEPS.find((s) => n <= s.max) ?? CARD_TEXT_STEPS[CARD_TEXT_STEPS.length - 1])
      .cqw;
  };
</script>

<div
  class="@container relative mx-auto aspect-[7/3] w-full max-w-[440px] perspective-[1200px] lg:max-w-[560px]"
>
  <div
    aria-hidden="true"
    class="absolute inset-0 translate-y-4 scale-95 rotate-[1.8deg] rounded-md border border-edge bg-paper"
  ></div>
  <div
    aria-hidden="true"
    class="absolute inset-0 translate-y-2 scale-[0.975] -rotate-[1.4deg] rounded-md border border-edge bg-paper"
  ></div>
  <button
    type="button"
    onclick={onflip}
    aria-label={flipped ? 'Flip back to the question' : 'Flip the card to see the answer'}
    class="absolute inset-0 block size-full cursor-pointer transform-3d"
    style:transform="rotateY({flipped ? 180 : 0}deg)"
    style:transition={instant ? 'none' : 'transform 480ms cubic-bezier(0.2, 0.7, 0.2, 1)'}
  >
    {#each [front, back] as face, i (i)}
      <span
        class="absolute inset-0 block overflow-hidden rounded-md border border-paper-edge bg-paper text-ink shadow-lift backface-hidden"
        style:transform={i === 1 ? 'rotateY(180deg)' : 'none'}
      >
        <span
          class={[
            'absolute inset-x-0 top-[21.5%] h-0.5',
            face.side === 'target' ? 'bg-target' : 'bg-native',
          ]}
        ></span>
        <span
          class="absolute inset-x-3.5 top-[6%] flex justify-between font-mono text-[11px] leading-4 font-semibold tracking-[0.06em]"
        >
          <span class={face.side === 'target' ? 'text-target' : 'text-native'}>{face.label}</span>
          <span class="text-muted">{meta}</span>
        </span>
        <span
          lang={face.lang}
          class="absolute inset-x-[5%] top-[23%] bottom-0 flex items-center justify-center text-center leading-[1.15] font-semibold tracking-[-0.01em]"
          style:font-size="{textSize(face.text)}cqw"
        >
          <span><Stressed text={face.text} stress={face.side === 'target'} /></span>
        </span>
      </span>
    {/each}
  </button>
</div>
