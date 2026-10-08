<script>
  import { onDestroy } from "svelte";
  import { userData, verifyIsAdmin } from "$lib/store/user.svelte";
  import { apiClient } from "$lib/api/apiClient";

  // Fields of GET/PUT /admin/ai-settings, grouped as on the page. The rules mirror
  // AiSettingsService.validate on the backend: its 400 comes back without the
  // reason, so the page has to say what's wrong itself.
  const EFFORT_OPTIONS = [
    { value: "", label: "Zadano (model odlučuje)" },
    { value: "none", label: "none — bez razmišljanja" },
    { value: "minimal", label: "minimal" },
    { value: "low", label: "low" },
    { value: "medium", label: "medium" },
    { value: "high", label: "high" },
    { value: "xhigh", label: "xhigh — najviše" },
  ];

  const SECTIONS = [
    {
      title: "AI chat",
      sub: "Asistent uz zadatke i probnu maturu",
      fields: [
        { key: "chatModel", label: "Model", type: "model", hint: "OpenRouter ID modela" },
        { key: "chatDailyLimit", label: "Dnevni limit pitanja", type: "int", min: 0, hint: "po učeniku u 24 h · 0 isključuje chat" },
        { key: "chatMaxTokens", label: "Max tokens", type: "int", min: 1, hint: "uključuje i razmišljanje" },
        { key: "chatReasoningEffort", label: "Razina razmišljanja", type: "effort" },
      ],
    },
    {
      title: "Ocjenjivanje probne mature",
      sub: "AI ocjenjivanje odgovora s probne mature",
      fields: [
        { key: "gradingModelText", label: "Model za tekstualne odgovore", type: "model", hint: "OpenRouter ID modela" },
        { key: "gradingModelVision", label: "Model za slike", type: "model", hint: "čita fotografije rješenja" },
        { key: "gradingMaxTokens", label: "Max tokens", type: "int", min: 1, hint: "uključuje i razmišljanje" },
        { key: "gradingReasoningEffort", label: "Razina razmišljanja", type: "effort" },
      ],
    },
  ];
  const FIELDS = SECTIONS.flatMap((s) => s.fields);
  const MAX_MODEL_CHARS = 200;

  let saved = $state(null); // last settings from the server
  let form = $state(null); // editable copy
  let loading = $state(false);
  let loadError = $state("");
  let saving = $state(false);
  let saveError = $state("");
  let savedNote = $state(false);
  let noteTimer = 0;

  // Effort is null on the server for "the model's default"; a <select> needs "".
  function toForm(dto) {
    const f = {};
    for (const { key, type } of FIELDS) {
      f[key] = type === "int" ? dto[key] : (dto[key] ?? "");
    }
    return f;
  }

  function toBody(f) {
    const body = {};
    for (const { key, type } of FIELDS) {
      if (type === "model") body[key] = String(f[key] ?? "").trim();
      else if (type === "effort") body[key] = f[key] || null;
      else body[key] = f[key];
    }
    return body;
  }

  function fieldError(field, value) {
    if (field.type === "model") {
      const model = String(value ?? "").trim();
      if (!model) return "Upiši ID modela.";
      if (model.length > MAX_MODEL_CHARS) return `Najviše ${MAX_MODEL_CHARS} znakova.`;
      if (/\s/.test(model)) return "ID modela ne smije sadržavati razmake.";
    } else if (field.type === "int") {
      if (typeof value !== "number" || !Number.isInteger(value)) return "Upiši cijeli broj.";
      if (value < field.min) return `Najmanje ${field.min}.`;
    }
    return "";
  }

  let errors = $derived(
    form ? Object.fromEntries(FIELDS.map((f) => [f.key, fieldError(f, form[f.key])])) : {},
  );
  let valid = $derived(Object.values(errors).every((e) => !e));
  let dirty = $derived(
    !!saved && !!form && JSON.stringify(toBody(form)) !== JSON.stringify(toBody(toForm(saved))),
  );
  let canSave = $derived(dirty && valid && !saving);

  let updatedLabel = $derived.by(() => {
    if (!saved?.updatedAt) return "";
    const when = new Date(saved.updatedAt).toLocaleString("hr-HR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return saved.updatedByEmail ? `${when} · ${saved.updatedByEmail}` : when;
  });

  // ── Admin gate ──────────────────────────────────────────────────────────
  // Verify admin via backend once auth resolves (also covers page reload).
  $effect(() => {
    if (userData.user && !userData.adminChecked) verifyIsAdmin();
  });

  $effect(() => {
    if (userData.isAdmin && !saved && !loading && !loadError) load();
  });

  function applySettings(dto) {
    saved = dto;
    form = toForm(dto);
  }

  async function load() {
    loading = true;
    loadError = "";
    try {
      const res = await apiClient("/admin/ai-settings", { method: "GET" });
      if (res.ok) {
        applySettings(await res.json());
      } else {
        loadError = `${res.status}: ${await res.text()}`;
      }
    } catch (err) {
      loadError = err.message;
    }
    loading = false;
  }

  async function save() {
    if (!canSave) return;
    saving = true;
    saveError = "";
    savedNote = false;
    try {
      const res = await apiClient("/admin/ai-settings", {
        method: "PUT",
        body: JSON.stringify(toBody(form)),
      });
      if (res.ok) {
        applySettings(await res.json());
        savedNote = true;
        clearTimeout(noteTimer);
        noteTimer = setTimeout(() => (savedNote = false), 3000);
      } else if (res.status === 400) {
        saveError = "Backend je odbio postavke. Provjeri vrijednosti.";
      } else if (res.status === 403) {
        saveError = "Nemaš administratorske ovlasti.";
      } else {
        saveError = "Spremanje nije uspjelo. Pokušaj ponovo.";
      }
    } catch {
      saveError = "Spremanje nije uspjelo. Pokušaj ponovo.";
    }
    saving = false;
  }

  function discard() {
    form = toForm(saved);
    saveError = "";
  }

  onDestroy(() => clearTimeout(noteTimer));
</script>

<div class="page">
  {#if userData.loading || (userData.user && !userData.adminChecked)}
    <div style="padding:80px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
  {:else if !userData.isAdmin}
    <div class="card card-pad" style="text-align:center;padding:60px 24px">
      <div style="font-size:42px;margin-bottom:10px">🔒</div>
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:600">Pristup ograničen</h2>
      <p style="color:var(--text-dim);margin:0">Ova stranica dostupna je samo administratorima.</p>
    </div>
  {:else}
    <div class="zadaci-head" style="margin-bottom:18px">
      <div>
        <h1>AI postavke</h1>
        <div class="sub">Admin · modeli, limiti i razmišljanje za AI</div>
      </div>
    </div>

    {#if loadError}
      <div class="card card-pad" style="text-align:center">
        <p style="color:var(--danger);margin:0 0 12px">Greška pri učitavanju: {loadError}</p>
        <button class="btn btn-ghost" onclick={load}>Pokušaj ponovno</button>
      </div>
    {:else if !form}
      <div style="padding:60px 20px;text-align:center;color:var(--text-faint)">Učitavanje…</div>
    {:else}
      <div class="ai-sections">
        {#each SECTIONS as section (section.title)}
          <section class="card card-pad">
            <h2 class="section-title">{section.title}</h2>
            <div class="section-sub">{section.sub}</div>

            <div class="fields">
              {#each section.fields as f (f.key)}
                <div class="field" class:invalid={!!errors[f.key]}>
                  <label for={f.key}>{f.label}</label>
                  {#if f.type === "effort"}
                    <select id={f.key} bind:value={form[f.key]} disabled={saving}>
                      {#each EFFORT_OPTIONS as o (o.value)}
                        <option value={o.value}>{o.label}</option>
                      {/each}
                    </select>
                  {:else if f.type === "int"}
                    <input id={f.key} type="number" min={f.min} step="1" bind:value={form[f.key]} disabled={saving} />
                  {:else}
                    <input
                      id={f.key}
                      class="mono"
                      type="text"
                      spellcheck="false"
                      autocomplete="off"
                      placeholder="xiaomi/mimo-v2.6-pro"
                      bind:value={form[f.key]}
                      disabled={saving}
                    />
                  {/if}
                  {#if errors[f.key]}
                    <div class="field-error">{errors[f.key]}</div>
                  {:else if f.hint}
                    <div class="field-hint">{f.hint}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <div class="actions">
        <button class="btn btn-primary" onclick={save} disabled={!canSave}>
          {saving ? "Spremanje…" : "Spremi promjene"}
        </button>
        <button class="btn btn-ghost" onclick={discard} disabled={!dirty || saving}>Odbaci promjene</button>
        {#if savedNote}
          <span class="save-ok">Spremljeno ✓</span>
        {:else if saveError}
          <span class="save-error">{saveError}</span>
        {/if}
        <div class="actions-meta">
          {#if updatedLabel}<div>Zadnja promjena: {updatedLabel}</div>{/if}
          <div>Promjene vrijede od sljedećeg AI zahtjeva.</div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .ai-sections {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  .section-sub {
    margin: 2px 0 16px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 18px;
  }
  @media (max-width: 720px) {
    .fields {
      grid-template-columns: 1fr;
    }
  }

  /* Same look as the filters on /all-tasks. */
  .field {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field label {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .field input,
  .field select {
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.12s;
  }
  .field select {
    cursor: pointer;
  }
  .field input.mono {
    font-family: var(--font-mono);
  }
  .field input:hover:not(:disabled),
  .field select:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  .field input:focus,
  .field select:focus {
    border-color: var(--primary);
  }
  .field input:disabled,
  .field select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .field.invalid input {
    border-color: var(--danger);
  }
  .field-hint,
  .field-error {
    font-size: 11.5px;
  }
  .field-hint {
    color: var(--text-faint);
  }
  .field-error {
    color: var(--danger);
  }

  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }
  .save-ok {
    font-size: 13px;
    color: var(--success);
  }
  .save-error {
    font-size: 13px;
    color: var(--danger);
  }
  .actions-meta {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-faint);
    text-align: right;
  }
</style>
