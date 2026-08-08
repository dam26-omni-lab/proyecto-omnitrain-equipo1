/* ============================================================
   OmniTrain · Showroom 3D
   Módulo 1: datos-partes.js
   Contenido técnico de cada estación. Aquí se edita el texto,
   no hace falta tocar el 3D para cambiar la información.
   ============================================================ */
(function (global) {
  'use strict';

  var SIM = (global.SIM = global.SIM || {});

  /* Cada estación:
     id        -> identificador interno (también nombra la pieza en el extintor central)
     num       -> número de estación que se pinta en la placa de la mesa
     nombre    -> título del panel
     tipo      -> etiqueta corta (aparece bajo el título)
     icono     -> clase de Bootstrap Icons
     resumen   -> párrafo de entrada
     funciones -> qué hace la pieza
     datos     -> ficha técnica (clave / valor)
     revision  -> qué revisa un brigadista en la inspección mensual
     norma     -> referencia normativa mexicana aplicable
     pos       -> posición de la mesa [x, z] en metros
     giro      -> rotación de la mesa en radianes (hacia dónde mira)
  */
  SIM.PARTES = [
    {
      id: 'cilindro',
      num: 1,
      nombre: 'Cilindro principal',
      tipo: 'Recipiente a presión',
      icono: 'bi-database',
      resumen:
        'Es el cuerpo del extintor: un recipiente de acero al carbono que guarda el agente extintor y el gas propelente (normalmente nitrógeno) a presión. Todo lo demás se monta sobre él.',
      funciones: [
        'Contiene el agente extintor y soporta la presión interna de trabajo.',
        'Aloja el tubo sifón, que sube el agente desde el fondo hasta la válvula.',
        'Da la superficie para el etiquetado, el color de identificación y el número de serie.'
      ],
      datos: [
        { k: 'Material', v: 'Acero al carbono estampado o embutido' },
        { k: 'Capacidad típica', v: '4.5 kg / 6 kg / 9 kg (PQS ABC)' },
        { k: 'Presión de trabajo', v: '≈ 195 psi (13.4 bar) a 21 °C' },
        { k: 'Prueba hidrostática', v: 'Cada 5 años en extintores de polvo' },
        { k: 'Color', v: 'Rojo de seguridad; banda distintiva según agente' }
      ],
      revision: [
        'Sin abolladuras, corrosión, escamas de pintura ni soldaduras dañadas.',
        'Número de serie y fecha de prueba hidrostática legibles.',
        'El cilindro no se golpea, no se rueda y no se usa como escalón.'
      ],
      norma: 'NOM-154-SCFI-2005 — servicio de mantenimiento y recarga',
      pos: [-6.5, -7.0],
      giro: 0
    },
    {
      id: 'manometro',
      num: 2,
      nombre: 'Manómetro',
      tipo: 'Indicador de presión',
      icono: 'bi-speedometer2',
      resumen:
        'Reloj indicador que muestra la presión del gas propelente dentro del cilindro. Es la lectura más rápida para saber si el equipo sirve o no antes de tomarlo.',
      funciones: [
        'Indica si la presión interna está dentro del rango de operación.',
        'Avisa de fugas lentas: la aguja baja poco a poco hacia la zona roja izquierda.',
        'Detecta sobrepresión por exposición al calor (zona roja derecha).'
      ],
      datos: [
        { k: 'Zona verde', v: 'Operativo, listo para usarse' },
        { k: 'Roja izquierda', v: 'Baja presión — recargar' },
        { k: 'Roja derecha', v: 'Sobrepresión — retirar de servicio' },
        { k: 'Escala común', v: '0 a 300 psi' },
        { k: 'No aplica en', v: 'Extintores de CO₂ (se verifican por peso)' }
      ],
      revision: [
        'Aguja dentro de la zona verde con el extintor en posición vertical.',
        'Cristal íntegro, sin humedad ni rotura, carátula legible.',
        'Si la aguja está pegada, dar un golpe suave: si no se mueve, mandar a servicio.'
      ],
      norma: 'Revisión visual mensual — NOM-002-STPS-2010',
      pos: [6.5, -7.0],
      giro: 0
    },
    {
      id: 'valvula',
      num: 3,
      nombre: 'Válvula de descarga',
      tipo: 'Cuerpo de control',
      icono: 'bi-nut',
      resumen:
        'Es el conjunto de latón o aluminio que cierra el cilindro. Mantiene el agente encerrado y lo libera de forma controlada cuando se acciona la palanca.',
      funciones: [
        'Sella el cilindro con un vástago y un resorte que lo mantienen cerrado.',
        'Abre el paso del agente al oprimir la palanca y lo corta al soltarla.',
        'Sirve de base de montaje para el manómetro, la manguera y el maneral.'
      ],
      datos: [
        { k: 'Material', v: 'Latón forjado o aluminio' },
        { k: 'Cierre', v: 'Vástago con asiento y resorte de retorno' },
        { k: 'Puertos', v: 'Manómetro, salida de manguera, cuello roscado' },
        { k: 'Descarga', v: 'Intermitente: se puede detener y reanudar' }
      ],
      revision: [
        'Sin fugas, golpes ni roscas dañadas en el cuello.',
        'Que no haya sido desarmada por personal no autorizado.',
        'Solo un taller certificado abre la válvula: el cilindro está presurizado.'
      ],
      norma: 'NOM-154-SCFI-2005 — mantenimiento por personal capacitado',
      pos: [0, -7.0],
      giro: 0
    },
    {
      id: 'manguera',
      num: 4,
      nombre: 'Manguera y boquilla',
      tipo: 'Conducción y difusión',
      icono: 'bi-bezier2',
      resumen:
        'Conduce el agente desde la válvula hasta el punto donde apuntas. La boquilla le da forma al chorro para cubrir la base del fuego.',
      funciones: [
        'Lleva el agente extintor fuera del equipo con la presión de descarga.',
        'Permite dirigir la descarga sin mover todo el cilindro.',
        'La boquilla abre el cono de polvo o difunde el CO₂.'
      ],
      datos: [
        { k: 'Longitud típica', v: '40 a 60 cm en extintores portátiles' },
        { k: 'Material', v: 'Caucho reforzado con malla interior' },
        { k: 'En CO₂', v: 'Corneta difusora: nunca se sujeta, congela la piel' },
        { k: 'Alcance', v: '3 a 6 m según capacidad y agente' }
      ],
      revision: [
        'Sin cuarteaduras, cortes ni resequedad en el caucho.',
        'Boquilla libre de polvo compactado, insectos o tapones.',
        'Acoplamientos apretados y manguera bien colocada en su soporte.'
      ],
      norma: 'Inspección mensual del conjunto de descarga',
      pos: [0, 7.0],
      giro: Math.PI
    },
    {
      id: 'gatillo',
      num: 5,
      nombre: 'Gatillo y maneral',
      tipo: 'Mecanismo de accionamiento',
      icono: 'bi-hand-index-thumb',
      resumen:
        'El maneral fijo es donde se sostiene el equipo; la palanca móvil (el gatillo) es la que se aprieta. Juntos abren la válvula y controlan la descarga.',
      funciones: [
        'Transmite la fuerza de la mano al vástago de la válvula.',
        'Permite descargas cortas para dosificar el agente.',
        'Sostiene el peso del extintor durante el ataque al fuego.'
      ],
      datos: [
        { k: 'Material', v: 'Acero cromado o aluminio' },
        { k: 'Recorrido', v: 'Bloqueado mientras el seguro esté puesto' },
        { k: 'Distancia de ataque', v: '2 a 3 m de la base del fuego' },
        { k: 'Técnica', v: 'Jalar · Apuntar · Apretar · Barrer' }
      ],
      revision: [
        'La palanca no debe estar doblada, floja ni con el perno vencido.',
        'Con el seguro puesto, el gatillo no debe tener juego libre.',
        'Nunca se prueba apretando: cualquier disparo obliga a recargar.'
      ],
      norma: 'Técnica de operación — capacitación NOM-002-STPS-2010',
      pos: [-6.5, 7.0],
      giro: Math.PI
    },
    {
      id: 'seguro',
      num: 6,
      nombre: 'Perno de seguridad',
      tipo: 'Bloqueo y precinto',
      icono: 'bi-key',
      resumen:
        'Pasador metálico con anillo que atraviesa el maneral y bloquea la palanca. Va acompañado del precinto o sello plástico, que delata si el equipo ya fue accionado.',
      funciones: [
        'Impide descargas accidentales por golpes o manipulación.',
        'Se retira jalando el anillo con firmeza, sin torcerlo.',
        'El precinto roto indica que el extintor debe recargarse aunque marque presión.'
      ],
      datos: [
        { k: 'Material del perno', v: 'Acero o latón' },
        { k: 'Precinto', v: 'Plástico o alambre de un solo uso' },
        { k: 'Primer paso', v: 'Es la "J" de Jalar en la técnica de ataque' },
        { k: 'Fuerza típica', v: '2 a 4 kg de tirón' }
      ],
      revision: [
        'Perno completo, en su lugar y sin deformaciones.',
        'Precinto intacto y con folio legible.',
        'Si falta el seguro o el sello está roto: fuera de servicio.'
      ],
      norma: 'Control de sellos — NOM-154-SCFI-2005',
      pos: [6.5, 7.0],
      giro: Math.PI
    },
    {
      id: 'etiqueta',
      num: 7,
      nombre: 'Etiqueta de instrucciones',
      tipo: 'Identificación del equipo',
      icono: 'bi-tag',
      resumen:
        'Concentra la identidad del extintor: qué clases de fuego apaga, cómo se opera, su capacidad y las fechas de servicio. Sin etiqueta legible el equipo no está en condiciones de uso.',
      funciones: [
        'Indica las clases de fuego que combate: A, B, C, D o K.',
        'Muestra la secuencia de operación con pictogramas.',
        'Registra capacidad, fabricante, lote y fechas de recarga y mantenimiento.'
      ],
      datos: [
        { k: 'Clase A', v: 'Sólidos: madera, papel, tela' },
        { k: 'Clase B', v: 'Líquidos inflamables: gasolina, solventes' },
        { k: 'Clase C', v: 'Equipo eléctrico energizado' },
        { k: 'Clase K', v: 'Aceites y grasas de cocina' },
        { k: 'Orientación', v: 'Siempre visible de frente en su soporte' }
      ],
      revision: [
        'Texto y pictogramas legibles, sin borrarse ni despegarse.',
        'Fecha de la última recarga y del próximo servicio vigentes.',
        'La etiqueta corresponde al agente que realmente contiene el equipo.'
      ],
      norma: 'Señalización e identificación — NOM-002-STPS-2010',
      pos: [-10.0, 0],
      giro: Math.PI / 2
    },
    {
      id: 'base',
      num: 8,
      nombre: 'Base de apoyo',
      tipo: 'Soporte y estabilidad',
      icono: 'bi-box-seam',
      resumen:
        'Aro o zócalo en la parte inferior del cilindro. Mantiene el extintor vertical y separa el metal del piso, que es donde empieza la corrosión.',
      funciones: [
        'Da estabilidad para que el equipo no se caiga de pie.',
        'Aísla el fondo del cilindro de la humedad del suelo.',
        'Absorbe golpes al apoyar el extintor durante el uso.'
      ],
      datos: [
        { k: 'Tipo', v: 'Aro metálico o zócalo de polímero' },
        { k: 'Altura de montaje', v: 'Parte más alta a máximo 1.50 m del piso' },
        { k: 'Ubicación', v: 'Ruta de evacuación, libre de obstáculos' },
        { k: 'Señalización', v: 'Letrero visible a distancia sobre el equipo' }
      ],
      revision: [
        'Aro sin oxidación, deformaciones ni tornillos faltantes.',
        'El extintor no se deja directamente sobre piso húmedo.',
        'El acceso al equipo está despejado en todo momento.'
      ],
      norma: 'Ubicación y altura — NOM-002-STPS-2010',
      pos: [10.0, 0],
      giro: -Math.PI / 2
    }
  ];

  SIM.porId = function (id) {
    for (var i = 0; i < SIM.PARTES.length; i++) {
      if (SIM.PARTES[i].id === id) return SIM.PARTES[i];
    }
    return null;
  };
})(window);
