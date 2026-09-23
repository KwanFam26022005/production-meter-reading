# Phase 4: Reverse Proxy & Staging Deployment Configuration

**Dự án:** `production-meter-reading` (Cảng Sài Gòn)  
**Tài liệu:** `05_REVERSE_PROXY_AND_DEPLOYMENT.md`  
**Mục tiêu:** Định cấu hình Reverse Proxy phục vụ hai cổng ứng dụng độc lập, bảo đảm trải nghiệm Same-Origin, SPA Deep-link fallback và tuyệt đối không làm lọt API path sang `index.html`.

---

## 1. Nguyên tắc Định tuyến Reverse Proxy

1. **Trải nghiệm Same-Origin:**
   - Trình duyệt nhân viên truy cập: `https://user.meter.saigonport.vn`
     - Tĩnh: phục vụ bundle `dist/user`
     - API: `/api/*` -> proxy tới `http://127.0.0.1:8000` (hoặc `http://backend:8000`)
   - Trình duyệt quản trị truy cập: `https://ops.meter.saigonport.vn`
     - Tĩnh: phục vụ bundle `dist/operations`
     - API: `/api/*` -> proxy tới `http://127.0.0.1:8000` (hoặc `http://backend:8000`)

2. **Chính sách SPA Fallback Chống Thủng Lỗ Tuyến (Routing Leak Protection):**
   - Các tuyến API (`/api/*`) và sức khỏe (`/health`) **tuyệt đối không bao giờ rơi xuống fallback `index.html`**. Nếu một API không tồn tại, backend phải trả về JSON HTTP 404/405/500, không được trả về mã HTML của trang web.
   - Chỉ các yêu cầu không khớp với static files và không bắt đầu bằng `/api/` hoặc `/health` mới fallback về `index.html` của cổng tương ứng.

3. **Bảo tồn Thuộc tính Giao thức:**
   - Bảo toàn HTTP Method và Request Body (cho multipart uploads lên đến 12MB).
   - Bảo toàn header Cookie và `Set-Cookie`.
   - Giữ nguyên header `X-CSRF-Token`.
   - Truyền đầy đủ `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP`.

---

## 2. Cấu hình Caddy Hai Cổng (Two-Site Caddyfile)

Dưới đây là cấu hình chuẩn hóa hỗ trợ triển khai thực tế với Caddy Web Server:

```caddyfile
# ==============================================================================
# 1. USER PORTAL (Mobile-First / PWA Hiện trường)
# ==============================================================================
{$USER_DOMAIN:user.localhost} {
    # 1.1. Chuyển tiếp API trực tiếp về backend FastAPI chung
    handle /api/* {
        reverse_proxy {$BACKEND_UPSTREAM:backend:8000} {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # 1.2. Chuyển tiếp Healthcheck về backend
    handle /health {
        reverse_proxy {$BACKEND_UPSTREAM:backend:8000}
    }

    # 1.3. Phục vụ tài nguyên tĩnh PWA và SPA fallback
    handle {
        root * /srv/user-web
        # Ưu tiên tìm file tĩnh, sau đó fallback về index.html
        try_files {path} /index.html
        file_server
    }

    # 1.4. Nhật ký truy cập có cấu trúc (không ghi log body nhạy cảm)
    log {
        output stdout
        format json
    }
}

# ==============================================================================
# 2. OPERATIONS PORTAL (Desktop-First / Quản trị & Điều hành Cảng)
# ==============================================================================
{$OPERATIONS_DOMAIN:ops.localhost} {
    # 2.1. Chuyển tiếp API trực tiếp về CÙNG một backend FastAPI
    handle /api/* {
        reverse_proxy {$BACKEND_UPSTREAM:backend:8000} {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # 2.2. Chuyển tiếp Healthcheck về backend
    handle /health {
        reverse_proxy {$BACKEND_UPSTREAM:backend:8000}
    }

    # 2.3. Phục vụ tài nguyên tĩnh Quản trị và SPA fallback
    handle {
        root * /srv/operations-web
        try_files {path} /index.html
        file_server
    }

    # 2.4. Nhật ký truy cập có cấu trúc
    log {
        output stdout
        format json
    }
}
```

---

## 3. Cấu hình Dockerfile Độc lập cho Staging & Production

### 3.1. `Dockerfile.user-web`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build:user

FROM caddy:2.8-alpine
COPY deployment/caddy/Caddyfile.user /etc/caddy/Caddyfile
COPY --from=builder /build/dist/user /srv/user-web
EXPOSE 80 443
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
```

### 3.2. `Dockerfile.operations-web`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build:operations

FROM caddy:2.8-alpine
COPY deployment/caddy/Caddyfile.operations /etc/caddy/Caddyfile
COPY --from=builder /build/dist/operations /srv/operations-web
EXPOSE 80 443
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
```

---

## 4. Kiểm thử Môi trường Staging Cục bộ (Local Staging Verification)

Trong môi trường phát triển cục bộ (Windows), hai ứng dụng có thể được chạy đồng thời với máy chủ phát triển Vite:
- **User Portal:** `http://localhost:5173` (chạy script `npm run dev:user`)
- **Operations Portal:** `http://localhost:5174` (chạy script `npm run dev:operations`)
- Cả hai đều proxy `/api/*` về chung backend tại `http://127.0.0.1:8000`.
