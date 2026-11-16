<script lang="ts">
  import type { Side } from '@rusky/core';
  import Stressed from './stressed.svelte';

  let {
    text = '',
    side = 'target',
    width = 76,
    class: className = '',
  }: { text?: string; side?: Side | 'none'; width?: number; class?: string } = $props();
</script>

<span
  aria-hidden="true"
  class={['flex aspect-[7/3] flex-col rounded-[3px] border border-strong bg-paper', className]}
  style:width="{width}px"
>
  <span
    class={[
      'mt-[11%] block h-[1.5px]',
      side === 'target' ? 'bg-target' : side === 'native' ? 'bg-native' : 'bg-strong',
    ]}
  ></span>
  {#if text}
    <span class="flex-1 text-center text-[13px] leading-[20px] font-semibold"
      ><Stressed {text} stress={side === 'target'} /></span
    >
  {/if}
</span>
