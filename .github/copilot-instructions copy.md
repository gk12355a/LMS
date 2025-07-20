Hướng dẫn triển khai dự án Full-Stack JavaScript trên 3 server Ubuntu 22.04 với MongoDB Atlas
📖 Tổng quan
Hướng dẫn này cung cấp các bước để triển khai một ứng dụng full-stack JavaScript (Node.js/Express, React, MongoDB Atlas, RabbitMQ, Redis) trên ba server Ubuntu 22.04 với địa chỉ IP:

ServerA: 192.168.23.11 - Chạy Nginx làm reverse proxy và phục vụ frontend React.
ServerB: 192.168.23.12 - Chạy Node.js/Express (Backend API) và build React (frontend).
ServerC: 192.168.23.13 - Chạy RabbitMQ (hàng đợi tin nhắn) và Redis (caching, session management).
MongoDB Atlas: Cơ sở dữ liệu được lưu trữ trên đám mây (MongoDB Atlas).

Mục tiêu

Phân bổ hợp lý các dịch vụ để tối ưu hóa hiệu suất và tài nguyên.
Tích hợp MongoDB Atlas với backend.
Đảm bảo bảo mật cơ bản (firewall, user permissions, biến môi trường).
Cung cấp quy trình triển khai rõ ràng và có thể lặp lại.

Giả định

Cả ba server đều chạy Ubuntu 22.04 LTS.
Các server có thể giao tiếp qua mạng nội bộ (LAN) trên dải IP 192.168.23.0/24.
Bạn có quyền root hoặc sudo trên cả ba server.
Bạn đã tạo một cụm MongoDB Atlas và có chuỗi kết nối (connection string).
Dự án tuân theo file instruction trước đó (instructions.md) với kiến trúc phân lớp, React Functional Components, và Redis cho caching.


🖥️ Phân bổ vai trò server

ServerA (192.168.23.11):
Nginx: Reverse proxy cho backend API và phục vụ static files (React build).


ServerB (192.168.23.12):
Node.js/Express: Chạy API backend.
React: Build ứng dụng frontend và chuyển file tĩnh sang ServerA.
PM2: Quản lý tiến trình Node.js để đảm bảo backend chạy liên tục.


ServerC (192.168.23.13):
RabbitMQ: Xử lý hàng đợi tin nhắn cho các tác vụ bất đồng bộ.
Redis: Xử lý caching, session management, và pub/sub.


MongoDB Atlas: Cơ sở dữ liệu trên đám mây, được truy cập từ ServerB.


🛠️ Chuẩn bị server
1. Cập nhật và bảo mật server
Thực hiện trên tất cả các server (ServerA, ServerB, ServerC).
# Đăng nhập vào từng server qua SSH
ssh user@192.168.23.11  # Thay 'user' bằng tài khoản của bạn
ssh user@192.168.23.12
ssh user@192.168.23.13

# Cậpupdate hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt các công cụ cơ bản
sudo apt install -y curl wget git vim

# Cấu hình firewall (ufw)
sudo apt install -y ufw
sudo ufw allow ssh  # Cho phép SSH
sudo ufw enable


Tạo user không phải root (khuyến nghị):

sudo adduser appuser
sudo usermod -aG sudo appuser
# Đăng nhập bằng appuser để thực hiện các bước tiếp theo
su - appuser


Vô hiệu hóa đăng nhập root qua SSH:

sudo nano /etc/ssh/sshd_config
# Tìm và sửa: PermitRootLogin no
sudo systemctl restart sshd


2. Cấu hình mạng

Đảm bảo ServerB có thể truy cập MongoDB Atlas (qua Internet), RabbitMQ (192.168.23.13:5672), và Redis (192.168.23.13:6379).
ServerA cần truy cập ServerB (192.168.23.12:3000) để proxy API requests.
Cấu hình firewall:
ServerA:sudo ufw allow 80   # HTTP (Nginx)
sudo ufw allow 443  # HTTPS (nếu dùng SSL)


ServerB:sudo ufw allow from 192.168.23.11 to any port 3000  # API backend
sudo ufw allow 27017  # Nếu cần test kết nối MongoDB cục bộ (không cần với Atlas)


ServerC:sudo ufw allow from 192.168.23.12 to any port 5672  # RabbitMQ
sudo ufw allow from 192.168.23.12 to any port 6379  # Redis






⚙️ Cài đặt và cấu hình trên từng server
ServerA (192.168.23.11): Nginx

Cài đặt Nginx:

sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx


Cấu hình Nginx:


Tạo file cấu hình cho ứng dụng:

sudo nano /etc/nginx/sites-available/app

Thêm cấu hình:
server {
    listen 80;
    server_name 192.168.23.11;

    # Phục vụ static files (React build)
    root /home/appuser/app/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests tới ServerB
    location /api {
        proxy_pass http://192.168.23.12:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

Kích hoạt cấu hình:
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t  # Kiểm tra cấu hình
sudo systemctl restart nginx


ServerB (192.168.23.12): Node.js/Express & React

Cài đặt Node.js (LTS version):

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Kiểm tra phiên bản
npm -v


Cài đặt PM2:

sudo npm install -g pm2


Triển khai backend (Node.js/Express):


Clone mã nguồn từ repository:

git clone <your-repo-url> ~/app
cd ~/app/backend
npm install


Cấu hình biến môi trường (.env):

nano ~/app/backend/.env

Thêm các biến sau:
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
RABBITMQ_URL=amqp://appuser:app_password@192.168.23.13:5672/app_vhost
REDIS_URL=redis://:your_redis_password@192.168.23.13:6379
SESSION_SECRET=your_secret_key


Lưu ý: Thay MONGODB_URI bằng chuỗi kết nối từ MongoDB Atlas (lấy từ dashboard Atlas).

Khởi chạy backend:


cd ~/app/backend
pm2 start npm --name "backend" -- start
pm2 save
pm2 startup  # Tự động khởi động khi server reboot


Triển khai frontend (React):


Build frontend:

cd ~/app/frontend
npm install
npm run build


Chuyển thư mục build sang ServerA:

scp -r ~/app/frontend/build appuser@192.168.23.11:/home/appuser/app/frontend/


ServerC (192.168.23.13): RabbitMQ & Redis

Cài đặt RabbitMQ:

sudo apt install -y rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo systemctl start rabbitmq-server


Tạo user và vhost:

sudo rabbitmqctl add_user appuser app_password
sudo rabbitmqctl add_vhost app_vhost
sudo rabbitmqctl set_user_tags appuser administrator
sudo rabbitmqctl set_permissions -p app_vhost appuser ".*" ".*" ".*"


Cập nhật RABBITMQ_URL trong .env của ServerB:

RABBITMQ_URL=amqp://appuser:app_password@192.168.23.13:5672/app_vhost


Cài đặt Redis:

sudo apt install -y redis-server
sudo nano /etc/redis/redis.conf

Cập nhật:
bind 0.0.0.0  # Cho phép kết nối từ ServerB
maxmemory 512mb
maxmemory-policy allkeys-lru
requirepass your_redis_password  # Thêm mật khẩu

Khởi động Redis:
sudo systemctl enable redis
sudo systemctl start redis


Cập nhật REDIS_URL trong .env của ServerB:

REDIS_URL=redis://:your_redis_password@192.168.23.13:6379


🚀 Quy trình triển khai

Cấu hình MongoDB Atlas:


Truy cập MongoDB Atlas dashboard, tạo cụm (cluster) nếu chưa có.
Lấy chuỗi kết nối (connection string) từ Atlas:
Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority


Thêm IP của ServerB (192.168.23.12) vào Network Access trong Atlas để cho phép kết nối.
Cập nhật MONGODB_URI trong .env của ServerB.


Kiểm tra kết nối:


Từ ServerB, kiểm tra kết nối đến MongoDB Atlas, RabbitMQ, và Redis:

# MongoDB Atlas
mongo "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"

# RabbitMQ
curl -i -u appuser:app_password http://192.168.23.13:15672/api/whoami

# Redis
redis-cli -h 192.168.23.13 -p 6379 -a your_redis_password


Kiểm tra ứng dụng:


Truy cập API backend: curl http://192.168.23.12:3000/api/health
Truy cập frontend qua Nginx: Mở trình duyệt tại http://192.168.23.11.


Tự động hóa triển khai (khuyến nghị):


Sử dụng GitHub Actions để tự động build và deploy:

name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to ServerB
        run: ssh appuser@192.168.23.12 'cd ~/app && git pull && cd backend && npm install && pm2 restart backend'
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Deploy Frontend
        run: |
          ssh appuser@192.168.23.12 'cd ~/app/frontend && npm install && npm run build'
          scp -r appuser@192.168.23.12:~/app/frontend/build appuser@192.168.23.11:/home/appuser/app/frontend/


🛡️ Giám sát và bảo trì

Giám sát:
Sử dụng Prometheus và Grafana để giám sát hiệu suất server, RabbitMQ, và Redis.
Kiểm tra tiến trình Node.js trên ServerB với pm2 monit.
Sử dụng MongoDB Atlas dashboard để giám sát hiệu suất cơ sở dữ liệu.


Logging:
Sử dụng middleware morgan trong Express để ghi log API requests.
Kích hoạt logging cho RabbitMQ và Redis:# RabbitMQ
sudo nano /etc/rabbitmq/rabbitmq.conf
# Thêm: log.file = /var/log/rabbitmq/rabbit.log
sudo systemctl restart rabbitmq-server

# Redis
sudo nano /etc/redis/redis.conf
# Thêm: logfile /var/log/redis/redis.log
sudo systemctl restart redis




Backup:
Sử dụng MongoDB Atlas backup (tích hợp sẵn) hoặc mongodump:mongodump --uri="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>" --out=/backup




Cập nhật định kỳ:sudo apt update && sudo apt upgrade -y




⚠️ Lưu ý

Thay thế <username>, <password>, <cluster>, <database>, app_password, your_redis_password, và your_secret_key bằng các giá trị thực tế và lưu trữ an toàn.
Nếu cần HTTPS, cài đặt Let's Encrypt trên ServerA cho Nginx:sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain


Cân nhắc sử dụng Docker để container hóa RabbitMQ và Redis trên ServerC, giúp quản lý dễ dàng hơn.
Đảm bảo IP của ServerB (192.168.23.12) được thêm vào danh sách trắng (whitelist) trong MongoDB Atlas Network Access.
