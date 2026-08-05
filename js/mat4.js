/* mat4.js - Utilidades mínimas de álgebra lineal para el motor 3D (vanilla, sin dependencias) */
const Mat4 = {
  create() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  },
  identity(out) {
    out.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    return out;
  },
  multiply(a, b) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + j] * b[i * 4 + k];
        out[i * 4 + j] = sum;
      }
    }
    return out;
  },
  translate(m, v) {
    const t = Mat4.create();
    t[12] = v[0]; t[13] = v[1]; t[14] = v[2];
    return Mat4.multiply(m, t);
  },
  scale(m, v) {
    const s = Mat4.create();
    s[0] = v[0]; s[5] = v[1]; s[10] = v[2];
    return Mat4.multiply(m, s);
  },
  rotateY(m, rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const r = Mat4.create();
    r[0] = c; r[2] = -s; r[8] = s; r[10] = c;
    return Mat4.multiply(m, r);
  },
  rotateX(m, rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const r = Mat4.create();
    r[5] = c; r[6] = s; r[9] = -s; r[10] = c;
    return Mat4.multiply(m, r);
  },
  rotateZ(m, rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const r = Mat4.create();
    r[0] = c; r[1] = s; r[4] = -s; r[5] = c;
    return Mat4.multiply(m, r);
  },
  invert(a) {
    const out = new Float32Array(16);
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3],
          a10=a[4],a11=a[5],a12=a[6],a13=a[7],
          a20=a[8],a21=a[9],a22=a[10],a23=a[11],
          a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10,
          b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
          b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30,
          b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
    if (!det) return Mat4.create();
    det = 1.0 / det;
    out[0]=(a11*b11-a12*b10+a13*b09)*det;
    out[1]=(a02*b10-a01*b11-a03*b09)*det;
    out[2]=(a31*b05-a32*b04+a33*b03)*det;
    out[3]=(a22*b04-a21*b05-a23*b03)*det;
    out[4]=(a12*b08-a10*b11-a13*b07)*det;
    out[5]=(a00*b11-a02*b08+a03*b07)*det;
    out[6]=(a32*b02-a30*b05-a33*b01)*det;
    out[7]=(a20*b05-a22*b02+a23*b01)*det;
    out[8]=(a10*b10-a11*b08+a13*b06)*det;
    out[9]=(a01*b08-a00*b10-a03*b06)*det;
    out[10]=(a30*b04-a31*b02+a33*b00)*det;
    out[11]=(a21*b02-a20*b04-a23*b00)*det;
    out[12]=(a11*b07-a10*b09-a12*b06)*det;
    out[13]=(a00*b09-a01*b07+a02*b06)*det;
    out[14]=(a31*b01-a30*b03-a32*b00)*det;
    out[15]=(a20*b03-a21*b01+a22*b00)*det;
    return out;
  },
  transpose(a) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        out[i * 4 + j] = a[j * 4 + i];
    return out;
  },
  // Cámara estilo "look" a partir de posición + yaw + pitch (radianes)
  cameraMatrix(pos, yaw, pitch) {
    let m = Mat4.create();
    m = Mat4.translate(m, pos);
    m = Mat4.rotateY(m, yaw);
    m = Mat4.rotateX(m, pitch);
    return Mat4.invert(m);
  },
  normalMatrix(modelMatrix) {
    // Para transformar normales: inversa-traspuesta de la 3x3 superior
    const inv = Mat4.invert(modelMatrix);
    return Mat4.transpose(inv);
  }
};
