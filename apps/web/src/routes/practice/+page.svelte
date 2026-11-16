<script lang="ts">
  import { untrack } from 'svelte';
  import { X } from '@lucide/svelte';
  import { intervalFor, localDay, newCardState, shuffle, type Card, type Grade } from '@rusky/core';
  import { page } from '$app/state';
  import { content } from '$lib/modules/content/content.svelte';
  import FlashCard from '$lib/modules/practice/components/flash-card.svelte';
  import { GRADES, SNAP_BACK_MS } from '$lib/modules/practice/constants';
  import { describeCard, frontSideFor, intervalLabel } from '$lib/modules/practice/faces';
  import { buildSession, parseSessionParams } from '$lib/modules/practice/session';
  import { newId, progress } from '$lib/modules/progress/progress.svelte';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import { MONO_LABEL } from '$lib/modules/ui/constants';
  import Segmented from '$lib/modules/ui/components/segmented.svelte';
  import Stressed from '$lib/modules/ui/components/stressed.svelte';

  const params = parseSessionParams(page.url);

  let firstSide = $state<FirstSideChoice>(params.firstSide ?? settings.values.firstSide);
  let stack = $state.raw<Card[] | null>(null);
  let index = $state(0);
  let flipped = $state(false);
  let instant = $state(false);
  let results = $state({ again: 0, almost: 0, knew: 0 });
  let missed = $state.raw<Card[]>([]);

  $effect(() => {
    if (!progress.ready || stack) return;
    stack = untrack(() =>
      buildSession(
        params,
        content.level,
        progress.states,
        localDay(Date.now()),
        settings.values.newPerDay,
      ),
    );
  });

  const card = $derived(stack?.[index]);
  const total = $derived(stack?.length ?? 0);
  const done = $derived(!!stack && total > 0 && index >= total);
  const isWords = $derived(params.mode === 'review' || params.deck === 'words');
  const front = $derived(card ? frontSideFor(card, firstSide, index) : 'target');
  const view = $derived(
    card
      ? describeCard(
          card,
          front,
          content.language,
          content.level,
          content,
          settings.values.showEnglish,
        )
      : null,
  );
  const cardState = $derived(
    card ? (progress.states.get(card.id) ?? newCardState()) : newCardState(),
  );

  const sides = $derived([
    { value: 'target' as const, label: `${content.targetCode} → ${content.nativeCode}` },
    { value: 'native' as const, label: `${content.nativeCode} → ${content.targetCode}` },
    { value: 'mix' as const, label: 'Mixed' },
  ]);

  $effect(() => {
    if (done) void progress.sync();
  });

  function snapTo(next: number) {
    instant = true;
    flipped = false;
    index = next;
    setTimeout(() => (instant = false), SNAP_BACK_MS);
  }

  function grade(g: Grade) {
    if (!card || !flipped) return;
    void progress.record({
      id: newId(),
      cardId: card.id,
      grade: g,
      reviewedAt: Date.now(),
      firstSide: front,
    });
    results[g] += 1;
    if (g === 'again') missed = [...missed, card];
    snapTo(index + 1);
  }

  function changeSide(side: FirstSideChoice) {
    firstSide = side;
    settings.update({ firstSide: side });
    instant = true;
    flipped = false;
    setTimeout(() => (instant = false), SNAP_BACK_MS);
  }

  function again() {
    stack = shuffle(missed.length ? missed : (stack ?? []));
    missed = [];
    results = { again: 0, almost: 0, knew: 0 };
    snapTo(0);
  }

  function onkeydown(e: KeyboardEvent) {
    if (!card || done) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    if ((e.key === ' ' || e.key === 'Enter') && !target.closest('button, a')) {
      e.preventDefault();
      flipped = !flipped;
      return;
    }
    const g = GRADES.find((x) => x.key === e.key);
    if (g && flipped) grade(g.grade);
  }
</script>

<svelte:window {onkeydown} />

<div class="flex min-h-[calc(100svh-var(--safe-top))] flex-col">
  <div class="flex h-14 items-center justify-between pt-2 pr-4 pl-2">
    <div class="w-20">
      <a
        href="/"
        aria-label="End session"
        class="flex size-11 items-center justify-center text-ink"
      >
        <X size={22} strokeWidth={2.2} aria-hidden="true" />
      </a>
    </div>
    <div class="text-[15px] font-semibold tabular-nums">
      {#if total}{done ? total : index + 1} / {total}{/if}
    </div>
    <div class={[MONO_LABEL, 'w-20 text-right text-muted']}>
      {params.mode === 'review' ? 'REVIEW' : params.deck.toUpperCase()}
    </div>
  </div>
  <div class="mx-5 mt-1.5 h-1 overflow-hidden rounded-sm bg-edge">
    <div
      class="h-1 rounded-sm bg-ink transition-[width] duration-300"
      style:width="{total ? Math.round(((done ? total : index) / total) * 100) : 0}%"
    ></div>
  </div>

  {#if isWords && !done && card}
    <div class="mx-5 mt-4">
      <Segmented label="Which side first" options={sides} value={firstSide} onchange={changeSide} />
    </div>
  {/if}

  <div class="flex flex-1 flex-col items-center justify-center px-5">
    {#if stack && total === 0}
      <div class="text-center">
        <h1 class="text-2xl font-bold">Nothing to practise here</h1>
        <p class="mt-2 text-[15px] text-muted">Pick other lessons or come back tomorrow.</p>
      </div>
    {:else if card && view}
      <FlashCard
        front={view.front}
        back={view.back}
        meta={view.meta}
        {flipped}
        {instant}
        onflip={() => (flipped = !flipped)}
      />

      <div class="mt-10 min-h-36 w-full max-w-[440px]">
        {#if flipped}
          <div class="flex flex-col gap-2.5 rounded-xl border border-line bg-card px-4 py-3.5">
            {#each view.details as d (d.key)}
              <div class="flex items-baseline gap-3">
                <span class={[MONO_LABEL, 'w-11 shrink-0 text-muted']}>{d.key}</span>
                {#if d.href}
                  <a href={d.href} class="text-[15px] leading-snug text-native underline"
                    >{d.value}</a
                  >
                {:else}
                  <span class="text-[15px] leading-snug">{d.value}</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="flex items-center justify-center gap-2 pt-2 text-sm text-muted">
            Tap the card to flip it
          </p>
        {/if}
      </div>
    {:else if done}
      <div class="flex w-full max-w-[440px] flex-col gap-[18px]">
        <div>
          <div class={[MONO_LABEL, 'text-muted']}>STACK FINISHED</div>
          <h1 class="mt-1.5 text-3xl leading-tight font-bold tracking-[-0.02em]">
            {total} cards, {results.knew} known
          </h1>
          <p class="mt-1.5 text-[15px] leading-snug text-muted">
            {#if results.again === 0}
              Nothing missed this time.
            {:else}
              {results.again}
              {results.again === 1 ? 'card goes' : 'cards go'} back to box 1 and comes up again tomorrow.
            {/if}
          </p>
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div class="rounded-[14px] border border-line bg-card p-3.5">
            <div class="text-[28px] font-bold tabular-nums">{results.knew}</div>
            <div class="text-[13px] text-muted">knew it</div>
          </div>
          <div class="rounded-[14px] border border-line bg-card p-3.5">
            <div class="text-[28px] font-bold tabular-nums">{results.almost}</div>
            <div class="text-[13px] text-muted">almost</div>
          </div>
          <div class="rounded-[14px] border-[1.5px] border-target bg-card p-3.5">
            <div class="text-[28px] font-bold text-target tabular-nums">{results.again}</div>
            <div class="text-[13px] text-muted">again</div>
          </div>
        </div>
        {#if missed.length}
          <div class="overflow-hidden rounded-[14px] border border-line bg-card">
            <div class={[MONO_LABEL, 'px-4 pt-3 pb-1.5 text-muted']}>BACK TOMORROW</div>
            {#each missed as m (m.id)}
              <div class="flex items-baseline justify-between gap-3 border-t border-row px-4 py-3">
                <span lang={content.language.code} class="text-[17px] font-semibold">
                  <Stressed
                    text={m.kind === 'word' ? m.target : m.answer}
                    stress={m.kind === 'word' || m.answerSide === 'target'}
                  />
                </span>
                <span class="text-right text-[15px] text-muted">
                  {m.kind === 'word' ? m.native : m.prompt}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="px-5 pt-3 pb-[max(1.75rem,var(--safe-bottom))]">
    {#if card && !flipped}
      <button
        type="button"
        onclick={() => (flipped = true)}
        class="h-14 w-full rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg"
      >
        Show answer
      </button>
    {:else if card}
      <div class="grid grid-cols-3 gap-2.5">
        {#each GRADES as g (g.grade)}
          <button
            type="button"
            onclick={() => grade(g.grade)}
            class={[
              'flex h-16 flex-col items-center justify-center gap-0.5 rounded-[14px]',
              g.grade === 'again' && 'border-[1.5px] border-target bg-card text-target',
              g.grade === 'almost' && 'border-[1.5px] border-strong bg-card text-ink',
              g.grade === 'knew' && 'bg-btn text-btn-fg',
            ]}
          >
            <span class="text-base font-semibold">{g.label}</span>
            <span
              class={[
                'text-xs font-medium',
                g.grade === 'almost' && 'text-muted',
                g.grade === 'knew' && 'text-btn-sub',
              ]}
            >
              {intervalLabel(intervalFor(cardState, g.grade))}
            </span>
          </button>
        {/each}
      </div>
    {:else if done || (stack && total === 0)}
      <div class={['grid gap-2.5', done ? 'grid-cols-2' : 'grid-cols-1']}>
        <a
          href="/"
          class="flex h-14 items-center justify-center rounded-[14px] border-[1.5px] border-strong bg-card text-base font-semibold"
        >
          Back to Today
        </a>
        {#if done}
          <button
            type="button"
            onclick={again}
            class="h-14 rounded-[14px] bg-btn text-base font-semibold text-btn-fg"
          >
            {missed.length ? `Again: the ${missed.length} missed` : 'Go again'}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
