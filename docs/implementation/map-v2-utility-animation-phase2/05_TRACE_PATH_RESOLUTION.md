# Cơ chế Phân giải Tuyến Truy vết Nguồn — Giai đoạn 2 (Trace Path Resolution Specification)

> **Phân hệ**: Giải thuật Phân giải Chuỗi Nguồn Gốc Đồ thị (Deterministic Upstream Parent Chain)  
> **Tệp mã nguồn**: `frontend/src/components/map-v2/utilityNetworkGraph.ts` (`resolveTracePath()`)  
> **Tương tác**: Nhấp chọn đồng hồ đo trên bản đồ hoặc danh sách kiểm tra

---

## 1. Nguyên lý Truy vết Tất định Không Không Gian (Non-Spatial Pure Graph Traversal)

Giai đoạn 2 nghiêm cấm tuyệt đối việc sử dụng các giải thuật tìm đường không gian tự do (Spatial Dijkstra hay A*) trên mặt phẳng 2D để tìm đường dây điện hay đường ống nước. 

Vì mạng lưới kỹ thuật là một **Cây Định hướng (Directed Tree)**, từ bất kỳ đồng hồ nào cũng chỉ tồn tại **duy nhất một đường đi ngược lên nút nguồn gốc**. Do đó, thuật toán truy vết hoạt động theo nguyên lý tra cứu con trỏ cha (Parent Pointer Walk):

```typescript
public resolveTracePath(targetNodeIdOrMeterCode: string): TracePathResult {
  // 1. Xác định nút đích thông qua nodeId hoặc meterCode
  const targetNode = this.nodes.get(targetNodeIdOrMeterCode) 
    || Array.from(this.nodes.values()).find(n => n.meterCode === targetNodeIdOrMeterCode);
    
  if (!targetNode) return emptyResult;

  const nodeChain: string[] = [targetNode.id];
  const edgeChain: string[] = [];
  let curr: string | null = targetNode.id;

  // 2. Đi ngược lên gốc theo con trỏ parentEdgeId
  while (curr && curr !== this.sourceNodeId) {
    const edge = this.incomingEdgeByNode.get(curr);
    if (!edge) break;
    edgeChain.push(edge.id);
    nodeChain.push(edge.sourceNodeId);
    curr = edge.sourceNodeId;
  }

  // 3. Đảo ngược danh sách để có thứ tự từ Nguồn -> Đồng hồ
  nodeChain.reverse();
  edgeChain.reverse();
  return { nodeChain, edgeChain, targetMeterCode: targetNode.meterCode };
}
```

- **Độ phức tạp thời gian**: $\mathcal{O}(h)$ với $h \le 5$ (chiều cao tối đa của cây). Thời gian thực thi xấp xỉ $\approx 0.01\text{ ms}$.
- **Tính tất định**: 100% không phụ thuộc tọa độ, không phụ thuộc zoom, không phát sinh lỗi lệch đường.

---

## 2. Bảng Tra cứu Chuỗi Truy vết Hoàn chỉnh (Complete Trace Chains)

### Mạng Điện (`ELECTRICITY`):

| Đồng hồ đo | Nút vị trí | Chuỗi cạnh từ Nguồn $\to$ Đích | Chuỗi nút nguồn $\to$ Đích |
| :--- | :--- | :--- | :--- |
| **`SIM-EM-001`** | `SIM-MDB-01` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` |
| **`SIM-EM-002`** | `SIM-FDR-BERTH` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-07` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-BERTH` |
| **`SIM-EM-003`** | `SIM-FDR-WEST` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-05` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-WEST` |
| **`SIM-EM-004`** | `SIM-FDR-CENTER`| `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-08` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-CENTER` |
| **`SIM-EM-005`** | `SIM-FDR-CFS` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-10` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-CFS` |
| **`SIM-EM-006`** | `SIM-FDR-TECH` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-04` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-TECH` |
| **`SIM-EM-007`** | `SIM-YDB-C01` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-08` $\to$ `E-B2-09` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-CENTER` $\to$ `YDB-C01` |
| **`SIM-EM-008`** | `SIM-YDB-W01` | `E-B2-01` $\to$ `E-B2-02` $\to$ `E-B2-03` $\to$ `E-B2-05` $\to$ `E-B2-06` | `GRID` $\to$ `SS-01` $\to$ `TR-01` $\to$ `MDB-01` $\to$ `FDR-WEST` $\to$ `YDB-W01` |

### Mạng Nước (`WATER`):

| Đồng hồ đo | Nút vị trí | Chuỗi cạnh từ Nguồn $\to$ Đích | Chuỗi nút nguồn $\to$ Đích |
| :--- | :--- | :--- | :--- |
| **`SIM-WM-001`** | `SIM-WIN-01` | `W-B2-01` | `WATER` $\to$ `WIN-01` |
| **`SIM-WM-002`** | `SIM-WP-B01` | `W-B2-01` $\to$ `W-B2-02` $\to$ `W-B2-04` | `WATER` $\to$ `WIN-01` $\to$ `WJ-01` $\to$ `WP-B01` |
| **`SIM-WM-003`** | `SIM-WP-CFS-01`| `W-B2-01` $\to$ `W-B2-02` $\to$ `W-B2-05` | `WATER` $\to$ `WIN-01` $\to$ `WJ-01` $\to$ `WP-CFS-01` |
| **`SIM-WM-004`** | `SIM-FP-01` | `W-B2-01` $\to$ `W-B2-02` $\to$ `W-B2-03` | `WATER` $\to$ `WIN-01` $\to$ `WJ-01` $\to$ `FP-01` |

---

## 3. Hệ số Trực quan Hóa Tuyến Truy vết (Visual Highlighting Metrics)

Khi một tuyến truy vết được kích hoạt:

1. **Tuyến cáp/ống thuộc chuỗi truy vết (`isTraced`)**:
   - Độ mờ: **`1.0` (100% rực rỡ)**.
   - Bề rộng nét vẽ tăng **`+25%`** so với chuẩn tĩnh.
   - Chế độ Neon: bổ sung bộ lọc phát sáng quang học `feGaussianBlur` (`url(#utility-glow-elec)` hoặc `url(#utility-glow-water)`).
2. **Tuyến không thuộc chuỗi truy vết (`!isTraced`)**:
   - Bị giảm độ tương phản mạnh (Dimming) với độ mờ: **`0.22` (22%)**.
3. **Các nút không thuộc chuỗi truy vết**:
   - Độ mờ giảm xuống **`0.35` (35%)**, vẫn đủ nhìn rõ bối cảnh không gian nhưng tôn lên đường dẫn chính.
4. **Nút đồng hồ đo mục tiêu (`isTargetMeter`)**:
   - Được bao bọc bởi một vòng hào quang xung lực (animated radar halo ring) bán kính 22px.
   - Hiển thị nhãn thẻ nổi bật màu hổ phách/lam đậm với mã hiệu chính thức `TRUY VẾT: SIM-EM-xxx`.

---

## 4. Tương tác Chuyển đổi và Hủy Truy vết (Switching & Toggle Off)

- **Chuyển đổi tức thời (Direct Switching)**: Khi đang truy vết `SIM-EM-004`, nhấp chuột vào `SIM-EM-007` sẽ lập tức cập nhật chuỗi truy vết mới trong 0ms mà không cần phải thu hồi và mở lại mạng lưới.
- **Hủy truy vết (Toggle Off)**: Khi nhấp lại vào chính đồng hồ đang được truy vết, máy trạng thái sẽ chuyển về `phase = 'expanded'`, phục hồi 100% độ sáng cho toàn bộ các nút và cạnh trên bản đồ.
