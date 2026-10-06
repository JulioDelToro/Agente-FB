/**
 * Meta Reels Bulk AutoFill & Human-like Scheduler
 * Diseñado específicamente para business.facebook.com/latest/bulk_upload_composer
 */

(function () {
  'use strict';

  // Evitar inyecciones duplicadas
  if (window.__MRF_INITIALIZED__) return;
  window.__MRF_INITIALIZED__ = true;

  console.log('[MetaReelsAutoFill] Extensión inicializada en Meta Business Suite');

  // Estado del automatizador
  const state = {
    isRunning: false,
    isPaused: false,
    parsedVideos: [],
    currentIndex: 0,
    totalToProcess: 0,
    successCount: 0,
    errorCount: 0,
    config: {
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
      startTime: '13:00',
      scheduleMode: 'slots', // 'slots' (videos por día) o 'interval' (cada X horas)
      videosPerDay: 2,
      preferredHours: ['13:00', '19:00'],
      intervalHours: 4,
      jitterMinutes: 8, // Desviación humana aleatoria (+/- 8 min)
      delayBetweenVideosMin: 3.0, // segundos
      delayBetweenVideosMax: 5.5, // segundos
      matchMode: 'sequential', // 'sequential' o 'filename'
      updateTitle: true
    }
  };

  // =========================================================================
  // 1. PARSER DEL TEXTO DE PLANTILLA
  // =========================================================================
  function parseVideoTemplate(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // Dividir por bloques de '====================' o por inicio de 'TÍTULO DEL VIDEO:'
    const blocks = rawText
      .split(/={15,}/)
      .map(b => b.trim())
      .filter(b => b.length > 20 && b.includes('TÍTULO DEL VIDEO:'));

    const videos = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // 1. Título
      const titleMatch = block.match(/TÍTULO DEL VIDEO:\s*([\s\S]*?)(?=(?:DESCRIPCIÓN|SINOPSIS|HASHTAGS|ARCHIVOS|-{5,}|$))/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // 2. Descripción / Sinopsis
      const descMatch = block.match(/(?:DESCRIPCIÓN \/ SINOPSIS[^:]*|DESCRIPCIÓN|SINOPSIS):\s*([\s\S]*?)(?=(?:HASHTAGS|ARCHIVOS|-{5,}|$))/i);
      const description = descMatch ? descMatch[1].trim() : '';

      // 3. Hashtags
      const hashtagsMatch = block.match(/HASHTAGS:\s*([\s\S]*?)(?=(?:ARCHIVOS|-{5,}|$))/i);
      const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : '';

      // 4. Archivos generados / Formato 9:16
      let filename = '';
      const archivosSection = block.match(/ARCHIVOS GENERADOS:[\s\S]*$/i);
      const searchTarget = archivosSection ? archivosSection[0] : block;

      const fileMatch = searchTarget.match(/Formato 9:16:\s*([^\r\n]+)/i) ||
                        searchTarget.match(/([^\r\n\t:]+?\.mp4)/i);
      if (fileMatch) {
        filename = fileMatch[1].trim();
      }

      // Unir descripción con hashtags
      let fullDescription = description;
      if (hashtags) {
        fullDescription = fullDescription ? `${fullDescription}\n\n${hashtags}` : hashtags;
      }

      if (title || fullDescription) {
        videos.push({
          index: i + 1,
          title: title,
          description: fullDescription,
          hashtags: hashtags,
          filename: filename,
          rawBlock: block
        });
      }
    }

    return videos;
  }

  // =========================================================================
  // 2. CÁLCULO DE FECHAS Y HORAS INDETECTABLES (CON JITTER HUMANO)
  // =========================================================================
  function calculateScheduleSlots(totalVideos, config) {
    const slots = [];
    const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number);
    let currentDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

    const jitter = parseInt(config.jitterMinutes) || 0;

    if (config.scheduleMode === 'slots') {
      // Modo: Horarios fijos por día con jitter (ej: 13:00 y 19:00)
      const hoursList = config.preferredHours && config.preferredHours.length > 0 
        ? config.preferredHours 
        : ['13:00', '19:00'];
      
      let videoCount = 0;
      let dayOffset = 0;

      while (videoCount < totalVideos) {
        for (let h = 0; h < hoursList.length; h++) {
          if (videoCount >= totalVideos) break;

          const targetDay = new Date(currentDate);
          targetDay.setDate(targetDay.getDate() + dayOffset);

          const [baseH, baseM] = hoursList[h].split(':').map(Number);

          // Aplicar variación aleatoria humana (jitter)
          let randomOffset = 0;
          if (jitter > 0) {
            randomOffset = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter; // e.g. -8 to +8 min
          }

          let finalMinutes = baseM + randomOffset;
          let finalHours = baseH;

          if (finalMinutes >= 60) {
            finalHours += Math.floor(finalMinutes / 60);
            finalMinutes = finalMinutes % 60;
          } else if (finalMinutes < 0) {
            finalHours -= 1;
            finalMinutes = 60 + finalMinutes;
          }

          slots.push({
            date: targetDay,
            day: targetDay.getDate(),
            month: targetDay.getMonth() + 1,
            year: targetDay.getFullYear(),
            hours: finalHours,
            minutes: finalMinutes,
            dateFormatted: `${targetDay.getDate()}/${targetDay.getMonth() + 1}/${targetDay.getFullYear()}`,
            timeFormatted: `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
          });

          videoCount++;
        }
        dayOffset++;
      }
    } else {
      // Modo intervalo continuo
      const [baseH, baseM] = config.startTime.split(':').map(Number);
      const intervalH = parseInt(config.intervalHours) || 4;

      let currentTime = new Date(currentDate);
      currentTime.setHours(baseH, baseM, 0, 0);

      for (let i = 0; i < totalVideos; i++) {
        let randomOffset = jitter > 0 ? (Math.floor(Math.random() * (jitter * 2 + 1)) - jitter) : 0;
        
        let scheduledTime = new Date(currentTime.getTime() + randomOffset * 60000);

        slots.push({
          date: scheduledTime,
          day: scheduledTime.getDate(),
          month: scheduledTime.getMonth() + 1,
          year: scheduledTime.getFullYear(),
          hours: scheduledTime.getHours(),
          minutes: scheduledTime.getMinutes(),
          dateFormatted: `${scheduledTime.getDate()}/${scheduledTime.getMonth() + 1}/${scheduledTime.getFullYear()}`,
          timeFormatted: `${String(scheduledTime.getHours()).padStart(2, '0')}:${String(scheduledTime.getMinutes()).padStart(2, '0')}`
        });

        // Avanzar el intervalo para el siguiente
        currentTime.setTime(currentTime.getTime() + intervalH * 3600000);
      }
    }

    return slots;
  }

  // =========================================================================
  // 3. UTILIDADES HUMANAS Y DE MANIPULACIÓN DEL DOM (REACT SAFE)
  // =========================================================================
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomDelay(minSec, maxSec) {
    const ms = Math.floor((Math.random() * (maxSec - minSec) + minSec) * 1000);
    return sleep(ms);
  }

  // Actualizar inputs o textareas controlados por React
  function setReactInputValue(element, value) {
    if (!element) return false;

    element.focus();

    // Comprobar si es contenteditable (ej. Lexical o DraftJS de Meta)
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
      const range = document.createRange();
      range.selectNodeContents(element);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const success = document.execCommand('insertText', false, value);
      if (!success) {
        element.innerText = value;
      }
      element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // Input normal o Textarea
    const prototype = element.tagName === 'TEXTAREA' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype;
    
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  // Simulación de clic humano con eventos reales
  function simulateHumanClick(element) {
    if (!element) return false;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const rect = element.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };
    element.dispatchEvent(new MouseEvent('mousedown', opts));
    element.dispatchEvent(new MouseEvent('mouseup', opts));
    element.dispatchEvent(new MouseEvent('click', opts));
    return true;
  }

  // =========================================================================
  // 4. DETECCIÓN DE FILAS EN LA TABLA DE META BUSINESS SUITE
  // =========================================================================
  function findTableRows() {
    // 1. Intentar encontrar por descripción placeholder o inputs
    const descElements = Array.from(document.querySelectorAll(
      'textarea[placeholder*="Describe"], div[aria-label*="Describe"], [placeholder*="Describe el reel"], [placeholder*="Describe"]'
    ));

    if (descElements.length > 0) {
      const rows = [];
      descElements.forEach(descEl => {
        // Buscar el contenedor padre que represente la fila
        let row = descEl.closest('tr') || descEl.closest('[role="row"]');
        if (!row) {
          // Si no hay tr ni role=row, subir hasta un contenedor razonable
          let parent = descEl.parentElement;
          for (let i = 0; i < 6 && parent; i++) {
            if (parent.querySelector('button') && parent.innerText.includes('Publicar')) {
              row = parent;
              break;
            }
            parent = parent.parentElement;
          }
        }
        if (row && !rows.includes(row)) {
          rows.push({
            rowElement: row,
            descInput: descEl
          });
        }
      });
      return rows;
    }

    // 2. Fallback: buscar filas por botones de "Publicar ahora" / "Opciones de pro..."
    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const publishButtons = allButtons.filter(b => {
      const text = b.innerText.trim();
      return text.includes('Publicar ahora') || text.includes('Opciones de pro') || text.includes('Programar');
    });

    const fallbackRows = [];
    publishButtons.forEach(btn => {
      const row = btn.closest('tr') || btn.closest('[role="row"]') || btn.parentElement?.parentElement?.parentElement;
      if (row && !fallbackRows.some(r => r.rowElement === row)) {
        const descInput = row.querySelector('textarea, div[contenteditable="true"], input[type="text"]');
        fallbackRows.push({
          rowElement: row,
          descInput: descInput
        });
      }
    });

    return fallbackRows;
  }

  // Obtener elementos clave dentro de una fila de la tabla
  function extractRowComponents(rowObj) {
    const { rowElement, descInput } = rowObj;

    // Campo de título: suele ser el primer input o texto editable en la columna "Título"
    let titleInput = null;
    const inputs = Array.from(rowElement.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]'));
    titleInput = inputs.find(inp => inp !== descInput) || null;

    // Botón de opciones de programación ("Publicar ahora" o "Opciones de pro...")
    const buttons = Array.from(rowElement.querySelectorAll('button, div[role="button"]'));
    const scheduleDropdownBtn = buttons.find(b => {
      const t = b.innerText.trim();
      return t.includes('Publicar ahora') || t.includes('Opciones de pro') || t.includes('Programar') || t.includes('Más opcion');
    }) || buttons[0];

    // Texto del nombre de archivo visible en la miniatura o columna título
    const textContent = rowElement.innerText || '';

    return {
      rowElement,
      descInput,
      titleInput,
      scheduleDropdownBtn,
      rawText: textContent
    };
  }

  // =========================================================================
  // 5. AUTOMATIZACIÓN DE PROGRAMACIÓN DE FECHA Y HORA
  // =========================================================================
  async function scheduleVideoRow(rowComponents, slotInfo, log) {
    const { rowElement, scheduleDropdownBtn } = rowComponents;

    // 1. Clic en el dropdown de opciones de programación
    log(`Abriendo menú de programación...`, 'info');
    simulateHumanClick(scheduleDropdownBtn);
    await sleep(800 + Math.random() * 400);

    // 2. Buscar el menú flotante / popover que apareció
    // El popover contiene opciones: "Publicar ahora", "Programar", "Guardar como borrador"
    let popover = null;
    for (let attempts = 0; attempts < 6; attempts++) {
      const candidates = Array.from(document.querySelectorAll('div[role="dialog"], div[role="menu"], div[style*="z-index"], div'));
      popover = candidates.find(c => {
        const t = c.innerText || '';
        return t.includes('Publicar ahora') && t.includes('Programar') && (t.includes('Actualizar') || t.includes('borrador'));
      });
      if (popover) break;
      await sleep(300);
    }

    if (!popover) {
      log(`⚠️ No se pudo localizar el menú emergente de programación. Saltando fila.`, 'warn');
      return false;
    }

    // 3. Hacer clic en la pestaña "Programar"
    const tabs = Array.from(popover.querySelectorAll('button, div[role="button"], div[role="tab"], span, div'));
    const programarTab = tabs.find(el => el.innerText.trim() === 'Programar' || el.innerText.trim().includes('Programar'));
    
    if (programarTab) {
      simulateHumanClick(programarTab);
      await sleep(600 + Math.random() * 300);
    }

    // 4. Localizar inputs de Fecha y Hora en el menú
    // En la captura de pantalla:
    // Input con icono de calendario: formato "6/10/2026"
    // Input de hora con icono de reloj: "13 : 49"
    const inputsInPopover = Array.from(popover.querySelectorAll('input'));

    let dateInput = null;
    let timeInputs = [];

    inputsInPopover.forEach(inp => {
      const val = inp.value || '';
      const ph = inp.placeholder || '';
      // Si contiene barras o formato de fecha
      if (val.includes('/') || ph.includes('/') || val.includes('-') || inp.getAttribute('aria-label')?.includes('fecha') || inp.type === 'date') {
        dateInput = inp;
      } else if (val.includes(':') || ph.includes(':') || inp.type === 'time' || inp.getAttribute('aria-label')?.includes('hora')) {
        timeInputs.push(inp);
      }
    });

    // Si no los detectó por formato de texto, asignar por posición
    if (!dateInput && inputsInPopover.length > 0) {
      dateInput = inputsInPopover[0];
    }
    if (timeInputs.length === 0 && inputsInPopover.length > 1) {
      timeInputs = inputsInPopover.slice(1);
    }

    // 4.1 Rellenar Fecha
    if (dateInput) {
      log(`Fijando fecha: ${slotInfo.dateFormatted}...`, 'info');
      dateInput.focus();
      await sleep(200);
      setReactInputValue(dateInput, slotInfo.dateFormatted);
      await sleep(300);
    } else {
      log(`ℹ️ Selector de fecha nativo no requirió cambio de texto directo`, 'info');
    }

    // 4.2 Rellenar Hora
    if (timeInputs.length > 0) {
      log(`Fijando hora: ${slotInfo.timeFormatted}...`, 'info');
      if (timeInputs.length === 1) {
        setReactInputValue(timeInputs[0], slotInfo.timeFormatted);
      } else if (timeInputs.length >= 2) {
        // Posiblemente dos inputs: horas y minutos por separado
        setReactInputValue(timeInputs[0], String(slotInfo.hours).padStart(2, '0'));
        await sleep(150);
        setReactInputValue(timeInputs[1], String(slotInfo.minutes).padStart(2, '0'));
      }
      await sleep(300);
    }

    // 5. Clic en el botón "Actualizar" (botón azul en la esquina inferior derecha del popup)
    const popoverButtons = Array.from(popover.querySelectorAll('button, div[role="button"]'));
    const actualizarBtn = popoverButtons.find(b => {
      const t = b.innerText.trim();
      return t === 'Actualizar' || t.includes('Actualizar') || t === 'Guardar' || t.includes('Guardar');
    });

    if (actualizarBtn) {
      log(`Guardando programación (clic en Actualizar)...`, 'info');
      simulateHumanClick(actualizarBtn);
      await sleep(800 + Math.random() * 400);
    } else {
      log(`⚠️ No se encontró botón Actualizar en el popup`, 'warn');
    }

    return true;
  }

  // =========================================================================
  // 6. MOTOR PRINCIPAL DE EJECUCIÓN CON COMPORTAMIENTO HUMANO
  // =========================================================================
  async function runAutoFillProcess(log, updateProgress) {
    state.isRunning = true;
    state.isPaused = false;
    state.successCount = 0;
    state.errorCount = 0;

    log('🔍 Escaneando tabla de videos de Meta Business Suite...', 'info');
    const tableRows = findTableRows();

    if (tableRows.length === 0) {
      log('❌ No se encontraron filas de videos. Asegúrate de estar en la pantalla de "Subir reels de forma masiva" con videos ya cargados.', 'error');
      state.isRunning = false;
      return;
    }

    log(`✅ Se detectaron ${tableRows.length} videos en la tabla de Facebook.`, 'success');

    if (state.parsedVideos.length === 0) {
      log('❌ No hay videos en la plantilla pegada. Pega el texto y pulsa "Analizar Plantilla".', 'error');
      state.isRunning = false;
      return;
    }

    // Calcular las fechas y horas para cada video
    const scheduleSlots = calculateScheduleSlots(tableRows.length, state.config);
    log(`📅 Cronograma generado con variación humana (+/- ${state.config.jitterMinutes}m de jitter).`, 'info');

    const total = Math.min(tableRows.length, state.parsedVideos.length);
    state.totalToProcess = total;

    for (let i = 0; i < total; i++) {
      if (!state.isRunning) {
        log('⏹️ Proceso detenido por el usuario.', 'warn');
        break;
      }

      while (state.isPaused) {
        log('⏸️ Proceso en pausa. Esperando reanudación...', 'warn');
        await sleep(1500);
        if (!state.isRunning) break;
      }

      state.currentIndex = i;
      updateProgress(i + 1, total);

      const rowObj = tableRows[i];
      const components = extractRowComponents(rowObj);

      // 1. Determinar datos del video según modo de asignación
      let videoData = null;
      if (state.config.matchMode === 'filename') {
        const rowText = (components.rawText + ' ' + (components.titleInput?.value || '')).toLowerCase();
        videoData = state.parsedVideos.find(v => {
          if (v.filename && rowText.includes(v.filename.toLowerCase())) return true;
          const cleanName = v.filename.replace(/\.mp4$/i, '').toLowerCase();
          if (cleanName && rowText.includes(cleanName)) return true;
          if (v.title && rowText.includes(v.title.toLowerCase())) return true;
          return false;
        });
      }

      if (!videoData) {
        videoData = state.parsedVideos[i] || state.parsedVideos[0];
      }

      const slot = scheduleSlots[i];

      log(`▶️ [${i + 1}/${total}] Procesando: "${(videoData.title || videoData.filename).slice(0, 35)}..."`, 'info');

      // Resaltar visualmente la fila actual
      components.rowElement.classList.add('mrf-highlight-active');
      components.rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(600 + Math.random() * 400);

      try {
        // 1. Rellenar Título (si está habilitado y hay campo)
        if (state.config.updateTitle && components.titleInput && videoData.title) {
          log(`  ✍️ Escribiendo título...`, 'info');
          setReactInputValue(components.titleInput, videoData.title);
          await sleep(400 + Math.random() * 300);
        }

        // 2. Rellenar Descripción y Hashtags
        if (components.descInput && videoData.description) {
          log(`  📝 Pegando descripción y hashtags...`, 'info');
          setReactInputValue(components.descInput, videoData.description);
          await sleep(600 + Math.random() * 400);
        }

        // 3. Programar Fecha y Hora
        log(`  ⏰ Programando para: ${slot.dateFormatted} a las ${slot.timeFormatted}`, 'info');
        const scheduleOk = await scheduleVideoRow(components, slot, log);

        if (scheduleOk) {
          components.rowElement.classList.remove('mrf-highlight-active');
          components.rowElement.classList.add('mrf-highlight-done');
          state.successCount++;
          log(`  ✅ Video ${i + 1} completado y programado con éxito.`, 'success');
        } else {
          components.rowElement.classList.remove('mrf-highlight-active');
          components.rowElement.classList.add('mrf-highlight-error');
          state.errorCount++;
        }

      } catch (err) {
        console.error('[MetaReelsAutoFill] Error en fila', i, err);
        components.rowElement.classList.remove('mrf-highlight-active');
        components.rowElement.classList.add('mrf-highlight-error');
        state.errorCount++;
        log(`  ❌ Error en video ${i + 1}: ${err.message}`, 'error');
      }

      // Pausa humana entre videos para evasión de detección
      if (i < total - 1) {
        const pauseSec = (Math.random() * (state.config.delayBetweenVideosMax - state.config.delayBetweenVideosMin) + state.config.delayBetweenVideosMin).toFixed(1);
        log(`  ⏳ Pausa humana de seguridad (${pauseSec}s)...`, 'info');
        await sleep(parseFloat(pauseSec) * 1000);
      }
    }

    state.isRunning = false;
    log(`🎉 Proceso finalizado: ${state.successCount} completados, ${state.errorCount} errores.`, 'success');
    log('👉 Revisa la pantalla y haz clic en "Publicar" cuando estés listo.', 'success');
  }

  // =========================================================================
  // 7. CONSTRUCCIÓN DE LA INTERFAZ DE USUARIO FLOTANTE (WIDGET)
  // =========================================================================
  function createFloatingUI() {
    const existing = document.getElementById('mrf-floating-widget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'mrf-floating-widget';

    widget.innerHTML = `
      <div class="mrf-header" id="mrf-drag-handle">
        <div class="mrf-title-box">
          <span class="mrf-badge">Meta Agente</span>
          <h4 class="mrf-title">AutoFill & Scheduler</h4>
        </div>
        <div class="mrf-actions">
          <button class="mrf-btn-icon" id="mrf-btn-minimize" title="Minimizar">_</button>
        </div>
      </div>

      <div class="mrf-content">
        <!-- Sección 1: Plantilla TXT -->
        <div class="mrf-section">
          <label class="mrf-label">
            <span>Pegar Plantilla de Videos</span>
            <span class="sub" id="mrf-count-detected">0 videos detectados</span>
          </label>
          <textarea class="mrf-textarea" id="mrf-input-template" placeholder="Pega aquí el contenido con tus 50 videos generados (con TÍTULO DEL VIDEO:, DESCRIPCIÓN:, HASHTAGS:, etc.)..."></textarea>
          <button class="mrf-btn mrf-btn-secondary" id="mrf-btn-parse" style="padding: 6px 10px; font-size: 11px;">
            🔍 Analizar y Cargar Videos
          </button>
        </div>

        <!-- Sección 2: Configuración de Programación -->
        <div class="mrf-section">
          <label class="mrf-label">Configuración del Calendario</label>
          
          <div class="mrf-row">
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Fecha de Inicio</label>
              <input type="date" class="mrf-input" id="mrf-start-date" value="${state.config.startDate}">
            </div>
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Modo</label>
              <select class="mrf-select" id="mrf-schedule-mode">
                <option value="slots">Videos por Día</option>
                <option value="interval">Cada X Horas</option>
              </select>
            </div>
          </div>

          <div id="mrf-slots-config" class="mrf-row" style="margin-top: 6px;">
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Horarios diarios (separados por coma)</label>
              <input type="text" class="mrf-input" id="mrf-hours-list" value="13:00, 19:00" placeholder="Ej: 12:00, 18:00">
            </div>
          </div>

          <div id="mrf-interval-config" class="mrf-row" style="margin-top: 6px; display: none;">
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Hora Inicial</label>
              <input type="time" class="mrf-input" id="mrf-start-time" value="12:00">
            </div>
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Intervalo (Horas)</label>
              <input type="number" class="mrf-input" id="mrf-interval-hours" value="4" min="1" max="24">
            </div>
          </div>

          <div class="mrf-row" style="margin-top: 6px;">
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 11px;">Modo de Asignación</label>
              <select class="mrf-select" id="mrf-match-mode">
                <option value="sequential">Orden Secuencial (Fila 1 = Video 1, Fila 2 = Video 2...)</option>
                <option value="filename">Por coincidencia de nombre de archivo / título</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Sección 3: Antidetección y Seguridad -->
        <div class="mrf-antiban-box">
          <div class="mrf-antiban-title">
            🛡️ Modo Antidetección Activo (Indetectable por FB)
          </div>
          <div class="mrf-row" style="margin-top: 4px;">
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 10px;">Variación de Minutos (Jitter)</label>
              <input type="number" class="mrf-input" id="mrf-jitter" value="8" min="0" max="30" title="Añade minutos aleatorios (+/-) para que las publicaciones no sean a horas exactas de bot.">
            </div>
            <div class="mrf-col">
              <label class="mrf-label" style="font-size: 10px;">Pausa entre videos (seg)</label>
              <div style="display: flex; gap: 4px; align-items: center;">
                <input type="number" class="mrf-input" id="mrf-delay-min" value="3.0" step="0.5" min="1" style="width: 50%;">
                <span style="color: #8a8d91;">a</span>
                <input type="number" class="mrf-input" id="mrf-delay-max" value="5.5" step="0.5" min="2" style="width: 50%;">
              </div>
            </div>
          </div>
          <label class="mrf-checkbox-label" style="margin-top: 4px;">
            <input type="checkbox" id="mrf-chk-title" checked>
            <span>Rellenar también el Título del video</span>
          </label>
        </div>

        <!-- Progreso y Estado -->
        <div class="mrf-progress-container">
          <div class="mrf-status-text">
            <span id="mrf-status-label">Listo para comenzar</span>
            <span id="mrf-progress-pct">0%</span>
          </div>
          <div class="mrf-progress-bar">
            <div class="mrf-progress-fill" id="mrf-progress-fill"></div>
          </div>
        </div>

        <!-- Consola / Log en vivo -->
        <div class="mrf-log" id="mrf-console-log">
          <div class="log-info">[Listo] Pega tu texto y presiona 'Analizar y Cargar Videos'.</div>
        </div>
      </div>

      <!-- Footer y Acciones -->
      <div class="mrf-footer">
        <button class="mrf-btn mrf-btn-primary" id="mrf-btn-start">
          🚀 Iniciar Automatización
        </button>
        <button class="mrf-btn mrf-btn-secondary" id="mrf-btn-pause" disabled>
          ⏸️ Pausa
        </button>
        <button class="mrf-btn mrf-btn-danger" id="mrf-btn-stop" disabled>
          ⏹️ Detener
        </button>
      </div>
    `;

    document.body.appendChild(widget);

    // =========================================================================
    // ENLACE DE EVENTOS DE LA UI
    // =========================================================================
    const dragHandle = widget.querySelector('#mrf-drag-handle');
    const btnMinimize = widget.querySelector('#mrf-btn-minimize');
    const inputTemplate = widget.querySelector('#mrf-input-template');
    const countDetected = widget.querySelector('#mrf-count-detected');
    const btnParse = widget.querySelector('#mrf-btn-parse');
    const scheduleMode = widget.querySelector('#mrf-schedule-mode');
    const slotsConfig = widget.querySelector('#mrf-slots-config');
    const intervalConfig = widget.querySelector('#mrf-interval-config');
    const btnStart = widget.querySelector('#mrf-btn-start');
    const btnPause = widget.querySelector('#mrf-btn-pause');
    const btnStop = widget.querySelector('#mrf-btn-stop');
    const logConsole = widget.querySelector('#mrf-console-log');
    const progressFill = widget.querySelector('#mrf-progress-fill');
    const progressPct = widget.querySelector('#mrf-progress-pct');
    const statusLabel = widget.querySelector('#mrf-status-label');

    // Función de log en consola
    function log(message, type = 'info') {
      const line = document.createElement('div');
      line.className = `log-${type}`;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logConsole.appendChild(line);
      logConsole.scrollTop = logConsole.scrollHeight;
    }

    // Actualizar barra de progreso
    function updateProgress(current, total) {
      const pct = Math.round((current / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressPct.textContent = `${pct}% (${current}/${total})`;
      statusLabel.textContent = `Procesando ${current} de ${total}...`;
    }

    // Minimizar / Restaurar
    let isMinimized = false;
    btnMinimize.addEventListener('click', () => {
      isMinimized = !isMinimized;
      widget.classList.toggle('minimized', isMinimized);
      btnMinimize.textContent = isMinimized ? '□' : '_';
    });

    // Alternar modo de programación
    scheduleMode.addEventListener('change', () => {
      if (scheduleMode.value === 'slots') {
        slotsConfig.style.display = 'flex';
        intervalConfig.style.display = 'none';
        state.config.scheduleMode = 'slots';
      } else {
        slotsConfig.style.display = 'none';
        intervalConfig.style.display = 'flex';
        state.config.scheduleMode = 'interval';
      }
    });

    // Analizar plantilla
    function doParse() {
      const raw = inputTemplate.value;
      const videos = parseVideoTemplate(raw);
      state.parsedVideos = videos;
      countDetected.textContent = `${videos.length} videos detectados`;

      if (videos.length > 0) {
        log(`Se detectaron ${videos.length} videos en la plantilla correctamente.`, 'success');
        log(`Ejemplo del primer video: "${videos[0].title || 'Sin título'}"`, 'info');
      } else {
        log('No se pudieron extraer videos del texto pegado. Verifica el formato.', 'warn');
      }
    }

    btnParse.addEventListener('click', doParse);
    inputTemplate.addEventListener('change', doParse);

    // Iniciar Automatización
    btnStart.addEventListener('click', async () => {
      if (state.isRunning) return;

      doParse();
      if (state.parsedVideos.length === 0) {
        alert('Por favor pega tu plantilla de videos en el área de texto antes de iniciar.');
        return;
      }

      // Guardar configuraciones actuales
      state.config.startDate = widget.querySelector('#mrf-start-date').value;
      state.config.startTime = widget.querySelector('#mrf-start-time').value;
      state.config.intervalHours = parseInt(widget.querySelector('#mrf-interval-hours').value) || 4;
      state.config.jitterMinutes = parseInt(widget.querySelector('#mrf-jitter').value) || 0;
      state.config.delayBetweenVideosMin = parseFloat(widget.querySelector('#mrf-delay-min').value) || 2.5;
      state.config.delayBetweenVideosMax = parseFloat(widget.querySelector('#mrf-delay-max').value) || 5.0;
      state.config.updateTitle = widget.querySelector('#mrf-chk-title').checked;
      state.config.matchMode = widget.querySelector('#mrf-match-mode').value;

      const rawHours = widget.querySelector('#mrf-hours-list').value;
      state.config.preferredHours = rawHours.split(',').map(s => s.trim()).filter(Boolean);

      btnStart.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      inputTemplate.disabled = true;

      await runAutoFillProcess(log, updateProgress);

      btnStart.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled = true;
      inputTemplate.disabled = false;
    });

    // Pausar / Reanudar
    btnPause.addEventListener('click', () => {
      if (!state.isRunning) return;
      state.isPaused = !state.isPaused;
      if (state.isPaused) {
        btnPause.textContent = '▶️ Continuar';
        log('⏸️ Automatización pausada por el usuario.', 'warn');
      } else {
        btnPause.textContent = '⏸️ Pausa';
        log('▶️ Reanudando automatización...', 'info');
      }
    });

    // Detener
    btnStop.addEventListener('click', () => {
      state.isRunning = false;
      state.isPaused = false;
      btnPause.textContent = '⏸️ Pausa';
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled = true;
      inputTemplate.disabled = false;
      log('⏹️ Deteniendo proceso...', 'warn');
    });

    // Arrastrar ventana (Drag & Drop)
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      widget.style.right = 'auto';
      widget.style.left = `${initialLeft}px`;
      widget.style.top = `${initialTop}px`;
      dragHandle.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      widget.style.left = `${Math.max(10, initialLeft + dx)}px`;
      widget.style.top = `${Math.max(10, initialTop + dy)}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
      }
    });
  }

  // Botón flotante accesible en la esquina inferior
  function createLauncherButton() {
    if (document.getElementById('mrf-launcher-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'mrf-launcher-btn';
    btn.innerHTML = '🤖 <span>Agente Reels</span>';
    btn.title = 'Abrir / Cerrar Automatizador de Reels';
    btn.addEventListener('click', () => {
      const existing = document.getElementById('mrf-floating-widget');
      if (existing) {
        if (existing.style.display === 'none') {
          existing.style.display = 'flex';
          existing.classList.remove('minimized');
        } else {
          existing.classList.toggle('minimized');
        }
      } else {
        createFloatingUI();
      }
    });
    document.body.appendChild(btn);
  }

  // Escuchar mensajes desde el popup de la barra de extensiones
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'open_ui' || msg.action === 'toggle_ui') {
        const existing = document.getElementById('mrf-floating-widget');
        if (existing) {
          existing.style.display = 'flex';
          existing.classList.remove('minimized');
        } else {
          createFloatingUI();
        }
        createLauncherButton();
        sendResponse({ status: 'ok' });
      }
    });
  }

  // Detectar si estamos en Meta Business Suite y montar la UI
  function init() {
    if (window.location.href.includes('business.facebook.com')) {
      setTimeout(() => {
        createLauncherButton();
        if (window.location.href.includes('bulk_upload_composer')) {
          createFloatingUI();
        }
      }, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Monitorear cambios de URL (SPA navigation en Meta Business Suite)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('business.facebook.com')) {
        createLauncherButton();
        if (url.includes('bulk_upload_composer')) {
          setTimeout(createFloatingUI, 1000);
        }
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
