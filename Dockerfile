# ==============================================================================
# Multi-Stage Dockerfile untuk Coolify (Go Fiber Backend + Astro Node Frontend)
# ==============================================================================

# STAGE 1: Build Backend Go Binary
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy Go mod & sum files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Build optimized Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/backend/bin/api ./cmd/server

# ------------------------------------------------------------------------------

# STAGE 2: Build Frontend Astro Static/SSR Assets
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Pass environment variables for Astro build
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG PUBLIC_TURNSTILE_SITE_KEY
ARG PUBLIC_SITE_URL
ARG BACKEND_URL

ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
ENV BACKEND_URL=$BACKEND_URL

# Build Astro production bundle
RUN npm run build

# ------------------------------------------------------------------------------

# STAGE 3: Production Runner Container
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime tools
RUN apk add --no-cache ca-certificates tzdata

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy root package files & install concurrently for runner
COPY package.json ./
RUN npm install --only=production concurrently

# Copy Go backend binary from Stage 1
COPY --from=backend-builder /app/backend/bin/api /app/backend/bin/api

# Copy Astro frontend build from Stage 2
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules

# Expose Frontend & Backend ports
EXPOSE 3000
EXPOSE 8080

# Start both Go Backend and Astro Node Frontend concurrently
CMD ["npx", "concurrently", "-k", "-n", "WEB,API", "-c", "cyan,green", "node frontend/dist/server/entry.mjs", "/app/backend/bin/api"]
