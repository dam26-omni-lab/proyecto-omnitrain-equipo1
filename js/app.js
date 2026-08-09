/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 9: app.js
   Une todo: estados del recorrido, transición suave entre
   exploración y detalle, guardado del avance y ciclo principal.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var A = (SIM.App = {});

  var CLAVE_AVANCE = 'omnitrain-showroom3d';
  var DURACION = 0.85; // segundos de la transición de cámara

  /* A dónde regresa el botón "Volver al dashboard".
     Cambia solo esta línea: los tres botones del módulo la usan. */
  A.RUTA_DASHBOARD = '../../index.html';

  /* Con false, cada visita arranca en 0 / 8 (lo normal para una práctica).
     Ponlo en true si quieres que el avance se conserve entre sesiones. */
  A.RECORDAR_AVANCE = false;

  A.modo = 'inicio';           // inicio · explorar · transicion · detalle
  A.estacionActual = null;
  var reloj = null;
  var lienzo3d, capaInicio;

  /* ---- Medición de KPIs reales del entorno 3D ----
     El núcleo compartido (js/omni-kpi.js) es el que persiste todo; aquí
     solo se cronometra y se le avisa. Sin sesión iniciada no se guarda
     nada: OmniKPI descarta la escritura. */
  var KPI = global.OmniKPI || null;
  var segSinVolcar = 0;      // tiempo en sala pendiente de guardar
  var inicioRecorrido = 0;   // ms en que se entró a la sala
  var inicioPieza = 0;       // ms en que se abrió la ficha actual
  var recorridoContado = false;
  var VOLCADO_CADA = 10;     // segundos entre guardados de tiempo en sala

  /* Datos de la transición de cámara */
  var trans = {
    activa: false, t: 0, dur: DURACION, hacia: 'detalle',
    posIni: new THREE.Vector3(), posFin: new THREE.Vector3(),
    quatIni: new THREE.Quaternion(), quatFin: new THREE.Quaternion()
  };
  var regreso = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  var auxiliar = new THREE.Object3D();

  function suavizar(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ========================================================
     Arranque
     ======================================================== */
  A.iniciar = function () {
    lienzo3d = document.getElementById('lienzo-3d');
    capaInicio = document.getElementById('capa-inicio');

    SIM.Escena.iniciar(lienzo3d);
    SIM.UI.iniciar();
    SIM.Caminar.iniciar(lienzo3d);
    SIM.Orbita.iniciar(document.getElementById('capa-orbita'));
    SIM.Hud.iniciar();

    cargarAvance();
    conectarEventos();
    enlazarDashboard();

    // Mandos en pantalla: se activan solos si el equipo es táctil
    if (SIM.Tactil) SIM.Tactil.iniciar();

    if (KPI) KPI.alCambiarSesion(aplicarCompuerta);

    // Al salir de la página se vuelca el tiempo pendiente
    window.addEventListener('pagehide', volcarTiempoPendiente);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') volcarTiempoPendiente();
    });

    reloj = new THREE.Clock();
    requestAnimationFrame(ciclo);
  };

  function volcarTiempoPendiente() {
    if (KPI && segSinVolcar > 0.5) {
      KPI.registrar3DTiempo(segSinVolcar);
      segSinVolcar = 0;
    }
  }

  function enlazarDashboard() {
    var enlaces = document.querySelectorAll('[data-dashboard]');
    for (var i = 0; i < enlaces.length; i++) {
      enlaces[i].setAttribute('href', A.RUTA_DASHBOARD);
      enlaces[i].addEventListener('click', function () {
        SIM.Caminar.soltarBloqueo();
      });
    }
  }

  function conectarEventos() {
    document.getElementById('btn-entrar').addEventListener('click', function () {
      entrarASala();
    });

    document.getElementById('btn-cerrar-panel').addEventListener('click', salirDeDetalle);
    document.getElementById('btn-girar-auto').addEventListener('click', function () {
      SIM.Orbita.auto = !SIM.Orbita.auto;
      this.classList.toggle('activo', SIM.Orbita.auto);
      this.querySelector('span').textContent = SIM.Orbita.auto ? 'Giro automático' : 'Giro manual';
    });
    document.getElementById('btn-reset-vista').addEventListener('click', function () {
      SIM.Orbita.reiniciar();
      SIM.Orbita.auto = true;
    });
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciarRecorrido);
    document.getElementById('btn-cerrar-final').addEventListener('click', function () {
      SIM.UI.ocultarResumen();
      if (A.modo === 'explorar') SIM.Caminar.pedirBloqueo();
    });
    document.getElementById('btn-repasar').addEventListener('click', function () {
      SIM.UI.ocultarResumen();
      reiniciarRecorrido();
    });

    document.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (A.modo === 'explorar' && A.cerca) entrarADetalle(A.cerca);
      }
      if (e.code === 'KeyQ' || e.code === 'Escape') {
        if (A.modo === 'detalle') salirDeDetalle();
      }
      if (e.code === 'KeyR' && A.modo === 'detalle') {
        SIM.Orbita.reiniciar();
      }
      if (e.code === 'KeyH') {
        document.body.classList.toggle('sin-hud');
      }
    });

    // Clic en la sala: activar la estación cercana
    lienzo3d.addEventListener('click', function () {
      if (A.modo === 'explorar') {
        if (!SIM.Caminar.bloqueado) { SIM.Caminar.pedirBloqueo(); return; }
        if (A.cerca) entrarADetalle(A.cerca);
      }
    });
  }

  function entrarASala() {
    if (KPI && !KPI.haySesion()) {
      mostrarCompuerta();
      return;
    }

    if (KPI && !inicioRecorrido) {
      KPI.registrar3DSesion();
      KPI.registrarEvento('Entorno 3D', 'Entró a la sala de inspección');
    }
    if (!inicioRecorrido) inicioRecorrido = Date.now();

    capaInicio.classList.remove('visible');
    A.modo = 'explorar';
    SIM.Caminar.activo = true;
    SIM.Caminar.pedirBloqueo();
    verificarBloqueo();
  }

  /* Algunos navegadores rechazan el bloqueo del puntero si se pide muy
     seguido. Si a los 400 ms seguimos sin bloqueo, mostramos la pausa. */
  function verificarBloqueo() {
    setTimeout(function () {
      if (A.modo === 'explorar' && !SIM.Caminar.bloqueado) A.alCambiarBloqueo(false);
    }, 400);
  }

  A.alCambiarBloqueo = function (bloqueado) {
    if (A.modo === 'explorar' && !bloqueado) {
      // El usuario salió del bloqueo: pausa
      capaInicio.classList.add('visible');
      capaInicio.dataset.estado = 'pausa';
      document.getElementById('inicio-titulo').textContent = 'Recorrido en pausa';
      document.getElementById('inicio-texto').textContent =
        'Da clic en “Continuar” para volver a tomar el control del brigadista.';
      document.getElementById('btn-entrar').innerHTML =
        '<i class="bi bi-play-fill"></i><span>Continuar</span>';
      SIM.Caminar.activo = false;
    } else if (bloqueado && A.modo === 'explorar') {
      capaInicio.classList.remove('visible');
      SIM.Caminar.activo = true;
    }
  };

  /* ========================================================
     Entrar y salir de la vista de detalle
     ======================================================== */
  function entrarADetalle(est) {
    if (A.modo !== 'explorar') return;
    A.estacionActual = est;
    A.modo = 'transicion';
    inicioPieza = Date.now();
    SIM.Caminar.activo = false;
    SIM.Caminar.soltarBloqueo();
    SIM.UI.ocultarAviso();

    regreso.pos.copy(SIM.Escena.camara.position);
    regreso.quat.copy(SIM.Escena.camara.quaternion);

    auxiliar.position.copy(est.poseOjo);
    auxiliar.lookAt(est.mira);

    trans.activa = true;
    trans.t = 0;
    trans.hacia = 'detalle';
    trans.posIni.copy(SIM.Escena.camara.position);
    trans.posFin.copy(est.poseOjo);
    trans.quatIni.copy(SIM.Escena.camara.quaternion);
    trans.quatFin.copy(auxiliar.quaternion);

    SIM.Escena.montarDetalle(est.parte.id);
    SIM.Orbita.reiniciar();
    SIM.Orbita.auto = true;
    SIM.UI.abrirPanel(est.parte);
    document.getElementById('btn-girar-auto').classList.add('activo');
    document.getElementById('btn-girar-auto').querySelector('span').textContent = 'Giro automático';
  }

  function salirDeDetalle() {
    if (A.modo !== 'detalle' && A.modo !== 'transicion') return;

    // Tiempo real dedicado a esta pieza: alimenta el KPI de
    // "tiempo medio por componente" del panel de métricas.
    if (KPI && A.estacionActual && inicioPieza) {
      var segundos = (Date.now() - inicioPieza) / 1000;
      KPI.registrar3DInspeccion(A.estacionActual.parte.id, segundos);
      inicioPieza = 0;
      revisarRecorridoCompleto();
    }

    SIM.Orbita.activo = false;
    SIM.UI.cerrarPanel();

    trans.activa = true;
    trans.t = 0;
    trans.hacia = 'explorar';
    trans.posIni.copy(SIM.Escena.camara.position);
    trans.posFin.copy(regreso.pos);
    trans.quatIni.copy(SIM.Escena.camara.quaternion);
    trans.quatFin.copy(regreso.quat);
    A.modo = 'transicion';
  }

  function terminarTransicion() {
    trans.activa = false;
    if (trans.hacia === 'detalle') {
      A.modo = 'detalle';
      SIM.Orbita.activo = true;
      registrarInspeccion(A.estacionActual.parte);
    } else {
      A.modo = 'explorar';
      SIM.Escena.limpiarDetalle();
      SIM.Caminar.sincronizarConCamara(SIM.Escena.camara);
      SIM.Caminar.activo = true;
      SIM.Caminar.pedirBloqueo();
      verificarBloqueo();
      A.estacionActual = null;
    }
  }

  /* ========================================================
     Avance
     ======================================================== */
  function registrarInspeccion(parte) {
    var nueva = SIM.Escena.marcarInspeccionada(parte.id);
    if (!nueva) return;
    SIM.UI.pintarMarcas(SIM.Escena.inspeccionadas);
    SIM.UI.avisar('Pieza ' + String(parte.num).padStart(2, '0') + ' registrada: ' + parte.nombre,
      'bi-clipboard2-check-fill', 'ok');
    guardarAvance();
    if (SIM.Escena.totalInspeccionadas() === SIM.PARTES.length) {
      setTimeout(function () { SIM.UI.mostrarResumen(); }, 900);
    }
  }

  function guardarAvance() {
    // El avance ya queda persistido pieza por pieza en el registro de
    // KPIs (OmniKPI.registrar3DInspeccion). Esta función se conserva
    // como respaldo cuando el núcleo de KPIs no está disponible.
    if (KPI || !A.RECORDAR_AVANCE) return;
    try {
      localStorage.setItem(CLAVE_AVANCE, JSON.stringify(Object.keys(SIM.Escena.inspeccionadas)));
    } catch (e) { /* modo privado: el avance solo dura la sesión */ }
  }

  function cargarAvance() {
    var ids = [];

    if (KPI && KPI.haySesion()) {
      // El avance mostrado es exactamente el que sostiene los KPIs:
      // ambas pantallas leen la misma fuente.
      var piezas = KPI.leer().showroom3D.piezas || {};
      ids = Object.keys(piezas);
    } else if (A.RECORDAR_AVANCE) {
      try {
        ids = JSON.parse(localStorage.getItem(CLAVE_AVANCE) || '[]');
      } catch (e) { ids = []; }
    } else {
      try { localStorage.removeItem(CLAVE_AVANCE); } catch (e) {}
    }

    for (var i = 0; i < ids.length; i++) SIM.Escena.marcarInspeccionada(ids[i]);
    recorridoContado = SIM.Escena.totalInspeccionadas() >= SIM.PARTES.length;
    SIM.UI.pintarMarcas(SIM.Escena.inspeccionadas);
  }

  function reiniciarRecorrido() {
    if (KPI) KPI.reiniciar3D();
    try { localStorage.removeItem(CLAVE_AVANCE); } catch (e) {}
    window.location.reload();
  }

  /* Recorrido terminado: se guarda el tiempo total como marca del usuario */
  function revisarRecorridoCompleto() {
    if (recorridoContado || !KPI) return;
    if (SIM.Escena.totalInspeccionadas() < SIM.PARTES.length) return;

    recorridoContado = true;
    var duracion = inicioRecorrido ? (Date.now() - inicioRecorrido) / 1000 : 0;
    KPI.registrar3DRecorrido(duracion);
    KPI.registrarEvento('Entorno 3D', 'Recorrido completo (8/8 piezas)', KPI.formatearTiempo(duracion));
  }

  /* Compuerta: sin sesión no se entra a la simulación ni se registran KPIs */
  function mostrarCompuerta() {
    var titulo = document.getElementById('inicio-titulo');
    var texto = document.getElementById('inicio-texto');
    if (titulo) titulo.textContent = 'Necesitas iniciar sesión';
    if (texto) {
      texto.textContent = 'La sala de inspección y el registro de tu desempeño están reservados ' +
        'a cuentas registradas. Vuelve al módulo Entorno 3D e inicia sesión para continuar.';
    }
    capaInicio.classList.add('visible');
  }

  function aplicarCompuerta() {
    if (!KPI) return;
    var botonEntrar = document.getElementById('btn-entrar');
    var sinSesion = !KPI.haySesion();

    if (botonEntrar) {
      botonEntrar.disabled = sinSesion;
      botonEntrar.classList.toggle('is-gated', sinSesion);
    }
    if (sinSesion && A.modo === 'inicio') mostrarCompuerta();
  }

  /* ========================================================
     Ciclo principal
     ======================================================== */
  function ciclo() {
    requestAnimationFrame(ciclo);
    var dt = Math.min(reloj.getDelta(), 0.05);
    var cam = SIM.Escena.camara;

    // Tiempo invertido dentro del entorno: se acumula mientras el
    // recorrido está activo y se vuelca cada pocos segundos para no
    // escribir en cada cuadro.
    if (KPI && A.modo !== 'inicio') {
      segSinVolcar += dt;
      if (segSinVolcar >= VOLCADO_CADA) {
        KPI.registrar3DTiempo(segSinVolcar);
        segSinVolcar = 0;
      }
    }

    if (trans.activa) {
      trans.t += dt / trans.dur;
      var k = suavizar(Math.min(trans.t, 1));
      cam.position.lerpVectors(trans.posIni, trans.posFin, k);
      if (cam.quaternion.slerpQuaternions) {
        cam.quaternion.slerpQuaternions(trans.quatIni, trans.quatFin, k);
      } else {
        THREE.Quaternion.slerp(trans.quatIni, trans.quatFin, cam.quaternion, k);
      }
      if (trans.t >= 1) terminarTransicion();
    } else if (A.modo === 'explorar' || A.modo === 'inicio') {
      SIM.Caminar.actualizar(dt, cam);
    }

    // Aparición y ambiente de la vista de detalle
    var enDetalle = A.modo === 'detalle' || (trans.activa && trans.hacia === 'detalle');
    var objetivoEscala = enDetalle ? 1 : 0.35;
    var rig = SIM.Escena.rigDetalle;
    if (rig.visible) {
      var s = rig.scale.x + (objetivoEscala - rig.scale.x) * Math.min(1, dt * 6);
      rig.scale.setScalar(s);
    }
    SIM.Escena.luzDetalleA.intensity += ((enDetalle ? 0.95 : 0) - SIM.Escena.luzDetalleA.intensity) * Math.min(1, dt * 5);
    SIM.Escena.luzDetalleB.intensity += ((enDetalle ? 0.5 : 0) - SIM.Escena.luzDetalleB.intensity) * Math.min(1, dt * 5);
    if (SIM.Sala.ambiente) {
      SIM.Sala.ambiente.intensity += ((enDetalle ? 0.1 : 0.3) - SIM.Sala.ambiente.intensity) * Math.min(1, dt * 4);
    }

    SIM.Orbita.actualizar(dt);
    SIM.Escena.actualizar(dt, enDetalle);

    // Proximidad
    if (A.modo === 'explorar') {
      var cerca = SIM.Escena.estacionCercana(cam.position);
      if (cerca !== A.cerca) {
        if (cerca) {
          SIM.UI.mostrarAviso(cerca.parte, !!SIM.Escena.inspeccionadas[cerca.parte.id]);
          SIM.Hud.pingRadar();
        } else {
          SIM.UI.ocultarAviso();
        }
        A.cerca = cerca;
      }
    } else if (A.cerca) {
      A.cerca = null;
      SIM.UI.ocultarAviso();
    }

    // Estado que lee el HUD de Phaser
    SIM.Hud.estado.pos.x = cam.position.x;
    SIM.Hud.estado.pos.z = cam.position.z;
    SIM.Hud.estado.giro = SIM.Caminar.orientacion();
    SIM.Hud.estado.cerca = A.cerca;
    SIM.Hud.estado.modo = A.modo;
    SIM.Hud.estado.inspeccionadas = SIM.Escena.inspeccionadas;

    SIM.Escena.renderizar();
  }

  function arrancar() {
    if (!window.THREE || !window.Phaser) {
      document.getElementById('capa-inicio').innerHTML =
        '<div class="tarjeta-inicio"><h1 class="inicio-titulo">Faltan las librerías</h1>' +
        '<p class="inicio-texto">Revisa que existan js/lib/three.min.js y js/lib/phaser.min.js junto al archivo index3d.html.</p></div>';
      return;
    }
    try {
      A.iniciar();
    } catch (err) {
      console.error(err);
      document.getElementById('inicio-texto').textContent =
        'No se pudo iniciar el entorno 3D: ' + err.message;
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(window);
