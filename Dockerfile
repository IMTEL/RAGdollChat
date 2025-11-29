# Use Node 20 slim
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript -> dist/
RUN npm run build

# ------------------------------
# Runner stage
# ------------------------------
FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Default port (can be overridden by Docker or .env)
ENV PORT=3002

# Make port visible to Docker
EXPOSE 3002

# Ensure the Node app receives PORT and uses it


CMD ["node", "dist/index.js"]
