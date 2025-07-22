# Stage build
FROM node:20-alpine AS build

WORKDIR /app

# Sao chép package.json và package-lock.json để tận dụng cache
COPY package*.json ./
# Cài dependencies, bỏ qua devDependencies
RUN npm install -DskipTest=true
# Sao chép mã nguồn (bao gồm public, src)
COPY . .
# Build ứng dụng
RUN npm run build

# Stage runtime
FROM nginx:alpine

# Chạy Nginx với user non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html
USER nginx

# Sao chép file build từ stage build
COPY --from=build /app/dist /usr/share/nginx/html
# Sao chép nginx.conf vào container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở port 80
EXPOSE 80

# Chạy Nginx
CMD ["nginx", "-g", "daemon off;"]