# syntax=docker/dockerfile:1
FROM nginx:alpine

# Copy all game files to nginx's html root
COPY . /usr/share/nginx/html

# Fix permissions – files from Windows may arrive without read bits
# nginx runs as user 'nginx' (uid 101) in the alpine image
RUN chmod -R 755 /usr/share/nginx/html \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Custom nginx config to properly serve JS modules
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
