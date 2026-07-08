# VozImperio / Handy Fork

## Estado del proyecto

Proyecto base para el Hackathon Imperial. El objetivo es crear un rebrand de Handy que mantenga su esencia:

**presionar una tecla, hablar y transcribir.**

Debe ser gratis, open source, sin login y local por defecto.

## Estructura local

- `source/`: codigo clonado desde `https://github.com/cjpais/handy`.
- `branding/`: guia visual y decisiones de marca de VozImperio.

## Branding aprobado

- Nombre provisional: `VozImperio`.
- Slogan: `Habla. Imperio escribe.`
- Icono principal: microfono con corona minimalista.
- Icono secundario / tray / favicon: V formada con onda de voz y corona.
- Boton de grabacion: boton de dictado / press-to-talk.
- Landing / badge premium: sello imperial con onda de audio, corona y pluma.

## Entorno verificado

En Windows se instalaron y verificaron:

- Bun.
- Rust / Cargo.
- CMake.
- Visual Studio Build Tools con C++.
- Vulkan SDK.
- Modelo Silero VAD para desarrollo.

El build base de Handy compila con:

```powershell
cmd /c "call ""C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat"" -arch=x64 && set ""VULKAN_SDK=C:\VulkanSDK\1.4.350.0"" && set ""PATH=%USERPROFILE%\.cargo\bin;%ProgramFiles%\CMake\bin;C:\VulkanSDK\1.4.350.0\Bin;%PATH%"" && set ""CARGO_TARGET_DIR=C:\h-vozimperio"" && bun run tauri build --no-bundle"
```

El ejecutable base verificado queda en:

```text
C:\h-vozimperio\release\handy.exe
```

## Avance de rebrand funcional

Rama de trabajo:

```text
feature/vozimperio-rebrand
```

Cambios aplicados en la app:

- Nombre visible: `VozImperio`.
- Ventana principal: titulo `VozImperio`.
- Sidebar: logo textual de VozImperio con microfono y corona.
- Paleta base: fondo oscuro imperial, dorado principal y verde de estado.
- Textos principales en espanol actualizados para `Dictado`, `Phraser` y VozImperio.
- Identificador interno separado: `com.imperioagentico.vozimperio`.
- Actualizaciones automaticas desactivadas por defecto para evitar apuntar a releases de Handy.
- Iconos Windows/tray reemplazados por identidad VozImperio.
- Overlay de grabacion ajustado con `Mini onda viva`: tres barras verde/dorado para comunicar escucha activa.

Verificacion:

- `bun run build` pasa correctamente.
- `bun run tauri build --debug --no-bundle` pasa correctamente.
- Ejecutable debug generado:

```text
C:\h-vozimperio\debug\handy.exe
```

Configuracion local de prueba:

- Datos de VozImperio:

```text
C:\Users\Trabajo\AppData\Roaming\com.imperioagentico.vozimperio
```

- Modelo copiado para prueba rapida: `ggml-tiny.bin`.
- Idioma configurado para prueba: `es`.

## Assets de icono

Generador reproducible:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\generate_vozimperio_windows_icons.py
```

Archivos reemplazados:

- `source/src-tauri/icons/*.png`
- `source/src-tauri/icons/icon.ico`
- `source/src-tauri/resources/tray_*.png`
- `source/src-tauri/resources/handy.png`
- `source/src-tauri/resources/recording.png`
- `source/src-tauri/resources/transcribing.png`

## Exploraciones visuales

Indicadores activos para el overlay de grabacion:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\overlay-indicator-concepts.png
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\overlay-indicator-concepts.html
```

Opciones comparadas:

- Pulso imperial.
- Mini onda viva.
- Punto dual.
- Corona abstracta.
- Linea de energia.
- V imperial micro.

Ronda 1 de logos SVG:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-svg-ronda-1
```

Archivos clave:

- `logo-ronda-1-board.png`: tablero visual para revisar rapido.
- `logo-ronda-1-board.html`: tablero con SVGs reales incrustados.
- `01-microfono-corona.svg`: simbolo principal, voz + Imperio.
- `02-v-onda-corona.svg`: icono secundario, fuerte para tray/favicon.
- `03-sello-voz.svg`: badge/landing.
- `04-pluma-dictado.svg`: escritura por voz.
- `05-onda-corona.svg`: audio abstracto.
- `06-vi-monograma.svg`: marca compacta propia.

Referencias premium separadas desde la imagen aprobada:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\selected-logo-references
```

Archivos:

- `01-microfono-corona.png`
- `03-microfono-corona-premium.png`
- `04-sello-microfono.png`
- `selected-logo-references-board.png`

Nota de criterio: estas referencias son PNG premium con luz, volumen y textura. El SVG final debe capturar la silueta y el sistema visual, pero los efectos premium se exportaran como PNG/ICO para app icon, landing y Windows.

Workflow de vectorizacion:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-vectorization-workflow.md
```

Decision: usar herramientas AI de image-to-SVG/text-to-vector como apoyo, pero hacer limpieza final manual en SVG. VectoSolve/Recraft sirven como aceleradores, no como identidad final sin revision.

Logo 1 redibujado como SVG limpio:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-clean-1
```

Archivos:

- `vozimperio-logo1-clean.svg`: candidato principal para app icon.
- `vozimperio-logo1-lockup.svg`: lockup con nombre y slogan corto.
- `preview.html`: comparacion de referencia premium vs SVG limpio.
- `preview-screenshot.png`: captura del preview.

Decision de criterio: esta version prioriza silueta clara, micrófono con corona, pedestal dorado y lectura en tamaños pequenos. Si se aprueba, se usa como base para regenerar PNG/ICO de Windows, tray y favicon.

Iconos regenerados desde el logo 1 limpio:

- Windows/app icon: exportado desde `vozimperio-logo1-clean.svg`.
- Tray: variante simplificada con corona, microfono y soporte para mantener lectura pequena.
- Estados tray:
  - idle: dorado.
  - recording: rosa/fucsia.
  - transcribing: verde.

Vista de control:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-clean-1\icon-export-preview.png
```

Verificacion despues de regenerar iconos:

- `bun run build` pasa correctamente.
- `bun run tauri build --debug --no-bundle` pasa correctamente.
- Ejecutable debug actualizado:

```text
C:\h-vozimperio\debug\handy.exe
```

- Proceso abierto y confirmado con titulo de ventana `VozImperio`.

## Landing inicial

Landing estatica para demo/publicacion:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\index.html
```

Assets principales:

- `landing/assets/vozimperio-icon.svg`
- `landing/assets/vozimperio-lockup.svg`
- `landing/assets/landing-concept-reference.png`
- `landing/downloads/VozImperio-Windows-debug.exe`

Capturas de verificacion:

- `landing/landing-desktop.png`
- `landing/landing-mobile.png`

Decision: la landing es independiente del codigo Tauri para poder grabar video, publicar avance y luego moverla a hosting sin tocar la app principal. El boton `Descargar gratis` apunta por ahora al ejecutable debug local; en entrega final debe apuntar al instalador/release final.

Verificacion:

- Captura desktop 1440px sin overflow horizontal.
- Captura mobile 390px sin overflow visible.

## Material Hackathon

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\hackathon
```

Archivos:

- `post-avance-01.md`: texto listo para publicar avance en formato del Hackathon Imperial.
- `guion-video-demo-2min.md`: guion cronometrado para video maximo 2 minutos.
- `checklist-grabacion-demo.md`: pasos para grabar demo sin olvidar landing, app, dictado y pedido de feedback/dupla.

Decision: el primer avance debe vender funcionamiento + branding, no prometer demasiadas features futuras. El mensaje central es: VozImperio mantiene la esencia de Handy, ya funciona dictando en español y ahora tiene identidad visual/landing propia.

## Correccion logo achatado

El primer export de iconos se vio demasiado chato/encogido en Windows. Se abrio una nueva ronda para corregir proporciones y acercarse a las referencias 1, 3 y 4.

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-2
```

Archivos:

- `01-microfono-corona-alto.svg`
- `03-microfono-dorado-alto.svg`
- `04-sello-microfono-alto.svg`
- `preview.html`
- `preview-r2.png`

Criterio:

- Opcion 1: recomendada para app icon principal.
- Opcion 4: buena para landing, badge o sello.
- Opcion 3: premium, pero puede perder detalle en 32px.

Decision pendiente: elegir 1, 3 o 4 antes de regenerar iconos Windows/tray de nuevo.

## Logo 1 revision 3

Se corrigio nuevamente la opcion 1 porque la revision 2 seguia viendose achatada/encogida. El problema estaba en que el arco inferior se leia como sonrisa corta y la pata/base del microfono casi desaparecia.

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-3
```

Archivos:

- `01-microfono-corona-vertical.svg`
- `preview.html`
- `preview-r3.png`

Criterio: esta version vuelve a priorizar silueta vertical, U alta, pata central y base visible. Debe aprobarse visualmente antes de regenerar iconos Windows/tray.

## Logo 1 revision 4 profesional

Se midio la referencia y se recreo la opcion 1 con proporciones mas cercanas:

- Referencia dorada: aprox. `366x707`, ratio alto/ancho `1.93`.
- Revision 4 dorada: aprox. `370x700`, ratio alto/ancho `1.89`.

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-4
```

Archivos:

- `01-microfono-corona-pro.svg`
- `preview.html`
- `preview-r4.png`
- `r4-direct.png`

Correccion principal: el arco dorado ahora queda detras del microfono y mas abajo. Esto elimina el choque visual donde antes el arco invadia la base crema del microfono.

## Logo 1 revision 5 alto

Se aplico el ajuste pedido: hacer el simbolo mas alto y darle un poco mas de presencia a la corona.

Medicion del dorado:

- Referencia: `366x707`, ratio `1.93`.
- Revision 4: `370x700`, ratio `1.89`.
- Revision 5: `370x735`, ratio `1.99`.

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-5
```

Archivos:

- `01-microfono-corona-pro-tall.svg`
- `preview.html`
- `preview-r5.png`
- `r5-direct.png`

Cambio principal: brazos de la U subidos, micrófono alargado, base mas baja y corona ligeramente mas alta/ancha. Esta es la candidata actual para reemplazar iconos si se aprueba.

## Logo 1 revision 6 cuerpo/corona

Se aplicaron tres ajustes pedidos:

- Cuerpo blanco del microfono mas alto.
- Curva inferior del microfono menos mecanica/menos rectangular.
- Corona mas redonda, centrada y visualmente apoyada sobre el microfono.

Medicion:

- Revision 5 dorado: ratio `1.99`; cuerpo blanco: ratio `1.62`.
- Revision 6 dorado: ratio `1.96`; cuerpo blanco: ratio `1.68`.

Carpeta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-6
```

Archivos:

- `01-microfono-corona-seated.svg`
- `preview.html`
- `preview-r6.png`
- `r6-direct.png`

Esta version mejora la verticalidad del cuerpo blanco y hace que la corona se lea menos flotante.

## Fuente SVG trazada y logo revision 7

El archivo externo:

```text
C:\Users\Trabajo\Downloads\01-source-trimmed.svg
```

se renderizo para usarlo como guia visual:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\source-trimmed-review\01-source-trimmed-render.png
```

Conclusion: ayuda como referencia de silueta y postura, pero no debe usarse directo como logo final porque tiene mucho ruido de vectorizacion y demasiados nodos.

Se creo una revision 7 basada en esa guia:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-revision-7
```

Archivos:

- `01-microfono-corona-source-guided.svg`
- `preview.html`
- `preview-r7.png`
- `r7-direct.png`

Medicion del dorado:

- SVG trazado renderizado: ratio `1.92`, centro Y aprox. `520`.
- Revision 7: ratio `1.84`, centro Y aprox. `514`.

Criterio: la revision 7 toma la postura mas asentada del SVG trazado, mantiene un SVG limpio y deja la U ligeramente mas abierta para lectura en tamanos pequenos. Si se busca maxima fidelidad al trazado, el siguiente ajuste es estrechar la U.

## Siguiente foco

1. Probar dictado manual en la ventana rebrandeada.
2. Verificar visualmente barra de tareas y tray en Windows.
3. Aprobar o ajustar `logo-revision-7/01-microfono-corona-source-guided.svg`.
4. Regenerar iconos Windows/tray con el logo elegido.
5. Publicar avance del Hackathon Imperial usando `post-avance-01.md`.
6. Grabar demo de maximo 2 minutos usando `guion-video-demo-2min.md`.
7. Despues pasar al primer bonus: glosario inteligente para palabras/nombres.

## Landing opcion 2 terminal

Se creo una segunda propuesta de landing en estilo terminal oscuro para VozImperio. Mantiene la paleta del proyecto:

- Fondo negro imperial `#0a0c10`.
- Dorado principal `#ffc83d`.
- Verde/mint tecnico `#7ed3a4`.
- Estados verde, ambar y rojo.

La opcion 2 enfatiza una lectura mas tecnica para el Hackathon:

- Grid cibernetico de 56px.
- Efecto CRT con lineas de escaneo.
- Encabezado tipo herramienta dev.
- Prompt `$` como recurso visual principal.
- Terminal `vozimperio.session.trace`.
- KPI cards: `1 tecla`, `local`, `ES`, `open`.
- Secciones `trace de dictado` y `roadmap bonus`.

Archivos:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing-terminal\index.html
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing-terminal\landing-terminal-desktop.png
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing-terminal\landing-terminal-mobile.png
```

Criterio: usar esta opcion si queremos vender VozImperio como herramienta local/dev/agentic. Usar la landing anterior si queremos una presentacion mas general y comercial.

## Landing oficial 1.1

Decision: la landing oficial sigue siendo la opcion 1 por ser mas clara, comercial y directa para el Hackathon. La opcion 2 queda como referencia visual tecnica.

Se creo la version `1.1` tomando motion e interaccion de la opcion terminal sin cambiar la esencia visual:

- Demo de dictado animada: el texto se escribe automaticamente en la ventana de producto.
- Boton `Ver demo` reproduce la simulacion y enfoca la vista previa.
- Ventana de app con tilt suave al mover el mouse.
- Reveal progresivo de cards/secciones al hacer scroll.
- Barras/puntos de audio con pulso mas vivo.
- Hover states mas claros en botones, features y pasos.
- Soporte `prefers-reduced-motion` para usuarios que reduzcan animaciones.

Archivos actualizados:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\index.html
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\styles.css
```

Capturas:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\landing-1-1-desktop.png
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\landing-1-1-mobile.png
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\landing-1-1-mobile-viewport.png
```

Criterio: esta version es la candidata para landing oficial del video demo de 2 minutos.

## Material Hackathon actualizado

Se actualizo el material de publicacion y grabacion para reflejar la landing oficial `1.1`:

- `hackathon/post-avance-01.md`: ajustado para mencionar landing 1.1 y motion.
- `hackathon/post-avance-02.md`: nuevo post listo para publicar como avance de dia 1.
- `hackathon/guion-video-demo-2min.md`: actualizado para mostrar primero landing 1.1, demo animada y luego demo real.
- `hackathon/checklist-grabacion-demo.md`: actualizado con capturas 1.1 y orden recomendado de grabacion.

Criterio: publicar avances temprano en Skool para recibir feedback antes de cerrar la version final.

## Paquete Skool avance 02

Se preparo un paquete listo para publicar en Skool:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\hackathon\avance-02
C:\Users\Trabajo\Desktop\Developer\software\Handy\hackathon\avance-02-skool-package.zip
```

Contenido principal:

- `post-para-skool.md`: texto listo para copiar/pegar.
- `01-landing-1-1-desktop.png`: captura desktop.
- `02-landing-1-1-mobile.png`: captura mobile.
- `03-resumen-visual-avance-02.png`: imagen resumen para abrir el post con mas impacto.
- `README.md`: orden recomendado de adjuntos y comentario corto para buscar dupla.

## Logo exacto aplicado

Se recibio el archivo:

```text
C:\Users\Trabajo\Downloads\vozimperio-logo-exacto.svg
```

El archivo no era SVG vector puro: contenia un PNG incrustado en base64. Se extrajo el PNG interno y se guardo como fuente exacta:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\branding\logo-exacto\vozimperio-logo-exacto-extracted.png
```

Se aplico esta imagen exacta en:

- Landing oficial `1.1`.
- Poster/resumen visual del avance 02.
- Componente React `VozImperioLogo`.
- Iconos Windows generados por `branding/generate_vozimperio_windows_icons.py`.

Assets nuevos:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\assets\vozimperio-icon-exacto.png
C:\Users\Trabajo\Desktop\Developer\software\Handy\source\src\assets\vozimperio-icon-exacto.png
```

Verificacion:

- `bun run build`: correcto.
- `bun run tauri build --no-bundle`: correcto.
- Ejecutable generado:

```text
C:\h-vozimperio\release\handy.exe
```

El ejecutable nuevo se copio al boton de descarga de la landing:

```text
C:\Users\Trabajo\Desktop\Developer\software\Handy\landing\downloads\VozImperio-Windows-debug.exe
```
