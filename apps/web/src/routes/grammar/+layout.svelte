<script lang="ts">
  import { page } from '$app/state';
  import TopicList from '$lib/modules/grammar/components/topic-list.svelte';

  let { children } = $props();

  const isIndex = $derived(page.route.id === '/grammar');
</script>

<div class="contents lg:flex lg:items-start lg:gap-5">
  <div
    class={[
      isIndex ? 'contents' : 'hidden',
      'lg:sticky lg:top-6 lg:ml-5 lg:block lg:max-h-[calc(100svh-4.5rem)] lg:w-[300px] lg:shrink-0 lg:[scrollbar-width:thin] lg:overflow-y-auto lg:overscroll-contain xl:w-[340px]',
    ]}
  >
    <TopicList heading={isIndex ? 'h1' : 'h2'} />
  </div>
  <div class="contents lg:block lg:min-w-0 lg:flex-1">
    {@render children()}
  </div>
</div>
