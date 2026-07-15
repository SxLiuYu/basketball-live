# ===== Backend Builder =====
FROM node:20-alpine AS backend-builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# ===== Frontend Builder =====
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ===== Final Production Image =====
FROM node:20-alpine AS production

WORKDIR /app

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Copy built frontend to nginx html dir
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy backend app
COPY --from=backend-builder /app/dist /app/dist
COPY --from=backend-builder /app/node_modules /app/node_modules
COPY --from=backend-builder /app/package.json /app/package.json

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 3001

CMD ["sh", "-c", "nginx & node dist/index.js"]
