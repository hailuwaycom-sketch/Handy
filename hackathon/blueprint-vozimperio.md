# Blueprint — VozImperio

**Proyecto:** VozImperio (fork de Handy) — Hackathon Imperial
**Deadline final:** 2026-07-30
**Última actualización:** 2026-07-11

Este documento es el plan vivo de features de VozImperio. Se actualiza cuando cambia el estado de una fase — no es un registro de sesión (eso es la bitácora) ni el detalle técnico presentable (eso es `manual-de-cambios.html`).

---

## Ya implementado (verificado en código)

| Feature                                                                                  | Estado                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rebrand completo (tema imperial, iconos de tray, defaults en español)                    | ✅ Hecho                                                                                                                               |
| Overlay: posicionamiento correcto en multi-monitor con DPI mixto                         | ✅ Hecho — commit `8b006cd`                                                                                                            |
| Glosario inteligente (Custom Words con fuzzy matching: Levenshtein + Soundex + n-gramas) | ✅ Ya estaba en el código base — threshold configurable, UI en Ajustes                                                                 |
| VAD con suavizado (onset / hangover / prefill frames)                                    | ✅ Ya estaba en el código base                                                                                                         |
| Reparación de settings corruptos (salva los campos válidos en vez de resetear todo)      | ✅ Hecho — al sincronizar v0.9.1 se adoptó el `salvage_settings` de la base upstream (reemplazó nuestro `dc4ea8d`, que hacía lo mismo) |
| Sincronización con la base upstream Handy **v0.9.1** (31 PRs de bug-fixes)               | ✅ Hecho — ver sección abajo y `cambios-de-configuracion-antes-de-fase-0.md`                                                           |

## En construcción

### Fase 1 — Supresión de ruido (RNNoise)

Módulo nuevo que limpia el audio del micrófono de ruido de fondo antes de VAD/transcripción, usando RNNoise puenteado a 48kHz (el pipeline de VozImperio corre a 16kHz).

**Checklist:**

1. ✅ Backend — módulo `noise_suppression.rs` en `audio_toolkit/audio/` (resample 16k→48k→RNNoise→48k→16k), exportado en `mod.rs`, con tests unitarios. Commit `be5d3c1`.
2. ✅ Enganche al pipeline — `recorder.rs::run_consumer` construye un `NoiseSuppressor` por sesión en `Cmd::Start` (si el flag viene activo) y lo aplica en `handle_frame` antes de VAD/emit, con fallback a passthrough si falla el init. Commit `24c80a9`.
3. ✅ Settings — `noise_suppression_enabled: bool` (default `false`), comando `change_noise_suppression_enabled_setting`, bindings. Commit `24c80a9`.
4. ✅ Frontend — toggle `MicrophoneNoiseCancellation.tsx` en Ajustes → Sonido, registrado en settings store, i18n es/en. Commit `935f924`.
5. ✅ Validación — automatizado ya corrido (101/101 tests, `cargo clippy` limpio en el diff, `tsc` sin errores). Validación manual hecha 2026-07-11 con ruido estacionario real (ventilador/hiss): confirmado funcionando, sin comerse voz real ni demora perceptible. **Limitación real descubierta**: RNNoise filtra ruido estacionario pero no música ni voces de fondo (similitud espectral con la voz humana) — el tooltip de Ajustes se actualizó para reflejarlo (commit `1507d2c`).

**Estado:** 5/5 completo, validado y cerrado.

### Fase 3 — Text Replacement determinista

(Numeración alineada con `manual-de-cambios.html`, donde Fase 02 ya la ocupa la reparación de settings corruptos.)

Reglas de find/replace (con soporte de regex opcional y grupos de captura `$1`) aplicadas al final del post-proceso de transcripción, después del glosario fuzzy y el filtro de muletillas. Complementa al glosario: el glosario corrige palabras sueltas por parecido fonético/ortográfico, esto reemplaza patrones exactos que el usuario define a propósito.

**Checklist:**

1. ✅ Backend — `TextReplacementRule` (find/replace/use_regex/case_sensitive) + campo en settings + `apply_text_replacements()` en `text.rs` (literal se escapa antes de entrar al motor de regex, `NoExpand` evita expandir `$1` en modo literal) + comando `update_text_replacement_rules`. 11 tests. Commit `82f4a15`.
2. ✅ `bindings.ts` — tipo `TextReplacementRule` + función `updateTextReplacementRules`. Commit `0d71cdf`.
3. ✅ Frontend — `TextReplacementSettings.tsx` (lista de reglas: find, replace, toggle regex, toggle case-sensitive, agregar/quitar) + registro en Ajustes Avanzado + i18n es/en. Commit `b0223ab`.
4. ✅ Validación automatizada — 11 tests cubren literal, regex con grupos de captura, sensibilidad a mayúsculas, regex inválido (no rompe el pipeline), orden de reglas. 118/118 tests del proyecto, `tsc` limpio. ⬜ Falta correr la UI real (agregar una regla desde Ajustes y confirmar que persiste) — mismo pendiente que la Fase 01.

**Estado:** funcional end-to-end, 3/4 pasos completos y el 4to con la parte automatizable ya hecha. Solo falta la misma clase de prueba manual que la Fase 01 (correr la app de verdad).

### Fase 4 — AI Replace Selection

Corta la selección de texto activa en cualquier app (Ctrl+X simulado + portapapeles), graba una instrucción hablada por el mismo pipeline que el dictado normal, la transforma con el mismo proveedor LLM configurado para post-procesamiento, y pega el resultado de vuelta en el lugar original. Mayor esfuerzo que las fases anteriores: requirió extender `TranscribeAction` (bool `post_process` → enum `TranscribeMode` de 3 estados) en vez de duplicar las ~300 líneas de orquestación de grabación que ya existían.

**Checklist:**

1. ✅ Backend — `capture_selected_text()` (Ctrl+X vía enigo + lectura/restauración de portapapeles), `transform_selection_with_llm()` (reusa el proveedor de post-procesamiento), `TranscribeMode::ReplaceSelection` enganchado en `TranscribeAction::start`/`stop`. Si el LLM falla, restaura la selección original — nunca se pierde el texto cortado. Commit `685f01a`.
2. ✅ Binding — `ai_replace_selection` (ctrl+alt+space en Windows/Linux) registrado en los 3 motores de shortcuts, mismo gate que `transcribe_with_post_process` (requiere post-procesamiento habilitado). Commit `685f01a`.
3. ✅ Frontend — `ShortcutInput` en Ajustes junto al hotkey de post-procesamiento, toast de error cuando no hay selección, i18n es/en. Commit `f4dd425`.
4. ⬜ Validación — sin tests automatizados (la lógica central depende de Ctrl+X del SO, portapapeles real y una llamada de red — no mockeable sin infraestructura nueva). `cargo check`/`clippy`/`tsc` limpios. **Falta 100% manual**: seleccionar texto real en otra app, presionar el hotkey, dictar una instrucción, confirmar que el resultado se pega correctamente — y probar el caso sin selección (debe mostrar el toast, no arrancar a grabar).

**Estado:** 3/4 completo, funcional end-to-end. Es la fase con más riesgo real de las 4 — nadie la ha probado con la app corriendo todavía.

### Fase 5 — Pausar media al dictar

Pausa la música o el video que esté sonando (Spotify, video del navegador, etc.) mientras dictas y lo reanuda al terminar. Usa el control de sesiones de media del sistema para pausar **solo** las sesiones que están realmente reproduciéndose, recordar cuáles fueron, y al terminar reanudar exactamente esas — nunca destraba media que el usuario ya había pausado a mano. Windows por ahora; no-op en macOS/Linux.

**Checklist:**

1. ✅ Backend — módulo `media_control.rs`: en Windows enumera las sesiones de media del sistema, pausa las que están en `Playing`, guarda sus `SourceAppUserModelId`, y en el resume reanuda solo esas. Init COM en el worker thread (lo exige la API WinRT). No-op en otras plataformas. Commit `f07d017`.
2. ✅ Enganche — `TranscribeAction::start` pausa en un thread aparte para no sumar latencia al keypress→captura; `stop`, la rama de error de `start` y la ruta de cancelar (`utils.rs`) llaman `resume_paused_media()`, que es no-op si no se pausó nada (así ninguna vía de salida deja media colgada). Commit `f07d017`.
3. ✅ Settings + comando — `pause_media_while_recording` (default `false`, para no sorprender al usuario) + `change_pause_media_while_recording_setting` + bindings. Cubierto en el test de reparación de settings corruptos. Commit `f07d017`.
4. ✅ Frontend — toggle `PauseMediaWhileRecording.tsx` en Ajustes → Sonido (junto a Cancelación de Ruido y Silenciar al Grabar), i18n es/en. Commit `f07d017`.
5. ⬜ Validación — `cargo test --lib` 118/118, `tsc --noEmit` limpio, 0 warnings. **Falta la parte manual**: dictar con música sonando, confirmar que se pausa al empezar y vuelve al soltar, y que no reanuda algo que ya estaba pausado.

**Estado:** funcional end-to-end, 4/5 pasos completos. Solo falta la misma clase de prueba manual que el resto (correr la app con media sonando).

## Sincronización con la base upstream — v0.9.1 (2026-07-11)

La base liberó **v0.9.1** (release de solo bug-fixes, ~31 PRs de la comunidad). Se adoptó completa con un merge del tag, preservando todo lo VozImperio. **27 PRs entraron tal cual**; **4 se adaptaron a mano** por colisión con marca/features: (1) el selector de tema Claro/Oscuro/Sistema se neutralizó a **dark imperial forzado** y se ocultó el toggle; (2) se **adoptó el salvage de settings de upstream** descartando el nuestro; (3) el reset de resampler anti-eco **coexiste** con nuestro supresor de ruido; (4) la cancelación de post-proceso colgado **coexiste** con AI Replace Selection.

Bonus de build: el bump `transcribe-cpp` 0.1.1 → **0.1.2** eliminó la necesidad del parche manual de CMake que antes había que reaplicar a mano. Validado: `cargo build` exit 0, `tsc --noEmit` 0 errores, `bindings.ts` regenerado. Detalle completo (PR por PR, tablas Antes/Ahora) en `cambios-de-configuracion-antes-de-fase-0.md`. Commits: `84dd4db` (merge) y `a8850c7` (bindings + limpieza).

**Pendiente de todas las fases y de esta sync:** la validación manual corriendo la app (nadie ha probado la build post-merge con la app abierta todavía).

## Backlog / candidatas futuras (no priorizadas aún)

- **Live preview de transcripción** — ventana flotante mostrando el texto mientras se dicta (útil solo si se migra a un motor de streaming).

## Notas de alcance

- Ninguna entrada de este documento debe nombrar herramientas o proyectos externos de terceros — se describen como decisiones/patrones técnicos propios de VozImperio.
- La sesión de investigación que originó este roadmap trabajó en paralelo con otra ventana de Claude Code sobre overlay/rebrand — antes de tocar código, revisar `git status` para no pisar trabajo en curso de otra sesión.
