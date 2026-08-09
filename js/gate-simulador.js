/* ============================================================
   OmniTrain · Compuerta de acceso a los simuladores 2D
   ------------------------------------------------------------
   Las páginas de juego se pueden abrir por URL directa, así que
   la validación no puede quedarse solo en la tarjeta del módulo.
   Aquí se comprueba la sesión antes de que arranque nada y, si
   no la hay, se devuelve al usuario al índice del módulo.
   ============================================================ */
(function (global) {
  'use strict';

  var DESTINO = 'index2d.html';

  function haySesion() {
    if (global.OmniKPI) return global.OmniKPI.haySesion();
    try {
      var crudo = localStorage.getItem('omnitrain-session');
      return !!(crudo && JSON.parse(crudo).name);
    } catch (e) {
      return false;
    }
  }

  function bloquear() {
    // Se avisa antes de redirigir para que el cambio no resulte confuso
    document.documentElement.style.visibility = 'hidden';
    try {
      global.sessionStorage.setItem('omnitrain-aviso-acceso', '1');
    } catch (e) { /* sin sessionStorage el aviso simplemente no aparece */ }
    global.location.replace(DESTINO);
  }

  if (!haySesion()) {
    bloquear();
    return;
  }

  // Si la sesión se cierra desde otra pestaña estando en el juego,
  // el simulador deja de registrar y se vuelve al índice del módulo.
  global.addEventListener('storage', function (e) {
    if (e.key === 'omnitrain-session' && !haySesion()) bloquear();
  });
})(window);
