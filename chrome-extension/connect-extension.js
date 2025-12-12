// Script da iniettare nell'app web per salvare credenziali nell'estensione
// Questo script viene eseguito nel contesto della pagina web

(function() {
  'use strict';

  // Funzione per salvare credenziali nell'estensione
  async function saveCredentialsToExtension(userId, token) {
    try {
      // Verifica che chrome.runtime sia disponibile
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        // Invia messaggio all'estensione per salvare credenziali
        chrome.runtime.sendMessage({
          action: 'saveCredentials',
          userId: userId,
          token: token
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('⚠️ [Apheron] Extension not available:', chrome.runtime.lastError.message);
            return;
          }
          if (response && response.success) {
            console.log('✅ [Apheron] Credentials saved to extension');
          }
        });
      } else {
        // Fallback: salva direttamente in storage se possibile
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          await chrome.storage.sync.set({
            userId: userId,
            token: token
          });
          console.log('✅ [Apheron] Credentials saved to extension storage');
        }
      }
    } catch (error) {
      console.warn('⚠️ [Apheron] Could not save credentials to extension:', error);
    }
  }

  // Esponi la funzione globalmente
  window.apheronSaveCredentials = saveCredentialsToExtension;

  // Ascolta messaggi dall'app React
  window.addEventListener('message', (event) => {
    // Verifica origine (solo dalla stessa origine)
    if (event.origin !== window.location.origin) return;

    if (event.data && event.data.type === 'APHERON_SAVE_CREDENTIALS') {
      saveCredentialsToExtension(event.data.userId, event.data.token);
    }
  });

  console.log('✅ [Apheron] Extension connector script loaded');
})();

