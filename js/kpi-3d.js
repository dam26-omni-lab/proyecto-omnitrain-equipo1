/* ============================================================
   OmniTrain · KPIs del módulo Entorno 3D
   ------------------------------------------------------------
   Todo lo que se muestra aquí sale de lo que el usuario hizo
   realmente dentro de la sala de inspección (js/app.js registra
   cada pieza, su tiempo y el recorrido completo).
   ============================================================ */
(function (global) {
  'use strict';

  var K = global.OmniKPI;
  if (!K) return;

  var $ = function (id) { return document.getElementById(id); };
  var plantillaKpis = null;

  function texto(id, valor) {
    var el = $(id);
    if (el) el.textContent = valor;
  }

  /* ========================================================
     1. Encabezado del módulo (siempre visible)
     ======================================================== */
  function pintarEncabezado(tres, activa) {
    if (!activa) {
      texto('k3-progress-text', '--');
      texto('k3-progress-hint', 'Inicia sesión para registrar y ver tu avance.');
      var barraVacia = $('k3-progress-bar');
      if (barraVacia) barraVacia.style.width = '0%';
      texto('k3-stat-parts', '--');
      texto('k3-stat-time', '--');
      texto('k3-stat-precision', '--');
      texto('k3-stat-runs', '--');
      return;
    }

    texto('k3-progress-text', tres.progreso + '%');
    var barra = $('k3-progress-bar');
    var pista = $('k3-progress-track');
    if (barra) barra.style.width = tres.progreso + '%';
    if (pista) pista.setAttribute('aria-valuenow', String(tres.progreso));

    texto('k3-progress-hint', tres.completo
      ? 'Recorrido completo: las 8 piezas quedaron registradas.'
      : 'Te faltan ' + (tres.total - tres.inspeccionadas) + ' piezas por revisar dentro de la sala.');

    texto('k3-stat-parts', tres.inspeccionadas + '/' + tres.total);
    texto('k3-stat-time', K.formatearTiempo(tres.tiempoSalaSeg));
    texto('k3-stat-precision', tres.precision !== null ? tres.precision + '%' : '--');
    texto('k3-stat-runs', String(tres.recorridosCompletos));
  }

  /* ========================================================
     2. Tarjetas de detalle
     ======================================================== */
  function pintarKpis(tres) {
    texto('k3-kpi-progress', tres.progreso + '%');
    texto('k3-kpi-progress-hint', tres.inspeccionadas + ' de ' + tres.total + ' piezas revisadas');

    texto('k3-kpi-order', tres.orden !== null ? tres.orden + '%' : '--');
    texto('k3-kpi-order-hint', tres.orden !== null
      ? 'De cada par de piezas seguidas, ' + tres.orden + '% se revisó en el orden recomendado'
      : 'Inspecciona al menos 2 piezas para medirlo');

    texto('k3-kpi-avg', tres.tiempoMedioPiezaSeg > 0 ? K.formatearTiempo(tres.tiempoMedioPiezaSeg) : '--');
    texto('k3-kpi-avg-hint', tres.inspeccionesTotales > 0
      ? tres.inspeccionesTotales + ' aperturas de ficha · ' + tres.repasos + ' repasos'
      : 'Aún sin fichas consultadas');

    texto('k3-kpi-best', tres.mejorRecorridoSeg > 0 ? K.formatearTiempo(tres.mejorRecorridoSeg) : '--');
    texto('k3-kpi-best-hint', tres.recorridosCompletos > 0
      ? tres.recorridosCompletos + ' recorrido(s) completo(s) · último ' + K.formatearTiempo(tres.ultimoRecorridoSeg)
      : 'Sin recorridos completos aún');

    pintarPiezas(tres);
  }

  function pintarPiezas(tres) {
    var host = $('k3-parts');
    if (!host) return;

    var html = '';
    for (var i = 0; i < tres.piezas.length; i++) {
      var pieza = tres.piezas[i];
      var meta;

      if (pieza.inspeccionada) {
        meta = K.formatearTiempo(pieza.tiempoSeg) + ' · ' +
          pieza.vistas + (pieza.vistas === 1 ? ' visita' : ' visitas');
        if (pieza.ordenVisita) meta += ' · revisada en ' + pieza.ordenVisita + '.º lugar';
      } else {
        meta = 'Pendiente de revisar';
      }

      html +=
        '<div class="part-chip ' + (pieza.inspeccionada ? 'is-done' : 'is-pending') + '">' +
        '  <span class="part-chip-num">' + (pieza.inspeccionada ? '<i class="bi bi-check-lg"></i>' : pieza.num) + '</span>' +
        '  <span class="part-chip-body">' +
        '    <span class="part-chip-name">' + pieza.nombre + '</span>' +
        '    <span class="part-chip-meta">' + meta + '</span>' +
        '  </span>' +
        '</div>';
    }

    host.innerHTML = html;
  }

  /* ========================================================
     3. Compuerta de autenticación
     ======================================================== */
  function aplicar(activa) {
    var host = $('k3-kpi-host');

    if (plantillaKpis === null && host) plantillaKpis = host.innerHTML;

    // El acceso a la sala queda cerrado sin sesión
    K.protegerAccion($('k3-enter'), 'Entrar a la sala de inspección');

    if (!activa) {
      pintarEncabezado(null, false);
      if (host) {
        K.marcarBloqueado(host,
          'La sala de inspección registra qué piezas revisas, cuánto tardas y en qué orden. Ese seguimiento requiere una cuenta identificada.');
      }
      return;
    }

    if (host && plantillaKpis !== null) host.innerHTML = plantillaKpis;

    var tres = K.resumen3D();
    pintarEncabezado(tres, true);
    pintarKpis(tres);
  }

  function arrancar() {
    K.alCambiarSesion(aplicar);
    K.suscribir(function () { aplicar(K.haySesion()); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(window);
