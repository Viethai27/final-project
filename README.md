# Final Project

## Docker

Chạy toàn bộ stack bằng Docker Compose:

```bash
docker compose up --build
```

Sau khi lên xong:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/api/health`
- MySQL: `localhost:3306`

## Các service

- `frontend`: build React/Vite rồi serve bằng Nginx
- `backend`: Express + TypeScript + Prisma
- `db`: MySQL 8.0
