FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Prisma reads DATABASE_URL from the environment during schema processing.
ENV DATABASE_URL=mysql://root:password@localhost:3306/patient_dispatch_db

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node build/src/server.js"]
