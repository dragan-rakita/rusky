<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import { THEME_COLORS } from '$lib/modules/settings/constants';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import TabBar from '$lib/modules/ui/components/tab-bar.svelte';
  import { TAB_ROUTES } from '$lib/modules/ui/constants';

  let { children } = $props();

  settings.init();
  auth.init();

  $effect(() => {
    const theme = settings.resolvedTheme;
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  });

  const showTabs = $derived(TAB_ROUTES.includes(page.route.id ?? ''));

  onMount(() => {
    void progress
      .load()
      .then(() => auth.refresh())
      .then(() => progress.sync());

    const resync = () => {
      if (document.visibilityState === 'visible') void progress.sync();
    };
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', resync);

    if (!dev) {
      void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
    }

    return () => {
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', resync);
    };
  });
</script>

<div
  class={[
    'mx-auto flex min-h-svh w-full max-w-[480px] flex-col pt-(--safe-top)',
    showTabs && 'pb-28',
  ]}
>
  {@render children()}
</div>

{#if showTabs}
  <TabBar />
{/if}
