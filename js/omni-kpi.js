/* ============================================================
   OmniTrain · Núcleo de KPIs y control de sesión
   ------------------------------------------------------------
   Un único punto de verdad para:
     1. Leer y escribir el registro de desempeño del usuario.
     2. Saber si hay sesión iniciada (compuerta de acceso).
     3. Calcular los KPIs derivados que pintan el dashboard,
        el módulo 3D y la pantalla de métricas.

   Sin dependencias externas: JavaScript plano, almacenamiento
   en localStorage bajo la clave "omniTrainMetrics" (la misma
   que ya usaba el Simulador 2D, para no perder el avance).
   ============================================================ */
(function (global) {
  'use strict';

  var K = (global.OmniKPI = {});

  /* ========================================================
     0. CONSTANTES
     ======================================================== */
  K.CLAVE_METRICAS = 'omniTrainMetrics';
  K.CLAVE_SESION = 'omnitrain-session';
  K.MAX_HISTORIAL = 40;

  /* Escenarios reales del Simulador 2D */
  K.ESCENARIOS_2D = [
    { id: 1, nombre: 'Extintor PQS', nivel: 'Básico', url: 'pygame.html', campoQuiz: 'quiz1Score', campoMejorTiempo: 'bestExtinguishTimePQS', campoUltimoTiempo: 'lastExtinguishTimePQS' },
    { id: 2, nombre: 'Extintor CO₂', nivel: 'Intermedio', url: 'pygame2.html', campoQuiz: 'quiz2Score', campoMejorTiempo: 'bestExtinguishTimeCO2', campoUltimoTiempo: 'lastExtinguishTimeCO2' },
    { id: 3, nombre: 'Extintor de Agua', nivel: 'Avanzado', url: 'pygame3.html', campoQuiz: 'quiz3Score', campoMejorTiempo: 'bestExtinguishTimeAgua', campoUltimoTiempo: 'lastExtinguishTimeAgua' }
  ];

  /* Las 8 piezas del entorno 3D, en el orden de revisión que
     sigue un brigadista en la inspección visual mensual. Ese
     orden es el que se usa para medir la técnica. */
  K.PIEZAS_3D = [
    { id: 'cilindro', num: 1, nombre: 'Cilindro principal' },
    { id: 'manometro', num: 2, nombre: 'Manómetro' },
    { id: 'valvula', num: 3, nombre: 'Válvula de descarga' },
    { id: 'manguera', num: 4, nombre: 'Manguera y boquilla' },
    { id: 'gatillo', num: 5, nombre: 'Gatillo y maneral' },
    { id: 'seguro', num: 6, nombre: 'Perno de seguridad' },
    { id: 'etiqueta', num: 7, nombre: 'Etiqueta de instrucciones' },
    { id: 'base', num: 8, nombre: 'Base de apoyo' }
  ];

  K.TOTAL_2D = K.ESCENARIOS_2D.length;
  K.TOTAL_3D = K.PIEZAS_3D.length;
  K.APROBACION = 100; // puntaje del cuestionario que desbloquea el siguiente escenario

  /* ========================================================
     1. SESIÓN (compuerta de autenticación)
     ------------------------------------------------------
     login.js guarda una pista de la sesión de Firebase en
     localStorage y la borra al cerrar sesión. Esa pista es la
     única señal que usan las compuertas, así que login.js queda
     intacto: no necesita conocer este módulo.
     ======================================================== */
  K.usuario = function () {
    try {
      var crudo = localStorage.getItem(K.CLAVE_SESION);
      if (!crudo) return null;
      var datos = JSON.parse(crudo);
      return datos && datos.name ? datos : null;
    } catch (e) {
      return null;
    }
  };

  K.haySesion = function () {
    return K.usuario() !== null;
  };

  /* ------------------------------------------------------
     Vigilancia de la sesión.
     login.js NO se modifica: se limita a escribir o borrar la
     pista en localStorage, tal como siempre lo hizo. Por eso el
     cambio se detecta aquí, revisando esa pista periódicamente
     (misma pestaña) y por el evento "storage" (otras pestañas).
     Un solo vigilante atiende a todos los suscriptores.
     ------------------------------------------------------ */
  var suscriptoresSesion = [];
  var estadoSesion = null;
  var vigilanciaActiva = false;
  var INTERVALO_SESION = 600; // ms

  function avisarSesion() {
    var actual = K.haySesion();
    if (actual === estadoSesion) return;
    estadoSesion = actual;
    for (var i = 0; i < suscriptoresSesion.length; i++) {
      try {
        suscriptoresSesion[i](actual);
      } catch (e) { /* un suscriptor con error no debe frenar a los demás */ }
    }
  }

  function iniciarVigilancia() {
    if (vigilanciaActiva) return;
    vigilanciaActiva = true;
    estadoSesion = K.haySesion();

    setInterval(avisarSesion, INTERVALO_SESION);

    global.addEventListener('storage', function (e) {
      if (e.key === K.CLAVE_SESION) avisarSesion();
    });

    // Al volver de otra página (incluida la caché de retroceso)
    global.addEventListener('pageshow', avisarSesion);
  }

  /* Ejecuta el callback ahora y cada vez que cambie la sesión */
  K.alCambiarSesion = function (callback) {
    if (typeof callback !== 'function') return;
    suscriptoresSesion.push(callback);
    callback(K.haySesion());
    iniciarVigilancia();
  };

  /* ========================================================
     2. LECTURA Y ESCRITURA DEL REGISTRO
     ======================================================== */
  function registro3DVacio() {
    return {
      piezas: {},              // id -> { vistas, tiempoSeg, primeraISO }
      secuencia: [],           // ids en el orden en que se inspeccionaron por primera vez
      inspeccionesTotales: 0,  // aperturas de ficha (incluye repasos)
      tiempoSalaSeg: 0,        // tiempo acumulado dentro del entorno
      sesiones: 0,
      recorridosCompletos: 0,
      mejorRecorridoSeg: 0,
      ultimoRecorridoSeg: 0,
      ultimaISO: ''
    };
  }

  function registroVacio() {
    return {
      // --- Simulador 2D (campos heredados, no se renombran) ---
      scenariosCompleted: 0,
      moduleProgress: 0,
      bestScore: 0,
      quiz1Score: 0,
      quiz2Score: 0,
      quiz3Score: 0,
      bestExtinguishTimePQS: 0,
      bestExtinguishTimeCO2: 0,
      bestExtinguishTimeAgua: 0,
      lastExtinguishTimePQS: 0,
      lastExtinguishTimeCO2: 0,
      lastExtinguishTimeAgua: 0,
      lastReactionTime: 0,
      totalAttempts: 0,
      scores: {},
      // --- Entorno 3D ---
      showroom3D: registro3DVacio(),
      // --- Bitácora común ---
      historial: []
    };
  }

  K.registroVacio = registroVacio;

  function numero(valor) {
    var n = Number(valor);
    return isNaN(n) ? 0 : n;
  }

  K.leer = function () {
    var base = registroVacio();
    var guardado = null;

    try {
      guardado = JSON.parse(localStorage.getItem(K.CLAVE_METRICAS));
    } catch (e) { /* registro ausente o corrupto: se parte de cero */ }

    if (!guardado || typeof guardado !== 'object') return base;

    // Campos planos del Simulador 2D
    base.scenariosCompleted = numero(guardado.scenariosCompleted);
    base.moduleProgress = numero(guardado.moduleProgress);
    base.bestScore = numero(guardado.bestScore);
    base.quiz1Score = numero(guardado.quiz1Score);
    base.quiz2Score = numero(guardado.quiz2Score);
    base.quiz3Score = numero(guardado.quiz3Score);
    // Compatibilidad: versiones previas guardaban el tiempo del escenario 1
    // sin sufijo, bajo "bestExtinguishTime".
    base.bestExtinguishTimePQS = numero(guardado.bestExtinguishTimePQS) || numero(guardado.bestExtinguishTime);
    base.bestExtinguishTimeCO2 = numero(guardado.bestExtinguishTimeCO2);
    base.bestExtinguishTimeAgua = numero(guardado.bestExtinguishTimeAgua);
    base.lastExtinguishTimePQS = numero(guardado.lastExtinguishTimePQS);
    base.lastExtinguishTimeCO2 = numero(guardado.lastExtinguishTimeCO2);
    base.lastExtinguishTimeAgua = numero(guardado.lastExtinguishTimeAgua);
    base.lastReactionTime = numero(guardado.lastReactionTime);
    base.totalAttempts = numero(guardado.totalAttempts);
    if (guardado.scores && typeof guardado.scores === 'object') base.scores = guardado.scores;

    // Bloque del entorno 3D
    var s3d = guardado.showroom3D;
    if (s3d && typeof s3d === 'object') {
      base.showroom3D.piezas = (s3d.piezas && typeof s3d.piezas === 'object') ? s3d.piezas : {};
      base.showroom3D.secuencia = Array.isArray(s3d.secuencia) ? s3d.secuencia : [];
      base.showroom3D.inspeccionesTotales = numero(s3d.inspeccionesTotales);
      base.showroom3D.tiempoSalaSeg = numero(s3d.tiempoSalaSeg);
      base.showroom3D.sesiones = numero(s3d.sesiones);
      base.showroom3D.recorridosCompletos = numero(s3d.recorridosCompletos);
      base.showroom3D.mejorRecorridoSeg = numero(s3d.mejorRecorridoSeg);
      base.showroom3D.ultimoRecorridoSeg = numero(s3d.ultimoRecorridoSeg);
      base.showroom3D.ultimaISO = s3d.ultimaISO || '';
    }

    if (Array.isArray(guardado.historial)) base.historial = guardado.historial;

    return base;
  };

  /* Guardar SIEMPRE pasa por aquí: sin sesión iniciada no se
     registra nada (requisito de compuerta de autenticación). */
  K.guardar = function (registro) {
    if (!K.haySesion()) return false;
    try {
      localStorage.setItem(K.CLAVE_METRICAS, JSON.stringify(registro));
      return true;
    } catch (e) {
      return false;
    }
  };

  /* Modifica el registro con una función y lo persiste */
  K.actualizar = function (fn) {
    if (!K.haySesion()) return null;
    var registro = K.leer();
    fn(registro);
    K.guardar(registro);
    return registro;
  };

  K.reiniciar = function () {
    if (!K.haySesion()) return false;
    try {
      localStorage.removeItem(K.CLAVE_METRICAS);
      return true;
    } catch (e) {
      return false;
    }
  };

  /* ========================================================
     3. BITÁCORA DE ACTIVIDAD (base de las tendencias)
     ======================================================== */
  K.registrarEvento = function (modulo, texto, valor) {
    return K.actualizar(function (registro) {
      registro.historial.unshift({
        ts: new Date().toISOString(),
        modulo: modulo,
        texto: texto,
        valor: (valor === undefined ? '' : valor)
      });
      if (registro.historial.length > K.MAX_HISTORIAL) {
        registro.historial.length = K.MAX_HISTORIAL;
      }
    });
  };

  /* ========================================================
     4. REGISTRO DEL ENTORNO 3D
     ======================================================== */

  /* Se llama al abrir la ficha de una pieza dentro de la sala */
  K.registrar3DInspeccion = function (idPieza, segundosEnPieza) {
    return K.actualizar(function (registro) {
      var s = registro.showroom3D;
      var pieza = s.piezas[idPieza];

      if (!pieza) {
        pieza = { vistas: 0, tiempoSeg: 0, primeraISO: new Date().toISOString() };
        s.piezas[idPieza] = pieza;
        if (s.secuencia.indexOf(idPieza) === -1) s.secuencia.push(idPieza);
      }

      pieza.vistas += 1;
      pieza.tiempoSeg = Math.round((pieza.tiempoSeg + numero(segundosEnPieza)) * 10) / 10;
      s.inspeccionesTotales += 1;
      s.ultimaISO = new Date().toISOString();
    });
  };

  /* Tiempo acumulado dentro de la sala (se llama periódicamente) */
  K.registrar3DTiempo = function (segundos) {
    var seg = numero(segundos);
    if (seg <= 0) return null;
    return K.actualizar(function (registro) {
      registro.showroom3D.tiempoSalaSeg = Math.round((registro.showroom3D.tiempoSalaSeg + seg) * 10) / 10;
    });
  };

  K.registrar3DSesion = function () {
    return K.actualizar(function (registro) {
      registro.showroom3D.sesiones += 1;
      registro.showroom3D.ultimaISO = new Date().toISOString();
    });
  };

  /* Recorrido terminado: las 8 piezas inspeccionadas */
  K.registrar3DRecorrido = function (segundosRecorrido) {
    var seg = Math.round(numero(segundosRecorrido));
    return K.actualizar(function (registro) {
      var s = registro.showroom3D;
      s.recorridosCompletos += 1;
      s.ultimoRecorridoSeg = seg;
      if (!s.mejorRecorridoSeg || (seg > 0 && seg < s.mejorRecorridoSeg)) {
        s.mejorRecorridoSeg = seg;
      }
      s.ultimaISO = new Date().toISOString();
    });
  };

  K.reiniciar3D = function () {
    return K.actualizar(function (registro) {
      registro.showroom3D = registro3DVacio();
    });
  };

  /* ========================================================
     5. KPIs DERIVADOS
     ======================================================== */

  /* Adherencia al orden de revisión recomendado: de cada par de
     piezas consecutivas que el usuario inspeccionó, ¿cuántas
     veces avanzó en el orden correcto (1→2→3…)? */
  function calcularOrden(secuencia) {
    if (!secuencia || secuencia.length < 2) return null;

    var posiciones = {};
    for (var i = 0; i < K.PIEZAS_3D.length; i++) {
      posiciones[K.PIEZAS_3D[i].id] = K.PIEZAS_3D[i].num;
    }

    var enOrden = 0;
    var pares = 0;
    for (var j = 1; j < secuencia.length; j++) {
      var previa = posiciones[secuencia[j - 1]];
      var actual = posiciones[secuencia[j]];
      if (previa === undefined || actual === undefined) continue;
      pares++;
      if (actual > previa) enOrden++;
    }

    if (pares === 0) return null;
    return Math.round((enOrden / pares) * 100);
  }

  K.resumen3D = function (registro) {
    var r = registro || K.leer();
    var s = r.showroom3D;
    var ids = Object.keys(s.piezas);
    var inspeccionadas = ids.length;

    var tiempoPiezas = 0;
    for (var i = 0; i < ids.length; i++) {
      tiempoPiezas += numero(s.piezas[ids[i]].tiempoSeg);
    }

    // Precisión: cuántas de las aperturas de ficha aportaron una
    // pieza nueva. Repasar no penaliza el progreso, pero sí baja
    // este indicador, que mide lo directo del recorrido.
    var precision = s.inspeccionesTotales > 0
      ? Math.round((inspeccionadas / s.inspeccionesTotales) * 100)
      : null;

    return {
      inspeccionadas: inspeccionadas,
      total: K.TOTAL_3D,
      progreso: Math.round((inspeccionadas / K.TOTAL_3D) * 100),
      completo: inspeccionadas >= K.TOTAL_3D,
      inspeccionesTotales: s.inspeccionesTotales,
      repasos: Math.max(0, s.inspeccionesTotales - inspeccionadas),
      precision: precision,
      orden: calcularOrden(s.secuencia),
      tiempoSalaSeg: Math.round(s.tiempoSalaSeg),
      tiempoPiezasSeg: Math.round(tiempoPiezas),
      tiempoMedioPiezaSeg: inspeccionadas > 0 ? Math.round(tiempoPiezas / inspeccionadas) : 0,
      sesiones: s.sesiones,
      recorridosCompletos: s.recorridosCompletos,
      mejorRecorridoSeg: s.mejorRecorridoSeg,
      ultimoRecorridoSeg: s.ultimoRecorridoSeg,
      ultimaISO: s.ultimaISO,
      piezas: K.PIEZAS_3D.map(function (pieza) {
        var dato = s.piezas[pieza.id];
        var posicion = s.secuencia.indexOf(pieza.id);
        return {
          id: pieza.id,
          num: pieza.num,
          nombre: pieza.nombre,
          inspeccionada: !!dato,
          vistas: dato ? dato.vistas : 0,
          tiempoSeg: dato ? Math.round(dato.tiempoSeg) : 0,
          ordenVisita: posicion >= 0 ? posicion + 1 : null
        };
      })
    };
  };

  K.resumen2D = function (registro) {
    var r = registro || K.leer();

    var escenarios = K.ESCENARIOS_2D.map(function (config) {
      var puntaje = numero(r[config.campoQuiz]);
      var mejorTiempo = numero(r[config.campoMejorTiempo]);
      var ultimoTiempo = numero(r[config.campoUltimoTiempo]);
      return {
        id: config.id,
        nombre: config.nombre,
        nivel: config.nivel,
        url: config.url,
        puntaje: puntaje,
        intentado: puntaje > 0 || mejorTiempo > 0,
        aprobado: puntaje >= K.APROBACION,
        mejorTiempoSeg: mejorTiempo,
        ultimoTiempoSeg: ultimoTiempo
      };
    });

    var puntajes = escenarios.map(function (e) { return e.puntaje; });
    var completados = escenarios.filter(function (e) { return e.aprobado; }).length;
    var intentados = escenarios.filter(function (e) { return e.intentado; }).length;
    var suma = puntajes.reduce(function (a, b) { return a + b; }, 0);

    var tiempos = escenarios
      .map(function (e) { return e.mejorTiempoSeg; })
      .filter(function (t) { return t > 0; });

    return {
      escenarios: escenarios,
      total: K.TOTAL_2D,
      completados: completados,
      intentados: intentados,
      progreso: Math.round(suma / K.TOTAL_2D),
      mejorPuntaje: Math.max.apply(null, puntajes.concat([0])),
      promedioPuntaje: intentados > 0 ? Math.round(suma / intentados) : 0,
      mejorTiempoSeg: tiempos.length ? Math.min.apply(null, tiempos) : 0,
      tiempoMedioSeg: tiempos.length ? Math.round((tiempos.reduce(function (a, b) { return a + b; }, 0) / tiempos.length) * 10) / 10 : 0,
      ultimoTiempoReaccionSeg: numero(r.lastReactionTime)
    };
  };

  /* Resumen general: lo que consume el dashboard */
  K.resumen = function () {
    var registro = K.leer();
    var dos = K.resumen2D(registro);
    var tres = K.resumen3D(registro);

    // El progreso global pondera por igual los dos módulos que
    // hoy tienen seguimiento real. Capacitaciones sigue en
    // construcción, así que no entra en el cálculo.
    var progresoGlobal = Math.round((dos.progreso + tres.progreso) / 2);

    var tiempoTotal = tres.tiempoSalaSeg;

    return {
      registro: registro,
      dos: dos,
      tres: tres,
      progresoGlobal: progresoGlobal,
      tiempoTotalSeg: tiempoTotal,
      hayDatos: dos.intentados > 0 || tres.inspeccionadas > 0,
      historial: registro.historial || []
    };
  };

  /* ========================================================
     6. UTILIDADES DE FORMATO
     ======================================================== */
  K.formatearTiempo = function (segundos) {
    var seg = Math.max(0, Math.round(numero(segundos)));
    if (seg < 60) return seg + 's';
    var minutos = Math.floor(seg / 60);
    var resto = seg % 60;
    if (minutos < 60) return minutos + 'm ' + (resto < 10 ? '0' : '') + resto + 's';
    var horas = Math.floor(minutos / 60);
    return horas + 'h ' + (minutos % 60) + 'm';
  };

  K.formatearSegundosDecimal = function (segundos) {
    var n = numero(segundos);
    return n > 0 ? n.toFixed(1) + 's' : '--';
  };

  K.formatearFecha = function (iso) {
    if (!iso) return '--';
    var fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '--';
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) +
      ' · ' + fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  /* ========================================================
     7. AVISOS DE COMPUERTA
     ------------------------------------------------------
     Bloque reutilizable que sustituye a los KPIs cuando no hay
     sesión iniciada. Se inserta en el contenedor indicado.
     ======================================================== */
  K.marcarBloqueado = function (contenedor, mensaje) {
    if (!contenedor) return;
    contenedor.innerHTML =
      '<div class="kpi-locked">' +
      '  <i class="bi bi-shield-lock-fill" aria-hidden="true"></i>' +
      '  <div>' +
      '    <h5>Inicia sesión para ver tus KPIs</h5>' +
      '    <p>' + (mensaje || 'El seguimiento de desempeño y el acceso a los simuladores están reservados a cuentas registradas.') + '</p>' +
      '  </div>' +
      '  <button type="button" class="btn btn-outline-custom kpi-locked-btn" data-abrir-login>' +
      '    <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> Iniciar sesión' +
      '  </button>' +
      '</div>';

    var boton = contenedor.querySelector('[data-abrir-login]');
    if (boton) {
      boton.addEventListener('click', function () {
        var disparador = document.getElementById('showLoginButton');
        if (disparador) disparador.click();
      });
    }
  };

  /* Deja un botón/enlace inutilizable mientras no haya sesión */
  K.protegerAccion = function (elemento, etiquetaOriginal) {
    if (!elemento) return;

    K.alCambiarSesion(function (activa) {
      elemento.classList.toggle('is-gated', !activa);
      elemento.setAttribute('aria-disabled', String(!activa));
      if (elemento.tagName === 'BUTTON') elemento.disabled = !activa;
      elemento.title = activa ? '' : 'Necesitas iniciar sesión para entrar';

      var texto = elemento.querySelector('[data-etiqueta]');
      if (texto && etiquetaOriginal) {
        texto.textContent = activa ? etiquetaOriginal : 'Requiere iniciar sesión';
      }
    });
  };

  /* Reacciona a cambios hechos en otra pestaña */
  K.suscribir = function (callback) {
    if (typeof callback !== 'function') return;
    global.addEventListener('storage', function (e) {
      if (e.key === K.CLAVE_METRICAS || e.key === K.CLAVE_SESION) callback();
    });
    global.addEventListener('pageshow', callback);
  };
})(window);
