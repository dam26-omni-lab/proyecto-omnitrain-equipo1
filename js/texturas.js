/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 2: texturas.js  (v2 — nave industrial oscura)
   Todas las texturas se dibujan con canvas en tiempo de carga.
   Cero imágenes, cero CDNs, cero archivos que se puedan perder.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});
  var T = (SIM.Texturas = {});

  function lienzo(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function aTextura(canvas, repX, repY) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repX || 1, repY || 1);
    tex.anisotropy = 8;
    return tex;
  }

  function ruido(g, w, h, cantidad, fuerza) {
    for (var i = 0; i < cantidad; i++) {
      var claro = Math.random() > 0.5;
      g.fillStyle = 'rgba(' + (claro ? '255,255,255,' : '0,0,0,') + (Math.random() * fuerza).toFixed(3) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }

  /* --- Piso: losa grande con junta marcada --- */
  T.piso = function () {
    var c = lienzo(512, 512), g = c.getContext('2d');
    var lado = 128;
    for (var fy = 0; fy < 4; fy++) {
      for (var fx = 0; fx < 4; fx++) {
        var tono = 54 + Math.floor(Math.random() * 8);
        g.fillStyle = 'rgb(' + tono + ',' + (tono + 3) + ',' + (tono + 6) + ')';
        g.fillRect(fx * lado, fy * lado, lado, lado);
        var deg = g.createLinearGradient(fx * lado, fy * lado, (fx + 1) * lado, (fy + 1) * lado);
        deg.addColorStop(0, 'rgba(255,255,255,0.035)');
        deg.addColorStop(1, 'rgba(0,0,0,0.05)');
        g.fillStyle = deg;
        g.fillRect(fx * lado, fy * lado, lado, lado);
      }
    }
    ruido(g, 512, 512, 5000, 0.05);
    g.strokeStyle = 'rgba(8,9,11,0.95)';
    g.lineWidth = 5;
    for (var i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * lado, 0); g.lineTo(i * lado, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * lado); g.lineTo(512, i * lado); g.stroke();
    }
    return aTextura(c, 7.33, 5.33); // losa de ~0.75 m
  };

  /* --- Muro alto: casi negro con despiece de bloque --- */
  T.muro = function () {
    var c = lienzo(512, 512), g = c.getContext('2d');
    g.fillStyle = '#131518';
    g.fillRect(0, 0, 512, 512);
    for (var y = 0; y < 512; y += 128) {
      for (var x = 0; x < 512; x += 128) {
        g.fillStyle = 'rgba(255,255,255,' + (0.012 + Math.random() * 0.018).toFixed(3) + ')';
        g.fillRect(x + 3, y + 3, 122, 122);
        g.strokeStyle = 'rgba(0,0,0,0.85)';
        g.lineWidth = 4;
        g.strokeRect(x, y, 128, 128);
      }
    }
    ruido(g, 512, 512, 2200, 0.03);
    return aTextura(c, 9, 3);
  };

  /* --- Faldón rojo del muro --- */
  T.muroRojo = function () {
    var c = lienzo(256, 128), g = c.getContext('2d');
    g.fillStyle = '#96201a';
    g.fillRect(0, 0, 256, 128);
    for (var i = 0; i < 60; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.09).toFixed(3) + ')';
      g.fillRect(Math.random() * 256, 0, 1 + Math.random() * 3, 128);
    }
    ruido(g, 256, 128, 900, 0.05);
    return aTextura(c, 10, 1);
  };

  /* --- Franja de peligro diagonal (amarillo / negro) --- */
  T.franja = function (repX) {
    var c = lienzo(256, 64), g = c.getContext('2d');
    g.fillStyle = '#e8c21a';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#101215';
    for (var i = -64; i < 320; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 32, 0);
      g.lineTo(i + 32 + 64, 64);
      g.lineTo(i + 64, 64);
      g.closePath();
      g.fill();
    }
    ruido(g, 256, 64, 400, 0.06);
    return aTextura(c, repX || 8, 1);
  };

  /* --- Placa numerada de cada mesa --- */
  T.placa = function (numero, titulo, tipo) {
    var c = lienzo(512, 160), g = c.getContext('2d');
    g.fillStyle = '#0b0d10';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#e8c21a';
    g.fillRect(0, 0, 96, 160);
    g.fillStyle = '#0b0d10';
    g.font = 'bold 90px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(numero).padStart(2, '0'), 48, 86);
    g.textAlign = 'left';
    g.fillStyle = '#f4f6f8';
    g.font = 'bold 42px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText(titulo.toUpperCase(), 120, 62);
    g.fillStyle = '#8b959f';
    g.font = '26px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText(tipo.toUpperCase(), 120, 106);
    g.strokeStyle = '#e8c21a';
    g.lineWidth = 5;
    g.strokeRect(2, 2, 508, 156);
    return aTextura(c, 1, 1);
  };

  /* --- Letrero de señalización --- */
  T.letrero = function (titulo, subtitulo, color) {
    var c = lienzo(512, 256), g = c.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 12;
    g.strokeRect(16, 16, 480, 224);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    if (subtitulo) {
      g.font = 'bold 84px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(titulo.toUpperCase(), 256, 130);
      g.font = '38px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(subtitulo.toUpperCase(), 256, 190);
    } else {
      g.font = 'bold 96px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(titulo.toUpperCase(), 256, 152);
    }
    return aTextura(c, 1, 1);
  };

  /* --- Letrero chico sobre los gabinetes --- */
  T.letreroChico = function () {
    var c = lienzo(512, 128), g = c.getContext('2d');
    g.fillStyle = '#c0231d';
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 112);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.font = 'bold 54px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText('EXTINTOR', 256, 62);
    g.font = '24px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText('ROMPER EN CASO DE EMERGENCIA', 256, 100);
    return aTextura(c, 1, 1);
  };

  /* --- Carátula del manómetro --- */
  T.caratula = function () {
    var c = lienzo(512, 512), g = c.getContext('2d');
    var cx = 256, cy = 256, r = 224;
    g.fillStyle = '#f7f4ec';
    g.beginPath();
    g.arc(cx, cy, 256, 0, Math.PI * 2);
    g.fill();

    function arco(desde, hasta, color, ancho) {
      g.strokeStyle = color;
      g.lineWidth = ancho;
      g.beginPath();
      g.arc(cx, cy, r - 26, desde, hasta);
      g.stroke();
    }
    // Escala: de 150° a 390° (sentido horario)
    var a0 = Math.PI * 0.83, a1 = Math.PI * 2.17;
    arco(a0, a0 + (a1 - a0) * 0.33, '#c62828', 46);
    arco(a0 + (a1 - a0) * 0.33, a0 + (a1 - a0) * 0.72, '#1f8a4c', 46);
    arco(a0 + (a1 - a0) * 0.72, a1, '#c62828', 46);

    g.strokeStyle = '#22262b';
    g.lineWidth = 4;
    for (var i = 0; i <= 12; i++) {
      var a = a0 + ((a1 - a0) * i) / 12;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (r - 52), cy + Math.sin(a) * (r - 52));
      g.lineTo(cx + Math.cos(a) * (r - 78), cy + Math.sin(a) * (r - 78));
      g.stroke();
    }
    g.fillStyle = '#22262b';
    g.font = 'bold 34px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('PSI', cx, cy + 96);
    g.font = '26px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText('0', cx - 138, cy + 122);
    g.fillText('300', cx + 138, cy + 122);

    // Aguja en zona verde
    var ag = a0 + (a1 - a0) * 0.52;
    g.strokeStyle = '#16181c';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(cx - Math.cos(ag) * 26, cy - Math.sin(ag) * 26);
    g.lineTo(cx + Math.cos(ag) * (r - 62), cy + Math.sin(ag) * (r - 62));
    g.stroke();
    g.fillStyle = '#16181c';
    g.beginPath();
    g.arc(cx, cy, 22, 0, Math.PI * 2);
    g.fill();
    return aTextura(c, 1, 1);
  };

  /* --- Etiqueta de instrucciones del extintor --- */
  T.etiqueta = function () {
    var c = lienzo(512, 768), g = c.getContext('2d');
    g.fillStyle = '#f6f3ec';
    g.fillRect(0, 0, 512, 768);
    g.fillStyle = '#c62828';
    g.fillRect(0, 0, 512, 118);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.font = 'bold 62px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText('POLVO QUÍMICO SECO', 256, 60);
    g.font = '32px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillText('EXTINTOR ABC · 6 kg', 256, 100);

    // Pictogramas de clase de fuego
    var clases = ['A', 'B', 'C'], etq = ['SÓLIDOS', 'LÍQUIDOS', 'ELÉCTRICO'];
    for (var i = 0; i < 3; i++) {
      var x = 96 + i * 160;
      g.fillStyle = '#1f8a4c';
      g.beginPath();
      g.arc(x, 226, 62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 74px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(clases[i], x, 252);
      g.fillStyle = '#22262b';
      g.font = 'bold 22px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(etq[i], x, 322);
    }

    // Pasos de operación
    var pasos = ['1 · JALAR EL SEGURO', '2 · APUNTAR A LA BASE', '3 · APRETAR LA PALANCA', '4 · BARRER EL FUEGO'];
    g.textAlign = 'left';
    for (var p = 0; p < 4; p++) {
      var y = 396 + p * 62;
      g.fillStyle = p % 2 ? '#eae5da' : '#f0ece2';
      g.fillRect(38, y - 34, 436, 54);
      g.fillStyle = '#22262b';
      g.font = 'bold 34px Bahnschrift, "Arial Narrow", Arial, sans-serif';
      g.fillText(pasos[p], 58, y);
    }

    g.fillStyle = '#22262b';
    g.fillRect(38, 664, 436, 3);
    g.font = '26px Bahnschrift, "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#4a545e';
    g.fillText('RECARGA: 03/2026', 44, 706);
    g.fillText('PRÓX. SERVICIO: 03/2027', 44, 742);
    g.textAlign = 'right';
    g.fillText('NOM-154-SCFI-2005', 470, 706);
    g.fillText('LOTE OMT-0846', 470, 742);
    return aTextura(c, 1, 1);
  };

  /* --- Metal cepillado para mesas y estructura --- */
  T.metal = function () {
    var c = lienzo(256, 256), g = c.getContext('2d');
    g.fillStyle = '#6d757e';
    g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 2600; i++) {
      g.strokeStyle = 'rgba(255,255,255,' + (Math.random() * 0.06).toFixed(3) + ')';
      var y = Math.random() * 256;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    return aTextura(c, 2, 2);
  };

  /* --- Cubierta clara de las mesas de trabajo --- */
  T.cubierta = function () {
    var c = lienzo(256, 256), g = c.getContext('2d');
    g.fillStyle = '#c6c3b8';
    g.fillRect(0, 0, 256, 256);
    ruido(g, 256, 256, 3000, 0.07);
    for (var i = 0; i < 40; i++) {
      g.strokeStyle = 'rgba(0,0,0,' + (Math.random() * 0.05).toFixed(3) + ')';
      g.lineWidth = 1;
      g.beginPath();
      var y = Math.random() * 256;
      g.moveTo(0, y); g.lineTo(256, y + (Math.random() - 0.5) * 8);
      g.stroke();
    }
    return aTextura(c, 1, 1);
  };

  /* --- Techo casi negro --- */
  T.techo = function () {
    var c = lienzo(256, 256), g = c.getContext('2d');
    g.fillStyle = '#0d0e10';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.02)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, 244, 244);
    return aTextura(c, 11, 8);
  };

  T.caché = {};
  T.una = function (nombre, fabrica) {
    if (!T.caché[nombre]) T.caché[nombre] = fabrica();
    return T.caché[nombre];
  };
})(window);
