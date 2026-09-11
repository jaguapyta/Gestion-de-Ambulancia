# Despliegue del SEME en Hostinger (Docker + Traefik)

Subdominio: **https://ambulancia.columbiatcc.online**

## Arquitectura

Un solo subdominio con **ruteo por path** en Traefik:

| Ruta | Servicio | Puerto interno |
|------|----------|----------------|
| `/api/*` y `/socket.io/*` | backend (Express + Prisma) | 3001 |
| todo lo demás | frontend (Next.js standalone) | 3000 |
| — | db (MariaDB 10.4, sin puerto público) | 3306 |

Al ser el mismo origen, no hay problemas de CORS. El frontend se compila con
`NEXT_PUBLIC_API_URL=https://ambulancia.columbiatcc.online` (build-arg) y llama a
`/api/...` en el mismo dominio.

## Archivos de despliegue (ya en el repo)

- `docker-compose.produccion.yml` — 3 servicios + labels Traefik + volumen `ambulancia_db`.
- `backend/Dockerfile.produccion`, `frontend/Dockerfile.produccion`.
- `backend/.dockerignore`, `frontend/.dockerignore`.
- `runtime.env.example` — plantilla del env de producción (va en el VPS, NO en git).

## Datos a CONFIRMAR con el administrador del VPS

1. IP pública del VPS, usuario y puerto SSH.
2. Nombre real del contenedor **Traefik** y su **modo de red** (host o bridge).
   - Si es **bridge**: nombre de la red externa → usar el bloque "CASO B" del compose.
3. **entrypoint** HTTPS (referencia: `websecure`) y **certresolver** (referencia: `letsencrypt`).
   - Si difieren, corregir los labels marcados `# <-- CONFIRMAR` en el compose.
4. Que exista una carpeta `/opt/ambulancia` con permisos para el usuario que despliega.

## Opción A — Despliegue por el panel (Docker Manager · Compose from URL)

El compose NO trae secretos. En el Docker Manager, sección **Environment variables**
del proyecto, cargá estas variables ANTES de desplegar (interpolan con `${...}`):

```
MARIADB_DATABASE=seme
MARIADB_USER=seme_user
MARIADB_PASSWORD=<password_db>
MARIADB_ROOT_PASSWORD=<password_root>
DATABASE_URL=mysql://seme_user:<password_db>@db:3306/seme
JWT_SECRET=<secreto_largo_aleatorio>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://ambulancia.columbiatcc.online
```

Luego: Compose from URL → el `docker-compose.produccion.yml` del repo → Deploy.
Si el contenedor `db` queda *unhealthy*, casi siempre es que faltó cargar
`MARIADB_ROOT_PASSWORD` (sin ella MariaDB no inicializa).

Los datos iniciales (respaldo `backup_seme_seed.sql`) se restauran por consola/SSH
igual que en la Opción B (paso "Restaurar en producción").

## Paso 1 — DNS (quien administre la zona de columbiatcc.online)

Crear un registro **A**: `ambulancia` → `<IP_DEL_VPS>` (TTL 3600).
Comprobar: `dig +short A ambulancia.columbiatcc.online` debe devolver la IP.

## Paso 2 — Secrets en el VPS (por SSH)

```bash
mkdir -p /opt/ambulancia/config
# copiar runtime.env.example -> /opt/ambulancia/config/runtime.env y completar valores reales
chmod 700 /opt/ambulancia/config
chmod 600 /opt/ambulancia/config/runtime.env
```

En `runtime.env`: definir passwords de la DB, `JWT_SECRET` largo, y
`DATABASE_URL="mysql://<user>:<pass>@db:3306/seme"` (host = `db`, no localhost).

## Paso 3 — Traer el código

```bash
git clone --branch centro-regulacion-rrhh https://github.com/jaguapyta/Gestion-de-Ambulancia /opt/ambulancia/src
cd /opt/ambulancia/src
```

## Paso 4 — Validar, construir y arrancar

```bash
docker compose -p ambulancia -f docker-compose.produccion.yml config -q
docker compose -p ambulancia -f docker-compose.produccion.yml build
docker compose -p ambulancia -f docker-compose.produccion.yml up -d
docker compose -p ambulancia -f docker-compose.produccion.yml ps
docker compose -p ambulancia -f docker-compose.produccion.yml logs --tail=100
```

El backend, al arrancar, corre `prisma db push` contra la DB ya lista y crea las tablas.
**La base arranca vacía**: hay que cargar los datos iniciales (usuarios, catálogos, etc.)
según el procedimiento del proyecto (respaldo/seed). No hay migraciones versionadas.

## Paso 5 — Verificar

```bash
curl -sS -D - -o /dev/null http://ambulancia.columbiatcc.online/    # debe redirigir a HTTPS
curl -sS -D - -o /dev/null https://ambulancia.columbiatcc.online/   # 200 o redirección a /login
```

En el navegador: que cargue el login, que el certificado sea válido para el subdominio,
que se pueda iniciar sesión (llamada a `/api/auth/login`) y abrir una pantalla con datos.

## Actualizar

```bash
cd /opt/ambulancia/src && git pull
docker compose -p ambulancia -f docker-compose.produccion.yml build
docker compose -p ambulancia -f docker-compose.produccion.yml up -d
```

## Respaldo de la base (antes de cambios de esquema)

```bash
docker compose -p ambulancia -f docker-compose.produccion.yml exec db \
  sh -c 'mysqldump -uroot -p"$MARIADB_ROOT_PASSWORD" seme' > seme_backup_$(date +%F).sql
```

Guardar el `.sql` **fuera del VPS**. Un volumen en el mismo servidor no es un respaldo.
