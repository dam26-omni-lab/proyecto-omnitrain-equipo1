/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 8: panel-info.js
   Toda la interfaz en HTML/Bootstrap: panel de la pieza, aviso de
   proximidad, placa de avance y avisos emergentes.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var U = (SIM.UI = {});

  var $ = function (sel) { return document.querySelector(sel); };

  U.iniciar = function () {
    U.panel = $('#panel-detalle');
    U.cuerpo = $('#panel-cuerpo');
    U.aviso = $('#aviso-proximidad');
    U.avisoTexto = $('#aviso-texto');
    U.placa = $('#placa-avance');
    U.marcas = $('#placa-marcas');
    U.contador = $('#placa-contador');
    U.zonaAvisos = $('#zona-avisos');
    U.pintarMarcas({});
  };

  /* ---------- Aviso de proximidad ---------- */
  U.mostrarAviso = function (parte, listo) {
    U.avisoTexto.innerHTML =
      '<span class="aviso-num">' + String(parte.num).padStart(2, '0') + '</span>' +
      '<span class="aviso-nombre">' + parte.nombre + '</span>' +
      '<span class="aviso-tecla">E</span>' +
      '<span class="aviso-accion">' + (listo ? 'revisar de nuevo' : 'inspeccionar') + '</span>';
    U.aviso.classList.add('visible');
  };

  U.ocultarAviso = function () {
    U.aviso.classList.remove('visible');
  };

  /* ---------- Panel de detalle ---------- */
  U.abrirPanel = function (parte) {
    U.cuerpo.innerHTML = plantilla(parte);
    U.panel.classList.add('abierto');
    U.panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modo-detalle');
  };

  U.cerrarPanel = function () {
    U.panel.classList.remove('abierto');
    U.panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modo-detalle');
  };

  function lista(items, clase, icono) {
    var html = '<ul class="lista-' + clase + '">';
    for (var i = 0; i < items.length; i++) {
      html += '<li><i class="bi ' + icono + '"></i><span>' + items[i] + '</span></li>';
    }
    return html + '</ul>';
  }

  function plantilla(p) {
    var filas = '';
    for (var i = 0; i < p.datos.length; i++) {
      filas += '<div class="ficha-fila"><dt>' + p.datos[i].k + '</dt><dd>' + p.datos[i].v + '</dd></div>';
    }
    return '' +
      '<header class="pieza-encabezado">' +
      '  <div class="pieza-num">' + String(p.num).padStart(2, '0') + '</div>' +
      '  <div>' +
      '    <h2 class="pieza-titulo">' + p.nombre + '</h2>' +
      '    <p class="pieza-tipo"><i class="bi ' + p.icono + '"></i> ' + p.tipo + '</p>' +
      '  </div>' +
      '</header>' +
      '<p class="pieza-resumen">' + p.resumen + '</p>' +
      '<section class="bloque">' +
      '  <h3 class="bloque-titulo">Qué hace</h3>' +
      lista(p.funciones, 'funciones', 'bi-caret-right-fill') +
      '</section>' +
      '<section class="bloque">' +
      '  <h3 class="bloque-titulo">Ficha técnica</h3>' +
      '  <dl class="ficha">' + filas + '</dl>' +
      '</section>' +
      '<section class="bloque">' +
      '  <h3 class="bloque-titulo">En la revisión mensual</h3>' +
      lista(p.revision, 'revision', 'bi-check2-square') +
      '</section>' +
      '<footer class="pieza-norma"><i class="bi bi-journal-text"></i><span>' + p.norma + '</span></footer>';
  }

  /* ---------- Placa de avance (arriba a la izquierda) ---------- */
  U.pintarMarcas = function (inspeccionadas) {
    var html = '';
    for (var i = 0; i < SIM.PARTES.length; i++) {
      var p = SIM.PARTES[i];
      var listo = !!inspeccionadas[p.id];
      html += '<span class="marca' + (listo ? ' listo' : '') + '" title="' + p.nombre + '">' +
        (listo ? '<i class="bi bi-check-lg"></i>' : String(p.num)) + '</span>';
    }
    U.marcas.innerHTML = html;
    var hechas = 0;
    for (var k in inspeccionadas) if (inspeccionadas[k]) hechas++;
    U.contador.textContent = hechas + ' / ' + SIM.PARTES.length;
    U.placa.classList.toggle('completa', hechas === SIM.PARTES.length);
  };

  /* ---------- Avisos emergentes ---------- */
  U.avisar = function (texto, icono, tono) {
    var el = document.createElement('div');
    el.className = 'aviso-flotante ' + (tono || 'ok');
    el.innerHTML = '<i class="bi ' + (icono || 'bi-check-circle-fill') + '"></i><span>' + texto + '</span>';
    U.zonaAvisos.appendChild(el);
    setTimeout(function () { el.classList.add('sale'); }, 2600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  };

  /* ---------- Cierre del recorrido ---------- */
  U.mostrarResumen = function () {
    var modal = $('#modal-final');
    modal.classList.add('visible');
  };
  U.ocultarResumen = function () {
    $('#modal-final').classList.remove('visible');
  };
})(window);
