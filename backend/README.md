# Patient Dispatch Backend

Backend Express + TypeScript + Prisma for the patient dispatch project.

## Install

```bash
cd backend
npm install
```

## Environment

1. Copy `.env.example` to `.env`
2. Make sure MySQL Docker is running and reachable from `DATABASE_URL`
3. Make sure `SHADOW_DATABASE_URL` points to a separate MySQL database for Prisma migrations

Example MySQL setup:

```sql
CREATE DATABASE patient_dispatch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE patient_dispatch_shadow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Prisma

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

If `prisma migrate dev` complains about the shadow database in Docker, point `SHADOW_DATABASE_URL` to the dedicated shadow database above.

## Run backend

```bash
npm run dev
```

## Health check

```txt
http://localhost:4000/api/health
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run db:reset`
