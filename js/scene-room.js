/* scene-room.js - Construye la geometría estática de la sala de seguridad industrial
   Convención de composición usada en todo el archivo (importante):
   Para colocar un objeto en una posición absoluta de mundo con una rotación local,
   SIEMPRE se traslada primero y se rota después:
       let m = Mat4.translate(Mat4.create(), [x, y, z]);
       m = Mat4.rotateY(m, angulo);
   Esto asegura que el vector de posición NO se vea afectado por la rotación
   (si se anidara al revés, la posición terminaría rotada y el objeto aparecería
   desplazado a un lugar incorrecto). */

const ROOM = {
  halfW: 14,
  halfD: 14,
  height: 5.5,
};

// Construye una matriz de "colocar en (x,y,z) y luego rotar" en el eje indicado
function placeYRot(pos, angleRad) {
  let m = Mat4.translate(Mat4.create(), pos);
  if (angleRad) m = Mat4.rotateY(m, angleRad);
  return m;
}
function placeXRot(pos, angleRad) {
  let m = Mat4.translate(Mat4.create(), pos);
  if (angleRad) m = Mat4.rotateX(m, angleRad);
  return m;
}
function placeZRot(pos, angleRad) {
  let m = Mat4.translate(Mat4.create(), pos);
  if (angleRad) m = Mat4.rotateZ(m, angleRad);
  return m;
}

function buildRoomEntities() {
  const entities = [];
  const push = (mesh, model, color, emissive = 0) => {
    entities.push({ mesh, model, color, emissive, meshKey: null });
  };

  // --- Piso ---
  push(Meshes.plane(ROOM.halfW * 2, ROOM.halfD * 2), Mat4.create(), [0.28, 0.29, 0.31]);

  // Franjas de advertencia amarillo/negro junto a las paredes (cinta de peligro)
  const stripeY = 0.001;
  const stripeCount = 26;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < stripeCount; i++) {
      const t = (i / stripeCount) * (ROOM.halfW * 2 - 2) - (ROOM.halfW - 1);
      let m;
      const color = i % 2 === 0 ? [0.9, 0.75, 0.05] : [0.08, 0.08, 0.08];
      if (side === 0) m = placeYRot([t, stripeY, -ROOM.halfD + 0.9], 0);
      else if (side === 1) m = placeYRot([t, stripeY, ROOM.halfD - 0.9], 0);
      else if (side === 2) m = placeYRot([-ROOM.halfW + 0.9, stripeY, t], Math.PI / 2);
      else m = placeYRot([ROOM.halfW - 0.9, stripeY, t], Math.PI / 2);
      push(Meshes.box((ROOM.halfW * 2 / stripeCount) * 0.75, 0.002, 0.35), m, color);
    }
  }

  // --- Paredes (planos verticales, orientados hacia el interior de la sala) ---
  const wallColor = [0.62, 0.64, 0.67];
  const sideWallColor = [0.58, 0.6, 0.63];
  // pared frontal (z = -halfD): girar el plano horizontal 90° en X para pararlo
  push(Meshes.plane(ROOM.halfW * 2, ROOM.height), placeXRot([0, ROOM.height / 2, -ROOM.halfD], Math.PI / 2), wallColor);
  // pared trasera (z = +halfD)
  push(Meshes.plane(ROOM.halfW * 2, ROOM.height), placeXRot([0, ROOM.height / 2, ROOM.halfD], -Math.PI / 2), wallColor);
  // pared izquierda (x = -halfW): girar 90° en Z para pararlo, orientado a lo largo de Z
  push(Meshes.plane(ROOM.halfD * 2, ROOM.height), placeZRot([-ROOM.halfW, ROOM.height / 2, 0], Math.PI / 2), sideWallColor);
  // pared derecha (x = +halfW)
  push(Meshes.plane(ROOM.halfD * 2, ROOM.height), placeZRot([ROOM.halfW, ROOM.height / 2, 0], -Math.PI / 2), sideWallColor);

  // Franja roja de zócalo de seguridad en las paredes
  const baseboardY = 0.35;
  push(Meshes.box(ROOM.halfW * 2, 0.5, 0.05), placeYRot([0, baseboardY, -ROOM.halfD + 0.03], 0), [0.65, 0.1, 0.08]);
  push(Meshes.box(ROOM.halfW * 2, 0.5, 0.05), placeYRot([0, baseboardY, ROOM.halfD - 0.03], 0), [0.65, 0.1, 0.08]);
  push(Meshes.box(0.05, 0.5, ROOM.halfD * 2), placeYRot([-ROOM.halfW + 0.03, baseboardY, 0], 0), [0.65, 0.1, 0.08]);
  push(Meshes.box(0.05, 0.5, ROOM.halfD * 2), placeYRot([ROOM.halfW - 0.03, baseboardY, 0], 0), [0.65, 0.1, 0.08]);

  // --- Techo ---
  push(Meshes.plane(ROOM.halfW * 2, ROOM.halfD * 2), placeXRot([0, ROOM.height, 0], Math.PI), [0.85, 0.85, 0.86]);

  // Vigas / tuberías industriales colgando del techo
  for (let i = -1; i <= 1; i++) {
    const m = placeZRot([i * 8, ROOM.height - 0.15, 0], Math.PI / 2);
    push(Meshes.cylinder(0.08, 0.08, ROOM.halfD * 2 - 1, 12), m, [0.4, 0.42, 0.45]);
  }

  // --- Gabinete de extintor de pared (decorativo) ---
  push(Meshes.box(0.25, 1.3, 0.9), placeYRot([-ROOM.halfW + 0.15, 2, -6], 0), [0.7, 0.08, 0.06]);
  push(Meshes.box(0.02, 1.0, 0.65), placeYRot([-ROOM.halfW + 0.29, 2, -6], 0), [0.9, 0.9, 0.85]);

  // --- Letrero de salida (verde) ---
  push(Meshes.box(1.4, 0.5, 0.05), placeYRot([0, ROOM.height - 0.5, -ROOM.halfD + 0.1], 0), [0.05, 0.5, 0.15]);
  push(Meshes.box(0.08, 0.3, 0.02), placeYRot([-0.35, ROOM.height - 0.5, -ROOM.halfD + 0.14], 0), [1, 1, 1]);
  push(Meshes.box(0.35, 0.08, 0.02), placeYRot([0.05, ROOM.height - 0.5, -ROOM.halfD + 0.14], 0), [1, 1, 1]);

  // --- Señales de advertencia (representadas como placas) en las paredes ---
  const signSpots = [[-8, -ROOM.halfD + 0.06], [8, -ROOM.halfD + 0.06], [-8, ROOM.halfD - 0.06], [8, ROOM.halfD - 0.06]];
  for (const [sx, sz] of signSpots) {
    const facing = sz < 0 ? 0 : Math.PI;
    push(Meshes.box(0.6, 0.6, 0.02), placeYRot([sx, 3, sz], facing), [0.95, 0.78, 0.08]);
    const inset = sz < 0 ? 0.02 : -0.02;
    push(Meshes.box(0.44, 0.44, 0.02), placeYRot([sx, 3, sz + inset], facing), [0.1, 0.1, 0.1]);
  }

  return entities;
}

// Genera las mesas distribuidas en círculo, una por cada parte del extintor
function buildTables() {
  const tables = [];
  const n = EXTINGUISHER_PARTS.length;
  const radius = 8.2;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    tables.push({
      part: EXTINGUISHER_PARTS[i],
      position: [x, 0, z],
      angle: angle + Math.PI, // mesa mirando hacia el centro
    });
  }
  return tables;
}

function buildTableEntities(table) {
  const entities = [];
  const push = (mesh, model, color) => entities.push({ mesh, model, color, emissive: 0, meshKey: null });
  const [x, , z] = table.position;
  const tableH = 0.95;

  // tablero (posición absoluta primero, rotación local después)
  push(Meshes.box(1.7, 0.08, 1.1), placeYRot([x, tableH, z], table.angle), [0.42, 0.28, 0.16]);

  // patas (posición calculada manualmente en espacio de mundo, sin anidar rotación)
  const legOffsets = [[0.75, 0.48], [-0.75, 0.48], [0.75, -0.48], [-0.75, -0.48]];
  for (const [lx, lz] of legOffsets) {
    const cosA = Math.cos(table.angle), sinA = Math.sin(table.angle);
    const wx = x + lx * cosA - lz * sinA;
    const wz = z + lx * sinA + lz * cosA;
    push(Meshes.cylinder(0.045, 0.045, tableH - 0.04, 10), placeYRot([wx, (tableH - 0.04) / 2, wz], 0), [0.15, 0.15, 0.16]);
  }

  // pedestal metálico donde se apoya la parte
  push(Meshes.cylinder(0.28, 0.32, 0.08, 20), placeYRot([x, tableH + 0.08, z], table.angle), [0.5, 0.51, 0.53]);

  // letrero de mesa (placa con el nombre, orientada hacia fuera de la mesa)
  const signAngle = table.angle;
  const sx = x - Math.sin(signAngle) * 0.9;
  const sz = z + Math.cos(signAngle) * 0.9;
  push(Meshes.box(0.55, 0.35, 0.03), placeYRot([sx, tableH + 0.5, sz], table.angle), [0.1, 0.1, 0.11]);

  return entities;
}
