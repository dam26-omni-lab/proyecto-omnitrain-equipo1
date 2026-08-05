/* meshes.js - Generadores de geometría primitiva (sombreado plano, sin dependencias) */
const Meshes = {
  box(w = 1, h = 1, d = 1) {
    const x = w / 2, y = h / 2, z = d / 2;
    const positions = [
      // frente
      -x,-y, z,  x,-y, z,  x, y, z,  -x, y, z,
      // atras
      -x,-y,-z, -x, y,-z,  x, y,-z,   x,-y,-z,
      // arriba
      -x, y,-z, -x, y, z,  x, y, z,   x, y,-z,
      // abajo
      -x,-y,-z,  x,-y,-z,  x,-y, z,  -x,-y, z,
      // derecha
       x,-y,-z,  x, y,-z,  x, y, z,   x,-y, z,
      // izquierda
      -x,-y,-z, -x,-y, z, -x, y, z,  -x, y,-z,
    ];
    const normals = [
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1,0,0,-1,0,0,-1,0,0,-1,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0,0,-1,0,0,-1,0,0,-1,0,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0,
    ];
    const indices = [];
    for (let f = 0; f < 6; f++) {
      const o = f * 4;
      indices.push(o, o+1, o+2, o, o+2, o+3);
    }
    return { positions, normals, indices };
  },

  cylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1, segments = 20, capped = true) {
    const positions = [], normals = [], indices = [];
    const halfH = height / 2;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const ct = Math.cos(theta), st = Math.sin(theta);
      // top ring
      positions.push(radiusTop*ct, halfH, radiusTop*st);
      normals.push(ct, (radiusBottom-radiusTop)/height, st);
      // bottom ring
      positions.push(radiusBottom*ct, -halfH, radiusBottom*st);
      normals.push(ct, (radiusBottom-radiusTop)/height, st);
    }
    for (let i = 0; i < segments; i++) {
      const a = i*2, b = i*2+1, c = i*2+2, d = i*2+3;
      indices.push(a,b,c, b,d,c);
    }
    if (capped) {
      const baseIndex = positions.length / 3;
      // top cap
      positions.push(0, halfH, 0); normals.push(0,1,0);
      const topCenterIdx = baseIndex;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(radiusTop*Math.cos(theta), halfH, radiusTop*Math.sin(theta));
        normals.push(0,1,0);
      }
      for (let i = 0; i < segments; i++) {
        indices.push(topCenterIdx, topCenterIdx+1+i, topCenterIdx+2+i);
      }
      const baseIndex2 = positions.length / 3;
      positions.push(0, -halfH, 0); normals.push(0,-1,0);
      const botCenterIdx = baseIndex2;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(radiusBottom*Math.cos(theta), -halfH, radiusBottom*Math.sin(theta));
        normals.push(0,-1,0);
      }
      for (let i = 0; i < segments; i++) {
        indices.push(botCenterIdx, botCenterIdx+2+i, botCenterIdx+1+i);
      }
    }
    return { positions, normals, indices };
  },

  cone(radius = 0.5, height = 1, segments = 20) {
    return Meshes.cylinder(0.0001, radius, height, segments, true);
  },

  torus(radius = 0.5, tube = 0.15, radialSeg = 16, tubularSeg = 24) {
    const positions = [], normals = [], indices = [];
    for (let j = 0; j <= radialSeg; j++) {
      for (let i = 0; i <= tubularSeg; i++) {
        const u = (i / tubularSeg) * Math.PI * 2;
        const v = (j / radialSeg) * Math.PI * 2;
        const cx = (radius + tube * Math.cos(v)) * Math.cos(u);
        const cy = tube * Math.sin(v);
        const cz = (radius + tube * Math.cos(v)) * Math.sin(u);
        positions.push(cx, cy, cz);
        const nx = Math.cos(v) * Math.cos(u);
        const ny = Math.sin(v);
        const nz = Math.cos(v) * Math.sin(u);
        normals.push(nx, ny, nz);
      }
    }
    for (let j = 0; j < radialSeg; j++) {
      for (let i = 0; i < tubularSeg; i++) {
        const a = j*(tubularSeg+1)+i;
        const b = (j+1)*(tubularSeg+1)+i;
        const c = (j+1)*(tubularSeg+1)+i+1;
        const d = j*(tubularSeg+1)+i+1;
        indices.push(a,b,d, b,c,d);
      }
    }
    return { positions, normals, indices };
  },

  plane(w = 1, d = 1) {
    const x = w/2, z = d/2;
    return {
      positions: [-x,0,-z,  x,0,-z,  x,0, z,  -x,0, z],
      normals: [0,1,0, 0,1,0, 0,1,0, 0,1,0],
      indices: [0,1,2, 0,2,3]
    };
  },

  sphere(radius = 0.5, wSeg = 16, hSeg = 12) {
    const positions = [], normals = [], indices = [];
    for (let y = 0; y <= hSeg; y++) {
      const v = y / hSeg;
      const phi = v * Math.PI;
      for (let x = 0; x <= wSeg; x++) {
        const u = x / wSeg;
        const theta = u * Math.PI * 2;
        const px = -radius * Math.cos(theta) * Math.sin(phi);
        const py = radius * Math.cos(phi);
        const pz = radius * Math.sin(theta) * Math.sin(phi);
        positions.push(px, py, pz);
        const len = Math.hypot(px,py,pz) || 1;
        normals.push(px/len, py/len, pz/len);
      }
    }
    for (let y = 0; y < hSeg; y++) {
      for (let x = 0; x < wSeg; x++) {
        const a = y*(wSeg+1)+x, b = a+wSeg+1;
        indices.push(a, b, a+1, b, b+1, a+1);
      }
    }
    return { positions, normals, indices };
  },

  // Combina varias mallas (cada una con su propia transformación local ya aplicada) en una sola
  merge(meshList) {
    const positions = [], normals = [], indices = [];
    let offset = 0;
    for (const m of meshList) {
      for (let i = 0; i < m.positions.length; i++) positions.push(m.positions[i]);
      for (let i = 0; i < m.normals.length; i++) normals.push(m.normals[i]);
      for (let i = 0; i < m.indices.length; i++) indices.push(m.indices[i] + offset);
      offset += m.positions.length / 3;
    }
    return { positions, normals, indices };
  },

  // Aplica una transformación (matriz Mat4) a los vértices/normales de una malla, devolviendo una copia
  transform(mesh, matrix) {
    const positions = new Array(mesh.positions.length);
    const normals = new Array(mesh.normals.length);
    const nm = Mat4.normalMatrix(matrix);
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i], y = mesh.positions[i+1], z = mesh.positions[i+2];
      positions[i]   = matrix[0]*x + matrix[4]*y + matrix[8]*z  + matrix[12];
      positions[i+1] = matrix[1]*x + matrix[5]*y + matrix[9]*z  + matrix[13];
      positions[i+2] = matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14];

      const nx = mesh.normals[i], ny = mesh.normals[i+1], nz = mesh.normals[i+2];
      let tx = nm[0]*nx + nm[4]*ny + nm[8]*nz;
      let ty = nm[1]*nx + nm[5]*ny + nm[9]*nz;
      let tz = nm[2]*nx + nm[6]*ny + nm[10]*nz;
      const len = Math.hypot(tx,ty,tz) || 1;
      normals[i] = tx/len; normals[i+1] = ty/len; normals[i+2] = tz/len;
    }
    return { positions, normals, indices: mesh.indices.slice() };
  }
};
