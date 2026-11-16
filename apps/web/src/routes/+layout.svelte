<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { PUBLIC_ROUTES } from '$lib/modules/auth/constants';
  import { auth } from '$lib/modules/auth/auth.svelte';
  import { content } from '$lib/modules/content/content.svelte';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import { THEME_COLORS } from '$lib/modules/settings/constants';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import Sidebar from '$lib/modules/ui/components/sidebar.svelte';
  import TabBar from '$lib/modules/ui/components/tab-bar.svelte';
  import { FOCUS_ROUTES, SIDEBAR_ROUTES, TAB_ROUTES } from '$lib/modules/ui/constants';

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

  const isPublic = $derived(PUBLIC_ROUTES.includes(page.route.id ?? ''));
  // The remembered user is trusted until the server says otherwise, so the app opens offline.
  const signedIn = $derived(!!auth.user);
  const hasCards = $derived(!!content.remote);
  const showTabs = $derived(signedIn && hasCards && TAB_ROUTES.includes(page.route.id ?? ''));
  const showSidebar = $derived(
    signedIn && hasCards && SIDEBAR_ROUTES.includes(page.route.id ?? ''),
  );
  const wideFocus = $derived(signedIn && hasCards && FOCUS_ROUTES.includes(page.route.id ?? ''));

  let online = $state(navigator.onLine);

  $effect(() => {
    if (!signedIn && !isPublic) void goto('/login', { replaceState: true });
  });

  onMount(() => {
    void content
      .loadCached()
      .then(() => progress.load())
      .then(() => auth.refresh())
      .then(() => progress.sync());

    const resync = () => {
      online = navigator.onLine;
      if (document.visibilityState === 'visible') void progress.sync();
    };
    const offline = () => (online = false);
    window.addEventListener('online', resync);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', resync);

    if (!dev) {
      void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
    }

    return () => {
      window.removeEventListener('online', resync);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', resync);
    };
  });
</script>

<div class={[showSidebar && 'lg:mx-auto lg:flex lg:max-w-[1280px]']}>
  {#if showSidebar}
    <Sidebar />
  {/if}
  <div
    class={[
      'mx-auto flex min-h-svh w-full max-w-[480px] flex-col pt-(--safe-top)',
      showTabs && 'pb-28',
      showSidebar && 'lg:mx-0 lg:max-w-none lg:min-w-0 lg:flex-1 lg:px-6 lg:pt-6 lg:pb-12',
      wideFocus && 'lg:max-w-[600px]',
    ]}
  >
    {#if isPublic}
      {@render children()}
    {:else if signedIn && hasCards}
      {@render children()}
    {:else if signedIn && content.ready}
      <div class="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 class="text-2xl font-bold tracking-[-0.02em]">Getting your cards</h1>
        <p class="mt-2 text-[15px] leading-snug text-muted" aria-live="polite">
          {#if progress.syncing}
            One moment…
          {:else if !online}
            Connect to the internet once, so your cards can be downloaded.
          {:else}
            {progress.syncError ?? 'Your cards have not been downloaded yet.'}
          {/if}
        </p>
        <button
          type="button"
          onclick={() => progress.sync()}
          disabled={progress.syncing}
          class="mt-6 h-[52px] rounded-[14px] bg-btn px-6 text-base font-semibold text-btn-fg disabled:opacity-60"
        >
          Try again
        </button>
      </div>
    {/if}
  </div>
</div>

{#if showTabs}
  <TabBar />
{/if}
