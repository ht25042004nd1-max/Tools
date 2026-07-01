# AI Session Browser

Ứng dụng desktop dạng trình duyệt mini dành cho các trang web AI (ChatGPT, Gemini, Claude...), cho phép quản lý **nhiều tài khoản với session riêng biệt** bằng cơ chế `session partition` chuẩn của Electron.

> Lưu ý quan trọng: App **không** lấy, lưu hay nhập cookie/token thủ công. Mỗi tài khoản là một session trình duyệt độc lập do Electron quản lý; bạn đăng nhập thủ công ngay trong app như đăng nhập trên trình duyệt bình thường.

---

## 1. Cài đặt môi trường

### Bước 1: Cài Node.js
- Tải Node.js bản LTS tại: https://nodejs.org
- Cài đặt xong, kiểm tra bằng terminal:
  ```bash
  node -v
  npm -v
  ```

### Bước 2: Mở project bằng VS Code
- Mở VS Code.
- Chọn **File → Open Folder...** → chọn thư mục `ai-session-browser`.

### Bước 3: Mở terminal trong VS Code
- Menu **Terminal → New Terminal**.

### Bước 4: Cài dependency
```bash
npm install
```

### Bước 5: Chạy ứng dụng
```bash
npm start
```

Cửa sổ "AI Session Browser" sẽ hiện ra với phần header phía trên và vùng web phía dưới.

---

## 2. Cách thêm tài khoản mới

Mở file `data/accounts.json`, thêm một object mới vào mảng, ví dụ:

```json
{
  "id": "acc_hoang_work",
  "name": "Hoàng Work",
  "partition": "persist:hoang-work",
  "note": "Tài khoản công việc"
}
```

Lưu ý:
- `id`: định danh duy nhất, không trùng với account khác.
- `partition`: **phải** bắt đầu bằng `persist:` để Electron lưu session lâu dài (nếu không có `persist:`, session sẽ mất khi đóng app). Mỗi tài khoản nên có `partition` khác nhau.
- Lưu file rồi khởi động lại app (`npm start`) để thấy tài khoản mới trong dropdown.

---

## 3. Cách thêm model AI mới

Mở file `data/models.json`, thêm:

```json
{
  "id": "perplexity",
  "name": "Perplexity",
  "url": "https://www.perplexity.ai"
}
```

Lưu file và khởi động lại app.

---

## 4. Đăng nhập lần đầu cho từng tài khoản

1. Mở app, chọn tài khoản (ví dụ **Hoàng Main**) ở dropdown đầu tiên.
2. Chọn model AI (ví dụ **ChatGPT**).
3. Bấm nút **▶ Chạy**.
4. Vì đây là lần đầu, trang sẽ hiện màn hình đăng nhập của ChatGPT/Gemini/Claude — bạn đăng nhập **thủ công** như bình thường (nhập email, mật khẩu, OTP...).
5. Sau khi đăng nhập thành công, phiên đăng nhập này được Electron tự lưu lại theo `partition` của tài khoản đó.

---

## 5. Cách chuyển đổi giữa các tài khoản

1. Chọn tài khoản ở dropdown "Chọn tài khoản".
2. Chọn model (ví dụ ChatGPT).
3. Bấm **▶ Chạy**.
4. Nếu tài khoản này đã từng đăng nhập trước đó → app tự động hiện luôn trang đã đăng nhập, **không cần đăng nhập lại**.
5. Nếu tài khoản này chưa từng đăng nhập → đăng nhập thủ công một lần, các lần sau sẽ tự nhớ.

---

## 6. Về vấn đề bảo mật / session

- App **không** đọc, không hiển thị, không lưu cookie hay token vào file JSON hoặc bất kỳ đâu trong code của chúng ta.
- Việc lưu trữ phiên đăng nhập (cookie, local storage, cache...) hoàn toàn do **Electron** xử lý tự động thông qua cơ chế `session.fromPartition(partition)`.
- Mỗi `partition` tương ứng với một "hồ sơ trình duyệt" độc lập — giống như bạn có nhiều trình duyệt Chrome cài riêng cho từng tài khoản.
- Nếu muốn **xoá session** của một tài khoản (đăng xuất hoàn toàn khỏi máy):
  - Cách đơn giản nhất: vào trong trang web đó và bấm "Đăng xuất" như bình thường.
  - Cách triệt để hơn: xoá thư mục dữ liệu của Electron app trên máy bạn (thường nằm trong thư mục `userData`, ví dụ trên Windows là `%APPDATA%/ai-session-browser`, trên macOS là `~/Library/Application Support/ai-session-browser`). Xoá thư mục con tương ứng với `partition` đó sẽ xoá toàn bộ cookie/cache của tài khoản đó.

---

## 7. Cách test app

### Test tài khoản Hoàng Main
1. Chọn **Hoàng Main** → chọn **ChatGPT** → bấm **Chạy**.
2. Đăng nhập thủ công bằng tài khoản ChatGPT thứ nhất.
3. Xác nhận đã vào được giao diện chat.

### Test tài khoản Hoàng Test
1. Chọn **Hoàng Test** → chọn **ChatGPT** → bấm **Chạy**.
2. App sẽ load lại trang ChatGPT nhưng với session **trống** (chưa đăng nhập) vì đây là partition khác.
3. Đăng nhập bằng một tài khoản ChatGPT khác (hoặc cùng tài khoản, miễn là đăng nhập thủ công).

### Chuyển qua lại giữa 2 tài khoản
1. Chuyển dropdown về **Hoàng Main** → bấm **Chạy** lại.
2. Kiểm tra: trang hiện ra đã đăng nhập sẵn (không cần đăng nhập lại).
3. Chuyển dropdown sang **Hoàng Test** → bấm **Chạy**.
4. Kiểm tra: trang hiện ra cũng đã đăng nhập sẵn với tài khoản test (không bị lẫn với Hoàng Main).

### Kiểm tra mỗi tài khoản giữ trạng thái đăng nhập riêng
- Đóng hẳn app (tắt cửa sổ), mở lại bằng `npm start`.
- Lặp lại thao tác chọn từng tài khoản + Chạy.
- Cả hai tài khoản vẫn còn giữ trạng thái đăng nhập riêng biệt, không bị ghi đè lên nhau — chứng tỏ cơ chế `session partition` hoạt động đúng.

---

## 8. Cấu trúc thư mục

```
ai-session-browser/
├─ package.json
├─ main.js
├─ preload.js
├─ renderer/
│  ├─ index.html
│  ├─ renderer.js
│  └─ styles.css
├─ data/
│  ├─ accounts.json
│  └─ models.json
└─ README.md
```
