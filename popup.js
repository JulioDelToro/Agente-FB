document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnOpenPanel = document.getElementById('btn-open-panel');
  const btnGoBulk = document.getElementById('btn-go-bulk');

  const BULK_URL = 'https://business.facebook.com/latest/bulk_upload_composer';

  // Obtener pestaña activa
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isFb = tab && tab.url && tab.url.includes('business.facebook.com');
  const isBulk = isFb && tab.url.includes('bulk_upload_composer');

  if (isBulk) {
    statusDot.classList.add('active');
    statusText.innerHTML = '<strong>En Carga Masiva de Reels ✅</strong><span>Listo para auto-rellenar y programar</span>';
  } else if (isFb) {
    statusDot.classList.add('active');
    statusText.innerHTML = '<strong>En Meta Business Suite ✅</strong><span>Ve a la sección de Carga Masiva de Reels</span>';
  } else {
    statusDot.classList.remove('active');
    statusText.innerHTML = '<strong>No estás en Facebook ⚠️</strong><span>Abre Meta Business Suite para activar el agente</span>';
  }

  // Botón: Abrir panel en pantalla
  btnOpenPanel.addEventListener('click', async () => {
    if (!tab || !tab.id) return;

    if (!isFb) {
      // Si no está en Facebook, abrir la página directamente
      chrome.tabs.update(tab.id, { url: BULK_URL });
      window.close();
      return;
    }

    // Intentar enviar mensaje al content script
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'open_ui' }, (response) => {
        if (chrome.runtime.lastError) {
          // Si falló (la pestaña estaba abierta antes de instalar la extensión)
          // Inyectar el script manualmente
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['styles.css']
            }, () => {
              chrome.tabs.sendMessage(tab.id, { action: 'open_ui' });
            });
          });
        }
        window.close();
      });
    } catch (e) {
      console.error(e);
      window.close();
    }
  });

  // Botón: Ir a Carga Masiva
  btnGoBulk.addEventListener('click', () => {
    if (tab && tab.id) {
      chrome.tabs.update(tab.id, { url: BULK_URL });
    } else {
      chrome.tabs.create({ url: BULK_URL });
    }
    window.close();
  });
});
