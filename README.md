# Sistema de Gestión Logística

Aplicación web para gestionar envíos de punta a punta: desde la carga del pedido hasta la entrega al cliente, con tracking en tiempo real.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL** vía Supabase
- **Prisma** ORM
- **NextAuth.js v5** (autenticación con roles)
- **Supabase Realtime** (tracking en tiempo real)
- **Tailwind CSS** + componentes custom

---

## Requisitos previos

- Node.js 18 o superior
- Una cuenta en [Supabase](https://supabase.com) (plan gratuito es suficiente para desarrollo)

---

## Instalación y configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto
2. Esperar a que el proyecto termine de inicializarse (~2 minutos)

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local` con los valores de tu proyecto Supabase:

| Variable | Dónde obtenerla |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → **Transaction** |
| `DIRECT_URL` | Supabase → Settings → Database → Connection string → **Session** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role **secret** |
| `AUTH_SECRET` | Generá con: `openssl rand -base64 32` |

### 4. Generar el cliente Prisma

```bash
npm run db:generate
```

### 5. Aplicar el esquema a la base de datos

```bash
npm run db:migrate
```

> Al pedir un nombre para la migración, ingresá: `init`

### 6. Cargar datos iniciales (seed)

```bash
npm run db:seed
```

Esto crea dos usuarios de prueba:

| Rol | Email | Contraseña |
|---|---|---|
| Gestor | gestor@logistica.com | gestor1234 |
| Chofer | chofer@logistica.com | chofer1234 |

**Importante:** Cambiá las contraseñas antes de pasar a producción.

### 7. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Estructura del proyecto

```
/
├── app/
│   ├── (auth)/login/          ← Página de login (pública)
│   ├── (manager)/             ← Panel del Gestor (solo MANAGER)
│   │   ├── layout.tsx         ← Layout con sidebar
│   │   ├── dashboard/         ← Dashboard principal
│   │   ├── shipments/         ← Lista y gestión de envíos [próxima etapa]
│   │   ├── labels/            ← Generación de etiquetas [próxima etapa]
│   │   ├── incidents/         ← Panel de incidencias [próxima etapa]
│   │   └── drivers/           ← Gestión de choferes [próxima etapa]
│   ├── (driver)/              ← Panel del Chofer (solo DRIVER)
│   │   ├── layout.tsx         ← Layout mobile con bottom nav
│   │   ├── assignments/       ← Pedidos asignados
│   │   └── route/             ← Recorrido activo [próxima etapa]
│   ├── tracking/[token]/      ← Tracking público (sin login)
│   └── api/
│       ├── auth/[...nextauth] ← NextAuth endpoints
│       └── tracking/[token]   ← API de tracking público
├── components/
│   ├── ui/                    ← Componentes UI base
│   ├── manager/               ← Sidebar, Header del gestor
│   ├── driver/                ← Bottom nav del chofer
│   └── tracking/              ← Componentes del tracking público
├── lib/
│   ├── prisma.ts              ← Cliente Prisma (singleton)
│   ├── utils.ts               ← Utilidades (cn, etc.)
│   ├── constants/             ← Estados, labels, transiciones válidas
│   ├── supabase/
│   │   ├── client.ts          ← Browser (ANON KEY — solo Broadcast)
│   │   └── server.ts          ← Server (SERVICE ROLE KEY — broadcasts)
│   ├── extractors/            ← Extractores de PDF por formato
│   │   ├── index.ts           ← Orquestador
│   │   ├── tiendanube.ts      ← Extractor Tienda Nube
│   │   └── remito.ts          ← Extractor remitos
│   └── route-optimizer/       ← Optimizador de rutas
│       ├── index.ts
│       └── nearest-neighbor.ts ← Algoritmo Nearest Neighbor (sin costo de API)
├── prisma/
│   ├── schema.prisma          ← Esquema completo de la DB
│   └── seed.ts                ← Datos iniciales
├── types/
│   └── next-auth.d.ts         ← Augmentación de tipos de NextAuth
├── middleware.ts              ← Protección de rutas por rol
└── auth.ts                   ← Configuración de NextAuth
```

---

## Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:generate  # Regenerar cliente Prisma (tras cambiar schema)
npm run db:migrate   # Aplicar nueva migración
npm run db:seed      # Cargar datos iniciales
npm run db:studio    # Abrir Prisma Studio (UI de la DB)
```

---

## Roles y accesos

| Ruta | Acceso |
|---|---|
| `/login` | Público |
| `/tracking/[token]` | Público (solo ese envío) |
| `/dashboard`, `/shipments`, `/labels`, `/incidents`, `/drivers` | Solo MANAGER |
| `/assignments`, `/route/*` | Solo DRIVER |

---

## Seguridad del tracking público

El tracking público usa una arquitectura de dos capas:

1. **Carga inicial**: Server Component que consulta la DB via Prisma (nunca expone credenciales al browser).
2. **Tiempo real**: Supabase Realtime Broadcast. El cliente se suscribe al canal `tracking:{uuid}` usando solo la ANON KEY. El servidor publica en ese canal cuando cambia el estado. El browser **nunca** consulta la tabla `shipments` directamente.

El canal de broadcast lleva el UUID del tracking token como nombre. Con 2¹²² combinaciones posibles, no es enumerable por fuerza bruta.

---

## Despliegue en producción

1. **Vercel**: conectar el repositorio de GitHub. Las variables de entorno se configuran en el dashboard de Vercel.
2. **Supabase**: el mismo proyecto que usaste en desarrollo puede usarse en producción (o crear uno separado para prod).
3. Ejecutar `npx prisma migrate deploy` en el servidor de producción (o como parte del pipeline de CI/CD).

---

## Etapas de desarrollo

- ✅ **Etapa 1 (actual)**: Infraestructura — auth, roles, layouts, tracking público, módulos de PDF y rutas (stubs)
- 🔲 **Etapa 2**: Carga de pedidos (PDF + manual), lista de envíos, etiquetas térmicas, cambio de estados
- 🔲 **Etapa 3**: Panel del chofer funcional, recorridos con Google Maps, marcar entregado, incidencias
- 🔲 **Etapa 4**: Dashboard con métricas, gestión de choferes, pulido y producción
