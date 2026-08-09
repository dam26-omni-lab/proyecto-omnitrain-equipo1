/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 3: piezas.js
   Cada pieza del extintor se construye con primitivas de Three.js
   (nada de modelos externos). Devuelven un THREE.Group con
   userData.alto para poder escalarlas al vitrinear.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var P = (SIM.Piezas = {});

  /* ---------- Materiales compartidos ---------- */
  var M = {};
  P.materiales = M;

  P.iniciarMateriales = function () {
    M.rojo = new THREE.MeshStandardMaterial({ color: 0xc0231f, metalness: 0.45, roughness: 0.38 });
    M.rojoOscuro = new THREE.MeshStandardMaterial({ color: 0x8e1a17, metalness: 0.5, roughness: 0.45 });
    M.laton = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.32 });
    M.cromo = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, metalness: 0.95, roughness: 0.18 });
    M.acero = new THREE.MeshStandardMaterial({ color: 0x8b949e, metalness: 0.8, roughness: 0.4 });
    M.hule = new THREE.MeshStandardMaterial({ color: 0x1b1d21, metalness: 0.1, roughness: 0.85 });
    M.plastico = new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.1, roughness: 0.6 });
    M.vidrio = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.25
    });
    M.caratula = new THREE.MeshStandardMaterial({
      map: SIM.Texturas.una('caratula', SIM.Texturas.caratula), roughness: 0.6, metalness: 0.05
    });
    M.etiqueta = new THREE.MeshStandardMaterial({
      map: SIM.Texturas.una('etiqueta', SIM.Texturas.etiqueta), roughness: 0.75, metalness: 0.0,
      side: THREE.DoubleSide
    });
  };

  function malla(geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ---------- 1. Cilindro principal ---------- */
  P.cilindro = function () {
    var g = new THREE.Group();
    var perfil = [];
    // Perfil del cuerpo: fondo plano, panza recta, hombro abombado, cuello.
    perfil.push(new THREE.Vector2(0.0, 0.0));
    perfil.push(new THREE.Vector2(0.098, 0.0));
    perfil.push(new THREE.Vector2(0.106, 0.02));
    perfil.push(new THREE.Vector2(0.106, 0.40));
    perfil.push(new THREE.Vector2(0.100, 0.455));
    perfil.push(new THREE.Vector2(0.078, 0.50));
    perfil.push(new THREE.Vector2(0.045, 0.525));
    perfil.push(new THREE.Vector2(0.030, 0.535));
    perfil.push(new THREE.Vector2(0.030, 0.560));
    perfil.push(new THREE.Vector2(0.0, 0.560));
    var cuerpo = malla(new THREE.LatheGeometry(perfil, 48), M.rojo);
    g.add(cuerpo);

    // Cuello roscado
    g.add(malla(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 24), M.laton, 0, 0.572, 0));
    // Costura de soldadura
    g.add(malla(new THREE.TorusGeometry(0.1055, 0.004, 8, 40), M.rojoOscuro, 0, 0.20, 0)
      .rotateX(Math.PI / 2));

    g.userData.alto = 0.60;
    return g;
  };

  /* ---------- 2. Manómetro ---------- */
  P.manometro = function () {
    var g = new THREE.Group();
    var caja = malla(new THREE.CylinderGeometry(0.042, 0.042, 0.022, 32), M.laton, 0, 0, 0);
    caja.rotation.x = Math.PI / 2;
    g.add(caja);

    var cara = malla(new THREE.CircleGeometry(0.038, 40), M.caratula, 0, 0, 0.0125);
    g.add(cara);

    var bisel = malla(new THREE.TorusGeometry(0.042, 0.005, 10, 36), M.cromo, 0, 0, 0.011);
    g.add(bisel);
    var cristal = malla(new THREE.CircleGeometry(0.039, 32), M.vidrio, 0, 0, 0.0135);
    g.add(cristal);

    // Vástago de conexión hacia la válvula
    var vast = malla(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 16), M.laton, 0, -0.058, 0);
    g.add(vast);
    g.add(malla(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 6), M.laton, 0, -0.038, 0));

    g.userData.alto = 0.14;
    return g;
  };

  /* ---------- 3. Válvula de descarga ---------- */
  P.valvula = function () {
    var g = new THREE.Group();
    // Cuerpo central
    g.add(malla(new THREE.CylinderGeometry(0.034, 0.036, 0.075, 24), M.laton, 0, 0.02, 0));
    // Tuerca hexagonal de acoplamiento al cilindro
    g.add(malla(new THREE.CylinderGeometry(0.045, 0.045, 0.022, 6), M.laton, 0, -0.028, 0));
    // Rosca del cuello
    for (var i = 0; i < 4; i++) {
      g.add(malla(new THREE.TorusGeometry(0.031, 0.0025, 6, 26), M.laton, 0, -0.048 - i * 0.007, 0)
        .rotateX(Math.PI / 2));
    }
    // Puerto del manómetro (mira a +Z)
    var puerto = malla(new THREE.CylinderGeometry(0.014, 0.014, 0.045, 16), M.laton, 0, 0.035, 0.032);
    puerto.rotation.x = Math.PI / 2;
    g.add(puerto);
    // Salida hacia la manguera (mira a -Z)
    var salida = malla(new THREE.CylinderGeometry(0.013, 0.016, 0.05, 16), M.laton, 0, 0.005, -0.04);
    salida.rotation.x = Math.PI / 2;
    g.add(salida);
    // Orejas donde se monta el maneral
    g.add(malla(new THREE.BoxGeometry(0.012, 0.05, 0.03), M.laton, 0.032, 0.068, 0));
    g.add(malla(new THREE.BoxGeometry(0.012, 0.05, 0.03), M.laton, -0.032, 0.068, 0));
    // Vástago
    g.add(malla(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12), M.cromo, 0, 0.072, 0));

    g.userData.alto = 0.18;
    return g;
  };

  /* ---------- 4. Manguera y boquilla ---------- */
  P.manguera = function () {
    var g = new THREE.Group();
    var curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(0.05, 0.10, 0.05),
      new THREE.Vector3(0.02, -0.02, 0.10),
      new THREE.Vector3(-0.06, -0.10, 0.06),
      new THREE.Vector3(-0.10, -0.16, -0.02)
    ]);
    var tubo = malla(new THREE.TubeGeometry(curva, 64, 0.012, 12, false), M.hule);
    g.add(tubo);

    // Casquillos de engarce
    var c1 = malla(new THREE.CylinderGeometry(0.017, 0.017, 0.03, 16), M.acero, 0, 0.175, 0);
    g.add(c1);
    var fin = curva.getPoint(1);
    var dir = curva.getTangent(1);

    // Boquilla difusora
    var boq = new THREE.Group();
    boq.add(malla(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 18), M.hule, 0, 0.018, 0));
    boq.add(malla(new THREE.CylinderGeometry(0.030, 0.019, 0.055, 20, 1, true), M.hule, 0, 0.062, 0));
    boq.add(malla(new THREE.TorusGeometry(0.030, 0.004, 8, 24), M.hule, 0, 0.089, 0)
      .rotateX(Math.PI / 2));
    boq.position.copy(fin);
    boq.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    g.add(boq);

    g.userData.alto = 0.42;
    return g;
  };

  /* ---------- 5. Gatillo y maneral ---------- */
  P.gatillo = function () {
    var g = new THREE.Group();
    // Maneral fijo (abajo, es donde se sostiene)
    var fijo = new THREE.Group();
    fijo.add(malla(new THREE.BoxGeometry(0.16, 0.014, 0.026), M.cromo, 0.02, 0, 0));
    fijo.add(malla(new THREE.CylinderGeometry(0.009, 0.009, 0.026, 12), M.cromo, -0.06, 0.012, 0)
      .rotateX(Math.PI / 2));
    fijo.add(malla(new THREE.BoxGeometry(0.02, 0.04, 0.026), M.cromo, -0.058, 0.018, 0));
    g.add(fijo);

    // Palanca móvil (el gatillo)
    var palanca = new THREE.Group();
    palanca.add(malla(new THREE.BoxGeometry(0.15, 0.013, 0.022), M.cromo, 0.025, 0, 0));
    palanca.add(malla(new THREE.BoxGeometry(0.03, 0.03, 0.022), M.cromo, -0.048, 0.008, 0));
    palanca.position.y = 0.055;
    palanca.rotation.z = -0.12;
    palanca.name = 'palanca-movil';
    g.add(palanca);

    // Perno pivote
    var pin = malla(new THREE.CylinderGeometry(0.0045, 0.0045, 0.05, 10), M.acero, -0.052, 0.03, 0);
    pin.rotation.x = Math.PI / 2;
    g.add(pin);

    g.userData.alto = 0.14;
    return g;
  };

  /* ---------- 6. Perno de seguridad y precinto ---------- */
  P.seguro = function () {
    var g = new THREE.Group();
    // Anillo de jalado
    var anillo = malla(new THREE.TorusGeometry(0.026, 0.0045, 12, 32), M.acero, -0.075, 0, 0);
    anillo.rotation.y = Math.PI / 2;
    g.add(anillo);
    // Vástago que atraviesa el maneral
    var vast = malla(new THREE.CylinderGeometry(0.0045, 0.0045, 0.10, 12), M.acero, 0.0, 0, 0);
    vast.rotation.z = Math.PI / 2;
    g.add(vast);
    g.add(malla(new THREE.SphereGeometry(0.006, 12, 10), M.acero, 0.052, 0, 0));

    // Precinto plástico
    var pre = malla(new THREE.TorusGeometry(0.021, 0.0022, 8, 28), M.plastico, -0.03, -0.004, 0);
    pre.rotation.y = Math.PI / 2;
    pre.rotation.x = 0.35;
    g.add(pre);
    // Etiqueta del precinto
    var tag = malla(new THREE.BoxGeometry(0.001, 0.026, 0.018), M.plastico, -0.03, -0.038, 0);
    g.add(tag);

    g.userData.alto = 0.10;
    return g;
  };

  /* ---------- 7. Etiqueta de instrucciones ---------- */
  P.etiqueta = function () {
    var g = new THREE.Group();
    // Etiqueta curva, como va pegada al cilindro
    var geo = new THREE.CylinderGeometry(0.108, 0.108, 0.30, 40, 1, true, -1.25, 2.5);
    var m = malla(geo, M.etiqueta, 0, 0, 0);
    g.add(m);
    // Filo de plástico para que se vea con cuerpo
    var borde = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.8, side: THREE.DoubleSide });
    var aroSup = malla(new THREE.CylinderGeometry(0.1085, 0.1085, 0.006, 40, 1, true, -1.25, 2.5), borde, 0, 0.152, 0);
    var aroInf = malla(new THREE.CylinderGeometry(0.1085, 0.1085, 0.006, 40, 1, true, -1.25, 2.5), borde, 0, -0.152, 0);
    g.add(aroSup, aroInf);

    g.userData.alto = 0.32;
    return g;
  };

  /* ---------- 8. Base de apoyo ---------- */
  P.base = function () {
    var g = new THREE.Group();
    var perfil = [
      new THREE.Vector2(0.085, 0.0),
      new THREE.Vector2(0.118, 0.0),
      new THREE.Vector2(0.118, 0.045),
      new THREE.Vector2(0.104, 0.062),
      new THREE.Vector2(0.096, 0.062),
      new THREE.Vector2(0.096, 0.012),
      new THREE.Vector2(0.085, 0.012)
    ];
    var aro = malla(new THREE.LatheGeometry(perfil, 40), M.acero, 0, 0, 0);
    g.add(aro);
    // Tope de hule
    g.add(malla(new THREE.TorusGeometry(0.112, 0.008, 10, 40), M.hule, 0, 0.004, 0)
      .rotateX(Math.PI / 2));
    // Refuerzos
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * Math.PI * 2;
      var r = malla(new THREE.BoxGeometry(0.012, 0.04, 0.02), M.acero,
        Math.cos(a) * 0.104, 0.028, Math.sin(a) * 0.104);
      r.rotation.y = -a;
      g.add(r);
    }
    g.userData.alto = 0.09;
    return g;
  };

  /* ---------- Constructor por id ---------- */
  P.construir = function (id) {
    var g = P[id] ? P[id]() : new THREE.Group();
    g.name = 'pieza-' + id;
    return g;
  };

  /* ---------- Extintor completo (modelo de referencia central) ---------- */
  P.extintorCompleto = function () {
    var g = new THREE.Group();

    var base = P.construir('base');
    base.position.y = 0.0;
    g.add(base);

    var cil = P.construir('cilindro');
    cil.position.y = 0.055;
    g.add(cil);

    var etq = P.construir('etiqueta');
    etq.position.set(0, 0.30, 0);
    g.add(etq);

    var val = P.construir('valvula');
    val.position.y = 0.645;
    g.add(val);

    var man = P.construir('manometro');
    man.position.set(0, 0.685, 0.075);
    g.add(man);

    var gat = P.construir('gatillo');
    gat.position.set(0, 0.715, 0);
    g.add(gat);

    var seg = P.construir('seguro');
    seg.position.set(0.005, 0.742, 0);
    g.add(seg);

    var mang = P.construir('manguera');
    mang.position.set(0, 0.50, -0.06);
    g.add(mang);

    g.userData.alto = 0.80;
    return g;
  };
})(window);
