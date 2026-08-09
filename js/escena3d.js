/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 5: escena3d.js
   Motor Three.js: renderizador, cámara, estaciones de inspección,
   colisiones y montaje de la vista de detalle.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var E = (SIM.Escena = {});

  E.RADIO_JUGADOR = 0.42;
  E.DISTANCIA_ACTIVACION = 2.3;
  E.ALTURA_OJOS = 1.68;

  E.estaciones = [];
  E.inspeccionadas = {};

  E.iniciar = function (lienzo) {
    E.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
    E.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    E.renderer.setSize(window.innerWidth, window.innerHeight);
    E.renderer.shadowMap.enabled = true;
    E.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    E.renderer.outputEncoding = THREE.sRGBEncoding;
    E.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    E.renderer.toneMappingExposure = 1.18;

    E.escena = new THREE.Scene();
    E.escena.background = new THREE.Color(0x080a0c);
    E.escena.fog = new THREE.FogExp2(0x080a0c, 0.021);

    E.camara = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 120);
    E.camara.position.set(0, E.ALTURA_OJOS, 5.2);
    E.escena.add(E.camara);

    SIM.Piezas.iniciarMateriales();
    SIM.Sala.construir(E.escena);
    montarEstaciones();
    montarRigDetalle();

    window.addEventListener('resize', E.redimensionar);
    return E;
  };

  /* ---------- Estaciones ---------- */
  function montarEstaciones() {
    for (var i = 0; i < SIM.PARTES.length; i++) {
      var parte = SIM.PARTES[i];
      var mesa = SIM.Sala.crearMesa(parte);
      mesa.position.set(parte.pos[0], 0, parte.pos[1]);
      mesa.rotation.y = parte.giro;
      E.escena.add(mesa);

      var pieza = SIM.Piezas.construir(parte.id);
      var alto = pieza.userData.alto || 0.3;
      var escala = 0.44 / alto;
      pieza.scale.setScalar(escala);
      pieza.position.set(0, 1.16, 0.05);
      mesa.add(pieza);

      // Punto de vista para inspeccionar: al frente de la mesa
      var frente = new THREE.Vector3(Math.sin(parte.giro), 0, Math.cos(parte.giro));
      var centro = new THREE.Vector3(parte.pos[0], 0, parte.pos[1]);
      var poseOjo = centro.clone().add(frente.clone().multiplyScalar(1.25));
      poseOjo.y = 1.42;
      var mira = centro.clone().add(frente.clone().multiplyScalar(0.05));
      mira.y = 1.16;

      E.estaciones.push({
        parte: parte,
        mesa: mesa,
        pieza: pieza,
        centro: centro,
        frente: frente,
        poseOjo: poseOjo,
        mira: mira,
        aro: mesa.getObjectByName('aro-estado'),
        giroOcioso: Math.random() * Math.PI * 2
      });

      SIM.Sala.colisiones.push({
        minX: parte.pos[0] - (Math.abs(Math.cos(parte.giro)) > 0.5 ? 0.55 : 0.85),
        maxX: parte.pos[0] + (Math.abs(Math.cos(parte.giro)) > 0.5 ? 0.55 : 0.85),
        minZ: parte.pos[1] - (Math.abs(Math.cos(parte.giro)) > 0.5 ? 0.85 : 0.55),
        maxZ: parte.pos[1] + (Math.abs(Math.cos(parte.giro)) > 0.5 ? 0.85 : 0.55)
      });
    }
  }

  /* ---------- Rig de la vista de detalle ---------- */
  function montarRigDetalle() {
    E.rigDetalle = new THREE.Group();
    E.rigDetalle.position.set(0, -0.04, -1.55);
    E.rigDetalle.visible = false;
    E.camara.add(E.rigDetalle);

    E.pivote = new THREE.Group();
    E.rigDetalle.add(E.pivote);

    E.luzDetalleA = new THREE.PointLight(0xffffff, 0.0, 6, 2);
    E.luzDetalleA.position.set(1.1, 1.0, 0.6);
    E.camara.add(E.luzDetalleA);
    E.luzDetalleB = new THREE.PointLight(0x9ec5ff, 0.0, 6, 2);
    E.luzDetalleB.position.set(-1.2, -0.4, 0.2);
    E.camara.add(E.luzDetalleB);
  }

  E.montarDetalle = function (id) {
    E.limpiarDetalle();
    var pieza = SIM.Piezas.construir(id);
    var alto = pieza.userData.alto || 0.3;
    pieza.scale.setScalar(0.62 / alto);
    pieza.position.y = 0;
    E.pivote.add(pieza);
    E.pivote.rotation.set(0, 0, 0);
    E.rigDetalle.visible = true;
    E.rigDetalle.scale.setScalar(0.35);
    E.piezaDetalle = pieza;
    return pieza;
  };

  E.limpiarDetalle = function () {
    while (E.pivote.children.length) {
      var hijo = E.pivote.children[0];
      E.pivote.remove(hijo);
      hijo.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    }
    E.piezaDetalle = null;
    E.rigDetalle.visible = false;
  };

  /* ---------- Marcar pieza como inspeccionada ---------- */
  E.marcarInspeccionada = function (id) {
    if (E.inspeccionadas[id]) return false;
    E.inspeccionadas[id] = true;

    for (var i = 0; i < E.estaciones.length; i++) {
      if (E.estaciones[i].parte.id === id && E.estaciones[i].aro) {
        E.estaciones[i].aro.material = new THREE.MeshBasicMaterial({ color: 0x3ddc84 });
      }
    }
    // Resaltar la pieza en el extintor de referencia del centro
    var grupo = SIM.Sala.extintorCentral && SIM.Sala.extintorCentral.getObjectByName('pieza-' + id);
    if (grupo) {
      grupo.traverse(function (o) {
        if (o.isMesh && o.material && o.material.emissive) {
          if (!o.userData.matClonado) {
            o.material = o.material.clone();
            o.userData.matClonado = true;
          }
          o.material.emissive = new THREE.Color(0x1f8a4c);
          o.material.emissiveIntensity = 0.55;
        }
      });
    }
    return true;
  };

  E.totalInspeccionadas = function () {
    return Object.keys(E.inspeccionadas).length;
  };

  /* ---------- Colisiones ---------- */
  E.resolverMovimiento = function (posicion, dx, dz) {
    var r = E.RADIO_JUGADOR;
    var cajas = SIM.Sala.colisiones;

    function chocaX(x, z) {
      for (var i = 0; i < cajas.length; i++) {
        var c = cajas[i];
        if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
      }
      return false;
    }
    if (!chocaX(posicion.x + dx, posicion.z)) posicion.x += dx;
    if (!chocaX(posicion.x, posicion.z + dz)) posicion.z += dz;
  };

  /* ---------- Estación más cercana ---------- */
  E.estacionCercana = function (posicion) {
    var mejor = null, mejorDist = Infinity;
    for (var i = 0; i < E.estaciones.length; i++) {
      var e = E.estaciones[i];
      var d = Math.hypot(posicion.x - e.centro.x, posicion.z - e.centro.z);
      if (d < mejorDist) { mejorDist = d; mejor = e; }
    }
    if (mejor && mejorDist <= E.DISTANCIA_ACTIVACION) {
      mejor.distancia = mejorDist;
      return mejor;
    }
    return null;
  };

  /* ---------- Animación de ambiente ---------- */
  E.actualizar = function (dt, enDetalle) {
    for (var i = 0; i < E.estaciones.length; i++) {
      var e = E.estaciones[i];
      e.giroOcioso += dt * 0.42;
      e.pieza.rotation.y = e.giroOcioso;
      e.pieza.position.y = 1.16 + Math.sin(e.giroOcioso * 1.6) * 0.012;
      if (e.aro && !E.inspeccionadas[e.parte.id]) {
        var pulso = 0.55 + Math.sin(performance.now() * 0.003 + i) * 0.45;
        e.aro.material.color.setRGB(0.15 * pulso, 0.6 * pulso, 0.95 * pulso);
      }
    }
    if (SIM.Sala.extintorCentral && !enDetalle) {
      SIM.Sala.extintorCentral.rotation.y += dt * 0.18;
    }
  };

  E.renderizar = function () {
    E.renderer.render(E.escena, E.camara);
  };

  E.redimensionar = function () {
    if (!E.camara) return;
    E.camara.aspect = window.innerWidth / window.innerHeight;
    E.camara.updateProjectionMatrix();
    E.renderer.setSize(window.innerWidth, window.innerHeight);
  };
})(window);
