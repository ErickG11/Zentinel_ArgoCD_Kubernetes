// Aplica el tema guardado antes de pintar (evita parpadeo). Archivo externo por la CSP (script-src 'self').
try {
  var t = localStorage.getItem('zs-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
