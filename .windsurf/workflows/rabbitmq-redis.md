---
description: instruction for project
---


## 📜 Nguyên tắc chung

- **Ngôn ngữ chính**: Chỉ sử dụng JavaScript (ES2022 trở lên) và TypeScript.
- **Phong cách code**: Tuân thủ nghiêm ngặt **Airbnb JavaScript Style Guide**. Sử dụng Prettier để tự động định dạng code.
- **Tính bất biến (Immutability)**: Ưu tiên sử dụng các cấu trúc dữ liệu bất biến, đặc biệt trong React và khi xử lý state.
- **Lập trình bất đồng bộ**: Luôn sử dụng `async/await` cho các tác vụ bất đồng bộ. Tránh sử dụng callbacks hoặc `.then()`.
- **Xử lý lỗi**: Triển khai cơ chế xử lý lỗi nhất quán. Mọi hàm `async` phải được bọc trong block `try...catch`. Các lỗi từ API phải trả về một đối tượng JSON có cấu trúc `{ success: false, message: '...' }`.
- **Biến môi trường**: Tất cả thông tin nhạy cảm (API keys, connection strings, secrets) phải được quản lý qua biến môi trường (sử dụng file `.env` và thư viện `dotenv`).
- **Comments**: Viết comment rõ ràng, súc tích cho các logic phức tạp. Sử dụng JSDoc cho tất cả các hàm để mô tả tham số, giá trị trả về, và chức năng.

---

## 🚀 Backend: Node.js & Express

- **Framework**: Sử dụng **Express.js** cho tất cả các web server.
- **Kiến trúc**: Áp dụng kiến trúc phân lớp (Layered Architecture): `Routes` -> `Controllers` -> `Services` -> `Data Access Layer (Models)`.
- **Routing**: Định nghĩa routes trong các file riêng biệt trong thư mục `/routes`. Sử dụng `express.Router()`.
- **Controllers**: Controller chỉ chịu trách nhiệm điều hướng request, gọi đến service tương ứng, và trả về response. Không chứa logic nghiệp vụ.
- **Services**: Toàn bộ logic nghiệp vụ (business logic) phải được đặt trong các file service.
- **Middleware**: Sử dụng middleware cho các tác vụ chung như xác thực (authentication), ghi log (logging), và xử lý lỗi.
- **API Response**: Mọi response từ API phải là JSON:
    - **Thành công (2xx)**: `{ success: true, data: {...} }`
    - **Lỗi (4xx, 5xx)**: `{ success: false, message: 'Mô tả lỗi' }`
- **Validation**: Sử dụng thư viện `joi` hoặc `express-validator` để xác thực dữ liệu đầu vào (request body, params, query).

---

## 🎨 Frontend: React

- **Components**: Luôn sử dụng **Functional Components** với **React Hooks**. Tránh sử dụng Class Components.
- **State Management**:
    - Sử dụng `useState` và `useReducer` cho state cục bộ của component.
    - Với state toàn cục (global state), ưu tiên sử dụng **Redux Toolkit** hoặc **Zustand**.
- **Styling**: Sử dụng **Styled-components** hoặc **Tailwind CSS** để viết CSS-in-JS hoặc utility-first CSS.
- **Fetching dữ liệu**: Sử dụng **Axios** hoặc `fetch` API kết hợp với custom hooks (ví dụ: `useFetch`) để gọi API từ backend.
- **Forms**: Sử dụng thư viện **React Hook Form** để quản lý form và validation.
- **Routing**: Sử dụng **React Router DOM** cho việc định tuyến phía client.
- **Cấu trúc thư mục**: