/* ============================================================
   OmniTrain · Analítica detallada de KPIs
   ------------------------------------------------------------
   A diferencia del dashboard (que resume), esta pantalla abre el
   desglose: escenario por escenario, pieza por pieza, y la
   bitácora que permite ver la evolución en el tiempo.
   Todos los datos provienen del desempeño real registrado.
   ============================================================ */
(function (global) {
  'use strict';

  var K = global.OmniKPI;
  if (!K) return;

  var $ = function (id) { return document.getElementById(id); };
  var plantilla = null;

  function texto(id, valor) {
    var el = $(id);
    if (el) el.textContent = valor;
  }

  function escapar(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ========================================================
     1. Encabezado (fuera de la compuerta)
     ======================================================== */
  function pintarEncabezado(resumen, activa) {
    var barra = $('km-global-bar');
    var pista = $('km-global-track');

    if (!activa) {
      texto('km-global-text', '--');
      texto('km-global-hint', 'Inicia sesión para consultar tu analítica.');
      texto('km-hero-sub', 'El desglose de desempeño requiere una cuenta identificada');
      if (barra) barra.style.width = '0%';
      return;
    }

    texto('km-global-text', resumen.progresoGlobal + '%');
    if (barra) barra.style.width = resumen.progresoGlobal + '%';
    if (pista) pista.setAttribute('aria-valuenow', String(resumen.progresoGlobal));
    texto('km-global-hint',
      'Simulador 2D ' + resumen.dos.progreso + '% · Entorno 3D ' + resumen.tres.progreso + '%');
    texto('km-hero-sub', resumen.hayDatos
      ? 'Desglose detallado de tu desempeño por módulo'
      : 'Todavía no hay actividad registrada: juega un escenario o recorre la sala 3D');
  }

  /* ========================================================
     2. Indicadores generales y calidad
     ======================================================== */
  function pintarGenerales(r) {
    var dos = r.dos;
    var tres = r.tres;

    texto('km-kpi-global', r.progresoGlobal + '%');
    texto('km-kpi-global-hint', 'Promedio de los 2 módulos con seguimiento');

    texto('km-kpi-2d', dos.completados + '/' + dos.total);
    texto('km-kpi-2d-hint', dos.intentados + ' de ' + dos.total + ' escenarios intentados');

    texto('km-kpi-3d', tres.inspeccionadas + '/' + tres.total);
    texto('km-kpi-3d-hint', tres.recorridosCompletos > 0
      ? tres.recorridosCompletos + ' recorrido(s) completo(s)'
      : 'Anatomía del extintor portátil');

    texto('km-kpi-time', K.formatearTiempo(tres.tiempoSalaSeg));
    texto('km-kpi-time-hint', tres.sesiones > 0
      ? tres.sesiones + ' entradas a la sala de inspección'
      : 'Medido dentro del entorno 3D');

    // Progreso por módulo
    var barra2d = $('km-bar-2d');
    var barra3d = $('km-bar-3d');
    if (barra2d) barra2d.style.width = dos.progreso + '%';
    if (barra3d) barra3d.style.width = tres.progreso + '%';
    texto('km-val-2d', dos.progreso + '%');
    texto('km-val-3d', tres.progreso + '%');

    // Calidad del desempeño
    texto('km-q-best', dos.mejorPuntaje > 0 ? dos.mejorPuntaje + '%' : '--');
    texto('km-q-avg', dos.promedioPuntaje > 0 ? dos.promedioPuntaje + '%' : '--');
    texto('km-q-react', dos.ultimoTiempoReaccionSeg > 0 ? dos.ultimoTiempoReaccionSeg + 's' : '--');
    texto('km-q-fast', dos.mejorTiempoSeg > 0 ? dos.mejorTiempoSeg.toFixed(1) + 's' : '--');
    texto('km-q-order', tres.orden !== null ? tres.orden + '%' : '--');
    texto('km-q-precision', tres.precision !== null ? tres.precision + '%' : '--');
  }

  /* ========================================================
     3. Tabla del Simulador 2D
     ======================================================== */
  function pintarTabla2D(dos) {
    var cuerpo = $('km-tabla-2d');
    if (!cuerpo) return;

    var html = '';
    for (var i = 0; i < dos.escenarios.length; i++) {
      var e = dos.escenarios[i];
      var estado, clase;

      if (e.aprobado) {
        estado = 'Aprobado';
        clase = 'status-success';
      } else if (e.intentado) {
        estado = 'En progreso';
        clase = 'status-warning';
      } else {
        estado = 'Pendiente';
        clase = 'status-danger';
      }

      html +=
        '<tr>' +
        '  <td><strong>' + escapar(e.nombre) + '</strong></td>' +
        '  <td>' + escapar(e.nivel) + '</td>' +
        '  <td>' +
        '    <div class="d-flex align-items-center gap-2">' +
        '      <div class="mini-bar"><div class="mini-bar-fill ' +
             (e.puntaje >= 100 ? 'mini-bar-green' : 'mini-bar-yellow') +
        '" style="width:' + e.puntaje + '%"></div></div>' +
        '      <span class="text-nowrap">' + e.puntaje + '%</span>' +
        '    </div>' +
        '  </td>' +
        '  <td class="text-nowrap">' + K.formatearSegundosDecimal(e.mejorTiempoSeg) + '</td>' +
        '  <td class="text-nowrap">' + K.formatearSegundosDecimal(e.ultimoTiempoSeg) + '</td>' +
        '  <td><span class="status-badge ' + clase + ' text-nowrap">' + estado + '</span></td>' +
        '</tr>';
    }

    cuerpo.innerHTML = html;
  }

  /* ========================================================
     4. Tabla del Entorno 3D
     ======================================================== */
  function pintarTabla3D(tres) {
    var cuerpo = $('km-tabla-3d');
    if (!cuerpo) return;

    var html = '';
    for (var i = 0; i < tres.piezas.length; i++) {
      var pieza = tres.piezas[i];
      var enOrden = pieza.ordenVisita === pieza.num;

      var orden;
      if (!pieza.inspeccionada) {
        orden = '<span class="text-muted-custom">--</span>';
      } else if (enOrden) {
        orden = '<span class="text-nowrap">' + pieza.ordenVisita + '.º <i class="bi bi-check-circle-fill icon-success"></i></span>';
      } else {
        orden = '<span class="text-nowrap">' + pieza.ordenVisita + '.º (esperado ' + pieza.num + '.º)</span>';
      }

      html +=
        '<tr>' +
        '  <td><span class="rank-badge">' + pieza.num + '</span></td>' +
        '  <td><strong>' + escapar(pieza.nombre) + '</strong></td>' +
        '  <td>' + (pieza.inspeccionada ? pieza.vistas : '--') + '</td>' +
        '  <td class="text-nowrap">' + (pieza.inspeccionada ? K.formatearTiempo(pieza.tiempoSeg) : '--') + '</td>' +
        '  <td>' + orden + '</td>' +
        '  <td><span class="status-badge ' + (pieza.inspeccionada ? 'status-success' : 'status-danger') +
             ' text-nowrap">' + (pieza.inspeccionada ? 'Inspeccionada' : 'Pendiente') + '</span></td>' +
        '</tr>';
    }

    cuerpo.innerHTML = html;

    texto('km-3d-nota', tres.repasos > 0
      ? 'Repasaste ' + tres.repasos + ' ficha(s) ya vistas. Repasar no baja tu progreso, pero sí la precisión del recorrido.'
      : 'El orden recomendado va del cilindro a la base de apoyo, igual que la revisión visual mensual en campo.');
  }

  /* ========================================================
     5. Bitácora
     ======================================================== */
  function pintarBitacora(historial) {
    var lista = $('km-log');
    if (!lista) return;

    if (!historial.length) {
      lista.innerHTML =
        '<li><div class="kpi-empty w-100">' +
        '<i class="bi bi-clock-history" aria-hidden="true"></i>' +
        'Sin movimientos todavía. Cada escenario jugado y cada recorrido 3D queda registrado aquí.' +
        '</div></li>';
      return;
    }

    var html = '';
    for (var i = 0; i < historial.length && i < 12; i++) {
      var evento = historial[i];
      html +=
        '<li>' +
        '  <span class="kpi-log-mod">' + escapar(evento.modulo) + '</span>' +
        '  <span class="kpi-log-text">' + escapar(evento.texto) + '</span>' +
        (evento.valor ? '  <span class="kpi-log-val">' + escapar(evento.valor) + '</span>' : '') +
        '  <span class="kpi-log-date">' + K.formatearFecha(evento.ts) + '</span>' +
        '</li>';
    }

    lista.innerHTML = html;
  }

  /* ========================================================
     6. Exportación real a CSV (sin librerías externas)
     ======================================================== */
  function exportarCSV() {
    if (!K.haySesion()) return;

    var r = K.resumen();
    var filas = [
      ['Modulo', 'Indicador', 'Valor'],
      ['General', 'Progreso global', r.progresoGlobal + '%'],
      ['General', 'Tiempo de practica en entorno 3D', K.formatearTiempo(r.tres.tiempoSalaSeg)],
      ['Simulador 2D', 'Progreso del modulo', r.dos.progreso + '%'],
      ['Simulador 2D', 'Escenarios aprobados', r.dos.completados + ' de ' + r.dos.total],
      ['Simulador 2D', 'Mejor puntaje', r.dos.mejorPuntaje + '%'],
      ['Simulador 2D', 'Mejor tiempo de extincion', K.formatearSegundosDecimal(r.dos.mejorTiempoSeg)],
      ['Entorno 3D', 'Progreso del modulo', r.tres.progreso + '%'],
      ['Entorno 3D', 'Piezas inspeccionadas', r.tres.inspeccionadas + ' de ' + r.tres.total],
      ['Entorno 3D', 'Precision del recorrido', r.tres.precision !== null ? r.tres.precision + '%' : 'sin datos'],
      ['Entorno 3D', 'Tecnica (orden de revision)', r.tres.orden !== null ? r.tres.orden + '%' : 'sin datos'],
      ['Entorno 3D', 'Recorridos completos', String(r.tres.recorridosCompletos)]
    ];

    var i;
    for (i = 0; i < r.dos.escenarios.length; i++) {
      var e = r.dos.escenarios[i];
      filas.push(['Simulador 2D · detalle', e.nombre,
        'cuestionario ' + e.puntaje + '% / mejor tiempo ' + K.formatearSegundosDecimal(e.mejorTiempoSeg)]);
    }
    for (i = 0; i < r.tres.piezas.length; i++) {
      var pieza = r.tres.piezas[i];
      filas.push(['Entorno 3D · detalle', pieza.num + '. ' + pieza.nombre,
        (pieza.inspeccionada ? 'inspeccionada' : 'pendiente') +
        ' / ' + pieza.vistas + ' visitas / ' + K.formatearTiempo(pieza.tiempoSeg)]);
    }

    var csv = filas.map(function (fila) {
      return fila.map(function (celda) {
        return '"' + String(celda).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');

    // BOM para que Excel reconozca los acentos
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'omnitrain-kpis-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ========================================================
     7. Compuerta de autenticación
     ======================================================== */
  function aplicar(activa) {
    var host = $('km-host');
    var exportar = $('km-export');

    if (plantilla === null && host) plantilla = host.innerHTML;

    if (exportar) {
      exportar.disabled = !activa;
      exportar.classList.toggle('is-gated', !activa);
    }

    if (!activa) {
      pintarEncabezado(null, false);
      if (host) {
        K.marcarBloqueado(host,
          'La analítica muestra tu desempeño personal en los simuladores, así que solo está disponible con la sesión iniciada.');
      }
      return;
    }

    if (host && plantilla !== null) host.innerHTML = plantilla;

    var r = K.resumen();
    pintarEncabezado(r, true);
    pintarGenerales(r);
    pintarTabla2D(r.dos);
    pintarTabla3D(r.tres);
    pintarBitacora(r.historial);
  }

  function arrancar() {
    var exportar = $('km-export');
    if (exportar) exportar.addEventListener('click', exportarCSV);

    K.alCambiarSesion(aplicar);
    K.suscribir(function () { aplicar(K.haySesion()); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(window);
