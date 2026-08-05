/* main.js - Orquesta el simulador: exploración 3D en primera persona + vista de detalle 360° */
(function () {
  'use strict';

  const canvas = document.getElementById('scene-canvas');
  let engine;
  try {
    engine = new Engine(canvas);
  } catch (err) {
    document.body.innerHTML =
      '<div style="color:#fff;background:#1a1a1a;height:100vh;display:flex;align-items:center;' +
      'justify-content:center;text-align:center;font-family:sans-serif;padding:24px;">' +
      '<div><h2>No se pudo iniciar WebGL</h2><p>Tu navegador no soporta WebGL o está deshabilitado.<br>' +
      'Prueba con una versión reciente de Chrome, Firefox o Edge.</p></div></div>';
    console.error(err);
    return;
  }

  // ---------- Estado global ----------
  const STATE = {
    mode: 'explore', // 'explore' | 'detail' | 'transition'
    player: { x: 0, y: 1.65, z: 10, yaw: Math.PI, pitch: 0 },
    keys: {},
    pointerLocked: false,
    nearTable: null,
    detail: {
      part: null,
      autoRotate: 0,
      dragRotate: 0,
      dragging: false,
      lastX: 0,
      zoom: 4.2,
    },
  };

  const MOVE_SPEED = 4.2;
  const LOOK_SENS = 0.0022;
  const INTERACT_DISTANCE = 2.6;
  const PLAYER_RADIUS = 0.4;

  // ---------- Construcción de la sala (estática, se cachea) ----------
  const roomEntities = buildRoomEntities();
  const tables = buildTables();
  let tableEntities = [];
  tables.forEach((t, i) => {
    buildTableEntities(t).forEach(e => { e.meshKey = 'table_' + i + '_' + tableEntities.length; tableEntities.push(e); });
  });
  roomEntities.forEach((e, i) => e.meshKey = 'room_' + i);

  // Geometría de cada parte, colocada en miniatura sobre su mesa (para verse en exploración)
  const partMiniEntities = [];
  tables.forEach((t, i) => {
    const pieces = PartBuilders[t.part.id]();
    const [x, , z] = t.position;
    const y = 0.95 + 0.08 + 0.05;
    pieces.forEach((p, j) => {
      let m = Mat4.translate(Mat4.create(), [x, y, z]);
      m = Mat4.rotateY(m, t.angle + performance.now() * 0);
      m = Mat4.multiply(m, Mat4.scale(Mat4.create(), [0.55, 0.55, 0.55]));
      const mesh = p.mesh; // ya en espacio local de la pieza
      partMiniEntities.push({
        meshKey: 'mini_' + i + '_' + j,
        mesh,
        baseModel: m,
        color: p.color,
        emissive: 0,
        tableIndex: i,
      });
    });
  });

  // Geometría de cada parte para la vista de detalle (una sola vez, reutilizable)
  const partDetailMeshCache = {};
  function getDetailPieces(partId) {
    if (!partDetailMeshCache[partId]) partDetailMeshCache[partId] = PartBuilders[partId]();
    return partDetailMeshCache[partId];
  }

  // ---------- UI refs ----------
  const promptEl = document.getElementById('interact-prompt');
  const startOverlay = document.getElementById('start-overlay');
  const btnStart = document.getElementById('btn-start');
  const detailPanel = document.getElementById('detail-panel');
  const detailTitle = document.getElementById('detail-title');
  const detailDesc = document.getElementById('detail-desc');
  const btnBack = document.getElementById('btn-back');
  const fadeEl = document.getElementById('fade-overlay');
  const partCounter = document.getElementById('part-counter');
  const visitedSet = new Set();
  partCounter.textContent = `0 / ${EXTINGUISHER_PARTS.length} partes exploradas`;

  // ---------- Pointer lock & input ----------
  btnStart.addEventListener('click', () => {
    startOverlay.classList.add('d-none');
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    STATE.pointerLocked = document.pointerLockElement === canvas;
    if (!STATE.pointerLocked && STATE.mode === 'explore') {
      startOverlay.classList.remove('d-none');
    }
  });

  canvas.addEventListener('click', () => {
    if (STATE.mode === 'explore' && !STATE.pointerLocked) {
      canvas.requestPointerLock();
      startOverlay.classList.add('d-none');
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (STATE.mode === 'explore' && STATE.pointerLocked) {
      STATE.player.yaw -= e.movementX * LOOK_SENS;
      STATE.player.pitch -= e.movementY * LOOK_SENS;
      const lim = Math.PI / 2 - 0.05;
      STATE.player.pitch = Math.max(-lim, Math.min(lim, STATE.player.pitch));
    } else if (STATE.mode === 'detail' && STATE.detail.dragging) {
      STATE.detail.dragRotate += (e.clientX - STATE.detail.lastX) * 0.008;
      STATE.detail.lastX = e.clientX;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (STATE.mode === 'detail') {
      STATE.detail.dragging = true;
      STATE.detail.lastX = e.clientX;
    }
  });
  window.addEventListener('mouseup', () => { STATE.detail.dragging = false; });

  canvas.addEventListener('wheel', (e) => {
    if (STATE.mode === 'detail') {
      STATE.detail.zoom = Math.max(2.2, Math.min(8, STATE.detail.zoom + e.deltaY * 0.0025));
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    STATE.keys[e.code] = true;
    if (STATE.mode === 'explore' && (e.code === 'KeyE' || e.code === 'Enter') && STATE.nearTable !== null) {
      enterDetail(STATE.nearTable);
    }
    if (STATE.mode === 'detail' && e.code === 'Escape') {
      exitDetail();
    }
  });
  window.addEventListener('keyup', (e) => { STATE.keys[e.code] = false; });

  btnBack.addEventListener('click', exitDetail);

  window.addEventListener('resize', () => engine.resize());

  // ---------- Transición de vista (fundido) ----------
  function fade(cb) {
    fadeEl.classList.add('fade-active');
    setTimeout(() => {
      cb();
      setTimeout(() => fadeEl.classList.remove('fade-active'), 60);
    }, 380);
  }

  function enterDetail(tableIndex) {
    const t = tables[tableIndex];
    // Todo el estado necesario para renderizar la vista de detalle se fija de inmediato
    // (de forma sincrónica) porque el modo cambia ya mismo: el bucle de render llamará a
    // renderDetail() desde el próximo frame, oculto tras el fundido a negro. Solo la
    // revelación visual del panel HTML se retrasa para sincronizarse con la transición.
    STATE.mode = 'detail';
    STATE.detail.part = t.part;
    STATE.detail.tableIndex = tableIndex;
    STATE.detail.autoRotate = 0;
    STATE.detail.dragRotate = 0;
    STATE.detail.zoom = 4.2;
    if (document.pointerLockElement) document.exitPointerLock();
    fade(() => {
      detailTitle.textContent = t.part.nombre;
      detailDesc.textContent = t.part.descripcion;
      detailPanel.classList.remove('panel-in');
      detailPanel.classList.remove('d-none');
      // Forzar reflow para que el navegador registre el estado inicial (fuera de pantalla)
      // antes de añadir la clase que dispara la transición de deslizamiento.
      void detailPanel.offsetWidth;
      requestAnimationFrame(() => detailPanel.classList.add('panel-in'));
      promptEl.classList.add('d-none');
      visitedSet.add(t.part.id);
      partCounter.textContent = `${visitedSet.size} / ${EXTINGUISHER_PARTS.length} partes exploradas`;
    });
  }

  function exitDetail() {
    fade(() => {
      STATE.mode = 'explore';
      detailPanel.classList.add('d-none');
      detailPanel.classList.remove('panel-in');
      // El pointer lock se liberó al entrar en detalle; algunos navegadores no permiten
      // volver a solicitarlo fuera de un gesto directo del usuario, así que mostramos de
      // nuevo el overlay para que un clic explícito reactive el control del ratón.
      startOverlay.classList.remove('d-none');
    });
  }

  // ---------- Movimiento / colisión simple contra los límites de la sala ----------
  function updateMovement(dt) {
    if (STATE.mode !== 'explore') return;
    const p = STATE.player;
    let forward = 0, strafe = 0;
    if (STATE.keys['KeyW'] || STATE.keys['ArrowUp']) forward += 1;
    if (STATE.keys['KeyS'] || STATE.keys['ArrowDown']) forward -= 1;
    if (STATE.keys['KeyD'] || STATE.keys['ArrowRight']) strafe += 1;
    if (STATE.keys['KeyA'] || STATE.keys['ArrowLeft']) strafe -= 1;
    const len = Math.hypot(forward, strafe);
    if (len > 0) {
      forward /= len; strafe /= len;
      const speed = MOVE_SPEED * dt * (STATE.keys['ShiftLeft'] ? 1.6 : 1);
      const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
      const dx = (-sinY * forward + cosY * strafe) * speed;
      const dz = (-cosY * forward - sinY * strafe) * speed;
      let nx = p.x + dx, nz = p.z + dz;
      const lim = 13.3;
      nx = Math.max(-lim, Math.min(lim, nx));
      nz = Math.max(-lim, Math.min(lim, nz));
      p.x = nx; p.z = nz;
    }

    // Proximidad a mesas
    let nearest = null, nearestDist = Infinity;
    tables.forEach((t, i) => {
      const dx = p.x - t.position[0], dz = p.z - t.position[2];
      const d = Math.hypot(dx, dz);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    });
    if (nearest !== null && nearestDist < INTERACT_DISTANCE) {
      STATE.nearTable = nearest;
      const part = tables[nearest].part;
      promptEl.classList.remove('d-none');
      promptEl.innerHTML = `<svg class="icon"><use href="#icon-target"></use></svg> Presiona <kbd>E</kbd> para inspeccionar: <strong>${part.nombre}</strong>`;
    } else {
      STATE.nearTable = null;
      promptEl.classList.add('d-none');
    }
  }

  // ---------- Render de exploración ----------
  function renderExplore() {
    const p = STATE.player;
    const projection = Mat4.perspective(1.0, engine.aspect, 0.1, 60);
    const view = Mat4.cameraMatrix([p.x, p.y, p.z], p.yaw, p.pitch);
    engine.clear(0.08, 0.09, 0.11);
    engine.beginFrame(projection, view, [p.x, p.y, p.z]);

    for (const e of roomEntities) engine.draw({ meshKey: e.meshKey, mesh: e.mesh, model: e.model, color: e.color, emissive: e.emissive });
    for (const e of tableEntities) engine.draw({ meshKey: e.meshKey, mesh: e.mesh, model: e.model, color: e.color, emissive: 0 });

    const t = performance.now() * 0.0005;
    for (const e of partMiniEntities) {
      const spin = Mat4.rotateY(Mat4.create(), t * 0.6);
      const model = Mat4.multiply(e.baseModel, spin);
      const isNear = STATE.nearTable === e.tableIndex;
      engine.draw({ meshKey: e.meshKey, mesh: e.mesh, model, color: e.color, emissive: isNear ? 0.35 : 0 });
    }
  }

  // ---------- Render de detalle (objeto aislado, 360°) ----------
  function renderDetail(dt) {
    if (!STATE.detail.dragging) STATE.detail.autoRotate += dt * 0.35;
    const totalRotate = STATE.detail.autoRotate + STATE.detail.dragRotate;

    const projection = Mat4.perspective(0.85, engine.aspect, 0.1, 40);
    const camPos = [0, 1.0, STATE.detail.zoom];
    // Cámara orientada hacia el objeto en el origen
    const lookView = Mat4.invert(Mat4.multiply(
      Mat4.translate(Mat4.create(), camPos),
      Mat4.rotateX(Mat4.create(), -0.15)
    ));

    engine.clear(0.05, 0.05, 0.07);
    engine.beginFrame(projection, lookView, camPos);

    // pedestal
    engine.draw({
      meshKey: 'pedestal_detail',
      mesh: Meshes.cylinder(1.1, 1.3, 0.25, 28),
      model: Mat4.translate(Mat4.create(), [0, -0.9, 0]),
      color: [0.18, 0.19, 0.2],
      emissive: 0,
    });
    engine.draw({
      meshKey: 'pedestal_ring',
      mesh: Meshes.torus(1.05, 0.02, 8, 32),
      model: Mat4.translate(Mat4.create(), [0, -0.77, 0]),
      color: [0.85, 0.2, 0.15],
      emissive: 0.4,
    });

    const pieces = getDetailPieces(STATE.detail.part.id);
    let base = Mat4.rotateY(Mat4.create(), totalRotate);
    for (const piece of pieces) {
      engine.draw({
        meshKey: 'detail_' + STATE.detail.part.id + '_' + pieces.indexOf(piece),
        mesh: piece.mesh,
        model: base,
        color: piece.color,
        emissive: 0.06,
      });
    }
  }

  // ---------- Loop principal ----------
  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (STATE.mode === 'explore') {
      updateMovement(dt);
      renderExplore();
    } else if (STATE.mode === 'detail') {
      renderDetail(dt);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
