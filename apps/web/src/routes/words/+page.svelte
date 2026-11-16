<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { plainText } from '@rusky/core';
  import { content } from '$lib/modules/content/content.svelte';
  import { sessionUrl } from '$lib/modules/practice/session';
  import { newId, progress } from '$lib/modules/progress/progress.svelte';
  import BoxMeter from '$lib/modules/ui/components/box-meter.svelte';
  import Stressed from '$lib/modules/ui/components/stressed.svelte';

  let query = $state('');
  let lesson = $state<number | 'all'>('all');

  const lessonsNewestFirst = $derived([...content.level.lessons].reverse());

  const sections = $derived.by(() => {
    const q = plainText(query.trim());
    return lessonsNewestFirst
      .filter((l) => lesson === 'all' || l.number === lesson)
      .map((l) => ({
        lesson: l,
        words: content.level.words.filter(
          (w) =>
            w.lesson === l.number &&
            (!q ||
              plainText(w.target).includes(q) ||
              w.native.toLowerCase().includes(q) ||
              w.english.toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.words.length > 0);
  });

  const boxOf = (id: string) => {
    const s = progress.states.get(id);
    return s?.reviews ? s.box : 0;
  };

  /** A word marked done goes back to box 1, due tomorrow. */
  function bringBack(cardId: string) {
    void progress.record({
      id: newId(),
      cardId,
      grade: 'again',
      reviewedAt: Date.now(),
      firstSide: 'target',
    });
  }
</script>

<div class="contents lg:mx-auto lg:block lg:w-full lg:max-w-[1000px]">
  <div class="contents lg:flex lg:items-center lg:justify-between lg:gap-6 lg:px-5 lg:pt-1">
    <div class="flex items-baseline gap-2.5 px-5 pt-5 lg:p-0">
      <h1 class="text-3xl leading-tight font-bold tracking-[-0.02em]">Words</h1>
      <span class="text-[15px] text-muted">
        {content.level.words.length} · {content.level.level.toUpperCase()}
      </span>
    </div>

    <label
      class="mx-5 mt-3.5 flex h-12 items-center gap-2.5 rounded-xl border border-edge bg-card px-3.5 text-muted lg:m-0 lg:w-[360px] lg:shrink-0"
    >
      <Search size={18} strokeWidth={2.2} aria-hidden="true" />
      <span class="sr-only">Search words</span>
      <input
        type="search"
        bind:value={query}
        placeholder="Search {content.language.english}, Serbian or English"
        class="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
      />
    </label>
  </div>

  <div
    role="group"
    aria-label="Lesson"
    class="mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 lg:mt-5 lg:flex-wrap lg:overflow-visible"
  >
    {#each [{ n: 'all' as const, label: 'All lessons' }, ...lessonsNewestFirst.map( (l) => ({ n: l.number, label: `L${l.number}` }) )] as chip (chip.n)}
      <button
        type="button"
        aria-pressed={lesson === chip.n}
        onclick={() => (lesson = chip.n)}
        class={[
          'h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold',
          lesson === chip.n
            ? 'border-btn bg-btn text-btn-fg'
            : 'border-edge bg-card text-ink lg:hover:border-strong',
        ]}
      >
        {chip.label}
      </button>
    {/each}
  </div>

  <div
    class={[
      'contents lg:mt-4 lg:block lg:px-5',
      sections.length > 1 && 'lg:columns-2 lg:gap-6',
      sections.length === 1 && 'lg:max-w-[600px]',
    ]}
  >
    {#each sections as s (s.lesson.number)}
      <section class="mx-5 mt-4 lg:mx-0 lg:mt-0 lg:break-inside-avoid lg:pb-5">
        <div class="flex items-baseline justify-between px-0.5 pb-2">
          <h2 class="text-[15px] font-bold">
            Lesson {s.lesson.number}
            <span class="font-medium text-muted">· {s.lesson.title} · {s.lesson.wordCount}</span>
          </h2>
          <a
            href={sessionUrl({ deck: 'words', lessons: [s.lesson.number], size: 'all' })}
            class="flex min-h-8 items-center text-sm font-semibold text-native"
          >
            Practice
          </a>
        </div>
        <ul class="overflow-hidden rounded-[14px] border border-line bg-card">
          {#each s.words as w, i (w.id)}
            <li
              class={[
                'flex min-h-[52px] items-center gap-3 px-3.5 py-2',
                i > 0 && 'border-t border-row',
              ]}
            >
              <span
                lang={content.language.code}
                class="max-w-[58%] shrink-0 text-[17px] font-semibold"
              >
                <Stressed text={w.target} />
              </span>
              <span
                lang={content.language.native}
                class="min-w-0 flex-1 truncate text-right text-[15px] text-muted"
              >
                {w.native}
              </span>
              {#if progress.states.get(w.id)?.done}
                <button
                  type="button"
                  onclick={() => bringBack(w.id)}
                  aria-label="Done. Bring {plainText(w.target)} back to practice"
                  class="-my-1 -mr-1.5 flex h-11 shrink-0 items-center px-1.5"
                >
                  <span
                    class="rounded-full border-[1.5px] border-dashed border-strong px-2 py-0.5 text-xs font-semibold text-muted"
                  >
                    Done
                  </span>
                </button>
              {:else}
                <BoxMeter box={boxOf(w.id)} />
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="mx-5 mt-6 text-center text-[15px] text-muted lg:mt-4">No word matches “{query}”.</p>
    {/each}
  </div>
</div>
