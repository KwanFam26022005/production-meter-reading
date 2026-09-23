# Cơ chế Xử lý Ngắt Quãng và Hủy Bỏ An Toàn — Giai đoạn 2 (Interruption & Cancellation Specification)

> **Phân hệ**: Quản lý Tiến trình Tương tác Bất đồng bộ & An toàn Đồ họa  
> **Tệp mã nguồn**: `frontend/src/components/map-v2/utilityNetworkStateMachine.ts`  
> **Video chứng thực**: `docs/implementation/map-v2-utility-animation-phase2/evidence/phase2-utility-animation-stress-interruption.webm`

---

## 1. Vấn đề Ngắt Quãng trong Giao diện Tương tác Nhanh (The Interruption Challenge)

Trong môi trường vận hành thực tế tại Cảng Sài Gòn, người dùng (điều phối viên, kỹ thuật viên) thường thao tác nhấp chuột nhanh, chuyển đổi liên tục giữa các chế độ bản đồ, hoặc nhấp ngắt quãng khi hoạt họa đang diễn ra dở dang:
1. Nhấp **Mở mạng** $\to$ ngay 100ms sau nhấp lại nút nguồn để **Thu hồi** $\to$ ngay 100ms sau lại nhấp **Mở mạng**.
2. Đang truy vết đồng hồ $A$ $\to$ nhấp liên tiếp sang đồng hồ $B, C, D$.
3. Mạng đang hoạt họa $\to$ chuyển đột ngột `utilityMode` sang `'off'` hoặc chuyển tab.

Nếu không có cơ chế quản lý vòng đời chặt chẽ, các vòng lặp hoạt họa trước đó sẽ tiếp tục chạy ngầm, ghi đè biến trạng thái không đồng bộ (State Tearing), dẫn đến các lỗi nghiêm trọng:
- Xuất hiện "nút ma" hoặc các đoạn đường dây bị đứt gãy treo lơ lửng.
- Hiện tượng giật hình (stuttering) do nhiều chu trình rAF tranh chấp nhau.
- Rò rỉ bộ nhớ (Memory Leak) khi component bị unmount nhưng timer/rAF vẫn chạy.

---

## 2. Giải pháp Kiến trúc: Mã thông báo Thế hệ (Generational Token Invariant)

Kiến trúc `UtilityNetworkController` sử dụng bộ đếm thế hệ `currentGen: number`:

```mermaid
sequenceDiagram
    autonumber
    actor User as Nhân viên Điều hành
    participant Ctrl as UtilityNetworkController
    participant Engine as rAF Animation Loop
    participant View as MapV2UtilityLayer (React)

    User->>Ctrl: Click Mở mạng (expand)
    Note over Ctrl: currentGen = 1<br/>tokenGen = 1
    Ctrl->>Engine: requestAnimationFrame(tick)
    Engine->>View: Render Frame 1..3 (t = 100ms)
    
    User->>Ctrl: Click Ngắt quãng Thu hồi (retract)
    Note over Ctrl: cancelAnimationFrame()<br/>currentGen = 2 (TĂNG THẾ HỆ)
    Note over Ctrl: tokenGen = 2
    Ctrl->>Engine: requestAnimationFrame(new tick)
    
    Note over Engine: Frame cũ (tokenGen 1) thức dậy:<br/>if (currentGen !== tokenGen) return;<br/>-> HỦY BỎ TỨC THÌ!
    
    Engine->>View: Render Frame mới của Thế hệ 2 (t = 0ms thu hồi)
```

### Mã nguồn Thực thi:
```typescript
public cancel(): void {
  if (this.currentRafId !== null) {
    cancelAnimationFrame(this.currentRafId);
    this.currentRafId = null;
  }
  this.currentGen++; // Vô hiệu hóa dứt điểm mọi callback rAF đang xếp hàng
}
```

---

## 3. Các Tình huống Ngắt Quãng Đã Xác minh (Verified Stress Test Cases)

Toàn bộ các ca thử nghiệm dưới đây đã được kiểm thử tự động trong `mapV2UtilityAnimationPhase2.test.ts` và ghi lại trực quan trong video `phase2-utility-animation-stress-interruption.webm`:

1. **Ngắt quãng Mở $\to$ Thu hồi $\to$ Mở liên tiếp trong 200ms**:
   - Máy trạng thái lập tức hủy tiến trình mở cũ, cập nhật trạng thái thu hồi, rồi chuyển tiếp trơn tru sang chu trình mở mới mà không bị xung đột frame.
2. **Chuyển đổi truy vết nhanh giữa 3 đồng hồ (`SIM-FDR-WEST` $\to$ `SIM-FDR-CENTER` $\to$ `SIM-MDB-01`)**:
   - Tuyến nguồn được tính toán lại ngay lập tức ($\mathcal{O}(h)$), quầng sáng và độ mờ 22%/35% dịch chuyển tức thời, không tồn tại độ trễ hoạt họa trung gian.
3. **Tắt lưới đột ngột khi đang hoạt họa dở dang (`utilityMode = 'off'`)**:
   - Hàm `resetCollapsed()` được gọi qua hook `useEffect`, dừng mọi rAF, xóa toàn bộ bộ đệm cạnh/nút, trả SVG về trạng thái rỗng trong 0ms.
4. **Hủy Component khi chuyển tab (Unmount Safe)**:
   - Hàm dọn dẹp `cleanup` của React `useEffect` trong `MapV2UtilityLayer.tsx` tự động gọi `c.cancel()`, đảm bảo zero rò rỉ rAF.
