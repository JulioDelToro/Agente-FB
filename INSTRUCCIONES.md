# 🚀 Guía de Instalación y Uso: Meta Reels Bulk AutoFill & Scheduler

Esta extensión está diseñada específicamente para automatizar la carga masiva en **Meta Business Suite** (`business.facebook.com/latest/bulk_upload_composer`), rellenando títulos, descripciones, hashtags y programando fecha/hora de forma **100% indetectable por Facebook**.

---

## 🛡️ ¿Por qué esta solución es INDETECTABLE para Facebook?

Facebook penaliza y suspende cuentas cuando detecta:
1. **Peticiones a APIs no oficiales o bots headless (Selenium/Puppeteer):** Identifican firmas de navegador falsas e IPs no residenciales.
2. **Acciones a velocidad no humana:** Si un script rellena 50 campos en 0.2 segundos, el antispam de Meta salta de inmediato.
3. **Horarios matemáticamente exactos:** Programar todos los videos a las 14:00:00 o 18:00:00 en punto delata un bot.

### Cómo lo resuelve nuestra extensión:
* **Sesión Real:** Funciona directamente dentro de tu navegador habitual (Opera, Chrome o Edge) con tus cookies activas y tu IP residencial real.
* **Jitter Humano (Variación aleatoria de minutos):** Si defines publicar a las 13:00 y 19:00, la extensión añade minutos aleatorios (por ejemplo: 13:07, 19:14, 12:54, 19:03). Para Facebook parece que una persona está programando manualmente.
* **Pausas Humanas Configurables:** Entre cada video se aplican pausas aleatorias (ej. 3.0s a 5.5s), con desplazamientos suaves de pantalla (`scrollIntoView`).
* **Eventos Sintéticos React:** Meta está construido en React. La extensión inyecta los textos disparando los eventos nativos que React espera (`beforeinput`, `input`, `change`, `blur`), asegurando que no se borren al enviar.
* **Tú mantienes el control:** La extensión prepara y programa las 50 filas, pero te deja a ti la revisión final y el clic en el botón azul "Publicar".

---

## 📦 Paso 1: Instalar la Extensión en tu Navegador

Funciona en **Opera, Google Chrome, Microsoft Edge y Brave**.

1. Abre tu navegador (por ejemplo, **Opera** o **Chrome**).
2. En la barra de direcciones escribe:
   * En **Opera**: `opera://extensions`
   * En **Chrome**: `chrome://extensions`
   * En **Edge**: `edge://extensions`
3. En la esquina superior derecha, activa el interruptor **"Modo de desarrollador"** (Developer mode).
4. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
5. Selecciona la carpeta donde está este proyecto:
   `C:\Users\juli_\Videos\AgenteFB`
6. ¡Listo! Verás la extensión **"Meta Reels Bulk AutoFill & Scheduler"** activa.

---

## 🎬 Paso 2: Usar el Agente en Meta Business Suite

1. Entra a tu página de carga masiva de reels:
   👉 **`https://business.facebook.com/latest/bulk_upload_composer`**
2. Sube tus 50 videos (arrastrándolos o con el botón "Agregar videos") y espera a que aparezcan en la tabla.
3. Verás que en la esquina superior derecha aparece el panel flotante: **Meta Agente | AutoFill & Scheduler**. *(Puedes arrastrarlo con el mouse si tapa algo o minimizarlo con `_`)*.
4. En el campo **"Pegar Plantilla de Videos"**, pega el texto completo con tus 50 videos tal como lo tienes generado:
   ```text
   ============================================================
   TÍTULO DEL VIDEO:
   Investigué la Dark Web y descubrí algo aterrador

   DESCRIPCIÓN / SINOPSIS (YOUTUBE / REDES):
   Como investigador de la red oscura, mi trabajo es desmantelar estafas, hasta que un mensaje anónimo cambió todo. ¿Quién me vigila?

   HASHTAGS:
   #misterio #darkweb #investigacion #storytelling #viral

   ------------------------------------------------------------
   ARCHIVOS GENERADOS:
   - Formato 9:16: Investigué la Dark Web y descubrí algo aterrador_9x16_1791312111278.mp4
   - Duración Total: 0m 58s (12 escenas)
   ============================================================
   ```
5. Haz clic en **"🔍 Analizar y Cargar Videos"**. El contador te indicará: `"50 videos detectados"`.
6. Configura tu calendario:
   * **Fecha de Inicio:** Desde qué día empezar a programar.
   * **Modo:**
     * **Videos por Día:** Puedes poner por ejemplo `13:00, 19:00` (programará 2 videos al día en esos horarios).
     * **Cada X Horas:** Puedes poner cada 3 o 4 horas a partir de una hora inicial.
   * **Modo de Asignación:**
     * *Orden Secuencial:* Fila 1 = Video 1, Fila 2 = Video 2...
     * *Por coincidencia de nombre:* Busca por el nombre del archivo `.mp4` o título.
   * **Variación de Minutos (Jitter):** Déjalo en `8` min para máxima discreción.
   * **Pausa entre videos:** `3.0s a 5.5s` (recomendado para seguridad).
7. Haz clic en **"🚀 Iniciar Automatización"**.
8. Verás cómo el agente:
   * Se desplaza suavemente hacia cada fila.
   * La resalta en azul mientras trabaja.
   * Escribe el título, pega la descripción con hashtags.
   * Abre el menú de programación, selecciona la fecha, la hora ajustada y pulsa "Actualizar".
   * Marca la fila en **verde** al finalizar.
   * Hace su pausa de seguridad y pasa al siguiente video.
9. Puedes pulsar **"⏸️ Pausa"** o **"⏹️ Detener"** en cualquier momento si lo deseas.
10. Al terminar las 50 filas, revisa rápidamente la pantalla y haz clic en el botón azul **"Publicar"** al final de Meta Business Suite.

---

## ⚙️ Estructura de Archivos del Proyecto
* `manifest.json`: Configuración de la extensión (Manifest V3).
* `content.js`: Lógica principal del agente, parser de texto y simulación humana.
* `styles.css`: Estilos visuales del panel flotante oscuro.
* `icon16.png`, `icon48.png`, `icon128.png`: Íconos de la extensión.
