// formularios.js: pantalla "Registrar sesión".
//
// Cómo funciona:
//   - `estado` es la sesión que se está editando (un objeto JS).
//   - dibujar() genera el HTML a partir de `estado`.
//   - Los botones tienen atributos data-accion / data-campo. Un solo oyente de
//     clicks lee esos atributos, modifica `estado` y vuelve a dibujar.
//   - Los campos de texto actualizan `estado` sin redibujar (para no perder
//     el cursor mientras escribes).

import {
  GRADOS, TIPOS, RESULTADOS, ESTILOS, FISICO,
  hoyISO, intensidad, totalBloques, gradoMaximo,
} from "./calculos.js";

const DESMARCABLES = new Set(["resultado", "codo", "codoDiaSiguiente", "esfuerzo", "detalle.gradoTrabajado"]);

const DURACION_POR_TIPO = {
  board: 150, dedos: 30, resistencia: 150, max_boulder: 180, roca: 240, fisico: 60,
};

// ---------------------------------------------------------------------------
// Valores iniciales: parte desde la última sesión del mismo tipo, para que
// registrar tome pocos toques.
// ---------------------------------------------------------------------------

function copia(x) {
  return JSON.parse(JSON.stringify(x));
}

function detalleInicial(tipo, sesiones) {
  const ultima = sesiones.find((s) => s.tipo === tipo);
  const prev = ultima?.detalle || {};

  switch (tipo) {
    case "board":
      return { tablero: prev.tablero || "Kilter", angulo: prev.angulo ?? 40, grados: {}, gradoTrabajado: null };
    case "dedos":
      return {
        regletaMm: prev.regletaMm ?? 20,
        series: prev.series?.length
          ? copia(prev.series)
          : [{ agarre: "half_crimp", kg: 20, seg: 10, margenSeg: 3 }],
      };
    case "resistencia":
      return {
        formato: prev.formato || "4x4",
        rondas: prev.rondas ?? 4,
        descansoMin: prev.descansoMin ?? 4,
        caidas: 0,
        grados: {},
      };
    case "max_boulder":
      return { grados: {}, estilos: [], proyecto: prev.proyecto || "", avance: "" };
    case "roca":
      return { lugar: "", grados: {} };
    case "fisico": {
      // Alterna A / B respecto de la última sesión de físico.
      const variante = prev.variante === "A" ? "B" : "A";
      return detalleFisico(variante, sesiones);
    }
  }
}

function detalleFisico(variante, sesiones) {
  const ultimaVariante = sesiones.find((s) => s.tipo === "fisico" && s.detalle?.variante === variante);
  const ejercicios = ultimaVariante?.detalle?.ejercicios?.length
    ? copia(ultimaVariante.detalle.ejercicios)
    : FISICO[variante].map((e) => ({ ...e, ejercicio: "", peso: 0 }));
  return { variante, troteMin: ultimaVariante?.detalle?.troteMin ?? 20, ejercicios };
}

function sesionNueva(tipo, sesiones) {
  return {
    tipo,
    fecha: hoyISO(),
    resultado: null,
    codo: null,
    codoDiaSiguiente: null,
    esfuerzo: null,
    duracionMin: DURACION_POR_TIPO[tipo],
    nota: "",
    detalle: detalleInicial(tipo, sesiones),
  };
}

// ---------------------------------------------------------------------------
// Leer y escribir campos con rutas tipo "detalle.series.0.kg"
// ---------------------------------------------------------------------------

function leer(obj, ruta) {
  return ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function escribir(obj, ruta, valor) {
  const partes = ruta.split(".");
  const ultima = partes.pop();
  const destino = partes.reduce((o, k) => o[k], obj);
  destino[ultima] = valor;
}

// ---------------------------------------------------------------------------
// Piezas de interfaz reutilizables
// ---------------------------------------------------------------------------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function campo(etiqueta, contenido, extra = "") {
  return `<div class="campo ${extra}"><span class="etiqueta">${etiqueta}</span>${contenido}</div>`;
}

// Botones para elegir una opción. opciones = [[valor, texto], ...]
function opciones(ruta, lista, actual, num = false) {
  return `<div class="chips">${lista
    .map(([v, t]) => `<button type="button" class="chip ${actual === v ? "activo" : ""}"
      data-accion="elegir" data-campo="${ruta}" data-valor="${esc(v)}" ${num ? "data-num" : ""}>${esc(t)}</button>`)
    .join("")}</div>`;
}

// Escala numérica de botones (codo 0-10, esfuerzo 1-10).
function escala(ruta, min, max, actual) {
  const lista = [];
  for (let i = min; i <= max; i++) lista.push([i, String(i)]);
  return `<div class="escala">${opciones(ruta, lista, actual, true)}</div>`;
}

// Contador con − y +.
function contador(ruta, valor, paso = 1, sufijo = "", min = 0) {
  return `<div class="contador">
    <button type="button" data-accion="sumar" data-campo="${ruta}" data-delta="${-paso}" data-min="${min}">−</button>
    <span>${valor ?? 0}${sufijo}</span>
    <button type="button" data-accion="sumar" data-campo="${ruta}" data-delta="${paso}" data-min="${min}">+</button>
  </div>`;
}

function texto(ruta, valor, placeholder = "", tipo = "text") {
  return `<input type="${tipo}" data-campo="${ruta}" value="${esc(valor)}" placeholder="${esc(placeholder)}">`;
}

// Cuadrícula de grados: bloques encadenados por grado.
function cuadriculaGrados(estado) {
  const grados = estado.detalle.grados;
  const celdas = GRADOS.map((g) => {
    const n = grados[g] || 0;
    return `<div class="celda-grado ${n ? "con-bloques" : ""}">
      <button type="button" class="mas" data-accion="grado" data-grado="${g}" data-delta="1">
        <strong>${g}</strong><span>${n || ""}</span>
      </button>
      <button type="button" class="menos" data-accion="grado" data-grado="${g}" data-delta="-1" ${n ? "" : "disabled"}>−</button>
    </div>`;
  }).join("");

  const max = gradoMaximo(estado);
  return `<div class="campo">
      <span class="etiqueta">Bloques encadenados por grado <small>(toca el grado para sumar)</small></span>
      <div class="grados">${celdas}</div>
      <div class="resumen-intensidad">
        <div><small>Bloques</small><b>${totalBloques(estado)}</b></div>
        <div><small>Grado máx.</small><b>${max || "—"}</b></div>
        <div><small>Intensidad</small><b>${intensidad(estado)}</b></div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Campos específicos de cada tipo de sesión
// ---------------------------------------------------------------------------

const camposPorTipo = {
  board(e) {
    const d = e.detalle;
    return [
      campo("Tablero", opciones("detalle.tablero", [["Kilter", "Kilter"], ["Tension", "Tension"]], d.tablero)),
      campo("Ángulo", contador("detalle.angulo", d.angulo, 5, "°")),
      cuadriculaGrados(e),
      campo("Grado trabajado sin encadenar <small>(opcional)</small>",
        opciones("detalle.gradoTrabajado", GRADOS.slice(3).map((g) => [g, g]), d.gradoTrabajado)),
    ].join("");
  },

  dedos(e) {
    const d = e.detalle;
    const filas = d.series.map((s, i) => `
      <div class="serie">
        <div class="serie-cabecera">
          <b>Serie ${i + 1}</b>
          <button type="button" class="link peligro" data-accion="quitar-serie" data-indice="${i}">Quitar</button>
        </div>
        ${opciones(`detalle.series.${i}.agarre`, [["half_crimp", "Half crimp"], ["pinza", "Pinza"]], s.agarre)}
        <div class="fila-contadores">
          ${campo("Kg", contador(`detalle.series.${i}.kg`, s.kg, 1, " kg", -100))}
          ${campo("Segundos", contador(`detalle.series.${i}.seg`, s.seg, 1, " s"))}
          ${campo("Margen", contador(`detalle.series.${i}.margenSeg`, s.margenSeg, 1, " s"))}
        </div>
      </div>`).join("");
    return [
      campo("Regleta", contador("detalle.regletaMm", d.regletaMm, 1, " mm")),
      `<div class="campo"><span class="etiqueta">Series</span>${filas}
        <button type="button" class="secundario" data-accion="agregar-serie">+ Agregar serie</button></div>`,
    ].join("");
  },

  resistencia(e) {
    const d = e.detalle;
    return [
      campo("Formato", opciones("detalle.formato",
        [["4x4", "4x4"], ["intervalos", "Intervalos"], ["vias", "Vías"]], d.formato)),
      `<div class="fila-contadores">
        ${campo("Rondas", contador("detalle.rondas", d.rondas))}
        ${campo("Descanso", contador("detalle.descansoMin", d.descansoMin, 1, " min"))}
        ${campo("Caídas", contador("detalle.caidas", d.caidas))}
      </div>`,
      cuadriculaGrados(e),
    ].join("");
  },

  max_boulder(e) {
    const d = e.detalle;
    const chips = ESTILOS.map((s) => `<button type="button" class="chip ${d.estilos.includes(s) ? "activo" : ""}"
      data-accion="alternar" data-campo="detalle.estilos" data-valor="${s}">${s}</button>`).join("");
    return [
      cuadriculaGrados(e),
      campo(`Estilos tocados <small>(${d.estilos.length}; objetivo 3 o más)</small>`, `<div class="chips">${chips}</div>`),
      campo("Proyecto <small>(opcional)</small>", texto("detalle.proyecto", d.proyecto, "Nombre del bloque")),
      campo("Avance en el proyecto <small>(opcional)</small>", texto("detalle.avance", d.avance, "Ej: saqué todos los movimientos")),
    ].join("");
  },

  roca(e) {
    return [
      campo("Lugar", texto("detalle.lugar", e.detalle.lugar, "Ej: Las Chilcas")),
      cuadriculaGrados(e),
    ].join("");
  },

  fisico(e) {
    const d = e.detalle;
    const filas = d.ejercicios.map((x, i) => `
      <div class="serie">
        <b>${esc(x.grupo)}</b>
        ${texto(`detalle.ejercicios.${i}.ejercicio`, x.ejercicio, "Ejercicio (opcional)")}
        <div class="fila-contadores">
          ${campo("Peso", contador(`detalle.ejercicios.${i}.peso`, x.peso, 2.5, " kg"))}
          ${campo("Series", contador(`detalle.ejercicios.${i}.series`, x.series))}
          ${campo("Reps", contador(`detalle.ejercicios.${i}.reps`, x.reps))}
        </div>
      </div>`).join("");
    return [
      campo("Rutina", opciones("detalle.variante", [["A", "Físico A"], ["B", "Físico B"]], d.variante)),
      campo("Trote suave", contador("detalle.troteMin", d.troteMin, 5, " min")),
      `<div class="campo"><span class="etiqueta">Ejercicios</span>${filas}</div>`,
    ].join("");
  },
};

function camposComunes(e) {
  return [
    campo("¿Cumpliste el objetivo?", opciones("resultado", Object.entries(RESULTADOS), e.resultado)),
    campo("Dolor de codo durante la sesión (0-10)", escala("codo", 0, 10, e.codo)),
    campo("Dolor de codo al día siguiente <small>(puedes completarlo mañana)</small>",
      escala("codoDiaSiguiente", 0, 10, e.codoDiaSiguiente)),
    campo("Esfuerzo percibido (1-10)", escala("esfuerzo", 1, 10, e.esfuerzo)),
    campo("Duración", contador("duracionMin", e.duracionMin, 15, " min")),
    campo("Nota <small>(opcional)</small>", `<textarea data-campo="nota" rows="2" placeholder="Cómo te sentiste, qué funcionó...">${esc(e.nota)}</textarea>`),
  ].join("");
}

// ---------------------------------------------------------------------------
// Formulario completo
// ---------------------------------------------------------------------------

export function crearFormulario(contenedor, { sesion, sesiones, alGuardar, alCancelar, alBorrar }) {
  // Si viene una sesión, se edita una copia; si no, se elige el tipo primero.
  let estado = sesion ? copia(sesion) : null;

  function dibujar() {
    if (!estado) {
      contenedor.innerHTML = `
        <h2>¿Qué sesión hiciste?</h2>
        <div class="tipos">
          ${Object.entries(TIPOS).map(([k, t]) => `
            <button type="button" class="tipo" data-accion="tipo" data-valor="${k}">
              <span class="icono">${t.icono}</span>${t.nombre}
            </button>`).join("")}
        </div>
        <button type="button" class="secundario" data-accion="cancelar">Cancelar</button>`;
      return;
    }

    const t = TIPOS[estado.tipo];
    contenedor.innerHTML = `
      <div class="cabecera-form">
        <h2>${t.icono} ${t.nombre}</h2>
        ${estado.id ? "" : `<button type="button" class="link" data-accion="cambiar-tipo">Cambiar tipo</button>`}
      </div>
      ${campo("Fecha", texto("fecha", estado.fecha, "", "date"))}
      ${camposPorTipo[estado.tipo](estado)}
      <h3>Cierre</h3>
      ${camposComunes(estado)}
      <div class="acciones">
        <button type="button" class="primario" data-accion="guardar">Guardar</button>
        <button type="button" class="secundario" data-accion="cancelar">Cancelar</button>
        ${estado.id ? `<button type="button" class="link peligro" data-accion="borrar">Borrar sesión</button>` : ""}
      </div>`;
  }

  // Un solo oyente para todos los botones del formulario.
  function alHacerClick(ev) {
    const b = ev.target.closest("[data-accion]");
    if (!b || !contenedor.contains(b)) return;
    const { accion, campo: ruta, valor } = b.dataset;

    switch (accion) {
      case "tipo":
        estado = sesionNueva(valor, sesiones);
        break;
      case "cambiar-tipo":
        estado = null;
        break;
      case "elegir": {
        const v = "num" in b.dataset ? Number(valor) : valor;
        // En campos opcionales, tocar la opción ya elegida la desmarca.
        const desmarcar = DESMARCABLES.has(ruta) && leer(estado, ruta) === v;
        escribir(estado, ruta, desmarcar ? null : v);
        if (ruta === "detalle.variante" && v) {
          estado.detalle = detalleFisico(v, sesiones);
        }
        break;
      }
      case "sumar": {
        const nuevo = (Number(leer(estado, ruta)) || 0) + Number(b.dataset.delta);
        escribir(estado, ruta, Math.max(Number(b.dataset.min), nuevo));
        break;
      }
      case "grado": {
        const g = b.dataset.grado;
        const n = Math.max(0, (estado.detalle.grados[g] || 0) + Number(b.dataset.delta));
        if (n) estado.detalle.grados[g] = n;
        else delete estado.detalle.grados[g];
        break;
      }
      case "alternar": {
        const lista = leer(estado, ruta);
        const i = lista.indexOf(valor);
        if (i >= 0) lista.splice(i, 1);
        else lista.push(valor);
        break;
      }
      case "agregar-serie": {
        const series = estado.detalle.series;
        series.push(copia(series[series.length - 1] || { agarre: "half_crimp", kg: 20, seg: 10, margenSeg: 3 }));
        break;
      }
      case "quitar-serie":
        estado.detalle.series.splice(Number(b.dataset.indice), 1);
        break;
      case "guardar":
        alGuardar(estado);
        return;
      case "cancelar":
        alCancelar();
        return;
      case "borrar":
        if (confirm("¿Borrar esta sesión? No se puede deshacer.")) alBorrar(estado.id);
        return;
    }
    dibujar();
  }

  // Campos de texto, fecha y nota: actualizan el estado sin redibujar.
  function alEscribir(ev) {
    const ruta = ev.target.dataset.campo;
    if (ruta) escribir(estado, ruta, ev.target.value);
  }

  contenedor.addEventListener("click", alHacerClick);
  contenedor.addEventListener("input", alEscribir);
  dibujar();

  // Devuelve una función para desmontar el formulario.
  return () => {
    contenedor.removeEventListener("click", alHacerClick);
    contenedor.removeEventListener("input", alEscribir);
  };
}
