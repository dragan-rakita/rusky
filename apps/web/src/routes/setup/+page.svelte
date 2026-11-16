<script lang="ts">
  import { goto } from '$app/navigation';
  import { content } from '$lib/modules/content/content.svelte';
  import { DECKS, SESSION_SIZES } from '$lib/modules/practice/constants';
  import { deckCards, sessionUrl } from '$lib/modules/practice/session';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import BackLink from '$lib/modules/ui/components/back-link.svelte';
  import MiniCard from '$lib/modules/ui/components/mini-card.svelte';
  import Segmented from '$lib/modules/ui/components/segmented.svelte';
  import Switch from '$lib/modules/ui/components/switch.svelte';

  const last = settings.values.lastSetup;
  const newestLesson = content.level.lessons[content.level.lessons.length - 1]?.number;

  let deck = $state<PracticeDeck>(last?.deck ?? 'words');
  let lessons = $state<number[]>(last?.lessons ?? (newestLesson ? [newestLesson] : []));
  let topics = $state<number[]>(
    last?.topics?.length
      ? last.topics
      : content.level.topics.filter((t) => t.cardCount > 0).map((t) => t.number),
  );
  let side = $state<FirstSideChoice>(last?.firstSide ?? settings.values.firstSide);
  let size = $state<string>(last?.size ?? '20');

  const groups = $derived(
    deck === 'words'
      ? content.level.lessons.map((l) => ({ n: l.number, count: l.wordCount, name: l.title }))
      : deck === 'grammar'
        ? content.level.topics
            .filter((t) => t.cardCount > 0)
            .map((t) => ({ n: t.number, count: t.cardCount, name: t.title }))
        : [],
  );
  const selected = $derived(deck === 'words' ? lessons : topics);
  const pool = $derived(
    deck !== 'traps' && selected.length === 0
      ? []
      : deckCards({ deck, lessons, topics }, content.level),
  );
  const count = $derived(size === 'all' ? pool.length : Math.min(Number(size), pool.length));

  function toggle(n: number) {
    const next = selected.includes(n)
      ? selected.filter((x) => x !== n)
      : [...selected, n].sort((a, b) => a - b);
    if (deck === 'words') lessons = next;
    else topics = next;
  }

  function toggleAll() {
    const next = selected.length === groups.length ? [] : groups.map((g) => g.n);
    if (deck === 'words') lessons = next;
    else topics = next;
  }

  function start() {
    settings.update({
      firstSide: side,
      lastSetup: { deck, lessons, topics, firstSide: side, size },
    });
    void goto(
      sessionUrl({
        mode: 'custom',
        deck,
        lessons,
        topics,
        firstSide: side,
        size: size === 'all' ? 'all' : Number(size),
      }),
    );
  }

  const sides: { value: FirstSideChoice; label: string }[] = $derived([
    { value: 'target', label: content.language.english },
    { value: 'native', label: content.language.nativeName.split(' ')[0] },
    { value: 'mix', label: 'Mixed' },
  ]);
</script>

<BackLink href="/" label="Today" />
<h1 class="mx-5 mt-1 text-3xl leading-tight font-bold tracking-[-0.02em]">New session</h1>

<section class="mx-5 mt-5">
  <h2 class="mb-2 text-[13px] font-semibold text-muted">Practice</h2>
  <Segmented label="What to practice" options={DECKS} value={deck} onchange={(v) => (deck = v)} />
</section>

{#if groups.length}
  <section class="mx-5 mt-[22px]">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-[13px] font-semibold text-muted">
        {deck === 'words' ? 'Lessons' : 'Topics'}
      </h2>
      <button
        type="button"
        onclick={toggleAll}
        class="min-h-8 px-1 text-sm font-semibold text-native"
      >
        {selected.length === groups.length ? 'Clear' : 'All'}
      </button>
    </div>
    <div
      class="grid grid-cols-8 gap-1.5"
      role="group"
      aria-label={deck === 'words' ? 'Lessons' : 'Topics'}
    >
      {#each groups as g (g.n)}
        {@const on = selected.includes(g.n)}
        <button
          type="button"
          aria-pressed={on}
          aria-label="{g.n}. {g.name}, {g.count} cards"
          title={g.name}
          onclick={() => toggle(g.n)}
          class={[
            'h-10 rounded-[10px] border text-[15px] font-semibold tabular-nums',
            on ? 'border-btn bg-btn text-btn-fg' : 'border-edge bg-card text-ink',
          ]}
        >
          {g.n}
        </button>
      {/each}
    </div>
    <p class="mt-2 text-[13px] text-muted">
      {pool.length}
      {deck === 'words' ? 'words' : 'cards'} in {selected.length}
      {deck === 'words' ? 'lessons' : 'topics'}
    </p>
  </section>
{:else}
  <p class="mx-5 mt-3 text-[13px] text-muted">
    {pool.length} cards: common mistakes and false friends.
  </p>
{/if}

<section class="mx-5 mt-[22px]">
  <h2 class="mb-2 text-[13px] font-semibold text-muted">Which side first</h2>
  {#if deck === 'words'}
    <div class="grid grid-cols-3 gap-2" role="group" aria-label="Which side first">
      {#each sides as s (s.value)}
        <button
          type="button"
          aria-pressed={side === s.value}
          onclick={() => (side = s.value)}
          class={[
            'flex h-[104px] flex-col items-center justify-between rounded-[14px] bg-card px-1.5 pt-3 pb-2.5',
            side === s.value ? 'border-2 border-ink' : 'border border-edge',
          ]}
        >
          {#if s.value === 'mix'}
            <span class="relative block h-11 w-[92px]">
              <MiniCard class="absolute top-0 left-2.5 rotate-[5deg]" side="native" />
              <MiniCard class="absolute top-2 left-0.5 -rotate-[4deg] shadow-lift" side="target" />
            </span>
          {:else if s.value === 'target'}
            <MiniCard width={86} side="target" text="соба́ка" class="shadow-lift" />
          {:else}
            <MiniCard width={86} side="native" text="pas" class="shadow-lift" />
          {/if}
          <span class="text-sm font-semibold">{s.label}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="text-[13px] text-muted">Grammar cards always start with the question.</p>
  {/if}
</section>

<section class="mx-5 mt-[22px]">
  <h2 class="mb-2 text-[13px] font-semibold text-muted">Cards per session</h2>
  <Segmented
    label="Cards per session"
    options={SESSION_SIZES.map((s) => ({
      value: s,
      label: s === 'all' ? `All ${pool.length}` : s,
    }))}
    value={size as (typeof SESSION_SIZES)[number]}
    onchange={(v) => (size = v)}
  />
</section>

<div class="mx-5 mt-[18px] mb-32">
  <Switch
    label="Show English after flipping"
    checked={settings.values.showEnglish}
    onchange={(v) => settings.update({ showEnglish: v })}
  />
</div>

<div
  class="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] bg-bg px-5 pt-3 pb-[max(1.75rem,var(--safe-bottom))]"
>
  <button
    type="button"
    onclick={start}
    disabled={count === 0}
    class="flex h-14 w-full items-center justify-center rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg disabled:opacity-50"
  >
    {count > 0
      ? `Start · ${count} cards`
      : `Pick at least one ${deck === 'words' ? 'lesson' : 'topic'}`}
  </button>
</div>
