# Bitácora de escalada

App web para registrar sesiones de escalada y entrenamiento, y seguir la
**intensidad** de cada sesión. Funciona en el celular y en el PC, se puede
instalar como app y funciona sin señal.

El plan de entrenamiento y el diseño completo están en el archivo [`context`](context).

## Intensidad

```
Intensidad = Σ (bloques encadenados × grado V) + Σ (vías encadenadas × equivalente V)
```

Ejemplo: 10 V4 + 10 V5 + 5 V6 → 10·4 + 10·5 + 5·6 = **120**.

### Equivalencia vías → boulder

Anclada a tu nivel (5.12d / 7c ≈ V7). Se edita en `js/calculos.js` (`VIAS`).

| YDS | Francés | ≈ V | | YDS | Francés | ≈ V |
|---|---|---|---|---|---|---|
| 5.10a | 6a | 0 | | 5.12a | 7a+ | 4.5 |
| 5.10b | 6a+ | 0.5 | | 5.12b | 7b | 5 |
| 5.10c | 6b | 1 | | 5.12c | 7b+ | 6 |
| 5.10d | 6b+ | 1.5 | | 5.12d | 7c | 7 |
| 5.11a | 6c | 2 | | 5.13a | 7c+ | 7.5 |
| 5.11b | 6c | 2.5 | | 5.13b | 8a | 8 |
| 5.11c | 6c+ | 3 | | 5.13c | 8a+ | 9 |
| 5.11d | 7a | 4 | | 5.13d | 8b | 10 |

Cada vía cuenta como un bloque de su grado equivalente (`FACTOR_VIA = 1`).

## Pantallas

- **Hoy:** qué toca, botón para registrar el día planificado, avisos de codo y resumen semanal.
- **Calendario:** días pasados con lo realizado; hoy y días futuros con lo planificado.
  Tocar un día muestra el detalle completo (bloques, tiempos, ejercicios, objetivo y resultado)
  o la planificación con botón para registrarla.
- **Registrar:** eliges un día prediseñado (Board, Resistencia, Max boulder, Roca, Físico A/B,
  Test máximo o Sesión libre) y agregas, quitas o reordenas bloques: calentamiento, fuerza de
  dedos, board, boulder, resistencia, vías, roca, físico, test máximo u otro.
- **Estadísticas:** intensidad diaria (solo días de escalada) o mensual, benchmarks del
  entrenamiento (half crimp, pinza, board, boulder, vías, resistencia) y resumen de tests máximos.
- **Historial:** sesiones por semana con filtro por tipo.

### Plan semanal

Lunes board · martes físico A · miércoles descanso · jueves resistencia · viernes físico B ·
sábado roca o max boulder · domingo descanso. Se edita en `js/calculos.js` (`PLAN_SEMANA`).

## Archivos

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada: estructura y navegación |
| `css/estilos.css` | Diseño (celular primero) |
| `js/app.js` | Arranque, login, navegación y pantallas Hoy / Historial |
| `js/formularios.js` | Pantalla Registrar: sesión armada por bloques |
| `js/calendario.js` | Pantalla Calendario y detalle de cada día |
| `js/estadisticas.js` | Gráfico de intensidad, benchmarks y tests |
| `js/ui.js` | Piezas compartidas: tarjetas y detalle de sesión |
| `js/calculos.js` | Plan, plantillas, grados, equivalencias, intensidad y fechas |
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
