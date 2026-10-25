# Nâng Cấp Tương Tác Kéo Nam Châm, Đồ Họa PBR 3D & Giao Diện Tràn Viền (EM-Induction 3D Lab)

Bản kế hoạch này giải quyết triệt để vấn đề tương tác kéo nam châm trên cảnh 3D, nâng cấp toàn bộ mô hình dụng cụ thí nghiệm theo phong cách phòng thí nghiệm vật lí hiện đại (vật liệu PBR kim loại, đồng tráng men, kính trong suốt có chiều sâu), và chuyển sang bố cục sân khấu 3D tràn 100% màn hình với các bảng chức năng có thể thu gọn hoàn toàn.

## User Review & Critical Decisions

> [!IMPORTANT]
> Các quyết định thiết kế dưới đây đã được chốt dựa trên lựa chọn của bạn để ưu tiên trải nghiệm kéo trực tiếp mượt mà và không gian quan sát 3D rộng rãi nhất.

- **Confirmed Decision 1 — Thao tác Kéo Nam Châm & Xoay Camera Tự Động**: Chạm/nhấp trực tiếp vào thanh nam châm (hoặc đế trượt) để kéo mượt dọc trục cuộn dây từ mọi góc nhìn; chạm/kéo ở vùng nền bên ngoài nam châm sẽ tự động xoay/thu phóng góc nhìn 3D mà không cần bấm chuyển đổi chế độ thủ công.
- **Confirmed Decision 2 — Đồ Họa Dụng Cụ Thí Nghiệm PBR Hiện Đại**: Dựng lại chi tiết các cụm mô hình 3D gồm thanh nam châm vát cạnh gắn trên con trượt ray đôi inox, cuộn cảm ứng ống acrylic trong suốt quấn dây đồng nhiều lớp, điện kế kim bàn nghiêng có mặt kính và kim đối trọng, bộ nguồn DC có màn hình hiển thị và khóa K cầu dao đồng.
- **Confirmed Decision 3 — Sân Khấu 3D Tràn 100% Màn Hình & Ngăn Kéo Ẩn/Hiện**: Mở rộng không gian 3D phủ kín toàn bộ khung nhìn (`100vw × 100dvh`). Toàn bộ bảng Giải thích, Thông số nâng cao, Câu hỏi dự đoán và Sơ đồ 2D được gom vào ngăn kéo trượt có thể đóng hoàn toàn để không che khuất mô hình.

---

## 1. Overview & Core Concept

- **What It Does**: Nâng cấp phòng thí nghiệm ảo 3D Cảm ứng điện từ Lớp 9 thành một không gian thực hành trực quan, nơi học sinh nắm kéo thanh nam châm hoặc đóng/ngắt khóa K ngay trên mô hình 3D sắc nét và quan sát phản ứng tức thời của kim điện kế theo định luật Faraday–Lenz.
- **Target Audience / Persona**: Học sinh lớp 9 và giáo viên môn Khoa học tự nhiên sử dụng trên điện thoại (iPhone, Android) và máy tính trên lớp học hoặc tự học tại nhà.
- **Key Value**: Thao tác kéo trực tiếp nhạy bén ở mọi góc nhìn camera, hình ảnh dụng cụ 3D chân thực dễ quan sát chiều dòng điện cảm ứng, và giao diện gọn gàng tối đa hóa vùng nhìn 3D.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Tương tác trực tiếp trên sân khấu 3D**: Khi di chuột hoặc chạm vào nam châm, con trượt sáng lên kèm biểu tượng mũi tên dẫn hướng `◄ KÉO ►`. Học sinh kéo sang phải (lại gần cuộn dây) hoặc sang trái (ra xa), kim điện kế lệch ngay theo tốc độ kéo tay và tự động trở về `0` ngay khi dừng kéo. Khi kéo ở khoảng không bên ngoài nam châm, camera tự động xoay mượt quanh bàn thí nghiệm.
  2. **Điều khiển nhanh ở thanh Dock gọn dưới đáy**: Các thao tác cốt lõi (Bắt đầu tự động / Tạm dừng, Đảo cực N–S, Đóng/Ngắt khóa K, Đặt lại, Bật/Tắt đường sức từ & hạt dòng điện) nằm trên một thanh Dock nhỏ gọn dưới đáy và có thể thu gọn chỉ bằng 1 chạm.
  3. **Mở ngăn kéo Học tập & Giải thích khi cần**: Khi học sinh muốn xem bảng phân tích Faraday–Lenz chi tiết, làm 4 câu hỏi dự đoán, đổi thông số mạch RL hoặc xem sơ đồ 2D, chỉ cần bấm mở ngăn kéo trượt và đóng lại ngay khi xem xong.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Phòng thí nghiệm quang-điện từ hiện đại (Precision Modern Physics Lab) với độ tương phản cao, bề mặt vật liệu kim loại phay xước, đồng đỏ tráng men và kính quang học.
  - *Color Palette & Mood*: Nền phòng thí nghiệm xanh xám ánh thép dịu mắt (`#0f172a` đến `#1e293b`) giúp làm nổi bật cuộn dây đồng (`#d97706`), cực Bắc đỏ tươi (`#ef4444`), cực Nam xanh coban (`#2563eb`), mặt đồng hồ điện kế trắng sáng (`#f8fafc`) và hạt dòng điện vàng sáng (`#facc15`).
  - *Typography & Hierarchy*: Tiêu đề và điều khiển dùng `Plus Jakarta Sans`, các chỉ số đo lường thời gian thực ($\Phi$, $d\Phi/dt$, $\mathcal{E}$, góc lệch kim) dùng `IBM Plex Mono` (`tabular-nums`) để số không bị nhảy ngang khi cập nhật 60fps.
  - *Component Styling & Layout*: Canvas 3D chiếm 100% diện tích màn hình (`100dvh`), thanh trạng thái mảnh ở trên cùng, thanh Dock điều khiển ở đáy chiếm dưới 12% chiều cao màn hình, và ngăn kéo thông tin đóng/mở linh hoạt.
- **Interactive Feedback & Motion**:
  - Hiệu ứng phát sáng nhẹ (hover/drag highlight) trên con trượt nam châm và tay cầm khóa K khi người dùng chạm hoặc rê chuột vào.
  - Vòng cực cảm ứng Lenz ở đầu cuộn dây đổi màu Đỏ (cực Bắc cảm ứng) hoặc Xanh (cực Nam cảm ứng) tỉ lệ thuận với cường độ dòng điện cảm ứng.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Chiếu tia Raycasting lên mặt phẳng chứa trục X hướng về Camera**:
  - *Chosen Approach*: Khi người dùng chạm vào nam châm, hệ thống tạo một mặt phẳng ảo đi qua trục chuyển động X và luôn hướng về phía camera hiện tại để tính tọa độ kéo.
  - *Why*: Khắc phục hoàn toàn lỗi không kéo được nam châm hoặc nam châm bị nhảy vị trí khi người dùng nhìn từ trên cao hoặc nhìn nghiêng.
  - *Alternatives Considered*: Dùng mặt phẳng cố định `Z = 0` (dễ bị suy biến góc chiếu khi camera xoay lên cao).
- **Decision 2 — Tự động phân tách thao tác Kéo vật thể và Xoay Camera bằng Hit-Testing**:
  - *Chosen Approach*: Kiểm tra va chạm tia (`raycaster.intersectObjects`) ngay tại sự kiện `pointerdown`. Nếu trúng nam châm hoặc khóa K thì khóa tạm thời `OrbitControls` và bắt đầu kéo vật thể (`setPointerCapture`); nếu chạm vùng trống thì giao quyền cho `OrbitControls` xoay góc nhìn.
  - *Why*: Học sinh có thể vừa kéo nam châm vừa xoay góc nhìn tự nhiên bằng 1 ngón tay mà không cần tìm nút chuyển chế độ.
- **Decision 3 — Bố cục Toàn cảnh 3D (Full-Viewport Canvas) + Ngăn kéo Thu gọn**:
  - *Chosen Approach*: Gỡ bỏ cột bên phải cố định đang chiếm 40% màn hình; chuyển toàn bộ bảng Giải thích, Thông số và Dự đoán vào ngăn kéo có thể đóng/mở tùy ý, kèm nút ẩn nhanh mọi lớp phủ (Zen Mode).
  - *Why*: Giúp mô hình 3D lớn, rõ nét trên cả màn hình điện thoại dọc lẫn máy tính.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Full-Viewport 3D Stage (100dvh)                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                EMInductionSceneController (Three.js)               │  │
│  │  • Smart Pointer Router: Hit Magnet/Switch ──► Drag / Toggle       │  │
│  │                          Hit Background    ──► OrbitControls       │  │
│  │  • High-Detail PBR Models: Beveled Magnet + CNC Slider + Acrylic   │  │
│  │    Multi-Layer Copper Coil + Sloped Galvanometer + Knife Switch    │  │
│  └───────────────▲────────────────────────────────────┬───────────────┘  │
│                  │ Sync 60fps State                   │ Drag / Switch    │
│  ┌───────────────┴────────────────────────────────────▼───────────────┐  │
│  │              Faraday–Lenz Physics Engine (FIXED_DT)                │  │
│  │  • Instant Drag Velocity: v = (x_k - x_{k-1}) / dt                 │  │
│  │  • Induced EMF: E = -N · dΦ/dt  ──► Damped Galvanometer Needle     │  │
│  └───────────────┬────────────────────────────────────────────────────┘  │
│                  │                                                       │
│  ┌───────────────▼──────────────────┐  ┌──────────────────────────────┐  │
│  │  Collapsible Bottom Quick-Dock   │  │ Slide-Over / Bottom Drawer   │  │
│  │  • Play/Pause, Flip N/S, Switch  │  │ (Hidden by default / Toggle) │  │
│  │  • Toggle Field Lines & Current  │  │ • Faraday-Lenz Explanation   │  │
│  │  • Slider & Hide All UI Toggle   │  │ • 4 Prediction Quizzes & 2D  │  │
│  └──────────────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `physicsStateRef`: Lưu vị trí nam châm `magnetX`, vận tốc kéo tức thời `magnetVelocity`, từ thông $\Phi_k$, tốc độ biến thiên $d\Phi/dt$, suất điện động $\mathcal{E}$, dòng điện thứ cấp $I_s$, dòng sơ cấp $I_p$, và góc kim điện kế `needleAngleDeg`.
  - `uiOverlayState`: Quản lý trạng thái đóng/mở của thanh Dock dưới đáy (`isDockVisible`), ngăn kéo thông tin chuyên sâu (`activeDrawerTab: null | 'controls' | 'explanation' | 'predictions' | 'schematic2d'`), và chế độ ẩn toàn bộ giao diện (`isCleanView`).
- **Interactive Component & State Mapping**:
  - **Thao tác kéo trực tiếp 3D (`pointerdown` → `pointermove` → `pointerup`)**: Khi chạm trúng `magnetHitBox`, bật hiệu ứng sáng con trượt, tính vị trí `targetMagnetX` theo tia chiếu mặt phẳng hướng camera và cập nhật trực tiếp vào bộ giải vật lí ở mỗi bước `1/120s` để kim điện kế phản hồi tức thì.
  - **Thanh trượt vị trí đồng bộ 2 chiều**: Thanh trượt nhanh trên Dock cho phép kéo nam châm mượt trên cả thiết bị màn hình nhỏ và đồng bộ thời gian thực với vị trí nam châm 3D.
  - **Hệ thống Ẩn/Hiện các lớp hiển thị**: Các nút bật/tắt nhanh Đường sức từ, Hạt dòng điện, Nhãn chú thích 3D trên vật thể, và Ngăn kéo giải thích độc lập với nhau để học sinh tùy ý làm gọn màn hình.
