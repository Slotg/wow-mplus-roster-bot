FROM node:20-alpine AS deps
WORKDIR /app
# Build context is the repo root, so prefix all paths with apps/bot/
COPY apps/bot/package.json apps/bot/package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/bot/ .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY apps/bot/package.json ./

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]