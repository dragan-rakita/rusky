<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { X } from '@lucide/svelte';
  import {
    checkGap,
    fillGap,
    GAP_GRADE,
    localDay,
    newCardState,
    parseGap,
    shuffle,
    type Card,
    type GapResult,
    type Grade,
  } from '@rusky/core';
  import { page } from '$app/state';
  import { content } from '$lib/modules/content/content.svelte';
  import FlashCard from '$lib/modules/practice/components/flash-card.svelte';
  import GapCard from '$lib/modules/practice/components/gap-card.svelte';
  import { GAP_VERDICT, GRADES, SNAP_BACK_MS } from '$lib/modules/practice/constants';
  import { describeCard, frontSideFor, gradeHint } from '$lib/modules/practice/faces';
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
  let results = $state<Record<Grade, number>>({ again: 0, almost: 0, knew: 0, done: 0 });
  let missed = $state.raw<Card[]>([]);
  let typed = $state('');
  let gapResult = $state<GapResult | null>(null);
  let gapInput = $state<HTMLInputElement>();

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
  const view = $derived(card ? describeCard(card, front, content.language, content.level) : null);
  const gapCard = $derived(card?.kind === 'grammar' && card.mode === 'gap' ? card : null);
  const suggested = $derived(gapResult ? GAP_GRADE[gapResult] : null);
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
    typed = '';
    gapResult = null;
    index = next;
    setTimeout(() => (instant = false), SNAP_BACK_MS);
    void tick().then(() => gapInput?.focus());
  }

  function checkTyped(e?: SubmitEvent) {
    e?.preventDefault();
    if (!gapCard || gapResult || !typed.trim()) return;
    gapResult = checkGap(typed, parseGap(gapCard.prompt)?.answers ?? [gapCard.answer]);
    flipped = true;
    gapInput?.blur();
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
    stack = shuffle(
      missed.length ? missed : (stack ?? []).filter((c) => !progress.states.get(c.id)?.done),
    );
    missed = [];
    results = { again: 0, almost: 0, knew: 0, done: 0 };
    snapTo(0);
  }

  function onkeydown(e: KeyboardEvent) {
    if (!card || done) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    if (gapCard) {
      if (e.key === 'Enter' && suggested && !target.closest('button, a')) {
        e.preventDefault();
        grade(suggested);
        return;
      }
    } else if ((e.key === ' ' || e.key === 'Enter') && !target.closest('button, a')) {
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

  <div
    class="flex flex-1 flex-col items-center justify-center px-5 lg:mt-auto lg:flex-none lg:pt-8"
  >
    {#if stack && total === 0}
      <div class="text-center">
        <h1 class="text-2xl font-bold">Nothing to practise here</h1>
        <p class="mt-2 text-[15px] text-muted">Pick other lessons or come back tomorrow.</p>
      </div>
    {:else if gapCard && view}
      <GapCard card={gapCard} lang={content.language.code} result={gapResult} />

      <div class="mt-10 h-48 w-full max-w-[440px] overflow-y-auto lg:max-w-[560px]">
        {#if gapCard.translation}
          <p
            lang={content.language.native}
            class="text-center text-[17px] leading-snug text-native"
          >
            {gapCard.translation}
          </p>
        {/if}
        {#if !gapResult}
          <form id="gap-form" onsubmit={checkTyped} class="mt-4">
            <input
              bind:this={gapInput}
              bind:value={typed}
              lang={content.language.code}
              aria-label="The missing part"
              placeholder="Type the missing part"
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              class="h-14 w-full rounded-[14px] border-[1.5px] border-strong bg-card px-4 text-center text-[20px] font-semibold text-ink placeholder:text-base placeholder:font-normal placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </form>
        {:else}
          {@const verdict = GAP_VERDICT[gapResult]}
          <div class="mt-4 flex flex-col gap-2.5 rounded-xl border border-line bg-card px-4 py-3.5">
            <div class="flex items-baseline gap-3">
              <span class={[MONO_LABEL, 'w-11 shrink-0 text-muted']}>YOU</span>
              <span
                lang={content.language.code}
                class={[
                  'text-[15px] leading-snug font-semibold',
                  gapResult === 'wrong' && 'text-target line-through',
                ]}
              >
                {typed.trim()}
              </span>
              <span class="ml-auto text-[13px] font-semibold text-muted">{verdict}</span>
            </div>
            {#if gapResult !== 'right'}
              <div class="flex items-baseline gap-3">
                <span class={[MONO_LABEL, 'w-11 shrink-0 text-muted']}>ANSWER</span>
                <span lang={content.language.code} class="text-[15px] leading-snug font-semibold">
                  <Stressed
                    text={parseGap(gapCard.prompt)?.answers.join(' / ') ?? gapCard.answer}
                  />
                </span>
              </div>
            {/if}
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
        {/if}
      </div>
    {:else if card && view}
      <FlashCard
        front={view.front}
        back={view.back}
        {flipped}
        {instant}
        onflip={() => (flipped = !flipped)}
      />

      <!-- A fixed height, so the card stays put whatever shows under it once flipped. -->
      <div class="mt-10 h-36 w-full max-w-[440px] overflow-y-auto lg:max-w-[560px]">
        {#if flipped && view.details.length}
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
        {:else if !flipped}
          <p class="flex items-center justify-center gap-2 pt-2 text-sm text-muted">
            <span class="lg:hidden">Tap the card to flip it</span>
            <span class="hidden lg:inline">
              Press
              <kbd
                class="mx-0.5 rounded-md border border-edge bg-card px-1.5 py-px font-mono text-[11px] font-semibold text-ink"
                >Space</kbd
              >
              to flip it
            </span>
          </p>
        {/if}
      </div>
    {:else if done}
      <div class="flex w-full max-w-[440px] flex-col gap-[18px] lg:max-w-[560px]">
        <div>
          <div class={[MONO_LABEL, 'text-muted']}>STACK FINISHED</div>
          <h1 class="mt-1.5 text-3xl leading-tight font-bold tracking-[-0.02em]">
            {total} cards, {results.knew + results.done} known
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
        <div class="grid grid-cols-4 gap-2">
          <div class="rounded-[14px] border border-line bg-card p-3.5">
            <div class="text-[28px] font-bold tabular-nums">{results.knew}</div>
            <div class="text-[13px] text-muted">knew it</div>
          </div>
          <div class="rounded-[14px] border-[1.5px] border-dashed border-strong bg-card p-3.5">
            <div class="text-[28px] font-bold tabular-nums">{results.done}</div>
            <div class="text-[13px] text-muted">done</div>
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
                  {#if m.kind === 'word'}
                    {m.native}
                  {:else if m.mode === 'gap'}
                    <Stressed text={fillGap(m.prompt)} stress={false} />
                  {:else}
                    {m.prompt}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="px-5 pt-3 pb-[max(1.75rem,var(--safe-bottom))] lg:mb-auto">
    {#if gapCard && !gapResult}
      <button
        type="submit"
        form="gap-form"
        disabled={!typed.trim()}
        class="h-14 w-full rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg disabled:opacity-50"
      >
        Check
      </button>
    {:else if card && !flipped}
      <button
        type="button"
        onclick={() => (flipped = true)}
        aria-keyshortcuts="Space"
        class="h-14 w-full rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg"
      >
        Show answer
        <kbd
          aria-hidden="true"
          class="ml-2 hidden rounded-md border border-btn-sub px-1.5 py-px align-[2px] font-mono text-[11px] font-semibold text-btn-sub lg:inline-block"
          >Space</kbd
        >
      </button>
    {:else if card}
      <div class="grid grid-cols-4 gap-2">
        {#each GRADES as g (g.grade)}
          <button
            type="button"
            onclick={() => grade(g.grade)}
            aria-keyshortcuts={g.key}
            class={[
              'flex h-14 min-w-0 flex-col items-center justify-center rounded-[14px] px-1 lg:relative',
              g.grade === 'again' && 'border-[1.5px] border-target bg-card text-target',
              g.grade === 'almost' && 'border-[1.5px] border-strong bg-card text-ink',
              g.grade === 'knew' && 'bg-btn text-btn-fg',
              g.grade === 'done' && 'border-[1.5px] border-dashed border-strong bg-card text-ink',
              g.grade === suggested && 'ring-2 ring-native ring-offset-2 ring-offset-bg',
            ]}
          >
            <kbd
              aria-hidden="true"
              class="absolute top-1.5 right-2 hidden font-mono text-[10px] leading-none font-semibold opacity-60 lg:block"
            >
              {g.key}
            </kbd>
            <span class="text-base leading-5 font-semibold whitespace-nowrap">{g.label}</span>
            <span
              class={[
                'text-[11px] leading-4 font-medium whitespace-nowrap',
                (g.grade === 'almost' || g.grade === 'done') && 'text-muted',
                g.grade === 'knew' && 'text-btn-sub',
              ]}
            >
              {gradeHint(cardState, g.grade)}
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
