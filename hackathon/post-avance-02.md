# Avance 02 — VozImperio (Hackathon Imperial)

**VozImperio** — _Habla. Imperio escribe._

Desde el último avance (identidad + landing) metí una jornada larga de ingeniería real sobre el motor de dictado. Cuatro features nuevas, todas commiteadas y con tests pasando.

**Lo que se sumó hoy:**

- **Glosario inteligente** (el bonus que pedía dupla en el avance 01) — resulta que ya estaba resuelto en la base del proyecto: corrección fuzzy de nombres/palabras por parecido fonético y ortográfico, umbral configurable desde Ajustes. ✅ Confirmado y funcionando.
- **Supresión de ruido de fondo** — limpia el audio del micrófono (ventilador, teclado, tráfico) antes de transcribir. Toggle nuevo en Ajustes → Sonido.
- **Reemplazo de texto determinista** — reglas de "buscar y reemplazar" propias (con soporte de expresiones regulares) que se aplican después de cada dictado. Útil para abreviaciones, jerga propia, correcciones fijas.
- **Reemplazo de selección con IA** — la más ambiciosa: seleccionás texto en cualquier programa, presionás un atajo, decís en voz alta qué querés hacer con ese texto ("hacelo más formal", "tradúcelo"), y VozImperio lo reescribe en el lugar.
- **Reparación automática de settings** — si el archivo de configuración se corrompe, ahora se repara el campo dañado en vez de perder toda tu configuración.
- **Sincronización con la última versión de Handy** (v0.9.1) — se integraron ~31 correcciones de la base original sin perder nada de lo propio.

**Estado honesto:** todo compila, pasa la batería de tests automatizados, y el código está en la rama principal. Lo que falta es la prueba manual con la app corriendo y voz real — que es el siguiente paso antes de grabar la demo.

**Mensaje central:** VozImperio pasó de "rebrand con identidad propia" a tener capacidades reales que Handy base no tiene — glosario, supresión de ruido, reemplazo de texto y reemplazo con IA por voz.

Todavía sigo abierto a **dupla** para ayudar a pulir/probar antes del video demo. ¿Se apuntan?
