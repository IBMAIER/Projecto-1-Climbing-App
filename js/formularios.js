// formularios.js: pantalla "Registrar sesión", armada por bloques.
//
// Cómo funciona:
//   - `estado` es la sesión que se está editando: datos generales + una lista
//     de bloques (calentamiento, dedos, board, ...).
//   - dibujar() genera el HTML a partir de `estado`.
//   - Los botones tienen atributos data-accion / data-campo. Un solo oyente de
//     clicks lee esos atributos, modifica `estado` y vuelve a dibujar.
//   - Los campos de texto actualizan `estado` sin redibujar (para no perder
//     el cursor mientras escribes).

import {
  GRADOS, VIAS, LARGO_VIA_DEFECTO, descomponerVia, ESTILOS, FISICO, TIPOS_BLOQUE, PLANTILLAS, PARTES_CALENTAMIENTO,
  hoyISO, intensidad, intensidadBloque, totalBloques, totalVias, gradoMaximo, viaMaxima,
  duracionTotal,
} from "./calculos.js";
import { esc, RESULTADOS } from "./ui.js";

const DESMARCABLES = /^(resultado|codo|codoDiaSiguiente|esfuerzo|bloques\.\d+\.(gradoTrabajado|boardMax))$/;

function copia(x) {
  return JSON.parse(JSON.stringify(x));
}

function nuevoId() {
  return Math.random().toString(36).slice(2, 9);
}

// ---------------------------------------------------------------------------
// Valores iniciales de cada bloque: parten desde el último bloque del mismo
// tipo, para que registrar tome pocos toques.
// ---------------------------------------------------------------------------

function ultimoBloque(sesiones, tipo, filtro = () => true) {
  for (const s of sesiones) {
    const b = (s.bloques || []).find((x) => x.tipo === tipo && filtro(x));
    if (b) return b;
  }
  return null;
}

export function bloqueNuevo(tipo, sesiones, extra = {}) {
  const base = { id: nuevoId(), tipo, duracionMin: TIPOS_BLOQUE[tipo].duracion, nota: "" };
  const prev = ultimoBloque(sesiones, tipo) || {};

  switch (tipo) {
    case "calentamiento":
      return { ...base, partes: PARTES_CALENTAMIENTO.map(([k]) => k) };
    case "dedos":
      return {
        ...base,
        duracionMin: prev.duracionMin ?? base.duracionMin,
        regletaMm: prev.regletaMm ?? 20,
        series: prev.series?.length
          ? copia(prev.series)
          : [
              { agarre: "half_crimp", kg: 20, seg: 10, margenSeg: 3 },
              { agarre: "pinza", kg: 20, seg: 10, margenSeg: 3 },
            ],
      };
    case "board":
      return { ...base, tablero: prev.tablero || "Kilter", angulo: prev.angulo ?? 40, grados: {}, gradoTrabajado: null };
    case "boulder":
      return { ...base, grados: {}, estilos: [], proyecto: prev.proyecto || "", avance: "" };
    case "resistencia":
      return {
        ...base,
        formato: prev.formato || "4x4",
        rondas: prev.rondas ?? 4,
        descansoMin: prev.descansoMin ?? 4,
        caidas: 0,
        grados: {},
        vias: {},
        largoM: prev.largoM ?? LARGO_VIA_DEFECTO,
      };
    case "vias":
      return { ...base, lugar: prev.lugar || "", vias: {}, largoM: prev.largoM ?? LARGO_VIA_DEFECTO };
    case "roca":
      return { ...base, lugar: "", grados: {}, vias: {}, largoM: prev.largoM ?? LARGO_VIA_DEFECTO };
    case "fisico": {
      const ultimoFisico = ultimoBloque(sesiones, "fisico");
      const variante = extra.variante || (ultimoFisico?.variante === "A" ? "B" : "A");
      return bloqueFisico(variante, sesiones, base);
    }
    case "test": {
      const t = prev;
      return {
        ...base,
        regletaMm: t.regletaMm ?? 20,
        halfCrimpKg: t.halfCrimpKg ?? 20,
        pinzaKg: t.pinzaKg ?? 20,
        boardMax: null,
        boardAngulo: t.boardAngulo ?? 40,
        pesoCorporal: t.pesoCorporal ?? null,
      };
    }
    default:
      return { ...base, nombre: "" };
  }
}

function bloqueFisico(variante, sesiones, base) {
  const prev = ultimoBloque(sesiones, "fisico", (b) => b.variante === variante);
  return {
    ...base,
    variante,
    troteMin: prev?.troteMin ?? 20,
    ejercicios: prev?.ejercicios?.length
      ? copia(prev.ejercicios)
      : FISICO[variante].map((e) => ({ ...e, ejercicio: "", peso: 0 })),
  };
}

function sesionDesdePlantilla(tipo, fecha, sesiones) {
  return {
    tipo,
    fecha: fecha || hoyISO(),
    resultado: null,
    codo: null,
    codoDiaSiguiente: null,
    esfuerzo: null,
    nota: "",
    bloques: PLANTILLAS[tipo].bloques.map((b) => bloqueNuevo(b.tipo, sesiones, b)),
  };
}

// ---------------------------------------------------------------------------
// Leer y escribir campos con rutas tipo "bloques.1.series.0.kg"
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
// Piezas de interfaz
// ---------------------------------------------------------------------------

function campo(etiqueta, contenido, extra = "") {
  return `<div class="campo ${extra}"><span class="etiqueta">${etiqueta}</span>${contenido}</div>`;
}

// Botones para elegir una opción. lista = [[valor, texto], ...]
function opciones(ruta, lista, actual, num = false) {
  return `<div class="chips">${lista
    .map(([v, t]) => `<button type="button" class="chip ${actual === v ? "activo" : ""}"
      data-accion="elegir" data-campo="${ruta}" data-valor="${esc(v)}" ${num ? "data-num" : ""}>${esc(t)}</button>`)
    .join("")}</div>`;
}

function escala(ruta, min, max, actual) {
  const lista = [];
  for (let i = min; i <= max; i++) lista.push([i, String(i)]);
  return `<div class="escala">${opciones(ruta, lista, actual, true)}</div>`;
}

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

function alternables(ruta, lista, actuales) {
  return `<div class="chips">${lista.map(([v, t]) => `<button type="button"
    class="chip ${actuales.includes(v) ? "activo" : ""}" data-accion="alternar"
    data-campo="${ruta}" data-valor="${esc(v)}">${esc(t)}</button>`).join("")}</div>`;
}

// Cuadrícula de conteo: toca para sumar, − para restar.
function cuadricula(ruta, conteos, items, etiqueta) {
  const celdas = items.map(({ clave, titulo, sub }) => {
    const n = conteos[clave] || 0;
    return `<div class="celda-grado ${n ? "con-bloques" : ""}">
      <button type="button" class="mas" data-accion="contar" data-campo="${ruta}" data-clave="${clave}" data-delta="1">
        <strong>${titulo}</strong>${sub ? `<small>${sub}</small>` : ""}<span>${n || ""}</span>
      </button>
      <button type="button" class="menos" data-accion="contar" data-campo="${ruta}" data-clave="${clave}" data-delta="-1" ${n ? "" : "disabled"}>−</button>
    </div>`;
  }).join("");
  return campo(`${etiqueta} <small>(toca para sumar)</small>`, `<div class="grados">${celdas}</div>`);
}

const ITEMS_GRADOS = GRADOS.map((g) => ({ clave: g, titulo: g }));
const ITEMS_VIAS = VIAS.map((x) => ({ clave: x.yds, titulo: x.yds, sub: x.fr }));

function gradosBoulder(i, b, etiqueta = "Bloques encadenados por grado") {
  return cuadricula(`bloques.${i}.grados`, b.grados, ITEMS_GRADOS, etiqueta);
}

function gradosVias(i, b, etiqueta = "Vías encadenadas por grado") {
  const largo = b.largoM ?? LARGO_VIA_DEFECTO;
  const max = viaMaxima(b);
  const ejemplo = max ? descomponerVia(max, largo) : null;
  return campo("Largo típico de las vías", contador(`bloques.${i}.largoM`, largo, 5, " m", 5)) +
    (ejemplo ? `<p class="pista">Cada ${max} de ${largo} m ≈ ${ejemplo.texto} (intensidad ${ejemplo.intensidad}).</p>` : "") +
    cuadricula(`bloques.${i}.vias`, b.vias, ITEMS_VIAS, etiqueta);
}

function resumenGrados(b) {
  const cifras = [];
  if (b.grados) cifras.push(["Bloques", totalBloques(b)], ["Máx", gradoMaximo(b) || "—"]);
  if (b.vias && totalVias(b)) cifras.push(["Vías", totalVias(b)], ["Vía máx", viaMaxima(b) || "—"]);
  cifras.push(["Intensidad", intensidadBloque(b) ?? 0]);
  return `<div class="resumen-intensidad">${cifras.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------------------
// Campos de cada tipo de bloque
// ---------------------------------------------------------------------------

const camposBloque = {
  calentamiento(b, i) {
    return campo("Qué hiciste", alternables(`bloques.${i}.partes`, PARTES_CALENTAMIENTO, b.partes));
  },

  dedos(b, i) {
    const filas = b.series.map((s, j) => `
      <div class="serie">
        <div class="serie-cabecera">
          <b>Serie ${j + 1}</b>
          <button type="button" class="link peligro" data-accion="quitar-serie" data-bloque="${i}" data-indice="${j}">Quitar</button>
        </div>
        ${opciones(`bloques.${i}.series.${j}.agarre`, [["half_crimp", "Half crimp"], ["pinza", "Pinza"]], s.agarre)}
        <div class="fila-contadores">
          ${campo("Kg", contador(`bloques.${i}.series.${j}.kg`, s.kg, 1, " kg", -100))}
          ${campo("Segundos", contador(`bloques.${i}.series.${j}.seg`, s.seg, 1, " s"))}
          ${campo("Margen", contador(`bloques.${i}.series.${j}.margenSeg`, s.margenSeg, 1, " s"))}
        </div>
      </div>`).join("");
    return campo("Regleta", contador(`bloques.${i}.regletaMm`, b.regletaMm, 1, " mm")) +
      `<div class="campo"><span class="etiqueta">Series</span>${filas}
        <button type="button" class="secundario" data-accion="agregar-serie" data-bloque="${i}">+ Agregar serie</button></div>`;
  },

  board(b, i) {
    return campo("Tablero", opciones(`bloques.${i}.tablero`, [["Kilter", "Kilter"], ["Tension", "Tension"]], b.tablero)) +
      campo("Ángulo", contador(`bloques.${i}.angulo`, b.angulo, 5, "°")) +
      gradosBoulder(i, b) + resumenGrados(b) +
      campo("Grado trabajado sin encadenar <small>(opcional)</small>",
        opciones(`bloques.${i}.gradoTrabajado`, GRADOS.slice(3).map((g) => [g, g]), b.gradoTrabajado));
  },

  boulder(b, i) {
    return gradosBoulder(i, b) + resumenGrados(b) +
      campo(`Estilos tocados <small>(${b.estilos.length}; objetivo 3 o más)</small>`,
        alternables(`bloques.${i}.estilos`, ESTILOS.map((e) => [e, e]), b.estilos)) +
      campo("Proyecto <small>(opcional)</small>", texto(`bloques.${i}.proyecto`, b.proyecto, "Nombre del bloque")) +
      campo("Avance <small>(opcional)</small>", texto(`bloques.${i}.avance`, b.avance, "Ej: saqué todos los movimientos"));
  },

  resistencia(b, i) {
    const enVias = b.formato === "vias";
    return campo("Formato", opciones(`bloques.${i}.formato`,
        [["4x4", "4x4"], ["intervalos", "Intervalos"], ["vias", "Vías"]], b.formato)) +
      `<div class="fila-contadores">
        ${campo("Rondas", contador(`bloques.${i}.rondas`, b.rondas))}
        ${campo("Descanso", contador(`bloques.${i}.descansoMin`, b.descansoMin, 1, " min"))}
        ${campo("Caídas", contador(`bloques.${i}.caidas`, b.caidas))}
      </div>` +
      (enVias ? gradosVias(i, b, "Vías completadas por grado") : gradosBoulder(i, b, "Bloques completados por grado")) +
      resumenGrados(b);
  },

  vias(b, i) {
    return campo("Lugar <small>(opcional)</small>", texto(`bloques.${i}.lugar`, b.lugar, "Gimnasio o sector")) +
      gradosVias(i, b) + resumenGrados(b);
  },

  roca(b, i) {
    return campo("Lugar", texto(`bloques.${i}.lugar`, b.lugar, "Ej: Las Chilcas")) +
      gradosBoulder(i, b, "Bloques encadenados") +
      gradosVias(i, b, "Vías encadenadas") + resumenGrados(b);
  },

  fisico(b, i) {
    const filas = b.ejercicios.map((x, j) => `
      <div class="serie">
        <b>${esc(x.grupo)}</b>
        ${texto(`bloques.${i}.ejercicios.${j}.ejercicio`, x.ejercicio, "Ejercicio (opcional)")}
        <div class="fila-contadores">
          ${campo("Peso", contador(`bloques.${i}.ejercicios.${j}.peso`, x.peso, 2.5, " kg"))}
          ${campo("Series", contador(`bloques.${i}.ejercicios.${j}.series`, x.series))}
          ${campo("Reps", contador(`bloques.${i}.ejercicios.${j}.reps`, x.reps))}
        </div>
      </div>`).join("");
    return campo("Rutina", opciones(`bloques.${i}.variante`, [["A", "Físico A"], ["B", "Físico B"]], b.variante)) +
      campo("Trote suave", contador(`bloques.${i}.troteMin`, b.troteMin, 5, " min")) +
      `<div class="campo"><span class="etiqueta">Ejercicios</span>${filas}</div>`;
  },

  test(b, i) {
    return `<div class="fila-contadores">
        ${campo("Regleta", contador(`bloques.${i}.regletaMm`, b.regletaMm, 1, " mm"))}
        ${campo("Half crimp 10 s", contador(`bloques.${i}.halfCrimpKg`, b.halfCrimpKg, 1, " kg", -100))}
        ${campo("Pinza máx", contador(`bloques.${i}.pinzaKg`, b.pinzaKg, 1, " kg", -100))}
      </div>` +
      campo("Grado máximo en board", opciones(`bloques.${i}.boardMax`, GRADOS.slice(3).map((g) => [g, g]), b.boardMax)) +
      `<div class="fila-contadores">
        ${campo("Ángulo board", contador(`bloques.${i}.boardAngulo`, b.boardAngulo, 5, "°"))}
        ${campo("Peso corporal <small>(opcional)</small>", contador(`bloques.${i}.pesoCorporal`, b.pesoCorporal, 0.5, " kg"))}
      </div>`;
  },

  otro(b, i) {
    return campo("Qué hiciste", texto(`bloques.${i}.nombre`, b.nombre, "Ej: antagonistas, yoga, técnica"));
  },
};

function tarjetaBloque(b, i, total) {
  const t = TIPOS_BLOQUE[b.tipo];
  return `<section class="bloque">
    <div class="bloque-cabecera">
      <b>${t.icono} ${t.nombre}</b>
      <span class="bloque-acciones">
        <button type="button" class="mini" data-accion="mover" data-bloque="${i}" data-delta="-1" ${i ? "" : "disabled"} aria-label="Subir">↑</button>
        <button type="button" class="mini" data-accion="mover" data-bloque="${i}" data-delta="1" ${i < total - 1 ? "" : "disabled"} aria-label="Bajar">↓</button>
        <button type="button" class="mini peligro" data-accion="quitar-bloque" data-bloque="${i}" aria-label="Quitar">✕</button>
      </span>
    </div>
    ${t.pista ? `<p class="pista">${esc(t.pista)}</p>` : ""}
    ${campo("Duración", contador(`bloques.${i}.duracionMin`, b.duracionMin, 5, " min"))}
    ${camposBloque[b.tipo](b, i)}
    ${campo("Nota del bloque <small>(opcional)</small>", texto(`bloques.${i}.nota`, b.nota, ""))}
  </section>`;
}

// ---------------------------------------------------------------------------
// Formulario completo
// ---------------------------------------------------------------------------

export function crearFormulario(contenedor, { sesion, sesiones, tipo, fecha, alGuardar, alCancelar, alBorrar }) {
  let estado = sesion ? copia(sesion) : tipo && PLANTILLAS[tipo] ? sesionDesdePlantilla(tipo, fecha, sesiones) : null;
  let fechaElegida = fecha;
  let menuAbierto = false;

  function dibujar() {
    if (!estado) {
      contenedor.innerHTML = `
        <h2>¿Qué día hiciste?</h2>
        <p class="ayuda">Elige un día prediseñado; después puedes agregar o quitar bloques.</p>
        <div class="tipos">
          ${Object.entries(PLANTILLAS).map(([k, p]) => `
            <button type="button" class="tipo" data-accion="plantilla" data-valor="${k}">
              <span class="icono">${p.icono}</span>${p.nombre}
              <small>${p.bloques.map((b) => TIPOS_BLOQUE[b.tipo].nombre).join(" + ") || "Armar desde cero"}</small>
            </button>`).join("")}
        </div>
        <button type="button" class="secundario" data-accion="cancelar">Cancelar</button>`;
      return;
    }

    const p = PLANTILLAS[estado.tipo] || PLANTILLAS.libre;
    const inten = intensidad(estado);
    contenedor.innerHTML = `
      <div class="cabecera-form">
        <h2>${p.icono} ${p.nombre}</h2>
        ${estado.id ? "" : `<button type="button" class="link" data-accion="cambiar-plantilla">Cambiar día</button>`}
      </div>
      ${p.objetivo ? `<div class="objetivo">
        <div><small>Objetivo</small> ${esc(p.objetivo)}</div>
        ${p.criterio ? `<div><small>Lo cumpliste si</small> ${esc(p.criterio)}</div>` : ""}
      </div>` : ""}
      ${campo("Fecha", texto("fecha", estado.fecha, "", "date"))}

      <div class="resumen-dia">
        <span>${estado.bloques.length} bloques</span>
        <span>${duracionTotal(estado)} min</span>
        <span>Intensidad <b>${inten ?? 0}</b></span>
      </div>

      ${estado.bloques.map((b, i) => tarjetaBloque(b, i, estado.bloques.length)).join("")}

      <div class="agregar-bloque">
        <button type="button" class="secundario ancho" data-accion="menu-bloques">+ Agregar bloque</button>
        ${menuAbierto ? `<div class="chips menu-bloques">
          ${Object.entries(TIPOS_BLOQUE).map(([k, t]) =>
            `<button type="button" class="chip" data-accion="agregar-bloque" data-valor="${k}">${t.icono} ${t.nombre}</button>`).join("")}
        </div>` : ""}
      </div>

      <h3>Cierre</h3>
      ${campo("¿Cumpliste el objetivo?", opciones("resultado", Object.entries(RESULTADOS), estado.resultado))}
      ${campo("Dolor de codo durante la sesión (0-10)", escala("codo", 0, 10, estado.codo))}
      ${campo("Dolor de codo al día siguiente <small>(puedes completarlo mañana)</small>",
        escala("codoDiaSiguiente", 0, 10, estado.codoDiaSiguiente))}
      ${campo("Esfuerzo percibido (1-10)", escala("esfuerzo", 1, 10, estado.esfuerzo))}
      ${campo("Nota <small>(opcional)</small>", `<textarea data-campo="nota" rows="2" placeholder="Cómo te sentiste, qué funcionó...">${esc(estado.nota)}</textarea>`)}

      <div class="acciones">
        <button type="button" class="primario" data-accion="guardar">Guardar</button>
        <button type="button" class="secundario" data-accion="cancelar">Cancelar</button>
        ${estado.id ? `<button type="button" class="link peligro" data-accion="borrar">Borrar sesión</button>` : ""}
      </div>`;
  }

  function alHacerClick(ev) {
    const b = ev.target.closest("[data-accion]");
    if (!b || !contenedor.contains(b)) return;
    const { accion, campo: ruta, valor } = b.dataset;
    const iBloque = Number(b.dataset.bloque);

    switch (accion) {
      case "plantilla":
        estado = sesionDesdePlantilla(valor, fechaElegida, sesiones);
        window.scrollTo(0, 0);
        break;
      case "cambiar-plantilla":
        fechaElegida = estado.fecha;
        estado = null;
        break;
      case "elegir": {
        const v = "num" in b.dataset ? Number(valor) : valor;
        const desmarcar = DESMARCABLES.test(ruta) && leer(estado, ruta) === v;
        escribir(estado, ruta, desmarcar ? null : v);
        // Cambiar rutina A/B recarga los ejercicios de esa rutina.
        const m = ruta.match(/^bloques\.(\d+)\.variante$/);
        if (m) {
          const viejo = estado.bloques[m[1]];
          estado.bloques[m[1]] = bloqueFisico(v, sesiones, { id: viejo.id, tipo: "fisico", duracionMin: viejo.duracionMin, nota: viejo.nota });
        }
        break;
      }
      case "sumar": {
        const nuevo = (Number(leer(estado, ruta)) || 0) + Number(b.dataset.delta);
        escribir(estado, ruta, Math.max(Number(b.dataset.min), nuevo));
        break;
      }
      case "contar": {
        const conteos = leer(estado, ruta);
        const k = b.dataset.clave;
        const n = Math.max(0, (conteos[k] || 0) + Number(b.dataset.delta));
        if (n) conteos[k] = n;
        else delete conteos[k];
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
        const series = estado.bloques[iBloque].series;
        series.push(copia(series[series.length - 1] || { agarre: "half_crimp", kg: 20, seg: 10, margenSeg: 3 }));
        break;
      }
      case "quitar-serie":
        estado.bloques[iBloque].series.splice(Number(b.dataset.indice), 1);
        break;
      case "menu-bloques":
        menuAbierto = !menuAbierto;
        break;
      case "agregar-bloque":
        estado.bloques.push(bloqueNuevo(valor, sesiones));
        menuAbierto = false;
        break;
      case "quitar-bloque": {
        const nombre = TIPOS_BLOQUE[estado.bloques[iBloque].tipo].nombre;
        if (!confirm(`¿Quitar el bloque "${nombre}"?`)) return;
        estado.bloques.splice(iBloque, 1);
        break;
      }
      case "mover": {
        const j = iBloque + Number(b.dataset.delta);
        const lista = estado.bloques;
        [lista[iBloque], lista[j]] = [lista[j], lista[iBloque]];
        break;
      }
      case "guardar":
        estado.duracionMin = duracionTotal(estado);
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

  function alEscribir(ev) {
    const ruta = ev.target.dataset.campo;
    if (ruta) escribir(estado, ruta, ev.target.value);
  }

  contenedor.addEventListener("click", alHacerClick);
  contenedor.addEventListener("input", alEscribir);
  dibujar();

  return () => {
    contenedor.removeEventListener("click", alHacerClick);
    contenedor.removeEventListener("input", alEscribir);
  };
}

