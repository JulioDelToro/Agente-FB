# 🚀 Agente FB: Meta Reels Bulk AutoFill & Human-like Scheduler

Extensión y agente de navegador indetectable diseñado para automatizar el rellenado de títulos, descripciones, hashtags y la programación por fecha y hora de lotes de hasta 50 Reels en **Meta Business Suite** (`business.facebook.com/latest/bulk_upload_composer`).

---

## 🛡️ Características Antidetección (100% Seguro)
* **Sesión Real del Navegador:** Corre directamente en tu navegador (Opera, Chrome, Edge) con tus cookies e IP residencial, sin usar bots headless ni peticiones a APIs no oficiales.
* **Jitter de Minutos Humano:** Variación aleatoria en los minutos programados (ej. 13:08, 19:14) para evitar patrones de bot fijos.
* **Pausas Humanas Configurables:** Micro-retrasos aleatorios de 3.0s a 5.5s entre cada video con scroll suave.
* **Integración Nativa con React:** Despacha eventos sintéticos (`beforeinput`, `input`, `change`, `blur`) para garantizar que Meta guarde los cambios en su estado interno.
* **Control Humano Final:** El agente rellena y programa todas las filas, pero deja la revisión visual y el clic en el botón azul "Publicar" a ti.

---

## 📦 Instalación

1. Clona este repositorio o descarga la carpeta:
   ```bash
   git clone https://github.com/JulioDelToro/Agente-FB.git
   ```
2. Abre tu navegador basado en Chromium (**Opera**, **Google Chrome**, **Microsoft Edge**, **Brave**).
3. Dirígete a la sección de extensiones:
   * **Opera:** `opera://extensions`
   * **Chrome:** `chrome://extensions`
   * **Edge:** `edge://extensions`
4. Activa el **"Modo de desarrollador"** en la esquina superior derecha.
5. Haz clic en **"Cargar descomprimida"** (Load unpacked) y selecciona la carpeta de este proyecto.

---

## 🎬 Uso

1. Ve a la pantalla de carga masiva de Meta Business Suite:  
   👉 `https://business.facebook.com/latest/bulk_upload_composer`
2. Sube tus 50 videos y espera a que se listen en la tabla.
3. Haz clic en el icono azul de la extensión en la barra del navegador o en el botón flotante `🤖 Agente Reels` en la esquina inferior de Facebook.
4. Pega tu plantilla de texto con los 50 videos generados:
   ```text
   ============================================================
   TÍTULO DEL VIDEO:
   Investigué la Dark Web y descubrí algo aterrador

   DESCRIPCIÓN / SINOPSIS (YOUTUBE / REDES):
   Como investigador de la red oscura, mi trabajo es desmantelar estafas...

   HASHTAGS:
   #misterio #darkweb #investigacion #viral

   ------------------------------------------------------------
   ARCHIVOS GENERADOS:
   - Formato 9:16: Investigué la Dark Web y descubrí algo aterrador_9x16_1791312111278.mp4
   - Duración Total: 0m 58s (12 escenas)
   ============================================================
   ```
5. Pulsa **"🔍 Analizar y Cargar Videos"** y configura tu calendario (fecha de inicio, horarios o intervalos).
6. Presiona **"🚀 Iniciar Automatización"**.
7. Una vez procesadas las 50 filas, revisa y pulsa el botón **"Publicar"** de Facebook.

---

## 📁 Archivos
* `manifest.json`: Configuración de la extensión (Manifest V3).
* `content.js`: Motor de automatización y panel flotante inyectado en Meta Business Suite.
* `popup.html` / `popup.js`: Interfaz emergente del icono de la barra de extensiones.
* `styles.css`: Estilos en modo oscuro para el panel y los botones.
* `INSTRUCCIONES.md`: Guía detallada en español.
