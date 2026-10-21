# Asistencias · Vista de Registro

Pantalla pública de checada por **NFC / QR** del Control de Asistencia NerWork.

El Terminal tiene una etiqueta (NFC o QR) con la URL `/c/<token>`. Al escanearla
se abre esta página, se **pide la ubicación**, y solo si el navegador la entrega
se registra la entrada o la salida.

> **Sin ubicación no hay registro.** Es una regla del sistema, no una restricción
> de la interfaz: el backend rechaza la marca y la deja auditada.

---

## Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Pantalla de reposo del terminal: "Acerque su tarjeta o sticker NFC". |
| `/c/[token]` | Checada: pide ubicación, envía la marca y muestra el resultado. |

### Flujo de `/c/[token]`

1. `GET /api/checar/info?token=…` — **solo lectura**: nombre, área y última marca.
2. Se solicita la geolocalización (`enableHighAccuracy`, 20 s de tiempo máximo).
3. `POST /api/checar` con `{ token, lat, lng, accuracy }`.
4. Resultado:
   - **Éxito** → tarjeta de confirmación: *«Hola, {nombre}»*, área, hora y botón **Aceptar**.
   - **Sin ubicación** → se explica cómo habilitarla y se ofrece **Reintentar**.
   - **Rechazo** → motivo concreto (fuera de zona, fuera de horario, doble registro…).

> El botón **Aceptar** devuelve la terminal a la pantalla de reposo, lista para
> la siguiente credencial.

---

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (ej. `https://asistencias-backend.vercel.app`). |

### 3. Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint     # tsc --noEmit
```

Para probarlo con el backend local:

```bash
# en ../AsistenciasBackend
SUPABASE_DEMO=1 npm run dev      # http://localhost:4000

# en esta carpeta
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

Y abrir `http://localhost:3000/c/BRZADF6P5V95` (token de demostración).

---

## Notas

- **Geolocalización requiere contexto seguro.** En producción la página debe
  servirse por HTTPS (Vercel lo hace por defecto); sobre `http://localhost` el
  navegador la permite.
- Si el navegador pide permiso y el usuario lo deniega, la página **no** hace
  ninguna llamada de escritura: solo explica cómo habilitarlo.
- Los permisos de ubicación se piden en el momento de la checada, no al cargar.
- El diseño sigue el sistema **Chronos Precision**: carmesí `#DC2626`, carbón
  `#111827`, tipografías Plus Jakarta Sans / Inter / JetBrains Mono.

---

## Despliegue (Vercel)

```bash
vercel --prod
```

Define `NEXT_PUBLIC_API_URL` apuntando al backend desplegado y en el backend
define `ALLOWED_ORIGIN` con el dominio de esta app (CORS).
