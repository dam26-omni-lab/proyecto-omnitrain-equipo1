/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 7: hud-phaser.js
   Phaser lleva la capa de simulación: máquina de estados del
   recorrido, minimapa con radar de proximidad, retícula y
   marcador de avance. Se dibuja sobre el lienzo 3D.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var H = (SIM.Hud = {});

  H.estado = {
    pos: { x: 0, z: 0 },
    giro: 0,
    cerca: null,
    modo: 'inicio',
    inspeccionadas: {}
  };

  var MAPA_W = 208, MAPA_H = 152, MARGEN = 20;
  var ESC = MAPA_W / SIM.Sala.ANCHO; // píxeles por metro

  var EscenaHud = {
    key: 'hud',

    create: function () {
      this.g = this.add.graphics();
      this.gRet = this.add.graphics();
      this.ping = 0;
      this.pingActivo = false;

      this.etiquetaMapa = this.add.text(0, 0, 'SALA DE INSPECCIÓN · 22 × 16 m', {
        fontFamily: 'Bahnschrift, "Arial Narrow", Arial, sans-serif',
        fontSize: '11px',
        color: '#8b959f'
      }).setOrigin(0, 0);

      this.textoAvance = this.add.text(0, 0, '', {
        fontFamily: 'Bahnschrift, "Arial Narrow", Arial, sans-serif',
        fontSize: '13px',
        color: '#e6eaee'
      }).setOrigin(0, 0);

      SIM.Hud.escena = this;
      this.scale.on('resize', this.reacomodar, this);
      this.reacomodar();
    },

    reacomodar: function () {
      var w = this.scale.width, h = this.scale.height;
      this.baseX = w - MAPA_W - MARGEN;
      this.baseY = h - MAPA_H - MARGEN - 26;
      this.etiquetaMapa.setPosition(this.baseX, this.baseY - 17);
      this.textoAvance.setPosition(this.baseX, this.baseY + MAPA_H + 8);
    },

    /* Convierte metros del mundo a píxeles del minimapa */
    mx: function (x) { return this.baseX + MAPA_W / 2 + x * ESC; },
    mz: function (z) { return this.baseY + MAPA_H / 2 + z * ESC; },

    update: function (tiempo, delta) {
      var st = SIM.Hud.estado;
      var dt = delta / 1000;
      var g = this.g;
      g.clear();
      this.gRet.clear();

      var oculto = st.modo === 'detalle' || st.modo === 'inicio';
      this.etiquetaMapa.setVisible(!oculto);
      this.textoAvance.setVisible(!oculto);
      if (oculto) return;

      /* --- Retícula central --- */
      var cx = this.scale.width / 2, cy = this.scale.height / 2;
      var color = st.cerca ? 0xf2b705 : 0xdfe6ec;
      var alfa = st.cerca ? 1 : 0.6;
      this.gRet.lineStyle(2, color, alfa);
      this.gRet.beginPath();
      this.gRet.moveTo(cx - 11, cy); this.gRet.lineTo(cx - 4, cy);
      this.gRet.moveTo(cx + 4, cy); this.gRet.lineTo(cx + 11, cy);
      this.gRet.moveTo(cx, cy - 11); this.gRet.lineTo(cx, cy - 4);
      this.gRet.moveTo(cx, cy + 4); this.gRet.lineTo(cx, cy + 11);
      this.gRet.strokePath();
      if (st.cerca) {
        var r = 16 + Math.sin(tiempo * 0.006) * 2.5;
        this.gRet.lineStyle(1.5, 0xf2b705, 0.8);
        this.gRet.strokeCircle(cx, cy, r);
      }

      /* --- Panel del minimapa --- */
      g.fillStyle(0x12151a, 0.82);
      g.fillRect(this.baseX, this.baseY, MAPA_W, MAPA_H);
      g.lineStyle(1, 0x39424c, 1);
      g.strokeRect(this.baseX, this.baseY, MAPA_W, MAPA_H);
      g.lineStyle(2, 0xf2b705, 0.85);
      g.beginPath();
      g.moveTo(this.baseX, this.baseY + MAPA_H);
      g.lineTo(this.baseX + 34, this.baseY + MAPA_H);
      g.strokePath();

      /* Rejilla de la sala */
      g.lineStyle(1, 0x2b323a, 0.9);
      for (var gx = -10; gx <= 10; gx += 5) {
        g.beginPath();
        g.moveTo(this.mx(gx), this.baseY + 4);
        g.lineTo(this.mx(gx), this.baseY + MAPA_H - 4);
        g.strokePath();
      }
      for (var gz = -6; gz <= 6; gz += 4) {
        g.beginPath();
        g.moveTo(this.baseX + 4, this.mz(gz));
        g.lineTo(this.baseX + MAPA_W - 4, this.mz(gz));
        g.strokePath();
      }

      /* Pedestal central */
      g.lineStyle(1, 0x6b7683, 1);
      g.strokeCircle(this.mx(0), this.mz(0), 1.45 * ESC);

      /* Estaciones */
      var partes = SIM.PARTES;
      for (var i = 0; i < partes.length; i++) {
        var p = partes[i];
        var px = this.mx(p.pos[0]), pz = this.mz(p.pos[1]);
        var hecha = !!st.inspeccionadas[p.id];
        var esCerca = st.cerca && st.cerca.parte.id === p.id;

        g.fillStyle(hecha ? 0x3ddc84 : (esCerca ? 0xf2b705 : 0x4d5c6b), 1);
        g.fillCircle(px, pz, esCerca ? 5.5 : 4);
        if (esCerca) {
          g.lineStyle(1.5, 0xf2b705, 0.55 + Math.sin(tiempo * 0.008) * 0.35);
          g.strokeCircle(px, pz, 9 + Math.sin(tiempo * 0.008) * 2);
        }
      }

      /* Radio de activación alrededor del brigadista */
      var jx = this.mx(st.pos.x), jz = this.mz(st.pos.z);
      g.lineStyle(1, 0x38bdf8, 0.35);
      g.strokeCircle(jx, jz, SIM.Escena.DISTANCIA_ACTIVACION * ESC);

      /* Marcador del brigadista (triángulo orientado) */
      var a = -st.giro - Math.PI / 2;
      var puntos = [
        [Math.cos(a) * 8, Math.sin(a) * 8],
        [Math.cos(a + 2.5) * 6, Math.sin(a + 2.5) * 6],
        [Math.cos(a - 2.5) * 6, Math.sin(a - 2.5) * 6]
      ];
      g.fillStyle(0x38bdf8, 1);
      g.beginPath();
      g.moveTo(jx + puntos[0][0], jz + puntos[0][1]);
      g.lineTo(jx + puntos[1][0], jz + puntos[1][1]);
      g.lineTo(jx + puntos[2][0], jz + puntos[2][1]);
      g.closePath();
      g.fillPath();

      /* Ping al entrar en rango */
      if (this.pingActivo) {
        this.ping += dt * 2.2;
        if (this.ping >= 1) { this.ping = 0; this.pingActivo = false; }
        else {
          g.lineStyle(2, 0xf2b705, 1 - this.ping);
          g.strokeCircle(jx, jz, 6 + this.ping * 26);
        }
      }

      /* Barra de avance: 8 marcas */
      var total = SIM.PARTES.length;
      var hechas = 0;
      for (var k in st.inspeccionadas) if (st.inspeccionadas[k]) hechas++;
      var anchoMarca = (MAPA_W - (total - 1) * 4) / total;
      for (var m = 0; m < total; m++) {
        var mxp = this.baseX + m * (anchoMarca + 4);
        var listo = !!st.inspeccionadas[SIM.PARTES[m].id];
        g.fillStyle(listo ? 0x3ddc84 : 0x333c45, listo ? 1 : 0.9);
        g.fillRect(mxp, this.baseY + MAPA_H + 26, anchoMarca, 4);
      }
      this.textoAvance.setText('PIEZAS INSPECCIONADAS  ' + hechas + ' / ' + total);
    }
  };

  H.iniciar = function () {
    H.juego = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'capa-hud',
      transparent: true,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      banner: false,
      audio: { noAudio: true },
      scene: [EscenaHud]
    });
  };

  H.pingRadar = function () {
    if (H.escena) { H.escena.ping = 0; H.escena.pingActivo = true; }
  };
})(window);
