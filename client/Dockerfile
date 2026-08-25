# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Serve con SSL/HTTPS
FROM nginx:alpine
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key \
    -out /etc/nginx/ssl/server.crt \
    -subj "/C=MX/ST=Oaxaca/L=Tuxtepec/O=GASME/OU=TI/CN=192.168.2.243" \
    -addext "subjectAltName=IP:192.168.2.243,IP:127.0.0.1,DNS:localhost,DNS:gasme.local"

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

