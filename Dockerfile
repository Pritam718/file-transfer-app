# Multi-stage Dockerfile for File Transfer App
# Supports both development and production builds

# Stage 1: Base image with Node.js
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    libx11 \
    libxext \
    libxrender \
    libxtst \
    libxi \
    libxrandr \
    alsa-lib \
    gtk+3.0 \
    nss \
    libnotify \
    libsecret

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Stage 2: Development
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY src ./src

# Expose port for development server (if needed)
EXPOSE 3000

# Set environment variable
ENV NODE_ENV=development

# Development command
CMD ["npm", "run", "dev"]

# Stage 3: Builder
FROM base AS builder

# Install all dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY .env.example ./.env

# Build the application
RUN npm run build

# Stage 4: Production
FROM base AS production

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/renderer ./src/renderer
COPY --from=builder /app/src/public ./src/public

# Set environment variable
ENV NODE_ENV=production

# Production command
CMD ["npm", "start"]

# Stage 5: Test environment
FROM builder AS test

# Install test dependencies
RUN npm install --save-dev jest @types/jest ts-jest

# Copy test files (if you add them later)
# COPY test ./test

# Run tests
CMD ["npm", "test"]
