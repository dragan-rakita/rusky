<script lang="ts">
  import { MAX_BOX } from '@rusky/core';

  let { box }: { box: number } = $props();
</script>

<span
  role="img"
  aria-label={box ? `Box ${box} of ${MAX_BOX}` : 'Not started'}
  class="flex shrink-0 items-end gap-0.5"
>
  {#each Array.from({ length: MAX_BOX }, (_, i) => i + 1) as b (b)}
    <span class={['block h-3 w-1 rounded-[1px]', b <= box ? 'bg-ink' : 'bg-edge']}></span>
  {/each}
</span>
