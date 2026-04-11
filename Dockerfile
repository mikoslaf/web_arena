# syntax=docker/dockerfile:1
FROM nginx:alpine

# Install Node.js runtime for the internal WebSocket server process.
RUN apk add --no-cache nodejs npm

# Copy frontend files to nginx's html root.
COPY . /usr/share/nginx/html

# Install backend dependencies in a separate app directory.
WORKDIR /app/server
COPY server/package.json ./package.json
RUN npm install --omit=dev
COPY server/server.js ./server.js
COPY server/ServerGameRoom.js ./ServerGameRoom.js

# Fix permissions – files from Windows may arrive without read bits.
RUN chmod -R 755 /usr/share/nginx/html \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Custom nginx config to properly serve JS modules and proxy WS to localhost.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint starts Node in the background and keeps nginx in foreground.
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

WORKDIR /
EXPOSE 80
CMD ["/start.sh"]
