// calculos.js: datos fijos del plan y cálculos que no dependen de la pantalla.

// ---------------------------------------------------------------------------
// Grados
// ---------------------------------------------------------------------------

export const GRADOS = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

// Vías de deportiva: grado YDS, equivalente francés y grado V del crux
// (el paso más difícil de la vía, medido como boulder). Medio grado por
// letra (2.5 = entre V2 y V3), anclado en 5.12d -> crux V5.
export const VIAS = [
  { yds: "5.9",   fr: "5c",  crux: 0 },
  { yds: "5.10a", fr: "6a",  crux: 0 },
  { yds: "5.10b", fr: "6a+", crux: 0 },
  { yds: "5.10c", fr: "6b",  crux: 0.5 },
  { yds: "5.10d", fr: "6b+", crux: 1 },
  { yds: "5.11a", fr: "6c",  crux: 1.5 },
  { yds: "5.11b", fr: "6c",  crux: 2 },
  { yds: "5.11c", fr: "6c+", crux: 2.5 },
  { yds: "5.11d", fr: "7a",  crux: 3 },
  { yds: "5.12a", fr: "7a+", crux: 3.5 },
  { yds: "5.12b", fr: "7b",  crux: 4 },
  { yds: "5.12c", fr: "7b+", crux: 4.5 },
  { yds: "5.12d", fr: "7c",  crux: 5 },
  { yds: "5.13a", fr: "7c+", crux: 5.5 },
  { yds: "5.13b", fr: "8a",  crux: 6.5 },
  { yds: "5.13c", fr: "8a+", crux: 7 },
  { yds: "5.13d", fr: "8b",  crux: 8 },
  { yds: "5.14a", fr: "8b+", crux: 8.5 },
];

// Descomposición de una vía en boulders:
//   - La vía se divide en tramos de METROS_POR_TRAMO (≈ 6 movimientos, el
//     largo de un boulder típico).
//   - 1 tramo es el crux: vale un boulder del grado crux.
//   - Los demás tramos son escalada continua: valen DESCUENTO_TRAMO grados V
//     menos que el crux (mínimo V0).
//   - Todo se multiplica por FACTOR_VIA.
//   Intensidad de la vía = FACTOR_VIA × [crux + (tramos − 1) × max(0, crux − DESCUENTO_TRAMO)]
export const FACTOR_VIA = 3;
export const METROS_POR_TRAMO = 5;
export const DESCUENTO_TRAMO = 2;
export const LARGO_VIA_DEFECTO = 20;
export const LARGOS_TABLA = [10, 15, 20, 25, 30, 35];

const VIA_POR_YDS = Object.fromEntries(VIAS.map((x) => [x.yds, x]));

export function descomponerVia(yds, largoM = LARGO_VIA_DEFECTO) {
  const crux = VIA_POR_YDS[yds]?.crux ?? 0;
  const tramos = Math.max(1, Math.round(largoM / METROS_POR_TRAMO));
  const tramo = Math.max(0, crux - DESCUENTO_TRAMO);
  const nCrux = FACTOR_VIA;
  const nTramo = FACTOR_VIA * (tramos - 1);
  return {
    crux,
    tramo,
    tramos,
    intensidad: Math.round((nCrux * crux + nTramo * tramo) * 10) / 10,
    texto: nTramo ? `${nCrux}×${textoV(crux)} + ${nTramo}×${textoV(tramo)}` : `${nCrux}×${textoV(crux)}`,
  };
}

// 2.5 -> "V2/3", 5 -> "V5"
export function textoV(n) {
  return n % 1 ? `V${Math.floor(n)}/${Math.ceil(n)}` : `V${n}`;
}

export function nombreVia(yds) {
  const x = VIA_POR_YDS[yds];
  return x ? `${x.yds} (${x.fr})` : yds;
}

function indiceVia(yds) {
  return VIAS.findIndex((x) => x.yds === yds);
}

export function numeroGrado(grado) {
  return parseInt(String(grado).replace(/\D/g, ""), 10) || 0;
}

// ---------------------------------------------------------------------------
// Bloques (las partes de una sesión)
// ---------------------------------------------------------------------------

export const TIPOS_BLOQUE = {
  calentamiento: { nombre: "Calentamiento", icono: "🤸", duracion: 40,
    pista: "Elongación, core, espalda y bloqueos." },
  dedos: { nombre: "Fuerza de dedos", icono: "✊", duracion: 30,
    pista: "Cumplido si todas las series salen con 2-3 s de margen. Progresar: +1-2 kg." },
  boulder_cal: { nombre: "Boulder de calentamiento", icono: "🌡️", duracion: 20,
    pista: "Bloques fáciles para entrar en calor; suman al volumen del día." },
  board: { nombre: "Board", icono: "🧗", duracion: 90,
    pista: "Cumplido si encadenas 1 problema de tu máximo o sacas todos los movimientos de uno más duro." },
  boulder: { nombre: "Boulder", icono: "🔥", duracion: 120,
    pista: "Al menos 3 estilos y un bloque de tu estilo más débil." },
  resistencia: { nombre: "Resistencia", icono: "🔁", duracion: 90,
    pista: "Cumplido si completas el formato cayéndote como máximo una vez." },
  vias: { nombre: "Vías (deportiva)", icono: "🪢", duracion: 120, pista: "" },
  roca: { nombre: "Roca", icono: "⛰️", duracion: 180, pista: "" },
  fisico: { nombre: "Físico", icono: "🏋️", duracion: 60,
    pista: "20 min de trote suave + ~35 min de fuerza, 1 ejercicio por grupo." },
  test: { nombre: "Test máximo", icono: "📏", duracion: 30,
    pista: "Máximo half crimp 10 s, pinza y grado máximo en board." },
  otro: { nombre: "Otro", icono: "➕", duracion: 30, pista: "" },
};

export const PARTES_CALENTAMIENTO = [
  ["elongacion", "Elongación"],
  ["core", "Core"],
  ["espalda", "Espalda"],
  ["bloqueos", "Bloqueos"],
];

// Nombres de partes de calentamiento de versiones anteriores (para mostrarlas).
export const PARTES_CALENTAMIENTO_ANTIGUAS = {
  movilidad: "Movilidad y elongación",
  multipresa: "Multipresa",
  progresiva: "Escalada progresiva",
};

// Fuerza de dedos por defecto: grupos de series iguales.
export const DEDOS_DEFECTO = [
  { agarre: "half_crimp", series: 5, seg: 5, kg: 0, margenSeg: 3, descansoSeg: 180 },
  { agarre: "pinza", series: 5, seg: 5, kg: 0, margenSeg: 3, descansoSeg: 180 },
];

// Boulder de calentamiento por defecto.
export const BOULDER_CAL_DEFECTO = { V3: 5, V4: 2 };

// Inicio común de las sesiones de escalada en el gimnasio.
const INICIO_GIMNASIO = [{ tipo: "calentamiento" }, { tipo: "dedos" }, { tipo: "boulder_cal" }];

export const ESTILOS = [
  "regletas", "pinzas", "romos", "compresión", "dinámico", "placa", "desplome", "técnico",
];

export const FISICO = {
  A: [
    { grupo: "Cadera y piernas (fuerza)", series: 3, reps: 8 },
    { grupo: "Empuje y hombro", series: 3, reps: 8 },
    { grupo: "Core de compresión", series: 3, reps: 10 },
  ],
  B: [
    { grupo: "Cadera en apertura y aductores", series: 3, reps: 8 },
    { grupo: "Manguito rotador y antebrazo", series: 2, reps: 15 },
    { grupo: "Core antirotación", series: 3, reps: 10 },
  ],
};

// ---------------------------------------------------------------------------
// Días prediseñados (plantillas) y plan semanal
// ---------------------------------------------------------------------------

export const PLANTILLAS = {
  board: {
    nombre: "Board", icono: "🧗", escalada: true,
    bloques: [...INICIO_GIMNASIO, { tipo: "board" }],
    objetivo: "Fuerza y potencia en movimientos límite.",
    criterio: "Encadenas al menos 1 problema de tu máximo, o sacas todos los movimientos de uno más duro.",
    progresar: "Sube un grado el rango de trabajo, o el ángulo 5°.",
  },
  resistencia: {
    nombre: "Resistencia", icono: "🔁", escalada: true,
    bloques: [...INICIO_GIMNASIO, { tipo: "resistencia" }],
    objetivo: "Aguantar más escalada continua con buena técnica.",
    criterio: "Completas el formato elegido (4x4, intervalos o vías) cayéndote como máximo una vez.",
    progresar: "Cambia una sola cosa: más grado, menos descanso o una ronda más.",
  },
  max_boulder: {
    nombre: "Max boulder", icono: "🔥", escalada: true,
    bloques: [...INICIO_GIMNASIO, { tipo: "boulder" }],
    objetivo: "Escalar al límite en estilos variados.",
    criterio: "Encadenas un V7 o más, o avanzas claramente en un V8. Tocaste al menos 3 estilos.",
    progresar: "Cuando los V7 salgan en 1-2 sesiones, pasa a trabajar V8.",
  },
  roca: {
    nombre: "Roca", icono: "⛰️", escalada: true,
    bloques: [{ tipo: "calentamiento" }, { tipo: "roca" }],
    objetivo: "Día libre en roca.", criterio: "Sin indicación.", progresar: "",
  },
  fisico_a: {
    nombre: "Físico A", icono: "🏋️", escalada: false,
    bloques: [{ tipo: "fisico", variante: "A" }],
    objetivo: "Cadera y piernas, empuje y hombro, core de compresión.",
    criterio: "Completas todas las series.",
    progresar: "Al llegar al tope de reps en todas las series, sube peso y vuelve al mínimo de reps.",
  },
  fisico_b: {
    nombre: "Físico B", icono: "🏋️", escalada: false,
    bloques: [{ tipo: "fisico", variante: "B" }],
    objetivo: "Cadera en apertura, manguito rotador y antebrazo, core antirotación.",
    criterio: "Completas todas las series.",
    progresar: "Al llegar al tope de reps en todas las series, sube peso y vuelve al mínimo de reps.",
  },
  test: {
    nombre: "Test máximo", icono: "📏", escalada: true,
    bloques: [{ tipo: "calentamiento" }, { tipo: "test" }],
    objetivo: "Medir tu máximo y elegir el foco de las próximas 3 semanas.",
    criterio: "Completas half crimp 10 s, pinza y grado máximo en board.",
    progresar: "",
  },
  libre: {
    nombre: "Sesión libre", icono: "📝", escalada: false,
    bloques: [],
    objetivo: "", criterio: "", progresar: "",
  },
};

// Semana sugerida para un plan nuevo (0 = domingo). Lista vacía = descanso;
// dos o más días prediseñados = opciones para elegir ese día.
export const SEMANA_SUGERIDA = {
  0: [],
  1: ["board"],
  2: ["fisico_a"],
  3: [],
  4: ["resistencia"],
  5: ["fisico_b"],
  6: ["roca", "max_boulder"],
};

export const FOCOS = { fuerza: "Fuerza", resistencia: "Resistencia", roca: "Roca", otro: "Otro" };

// Último día de un plan.
export function finPlan(plan) {
  return sumarDias(plan.inicio, plan.semanas * 7 - 1);
}

// Plan vigente en una fecha (si hay varios, el que empezó más tarde).
export function planVigente(iso, planes) {
  return planes
    .filter((p) => p.inicio <= iso && iso <= finPlan(p))
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0] || null;
}

const ES_ESCALADA = new Set(["board", "resistencia", "max_boulder", "roca", "test"]);

// Qué toca en una fecha según los planes.
// Devuelve { tipos, plan, semana, descarga } o null si no hay plan.
export function planDelDia(iso, planes = []) {
  const plan = planVigente(iso, planes);
  if (!plan) return null;

  const dias = Math.round((desdeISO(iso) - desdeISO(plan.inicio)) / 86400000);
  const semana = Math.floor(dias / 7) + 1;
  const descarga = plan.descargaCada > 0 && semana % plan.descargaCada === 0;
  let tipos = [...(plan.semana?.[desdeISO(iso).getDay()] || [])];

  // En la semana de descarga, el primer día de escalada se reemplaza por el test.
  if (descarga && plan.testEnDescarga && tipos.some((t) => ES_ESCALADA.has(t))) {
    const inicioSemana = sumarDias(plan.inicio, (semana - 1) * 7);
    let primero = null;
    for (let i = 0; i < 7 && !primero; i++) {
      const dia = sumarDias(inicioSemana, i);
      if ((plan.semana?.[desdeISO(dia).getDay()] || []).some((t) => ES_ESCALADA.has(t))) primero = dia;
    }
    if (primero === iso) tipos = ["test"];
  }
  return { tipos, plan, semana, descarga };
}

export function esEscalada(sesion) {
  return (sesion.bloques || []).some((b) =>
    ["board", "boulder", "boulder_cal", "resistencia", "vias", "roca", "test"].includes(b.tipo));
}

// ---------------------------------------------------------------------------
// Sesiones antiguas (versión 1) -> formato por bloques
// ---------------------------------------------------------------------------

const V1 = {
  board: ["board", "board"],
  dedos: ["libre", "dedos"],
  resistencia: ["resistencia", "resistencia"],
  max_boulder: ["max_boulder", "boulder"],
  roca: ["roca", "roca"],
};

export function normalizar(s) {
  let sesion = s;
  if (!Array.isArray(s.bloques)) {
    const det = s.detalle || {};
    let tipo, bloque;
    if (s.tipo === "fisico") {
      tipo = det.variante === "B" ? "fisico_b" : "fisico_a";
      bloque = "fisico";
    } else {
      [tipo, bloque] = V1[s.tipo] || ["libre", "otro"];
    }
    const { detalle, ...resto } = s;
    sesion = {
      ...resto,
      tipo,
      bloques: [{ id: "b1", tipo: bloque, duracionMin: s.duracionMin || 0, ...det }],
    };
  }
  // Fuerza de dedos antigua (una lista de series) -> grupos de series.
  if (sesion.bloques.some((b) => b.tipo === "dedos" && b.series && !b.grupos)) {
    sesion = {
      ...sesion,
      bloques: sesion.bloques.map((b) => {
        if (b.tipo !== "dedos" || !b.series || b.grupos) return b;
        const { series, ...resto } = b;
        return { ...resto, grupos: series.map((x) => ({ ...x, series: 1, descansoSeg: x.descansoSeg ?? 180 })) };
      }),
    };
  }
  return sesion;
}

// ---------------------------------------------------------------------------
// Intensidad y máximos
// ---------------------------------------------------------------------------

const sumar = (obj, valor) =>
  Object.entries(obj || {}).reduce((t, [g, n]) => t + n * valor(g), 0);

// Intensidad = Σ bloques × grado V  +  Σ vías × intensidad de la vía
// (según su grado y largo, ver descomponerVia). null si no hay grados.
export function intensidadBloque(b) {
  if (!b.grados && !b.vias) return null;
  const largo = Number(b.largoM) || LARGO_VIA_DEFECTO;
  const total = sumar(b.grados, numeroGrado) + sumar(b.vias, (g) => descomponerVia(g, largo).intensidad);
  return Math.round(total * 10) / 10;
}

export function intensidad(sesion) {
  const valores = (sesion.bloques || []).map(intensidadBloque).filter((x) => x != null);
  if (!valores.length) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) * 10) / 10;
}

export function duracionTotal(sesion) {
  return (sesion.bloques || []).reduce((t, b) => t + (Number(b.duracionMin) || 0), 0);
}

export function totalBloques(b) {
  return Object.values(b.grados || {}).reduce((t, n) => t + n, 0);
}

export function totalVias(b) {
  return Object.values(b.vias || {}).reduce((t, n) => t + n, 0);
}

// Grado V más alto con al menos un bloque, en uno o varios bloques.
export function gradoMaximo(...bloques) {
  let max = null;
  for (const b of bloques) {
    for (const [g, n] of Object.entries(b?.grados || {})) {
      if (n > 0 && (max == null || numeroGrado(g) > numeroGrado(max))) max = g;
    }
  }
  return max;
}

export function viaMaxima(...bloques) {
  let max = null;
  for (const b of bloques) {
    for (const [g, n] of Object.entries(b?.vias || {})) {
      if (n > 0 && (max == null || indiceVia(g) > indiceVia(max))) max = g;
    }
  }
  return max;
}

// ---------------------------------------------------------------------------
// Benchmarks del entrenamiento y tests
// ---------------------------------------------------------------------------

function bloquesDe(sesiones, tipos) {
  const lista = [];
  for (const s of sesiones) {
    for (const b of s.bloques || []) if (tipos.includes(b.tipo)) lista.push({ s, b });
  }
  return lista; // sesiones vienen de la más reciente a la más antigua
}

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return aISO(d);
}

// Mejor carga de dedos por agarre: { mejor, ultima, ultimos30 }
export function benchmarkDedos(sesiones, agarre) {
  const datos = bloquesDe(sesiones, ["dedos"])
    .map(({ s, b }) => {
      const kgs = (b.grupos || []).filter((x) => x.agarre === agarre && x.series > 0).map((x) => Number(x.kg));
      return kgs.length ? { fecha: s.fecha, kg: Math.max(...kgs), mm: b.regletaMm } : null;
    })
    .filter(Boolean);
  if (!datos.length) return null;
  const mejor = datos.reduce((a, b) => (b.kg > a.kg ? b : a));
  const recientes = datos.filter((d) => d.fecha >= haceDias(30));
  return {
    mejor,
    ultima: datos[0],
    ultimos30: recientes.length ? recientes.reduce((a, b) => (b.kg > a.kg ? b : a)) : null,
  };
}

// Grado máximo encadenado en un tipo de bloque.
export function benchmarkGrado(sesiones, tipos) {
  const datos = bloquesDe(sesiones, tipos)
    .map(({ s, b }) => ({ fecha: s.fecha, grado: gradoMaximo(b), b }))
    .filter((x) => x.grado);
  if (!datos.length) return null;
  const mejor = datos.reduce((a, b) => (numeroGrado(b.grado) > numeroGrado(a.grado) ? b : a));
  const recientes = datos.filter((d) => d.fecha >= haceDias(30));
  const mejor30 = recientes.length
    ? recientes.reduce((a, b) => (numeroGrado(b.grado) > numeroGrado(a.grado) ? b : a))
    : null;
  return { mejor, ultima: datos[0], ultimos30: mejor30 };
}

export function benchmarkVias(sesiones) {
  const datos = bloquesDe(sesiones, ["vias", "roca", "resistencia"])
    .map(({ s, b }) => ({ fecha: s.fecha, grado: viaMaxima(b) }))
    .filter((x) => x.grado);
  if (!datos.length) return null;
  const mejor = datos.reduce((a, b) => (indiceVia(b.grado) > indiceVia(a.grado) ? b : a));
  const recientes = datos.filter((d) => d.fecha >= haceDias(30));
  const mejor30 = recientes.length
    ? recientes.reduce((a, b) => (indiceVia(b.grado) > indiceVia(a.grado) ? b : a))
    : null;
  return { mejor, ultima: datos[0], ultimos30: mejor30 };
}

export function benchmarkResistencia(sesiones) {
  const datos = bloquesDe(sesiones, ["resistencia"]).map(({ s, b }) => ({ fecha: s.fecha, b }));
  if (!datos.length) return null;
  // "Mejor" = mayor intensidad completada con 1 caída o menos.
  const validas = datos.filter((x) => (x.b.caidas || 0) <= 1);
  const mejor = validas.length
    ? validas.reduce((a, b) => ((intensidadBloque(b.b) || 0) > (intensidadBloque(a.b) || 0) ? b : a))
    : null;
  return { ultima: datos[0], mejor };
}

// Lista de tests máximos, del más reciente al más antiguo.
export function tests(sesiones) {
  return bloquesDe(sesiones, ["test"]).map(({ s, b }) => ({ fecha: s.fecha, ...b }));
}

// Promedio de intensidad por día de escalada en una ventana de días.
export function intensidadPromedio(sesiones, desdeDias, hastaDias = 0) {
  const desde = haceDias(desdeDias);
  const hasta = haceDias(hastaDias);
  const porDia = intensidadPorDia(sesiones.filter((s) => s.fecha > desde && s.fecha <= hasta));
  const dias = Object.values(porDia);
  if (!dias.length) return null;
  return Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);
}

// { "2026-11-07": 120, ... } solo días con intensidad > 0.
export function intensidadPorDia(sesiones) {
  const porDia = {};
  for (const s of sesiones) {
    const i = intensidad(s);
    if (i) porDia[s.fecha] = (porDia[s.fecha] || 0) + i;
  }
  return porDia;
}

// ---------------------------------------------------------------------------
// Fechas (siempre en hora local, formato "YYYY-MM-DD")
// ---------------------------------------------------------------------------

export function hoyISO() {
  return aISO(new Date());
}

export function aISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function desdeISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(iso, n) {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + n);
  return aISO(d);
}

// Lunes de la semana de una fecha "YYYY-MM-DD".
export function lunesDe(iso) {
  const d = desdeISO(iso);
  return sumarDias(iso, -((d.getDay() + 6) % 7));
}

export function formatoFecha(iso, opciones = { weekday: "short", day: "numeric", month: "short" }) {
  return desdeISO(iso).toLocaleDateString("es-CL", opciones);
}
