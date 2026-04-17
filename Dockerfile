# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json* ./
COPY client/package.json ./client/
RUN npm install --include=dev

# Copy source
COPY tsconfig.json drizzle.config.ts ./
COPY server/ ./server/
COPY client/ ./client/
COPY sql/ ./sql/

# Build client
RUN cd client && npm run build

# Build server
RUN npx tsc -p tsconfig.json

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built artifacts
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/client/dist/ ./client/dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/sql/ ./sql/

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

USER appuser

CMD ["node", "dist/server/index.js"]
