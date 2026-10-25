# EM-INDUCTION 3D LAB — SPEC V2
## Đặc tả khoa học và giao diện web di động cho mô phỏng 3D cảm ứng điện từ

**Phiên bản:** 2.0 — đã rà soát mô hình vật lí và yêu cầu web di động  
**Môn học:** Khoa học tự nhiên 9  
**Ngôn ngữ giao diện:** Tiếng Việt  
**Môi trường dự kiến:** Gemini 4 Argon trong Google AI Studio Build  
**Đầu ra:** Ứng dụng web 3D tương tác, ưu tiên điện thoại, có chế độ xem thí nghiệm mở rộng/toàn màn hình khi nền tảng hỗ trợ.

---

## 0. Chỉ thị quan trọng dành cho Gemini 4 Argon

Đọc toàn bộ đặc tả này trước khi viết mã. Sau đó **trực tiếp xây dựng ứng dụng web chạy được**, không chỉ trả về kế hoạch, hình minh họa hoặc mã giả.

Thứ tự ưu tiên bắt buộc:

1. Đúng định luật vật lí và quy ước dấu.
2. Hoạt động tốt trên web điện thoại, đặc biệt iPhone/Safari và Android/Chrome.
3. Tương tác thực sự: kéo nam châm, bật/tắt công tắc, điều khiển thí nghiệm.
4. Hiển thị 3D rõ ràng, dễ hiểu với học sinh lớp 9.
5. Kiểm thử, sửa lỗi rồi mới bổ sung hiệu ứng trang trí.

Không tạo các nút bấm giả. Không để kim điện kế lệch chỉ vì hoạt ảnh đang chạy. Không tuyên bố đã chạy thử trên thiết bị thật nếu không thực sự thực hiện việc đó. Nếu môi trường không cho phép thử trên iPhone vật lí, hãy ghi rõ đây là kiểm thử trình duyệt/mô phỏng kích thước màn hình chứ không phải kiểm thử trên thiết bị thật.

### Prompt khởi tạo ngắn

> Hãy đọc toàn bộ `EM_INDUCTION_3D_LAB_SPEC_V2.md` và xây dựng ứng dụng theo đặc tả. Tách riêng mô hình vật lí, đồ họa 3D và giao diện. Trước tiên hoàn thành hai thí nghiệm và các kiểm thử vật lí; sau đó tối ưu giao diện điện thoại. Chạy ứng dụng, kiểm tra các chức năng, sửa lỗi có thể tái hiện và báo rõ các giới hạn. Không giả định rằng iPhone Safari hỗ trợ toàn màn hình cho mọi phần tử HTML.

---

## 1. Mục tiêu học tập và phạm vi mô phỏng

Dựng phòng thí nghiệm ảo 3D cho hai thí nghiệm trong SGK:

1. Đưa nam châm vĩnh cửu lại gần hoặc ra xa cuộn dây dẫn nối với điện kế.
2. Đóng/ngắt dòng điện qua cuộn dây nam châm điện đặt gần cuộn dây cảm ứng.

Học sinh cần quan sát và giải thích được:

- Dòng điện cảm ứng xuất hiện khi từ thông qua mạch kín biến thiên.
- Chiều suất điện động/dòng điện cảm ứng phụ thuộc vào dấu của tốc độ biến thiên từ thông và định luật Lenz.
- Đảo chiều chuyển động hoặc đảo cực nam châm sẽ đảo chiều suất điện động trong các điều kiện tương ứng.
- Khi nam châm đứng yên tương đối với cuộn dây và từ trường không biến đổi, không có suất điện động cảm ứng do chuyển động đó.
- Ở thí nghiệm nam châm điện, dòng điện cảm ứng chỉ xuất hiện trong giai đoạn từ trường đang thay đổi; khi dòng điện sơ cấp đã ổn định thì kim trở về 0 sau quá trình quá độ.

**Phân biệt đúng:** Định luật Lenz nói rằng tác dụng từ của dòng điện cảm ứng chống lại **sự biến thiên từ thông gây ra nó**, không nên mô tả đơn giản là dòng điện luôn chống lại từ trường ngoài hoặc luôn chống lại chuyển động theo cùng một cách.

Ứng dụng này là mô phỏng giáo dục. Nếu không có thông số hiệu chuẩn của nam châm, cuộn dây, điện trở và điện kế, không được tuyên bố kết quả số là phép dự đoán chính xác cho dụng cụ thí nghiệm cụ thể.

---

## 2. Nền tảng và cấu trúc mã nguồn

### Công nghệ đề xuất

- React + TypeScript.
- Three.js; có thể sử dụng React Three Fiber/Drei nếu tương thích với dự án đang có.
- CSS responsive, WebGL.
- Vitest hoặc bộ kiểm thử tương đương cho các hàm vật lí nếu môi trường hỗ trợ.

Tận dụng dependency hiện có khi hợp lí; không nâng cấp hàng loạt các gói không liên quan.

### Phân tách trách nhiệm

1. `physics/`: từ thông, đạo hàm theo thời gian, suất điện động, dòng điện, mô hình mạch nam châm điện.
2. `scene/`: nam châm, cuộn dây, điện kế, dây nối, công tắc, nguồn, lõi sắt, đường sức từ.
3. `interaction/`: kéo nam châm, camera, thanh trượt, công tắc và chế độ thao tác.
4. `ui/`: bảng điều khiển, giải thích, câu hỏi và trạng thái mô phỏng.
5. `tests/`: kiểm thử dấu, giới hạn, trạng thái đứng yên/tạm dừng và tính nhất quán.

Đồ họa chỉ phản ánh trạng thái trả về từ mô hình vật lí. Không viết một hệ thống hoạt ảnh thứ hai tự quyết định chiều kim hoặc dòng điện.

---

## 3. Mô hình vật lí: quy ước và giới hạn

### 3.1. Định luật Faraday–Lenz

Với cuộn dây gồm `N` vòng, từ thông qua một vòng là `Φ`, suất điện động cảm ứng có quy ước dấu:

\[
\mathcal{E}=-N\frac{d\Phi}{dt}
\]

Dạng sai phân:

\[
\mathcal{E}_k=-N\frac{\Phi_k-\Phi_{k-1}}{\Delta t}
\]

Quy ước dấu của `Φ` phải được xác định bằng một pháp tuyến dương cố định của mặt phẳng cuộn dây. Không được đổi quy ước này giữa các frame hoặc khi đảo camera.

- `Φ`: từ thông qua **một vòng dây**.
- `NΦ`: từ thông móc vòng của cuộn dây trong mô hình các vòng có từ thông gần bằng nhau.
- `N`: số vòng dây.
- `Δt`: thời gian mô phỏng tính bằng giây mô phỏng, không phải thời gian frame bất định.

Từ thông biến thiên có thể do từ trường thay đổi, diện tích mạch thay đổi, hoặc hướng của mạch thay đổi. Trong thí nghiệm này, giữ hình dạng/hướng cuộn dây cố định và thay đổi vị trí nam châm hoặc cường độ từ trường nam châm điện.

### 3.2. Tính dòng điện thứ cấp

**Mô hình cơ bản cho thí nghiệm lớp học:** giả sử tổng điện trở của cuộn dây, dây nối và điện kế là `R_total`, đồng thời bỏ qua ảnh hưởng đáng kể của độ tự cảm mạch thứ cấp:

\[
I_s=\frac{\mathcal{E}}{R_{total}}
\]

Đây là giả thiết mạch thuần trở/điện trở chi phối, dùng để minh họa chiều và xu hướng dòng điện. Trong mạch thực, độ tự cảm có thể làm dòng điện biến đổi theo thời gian; không được gọi mô hình đơn giản này là mô phỏng mạch điện đầy đủ.

Nếu triển khai mô hình thứ cấp có độ tự cảm, hãy dùng phương trình mạch RL nhất quán:

\[
L_s\frac{dI_s}{dt}+R_{total}I_s=\mathcal{E}(t)
\]

Không sử dụng đồng thời `I = E/R` và mô hình RL như hai công thức độc lập cho cùng một trạng thái.

### 3.3. Mô hình từ thông của nam châm vĩnh cửu

Mô hình nam châm thanh thật có phân bố từ trường phức tạp. Không thể suy ra từ thông chính xác chỉ từ vị trí thanh nam châm nếu chưa xác định hình học, vật liệu và độ từ hóa.

Có hai lựa chọn hợp lệ:

**Chế độ A — Mô phỏng định tính (mặc định cho bản đầu):**

- Dùng một hàm trơn `Phi(x, polarity)` có dấu nhất quán, phụ thuộc khoảng cách giữa nam châm và cuộn dây.
- Hàm phải đạt mức biến thiên lớn hơn khi nam châm di chuyển qua vùng từ trường biến thiên mạnh, và biến thiên nhỏ dần khi nam châm ở xa.
- Hàm phải đối xứng/nhất quán với hình học đã chọn, không có bước nhảy đột ngột.
- Đảo cực nam châm đảo dấu từ thông.
- Khi nam châm đứng yên, `dPhi/dt = 0`.
- Hiển thị nhãn **“Mô hình định tính — giá trị đã chuẩn hóa, không phải phép đo thực”** khi hiển thị số chuẩn hóa.

**Chế độ B — Xấp xỉ lưỡng cực từ (tùy chọn):**

Với một lưỡng cực từ lý tưởng có mômen từ `m`, nằm trên trục của một vòng dây tròn bán kính `a`, từ thông qua đĩa vòng dây ở khoảng cách trục `z` có thể được biểu diễn bằng xấp xỉ lưỡng cực:

\[
\Phi(z)\approx\frac{\mu_0 m a^2}{2(a^2+z^2)^{3/2}}
\]

Trong đó `m` là mômen lưỡng cực từ có dấu theo hướng quy ước, `a` là bán kính vòng dây, `z` là khoảng cách từ tâm lưỡng cực tới mặt phẳng vòng dây, và `μ0` là độ từ thẩm chân không. Công thức này thuộc mô hình lưỡng cực lý tưởng; **không được xem là công thức chính xác phổ quát cho thanh nam châm thật ở mọi khoảng cách**. Nó không nên được sử dụng để khẳng định trường chính xác khi thanh nam châm ở rất gần cuộn dây hoặc khi mô hình điểm lưỡng cực không còn phù hợp.

Nếu chọn chế độ B:

- Giữ thanh nam châm ở vùng hình học mà xấp xỉ có ý nghĩa; không cho mô hình điểm lưỡng cực đi xuyên qua mặt phẳng cuộn dây.
- Ghi rõ các giả thiết và thông số giả định.
- Không hiển thị đơn vị Wb/V/A như kết quả đo đã hiệu chuẩn nếu tham số `m`, kích thước và mạch chưa được xác định thực.

Trong cả hai chế độ, chỉ cần đảm bảo đúng vật lí về dấu và xu hướng theo điều kiện được hiển thị. Không được bịa các giá trị thực nghiệm.

### 3.4. Tính ổn định số

- Dùng bước tính vật lí cố định hoặc accumulator độc lập với tốc độ render, ví dụ `1/120 s` thời gian mô phỏng.
- Không chia cho `Δt = 0`.
- Khi khởi động, đặt lại hoặc tiếp tục sau khi tạm dừng, đồng bộ `Phi_previous` với từ thông hiện tại để tránh xung cảm ứng giả.
- Khi kéo nam châm dừng lại, vận tốc chuyển động về 0 và suất điện động phải về 0; không giữ kim lệch vì giá trị lịch sử bị kẹt.
- Dùng ngưỡng số nhỏ để loại bỏ nhiễu làm kim rung, nhưng không làm mất các biến thiên vật lí rõ ràng.
- Khi tab trình duyệt chuyển nền, giảm/dừng animation; khi quay lại phải đồng bộ trạng thái thời gian để không phát sinh xung điện áp giả.

### 3.5. Kim điện kế

Độ lệch mục tiêu có thể được ánh xạ theo:

\[
\theta_{target}=\operatorname{clamp}(K I_s,-\theta_{max},+\theta_{max})
\]

`K` là hệ số độ nhạy giả định/hiệu chuẩn. Mô hình cơ học của kim có thể dùng giảm chấn bậc hai hoặc lọc mượt để thể hiện quán tính. Phần giảm chấn chỉ mô tả phản ứng của kim, không được làm thay đổi chiều dòng điện.

- `I_s = 0` ở trạng thái ổn định thì kim trở về 0.
- Đổi dấu `I_s` thì kim hướng sang phía đối diện.
- Đảo hai đầu dây nối điện kế phải đảo dấu hiển thị của kim, nhưng không được đổi kết quả vật lí của suất điện động trong chính cuộn dây.
- Nếu chưa hiệu chuẩn `K`, chỉ hiển thị góc/độ lệch tương đối, không gọi là số đọc thực của điện kế thật.

### 3.6. Chiều dòng điện và định luật Lenz

Xác định một quy ước cụ thể cho trục cuộn dây, pháp tuyến dương và hướng nhìn điện kế. Mọi thành phần UI và 3D phải sử dụng cùng quy ước đó.

Khi cực N của nam châm tiến lại gần một vòng dây, mặt cuộn dây gần nam châm phải tạo cực từ chống lại sự tăng từ thông do nam châm gây ra. Với góc nhìn từ phía nam châm, chiều dòng điện quanh vòng phải tương ứng với quy tắc bàn tay phải. Khi kéo nam châm ra xa trong cùng cấu hình, dòng điện đảo chiều; khi đảo cực nam châm nhưng giữ nguyên chuyển động, dòng điện cũng đảo chiều.

Không chỉ gán một nhãn “dòng điện thuận/ngược” theo nút bấm. Chiều phải được tính từ dấu của `-d(NΦ)/dt` và ánh xạ qua quy ước đấu dây.

---

## 4. Vật thể và đồ họa 3D

### 4.1. Nam châm vĩnh cửu

- Thanh nam châm dạng hộp chữ nhật, cực `N` màu đỏ, cực `S` màu xanh dương; ký hiệu lớn, dễ đọc.
- Di chuyển dọc trục cuộn dây.
- Có nút đảo cực; việc đảo cực đổi hướng mômen từ trong mô hình vật lí và hướng trường trên hình.
- Chuyển động có giới hạn; không xuyên qua cuộn dây hoặc khiến mô hình điểm lưỡng cực đi qua mặt phẳng cuộn dây nếu dùng xấp xỉ lưỡng cực.
- Kéo được bằng cảm ứng/chuột. Kéo nam châm không được vô tình kéo xoay camera cùng lúc.

### 4.2. Cuộn dây

- Cuộn dây đồng 3D nhiều vòng quấn quanh ống trụ.
- Hai đầu dây đi ra ngoài và nối thành mạch kín với điện kế.
- Trục cuộn dây cố định, trùng với trục chuyển động nam châm.
- Dùng 20–40 vòng hình học nhìn thấy rõ nếu cần cân bằng hiệu năng. Mô hình tính toán dùng `N` độc lập; số vòng vẽ ra không bắt buộc bằng `N` vật lí, nhưng phải ghi đây là biểu diễn trực quan nếu khác nhau.

### 4.3. Điện kế

- Vỏ và mặt số có chiều sâu, vạch chia rõ ràng ở hai phía số 0.
- Kim quay quanh trục thật, không chỉ thay đổi hình ảnh mặt số.
- Hai cọc nối dây hiển thị rõ.
- Có giảm chấn nhẹ.
- Tạo nhãn nhỏ “chiều dương theo quy ước đấu dây” để học sinh hiểu vì sao dấu trái/phải có tính quy ước.

### 4.4. Dây dẫn và hạt chỉ chiều dòng điện

- Dây đồng có đường đi cong hợp lí, không xuyên vật thể.
- Có thể bật/tắt hạt sáng di chuyển dọc mạch để thể hiện **chiều dòng điện quy ước**.
- Dòng bằng 0 thì hạt dừng.
- Ghi chú ngắn: “Chiều dòng điện quy ước ngược chiều chuyển động có hướng của electron trong dây kim loại.”
- Hạt chỉ chiều là công cụ trực quan, không đại diện cho tốc độ electron thật.

### 4.5. Đường sức từ

- Bên ngoài thanh nam châm, mũi tên đi từ N đến S; đường sức từ là các đường khép kín, với chiều bên trong nam châm từ S về N.
- Khi đảo cực, chiều mũi tên đảo.
- Khi nam châm tịnh tiến, hình dạng trường thay đổi theo vị trí, nhưng không được đảo chiều tùy tiện chỉ vì vận tốc đổi dấu.
- Phân biệt màu/kiểu hiển thị đường sức từ với các hạt dòng điện trên dây.
- Nếu không giải trường số thực, ghi rõ đây là **đường sức minh họa định tính**.

### 4.6. Nam châm điện

- Cuộn dây sơ cấp riêng, lõi sắt, nguồn một chiều và công tắc rõ ràng.
- Cuộn dây cảm ứng thứ cấp đặt gần đó, nối với điện kế.
- Dùng sơ đồ dây dẫn nhất quán và đủ rõ để học sinh nhận ra hai mạch khác nhau.
- Có thể bật lớp đường sức từ để quan sát sự tăng/giảm trường theo dòng sơ cấp.

### 4.7. Ánh sáng và vật liệu

- Nền bàn thí nghiệm trung tính, chữ và kim có độ tương phản cao.
- Vật liệu đồng/kim loại 3D nhưng không quá bóng.
- Bóng đổ và hiệu ứng phản chiếu được giảm trên thiết bị yếu.
- Không sử dụng bloom/glow quá mạnh làm nhòe nhãn N/S hoặc kim điện kế.

---

## 5. Thí nghiệm 1 — Nam châm vĩnh cửu

### Điều khiển

- Bắt đầu / Tạm dừng / Tiếp tục / Đặt lại.
- Đảo cực N/S.
- Thanh trượt tốc độ: chậm / bình thường / nhanh.
- Kéo nam châm bằng tay.
- Hiện/ẩn đường sức từ.
- Bật/tắt hạt biểu diễn chiều dòng điện.
- Chế độ kéo nam châm và chế độ xoay camera là hai chế độ rõ ràng, không tranh cùng một thao tác cảm ứng.

### Kết quả vật lí mong đợi

| Trạng thái | Kết quả |
|---|---|
| Nam châm đứng yên tương đối với cuộn dây | `dΦ/dt = 0`; không có suất điện động cảm ứng do chuyển động; kim ở 0 sau quá trình quá độ. |
| Nam châm tiến lại gần | Từ thông thay đổi; suất điện động xuất hiện; kim lệch. |
| Dừng nam châm sau khi tiến lại gần | Suất điện động về 0; kim trở về 0. |
| Cùng cực, cùng vùng chuyển động nhưng kéo ra xa | Dấu `dΦ/dt` đảo; suất điện động và dòng cảm ứng đảo chiều. |
| Đảo cực, giữ nguyên chuyển động | Dấu từ thông và suất điện động đảo. |
| Tăng tốc độ trong vùng từ trường tương tự | Độ lớn `|dΦ/dt|` và suất điện động tăng; kim lệch nhiều hơn nếu chưa chạm giới hạn thang. |
| Nam châm ở xa | Sự biến thiên từ thông nhỏ hơn khi cùng tốc độ chuyển động trong vùng gần cuộn dây; kim có độ lệch nhỏ hơn. |

Không yêu cầu kim giữ độ lệch trong suốt lúc nam châm ở gần. Kim phản ánh dòng điện/độ lệch trong thời gian từ thông đang biến thiên và sau đó trở về 0 theo đáp ứng dụng cụ.

### Bảng trạng thái theo thời gian thực

- Vị trí tương đối: gần / xa.
- Trạng thái: đang tiến lại gần / đang ra xa / đứng yên.
- Từ thông: tăng / giảm / không đổi theo quy ước dấu.
- Suất điện động: dấu và độ lớn tương đối.
- Dòng điện: dấu và độ lớn tương đối.
- Kim điện kế: trái / 0 / phải theo quy ước.
- Giải thích ngắn dựa trên Faraday–Lenz.

Cần phân biệt rõ “độ lớn từ thông tăng/giảm” với “từ thông đại số tăng/giảm”. Ưu tiên dùng từ “từ thông đại số theo quy ước” khi hiển thị dấu; với học sinh lớp 9 có thể cung cấp thêm lời giải thích đơn giản.

---

## 6. Thí nghiệm 2 — Nam châm điện

### Các mạch cần thể hiện

- Mạch sơ cấp: nguồn một chiều → công tắc → cuộn dây nam châm điện.
- Mạch thứ cấp: cuộn dây cảm ứng → điện kế và dây nối.
- Hai mạch không nối điện trực tiếp với nhau; năng lượng được truyền qua tương tác từ trường.

### Mô hình quá độ của dòng sơ cấp

Khi đóng công tắc, có thể dùng mô hình RL đơn giản:

\[
L_p\frac{dI_p}{dt}+R_p I_p=V
\]

Với nguồn điện áp không đổi, nghiệm tăng dòng lý tưởng là:

\[
I_p(t)=I_{final}\left(1-e^{-t/\tau_{on}}\right)
\]

Khi ngắt công tắc, dòng điện trong cuộn cảm không thể tự biến mất tức thời trong mô hình mạch có đường xả. Dùng mô hình suy giảm:

\[
I_p(t)=I_{initial}e^{-t/\tau_{off}}
\]

`τ_on` và `τ_off` là tham số của mô hình; khi ngắt công tắc, việc dùng hàm suy giảm ngầm giả định có đường xả/nội trở phù hợp. Đây không phải mô hình hồ quang điện hoặc quá áp đóng cắt chi tiết.

### Mô hình cuộn thứ cấp

Nếu dùng mô hình tương hỗ:

\[
\mathcal{E}_s=-M\frac{dI_p}{dt}
\]

`M` là hệ số hỗ cảm giả định, phụ thuộc hình học và cách bố trí cuộn dây. Nếu mô phỏng RL cho cuộn thứ cấp, giải:

\[
L_s\frac{dI_s}{dt}+R_sI_s=\mathcal{E}_s
\]

Nếu dùng mô hình điện trở chi phối, có thể lấy `I_s = E_s/R_s` nhưng phải ghi rõ đã bỏ qua độ tự cảm thứ cấp. Chỉ chọn **một chế độ tính dòng thứ cấp** tại một thời điểm.

### Kết quả cần thấy

- Đóng công tắc: dòng sơ cấp tăng, từ trường tăng, từ thông thứ cấp biến thiên, kim lệch thoáng qua.
- Giữ công tắc đóng sau khi ổn định: `dI_p/dt ≈ 0`, suất điện động thứ cấp gần 0, kim trở về 0.
- Ngắt công tắc: dòng sơ cấp giảm theo mô hình xả, từ thông giảm, suất điện động có dấu ngược với lúc đóng công tắc; kim lệch phía đối diện trong quá trình quá độ.
- Sau khi dòng sơ cấp và từ thông đã ổn định ở mức 0: kim trở về 0.

Không để kim lệch vô hạn trong lúc công tắc đang đóng nếu dòng sơ cấp đã ổn định.

---

## 7. Thiết kế web ưu tiên điện thoại

### 7.1. Viewport và cấu trúc trang

Bắt buộc có cấu hình viewport phù hợp, tương đương:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Không tự ý đặt `user-scalable=no` hoặc giới hạn zoom trang; phải giữ khả năng phóng to chữ/trang để bảo đảm khả năng tiếp cận.

- Dùng `100dvh` khi có hỗ trợ, kèm fallback hợp lí như `100vh`.
- Xử lí vùng an toàn bằng `env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`.
- Không cố định chiều cao dựa trên một mẫu iPhone duy nhất.
- Theo dõi kích thước vùng chứa bằng `ResizeObserver` hoặc cơ chế tương đương; cập nhật camera và renderer khi đổi kích thước/xoay màn hình.
- Không có thanh cuộn ngang ở bất kỳ độ rộng hỗ trợ nào.

### 7.2. Bố cục dọc trên điện thoại

Trên màn hình hẹp, xếp theo thứ tự:

1. **Thanh tiêu đề nhỏ:** tên thí nghiệm, nút trợ giúp, nút mở rộng màn hình.
2. **Sân khấu 3D:** vùng lớn nhất, mục tiêu khoảng 50–60% chiều cao khả dụng ở chế độ dọc, nhưng co giãn theo chiều cao thực tế.
3. **Thanh trạng thái ngắn:** ví dụ “Nam châm đang tiến lại gần · Từ thông đang biến thiên”.
4. **Thanh điều khiển chính:** Bắt đầu/Tạm dừng, Đặt lại, chế độ thao tác.
5. **Bảng điều khiển mở rộng dạng bottom sheet/panel:** tốc độ, đảo cực, đường sức từ, chế độ thí nghiệm.
6. **Tab “Giải thích” hoặc “Dự đoán”:** không để bảng giải thích dài che toàn bộ sân khấu 3D.

Không ép mọi nút vào cùng một hàng nhỏ. Chỉ hiển thị 2–4 nút quan trọng ở trạng thái mặc định; các điều khiển phụ đặt trong bảng mở rộng.

### 7.3. Kích thước và khả năng đọc

- Vùng chạm mục tiêu tối thiểu khoảng 44 × 44 CSS px; ưu tiên 48 × 48 px khi không làm chật giao diện.
- Chữ phần điều khiển thường không nhỏ hơn 14–16 px.
- Tương phản đủ cao giữa chữ, nút, nền và nhãn N/S.
- Không chỉ dùng màu để truyền đạt trạng thái: phải có chữ, ký hiệu hoặc hình dạng hỗ trợ.
- Không để nhãn, kim điện kế hoặc nút bị che bởi tai thỏ, thanh trạng thái hay Home Indicator.
- Bảng điều khiển dài có thể cuộn **bên trong panel**; sân khấu 3D không được mất khỏi trang do cuộn ngoài ý muốn.

### 7.4. Điều khiển cảm ứng không xung đột

Tạo hai chế độ tường minh:

- **Kéo nam châm:** chạm/kéo nam châm theo trục thí nghiệm.
- **Xoay mô hình:** kéo nền để xoay camera; chụm hai ngón để zoom khi không ở chế độ kéo nam châm.

Yêu cầu triển khai:

- Dùng Pointer Events hoặc cơ chế tương đương, xử lí `pointerdown`, `pointermove`, `pointerup`, `pointercancel`.
- Khi bắt đầu kéo vật thể, dùng pointer capture để tránh mất thao tác khi ngón tay đi ra ngoài vùng vật thể.
- Giới hạn `touch-action` ở canvas/vùng thao tác phù hợp; không đặt `touch-action: none` cho toàn trang.
- Không gọi `preventDefault` toàn cục khiến người dùng không thể cuộn panel hoặc phóng to trang.
- Có nút hỗ trợ bằng bàn phím trên desktop; cung cấp thanh trượt vị trí như phương án thay thế thao tác kéo.
- Khi kéo nam châm, giữ camera ổn định để vật thể không “nhảy” khi bắt đầu kéo.

### 7.5. Toàn màn hình: không hứa quá khả năng trình duyệt

- Nút “Mở rộng thí nghiệm” thử `requestFullscreen()` và kiểm tra Promise/kết quả thực tế.
- Phải xử lí khi API không có, bị từ chối hoặc thoát toàn màn hình.
- Trên một số phiên bản Safari iPhone, Fullscreen API cho phần tử HTML tùy ý vẫn không được hỗ trợ đầy đủ. Không được giả định API sẽ biến một `div`/canvas thành toàn màn hình trên mọi iPhone.
- Nếu không hỗ trợ, chuyển sang **“Chế độ tập trung”**: bố cục cố định phủ vùng ứng dụng, ẩn các bảng phụ, dùng `100dvh` và safe area để tối đa hóa diện tích 3D. Ghi rõ đây là chế độ tập trung trong trang, không khẳng định trình duyệt đã vào OS fullscreen.
- Có thể nêu hướng dẫn “Thêm vào Màn hình chính” như lựa chọn cho người dùng, nhưng không tự động coi PWA là bảo đảm toàn màn hình tuyệt đối.
- Không khóa hướng màn hình bằng API không được hỗ trợ; tự bố trí lại khi người dùng xoay điện thoại.

### 7.6. Giao diện ngang và máy tính

- Trên điện thoại ngang, giữ sân khấu 3D chiếm phần lớn bên trái/trên; điều khiển gọn ở cạnh hoặc panel bên dưới tùy kích thước.
- Trên máy tính, bố cục hai cột: 3D lớn ở trái, điều khiển/giải thích ở phải.
- Không kéo giãn một bố cục desktop rồi thu nhỏ để dùng trên điện thoại; dùng breakpoint và cấu trúc phù hợp.

---

## 8. Hiệu năng 3D trên thiết bị di động

- Mục tiêu là trải nghiệm mượt, lý tưởng khoảng 30–60 FPS tùy phần cứng; đây là mục tiêu cần đo, không phải lời cam kết cứng.
- Giới hạn số polygon, đèn động, shadow map và hạt.
- Giới hạn pixel ratio; khởi đầu có thể dùng `Math.min(devicePixelRatio, 1.5–2)` rồi điều chỉnh theo đo đạc.
- Không dùng chất lượng render cực cao trên mọi thiết bị chỉ vì màn hình có DPR lớn.
- Dùng một canvas và tái sử dụng hình học/vật liệu.
- Không dựng lại toàn bộ cảnh mỗi lần cập nhật bảng trạng thái React.
- Tạm dừng/giảm hoạt ảnh khi tab nền hoặc ứng dụng mất focus; khôi phục trạng thái không gây xung cảm ứng giả.
- Khi WebGL không hoạt động hoặc thiết bị quá yếu, hiện thông báo hữu ích và cung cấp sơ đồ 2D thay thế nếu khả thi; không để màn hình trắng.
- Hỗ trợ `prefers-reduced-motion` bằng cách giảm các hiệu ứng trang trí mà không bỏ qua các chuyển động cốt lõi cần thiết để học.

---

## 9. Bảng giải thích và chế độ học tập

Mỗi trạng thái giải thích phải lấy dữ liệu từ mô hình, không lấy riêng từ nút vừa bấm.

Thông tin có thể hiển thị:

- Trạng thái nam châm/nam châm điện.
- Từ thông có biến thiên không.
- Dấu của `dΦ/dt` theo quy ước.
- Suất điện động cảm ứng có xuất hiện không.
- Chiều dòng điện quy ước.
- Chiều lệch kim theo quy ước dây nối.
- Lý do ngắn gọn theo Faraday–Lenz.

### Câu hỏi dự đoán

**Câu 1. Điều gì xảy ra với kim điện kế khi đưa nam châm lại gần cuộn dây?**

A. Kim lệch khỏi 0 trong lúc từ thông biến thiên.  
B. Kim luôn đứng ở 0.  
C. Kim lệch liên tục cả khi nam châm đã đứng yên.

**Câu 2. Khi kéo nam châm ra xa trong cùng cấu hình, chiều dòng điện cảm ứng thay đổi thế nào?**

**Câu 3. Khi nam châm đứng yên tương đối với cuộn dây, vì sao kim trở về 0?**

**Câu 4. Khi ngắt công tắc nam châm điện, tại sao kim lệch theo chiều ngược với lúc đóng công tắc trong mô hình này?**

Sau khi học sinh dự đoán, mới cho chạy thí nghiệm và phản hồi dựa trên kết quả thật của mô hình.

---

## 10. Kiểm thử tự động và nghiệm thu

### Kiểm thử vật lí (bắt buộc)

1. **Đứng yên:** vị trí và từ trường không đổi ⇒ suất điện động do biến thiên từ thông bằng 0 sau khi ổn định.
2. **Tiến gần:** vị trí đổi ⇒ từ thông biến thiên ⇒ suất điện động khác 0 trong giai đoạn chuyển động.
3. **Ra xa:** đảo chiều chuyển động trong cùng cấu hình ⇒ dấu suất điện động đảo.
4. **Đảo cực:** giữ nguyên quỹ đạo/tốc độ ⇒ dấu từ thông và suất điện động đảo.
5. **Tăng tốc độ:** trong cùng vùng và cùng dạng quỹ đạo, độ lớn tốc độ biến thiên từ thông tăng ⇒ độ lớn suất điện động tăng.
6. **Xa cuộn dây:** gradient từ thông nhỏ hơn theo mô hình đã định nghĩa ⇒ độ lớn suất điện động nhỏ hơn khi cùng tốc độ.
7. **Đóng nam châm điện:** `dIp/dt` có dấu phù hợp với tăng dòng ⇒ suất điện động thứ cấp xuất hiện trong quá độ.
8. **Dòng sơ cấp ổn định:** `dIp/dt ≈ 0` ⇒ suất điện động thứ cấp gần 0.
9. **Ngắt nam châm điện:** `dIp/dt` đảo dấu trong quá trình suy giảm ⇒ suất điện động thứ cấp đảo dấu.
10. **Đảo dây điện kế:** chỉ dấu hiển thị của kim đổi; mô hình suất điện động của cuộn dây không đổi.
11. **Pause/resume/reset:** không phát sinh đỉnh suất điện động giả do đồng hồ bị nhảy hoặc `Phi_previous` lỗi.
12. **Số học:** mọi đại lượng đều hữu hạn, không NaN/Infinity; các tham số và giới hạn đều được kiểm tra.

### Kiểm thử giao diện web

13. Không có cuộn ngang tại các viewport hẹp (320, 360, 375, 390, 430 CSS px) và màn hình máy tính.
14. Canvas đổi đúng kích thước khi xoay màn hình, mở/đóng panel và đổi kích thước cửa sổ.
15. Kéo nam châm không vô tình xoay camera hoặc cuộn trang.
16. `pointercancel` không để trạng thái kéo bị kẹt.
17. Nút toàn màn hình xử lí thành công/thất bại; fallback chế độ tập trung hoạt động.
18. Safe area không che tiêu đề, nút và thanh điều khiển.
19. Bảng điều khiển dài có thể cuộn bên trong và vẫn có thể đóng.
20. Khi WebGL thất bại, có thông báo và phương án thay thế nếu được triển khai.

### Kiểm thử thiết bị phải báo cáo trung thực

Tối thiểu kiểm tra trong responsive preview và trình duyệt desktop. Nếu có thiết bị thật, kiểm tra:

- Safari trên iPhone (màn hình dọc và ngang).
- Chrome trên Android.
- Desktop Chrome/Edge/Safari tương thích.

Báo cáo từng môi trường: đã thử thật / responsive emulation / chưa thử. Không gộp chúng thành một tuyên bố “đã kiểm thử trên điện thoại”.

---

## 11. Những điều không được làm

- Không để kim lệch chỉ vì nam châm đang ở gần cuộn dây.
- Không để kim lệch liên tục khi từ thông đã ổn định.
- Không đảo chiều đường sức từ chỉ vì nam châm đảo hướng chuyển động; chỉ đảo khi cực từ/định hướng trường thay đổi theo mô hình.
- Không chọn chiều dòng điện từ hoạt ảnh hoặc nút bấm thay vì dấu của suất điện động.
- Không làm dòng điện sơ cấp đổi tức thời nếu đã tuyên bố đang mô phỏng quá trình quá độ RL.
- Không mô tả mô hình dipole lý tưởng như mô hình chính xác của mọi thanh nam châm thật.
- Không tuyên bố điện áp, dòng điện hoặc góc kim là giá trị thực nghiệm nếu chưa hiệu chuẩn.
- Không tuyên bố Fullscreen API hoạt động trên tất cả iPhone.
- Không chặn zoom toàn trang, không dùng nút quá nhỏ và không để điều khiển bị vùng an toàn che.
- Không để hiệu ứng đồ họa lấn át khả năng đọc kim điện kế và quan sát chuyển động.

---

## 12. Trình tự triển khai

### Giai đoạn 1 — Lõi vật lí

- Hoàn thiện quy ước trục, pháp tuyến, dấu từ thông và đấu dây.
- Viết hàm vật lí độc lập.
- Chạy các test số về dấu và trạng thái đứng yên trước khi làm hoạt ảnh.

### Giai đoạn 2 — Thí nghiệm nam châm vĩnh cửu

- Dựng nam châm, cuộn dây, điện kế và dây dẫn.
- Tạo kéo nam châm, tốc độ và đảo cực.
- Nối kim/dòng điện với kết quả tính toán.

### Giai đoạn 3 — Nam châm điện

- Dựng hai mạch khác nhau.
- Mô hình quá độ đóng/ngắt.
- Kiểm chứng chiều suất điện động ở hai quá trình.

### Giai đoạn 4 — Giao diện điện thoại

- Triển khai viewport, safe area, `dvh`, panel/bottom sheet.
- Tách chế độ kéo nam châm và xoay camera.
- Thử responsive, xoay màn hình, fallback toàn màn hình.

### Giai đoạn 5 — Hoàn thiện và báo cáo

- Chạy test vật lí và giao diện.
- Kiểm tra lỗi console và hiệu năng.
- Báo cáo kết quả cùng danh sách giới hạn.

---

## 13. Tiêu chí bàn giao

Ứng dụng chỉ đạt yêu cầu khi:

- Hai thí nghiệm hoạt động được.
- Kim điện kế thực sự do mô hình điện từ điều khiển.
- Dấu dòng điện và chiều lệch nhất quán với định luật Faraday–Lenz và quy ước đấu dây.
- Nam châm đứng yên hoặc từ thông ổn định thì kim trở về 0 sau quá trình quá độ.
- Đảo chiều chuyển động/đảo cực tạo kết quả đảo chiều phù hợp.
- Giao diện dùng được ở màn hình điện thoại hẹp, không có cuộn ngang.
- Điều khiển cảm ứng không xung đột.
- Chế độ mở rộng có fallback khi Fullscreen API không được hỗ trợ.
- Có bộ test vật lí và báo cáo môi trường thử nghiệm trung thực.
- Không còn lỗi runtime nghiêm trọng đã biết.

---

## 14. Nguồn tham khảo để kiểm chứng

1. OpenStax, **University Physics Volume 2 — 13.1 Faraday’s Law**: định nghĩa từ thông, suất điện động cảm ứng, vai trò của tốc độ biến thiên và chuyển động tương đối.  
   https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law
2. OpenStax, **University Physics Volume 2 — 13.2 Lenz’s Law**: chiều dòng điện cảm ứng chống lại sự biến thiên từ thông gây ra nó.  
   https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law
3. Three.js Manual, **Responsive Design**: bố trí canvas, resize và giới hạn tải đồ họa trên màn hình mật độ điểm ảnh cao.  
   https://threejs.org/manual/pages/responsive.html
4. MDN, **Viewport concepts**: cấu hình viewport trên thiết bị di động và tránh trang bị thu nhỏ theo viewport ảo.  
   https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts
5. MDN, **Using environment variables**: vùng an toàn `safe-area-inset-*`.  
   https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using
6. MDN, **Element.requestFullscreen()**: API toàn màn hình, Promise và xử lí trường hợp bị từ chối.  
   https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
7. WebKit bug tracker, **Fullscreen API on iOS**: kiểm tra giới hạn thực tế của fullscreen phần tử không phải video trên Safari iPhone; cần xác minh lại trên thiết bị/phiên bản cụ thể.  
   https://bugs.webkit.org/show_bug.cgi?id=206854
8. Google AI for Developers, **Build apps in Google AI Studio**: tạo ứng dụng web, xem preview, chỉnh mã và xuất dự án.  
   https://ai.google.dev/gemini-api/docs/aistudio-build-mode

**Lưu ý khoa học:** Các công thức trong tài liệu là mô hình ở mức giáo dục. Nếu muốn mô phỏng định lượng đúng với một dụng cụ cụ thể, cần có thông số và phép hiệu chuẩn tương ứng; không thể suy ra độ lệch thực của điện kế chỉ từ ảnh SGK.
