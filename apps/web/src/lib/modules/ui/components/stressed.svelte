<script lang="ts">
  import { stressSegments } from '@rusky/core';

  let { text, stress = true }: { text: string; stress?: boolean } = $props();

  const segments = $derived(stress ? stressSegments(text) : [{ text, stressed: false }]);
</script>

{#each segments as s, i (i)}{#if s.stressed}<span class="text-target">{s.text}</span
    >{:else}{s.text}{/if}{/each}
