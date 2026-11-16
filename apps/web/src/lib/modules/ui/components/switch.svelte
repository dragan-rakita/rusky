<script lang="ts">
  let {
    checked,
    label,
    onchange,
  }: { checked: boolean; label: string; onchange: (checked: boolean) => void } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  onclick={() => onchange(!checked)}
  class="flex min-h-14 w-full items-center justify-between gap-3 rounded-[14px] border border-line bg-card py-1 pr-1.5 pl-4 text-left"
>
  <span class="text-[15px] font-medium">{label}</span>
  <span class="flex h-11 w-16 shrink-0 items-center justify-center" aria-hidden="true">
    <span
      class={[
        'relative block h-7 w-[46px] rounded-full transition-colors',
        checked ? 'bg-btn' : 'bg-strong',
      ]}
    >
      <span
        class={[
          'absolute top-[3px] block size-[22px] rounded-full shadow transition-[left]',
          checked ? 'left-[21px] bg-btn-fg' : 'left-[3px] bg-card',
        ]}
      ></span>
    </span>
  </span>
</button>
