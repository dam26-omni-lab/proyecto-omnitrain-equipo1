/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 4: sala.js  (v2 — nave oscura con faldón rojo)
   Piso de losa, muros negros con zócalo rojo, luminarias
   fluorescentes, vigas rojas, gabinetes de extintor, cintas
   amarillas en el piso y las 8 mesas de inspección.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var S = (SIM.Sala = {});

  S.ANCHO = 22;   // eje X: de -11 a 11
  S.FONDO = 16;   // eje Z: de -8 a 8
  S.ALTO = 4.2;
  S.ALTO_FALDON = 1.15;  // altura del faldón rojo del muro

  /* Paleta de la sala: cámbiala aquí y todo el entorno se ajusta */
  S.COLORES = {
    amarillo: 0xe8c21a,
    rojoMuro: 0x96201a,
    rojoViga: 0x8e1f18,
    rojoGabinete: 0xb8261e,
    negro: 0x0f1113,
    grafito: 0x24282d,
    cubierta: 0xc6c3b8,
    luz: 0xffe6bd
  };

  var Tx = SIM.Texturas;
  var C = S.COLORES;

  function caja(x, z, ancho, fondo) {
    return { minX: x - ancho / 2, maxX: x + ancho / 2, minZ: z - fondo / 2, maxZ: z + fondo / 2 };
  }

  /* Materiales que se comparten entre la sala y las mesas */
  var mat = {};
  function materiales() {
    if (mat.listo) return mat;
    mat.amarillo = new THREE.MeshStandardMaterial({ color: C.amarillo, roughness: 0.55, metalness: 0.05 });
    mat.negro = new THREE.MeshStandardMaterial({ color: C.negro, roughness: 0.7, metalness: 0.3 });
    mat.grafito = new THREE.MeshStandardMaterial({ color: C.grafito, roughness: 0.6, metalness: 0.45 });
    mat.cubierta = new THREE.MeshStandardMaterial({
      map: Tx.una('cubierta', Tx.cubierta), color: C.cubierta, roughness: 0.62, metalness: 0.12
    });
    mat.rojoGab = new THREE.MeshStandardMaterial({ color: C.rojoGabinete, roughness: 0.45, metalness: 0.35 });
    mat.cristal = new THREE.MeshStandardMaterial({
      color: 0xd66b60, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.32
    });
    mat.listo = true;
    return mat;
  }

  S.construir = function (escena) {
    materiales();
    var raiz = new THREE.Group();
    var colisiones = [];
    var mitadX = S.ANCHO / 2, mitadZ = S.FONDO / 2;

    /* ---------- Piso de losa ---------- */
    var piso = new THREE.Mesh(
      new THREE.PlaneGeometry(S.ANCHO, S.FONDO),
      new THREE.MeshStandardMaterial({ map: Tx.una('piso', Tx.piso), roughness: 0.55, metalness: 0.18 })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    raiz.add(piso);

    /* ---------- Cintas amarillas del piso ---------- */
    /* Un plano acostado mide "ancho" sobre X y "largo" sobre Z. */
    function cinta(x, z, ancho, largo) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), mat.amarillo);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.015, z);
      raiz.add(m);
      return m;
    }
    cinta(0, 0, 0.16, S.FONDO - 1.2);          // pasillo norte-sur
    cinta(0, 0, S.ANCHO - 1.2, 0.16);          // pasillo este-oeste
    cinta(0, -4.6, S.ANCHO - 3.5, 0.12);       // línea de circulación norte
    cinta(0, 4.6, S.ANCHO - 3.5, 0.12);        // línea de circulación sur

    // Círculo amarillo alrededor del pedestal
    var circulo = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.78, 64), mat.amarillo);
    circulo.rotation.x = -Math.PI / 2;
    circulo.position.y = 0.016;
    raiz.add(circulo);

    // Banda de peligro en diagonal, como la del piso de la referencia
    var banda = new THREE.Mesh(
      new THREE.PlaneGeometry(15.5, 0.34),
      new THREE.MeshStandardMaterial({
        map: Tx.una('franjaPiso', function () { return Tx.franja(26); }), roughness: 0.6
      })
    );
    banda.rotation.x = -Math.PI / 2;
    banda.rotation.z = -Math.PI / 5.2;
    banda.position.set(-2.4, 0.017, 2.2);
    raiz.add(banda);

    /* ---------- Muros: faldón rojo + paño negro ---------- */
    var matMuro = new THREE.MeshStandardMaterial({
      map: Tx.una('muro', Tx.muro), roughness: 0.92, metalness: 0.06
    });
    var matFaldon = new THREE.MeshStandardMaterial({
      map: Tx.una('muroRojo', Tx.muroRojo), roughness: 0.72, metalness: 0.12
    });

    function paredCompleta(ancho, x, z, giro) {
      var alto = new THREE.Mesh(new THREE.PlaneGeometry(ancho, S.ALTO - S.ALTO_FALDON), matMuro);
      alto.position.set(x, S.ALTO_FALDON + (S.ALTO - S.ALTO_FALDON) / 2, z);
      alto.rotation.y = giro;
      alto.receiveShadow = true;
      raiz.add(alto);

      var faldon = new THREE.Mesh(new THREE.PlaneGeometry(ancho, S.ALTO_FALDON), matFaldon);
      faldon.position.set(x, S.ALTO_FALDON / 2, z);
      faldon.rotation.y = giro;
      faldon.receiveShadow = true;
      raiz.add(faldon);

      // Filo amarillo que separa el faldón del paño negro
      var filo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, 0.07), mat.amarillo);
      filo.position.set(
        x + Math.sin(giro) * 0.012,
        S.ALTO_FALDON,
        z + Math.cos(giro) * 0.012
      );
      filo.rotation.y = giro;
      raiz.add(filo);
    }
    paredCompleta(S.ANCHO, 0, -mitadZ, 0);
    paredCompleta(S.ANCHO, 0, mitadZ, Math.PI);
    paredCompleta(S.FONDO, -mitadX, 0, Math.PI / 2);
    paredCompleta(S.FONDO, mitadX, 0, -Math.PI / 2);

    /* ---------- Techo, vigas y diagonales amarillas ---------- */
    var techo = new THREE.Mesh(
      new THREE.PlaneGeometry(S.ANCHO, S.FONDO),
      new THREE.MeshStandardMaterial({ map: Tx.una('techo', Tx.techo), roughness: 0.98 })
    );
    techo.rotation.x = Math.PI / 2;
    techo.position.y = S.ALTO;
    raiz.add(techo);

    var matViga = new THREE.MeshStandardMaterial({ color: C.rojoViga, roughness: 0.5, metalness: 0.45 });
    for (var vz = -6; vz <= 6; vz += 4) {
      var viga = new THREE.Mesh(new THREE.BoxGeometry(S.ANCHO, 0.2, 0.34), matViga);
      viga.position.set(0, S.ALTO - 0.16, vz);
      raiz.add(viga);
    }

    // Tirantes amarillos en diagonal bajo el techo
    var matTirante = new THREE.MeshStandardMaterial({ color: C.amarillo, roughness: 0.45, metalness: 0.35 });
    var diagonales = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
    for (var d = 0; d < diagonales.length; d++) {
      var tirante = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 11, 10), matTirante);
      tirante.position.set(diagonales[d][0] * 4.6, S.ALTO - 0.52, diagonales[d][1] * 3.4);
      tirante.rotation.z = Math.PI / 2;
      tirante.rotation.y = diagonales[d][0] * diagonales[d][1] * 0.42;
      raiz.add(tirante);
    }

    /* ---------- Luminarias fluorescentes ---------- */
    var matTubo = new THREE.MeshBasicMaterial({ color: 0xfff4e2 });
    var puntos = [[-6.5, -5], [0, -5], [6.5, -5], [-6.5, 0], [6.5, 0], [-6.5, 5], [0, 5], [6.5, 5]];
    for (var i = 0; i < puntos.length; i++) {
      var lx = puntos[i][0], lz = puntos[i][1];
      var carcasa = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.34), mat.negro);
      carcasa.position.set(lx, S.ALTO - 0.34, lz);
      raiz.add(carcasa);
      var tubo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.22), matTubo);
      tubo.position.set(lx, S.ALTO - 0.39, lz);
      raiz.add(tubo);
    }

    /* ---------- Luces ---------- */
    escena.add(new THREE.HemisphereLight(0x2c3138, 0x0a0b0d, 0.32));
    var ambiente = new THREE.AmbientLight(0x39404a, 0.3);
    escena.add(ambiente);

    var focosTecho = [[-6.5, -5], [6.5, -5], [-6.5, 5], [6.5, 5], [0, 0]];
    for (var f = 0; f < focosTecho.length; f++) {
      var luz = new THREE.PointLight(C.luz, 0.72, 15, 2);
      luz.position.set(focosTecho[f][0], S.ALTO - 0.55, focosTecho[f][1]);
      escena.add(luz);
    }

    var foco = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 5, 0.5, 1.3);
    foco.position.set(0, S.ALTO - 0.4, 0);
    foco.target.position.set(0, 0.6, 0);
    foco.castShadow = true;
    foco.shadow.mapSize.set(1024, 1024);
    foco.shadow.camera.near = 0.5;
    foco.shadow.camera.far = 12;
    escena.add(foco, foco.target);
    S.foco = foco;
    S.ambiente = ambiente;

    /* ---------- Letreros de señalización ---------- */
    function letrero(titulo, sub, color, x, y, z, giro, w, h) {
      var clave = 'letrero-' + titulo + (sub || '');
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(w || 1.5, h || 0.75),
        new THREE.MeshStandardMaterial({
          map: Tx.una(clave, function () { return Tx.letrero(titulo, sub, color); }),
          roughness: 0.7,
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.14
        })
      );
      m.position.set(x, y, z);
      m.rotation.y = giro;
      raiz.add(m);
    }
    letrero('Uso obligatorio', 'Casco y gafas', '#1b56a4', -4.2, 2.35, -mitadZ + 0.07, 0);
    letrero('Zona segura', 'Equipo contra incendios', '#b3261e', 2.4, 2.2, -mitadZ + 0.07, 0, 1.15, 0.58);
    letrero('Salida', 'Emergencia', '#1f8a4c', mitadX - 0.08, 2.75, -3.6, -Math.PI / 2, 1.7, 0.85);
    letrero('Salida', 'Emergencia', '#1f8a4c', -mitadX + 0.08, 2.75, 3.6, Math.PI / 2, 1.7, 0.85);
    letrero('Área de inspección', '8 estaciones', '#c9a227', 0, 2.9, mitadZ - 0.07, Math.PI, 2.1, 1.05);

    /* ---------- Gabinetes de extintor en los muros ---------- */
    function miniExtintor() {
      var g = new THREE.Group();
      var rojo = new THREE.MeshStandardMaterial({ color: 0xc0231f, metalness: 0.42, roughness: 0.38 });
      var cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.34, 18), rojo);
      cuerpo.position.y = 0.17;
      g.add(cuerpo);
      var domo = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), rojo);
      domo.position.y = 0.34;
      g.add(domo);
      var cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 10), mat.grafito);
      cuello.position.y = 0.43;
      g.add(cuello);
      var etq = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.13, 18, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.8, side: THREE.DoubleSide }));
      etq.position.y = 0.17;
      g.add(etq);
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 18), mat.negro);
      base.position.y = 0.015;
      g.add(base);
      return g;
    }

    function gabinete(x, z, giro) {
      var g = new THREE.Group();
      var cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.05, 0.24), mat.rojoGab);
      cuerpo.castShadow = true;
      g.add(cuerpo);
      var marco = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.92, 0.02), mat.cristal);
      marco.position.z = 0.13;
      g.add(marco);
      var tirador = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.8, roughness: 0.3 }));
      tirador.position.set(0.24, 0, 0.15);
      g.add(tirador);

      var mini = miniExtintor();
      mini.position.set(0, -0.36, 0.02);
      g.add(mini);

      // Letrero encima
      var señal = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.17),
        new THREE.MeshStandardMaterial({
          map: Tx.una('letreroChico', Tx.letreroChico), roughness: 0.7,
          emissive: new THREE.Color(0x7a1512), emissiveIntensity: 0.2
        }));
      señal.position.set(0, 0.72, 0.13);
      g.add(señal);

      g.position.set(x, 1.55, z);
      g.rotation.y = giro;
      raiz.add(g);
    }
    gabinete(-9.3, -mitadZ + 0.14, 0);
    gabinete(-3.2, -mitadZ + 0.14, 0);
    gabinete(3.2, -mitadZ + 0.14, 0);
    gabinete(9.3, -mitadZ + 0.14, 0);
    gabinete(-9.3, mitadZ - 0.14, Math.PI);
    gabinete(-3.2, mitadZ - 0.14, Math.PI);
    gabinete(3.2, mitadZ - 0.14, Math.PI);
    gabinete(9.3, mitadZ - 0.14, Math.PI);
    gabinete(-mitadX + 0.14, -4.8, Math.PI / 2);
    gabinete(mitadX - 0.14, 4.8, -Math.PI / 2);

    /* ---------- Tambos ---------- */
    var matTambo = new THREE.MeshStandardMaterial({ color: 0xb5511f, metalness: 0.45, roughness: 0.55 });
    function tambo(x, z) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.88, 20), matTambo);
      t.position.set(x, 0.44, z);
      t.castShadow = true;
      raiz.add(t);
      for (var a = 0; a < 2; a++) {
        var aro = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.018, 8, 24), mat.grafito);
        aro.position.set(x, 0.28 + a * 0.32, z);
        aro.rotation.x = Math.PI / 2;
        raiz.add(aro);
      }
      colisiones.push(caja(x, z, 0.7, 0.7));
    }
    tambo(2.1, -6.4);
    tambo(3.9, -6.4);
    tambo(-4.4, 6.5);
    tambo(8.2, 3.2);

    /* ---------- Pedestal central ---------- */
    var pedestal = new THREE.Group();
    var col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.3, 32), mat.negro);
    col.position.y = 0.15;
    col.castShadow = true;
    col.receiveShadow = true;
    pedestal.add(col);
    var filoPed = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.022, 10, 40), mat.amarillo);
    filoPed.position.y = 0.3;
    filoPed.rotation.x = Math.PI / 2;
    pedestal.add(filoPed);
    raiz.add(pedestal);
    colisiones.push(caja(0, 0, 1.5, 1.5));

    var extintor = SIM.Piezas.extintorCompleto();
    extintor.position.y = 0.3;
    extintor.scale.setScalar(1.75);
    raiz.add(extintor);
    S.extintorCentral = extintor;

    /* ---------- Colisión de los muros ---------- */
    colisiones.push(caja(0, -mitadZ - 0.5, S.ANCHO + 2, 1));
    colisiones.push(caja(0, mitadZ + 0.5, S.ANCHO + 2, 1));
    colisiones.push(caja(-mitadX - 0.5, 0, 1, S.FONDO + 2));
    colisiones.push(caja(mitadX + 0.5, 0, 1, S.FONDO + 2));

    S.colisiones = colisiones;
    escena.add(raiz);
    S.raiz = raiz;
    return raiz;
  };

  /* ---------- Mesa de inspección ---------- */
  S.crearMesa = function (parte) {
    materiales();
    var g = new THREE.Group();

    // Cubierta clara con canto negro y filo amarillo
    var cubierta = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 0.92), mat.cubierta);
    cubierta.position.y = 0.93;
    cubierta.castShadow = true;
    cubierta.receiveShadow = true;
    g.add(cubierta);

    var canto = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.05, 0.98), mat.negro);
    canto.position.y = 0.885;
    g.add(canto);

    var filo = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.025, 0.03), mat.amarillo);
    filo.position.set(0, 0.9, 0.49);
    g.add(filo);
    var filoAtras = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.025, 0.03), mat.amarillo);
    filoAtras.position.set(0, 0.9, -0.49);
    g.add(filoAtras);

    // Entrepaño
    var entrepano = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.04, 0.76), mat.cubierta);
    entrepano.position.y = 0.34;
    entrepano.receiveShadow = true;
    g.add(entrepano);

    // Patas negras
    var patas = [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]];
    for (var i = 0; i < patas.length; i++) {
      var pata = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.9, 0.075), mat.negro);
      pata.position.set(patas[i][0], 0.45, patas[i][1]);
      pata.castShadow = true;
      g.add(pata);
    }

    // Tapete ovalado oscuro donde se exhibe la pieza
    var tapete = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 40), mat.grafito);
    tapete.position.set(0, 0.972, 0.03);
    tapete.scale.z = 0.62;
    tapete.receiveShadow = true;
    g.add(tapete);

    var aroLuz = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.008, 8, 44),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    aroLuz.position.set(0, 0.986, 0.03);
    aroLuz.rotation.x = Math.PI / 2;
    aroLuz.scale.y = 0.62;
    aroLuz.name = 'aro-estado';
    g.add(aroLuz);

    // Placa con número y nombre
    var placa = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.19),
      new THREE.MeshStandardMaterial({
        map: Tx.una('placa-' + parte.id, function () { return Tx.placa(parte.num, parte.nombre, parte.tipo); }),
        roughness: 0.6,
        emissive: new THREE.Color(0x1a1c1f),
        emissiveIntensity: 0.4
      }));
    placa.position.set(0, 1.09, -0.3);
    placa.rotation.x = -0.3;
    g.add(placa);
    var soporte = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.14), mat.negro);
    soporte.position.set(0, 1.0, -0.33);
    soporte.rotation.x = -0.3;
    g.add(soporte);

    return g;
  };
})(window);
