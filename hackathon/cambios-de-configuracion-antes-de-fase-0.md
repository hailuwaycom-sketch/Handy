# Cambios de Configuración — antes de Fase 0

**Proyecto:** VozImperio (fork de Handy) — Hackathon Imperial
**Fecha:** 2026-07-08
**Deadline final:** 2026-07-30 (con entregas de avance intermedias)

Registro unificado de todo el trabajo hecho en ventanas paralelas antes de que arranque la Fase 0 de cualquier feature numerada: identidad visual, toolchain, fixes heredados de Handy, e investigación/ejecución inicial de la primera feature nueva.

---

## Toolchain y Rebrand

- **Resuelto el bug de compilación local**: `bun run tauri dev`/`build` fallaba con `No CMAKE_C_COMPILER could be found` en el sub-build `vulkan-shaders-gen` (usado para compilar shaders de Vulkan). Causas combinadas:
  1. `VsDevCmd.bat` roto en esta máquina (no encuentra `vswhere.exe`) → se usa `vcvars64.bat` directo.
  2. `ExternalProject_Add` de `vulkan-shaders-gen` no heredaba la arquitectura/toolset del proyecto padre → se forzó el generador `NMake Makefiles` para ese sub-proyecto (parche en el caché de Cargo, no en el repo).
  3. Límite de longitud de ruta de Windows (250 caracteres) al compilar dentro de `source/src-tauri/target/...` → se usa `CARGO_TARGET_DIR=C:\h-vozimperio` (ruta corta).

  | Antes                                                                                                                                           | Ahora                                                                |
  | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
  | `bun run tauri dev`/`build` fallaba con `No CMAKE_C_COMPILER could be found` en el sub-build `vulkan-shaders-gen`, no compilaba en esta máquina | Compila y corre limpio con los 3 fixes de toolchain aplicados juntos |

- Generado **build de release autónomo** (`C:\h-vozimperio\release\handy.exe`) y **acceso directo en el escritorio** (`VozImperio.lnk`) — ya no depende de tener el servidor de desarrollo corriendo.

### Rebrand — huecos que nunca se habían cerrado

Al revisar la app corriendo se detectó que el rebrand original solo tocó íconos de ventana, título y algunos strings — varias piezas seguían siendo 100% Handy:

| Elemento                                                                          | Antes                                        | Ahora                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Tema de color de toda la app (`theme.css`)                                        | Paleta rosa original de Handy (nunca tocada) | Paleta Imperial: dorado `#F0B848`, negro-verdoso `#0A0D0C`, verde `#183820` |
| Íconos de bandeja/notificación (tray idle/recording/transcribing, claro y oscuro) | Mano de Handy                                | Logo exacto VozImperio, con badge de color por estado (dorado/rosa/verde)   |
| Ícono pestaña "General" (sidebar)                                                 | Mano (`HandyHand`)                           | Corona (`Crown`, lucide-react)                                              |
| Tooltip de bandeja del sistema                                                    | "Handy v0.9.0 (Dev)"                         | "VozImperio v1"                                                             |
| Pantalla Acerca de                                                                | Solo versión de Handy                        | + línea "Versión Imperio 1"                                                 |
| Idioma interfaz + dictado                                                         | Auto-detección (podía salir en inglés)       | Fijo en español por defecto                                                 |
| Autostart / Silenciar durante grabación / Retroalimentación de audio              | Desactivados por defecto                     | Activados por defecto                                                       |

### Verificación funcional

- Dictado, transcripción y pegado (Ctrl+V) confirmados funcionando correctamente **en cualquier monitor**, incluida la segunda pantalla.
- Overlay (indicador visual de grabación) corregido para multi-monitor con DPI mixto — bug real de Handy stock (comparaba posiciones dividiendo por el `scale_factor()` de cada monitor por separado); ahora compara directo en píxeles físicos.
- Waveform del overlay hecho reactivo al mic; botón de cancelar hecho legible a tamaño pill.

### Ajustes visuales incrementales (dados uno a uno)

- **Jerarquía de versión invertida** — `src/components/settings/about/AboutSettings.tsx`: "Versión Imperio 1" ahora es la línea grande/prominente; "Handy v{version}" pasó a chica y gris debajo (commit `6bc01b0`).

  | Antes                                                                                                                           | Ahora                                                                                                                           |
  | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | "Handy v0.9.0" en texto grande (`text-sm`), arriba. "Versión Imperio 1" en texto chico y gris (`text-xs text-mid-gray`), abajo. | "Versión Imperio 1" en texto grande (`text-sm`), arriba. "Handy v0.9.0" en texto chico y gris (`text-xs text-mid-gray`), abajo. |

- **Investigación descartada** — una captura de "Apoyar al Fork / Autor Original" resultó ser de una app de referencia externa (la misma investigada más abajo), no de VozImperio. Se verificó que ningún link de GitHub en nuestro código (`AboutSettings.tsx`, `UpdateChecker.tsx`) apunta mal — ambos ya correctos a `github.com/cjpais/Handy`. Sin cambios de código.

## Investigación de Features y Supresión de Ruido (RNNoise)

Se investigaron forks más avanzados de Handy en el ecosistema open source, leyendo código fuente real (no solo changelogs), organizado en 3 áreas: núcleo de speech processing, inteligencia de texto (glosario/LLM), y superficie de producto (overlay, voice commands, browser connector, etc.).

### Hallazgo clave: varias features "candidatas a portar" ya existen en VozImperio

Antes de recomendar portar nada se auditó el código real de `Handy/source` y se encontró que:

- **Glosario inteligente / Custom Words con fuzzy matching** (Levenshtein + Soundex, n-gramas, threshold configurable) — **ya está 100% implementado**: `audio_toolkit/text.rs::apply_custom_words`, wireado en `managers/transcription.rs`, settings (`custom_words`, `word_correction_threshold`, default 0.18), UI en Advanced Settings y Debug Settings.
- **VAD con suavizado** (onset/hangover/prefill frames) — ya implementado en `audio_toolkit/vad/smoothed.rs`.
- **Overlay con posicionamiento por monitor+cursor+`scale_factor()`** — ya implementado en `overlay.rs` (el bug de segunda pantalla se arregló en esta misma jornada, commit `8b006cd`, ver arriba).

Esto evitó duplicar trabajo ya hecho — el plan original de "portar el glosario" quedó descartado por innecesario.

### Gap real identificado: Supresión de ruido (RNNoise)

No existía ningún módulo de noise suppression en `audio_toolkit/audio/` ni settings relacionados. Enfoque validado: `nnnoiseless` (RNNoise, que solo opera a 48kHz/480 samples) puenteado con resampling bidireccional 16kHz↔48kHz vía `rubato` — dependencia que ya estaba presente en `Cargo.toml`.

Checklist de 5 fases ejecutado:

1. **Backend — módulo**: `nnnoiseless` en `Cargo.toml`, nuevo `audio_toolkit/audio/noise_suppression.rs`, exportado en `audio_toolkit/audio/mod.rs`, con tests unitarios.
2. **Enganche al pipeline**: insertado en `recorder.rs::run_consumer` entre `frame_resampler` y `process_frame` (VAD), detrás de un flag.
3. **Settings**: campo `noise_suppression_enabled: bool` (default `false`) + comando Tauri + bindings.
4. **Frontend**: `MicrophoneNoiseCancellation.tsx` (toggle) + registro en settings store + i18n es/en.
5. **Validación**: pendiente — requiere hablar con ruido de fondo real, no es automatizable.

**Estado:** pasos 1-4 de 5 completados y commiteados. Queda solo el paso 5 (validación manual con audio real).

Commits:

- `be5d3c1` — `feat(audio): modulo de supresion de ruido (RNNoise)`. Módulo `NoiseSuppressor`: RNNoise (`nnnoiseless`) puenteado a 48kHz vía `rubato` para limpiar frames de 16kHz/30ms. 4 tests unitarios pasando (silencio se mantiene silencioso, largo de salida igual al de entrada, tono limpio sobrevive el denoise, tamaños de frame no estándar caen a passthrough sin panic). Todavía no conectado al pipeline real en este commit.
- `24c80a9` — `feat(audio): enganchar supresion de ruido al pipeline + setting`. `recorder.rs::run_consumer` ahora construye un `NoiseSuppressor` por sesión en `Cmd::Start` (si `noise_suppression_enabled` viene activo) y lo aplica en `handle_frame` antes de VAD/emit; si falla el init, cae a passthrough con un warning. Nuevo setting `noise_suppression_enabled: bool` (default `false`) + comando `change_noise_suppression_enabled_setting` + bindings regenerados. Validado con `cargo check`, `cargo test --lib` (101/101) y `cargo clippy` limpio.

  El setting y el toggle en sí son código nuevo, pero el pipeline de grabación sí es una función que ya existía y cambió de comportamiento:

  | Antes                                                                      | Ahora                                                                                                                                        |
  | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
  | `run_consumer` pasaba cada frame directo del `frame_resampler` al VAD/emit | Con el flag activo, cada frame pasa primero por `NoiseSuppressor` antes de llegar al VAD/emit; si falla, passthrough sin romper la grabación |

- `935f924` — `feat(audio): toggle de cancelacion de ruido en Ajustes`. `MicrophoneNoiseCancellation.tsx` (mismo patrón que `MuteWhileRecording.tsx`) en Ajustes → Sonido, debajo del selector de micrófono. Wireado en `settingsStore.ts`. Claves i18n es/en bajo `settings.sound.noiseCancellation.*`. Validado con `tsc --noEmit` sin errores.

**Nota sobre el paso 5 (validación):** todo lo automatizable ya corrió limpio (tests, clippy, typecheck). Falta hablar con ruido de fondo real (ventilador, teclado, música baja) con el toggle en Ajustes → Sonido → Cancelación de Ruido apagado y luego prendido, comparar la transcripción, y confirmar que no se pierde voz real ni se nota demora. Queda pendiente de que alguien lo pruebe corriendo la app.

**Paso 5/5 cerrado (2026-07-11):** validación manual hecha con la app corriendo. Primer intento con música/video de fondo no mostró diferencia perceptible con el toggle on/off — verificado por log (`noise_suppression_enabled` pasó de `false` a `true`, sin warnings de fallo de inicialización, `NoiseSuppressor` se construyó bien en cada grabación) que el pipeline funcionaba correctamente; la falta de diferencia se debía al tipo de ruido usado, no a un bug. RNNoise está entrenado para ruido estacionario (ventilador, zumbido, estática) y no suprime música ni voces de fondo por su similitud espectral con la voz humana. Repetido el test con ruido estacionario real: confirmado funcionando, sin comerse voz real ni introducir demora perceptible.

Como resultado, se actualizó el tooltip para dejar claro el alcance real de la feature (commit `1507d2c`):

| Antes                                                                                           | Ahora                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Limpia el ruido de fondo del micrófono antes de transcribir (usa más CPU por segundo grabado)" | "Limpia ruido de fondo estacionario del micrófono (ventilador, zumbido, estática) antes de transcribir. No filtra música ni otras voces. Usa más CPU por segundo grabado." |

**Estado final: 5/5 completo.** Fase 1 (RNNoise) cerrada.

### Reparación de settings corruptos

Con la Fase 1 de RNNoise funcional, se avanzó al siguiente gap identificado en la investigación inicial: si un solo campo de `settings.json` tenía el tipo equivocado, `serde_json::from_value` fallaba completo y se perdían TODOS los settings del usuario de un tirón — no había reparación parcial.

- `dc4ea8d` — `feat(settings): reparar campos corruptos en vez de resetear todo`. Nuevo `repair_settings_value()` en `settings.rs`: usa `serde_path_to_error` (dependencia nueva) para ubicar el JSON-path exacto del campo que no parsea, lo elimina de ese valor (cada campo de `AppSettings` ya tiene `#[serde(default = ...)]`, así que vuelve a su default en el siguiente intento) y reintenta hasta 20 veces. Solo cae a defaults completos si de verdad no se puede reparar. El valor corrupto original se respalda en la key `settings_corrupted_backup` antes de sobreescribir. Enganchado en los 2 puntos de carga (`load_or_create_app_settings` y `get_settings`). 6 tests nuevos. 107/107 tests, `cargo clippy` limpio.

  Feature invisible en el día a día (nadie nota que sus settings sobrevivieron una corrupción que antes los hubiera borrado) — no aplica tabla antes/después porque no había ningún mecanismo de reparación previo, solo el reset total.

### Text Replacement determinista (Fase 3 — numeración alineada con `manual-de-cambios.html`, donde Fase 02 ya la ocupa la reparación de settings)

Con la Fase 1 (RNNoise) funcional salvo la prueba manual, se arrancó el siguiente feature del blueprint: reglas de find/replace deterministas, complementarias al glosario fuzzy (ese corrige palabras sueltas por parecido; esto reemplaza patrones exactos que el usuario define a propósito).

- `82f4a15` — `feat(text): reglas deterministas de find/replace (regex opcional)`. `TextReplacementRule` (find/replace/use_regex/case_sensitive) + campo `text_replacement_rules` en settings. `apply_text_replacements()` en `text.rs`: el modo literal escapa el patrón antes de pasarlo al motor de regex (para que `.`, `(`, etc. no se interpreten como metacaracteres) y usa `NoExpand` en el reemplazo para que un `$1` literal no se expanda — solo el modo regex expande grupos de captura. Un regex inválido se salta con un warning en vez de romper el resto del pipeline. Enganchado al final de `post_process_transcription_text` (después del glosario y el filtro de muletillas), único punto de post-proceso, cubre offline y streaming por igual. Comando `update_text_replacement_rules` (mismo patrón wholesale-replace que `update_custom_words`). 11 tests nuevos, 118/118 en total, `cargo check` limpio.
- `0d71cdf` — `chore(bindings): regenerar bindings.ts para TextReplacementRule`. Tipo `TextReplacementRule` + función `updateTextReplacementRules` agregados a los bindings TypeScript.
- `b0223ab` — `feat(text): UI de Text Replacement en Ajustes`. `TextReplacementSettings.tsx` (mismo patrón que `CustomWords.tsx`): campo find, campo replace, checkboxes "Regex" y "Sensible a mayúsculas", botón agregar; reglas existentes listadas con badges y botón de quitar. Registrado en Ajustes Avanzado justo debajo de Palabras Personalizadas. Wireado en `settingsStore.ts`. i18n es/en bajo `settings.advanced.textReplacement.*` — los otros 18 idiomas quedan pendientes (mismo gap ya existente desde la Fase 1, `check-translations` es un script manual, no bloquea build). Validado con `tsc --noEmit` limpio.

  Backend, bindings y frontend completos — funcional end-to-end. Validación automatizada completa (11 tests + 118/118 del proyecto + tsc limpio); falta la misma prueba manual que la Fase 01: correr la app y agregar una regla real desde Ajustes.

### AI Replace Selection (Fase 4)

Último ítem del backlog original, y el de mayor esfuerzo real: seleccionar texto en cualquier app, dictar una instrucción, y que el mismo proveedor LLM de post-procesamiento reescriba la selección in-place. A diferencia de las 3 fases anteriores, esta necesitó tocar el corazón del pipeline de dictado (`TranscribeAction::stop`, ~300 líneas de orquestación async: overlay, tray, guardado de WAV, cancelación) en vez de ser un módulo aislado — se evaluó el riesgo explícitamente antes de arrancar y se decidió seguir adelante con una integración quirúrgica en vez de duplicar esa lógica.

- `685f01a` — `feat(actions): AI Replace Selection`. `capture_selected_text()` en `actions.rs`: simula Ctrl+X vía `enigo` (nueva función espejo `send_cut_ctrl_x` en `input.rs`, mismo patrón que `send_paste_ctrl_v` existente) y lee el portapapeles; si no había nada seleccionado (portapapeles sin cambios), restaura el valor previo y aborta antes de arrancar a grabar. `transform_selection_with_llm()` reusa el mismo proveedor/modelo/API key configurados para post-procesamiento — sin UI de configuración nueva. `TranscribeAction` pasó de un campo `post_process: bool` a un enum `TranscribeMode` (Dictate / DictateWithPostProcess / ReplaceSelection); el 95% de `start()`/`stop()` quedó intacto, solo se bifurca en el punto donde se decide el texto final a pegar. Si el LLM falla, se restaura la selección original — nunca se pierde el texto cortado. El WAV de la instrucción se borra en vez de quedar huérfano (no se guarda en el historial de dictado, a diferencia del dictado normal). Nuevo binding `ai_replace_selection` (`ctrl+alt+space` en Windows/Linux) registrado/desregistrado en los 3 motores de shortcuts (`shortcut/mod.rs`, `handy_keys.rs`, `tauri_impl.rs`) con el mismo gate que `transcribe_with_post_process`: requiere post-procesamiento habilitado. 118/118 tests (sin tests nuevos — la lógica central depende de Ctrl+X del SO, portapapeles real y una llamada de red, no mockeable sin infraestructura nueva), `cargo clippy` limpio en el diff.
- `f4dd425` — `feat(actions): UI de AI Replace Selection`. `ShortcutInput` para el nuevo binding junto al de post-procesamiento en Ajustes (mismo grupo, mismo gate). Toast nuevo en `App.tsx` para el evento `ai-replace-selection-error` que el backend emite cuando se presiona el hotkey sin nada seleccionado — sin esto el usuario no tenía ninguna señal de que algo falló. i18n es/en. `tsc --noEmit` limpio.

  Backend y frontend completos — funcional end-to-end, pero es la fase con más riesgo real de las 4: no hay tests automatizados posibles para la ruta principal (Ctrl+X real + portapapeles real + LLM real), y toca la máquina de estados de grabación que ya funcionaba. **Validación 100% manual pendiente**: seleccionar texto real en otra app, presionar el hotkey, dictar una instrucción, confirmar que el resultado se pega correctamente — y probar también el caso sin selección (debe mostrar el toast, no arrancar a grabar).

## Sincronización con la base upstream — Handy v0.9.1 (2026-07-11)

La base `cjpais/Handy` liberó **v0.9.1** (10-jul-2026), una release de solo bug-fixes con muchas contribuciones de la comunidad (~31 PRs). Se adoptó **completa** mediante un merge del tag `v0.9.1`, preservando todo el trabajo VozImperio previo. De los 31 PRs, **27 entraron tal cual** (sin tocar nada nuestro) y **4 se adaptaron a mano** porque colisionaban con features/marca VozImperio. Cero perdidos.

**Salvaguarda antes de tocar nada:** se creó la rama `backup/pre-v0.9.1` (red de seguridad, por el antecedente de pérdida de trabajo) y el merge se resolvió en una rama temporal antes de integrarlo a `feature/vozimperio-rebrand`.

### Los 4 conflictos adaptados (no se tomó ni "lo nuestro" ni "lo de upstream" a ciegas)

| PR upstream                                      | Colisionaba con                                      | Resolución VozImperio                                                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selector de tema Claro/Oscuro/Sistema            | Paleta imperial dark fija                            | Se trajo el mecanismo, pero **ambos pares (claro y oscuro) apuntan a la paleta imperial oscura** y el selector se ocultó de Ajustes → la marca queda dark siempre, sin modo claro que la diluya |
| Salvamento de settings corruptos (upstream)      | Nuestro `repair_settings_value` (commit `dc4ea8d`)   | Se **adoptó el `salvage_settings` de upstream** y se descartó el nuestro — hacían lo mismo, desarrollados en paralelo el mismo día; alinearse con upstream reduce fricción en futuros merges    |
| Reset del resampler entre grabaciones (anti-eco) | Nuestro init de `NoiseSuppressor` en `recorder.rs`   | Se **combinaron ambos**: al iniciar cada grabación corre el reset del resampler _y_ la construcción del supresor de ruido                                                                       |
| Cancelar post-proceso colgado                    | Nuestra rama de AI Replace Selection en `actions.rs` | Se **combinaron**: la rama de dictado normal gana la cancelación de upstream; la rama de AI Replace queda intacta                                                                               |

### Fixes de upstream incorporados sin colisión (los 27 restantes)

- **Audio/transcripción:** init de micrófono más rápido · timestamps automáticos en todos los modelos · throttle del IPC de nivel de mic (mitiga fuga de memoria de WebKit) · ampersands preservados en Custom Words · gate de whisper por arquitectura de modelo.
- **Bandeja (tray):** seguimiento del estado del ícono · loguear fallos en vez de panic · ícono visible en barra de tareas oscura de Windows.
- **UX:** "Procesando" en el overlay Live no-streaming · paste delay tras la tecla + rango de slider ampliado · errores de descarga visibles en el onboarding · defensa contra prompt-injection en el prompt de post-proceso por defecto.
- **Estabilidad:** no abortar al salir (mutexes envenenados) · push-to-talk bajo auto-repeat de X11.
- **i18n:** neerlandés, japonés, italiano, nepalí + claves nuevas en los 22 idiomas.
- **Deps/build:** `handy-keys` 0.3.0 · Visual Studio redistributable incluido con la app · rutas Unicode/cirílicas arregladas.

### Ganancia de build: `transcribe-cpp` 0.1.1 → 0.1.2

El bump de la dependencia nativa **eliminó la necesidad del parche manual de CMake** que antes había que reaplicar a mano al caché de Cargo (ver "Toolchain y Rebrand" arriba, fix #2). La 0.1.2 reescribió el sub-build de `vulkan-shaders-gen` con detección de compilador propia.

| Antes (transcribe-cpp 0.1.1)                                                                                                                                                                              | Ahora (transcribe-cpp 0.1.2, con v0.9.1)                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| El sub-build `vulkan-shaders-gen` fallaba con `No CMAKE_C_COMPILER could be found`; había que parchear a mano `ggml-vulkan/CMakeLists.txt` en el caché de Cargo (parche frágil que `cargo clean` borraba) | `cargo build` compila `transcribe-cpp-sys 0.1.2` limpio, sin parche alguno (build debug completo 5m26s, exit 0) |

### Validación

- **Rust:** `cargo build` exit 0 (compila con todos nuestros cambios + la dep 0.1.2).
- **Frontend:** `tsc --noEmit` **0 errores**.
- **bindings.ts:** regenerado por tauri-specta desde el Rust ya mergeado — contiene nuestros comandos (noise, text-replacement, AI replace, pause-media) y los de upstream (theme, paste-delay-after) como fuente de verdad autoritativa.

---

## Commits (orden cronológico)

- `3c89ab1` — `feat(rebrand): tema imperial completo, iconos de tray y defaults en espanol`
- `8b006cd` — `fix(overlay): correct multi-monitor positioning with mixed DPI scales`
- `904c00f` — `fix(overlay): make waveform visibly reactive to mic input`
- `9d1abde` — `fix(overlay): make cancel button legible at pill size`
- `be5d3c1` — `feat(audio): modulo de supresion de ruido (RNNoise)`
- `24c80a9` — `feat(audio): enganchar supresion de ruido al pipeline + setting`
- `935f924` — `feat(audio): toggle de cancelacion de ruido en Ajustes`
- `dc4ea8d` — `feat(settings): reparar campos corruptos en vez de resetear todo` _(reemplazado luego por el `salvage_settings` de upstream en el merge de v0.9.1)_
- `6bc01b0` — `fix(about): jerarquia de version invertida (Imperio primero, Handy secundario)`
- `82f4a15` — `feat(text): reglas deterministas de find/replace (regex opcional)`
- `0d71cdf` — `chore(bindings): regenerar bindings.ts para TextReplacementRule`
- `b0223ab` — `feat(text): UI de Text Replacement en Ajustes`
- `685f01a` — `feat(actions): AI Replace Selection`
- `f4dd425` — `feat(actions): UI de AI Replace Selection`
- `f07d017` — `feat(media): pausar y reanudar media del sistema al dictar`
- `84dd4db` — `Merge tag 'v0.9.1' upstream en feature/vozimperio-rebrand`
- `a8850c7` — `chore(bindings): regenerar bindings.ts tras merge v0.9.1 + limpiar import`

Todos en la rama `feature/vozimperio-rebrand`.
