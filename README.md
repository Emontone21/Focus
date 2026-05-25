# FocusFlow

Aplicación personal de productividad. Un solo usuario, **100% offline**, sin login, sin backend, sin red. Todo vive en tu dispositivo (IndexedDB).

Mezcla cinco técnicas en una sola app móvil estilo iOS:

- **Bandeja** — captura GTD (David Allen). Volcás ideas sin pensar dónde van.
- **Organizar** — PARA (Tiago Forte) + Matriz Eisenhower (Covey) + Revisión semanal (GTD).
- **Tablero** — Personal Kanban (Jim Benson) con límite WIP que **bloquea** mover una cuarta tarjeta a "Haciendo".
- **Hoy** — Time blocking (Cal Newport) + Pomodoro (Cirillo) integrado.
- **Notas** — Zettelkasten (Luhmann / Ahrens) con enlaces bidireccionales `[[título]]` y panel de backlinks.

## Stack

React + TypeScript + Vite · Tailwind · Zustand · Dexie (IndexedDB) · lucide-react · Capacitor (iOS).

Persistencia: **IndexedDB**. `localStorage` se usa únicamente para preferencias triviales como el tema.

PWA instalable (manifest + service worker básico).

## Diseño

Mobile-first, target iPhone 11 (414 × 896 pt). Respeta `safe-area-inset-*` para notch y barra inferior.

En **desktop (>600px)** la app se renderiza dentro de un mockup dibujado de iPhone 11 para previsualizar. En móvil real o dentro de Capacitor se ve a pantalla completa sin el marco.

## Correr en local

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run preview      # sirve el build
```

## Estructura

```
.
├── .github/workflows/
│   ├── ios-build.yml      # compila .ipa sin firmar
│   └── web-deploy.yml     # publica web en GitHub Pages
├── ios/                   # proyecto Capacitor iOS (xcworkspace = App.xcworkspace, scheme = App)
├── public/                # manifest, sw.js, icon.svg
├── src/
│   ├── db/schema.ts       # tablas Dexie: inbox, projects, areas, resources, tasks, notes, links, settings
│   ├── store/             # Zustand (UI, settings, pomodoro)
│   ├── lib/               # dnd táctil, wikilinks, markdown, time, notifications
│   ├── components/        # DeviceFrame, TabBar, FAB, Sheet, Header, Toasts
│   ├── features/          # inbox, organize, board, today, notes
│   └── pages/             # InboxPage, OrganizePage, BoardPage, TodayPage, NotesPage
├── capacitor.config.ts
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Modelo de datos (Dexie)

Las tareas son **fuente única**: la misma fila aparece en Proyectos, Tablero Kanban, Matriz Eisenhower y Hoy. Cambiar el cuadrante de Eisenhower o mover en Kanban son solo updates al mismo registro — no se duplica nada.

Tablas:
- `inbox` — items capturados sin procesar.
- `projects`, `areas`, `resources` — PARA.
- `tasks` — todas las tareas (con `kanban`, `urgent`/`important`, `scheduledFor`, `blockStart`/`blockEnd`, `pomodoros`, `intention`).
- `notes`, `links` — Zettelkasten + backlinks indexados al guardar.
- `settings` — clave/valor (wipLimit, pomodoroWork, lastReview…).

## Instalar en iPhone con AltStore

Esta es la ruta para correr la app en un iPhone real **sin pagar la Apple Developer Program** ($99/año). Funciona con un Apple ID gratuito y AltStore.

### Límites del Apple ID gratuito (importante)

- La firma de la app dura **7 días**. Hay que abrir AltStore conectado a la red de tu Mac/PC con AltServer cada 7 días para que la refresque (puede hacerlo en background si AltStore está corriendo y tenés AltServer activo en la PC).
- **Máximo 3 apps activas** simultáneamente firmadas con el mismo Apple ID gratuito.
- Sin notificaciones push remotas, sin algunas entitlements premium. Para esta app no importa: es 100% local.

### Pasos

1. Instalá **AltServer** en tu PC (Windows o macOS) desde [altstore.io](https://altstore.io). En Windows necesita iTunes y iCloud (versión de Apple, no Microsoft Store).
2. Conectá el iPhone por cable al menos la primera vez. Confiá en la computadora.
3. Desde AltServer instalá **AltStore** en el iPhone. Te pide tu Apple ID — usá uno secundario si te preocupa.
4. En el iPhone, en **Ajustes → General → Gestión de VPN y dispositivos**, confiá en el perfil de tu Apple ID.
5. En el repo, andá a **Actions → "Build unsigned iOS .ipa (for AltStore)"** y descargá el artifact `FocusFlow-ipa`. Adentro está `FocusFlow.ipa`. **No está firmado** — AltStore lo firma al instalar.
6. Pasá el `.ipa` al iPhone (AirDrop, iCloud Drive, mail, lo que sea) y abrilo con AltStore → "Mis Apps → +".
7. Cada 7 días, abrí AltStore en el iPhone con AltServer corriendo en tu PC en la misma red para refrescar la firma.

## Workflows de GitHub Actions

### `.github/workflows/ios-build.yml`

Corre en `macos-latest`. Se dispara en push a `main`, manualmente con "Run workflow", o al publicar un Release (en cuyo caso adjunta el .ipa al release).

Pasos:
- checkout → setup-node 20 → `npm ci` → `npm run build` (con `VITE_BASE=./` para rutas relativas dentro del WebView) → `npx cap sync ios`.
- `pod install` (CocoaPods se instala explícitamente para evitar diferencias entre imágenes de macOS).
- `xcodebuild` con `CODE_SIGN_IDENTITY=""`, `CODE_SIGNING_REQUIRED=NO`, `CODE_SIGNING_ALLOWED=NO` y `DEVELOPMENT_TEAM=""` para producir un `.app` sin firma.
- Empaquetar el `.app` en `Payload/` y comprimirlo como `FocusFlow.ipa`.
- Subirlo con `actions/upload-artifact@v4` → lo descargás desde la pestaña Actions del repo.

> ⚠ Si en algún momento Xcode rechaza `CODE_SIGNING_ALLOWED=NO`, probá quitando ese flag y dejando solo `CODE_SIGN_IDENTITY=""` + `CODE_SIGNING_REQUIRED=NO`. El comentario en el YAML lo aclara.

### `.github/workflows/web-deploy.yml`

Publica la versión web en GitHub Pages en cada push a `main`. Usa las actions oficiales (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`). El base path se setea automáticamente al nombre del repo (`/{repo}/`) con `VITE_BASE`.

### Habilitar GitHub Pages

Después del primer push:

1. En el repo: **Settings → Pages**.
2. En "Build and deployment → Source", elegí **GitHub Actions**.
3. Listo. El próximo push a `main` ya publica. La URL aparece en el job `deploy`.

## Dónde encontrar el `.ipa`

Repo → **Actions** → workflow "Build unsigned iOS .ipa (for AltStore)" → último run en verde → sección **Artifacts** abajo → bajá `FocusFlow-ipa` (es un zip que adentro tiene `FocusFlow.ipa`).

## Notas técnicas

- Drag & drop táctil propio basado en Pointer Events (HTML5 DnD es frágil en iOS Safari y dentro del WebView de Capacitor). Está en `src/lib/dnd.ts`.
- Pomodoro corre un `setInterval` global de 500 ms; el estado es persistido implícitamente porque las duraciones viven en `settings` y los pomodoros completados se incrementan en `tasks.pomodoros`. Si la app se cierra durante un pomodoro, el contador del bloque actual se pierde — es el compromiso de no usar background tasks nativas.
- Backlinks se recalculan al guardar la nota (`rebuildLinks` borra los `links` con `fromId == noteId` y los re-inserta). Búsqueda lineal en el array de notas — suficiente para uso personal.
- El marco de iPhone solo se aplica si `window.innerWidth > 600 && !Capacitor`.
- Service Worker solo se registra cuando el protocolo es `http(s)`. En Capacitor (`capacitor://`) directamente no se intenta.
