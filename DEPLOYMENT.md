# HƯỚNG DẪN ĐÓNG GÓI VÀ TRIỂN KHAI SẢN XUẤT
**Dự án:** `production-meter-reading` — Cảng Sài Gòn  
**Kiến trúc:** Đồng nguồn (Same-Origin) Mobile Web/PWA + Caddy Reverse Proxy + FastAPI Inference (CPU Baseline)

---

## PHẦN A: KIỂM THỬ ĐÓNG GÓI CỤC BỘ (LOCAL PRODUCTION-LIKE VALIDATION)

Quy trình này kiểm tra tính toàn vẹn của Docker Compose và tệp cấu hình trên máy phát triển mà **không yêu cầu kết nối mạng công cộng hoặc chứng chỉ SSL thật**.

### 1. Chuẩn bị môi trường
```bash
# 1. Tạo file cấu hình môi trường kiểm thử
cp .env.production.example .env

# 2. Đảm bảo thư mục models/ chứa đầy đủ trọng số AI cục bộ
# models/e2/best.pt
# models/ppocrv6_medium/inference/
# models/ppocrv6_medium/meter_digits_dict.txt
```

### 2. Kiểm tra cú pháp Compose & Build Images
```bash
# Kiểm tra cấu hình Docker Compose
docker compose -f docker-compose.prod.yml config

# Xây dựng các Docker images sản xuất
docker compose -f docker-compose.prod.yml build
```

### 3. Khởi chạy và Kiểm thử
```bash
# Khởi chạy dịch vụ ở chế độ background
docker compose -f docker-compose.prod.yml up -d

# Kiểm tra trạng thái sức khỏe container
docker compose -f docker-compose.prod.yml ps

# Kiểm thử endpoint sức khỏe qua Caddy Reverse Proxy (Port 80)
curl http://localhost/health
# Kết quả kỳ vọng: {"status":"ok","pipeline_version":"e2-adaptive-ppocrv6-medium-v1","models_loaded":true}

# Kiểm thử tải tệp PWA Manifest
curl http://localhost/manifest.webmanifest

# Kiểm thử đọc ảnh công tơ qua Same-Origin Reverse Proxy
curl -X POST -F "file=@/duong/dan/anh_cong_to.jpg" http://localhost/api/v1/read-meter
```

### 4. Dừng dịch vụ kiểm thử
```bash
docker compose -f docker-compose.prod.yml down
```

---

## PHẦN B: QUY TRÌNH TRIỂN KHAI SẢN XUẤT THỰC TẾ (REAL PRODUCTION DEPLOYMENT)

> [!IMPORTANT]
> **ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC TRƯỚC KHI DEPLOY THẬT**
> 
> Đội ngũ kỹ thuật **KHÔNG ĐƯỢC TRIỂN KHAI** khi chưa có đầy đủ 5 thông tin định danh từ Ban CNTT Cảng Sài Gòn:
> 1. **Vị trí máy chủ (Hosting):** Máy ảo Data Center nội bộ (On-premise) hay Máy ảo Cloud riêng (Cloud VM)?
> 2. **Tên miền chính thức (Domain):** Tên miền FQDN được cấp phép (ví dụ: `https://meter.saigonport.vn`)?
> 3. **Cấu hình DNS:** Bản ghi DNS A/AAAA đã trỏ chính xác về IP Public của máy chủ sản xuất?
> 4. **Chính sách mạng (Network):** Mở Port 80 (HTTP challenge) và Port 443 (HTTPS) trên Firewall?
> 5. **Chính sách Reverse Proxy:** Đã duyệt sử dụng Caddy Web Server tự động hóa chứng chỉ SSL?

### 1. Chuẩn bị máy chủ sản xuất
- **Cấu hình tối thiểu:** 2 vCPU, 4 GB RAM, 20 GB SSD (HĐH: Ubuntu 22.04 / 24.04 LTS).
- **Cấu hình khuyến nghị V1:** 4 vCPU, 8 GB RAM, 40 GB SSD.
- Đã cài đặt Docker Engine và Docker Compose Plugin.

### 2. Thiết lập thư mục và chuyển giao Trọng số AI
```bash
# 1. Clone mã nguồn ứng dụng (chỉ chứa mã nguồn, không chứa file models)
git clone https://github.com/KwanFam26022005/production-meter-reading.git /opt/production-meter-reading
cd /opt/production-meter-reading

# 2. Tạo thư mục models và sao chép trọng số AI từ kho lưu trữ bảo mật nội bộ
mkdir -p models/e2 models/ppocrv6_medium/inference
# Sao chép:
# - best.pt vào models/e2/
# - inference.json, inference.pdiparams vào models/ppocrv6_medium/inference/
# - meter_digits_dict.txt vào models/ppocrv6_medium/

# 3. Phân quyền chỉ đọc cho thư mục models
chmod -R 555 models
```

### 3. Cấu hình biến môi trường sản xuất
```bash
cp .env.production.example .env
nano .env
```
Thiết lập:
```env
ENVIRONMENT=production
APP_DOMAIN=meter.saigonport.vn   # Thay bằng tên miền chính thức đã phê duyệt
E2_DEVICE=cpu
MAX_UPLOAD_MB=12
```

### 4. Khởi chạy và Giám sát
```bash
# Build và khởi chạy container sản xuất
docker compose -f docker-compose.prod.yml up -d --build

# Theo dõi nhật ký khởi động và nạp model AI
docker compose -f docker-compose.prod.yml logs -f backend

# 5. Khởi tạo tài khoản nhân viên ban đầu (Nhập mật khẩu bảo mật qua getpass, không echo ký tự)
docker compose -f docker-compose.prod.yml exec backend python backend/scripts/create_user.py
```

---

## PHẦN C: QUY CHUẨN VẬN HÀNH & BẢO MẬT (OPERATIONAL STANDARDS)

1. **Khóa Đơn Tiến trình & Năng suất (Concurrency Baseline):**
   - V1 chạy với **1 Uvicorn Worker** (`workers = 1`).
   - Thời gian suy luận đơn lẻ trên CPU: `~1.42s`.
   - Năng suất lý thuyết: `~40–45 lượt đọc/phút`.
   - **Ngưỡng nâng cấp lên 2 Workers:** Nếu giám sát ghi nhận độ trễ p95 vượt quá `5.0s` trong ca làm việc và máy chủ có $\ge 4\text{ vCPU}$ & $\ge 8\text{GB RAM}$.

2. **Chỉ tiêu chất lượng vận hành đề xuất (Proposed Operational Targets):**
   - Thao tác đơn lẻ (Zero-queue): $\le 2.0\text{s}$.
   - Đợt tải nhỏ ($N \le 3$ yêu cầu đồng thời): p95 $\le 5.0\text{s}$.
   - Độ sẵn sàng dịch vụ: Giám sát `/health` đạt $\ge 99.9\%$ trong ca làm việc.

3. **Bảo vệ giới hạn tải lên (Upload Limits):**
   - Áp dụng **Chiến lược A (Strategy A)**: Giới hạn 12MB tại Client PWA (`file.size <= 12MB`) và tại Backend FastAPI (`MAX_UPLOAD_MB=12` trả về HTTP 413). Caddy 2.8 đóng vai trò reverse proxy ổn định, không dùng chỉ thị thể nghiệm.

4. **Quyền riêng tư dữ liệu ảnh:**
   - Cam kết kỹ thuật: **`NO APPLICATION-LEVEL IMAGE PERSISTENCE`**.
   - Ảnh được giải mã trực tiếp trong RAM và giải phóng tức thì sau khi trả kết quả JSON. Không lưu đĩa, không lưu CSDL, không ghi log body.

5. **Quy trình Nâng cấp & Hoàn nguyên (Update / Rollback):**
   ```bash
   # Nâng cấp phiên bản mới
   git fetch && git checkout <TAG_PHIEU_DUYET>
   docker compose -f docker-compose.prod.yml up -d --build

   # Hoàn nguyên khẩn cấp nếu gặp sự cố
   git checkout <TAG_ON_DINH_TRUOC_DO>
   docker compose -f docker-compose.prod.yml up -d --build
   ```
