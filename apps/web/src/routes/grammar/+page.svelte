<script lang="ts">
  import { content } from '$lib/modules/content/content.svelte';
  import TopicNote from '$lib/modules/grammar/components/topic-note.svelte';

  const first = $derived(content.level.topics[0]);
</script>

{#if first}
  <div class="hidden lg:block">
    <TopicNote topic={first} heading="h2" />
  </div>
{/if}
