<script lang="ts">
  import Stressed from '$lib/modules/ui/components/stressed.svelte';
  import { cardTextSize } from '../faces';

  let {
    front,
    back,
    flipped,
    instant = false,
    onflip,
  }: {
    front: CardFace;
    back: CardFace;
    flipped: boolean;
    instant?: boolean;
    onflip: () => void;
  } = $props();
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
        {#if face.label}
          <span
            class={[
              'absolute inset-x-0 top-[21.5%] h-0.5',
              face.side === 'target' ? 'bg-target' : 'bg-native',
            ]}
          ></span>
          <span
            class={[
              'absolute inset-x-3.5 top-[6%] font-mono text-[11px] leading-4 font-semibold tracking-[0.06em]',
              face.side === 'target' ? 'text-target' : 'text-native',
            ]}
          >
            {face.label}
          </span>
        {/if}
        <span
          lang={face.lang}
          class={[
            'absolute inset-x-[5%] bottom-0 flex items-center justify-center text-center leading-[1.15] font-semibold tracking-[-0.01em]',
            face.label ? 'top-[23%]' : 'top-0',
          ]}
          style:font-size="{cardTextSize(face.text)}cqw"
        >
          <span><Stressed text={face.text} stress={face.side === 'target'} /></span>
        </span>
      </span>
    {/each}
  </button>
</div>
