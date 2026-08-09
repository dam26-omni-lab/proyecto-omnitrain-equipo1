/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 6: controles.js
   A) Primera persona: WASD + ratón con bloqueo de puntero.
   B) Órbita de detalle: arrastre para girar 360°, rueda para acercar.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});

  /* =========================================================
     A) CAMINAR POR LA SALA
     ========================================================= */
  var FP = (SIM.Caminar = {});

  FP.velocidad = 3.1;
  FP.velocidadCorrer = 5.2;
  FP.sensibilidad = 0.0022;
  FP.activo = false;
  FP.bloqueado = false;

  /* Modo táctil: en móvil y tablet no existe el bloqueo de puntero, así
     que el recorrido se controla desde los mandos en pantalla que crea
     controles-tactil.js. Ese archivo activa esta bandera. */
  FP.modoTactil = false;
  FP.entrada = { ad: 0, lat: 0, correr: false };

  var teclas = {};
  var giroY = 0, giroX = 0;
  var balanceo = 0;
  var lienzo = null;

  FP.iniciar = function (elemento) {
    lienzo = elemento;

    document.addEventListener('keydown', function (e) {
      teclas[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    });
    document.addEventListener('keyup', function (e) { teclas[e.code] = false; });
    window.addEventListener('blur', function () { teclas = {}; });

    document.addEventListener('pointerlockchange', function () {
      FP.bloqueado = document.pointerLockElement === lienzo;
      if (SIM.App) SIM.App.alCambiarBloqueo(FP.bloqueado);
    });

    document.addEventListener('mousemove', function (e) {
      if (!FP.bloqueado || !FP.activo) return;
      giroY -= e.movementX * FP.sensibilidad;
      giroX -= e.movementY * FP.sensibilidad;
      var limite = Math.PI / 2 - 0.05;
      giroX = Math.max(-limite, Math.min(limite, giroX));
    });
  };

  /* Giro de cámara desde el arrastre táctil (píxeles recorridos) */
  FP.girarPor = function (dx, dy) {
    giroY -= dx * FP.sensibilidad * 1.7;
    giroX -= dy * FP.sensibilidad * 1.7;
    var limite = Math.PI / 2 - 0.05;
    giroX = Math.max(-limite, Math.min(limite, giroX));
  };

  FP.pedirBloqueo = function () {
    if (FP.modoTactil) {
      // En táctil el control es inmediato: no hay puntero que bloquear.
      FP.bloqueado = true;
      if (SIM.App) SIM.App.alCambiarBloqueo(true);
      return;
    }
    if (!lienzo) return;
    var p = lienzo.requestPointerLock && lienzo.requestPointerLock();
    if (p && p.catch) p.catch(function () { /* el navegador lo rechazó, se reintenta con el clic */ });
  };

  FP.soltarBloqueo = function () {
    if (FP.modoTactil) {
      FP.bloqueado = false;
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
  };

  FP.sincronizarConCamara = function (camara) {
    giroY = camara.rotation.y;
    giroX = camara.rotation.x;
  };

  FP.orientacion = function () { return giroY; };

  FP.actualizar = function (dt, camara) {
    camara.rotation.order = 'YXZ';
    camara.rotation.y = giroY;
    camara.rotation.x = giroX;
    camara.rotation.z = 0;

    if (!FP.activo) return;

    var ad = 0, lat = 0;
    if (teclas['KeyW'] || teclas['ArrowUp']) ad += 1;
    if (teclas['KeyS'] || teclas['ArrowDown']) ad -= 1;
    if (teclas['KeyD'] || teclas['ArrowRight']) lat += 1;
    if (teclas['KeyA'] || teclas['ArrowLeft']) lat -= 1;

    // Palanca en pantalla (móvil y tablet)
    ad += FP.entrada.ad;
    lat += FP.entrada.lat;
    ad = Math.max(-1, Math.min(1, ad));
    lat = Math.max(-1, Math.min(1, lat));

    if (ad === 0 && lat === 0) {
      balanceo *= 0.9;
      camara.position.y += (SIM.Escena.ALTURA_OJOS - camara.position.y) * Math.min(1, dt * 8);
      return;
    }

    var largo = Math.hypot(ad, lat);
    ad /= largo; lat /= largo;

    var vel = (teclas['ShiftLeft'] || teclas['ShiftRight'] || FP.entrada.correr) ? FP.velocidadCorrer : FP.velocidad;
    var sin = Math.sin(giroY), cos = Math.cos(giroY);
    // Adelante en el espacio de la cámara es -Z
    var dx = (-sin * ad + cos * lat) * vel * dt;
    var dz = (-cos * ad - sin * lat) * vel * dt;

    SIM.Escena.resolverMovimiento(camara.position, dx, dz);

    balanceo += dt * vel * 2.6;
    camara.position.y = SIM.Escena.ALTURA_OJOS + Math.sin(balanceo) * 0.028;
  };

  FP.teclaPresionada = function (codigo) { return !!teclas[codigo]; };

  /* =========================================================
     B) ROTAR LA PIEZA EN LA VISTA DE DETALLE
     ========================================================= */
  var OR = (SIM.Orbita = {});

  OR.activo = false;
  OR.auto = true;
  OR.zoom = -1.55;
  var arrastrando = false, ultX = 0, ultY = 0, velY = 0, velX = 0;

  OR.iniciar = function (elemento) {
    elemento.addEventListener('pointerdown', function (e) {
      if (!OR.activo) return;
      arrastrando = true;
      OR.auto = false;
      ultX = e.clientX; ultY = e.clientY;
      elemento.setPointerCapture(e.pointerId);
      elemento.classList.add('arrastrando');
    });
    elemento.addEventListener('pointermove', function (e) {
      if (!OR.activo || !arrastrando) return;
      var dx = e.clientX - ultX, dy = e.clientY - ultY;
      ultX = e.clientX; ultY = e.clientY;
      velY = dx * 0.006;
      velX = dy * 0.006;
      aplicarGiro();
    });
    function soltar(e) {
      arrastrando = false;
      elemento.classList.remove('arrastrando');
      if (e && e.pointerId !== undefined && elemento.hasPointerCapture && elemento.hasPointerCapture(e.pointerId)) {
        elemento.releasePointerCapture(e.pointerId);
      }
    }
    elemento.addEventListener('pointerup', soltar);
    elemento.addEventListener('pointercancel', soltar);
    elemento.addEventListener('pointerleave', soltar);

    elemento.addEventListener('wheel', function (e) {
      if (!OR.activo) return;
      e.preventDefault();
      OR.zoom += (e.deltaY > 0 ? 0.12 : -0.12);
      OR.zoom = Math.max(-2.6, Math.min(-0.95, OR.zoom));
    }, { passive: false });
  };

  function aplicarGiro() {
    var p = SIM.Escena.pivote;
    if (!p) return;
    p.rotation.y += velY;
    p.rotation.x += velX;
    p.rotation.x = Math.max(-1.35, Math.min(1.35, p.rotation.x));
  }

  OR.reiniciar = function () {
    if (SIM.Escena.pivote) SIM.Escena.pivote.rotation.set(0, 0, 0);
    OR.zoom = -1.55;
    velX = velY = 0;
  };

  OR.actualizar = function (dt) {
    if (!OR.activo) return;
    var p = SIM.Escena.pivote;
    if (!p) return;

    if (SIM.Caminar.teclaPresionada('KeyA') || SIM.Caminar.teclaPresionada('ArrowLeft')) { p.rotation.y -= dt * 1.6; OR.auto = false; }
    if (SIM.Caminar.teclaPresionada('KeyD') || SIM.Caminar.teclaPresionada('ArrowRight')) { p.rotation.y += dt * 1.6; OR.auto = false; }
    if (SIM.Caminar.teclaPresionada('KeyW') || SIM.Caminar.teclaPresionada('ArrowUp')) { p.rotation.x = Math.max(-1.35, p.rotation.x - dt * 1.2); OR.auto = false; }
    if (SIM.Caminar.teclaPresionada('KeyS') || SIM.Caminar.teclaPresionada('ArrowDown')) { p.rotation.x = Math.min(1.35, p.rotation.x + dt * 1.2); OR.auto = false; }

    if (!arrastrando) {
      // Inercia después de soltar el arrastre
      velY *= 0.92; velX *= 0.92;
      if (Math.abs(velY) > 0.0004 || Math.abs(velX) > 0.0004) aplicarGiro();
      if (OR.auto) p.rotation.y += dt * 0.55;
    }

    var rig = SIM.Escena.rigDetalle;
    rig.position.z += (OR.zoom - rig.position.z) * Math.min(1, dt * 7);
  };
})(window);
