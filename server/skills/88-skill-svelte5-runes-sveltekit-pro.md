---
name: svelte5-runes-sveltekit-pro
description: "Skill pengembangan web reaktif menggunakan Svelte 5 (Runes: $state, $derived, $effect, $props) dan SvelteKit."
---

# Svelte 5 (Runes) & SvelteKit Full-Stack Pro

## Sintaks Runes Svelte 5
```svelte
<script>
  let target = $state(4000);
  let aktual = $state(4350);
  let capaianPct = $derived(target > 0 ? ((aktual / target) * 100).toFixed(1) : '0.0');
</script>

<div class="p-4 rounded-xl bg-slate-100">
  <p>Capaian: <strong>{capaianPct}%</strong></p>
</div>
```
