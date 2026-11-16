<script lang="ts">
  import { page } from '$app/state';
  import { content } from '$lib/modules/content/content.svelte';
  import TopicNote from '$lib/modules/grammar/components/topic-note.svelte';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';

  const topic = $derived(content.topic(page.params.slug ?? ''));
</script>

<BackLink href="/grammar" label="Grammar" class="lg:hidden" />

{#if topic}
  <TopicNote {topic} />
{:else}
  <p class="mx-5 mt-6 text-[15px] text-muted lg:mt-0">There is no such grammar topic.</p>
{/if}
