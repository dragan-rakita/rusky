<script lang="ts">
  import { Check, X } from '@lucide/svelte';
  import { content } from '$lib/modules/content/content.svelte';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import { NEW_PER_DAY_OPTIONS, THEME_MODES } from '$lib/modules/settings/constants';
  import { PLANNED_LANGUAGES } from '../constants';
  import MiniCard from './mini-card.svelte';
  import Segmented from './segmented.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  const planned = $derived(
    PLANNED_LANGUAGES.filter((p) => !content.languages.some((l) => l.code === p.code)),
  );
</script>

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  onclick={(e) => {
    if (e.target === dialog) open = false;
  }}
  aria-labelledby="settings-title"
  class="mx-auto mt-auto mb-0 max-h-[92svh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-card px-5 pt-2.5 pb-[max(1.75rem,var(--safe-bottom))] text-ink backdrop:bg-black/50"
>
  <div aria-hidden="true" class="mx-auto h-[5px] w-10 rounded-full bg-strong"></div>

  <div class="mt-2.5 flex items-center justify-between">
    <h2 id="settings-title" class="text-[22px] font-bold tracking-[-0.01em]">Languages</h2>
    <button
      type="button"
      onclick={() => (open = false)}
      aria-label="Close"
      class="-mr-2.5 flex size-11 items-center justify-center"
    >
      <X size={22} strokeWidth={2.2} aria-hidden="true" />
    </button>
  </div>
  <p class="mt-0.5 text-sm leading-snug text-muted">
    Each language keeps its own cards, grammar and boxes.
  </p>

  <div class="mt-4 flex flex-col gap-2.5">
    {#each content.languages as lang (lang.code)}
      {@const active = lang.code === content.language.code}
      <button
        type="button"
        aria-pressed={active}
        onclick={() => settings.update({ language: lang.code, level: lang.levels[0] })}
        class={[
          'flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left',
          active ? 'border-2 border-ink' : 'border border-edge',
        ]}
      >
        <MiniCard width={52} side="target" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span lang={lang.code} class="text-[17px] font-semibold">{lang.name}</span>
          <span class="text-[13px] text-muted">
            {lang.english} · {lang.levels.map((l) => l.toUpperCase()).join(', ')}
            {#if active}· {content.level.words.length} words · {content.level.topics.length} topics{/if}
          </span>
        </span>
        {#if active}<Check size={22} strokeWidth={2.4} aria-hidden="true" />{/if}
      </button>
    {/each}
    {#each planned as lang (lang.code)}
      <div class="flex items-center gap-3.5 rounded-2xl border border-edge px-3.5 py-3">
        <MiniCard width={52} side="none" class="border-dashed" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span lang={lang.code} class="text-[17px] font-semibold">{lang.name}</span>
          <span class="text-[13px] text-muted">{lang.english} · not started</span>
        </span>
        <span class="text-[13px] font-medium text-muted">Later</span>
      </div>
    {/each}
  </div>

  <div class="mt-4 flex min-h-13 items-center justify-between gap-3 border-y border-row">
    <span class="text-[15px]">The other side of the card</span>
    <span class="text-[15px] text-muted">{content.language.nativeName}</span>
  </div>

  {#if content.levelCodes.length > 1}
    <div class="mt-4">
      <h3 class="mb-2 text-[15px]">Level</h3>
      <Segmented
        label="Level"
        options={content.levelCodes.map((l) => ({ value: l, label: l.toUpperCase() }))}
        value={content.level.level}
        onchange={(v) => settings.update({ level: v })}
      />
    </div>
  {/if}

  <div class="mt-4">
    <h3 class="mb-2 text-[15px]">New words per day</h3>
    <Segmented
      label="New words per day"
      options={NEW_PER_DAY_OPTIONS}
      value={settings.values.newPerDay}
      onchange={(v) => settings.update({ newPerDay: v })}
    />
  </div>

  <div class="mt-4">
    <h3 class="mb-2 text-[15px]">Appearance</h3>
    <Segmented
      label="Appearance"
      options={THEME_MODES}
      value={settings.theme}
      onchange={(v) => settings.setTheme(v)}
    />
  </div>
</dialog>
