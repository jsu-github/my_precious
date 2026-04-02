# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY knexfile.ts ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
# Copy compiled JS migrations (not TS source) to where knex production config expects them
COPY --from=builder /app/dist/migrations ./migrations

EXPOSE 3001
CMD ["node", "dist/src/index.js"]
