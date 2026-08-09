/* ============================================================
   OmniTrain · Showroom 3D
   Mandos táctiles para teléfono y tablet
   ------------------------------------------------------------
   En un equipo con pantalla táctil no existe el bloqueo de puntero,
   así que el recorrido se controla con:
     · Palanca virtual (abajo a la izquierda) para caminar.
     · Arrastre sobre el resto de la pantalla para mirar.
     · Botón "Inspeccionar" cuando hay una mesa cerca.
   Todo se dibuja con elementos normales del DOM: sin librerías.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var T = (SIM.Tactil = {});

  var RADIO = 52;      // radio útil de la palanca, en píxeles
  var ZONA_MUERTA = 8; // desplazamiento mínimo para empezar a caminar

  var capa, palanca, punto, botonInspeccionar, botonSalir;
  var idPalanca = null, idMirada = null;
  var centroX = 0, centroY = 0;
  var ultX = 0, ultY = 0;
  var iniciado = false;

  T.disponible = function () {
    try {
      return ('ontouchstart' in global) ||
        (global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    } catch (e) {
      return false;
    }
  };

  T.iniciar = function () {
    if (iniciado || !T.disponible()) return;
    iniciado = true;

    SIM.Caminar.modoTactil = true;
    document.body.classList.add('modo-tactil');

    construir();
    conectar();
    requestAnimationFrame(refrescar);
  };

  /* ========================================================
     Construcción de los mandos
     ======================================================== */
  function construir() {
    capa = document.createElement('div');
    capa.id = 'mandos-tactiles';
    capa.setAttribute('aria-hidden', 'true');

    palanca = document.createElement('div');
    palanca.className = 'mando-palanca';
    punto = document.createElement('span');
    punto.className = 'mando-punto';
    palanca.appendChild(punto);

    botonInspeccionar = document.createElement('button');
    botonInspeccionar.type = 'button';
    botonInspeccionar.className = 'mando-boton mando-inspeccionar';
    botonInspeccionar.innerHTML = '<i class="bi bi-search"></i><span>Inspeccionar</span>';

    botonSalir = document.createElement('button');
    botonSalir.type = 'button';
    botonSalir.className = 'mando-boton mando-salir';
    botonSalir.innerHTML = '<i class="bi bi-box-arrow-left"></i><span>Volver</span>';

    capa.appendChild(palanca);
    capa.appendChild(botonInspeccionar);
    capa.appendChild(botonSalir);
    document.body.appendChild(capa);
  }

  /* ========================================================
     Eventos
     ======================================================== */
  function conectar() {
    palanca.addEventListener('touchstart', function (e) {
      var toque = e.changedTouches[0];
      idPalanca = toque.identifier;
      var caja = palanca.getBoundingClientRect();
      centroX = caja.left + caja.width / 2;
      centroY = caja.top + caja.height / 2;
      palanca.classList.add('activa');
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var toque = e.changedTouches[i];

        if (toque.identifier === idPalanca) {
          moverPalanca(toque.clientX, toque.clientY);
          e.preventDefault();
        } else if (toque.identifier === idMirada) {
          if (SIM.Caminar.activo) {
            SIM.Caminar.girarPor(toque.clientX - ultX, toque.clientY - ultY);
          }
          ultX = toque.clientX;
          ultY = toque.clientY;
          e.preventDefault();
        }
      }
    }, { passive: false });

    function soltar(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var toque = e.changedTouches[i];
        if (toque.identifier === idPalanca) {
          idPalanca = null;
          SIM.Caminar.entrada.ad = 0;
          SIM.Caminar.entrada.lat = 0;
          SIM.Caminar.entrada.correr = false;
          punto.style.transform = 'translate(0px, 0px)';
          palanca.classList.remove('activa');
        }
        if (toque.identifier === idMirada) idMirada = null;
      }
    }

    document.addEventListener('touchend', soltar);
    document.addEventListener('touchcancel', soltar);

    // Arrastre para mirar: cualquier toque sobre el lienzo que no sea la palanca
    var lienzo = document.getElementById('lienzo-3d');
    if (lienzo) {
      lienzo.addEventListener('touchstart', function (e) {
        if (idMirada !== null) return;
        var toque = e.changedTouches[0];
        idMirada = toque.identifier;
        ultX = toque.clientX;
        ultY = toque.clientY;
      }, { passive: true });
    }

    botonInspeccionar.addEventListener('click', function () {
      if (SIM.App.modo === 'explorar' && SIM.App.cerca) {
        // Se reutiliza el mismo camino que la tecla E
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
      }
    });

    botonSalir.addEventListener('click', function () {
      if (SIM.App.modo === 'detalle') {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      }
    });
  }

  function moverPalanca(x, y) {
    var dx = x - centroX;
    var dy = y - centroY;
    var distancia = Math.hypot(dx, dy);

    if (distancia > RADIO) {
      dx = (dx / distancia) * RADIO;
      dy = (dy / distancia) * RADIO;
      distancia = RADIO;
    }

    punto.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';

    if (distancia < ZONA_MUERTA) {
      SIM.Caminar.entrada.ad = 0;
      SIM.Caminar.entrada.lat = 0;
      SIM.Caminar.entrada.correr = false;
      return;
    }

    // Arriba en pantalla = avanzar
    SIM.Caminar.entrada.ad = -dy / RADIO;
    SIM.Caminar.entrada.lat = dx / RADIO;
    SIM.Caminar.entrada.correr = distancia > RADIO * 0.85;
  }

  /* ========================================================
     Visibilidad de los botones según el estado del recorrido
     ======================================================== */
  function refrescar() {
    requestAnimationFrame(refrescar);
    if (!SIM.App) return;

    var enSala = SIM.App.modo === 'explorar';
    var enDetalle = SIM.App.modo === 'detalle';

    capa.classList.toggle('visible', enSala || enDetalle);
    palanca.style.display = enSala ? 'block' : 'none';
    botonInspeccionar.style.display = (enSala && SIM.App.cerca) ? 'inline-flex' : 'none';
    botonSalir.style.display = enDetalle ? 'inline-flex' : 'none';
  }
})(window);
