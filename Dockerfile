# Multi-stage production build for WellBridge AI
FROM node:20-slim AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json bun.lock* ./

# Install dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build Vite client assets and bundle server.ts with esbuild
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy compiled files and required packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Install only production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Cloud Run default port
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
