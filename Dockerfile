# Multi-stage Dockerfile for VijayaLakshmi Minimart POS
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native module better-sqlite3 compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all backend and frontend dependencies
RUN npm run postinstall

# Copy remaining source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app /app

EXPOSE 5000

CMD ["npm", "start"]
