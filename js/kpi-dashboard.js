/* ============================================================
   OmniTrain · Indicadores del dashboard principal
   ------------------------------------------------------------
   Pinta el resumen de nivel superior a partir del desempeño real
   registrado en los dos módulos con seguimiento funcional:
   Simulador 2D y Entorno 3D. Sin sesión iniciada, los KPIs se
   sustituyen por la compuerta de acceso.
   ============================================================ */
(function (global) {
  'use strict';

  var K = global.OmniKPI;
  if (!K) return;

  var $ = function (id) { return document.getElementById(id); };

  /* Copia del bloque de indicadores para poder restaurarlo cuando
     el usuario vuelve a iniciar sesión sin recargar la página. */
  var plantillaIndicadores = null;
  var plantillaResumen = null;

  function texto(id, valor) {
    var el = $(id);
    if (el) el.textContent = valor;
  }

  /* ========================================================
     1. Pintado con datos reales
     ======================================================== */
  function pintarDatos() {
    var r = K.resumen();
    var dos = r.dos;
    var tres = r.tres;

    // --- Progreso global ---
    texto('kpi-global-text', r.progresoGlobal + '%');
    var barra = $('kpi-global-bar');
    var pista = $('kpi-global-track');
    if (barra) barra.style.width = r.progresoGlobal + '%';
    if (pista) pista.setAttribute('aria-valuenow', String(r.progresoGlobal));
    texto('kpi-global-hint',
      'Simulador 2D ' + dos.progreso + '% · Entorno 3D ' + tres.progreso + '%');

    // --- Tarjetas de resumen ---
    texto('kpi-sum-2d', dos.completados + '/' + dos.total);
    texto('kpi-sum-3d', tres.inspeccionadas + '/' + tres.total);
    texto('kpi-sum-time', K.formatearTiempo(tres.tiempoSalaSeg));

    // --- Indicadores ---
    texto('kpi-ind-2d', dos.progreso + '%');
    texto('kpi-ind-2d-badge', dos.completados + '/' + dos.total);
    texto('kpi-ind-2d-hint', dos.intentados > 0
      ? 'Mejor puntaje ' + dos.mejorPuntaje + '% · ' + dos.intentados + ' de 3 escenarios jugados'
      : 'Aún sin intentos registrados');

    texto('kpi-ind-time', dos.mejorTiempoSeg > 0 ? dos.mejorTiempoSeg.toFixed(1) + 's' : '--');
    texto('kpi-ind-time-hint', dos.mejorTiempoSeg > 0
      ? 'Mejor marca apagando el fuego (menos es mejor)'
      : 'Sin intentos registrados');

    texto('kpi-ind-3d', tres.progreso + '%');
    texto('kpi-ind-3d-badge', tres.inspeccionadas + '/' + tres.total);
    texto('kpi-ind-3d-hint', tres.inspeccionadas > 0
      ? tres.inspeccionesTotales + ' inspecciones · ' + K.formatearTiempo(tres.tiempoSalaSeg) + ' en sala'
      : 'Piezas del extintor inspeccionadas');

    texto('kpi-ind-tech', tres.orden !== null ? tres.orden + '%' : '--');
    texto('kpi-ind-tech-hint', tres.orden !== null
      ? 'Apego al orden de revisión recomendado'
      : 'Inspecciona al menos 2 piezas para medirlo');

    pintarSiguientePaso(dos, tres);
  }

  /* ========================================================
     2. Recomendación del siguiente paso
     ======================================================== */
  function pintarSiguientePaso(dos, tres) {
    var caja = $('kpi-next-step');
    if (!caja) return;

    var titulo = 'Siguiente paso';
    var mensaje = '';

    if (dos.intentados === 0 && tres.inspeccionadas === 0) {
      titulo = 'Comienza tu entrenamiento';
      mensaje = 'Todavía no hay actividad registrada. Empieza por el Escenario 1 del Simulador 2D (Extintor PQS) o recorre la sala de inspección del Entorno 3D.';
    } else if (!tres.completo && tres.inspeccionadas > 0) {
      titulo = 'Termina la inspección del extintor';
      mensaje = 'Te faltan ' + (tres.total - tres.inspeccionadas) + ' de ' + tres.total +
        ' piezas por revisar en el Entorno 3D para cerrar el recorrido completo.';
    } else if (dos.completados < dos.total) {
      var pendiente = dos.escenarios.filter(function (e) { return !e.aprobado; })[0];
      titulo = 'Continúa en el Simulador 2D';
      mensaje = 'Te falta aprobar el escenario "' + pendiente.nombre + '" (' + pendiente.nivel +
        '). Se necesita 100% en su cuestionario para avanzar.';
    } else {
      titulo = 'Módulos al día';
      mensaje = 'Completaste los ' + dos.total + ' escenarios del Simulador 2D y las ' + tres.total +
        ' piezas del Entorno 3D. Repite un escenario para mejorar tu tiempo de reacción.';
    }

    texto('kpi-next-title', titulo);
    texto('kpi-next-text', mensaje);
    caja.classList.remove('d-none');
    caja.classList.add('d-flex');
  }

  /* ========================================================
     3. Compuerta de autenticación
     ======================================================== */
  function aplicarCompuerta(activa) {
    var hostIndicadores = $('kpi-indicators-host');
    var hostResumen = $('kpi-summary-host');
    var siguiente = $('kpi-next-step');

    if (plantillaIndicadores === null && hostIndicadores) {
      plantillaIndicadores = hostIndicadores.innerHTML;
    }
    if (plantillaResumen === null && hostResumen) {
      plantillaResumen = hostResumen.innerHTML;
    }

    // La navegación entre módulos queda siempre abierta: el dashboard es
    // un índice del sitio. Lo que se reserva a las cuentas con sesión es
    // el acceso a los simuladores y el registro de KPIs, y eso ya se
    // valida dentro de cada módulo (index2d.html, index3d.html y las
    // páginas de juego).

    if (!activa) {
      if (hostIndicadores) {
        K.marcarBloqueado(hostIndicadores,
          'Tus indicadores de desempeño se calculan a partir de tu actividad en los simuladores, así que necesitan una cuenta identificada.');
      }
      if (hostResumen) {
        hostResumen.innerHTML =
          '<div class="kpi-empty mt-3">' +
          '  <i class="bi bi-person-lock" aria-hidden="true"></i>' +
          '  Inicia sesión para ver tu avance en los módulos.' +
          '</div>';
      }
      if (siguiente) {
        siguiente.classList.add('d-none');
        siguiente.classList.remove('d-flex');
      }

      // El progreso global se muestra en cero mientras no haya sesión
      texto('kpi-global-text', '--');
      var barra = $('kpi-global-bar');
      if (barra) barra.style.width = '0%';
      texto('kpi-global-hint', 'Disponible al iniciar sesión.');
      return;
    }

    // Con sesión: se restauran las tarjetas y se pintan los datos
    if (hostIndicadores && plantillaIndicadores !== null) {
      hostIndicadores.innerHTML = plantillaIndicadores;
    }
    if (hostResumen && plantillaResumen !== null) {
      hostResumen.innerHTML = plantillaResumen;
    }
    pintarDatos();
  }

  function arrancar() {
    K.alCambiarSesion(aplicarCompuerta);
    K.suscribir(function () { aplicarCompuerta(K.haySesion()); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(window);
