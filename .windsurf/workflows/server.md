---
description: 
---

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

