<script lang="ts">
  import { ChevronLeft } from '@lucide/svelte';

  let { href, label }: { href: string; label: string } = $props();
</script>

<div class="flex h-13 items-center pt-2 pl-2">
  <a {href} class="flex min-h-11 items-center gap-0.5 px-2 text-base font-medium text-ink">
    <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
    {label}
  </a>
</div>
