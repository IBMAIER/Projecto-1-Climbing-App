// db.js: el ÚNICO archivo que habla con la base de datos.
//
// El resto de la app solo usa estas funciones:
//   iniciar(alCambiarUsuario)   avisa cuando alguien inicia o cierra sesión
//   entrar() / salir()          login y logout con Google
//   escucharSesiones(callback)  entrega las sesiones cada vez que cambian
//   guardarSesion(sesion)       crea o actualiza (si trae id)
//   borrarSesion(id)
//   escucharPlanes / guardarPlan / borrarPlan   lo mismo para los planes
//
// Hay dos implementaciones con la misma interfaz:
//   - Firebase (Auth + Firestore con copia local para usar sin señal)
//   - Modo local (localStorage), cuando js/config.js no tiene apiKey

import { firebaseConfig } from "./config.js";

export const modoLocal = !firebaseConfig.apiKey;

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

let fb = null;       // módulos de Firebase, cargados solo si se usan
let auth = null;
let firestore = null;
let usuario = null;  // { uid, nombre, email }

// ---------------------------------------------------------------------------
// Inicio y sesión de usuario
// ---------------------------------------------------------------------------

export async function iniciar(alCambiarUsuario) {
  if (modoLocal) {
    usuario = { uid: "local", nombre: "Modo local", email: "" };
    alCambiarUsuario(usuario);
    return;
  }

  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  fb = { ...appMod, ...authMod, ...fsMod };

  const app = fb.initializeApp(firebaseConfig);
  auth = fb.getAuth(app);

  // Copia local persistente: permite leer y escribir sin señal.
  firestore = fb.initializeFirestore(app, {
    localCache: fb.persistentLocalCache({
      tabManager: fb.persistentMultipleTabManager(),
    }),
  });

  // Evento: Firebase avisa cada vez que cambia el usuario (también al abrir).
  fb.onAuthStateChanged(auth, (u) => {
    usuario = u ? { uid: u.uid, nombre: u.displayName, email: u.email } : null;
    alCambiarUsuario(usuario);
  });
}

export async function entrar() {
  if (modoLocal) return;
  await fb.signInWithPopup(auth, new fb.GoogleAuthProvider());
}

export async function salir() {
  if (modoLocal) return;
  await fb.signOut(auth);
}

// ---------------------------------------------------------------------------
// Colecciones: "sessions" (sesiones) y "plans" (planes de entrenamiento)
// ---------------------------------------------------------------------------

function ordenarSesiones(lista) {
  // Más reciente primero; si es el mismo día, la última creada primero.
  return lista.sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || 0) - (a.creado || 0)
  );
}

function ordenarPlanes(lista) {
  return lista.sort((a, b) => b.inicio.localeCompare(a.inicio));
}

function escuchar(coleccion, ordenar, callback, alError) {
  if (modoLocal) {
    const oyente = () => callback(ordenar(leerLocal(coleccion)));
    oyentesLocales.add(oyente);
    oyente();
    return () => oyentesLocales.delete(oyente);
  }

  const ref = fb.collection(firestore, "users", usuario.uid, coleccion);
  // Evento: se dispara al inicio y cada vez que cambian los datos
  // (en este dispositivo o en otro).
  return fb.onSnapshot(
    ref,
    (snap) => callback(ordenar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => {
      console.error(`Error leyendo ${coleccion}:`, err);
      alError(err);
    }
  );
}

function guardar(coleccion, doc) {
  const { id, ...datos } = doc;
  datos.actualizado = Date.now();
  if (!datos.creado) datos.creado = Date.now();

  if (modoLocal) {
    const lista = leerLocal(coleccion);
    const nuevoId = id || crypto.randomUUID();
    const i = lista.findIndex((s) => s.id === nuevoId);
    if (i >= 0) lista[i] = { id: nuevoId, ...datos };
    else lista.push({ id: nuevoId, ...datos });
    escribirLocal(coleccion, lista);
    return nuevoId;
  }

  const col = fb.collection(firestore, "users", usuario.uid, coleccion);
  const ref = id ? fb.doc(col, id) : fb.doc(col);
  // No se espera (await) la respuesta del servidor: Firestore guarda primero
  // en la copia local y sube el cambio cuando hay señal. Así guardar es
  // instantáneo aunque no haya internet.
  fb.setDoc(ref, datos).catch((err) => console.error("Error guardando:", err));
  return ref.id;
}

function borrar(coleccion, id) {
  if (modoLocal) {
    escribirLocal(coleccion, leerLocal(coleccion).filter((s) => s.id !== id));
    return;
  }
  const ref = fb.doc(firestore, "users", usuario.uid, coleccion, id);
  fb.deleteDoc(ref).catch((err) => console.error("Error borrando:", err));
}

export const escucharSesiones = (cb, alError = () => {}) => escuchar("sessions", ordenarSesiones, cb, alError);
export const guardarSesion = (s) => guardar("sessions", s);
export const borrarSesion = (id) => borrar("sessions", id);

export const escucharPlanes = (cb, alError = () => {}) => escuchar("plans", ordenarPlanes, cb, alError);
export const guardarPlan = (p) => guardar("plans", p);
export const borrarPlan = (id) => borrar("plans", id);

// ---------------------------------------------------------------------------
// Modo local (localStorage)
// ---------------------------------------------------------------------------

const CLAVES = { sessions: "escalada.sesiones", plans: "escalada.planes" };
const oyentesLocales = new Set();

function leerLocal(coleccion) {
  try {
    return JSON.parse(localStorage.getItem(CLAVES[coleccion])) || [];
  } catch {
    return [];
  }
}

function escribirLocal(coleccion, lista) {
  localStorage.setItem(CLAVES[coleccion], JSON.stringify(lista));
  oyentesLocales.forEach((cb) => cb());
}
