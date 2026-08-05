/* parts-data.js - Metadatos y geometría de cada parte del extintor */

// Paleta de colores (RGB 0-1)
const COL = {
  rojo: [0.75, 0.08, 0.08],
  rojoOsc: [0.5, 0.05, 0.05],
  negro: [0.12, 0.12, 0.13],
  gris: [0.55, 0.56, 0.58],
  grisOsc: [0.32, 0.33, 0.35],
  cromo: [0.78, 0.8, 0.83],
  amarillo: [0.95, 0.78, 0.08],
  blanco: [0.92, 0.92, 0.9],
  aguja: [0.85, 0.1, 0.1],
};

/**
 * Cada builder genera una lista de "piezas" ya transformadas y fusionadas para representar
 * la parte de forma reconocible y con un color dominante representativo.
 */
const PartBuilders = {
  cilindro_principal() {
    const parts = [];
    let m = Mat4.create();
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.55, 0.6, 2.2, 24), m), color: COL.rojo });
    // remache / collar superior
    m = Mat4.translate(Mat4.create(), [0, 1.15, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.62, 0.62, 0.12, 24), m), color: COL.grisOsc });
    return parts;
  },

  manometro() {
    const parts = [];
    // cuerpo circular del manómetro
    let m = Mat4.rotateX(Mat4.create(), Math.PI / 2);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.35, 0.35, 0.14, 24), m), color: COL.cromo });
    // carátula (disco blanco)
    m = Mat4.translate(Mat4.rotateX(Mat4.create(), Math.PI / 2), [0, 0, 0.075]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.29, 0.29, 0.02, 24), m), color: COL.blanco });
    // aguja indicadora
    m = Mat4.translate(Mat4.create(), [0.08, 0.05, 0.09]);
    m = Mat4.rotateZ(m, -0.6);
    parts.push({ mesh: Meshes.transform(Meshes.box(0.22, 0.02, 0.02), m), color: COL.aguja });
    return parts;
  },

  valvula_descarga() {
    const parts = [];
    let m = Mat4.create();
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.3, 0.34, 0.4, 20), m), color: COL.negro });
    m = Mat4.translate(Mat4.create(), [0, 0.28, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.18, 0.22, 0.18, 20), m), color: COL.grisOsc });
    // salida lateral (boquilla hacia la manguera)
    m = Mat4.translate(Mat4.rotateZ(Mat4.create(), Math.PI / 2), [-0.05, -0.25, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.09, 0.09, 0.35, 14), m), color: COL.negro });
    return parts;
  },

  manguera() {
    const parts = [];
    // simulamos la curva de la manguera con segmentos de cilindro encadenados
    const segCount = 8;
    let x = 0, y = 0.9, angle = 0;
    const segLen = 0.32;
    for (let i = 0; i < segCount; i++) {
      angle += 0.28 - i * 0.01;
      const dx = Math.sin(angle) * segLen;
      const dy = -Math.cos(angle) * segLen;
      let m = Mat4.translate(Mat4.create(), [x + dx / 2, y + dy / 2, 0]);
      m = Mat4.rotateZ(m, angle);
      parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.06, 0.06, segLen * 1.08, 10), m), color: COL.negro });
      x += dx; y += dy;
    }
    // boquilla / pistola de descarga al final
    let m = Mat4.translate(Mat4.create(), [x, y - 0.15, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.1, 0.05, 0.3, 14), m), color: COL.negro });
    return parts;
  },

  gatillo() {
    const parts = [];
    // palanca superior fija
    let m = Mat4.translate(Mat4.create(), [0, 0.25, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.box(0.55, 0.08, 0.22), m), color: COL.negro });
    // palanca móvil (gatillo) en ángulo
    m = Mat4.translate(Mat4.create(), [0.05, -0.05, 0]);
    m = Mat4.rotateZ(m, -0.35);
    parts.push({ mesh: Meshes.transform(Meshes.box(0.5, 0.07, 0.2), m), color: COL.rojoOsc });
    // pivote
    m = Mat4.translate(Mat4.rotateX(Mat4.create(), Math.PI / 2), [-0.22, 0.1, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.06, 0.06, 0.26, 12), m), color: COL.cromo });
    return parts;
  },

  perno_seguridad() {
    const parts = [];
    // pasador metálico
    let m = Mat4.rotateZ(Mat4.create(), Math.PI / 2);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.035, 0.035, 0.65, 12), m), color: COL.cromo });
    // anillo amarillo de tiro
    m = Mat4.translate(Mat4.rotateY(Mat4.create(), Math.PI / 2), [0.4, 0, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.torus(0.14, 0.03, 10, 18), m), color: COL.amarillo });
    // precinto de plástico
    m = Mat4.translate(Mat4.rotateZ(Mat4.create(), Math.PI / 2), [-0.15, 0, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.05, 0.05, 0.05, 12), m), color: COL.blanco });
    return parts;
  },

  etiqueta_instrucciones() {
    const parts = [];
    // placa blanca
    let m = Mat4.create();
    parts.push({ mesh: Meshes.transform(Meshes.box(0.9, 1.1, 0.03), m), color: COL.blanco });
    // franja roja superior (encabezado)
    m = Mat4.translate(Mat4.create(), [0, 0.42, 0.02]);
    parts.push({ mesh: Meshes.transform(Meshes.box(0.86, 0.22, 0.01), m), color: COL.rojo });
    // líneas de texto simuladas (barras grises)
    for (let i = 0; i < 4; i++) {
      m = Mat4.translate(Mat4.create(), [0, 0.15 - i * 0.16, 0.02]);
      parts.push({ mesh: Meshes.transform(Meshes.box(0.7, 0.05, 0.01), m), color: COL.grisOsc });
    }
    // icono circular (pictograma)
    m = Mat4.translate(Mat4.rotateX(Mat4.create(), Math.PI / 2), [-0.3, -0.4, 0.03]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.12, 0.12, 0.01, 16), m), color: COL.rojo });
    return parts;
  },

  base_apoyo() {
    const parts = [];
    let m = Mat4.create();
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.62, 0.7, 0.16, 24), m), color: COL.negro });
    m = Mat4.translate(Mat4.create(), [0, 0.1, 0]);
    parts.push({ mesh: Meshes.transform(Meshes.cylinder(0.5, 0.58, 0.05, 24), m), color: COL.grisOsc });
    return parts;
  },
};

/**
 * Metadatos completos de cada parte: id, nombre visible, descripción, color de acento (para UI)
 * y builder de geometría 3D. El orden aquí define el orden de distribución en la sala.
 */
const EXTINGUISHER_PARTS = [
  {
    id: 'cilindro_principal',
    nombre: 'Cilindro principal',
    icono: 'cylinder',
    color: '#b3251f',
    descripcion: 'Recipiente metálico a presión que almacena el agente extintor (polvo químico seco, CO₂ o espuma) junto con el gas propulsor. Fabricado en acero o aluminio, debe resistir presiones internas elevadas y se somete a pruebas hidrostáticas periódicas para garantizar su integridad.',
  },
  {
    id: 'manometro',
    nombre: 'Manómetro',
    icono: 'gauge',
    color: '#dcdcdc',
    descripcion: 'Indicador de presión ubicado en la parte superior del extintor. Su aguja debe apuntar a la zona verde: si marca la zona roja izquierda, el equipo está descargado; si marca la derecha, está sobrepresurizado. Es el primer punto de inspección visual antes de usar el equipo.',
  },
  {
    id: 'valvula_descarga',
    nombre: 'Válvula de descarga',
    icono: 'valve',
    color: '#222222',
    descripcion: 'Mecanismo que controla la salida del agente extintor desde el cilindro hacia la manguera. Se acciona al presionar el gatillo, abriendo el paso del contenido presurizado. Debe permanecer libre de obstrucciones y corrosión para asegurar una descarga uniforme.',
  },
  {
    id: 'manguera',
    nombre: 'Manguera de descarga',
    icono: 'hose',
    color: '#1a1a1a',
    descripcion: 'Conducto flexible que dirige el agente extintor desde la válvula hasta la boquilla de salida, permitiendo apuntar con precisión a la base del fuego. Debe revisarse que no tenga grietas, cortes ni obstrucciones antes de cada uso.',
  },
  {
    id: 'gatillo',
    nombre: 'Gatillo o palanca de descarga',
    icono: 'trigger',
    color: '#8f1f1f',
    descripcion: 'Palanca que, al presionarse contra la manija fija, activa la válvula y libera el agente extintor. Solo debe accionarse después de retirar el perno de seguridad, apuntando siempre a la base de las llamas.',
  },
  {
    id: 'perno_seguridad',
    nombre: 'Perno o pasador de seguridad',
    icono: 'pin',
    color: '#e8c400',
    descripcion: 'Pasador metálico que bloquea el gatillo para evitar activaciones accidentales. Está sujeto por un precinto plástico que, si está roto, indica que el extintor pudo haber sido usado o manipulado. Debe retirarse tirando del anillo antes de accionar el gatillo.',
  },
  {
    id: 'etiqueta_instrucciones',
    nombre: 'Etiqueta de instrucciones',
    icono: 'label',
    color: '#c92a2a',
    descripcion: 'Rótulo informativo que indica la clase de fuego para la que es apto el extintor (A, B, C o K), el modo de uso paso a paso y la fecha de la última recarga o inspección. Es clave para seleccionar el extintor correcto ante cada tipo de incendio.',
  },
  {
    id: 'base_apoyo',
    nombre: 'Base de apoyo',
    icono: 'base',
    color: '#333333',
    descripcion: 'Estructura inferior que da estabilidad al extintor cuando se encuentra de pie, evitando que se vuelque o que la corrosión ataque el fondo del cilindro por contacto directo con superficies húmedas.',
  },
];
