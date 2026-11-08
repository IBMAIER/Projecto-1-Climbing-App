// app.js: arranque de la app y navegación entre pantallas.
//
// Flujo:
//   1. Se registra el service worker (uso sin señal).
//   2. db.iniciar() avisa quién es el usuario (evento de login).
//   3. Con usuario, se escuchan las sesiones; cada cambio redibuja la pantalla.
//   4. La pantalla visible depende del "hash" de la URL:
//        #hoy, #registrar[/tipo[/fecha]], #calendario, #plan[/nuevo|/<id>],
//        #estadisticas, #historial, #editar/<id>
//      Cambiar el hash dispara el evento hashchange.
//
// Cada pantalla es una función mostrarX(contenedor, ...) que devuelve otra
// función para "desmontarla" (quitar sus oyentes) al cambiar de pantalla.

import * as db from "./db.js";
import { crearFormulario } from "./formularios.js";
import { mostrarCalendario, elegirDia } from "./calendario.js";
import { mostrarEstadisticas } from "./estadisticas.js";
import { mostrarPlanes, crearEditorPlan } from "./planes.js";
import {
  PLANTILLAS, normalizar, esEscalada, intensidad, planDelDia,
  hoyISO, lunesDe, sumarDias, formatoFecha,
} from "./calculos.js";
import { esc, tarjetaSesion, nombreSesion, detallePlan } from "./ui.js";

const $ = (sel) => document.querySelector(sel);
const vista = $("#vista");

let usuario = null;
let sesiones = [];
let planes = [];
let dejarDeEscuchar = null;
let desmontar = null;
let filtroHistorial = "todos";

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

export const VERSION_APP = "v8";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((reg) => reg.update())
    .catch((e) => console.warn("Service worker:", e));

  // Cuando se instala una versión nueva, recargar una vez para usarla.
  let recargando = false;
  const habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaControlador || recargando) return;
    recargando = true;
    location.reload();
  });
}

db.iniciar(alCambiarUsuario).catch((e) => {
  console.error(e);
  vista.innerHTML = `<div class="tarjeta aviso">No se pudo conectar con Firebase. Revisa tu conexión y recarga.</div>`;
});

window.addEventListener("hashchange", mostrarPantalla);

// Indicador de sincronización en la cabecera.
db.alCambiarEstado((e) => {
  const el = $("#sync");
  if (!el) return;
  let texto, clase, titulo;
  if (e.modoLocal) [texto, clase, titulo] = ["● Solo este dispositivo", "local", "Modo local: los datos no se sincronizan"];
  else if (e.error) [texto, clase, titulo] = ["● Error al sincronizar", "error", e.error];
  else if (e.pendientes) [texto, clase, titulo] = ["● Pendiente de subir", "pendiente", "Hay cambios guardados aquí que subirán cuando haya conexión"];
  else if (e.sinConexion) [texto, clase, titulo] = ["● Sin conexión", "pendiente", "Mostrando la copia guardada en este dispositivo"];
  else [texto, clase, titulo] = ["● Sincronizado", "ok", "Tus datos están al día con la nube"];
  el.textContent = texto;
  el.className = `sync ${clase}`;
  el.title = titulo;
  if (e.error) {
    const aviso = $("#aviso-error");
    aviso.hidden = false;
    aviso.textContent = `No se pudo sincronizar con la nube (${e.error}). Revisa tu conexión o las reglas de Firestore.`;
  } else {
    $("#aviso-error").hidden = true;
  }
});

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-app]");
  if (!b) return;
  const accion = b.dataset.app;
  if (accion === "entrar") db.entrar().catch((e) => alert("No se pudo iniciar sesión: " + e.message));
  if (accion === "salir") db.salir();
  if (accion === "subir-locales") {
    db.subirDatosLocales();
    mostrarPantalla();
  }
  if (accion === "filtro") {
    filtroHistorial = b.dataset.valor;
    mostrarPantalla();
  }
});

function alCambiarUsuario(u) {
  usuario = u;
  if (dejarDeEscuchar) dejarDeEscuchar();
  dejarDeEscuchar = null;
  sesiones = [];
  planes = [];

  document.body.classList.toggle("sin-usuario", !u);
  $("#usuario").innerHTML = u
    ? `${esc(u.nombre || u.email)}${db.modoLocal ? "" : ` · <button class="link" data-app="salir">Salir</button>`}`
    : "";
  $("#version").textContent = VERSION_APP;
  $("#aviso-local").hidden = !db.modoLocal;

  if (!u) {
    mostrarLogin();
    return;
  }

  // Evento: cada vez que cambian las sesiones o los planes se actualiza la
  // pantalla (salvo los editores, para no borrar lo que estás escribiendo).
  const alError = (err) => {
    const msg = err.code === "permission-denied"
      ? `La cuenta ${esc(u.email)} no tiene permiso para usar esta app.`
      : `No se pudieron cargar los datos (${esc(err.code || err.message)}).`;
    vista.innerHTML = `<div class="tarjeta aviso">${msg}</div>
      <button class="secundario" data-app="salir">Cambiar de cuenta</button>`;
  };
  const refrescar = () => {
    const p = pantallaActual();
    const editando = p.startsWith("registrar") || p.startsWith("editar") || p.startsWith("plan/");
    if (!editando) mostrarPantalla();
  };
  const parar1 = db.escucharSesiones((lista) => {
    sesiones = lista.map(normalizar);
    refrescar();
  }, alError);
  const parar2 = db.escucharPlanes((lista) => {
    planes = lista;
    refrescar();
  }, alError);
  dejarDeEscuchar = () => {
    parar1();
    parar2();
  };
  mostrarPantalla();
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

function pantallaActual() {
  return decodeURIComponent(location.hash.slice(1)) || "hoy";
}

function ir(pantalla) {
  if (pantallaActual() === pantalla) mostrarPantalla();
  else location.hash = pantalla;
}

function mostrarPantalla() {
  if (!usuario) return;
  if (desmontar) {
    desmontar();
    desmontar = null;
  }

  const p = pantallaActual();
  const [nombre, ...partes] = p.split("/");
  document.querySelectorAll("nav a").forEach((a) => {
    a.classList.toggle("activo", a.getAttribute("href").slice(1) === nombre);
  });

  switch (nombre) {
    case "registrar":
      return mostrarFormulario({ tipo: partes[0], fecha: partes[1] });
    case "editar": {
      const s = sesiones.find((x) => x.id === partes[0]);
      return s ? mostrarFormulario({ sesion: s }) : ir("historial");
    }
    case "calendario":
      desmontar = mostrarCalendario(vista, sesiones, planes);
      return;
    case "plan": {
      if (!partes[0]) {
        desmontar = mostrarPlanes(vista, planes);
        return;
      }
      const plan = partes[0] === "nuevo" ? null : planes.find((x) => x.id === partes[0]);
      if (partes[0] !== "nuevo" && !plan) return ir("plan");
      window.scrollTo(0, 0);
      desmontar = crearEditorPlan(vista, {
        plan,
        planes,
        alGuardar(datos) {
          db.guardarPlan(datos);
          ir("plan");
        },
        alCancelar() {
          ir("plan");
        },
        alBorrar(id) {
          db.borrarPlan(id);
          ir("plan");
        },
      });
      return;
    }
    case "estadisticas":
      desmontar = mostrarEstadisticas(vista, sesiones);
      return;
    case "historial":
      return mostrarHistorial();
    default:
      return mostrarHoy();
  }
}

// ---------------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------------

function mostrarLogin() {
  vista.innerHTML = `
    <div class="login">
      <h1>🧗 Bitácora de escalada</h1>
      <p>Registra tus sesiones y sigue tu intensidad.</p>
      <button class="primario grande" data-app="entrar">Entrar con Google</button>
    </div>`;
}

function mostrarHoy() {
  const hoy = hoyISO();
  const estaSemana = lunesDe(hoy);
  const semanaPasada = sumarDias(estaSemana, -7);

  const deSemana = (lunes) => sesiones.filter((s) => lunesDe(s.fecha) === lunes);
  const sumaIntensidad = (lista) => Math.round(lista.reduce((t, s) => t + (intensidad(s) || 0), 0));
  const semana = deSemana(estaSemana);
  const diasEscalada = new Set(semana.filter(esEscalada).map((s) => s.fecha)).size;

  const hechasHoy = sesiones.filter((s) => s.fecha === hoy);
  const pd = planDelDia(hoy, planes);
  const plan = pd?.tipos || [];

  const avisos = [];
  const ultima = sesiones.find((s) => s.codo != null || s.codoDiaSiguiente != null);
  if (ultima && (ultima.codo > 3 || ultima.codoDiaSiguiente > 3)) {
    avisos.push(`El codo pasó de 3/10 en tu última sesión (${formatoFecha(ultima.fecha)}). Considera bajar un paso y sumar un día de descanso.`);
  }
  const pendientes = sesiones
    .filter((s) => s.fecha < hoy && s.codoDiaSiguiente == null && esEscalada(s))
    .slice(0, 3);

  let bloqueHoy;
  if (hechasHoy.length) {
    bloqueHoy = `<div class="tarjeta plan"><small>Hoy registraste</small>
      <b>${hechasHoy.map((s) => `${nombreSesion(s).icono} ${nombreSesion(s).nombre}`).join(" + ")}</b></div>
      <a class="boton secundario grande" href="#registrar">+ Registrar otra sesión</a>`;
  } else if (!pd) {
    bloqueHoy = `<div class="tarjeta plan"><small>Sin plan para hoy</small>
        <b>Crea un plan para ver qué toca cada día</b></div>
      <a class="boton secundario ancho" href="#plan/nuevo">+ Crear plan</a>
      <a class="boton primario grande" href="#registrar">+ Registrar sesión</a>`;
  } else if (plan.length) {
    bloqueHoy = `<div class="tarjeta plan"><small>Hoy toca</small>
        <b>${plan.map((t) => PLANTILLAS[t].nombre).join(" o ")}</b></div>
      ${plan.map((t) => `<a class="boton primario grande" href="#registrar/${t}">${PLANTILLAS[t].icono} Registrar ${PLANTILLAS[t].nombre}</a>`).join("")}
      <a class="boton secundario ancho" href="#registrar">Registrar otra sesión</a>`;
  } else {
    bloqueHoy = `<div class="tarjeta plan"><small>Hoy toca</small><b>Descanso</b></div>
      <a class="boton secundario grande" href="#registrar">+ Registrar sesión</a>`;
  }

  vista.innerHTML = `
    <p class="fecha-hoy">${formatoFecha(hoy, { weekday: "long", day: "numeric", month: "long" })}</p>
    ${pd ? `<p class="info-plan"><a href="#plan/${pd.plan.id}">${esc(pd.plan.nombre || "Plan")}</a> · semana ${pd.semana} de ${pd.plan.semanas}${
      pd.descarga ? " · <b>semana de descarga</b>: volumen a la mitad, sin ir al límite" : ""}</p>` : ""}
    ${bloqueHoy}

    ${(() => {
      const loc = db.datosLocales();
      if (!loc.sesiones && !loc.planes) return "";
      return `<div class="tarjeta aviso">📱 En este dispositivo hay ${loc.sesiones} sesiones y ${loc.planes} planes
        guardados en <b>modo local</b> (de antes de conectar la nube). No se ven en tus otros dispositivos.
        <button class="primario ancho" data-app="subir-locales" style="margin-top:8px">Subirlos a mi cuenta</button></div>`;
    })()}
    ${avisos.map((a) => `<div class="tarjeta aviso">⚠️ ${a}</div>`).join("")}

    ${pendientes.length ? `
      <div class="tarjeta">
        <b>Anota el codo del día siguiente</b>
        ${pendientes.map((s) => `<a class="fila-link" href="#editar/${s.id}">
          ${nombreSesion(s).icono} ${nombreSesion(s).nombre} · ${formatoFecha(s.fecha)} →</a>`).join("")}
      </div>` : ""}

    <h3>Esta semana</h3>
    <div class="estadisticas">
      <div><small>Sesiones</small><b>${semana.length}</b></div>
      <div><small>Días de escalada</small><b>${diasEscalada}</b></div>
      <div><small>Intensidad</small><b>${sumaIntensidad(semana)}</b></div>
      <div><small>Semana pasada</small><b>${sumaIntensidad(deSemana(semanaPasada))}</b></div>
    </div>

    ${!hechasHoy.length && plan.length === 1 ? `<h3>Plan de hoy</h3>${detallePlan(plan[0], hoy)}` : ""}

    <h3>Últimas sesiones</h3>
    ${sesiones.length ? sesiones.slice(0, 3).map(tarjetaSesion).join("") : `<p class="vacio">Aún no registras sesiones.</p>`}
  `;
  window.scrollTo(0, 0);
}

function mostrarHistorial() {
  const filtradas = filtroHistorial === "todos" ? sesiones : sesiones.filter((s) => s.tipo === filtroHistorial);

  const semanas = new Map();
  for (const s of filtradas) {
    const lunes = lunesDe(s.fecha);
    if (!semanas.has(lunes)) semanas.set(lunes, []);
    semanas.get(lunes).push(s);
  }

  const filtros = [["todos", "Todas"], ...Object.entries(PLANTILLAS).map(([k, p]) => [k, p.nombre])];

  vista.innerHTML = `
    <h2>Historial</h2>
    <div class="chips filtros">
      ${filtros.map(([k, t]) => `<button class="chip ${filtroHistorial === k ? "activo" : ""}"
        data-app="filtro" data-valor="${k}">${t}</button>`).join("")}
    </div>
    ${semanas.size ? [...semanas].map(([lunes, lista]) => `
      <div class="semana">
        <div class="semana-cabecera">
          <span>Semana del ${formatoFecha(lunes, { day: "numeric", month: "short" })}</span>
          <span>${lista.length} ses. · intensidad ${Math.round(lista.reduce((t, s) => t + (intensidad(s) || 0), 0))}</span>
        </div>
        ${lista.map(tarjetaSesion).join("")}
      </div>`).join("") : `<p class="vacio">No hay sesiones${filtroHistorial === "todos" ? "" : " de este tipo"}.</p>`}
  `;
}

function mostrarFormulario({ sesion, tipo, fecha }) {
  window.scrollTo(0, 0);
  desmontar = crearFormulario(vista, {
    sesion,
    sesiones,
    tipo: tipo || null,
    fecha: fecha || null,
    alGuardar(datos) {
      db.guardarSesion(datos);
      elegirDia(datos.fecha);
      ir("calendario");
    },
    alCancelar() {
      history.length > 1 ? history.back() : ir("hoy");
    },
    alBorrar(id) {
      db.borrarSesion(id);
      ir("calendario");
    },
  });
}
