// calculos.js: datos fijos y cálculos que no dependen de la pantalla.

export const GRADOS = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

export const TIPOS = {
  board:       { nombre: "Board",           icono: "🧗", escalada: true },
  dedos:       { nombre: "Fuerza de dedos", icono: "✊", escalada: false },
  resistencia: { nombre: "Resistencia",     icono: "🔁", escalada: true },
  max_boulder: { nombre: "Max boulder",     icono: "🔥", escalada: true },
  roca:        { nombre: "Roca / libre",    icono: "⛰️", escalada: true },
  fisico:      { nombre: "Físico",          icono: "🏋️", escalada: false },
};

export const RESULTADOS = {
  cumplido: "Cumplido",
  medias: "A medias",
  no: "No cumplido",
};

export const ESTILOS = [
  "regletas", "pinzas", "romos", "compresión", "dinámico", "placa", "desplome", "técnico",
];

// Qué toca cada día de la semana (0 = domingo).
export const PLAN_SEMANA = {
  0: "Libre: roca o max boulder",
  1: "Board (Kilter o Tension)",
  2: "Físico o descanso",
  3: "Físico o descanso",
  4: "Resistencia",
  5: "Libre: roca o max boulder",
  6: "Libre: roca o max boulder",
};

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

// "V7" -> 7
export function numeroGrado(grado) {
  return parseInt(String(grado).replace(/\D/g, ""), 10) || 0;
}

// Intensidad = Σ (bloques encadenados en el grado × número del grado).
// Devuelve null para sesiones sin bloques (dedos, físico).
export function intensidad(sesion) {
  const grados = sesion.detalle?.grados;
  if (!grados) return null;
  return Object.entries(grados).reduce((t, [g, n]) => t + n * numeroGrado(g), 0);
}

export function totalBloques(sesion) {
  const grados = sesion.detalle?.grados;
  if (!grados) return 0;
  return Object.values(grados).reduce((t, n) => t + n, 0);
}

export function gradoMaximo(sesion) {
  const grados = sesion.detalle?.grados;
  if (!grados) return null;
  const conBloques = Object.keys(grados).filter((g) => grados[g] > 0);
  if (!conBloques.length) return null;
  return conBloques.sort((a, b) => numeroGrado(b) - numeroGrado(a))[0];
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

// Lunes de la semana de una fecha "YYYY-MM-DD".
export function lunesDe(iso) {
  const d = desdeISO(iso);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dia);
  return aISO(d);
}

export function formatoFecha(iso, opciones = { weekday: "short", day: "numeric", month: "short" }) {
  return desdeISO(iso).toLocaleDateString("es-CL", opciones);
}
