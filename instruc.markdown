# Hướng dẫn sử dụng Redis và RabbitMQ cho API LMS Backend

## Redis (Caching, TTL: 5 giây)
Redis được sử dụng để cache dữ liệu truy cập thường xuyên, giảm tải database. TTL 5 giây đảm bảo dữ liệu luôn mới nhưng vẫn tối ưu hiệu suất.

### Course Routes
- **GET /course/all**: Cache danh sách khóa học đã xuất bản. Lý do: Truy vấn thường xuyên, dữ liệu ít thay đổi.
- **GET /course/:id**: Cache thông tin khóa học theo ID. Lý do: Truy vấn chi tiết phổ biến, cần phản hồi nhanh.

### Educator Routes
- **GET /educator/courses**: Cache danh sách khóa học của giáo viên. Lý do: Giáo viên truy cập thường xuyên.
- **GET /educator/dashboard**: Cache dữ liệu dashboard (doanh thu, học viên). Lý do: Giảm tải tính toán phức tạp.
- **GET /educator/enrolled-students**: Cache danh sách học viên. Lý do: Truy vấn nhiều, dữ liệu tĩnh trong thời gian ngắn.

### User Routes
- **GET /user/data**: Cache thông tin người dùng. Lý do: Truy cập thường xuyên.
- **GET /user/enrolled-courses**: Cache danh sách khóa học đã đăng ký. Lý do: Giảm truy vấn database.
- **POST /user/get-course-progress**: Cache tiến độ khóa học. Lý do: Truy xuất nhiều, cần phản hồi nhanh.
- **POST /user/add-rating**: Rate limiting số lần gửi đánh giá. Lý do: Ngăn spam, kiểm soát tần suất.

## RabbitMQ (Xử lý không đồng bộ)
RabbitMQ được sử dụng cho các tác vụ nền hoặc không đồng bộ, đảm bảo độ tin cậy và khả năng retry.

### Educator Routes
- **POST /educator/add-course**: Xử lý upload ảnh hoặc thông báo cho admin. Lý do: Upload ảnh tốn thời gian, cần xử lý nền.
- **PUT /educator/courses/:id**: Xử lý cập nhật ảnh hoặc thông báo. Lý do: Cần xử lý không đồng bộ.

### User Routes
- **POST /user/purchase**: Xử lý thanh toán và gửi email xác nhận. Lý do: Gửi email và cập nhật trạng thái cần độ tin cậy cao.
- **POST /user/update-course-progress**: Gửi thông báo (nếu cần) khi cập nhật tiến độ. Lý do: Xử lý tác vụ phụ không đồng bộ.

### Webhook Routes
- **POST /webhook/clerk**: Xử lý sự kiện user management (tạo, cập nhật, xóa). Lý do: Webhook cần xử lý đáng tin cậy, có thể retry.
- **POST /webhook/stripe**: Xử lý sự kiện thanh toán (xác nhận, hoàn tiền). Lý do: Đảm bảo không mất sự kiện thanh toán.