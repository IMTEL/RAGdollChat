# Dockerfile for RAGdollChat Frontend (Next.js)
# Purpose: Build and run the chat frontend on port 3001
# - Multi-stage build for optimal image size
# - Standalone output mode for containerized deployment

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build-time environment variables
ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_USE_MODEL_DRIVEN_AGENT
ARG NEXT_PUBLIC_MODEL_DRIVEN_BASE_URL
ARG NEXT_PUBLIC_MODEL_DRIVEN_WS_URL

# Set environment variables for build
ENV NEXT_PUBLIC_BACKEND_API_URL=${NEXT_PUBLIC_BACKEND_API_URL}
ENV NEXT_PUBLIC_USE_MODEL_DRIVEN_AGENT=${NEXT_PUBLIC_USE_MODEL_DRIVEN_AGENT}
ENV NEXT_PUBLIC_MODEL_DRIVEN_BASE_URL=${NEXT_PUBLIC_MODEL_DRIVEN_BASE_URL}
ENV NEXT_PUBLIC_MODEL_DRIVEN_WS_URL=${NEXT_PUBLIC_MODEL_DRIVEN_WS_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
