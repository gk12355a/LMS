# Stage build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage runtime
FROM nginx:alpine

# Tạo thư mục /run/nginx và cấp quyền cho user nginx
RUN mkdir -p /run/nginx && \
    chown -R nginx:nginx /run/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Chạy với user non-root
USER nginx

# Sao chép file build từ stage build
COPY --from=build /app/dist /usr/share/nginx/html
# Sao chép nginx.conf vào container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở port 80
EXPOSE 80

# Chạy Nginx
CMD ["nginx", "-g", "daemon off;"]