# Bitácora de escalada

App web para registrar sesiones de escalada y entrenamiento, y seguir la
**intensidad** de cada sesión. Funciona en el celular y en el PC, se puede
instalar como app y funciona sin señal.

El plan de entrenamiento y el diseño completo están en el archivo [`context`](context).

## Intensidad

```
Intensidad de la sesión = Σ (bloques encadenados en el grado × número del grado)
```

Ejemplo: 10 V4 + 10 V5 + 5 V6 → 10·4 + 10·5 + 5·6 = **120**.

Se calcula en las sesiones con bloques: board, resistencia, max boulder y roca.

## Versión 1 (esta)

- **Hoy:** qué toca según el día, botón para registrar, avisos de codo,
  resumen de la semana (sesiones, días de escalada, intensidad vs. semana pasada).
- **Registrar:** formulario por tipo de sesión, con botones en vez de teclear.
  Parte desde los valores de tu última sesión del mismo tipo.
- **Historial:** sesiones agrupadas por semana, con filtro por tipo; tocar una
  sesión la abre para editarla o borrarla.

Próximas: versión 2 (objetivos y regla subir/repetir/bajar), versión 3
(gráficos de progreso y exportar a CSV).

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada: estructura y navegación |
| `css/estilos.css` | Diseño (celular primero) |
| `js/app.js` | Arranque, login y pantallas Hoy / Historial |
| `js/formularios.js` | Pantalla Registrar: un formulario por tipo de sesión |
| `js/calculos.js` | Intensidad, grados, fechas y datos fijos del plan |
| `js/db.js` | Único archivo que habla con la base de datos |
| `js/config.js` | Claves de Firebase (vacías = modo local) |
| `sw.js` | Service worker: uso sin señal |
| `manifest.json` | Nombre e ícono para instalar en el celular |
| `firestore.rules` | Reglas de seguridad de Firestore |

## Probarla en el PC

Desde la carpeta del proyecto:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

Sin Firebase configurado funciona en **modo local**: los datos quedan solo en
ese navegador.

## Publicarla (GitHub Pages)

1. En GitHub: **Settings → Pages**.
2. En *Source* elegir **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Guardar. En 1-2 minutos queda en
   `https://ibmaier.github.io/Projecto-1-Climbing-App/`.

En el celular: abrir esa dirección en Chrome → menú → **Agregar a pantalla de inicio**.

## Conectar Firebase (para sincronizar celular y PC)

1. Entrar a <https://console.firebase.google.com> y crear un proyecto (gratis).
2. **Build → Authentication → Comenzar → Google** → habilitar.
3. **Authentication → Settings → Authorized domains** → agregar `ibmaier.github.io`.
4. **Build → Firestore Database → Crear base de datos** (modo producción).
5. En **Firestore → Rules**, pegar el contenido de `firestore.rules` y publicar.
6. **Configuración del proyecto → Tus apps → Web (`</>`)** → registrar la app y
   copiar los valores de `firebaseConfig` en `js/config.js`.

Los valores de `config.js` no son secretos; la protección está en las reglas.
