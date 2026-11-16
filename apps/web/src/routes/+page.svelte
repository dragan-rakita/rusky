<script lang="ts">
  import { ChevronDown, ChevronRight, SlidersHorizontal } from '@lucide/svelte';
  import { localDay, MAX_BOX, planReview } from '@rusky/core';
  import { content } from '$lib/modules/content/content.svelte';
  import { BOX_LABELS } from '$lib/modules/progress/constants';
  import { progress } from '$lib/modules/progress/progress.svelte';
  import { sessionUrl } from '$lib/modules/practice/session';
  import { settings } from '$lib/modules/settings/settings.svelte';
  import { MONO_LABEL } from '$lib/modules/ui/constants';
  import MiniCard from '$lib/modules/ui/components/mini-card.svelte';
  import SettingsSheet from '$lib/modules/ui/components/settings-sheet.svelte';
  import Stressed from '$lib/modules/ui/components/stressed.svelte';

  let sheetOpen = $state(false);

  const now = new Date();
  const today = localDay(now.getTime());
  const dateLabel = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.`;
  const weekday = $derived(content.language.weekdays[now.getDay()] ?? '');

  const plan = $derived(
    planReview(content.cards, progress.states, today, settings.values.newPerDay),
  );
  const dueCount = $derived(plan.due.length + plan.fresh.length);

  const freshFrom = $derived.by(() => {
    const lessons = [
      ...new Set(plan.fresh.map((c) => (c.kind === 'word' ? c.lesson : 0)).filter(Boolean)),
    ].sort((a, b) => a - b);
    if (!lessons.length) return '';
    return lessons.length === 1
      ? ` from lesson ${lessons[0]}`
      : ` from lessons ${lessons[0]}–${lessons[lessons.length - 1]}`;
  });

  const tally = $derived.by(() => {
    const boxes: number[] = Array(MAX_BOX).fill(0);
    let done = 0;
    for (const card of content.cards) {
      const s = progress.states.get(card.id);
      if (s?.done) done++;
      else if (s?.reviews) boxes[s.box - 1]++;
    }
    return { boxes, done };
  });
  const started = $derived(tally.boxes.reduce((a, b) => a + b, tally.done));
  const tallest = $derived(Math.max(1, tally.done, ...tally.boxes));
  const stackHeight = (n: number) => `${Math.max(8, Math.round((n / tallest) * 64))}px`;

  const newest = $derived(content.level.lessons[content.level.lessons.length - 1]);
  const newestWords = $derived(
    content.level.words
      .filter((w) => w.lesson === newest?.number)
      .slice(0, 5)
      .map((w) => w.target)
      .join(', '),
  );
</script>

<div class="flex items-center justify-between pt-3 pr-4 pl-5 lg:hidden">
  <button
    type="button"
    onclick={() => (sheetOpen = true)}
    class="flex min-h-11 items-center gap-2.5 text-ink"
  >
    <span lang={content.language.code} class="text-xl font-bold tracking-[-0.01em]">
      {content.language.name}
    </span>
    <span class={[MONO_LABEL, 'rounded-md border-[1.5px] border-ink px-[7px] py-[3px]']}>
      {content.level.level.toUpperCase()}
    </span>
    <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" />
  </button>
  <a
    href="/setup"
    aria-label="New session"
    class="flex size-11 items-center justify-center rounded-xl border border-edge bg-card text-ink"
  >
    <SlidersHorizontal size={20} strokeWidth={2} aria-hidden="true" />
  </a>
</div>

{#snippet newestLesson(display: string)}
  {#if newest}
    <a
      href={sessionUrl({ deck: 'words', lessons: [newest.number], size: 'all' })}
      class={[
        'mx-5 mt-2.5 items-center gap-3 rounded-2xl border border-line bg-card py-3 pr-3.5 pl-4 lg:mx-0 lg:mt-0 lg:hover:border-strong',
        display,
      ]}
    >
      <span
        class="shrink-0 rounded-lg bg-btn px-2 py-1.5 font-mono text-xs font-semibold text-btn-fg"
      >
        L{newest.number}
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-[15px] font-semibold">Newest lesson: {newest.title}</span>
        <span lang={content.language.code} class="truncate text-[13px] text-muted">
          <Stressed text={newestWords} />
        </span>
      </span>
      <ChevronRight class="text-muted" size={18} strokeWidth={2.2} aria-hidden="true" />
    </a>
  {/if}
{/snippet}

<div class="contents lg:mx-auto lg:block lg:w-full lg:max-w-[1000px]">
  <div class="px-5 pt-[18px] lg:pt-0">
    <div lang={content.language.code} class="text-[15px] text-muted">
      <Stressed text={weekday} />, {dateLabel}
    </div>
    <h1 class="mt-0.5 text-[34px] leading-tight font-bold tracking-[-0.02em]">Today</h1>
  </div>

  <div
    class="contents lg:mx-5 lg:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-start lg:gap-6"
  >
    <div class="contents lg:flex lg:flex-col lg:gap-2.5">
      <section
        class="mx-5 mt-4 rounded-[18px] border border-line bg-card p-5 shadow-soft lg:mx-0 lg:mt-0"
      >
        <div class="flex items-start justify-between gap-3">
          {#if dueCount > 0}
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-[56px] leading-none font-bold tracking-[-0.03em]">{dueCount}</span
                >
                <span class="text-[17px] font-semibold"
                  >{dueCount === 1 ? 'card' : 'cards'} due</span
                >
              </div>
              <p class="mt-2 text-sm leading-snug text-muted">
                {plan.due.length} to review, {plan.fresh.length} new{freshFrom}
              </p>
            </div>
          {:else}
            <div>
              <div class="text-[28px] leading-tight font-bold tracking-[-0.02em]">
                All caught up
              </div>
              <p class="mt-2 text-sm leading-snug text-muted">
                Nothing is due. Practise a lesson anyway, or come back tomorrow.
              </p>
            </div>
          {/if}
          <div aria-hidden="true" class="relative h-[66px] w-[92px] shrink-0">
            <MiniCard class="absolute top-[18px] left-2 rotate-[6deg] border-edge" side="none" />
            <MiniCard class="absolute top-3 left-1.5 -rotate-[4deg] border-edge" side="none" />
            <MiniCard class="absolute top-1.5 left-1 shadow-lift" text="дом" />
          </div>
        </div>
        <div class="mt-[18px] flex gap-2.5">
          {#if dueCount > 0}
            <a
              href={sessionUrl({ mode: 'review' })}
              class="flex h-[52px] flex-1 items-center justify-center rounded-[14px] bg-btn text-[17px] font-semibold text-btn-fg"
            >
              Start review
            </a>
          {/if}
          <a
            href="/setup"
            class={[
              'flex h-[52px] items-center justify-center rounded-[14px] px-[18px] text-base font-semibold',
              dueCount > 0
                ? 'border-[1.5px] border-strong bg-card text-ink'
                : 'flex-1 bg-btn text-btn-fg',
            ]}
          >
            {dueCount > 0 ? 'Choose' : 'Practise a lesson'}
          </a>
        </div>
      </section>

      {@render newestLesson('hidden lg:flex')}
    </div>

    <div class="contents lg:flex lg:flex-col lg:gap-2.5">
      <section
        class="mx-5 mt-6 lg:mx-0 lg:mt-0 lg:rounded-[18px] lg:border lg:border-line lg:bg-card lg:p-5"
      >
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="text-[17px] font-bold">Boxes</h2>
          <span class="text-[13px] text-muted">
            {started
              ? 'a card moves right when you know it'
              : 'cards land here after their first review'}
          </span>
        </div>
        <div class="mt-3.5 grid grid-cols-6 items-end gap-2">
          {#each tally.boxes as n, i (i)}
            <div class="flex flex-col items-center gap-1">
              <div
                aria-hidden="true"
                class={[
                  'paper-stack w-full rounded border border-t-[3px] border-strong',
                  i === 0 ? 'border-t-target' : 'border-t-ink',
                ]}
                style:height={stackHeight(n)}
              ></div>
              <div class="mt-1 text-base font-bold tabular-nums">{n}</div>
              <div class="text-xs whitespace-nowrap text-muted">{BOX_LABELS[i]}</div>
            </div>
          {/each}
          <div class="flex flex-col items-center gap-1">
            <div
              aria-hidden="true"
              class="w-full rounded border-[1.5px] border-dashed border-strong bg-row"
              style:height={stackHeight(tally.done)}
            ></div>
            <div class="mt-1 text-base font-bold text-muted tabular-nums">{tally.done}</div>
            <div class="text-xs text-muted">done</div>
          </div>
        </div>
      </section>

      <div class="mx-5 mt-6 grid grid-cols-2 gap-2.5 lg:mx-0 lg:mt-0">
        <a
          href="/words"
          class="flex flex-col gap-0.5 rounded-2xl border border-line bg-card px-4 py-3.5 lg:hover:border-strong"
        >
          <span class={[MONO_LABEL, 'text-target']}>WORDS</span>
          <span class="text-[28px] font-bold tracking-[-0.02em]">{content.level.words.length}</span>
          <span class="text-[13px] text-muted">
            {content.level.lessons.length} lessons, {content.categories} categories
          </span>
        </a>
        <a
          href="/grammar"
          class="flex flex-col gap-0.5 rounded-2xl border border-line bg-card px-4 py-3.5 lg:hover:border-strong"
        >
          <span class={[MONO_LABEL, 'text-native']}>GRAMMAR</span>
          <span class="text-[28px] font-bold tracking-[-0.02em]">{content.level.topics.length}</span
          >
          <span class="text-[13px] text-muted">topics from your notes</span>
        </a>
      </div>
    </div>
  </div>

  {@render newestLesson('flex lg:hidden')}
</div>

<SettingsSheet bind:open={sheetOpen} />
