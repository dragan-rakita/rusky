<script lang="ts" generics="T extends string | number">
  let {
    options,
    value,
    label,
    onchange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    label: string;
    onchange: (value: T) => void;
  } = $props();
</script>

<div
  role="group"
  aria-label={label}
  class="grid gap-[3px] rounded-xl bg-seg p-[3px]"
  style:grid-template-columns="repeat({options.length}, minmax(0, 1fr))"
>
  {#each options as o (o.value)}
    <button
      type="button"
      aria-pressed={value === o.value}
      onclick={() => onchange(o.value)}
      class={[
        'h-10 rounded-[9px] text-[15px] transition-colors',
        value === o.value ? 'bg-seg-on font-semibold text-ink shadow-seg' : 'font-medium text-soft',
      ]}
    >
      {o.label}
    </button>
  {/each}
</div>
