(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/control/sw.js?v=4.5.4.19', { scope: '/control/', updateViaCache: 'none' }).catch(() => {});
  let invitation;
  const button = document.getElementById('installControl');
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); invitation = event; if (button) button.hidden = false; });
  button?.addEventListener('click', async () => {
    if (!invitation) return;
    const prompt = invitation; invitation = null; button.hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; } catch { /* Browser install remains optional. */ }
  });
  window.addEventListener('appinstalled', () => { invitation = null; if (button) button.hidden = true; });
})();
