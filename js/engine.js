/* engine.js - Mini motor WebGL vanilla (sombreado Lambert + ambient, sin dependencias externas) */

const VERT_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uModel;
  uniform mat4 uNormalMatrix;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    vWorldPos = world.xyz;
    vNormal = mat3(uNormalMatrix) * aNormal;
    gl_Position = uProjection * uView * world;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform vec3 uCameraPos;
  uniform float uEmissive;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    float diff = max(dot(N, L), 0.0);
    float ambient = 0.42;
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 24.0) * 0.15;
    vec3 color = uColor * (ambient + diff * 0.62) + vec3(spec);
    color = mix(color, uColor * 1.6, uEmissive);
    gl_FragColor = vec4(color, 1.0);
  }
`;

class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL no disponible en este navegador.');
    this.gl = gl;
    this._initShaders();
    this._meshCache = new Map();
    this.lightDir = [0.4, 1.0, 0.35];
    this.resize();
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('Error compilando shader: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  _initShaders() {
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this._compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Error enlazando programa: ' + gl.getProgramInfoLog(prog));
    }
    this.program = prog;
    gl.useProgram(prog);
    this.attribs = {
      position: gl.getAttribLocation(prog, 'aPosition'),
      normal: gl.getAttribLocation(prog, 'aNormal'),
    };
    this.uniforms = {
      projection: gl.getUniformLocation(prog, 'uProjection'),
      view: gl.getUniformLocation(prog, 'uView'),
      model: gl.getUniformLocation(prog, 'uModel'),
      normalMatrix: gl.getUniformLocation(prog, 'uNormalMatrix'),
      color: gl.getUniformLocation(prog, 'uColor'),
      lightDir: gl.getUniformLocation(prog, 'uLightDir'),
      cameraPos: gl.getUniformLocation(prog, 'uCameraPos'),
      emissive: gl.getUniformLocation(prog, 'uEmissive'),
    };
    gl.enable(gl.DEPTH_TEST);
    // Face-culling deshabilitado a propósito: con decenas de piezas de baja poligonización
    // colocadas y orientadas a mano, es más robusto dibujar ambas caras (coste despreciable
    // a esta escala) que arriesgar paredes u objetos invisibles por un winding incorrecto.
    gl.disable(gl.CULL_FACE);
  }

  resize() {
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.aspect = w / h;
  }

  // Crea (o recupera de cache) los buffers WebGL para una malla + una key única
  uploadMesh(key, mesh) {
    if (this._meshCache.has(key)) return this._meshCache.get(key);
    const gl = this.gl;
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

    const record = { posBuf, normBuf, idxBuf, count: mesh.indices.length };
    this._meshCache.set(key, record);
    return record;
  }

  clear(r, g, b) {
    const gl = this.gl;
    gl.clearColor(r, g, b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  beginFrame(projection, view, cameraPos) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniforms.projection, false, projection);
    gl.uniformMatrix4fv(this.uniforms.view, false, view);
    gl.uniform3fv(this.uniforms.lightDir, this.lightDir);
    gl.uniform3fv(this.uniforms.cameraPos, cameraPos);
  }

  // Dibuja una entidad: { meshKey, mesh, model, color, emissive }
  draw(entity) {
    const gl = this.gl;
    const rec = this.uploadMesh(entity.meshKey, entity.mesh);
    gl.bindBuffer(gl.ARRAY_BUFFER, rec.posBuf);
    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, rec.normBuf);
    gl.enableVertexAttribArray(this.attribs.normal);
    gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rec.idxBuf);

    gl.uniformMatrix4fv(this.uniforms.model, false, entity.model);
    gl.uniformMatrix4fv(this.uniforms.normalMatrix, false, Mat4.normalMatrix(entity.model));
    gl.uniform3fv(this.uniforms.color, entity.color);
    gl.uniform1f(this.uniforms.emissive, entity.emissive || 0.0);

    gl.drawElements(gl.TRIANGLES, rec.count, gl.UNSIGNED_SHORT, 0);
  }
}
