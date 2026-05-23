# Spec - Ứng dụng đa nền tảng theo dõi thời gian học

## 1. Tổng quan

Ứng dụng là một công cụ đa nền tảng viết bằng Rust, hỗ trợ người dùng ghi nhận thời gian học mỗi ngày, theo dõi tiến độ học tập qua biểu đồ thống kê, và đặt mục tiêu học tập hằng ngày để duy trì thói quen.

Tên tạm thời: **PomoTime**

## 2. Mục tiêu sản phẩm

- Giúp người dùng đo chính xác thời lượng học tập theo phiên học.
- Hiển thị số liệu học tập theo ngày, tuần, tháng bằng biểu đồ trực quan.
- Cho phép đặt mục tiêu học mỗi ngày và theo dõi mức độ hoàn thành.
- Tạo động lực học đều đặn thông qua streak, cảnh báo và tổng kết tiến độ.

## 3. Đối tượng người dùng

- Học sinh, sinh viên.
- Người tự học kỹ năng mới.
- Người đi làm muốn theo dõi thời gian học ngoại ngữ, lập trình, chứng chỉ.

## 4. Phạm vi nền tảng

- Desktop (giai đoạn 1 ưu tiên): Linux, Windows.
- Desktop (giai đoạn 2): macOS.
- Mobile (giai đoạn mở rộng): Android, iOS.
- Định hướng kỹ thuật:
  - Rust cho phần lõi xử lý dữ liệu, timer, thống kê.
  - Sử dụng **Tauri 2** để xây dựng ứng dụng desktop đa nền tảng với Rust backend.
  - Dùng **Supabase** cho xác thực người dùng (Auth) và đồng bộ dữ liệu cloud khi mở rộng đa thiết bị.

## 5. Tính năng chính

### 5.1. Quản lý phiên học

- Bắt đầu / tạm dừng / kết thúc một phiên học.
- Ghi nhận:
  - tên phiên học
  - môn học / chủ đề
  - thời gian bắt đầu
  - thời gian kết thúc
  - tổng thời lượng
  - ghi chú
- Cho phép thêm phiên học thủ công nếu quên bấm timer.

### 5.2. Thống kê thời gian học

- Tổng thời gian học trong:
  - hôm nay
  - 7 ngày gần nhất
  - 30 ngày gần nhất
  - tháng hiện tại
- Thống kê theo:
  - ngày
  - tuần
  - tháng
  - môn học / chủ đề
- Hiển thị các chỉ số:
  - tổng số giờ học
  - số phiên học
  - thời lượng trung bình mỗi phiên
  - ngày học nhiều nhất
  - chuỗi ngày học liên tiếp (streak)

### 5.3. Biểu đồ

- Biểu đồ cột: thời lượng học theo ngày.
- Biểu đồ đường: xu hướng học tập theo tuần / tháng.
- Biểu đồ tròn: tỷ lệ thời gian theo từng môn học / chủ đề.
- Bộ lọc thời gian:
  - tuần này
  - tháng này
  - 3 tháng gần nhất
  - tùy chọn khoảng thời gian

### 5.4. Mục tiêu học hằng ngày

- Người dùng tạo mục tiêu học chính, ví dụ: "Đạt chứng chỉ IELTS 6.5", "Đạt JLPT N3", "Hoàn thành khóa Rust cơ bản".
- Người dùng chọn khoảng thời gian cho mục tiêu (ngày bắt đầu - ngày kết thúc).
- Người dùng thiết lập chỉ tiêu theo từng ngày trong tuần (Thứ 2 đến Chủ nhật), theo phút hoặc giờ.
- Có thể đặt ngày nghỉ với mục tiêu bằng 0 phút.
- Hệ thống hiển thị:
  - tiến độ trong ngày theo chỉ tiêu của đúng thứ trong tuần
  - phần trăm hoàn thành
  - trạng thái đạt / chưa đạt
- Có thể đặt mục tiêu chung hoặc theo từng môn học.
- Hệ thống tổng hợp mức độ bám kế hoạch theo tuần để người dùng theo dõi tính kỷ luật.

### 5.5. Nhắc nhở và động lực

- Nhắc người dùng bắt đầu học nếu chưa đạt mục tiêu trong ngày.
- Thông báo khi hoàn thành mục tiêu.
- Hiển thị streak để khuyến khích duy trì thói quen.

## 6. Luồng sử dụng chính

### 6.0A. Đăng nhập khi mở ứng dụng

1. Người dùng mở ứng dụng.
2. Nếu đã có phiên đăng nhập Supabase hợp lệ, hệ thống vào thẳng ứng dụng chính.
3. Nếu chưa có phiên đăng nhập hợp lệ, hệ thống hiển thị màn login riêng (không sidebar).
4. Người dùng có thể chọn đăng nhập bằng Google hoặc email/mật khẩu.
5. Hệ thống gọi Supabase Auth để xác thực (Google OAuth hoặc email/password).
6. Nếu đăng nhập thất bại, hệ thống hiển thị lỗi ngay trên màn login và giữ nguyên màn hình.
7. Nếu đăng nhập thành công, hệ thống vào ứng dụng chính và hiển thị avatar + tên user trên top bar.
8. Khi người dùng đăng xuất, hệ thống gọi Supabase sign out, xóa phiên đăng nhập cục bộ và quay lại màn login.

### 6.0. Thiết lập mục tiêu ban đầu

1. Người dùng mở ứng dụng lần đầu.
2. Nhập tên mục tiêu (ví dụ: chứng chỉ hoặc kỹ năng cần đạt).
3. Chọn khoảng thời gian thực hiện mục tiêu.
4. Thiết lập chỉ tiêu học cho từng ngày trong tuần.
5. Lưu mục tiêu.
6. Dashboard hiển thị kế hoạch tuần và tiến độ của ngày hiện tại.

### 6.1. Bắt đầu học

1. Người dùng mở ứng dụng.
2. Chọn môn học / chủ đề.
3. Bấm **Bắt đầu học**.
4. Bộ đếm thời gian chạy.
5. Khi hoàn thành, người dùng bấm **Kết thúc**.
6. Phiên học được lưu vào lịch sử và cập nhật thống kê.

### 6.2. Theo dõi mục tiêu hằng ngày

1. Người dùng đã có sẵn kế hoạch theo từng ngày trong tuần.
2. Sau mỗi phiên học, hệ thống cộng dồn thời lượng trong ngày.
3. Màn hình tổng quan so sánh thời lượng học thực tế với chỉ tiêu của ngày đó.
4. Khi đạt mục tiêu ngày, ứng dụng thông báo và ghi nhận streak.

### 6.3. Xem thống kê

1. Người dùng mở màn hình thống kê.
2. Chọn khoảng thời gian.
3. Xem biểu đồ và các số liệu tổng hợp.
4. Có thể lọc theo môn học / chủ đề.

### 6.4. Quản lý mục tiêu theo luồng list -> detail

1. Người dùng mở màn hình Goals & Settings.
2. Hệ thống hiển thị danh sách goal trước.
3. Người dùng bấm **Detail** ở một goal cụ thể.
4. Hệ thống mở phần cấu hình riêng cho goal đó (weekly targets, trạng thái active).
5. Người dùng lưu cấu hình và quay lại danh sách khi cần.

## 7. Màn hình dự kiến

### 7.1. Dashboard

- Tổng thời gian học hôm nay.
- Tiến độ so với mục tiêu ngày.
- Nút bắt đầu phiên học nhanh.
- Streak hiện tại.

### 7.2. Session Timer

- Tên môn học / chủ đề.
- Đồng hồ đếm thời gian.
- Nút tạm dừng / tiếp tục / kết thúc.
- Ô ghi chú nhanh.

### 7.3. History

- Danh sách các phiên học đã lưu.
- Tìm kiếm / lọc theo ngày, môn học.
- Chỉnh sửa hoặc xóa phiên học.

### 7.4. Statistics

- Các biểu đồ thống kê.
- Bộ lọc khoảng thời gian.
- Tổng hợp chỉ số học tập.

### 7.5. Goals & Settings

- Thiết lập mục tiêu học chính (ví dụ theo chứng chỉ).
- Thiết lập khoảng thời gian thực hiện mục tiêu.
- Mặc định vào màn **Goal list**.
- Người dùng bấm **Detail** để mở cấu hình từng goal.
- Thiết lập chỉ tiêu cho từng ngày trong tuần theo goal đang mở detail.
- Thiết lập nhắc nhở.
- Quản lý danh mục môn học / chủ đề.

## 8. Yêu cầu chức năng

- Đăng ký, đăng nhập, đăng xuất phải dùng Supabase Auth.
- Màn login phải hỗ trợ đăng nhập bằng Google (Supabase OAuth).
- Khi chưa có phiên đăng nhập hợp lệ, màn hình đầu tiên phải là màn login.
- Màn login là màn riêng, không hiển thị sidebar.
- Màn login phải hiển thị thông báo lỗi khi email/mật khẩu không hợp lệ.
- Màn login phải hiển thị thông báo lỗi khi đăng nhập Google thất bại.
- Sau khi login thành công, top bar phải hiển thị avatar và tên user hiện tại.
- Khi logout, hệ thống phải gọi Supabase sign out, xóa phiên đăng nhập cục bộ và quay lại màn login.
- Người dùng có thể tạo mục tiêu học chính (tên mục tiêu/chứng chỉ).
- Người dùng có thể thiết lập khoảng thời gian cho mục tiêu (start_date, end_date).
- Người dùng có thể cấu hình chỉ tiêu riêng cho từng ngày trong tuần.
- Khi chưa có goal, Onboarding phải hiển thị form tạo goal đầu tiên.
- Quick Study trên Onboarding phải tối giản còn 1 nút hành động chính.
- Quick Study dùng active goal hiện tại, không có filter riêng trên Onboarding.
- Quick Study phải hiển thị Subject và Work mode dạng text; click vào text sẽ mở modal để chỉnh nhanh.
- Quick Study mặc định hiển thị Subject/Work mode của phiên học gần nhất.
- Nếu chưa có phiên học nào, Quick Study mặc định Subject mới tạo gần nhất và Work mode là Focus Clock.
- Biểu đồ "Study time - last 7 days" ở Onboarding phải hiển thị tổng thời gian theo ngày (không theo subject).
- Cột của ngày đạt target goal phải hiển thị màu xanh.
- Người dùng có thể tạo, sửa, xóa môn học / chủ đề.
- Người dùng có thể bắt đầu và kết thúc phiên học.
- Hệ thống phải lưu lịch sử phiên học cục bộ.
- Hệ thống phải gắn dữ liệu học tập theo từng người dùng (user_id).
- Hệ thống phải xác định chỉ tiêu của ngày hiện tại dựa trên cấu hình theo thứ.
- Hệ thống phải tính tổng thời lượng học theo ngày/tuần/tháng.
- Hệ thống phải hiển thị biểu đồ từ dữ liệu lịch sử.
- Hệ thống phải cho phép đặt mục tiêu hằng ngày.
- Hệ thống phải xác định người dùng đã đạt mục tiêu hay chưa.
- Hệ thống nên hỗ trợ xuất dữ liệu CSV/JSON ở giai đoạn sau.

## 9. Yêu cầu phi chức năng

- Giao diện đơn giản, dễ dùng, ưu tiên thao tác nhanh.
- Dữ liệu lưu cục bộ, hoạt động tốt cả khi offline.
- Kiến trúc local-first: khi có mạng, dữ liệu có thể đồng bộ lên Supabase.
- Hiệu năng tốt với lịch sử học tập dài hạn.
- Đồng hồ đếm thời gian phải chính xác và ổn định.
- Kiến trúc dễ mở rộng để bổ sung đồng bộ cloud trong tương lai.

## 10. Mô hình dữ liệu sơ bộ

### 10.1. StudySession

- id
- user_id
- subject_id
- title
- note
- start_time
- end_time
- duration_minutes
- created_at
- updated_at

### 10.2. Subject

- id
- user_id
- name
- color
- created_at

### 10.3. LearningGoal

- id
- user_id
- title
- description (nullable)
- goal_type (certificate/custom)
- start_date
- end_date
- is_active
- created_at
- updated_at

### 10.4. WeeklyGoalTarget

- id
- goal_id
- weekday (1-7)
- target_minutes
- created_at
- updated_at

### 10.5. UserStats

- user_id
- date
- total_minutes
- session_count
- completed_goal
- streak_count

## 11. Kiến trúc gợi ý

- **Core Rust**:
  - quản lý timer
  - tính toán thống kê
  - xử lý dữ liệu và lưu trữ
- **UI Layer**:
  - giao diện chạy trong Tauri WebView
  - biểu đồ, dashboard, settings
- **App Shell**:
  - Tauri 2 (Linux/Windows trước, mở rộng macOS sau)
  - giao tiếp UI <-> Rust qua Tauri commands/events
- **Storage**:
  - SQLite (cache local, offline)
  - Supabase Postgres (cloud sync)
- **Auth & Cloud**:
  - Supabase Auth (email/password + Google OAuth)
  - Row Level Security (RLS) để mỗi user chỉ truy cập dữ liệu của chính họ

## 12. MVP đề xuất

Phiên bản đầu tiên nên bao gồm:

- đăng ký/đăng nhập cơ bản với Supabase Auth
- đăng nhập Google với Supabase OAuth
- tạo mục tiêu học chính (ví dụ chứng chỉ)
- thiết lập khoảng thời gian mục tiêu
- thiết lập chỉ tiêu theo từng ngày trong tuần
- quản lý phiên học cơ bản
- lưu lịch sử học
- dashboard tổng quan
- biểu đồ cột theo ngày
- thống kê tuần / tháng

## 13. Hướng phát triển sau MVP

- Đồng bộ dữ liệu nhiều thiết bị.
- Mở rộng social login (GitHub, Apple).
- Pomodoro mode.
- Nhắc lịch học thông minh.
- Gamification: huy hiệu, cấp độ, thành tích.
- Xuất báo cáo PDF/CSV.

## 14. Tiêu chí thành công

- Người dùng ghi được thời gian học hằng ngày dễ dàng.
- Người dùng nhìn thấy tiến độ học rõ ràng qua dashboard và biểu đồ.
- Người dùng duy trì được mục tiêu học hằng ngày nhờ nhắc nhở và streak.
- Ứng dụng chạy ổn định trên nhiều nền tảng với cùng logic lõi bằng Rust.

## 15. Đặc tả giao diện theo docs/index.html

### 15.1. Nguồn sự thật giao diện

- File docs/index.html là prototype chuẩn để so khớp giao diện.
- Mọi mô tả UI trong section này được đồng bộ theo đúng cấu trúc, class và hành vi trong prototype.

### 15.2. Visual style và design tokens đang dùng

- Typography:
  - Font chính: Manrope.
  - Font timer: IBM Plex Mono.
- Màu chủ đạo:
  - --bg: #f6f6f4
  - --surface: #ffffff
  - --surface-muted: #f1f1ee
  - --text-primary: #111315
  - --text-secondary: #5d646b
  - --accent: #0f766e
  - --accent-strong: #0b5d57
  - --success: #2e7d32
  - --warning: #b7791f
  - --danger: #c62828
  - --border: #e3e5e8
- Radius/shadow:
  - Radius: 16/10/8 (lg/md/sm), pill 999.
  - Shadow chính: 0 10px 30px rgba(0, 0, 0, 0.05).
- Nền:
  - Body dùng radial gradient + overlay đường kẻ dọc nhẹ.

### 15.3. App shell và responsive layout

- Trạng thái mặc định:
  - app-shell dạng grid 2 cột: 248px sidebar + vùng main.
  - Main nằm trong panel bán trong suốt, bo góc lớn, có border.
- Trạng thái auth-screen:
  - Ẩn sidebar.
  - Ẩn topbar và auth-status.
  - Main chuyển về layout 1 cột, max-width 860px.
- Trạng thái sidebar-hidden:
  - Ẩn sidebar, content full width.
- Responsive:
  - <=1180px: sidebar thu gọn dạng icon.
  - <=980px: layout 1 cột, sidebar sticky dạng hàng ngang cuộn.
  - <=640px: weekly-grid chuyển 1 cột.

### 15.4. Điều hướng và topbar

- Sidebar menu (đúng thứ tự): Onboarding, Dashboard, Session Timer, History, Statistics, Goal Settings.
- Mỗi menu là nav-btn có icon ký tự, trạng thái active đổi nền và border.
- Topbar gồm:
  - Nút hide/show sidebar.
  - Goal chip active.
  - Goal count chip.
  - Streak chip.
  - User chip (avatar + name + email) khi đã đăng nhập.
- Sidebar footer có nút auth action (logout/login state).

### 15.5. Đặc tả từng view đúng prototype

#### 15.5.1. Login view

- Layout 2 panel: login-card và login-side.
- Form gồm: display name optional, email, password.
- Actions:
  - Nút Login.
  - Divider "or".
  - Nút Continue with Google có icon SVG Google.
- Có status text cho lỗi/thành công đăng nhập.

#### 15.5.2. Onboarding view

- Bố cục 2 panel:
  - Panel trái: Quick Study.
  - Panel phải: Study summary this week.
- Panel trái có 2 trạng thái:
  - Chưa có goal: hiện onboarding-create-goal-panel để tạo goal đầu tiên.
  - Đã có goal: hiện onboarding-quick-start-panel với nút Study now.
- Quick Study hiển thị Subject và Work mode dưới dạng text-action button.
- Có modal riêng để sửa nhanh Subject và Work mode.
- Panel phải gồm:
  - 3 KPI: total time, sessions, average.
  - Chart "Study time - last 7 days" theo cột.
  - Cột đạt target dùng class achieved màu xanh.
  - Danh sách recent study hours.

#### 15.5.3. Dashboard view

- Có dashboard filters ở đầu view:
  - Goal filter.
  - Time range filter (this-week, this-month, last-3-months).
  - Subject filter.
- KPI row gồm 3 card:
  - Today progress + progress bar.
  - 7-day total.
  - Sessions this week.
- Panel dưới hiển thị bars chart 7 ngày + nút Start study session.

#### 15.5.4. Session Timer view

- Inputs:
  - Subject select.
  - Session title.
  - Work mode (tomato/focus_clock).
  - Tomato length (chỉ dùng cho mode tomato).
- Timer display dùng font mono, kích thước lớn.
- Controls: Start, Pause, Stop.
- Có quick notes textarea.
- Có các class state cho quick-start-running, quick-start-pending, quick-start-achieved.

#### 15.5.5. History view

- Filter row gồm 4 trường:
  - Search.
  - From date.
  - To date.
  - Subject.
- Action row:
  - Add manual session.
  - Export JSON.
  - Export CSV.
- Data table columns:
  - Date, Goal, Subject, Title, Duration, Actions.

#### 15.5.6. Statistics view

- Header có active goal label và bộ nút range.
- KPI row gồm:
  - Total study time.
  - Goal achieved days.
  - Average per day.
- Stats layout 2 cột:
  - Weekly trend bars.
  - Subject split donut.
- Panel chi tiết:
  - Daily goal achievement by subject (achievement chart).
  - Streak analytics.
  - Streak by subject.
  - Streak by goal.

#### 15.5.7. Goal Settings view

- Khối Create goal:
  - Goal title, goal type, start date, end date, Add goal button.
- Khối Subjects:
  - Add subject + subject list.
- Khối Reminder:
  - Reminder time + status.
- Khối Goal list:
  - Render list goal item, có trạng thái active và detail-open.
- Khối Goal detail panel:
  - Set as active goal.
  - Weekly targets grid (Monday-Sunday), mỗi dòng có checkbox + phút.
  - Save weekly targets.

### 15.6. Component behavior và interaction rules

- View switching:
  - Chỉ view active hiển thị, dùng animation reveal (fade + translateY).
- Button system:
  - Primary, secondary, danger, google, text-action.
- Form controls:
  - Input/select/textarea có focus ring màu accent.
- Bảng/biểu đồ:
  - History dùng table cố định cột.
  - Dashboard/Onboarding dùng bars chart dạng cột.
  - Statistics dùng cả bars, donut và matrix chart.
- Modal:
  - Dùng modal-overlay + modal-card cho quick edit subject/work mode.

### 15.7. Accessibility và trạng thái hệ thống

- Nav/button/input đều có trạng thái hover/focus/disabled rõ ràng.
- Auth state ảnh hưởng trực tiếp layout:
  - Chưa login: chỉ hiển thị login view.
  - Đã login: hiển thị sidebar + topbar + các app view.
- Mọi view quan trọng đều có status text để phản hồi thao tác.

## 16. Tiêu chuẩn phát triển dự án (code dễ đọc, dễ mở rộng)

### 16.1. Nguyên tắc thiết kế mã nguồn

- Ưu tiên kiến trúc module rõ ràng: UI, domain, hạ tầng tách biệt.
- Mỗi module chỉ chịu một trách nhiệm chính (Single Responsibility).
- Ưu tiên composition thay vì phụ thuộc chéo giữa nhiều module.
- Tránh logic nghiệp vụ nằm trong UI; nghiệp vụ phải nằm ở core/domain.
- Tránh hardcode; đưa hằng số vào config hoặc constants.

### 16.2. Cấu trúc thư mục đề xuất (Tauri 2)

```text
pomoTime/
  src/                        # Frontend (UI trong Tauri WebView)
    app/                      # bootstrap, router, providers
    features/                 # module theo tính năng (goals, sessions, stats)
    shared/                   # component, hooks, utils dùng chung
  src-tauri/
    src/
      commands/               # Tauri commands
      core/                   # domain logic: timer, streak, stats
      services/               # use case / application service
      infrastructure/         # SQLite, Supabase client, notification
      models/                 # struct/domain model
      errors/                 # AppError và mapping lỗi
    migrations/               # migration SQLite local
  supabase/
    migrations/               # migration cloud database
    policies/                 # RLS policy SQL
  docs/
    adr/                      # architecture decision records
```

### 16.3. Quy ước đặt tên và tổ chức file

- Rust: module/file dùng snake_case, struct/enum dùng PascalCase, function dùng snake_case.
- Frontend: component dùng PascalCase, hooks dùng useXxx, file feature dùng kebab-case.
- Tên biến phải thể hiện ngữ nghĩa nghiệp vụ (ví dụ: daily_target_minutes, current_streak).
- Một file chỉ nên phục vụ một mục đích chính.
- Hàm dài khuyến nghị dưới 50 dòng; tách hàm khi có nhiều nhánh điều kiện.
- Tránh nesting sâu quá 4 mức.

### 16.4. Quy chuẩn code Rust

- Bắt buộc chạy rustfmt.
- Bắt buộc pass clippy với mức deny warnings cho CI.
- Không dùng unwrap/expect trong production path; dùng Result và xử lý lỗi tường minh.
- Mọi lỗi nghiệp vụ chuẩn hóa về AppError và thông điệp thân thiện cho người dùng.
- Logic tính toán (streak, thống kê, goal progress) viết dưới dạng hàm thuần để dễ test.

### 16.5. Quy chuẩn code Frontend

- Dùng TypeScript strict mode.
- Không dùng any nếu không có lý do bắt buộc và không có ghi chú rõ ràng.
- Tách component hiển thị và logic lấy dữ liệu.
- State toàn cục chỉ dùng cho dữ liệu thật sự chia sẻ nhiều màn hình.
- Tất cả input form phải validate trước khi gọi command/API.

### 16.6. Tiêu chuẩn dữ liệu và migration

- Mọi thay đổi schema phải đi qua migration, không sửa tay trực tiếp trên môi trường production.
- Bảng chính phải có created_at, updated_at.
- Bảng liên quan user bắt buộc có user_id và ràng buộc khóa ngoại phù hợp.
- Bật RLS cho toàn bộ bảng trên Supabase; policy mặc định theo auth.uid() = user_id.
- Viết seed dữ liệu mẫu cho local dev để team test thống nhất.

### 16.7. Tiêu chuẩn giao tiếp UI <-> Rust <-> Supabase

- Mỗi Tauri command có input/output type rõ ràng.
- Chuẩn hóa response theo một cấu trúc thống nhất:
  - success
  - data
  - error
- Không để UI gọi SQL trực tiếp; mọi truy cập dữ liệu đi qua service/infrastructure.
- Tách riêng lớp mapping giữa DB model và domain model.

### 16.8. Error handling, logging, bảo mật

- Log theo mức: debug, info, warn, error.
- Không log token, mật khẩu hoặc dữ liệu nhạy cảm.
- Thông báo lỗi cho user ngắn gọn, có hướng xử lý (ví dụ: thử lại, kiểm tra mạng).
- Với lỗi đồng bộ cloud, ứng dụng vẫn phải cho phép làm việc offline.

### 16.9. Tiêu chuẩn test và chất lượng

- Mục tiêu coverage tối thiểu: 80% cho phần core logic.
- Unit test: timer, streak, tính tiến độ ngày/tuần.
- Integration test: command + SQLite/Supabase adapter.
- E2E test: luồng đăng nhập, tạo goal ban đầu, bắt đầu/kết thúc phiên học.
- CI bắt buộc pass: format, lint, test trước khi merge.

### 16.10. Tiêu chuẩn Git và code review

- Branch naming: feature/, fix/, refactor/, chore/.
- Commit message theo chuẩn: feat, fix, refactor, docs, test, chore.
- Pull request phải có:
  - mô tả mục tiêu thay đổi
  - ảnh/chụp màn hình nếu thay đổi UI
  - checklist test đã chạy
  - rủi ro và kế hoạch rollback (nếu có)

### 16.11. Definition of Done (DoD)

- Code pass format, lint, test.
- Không còn TODO critical trong phần đã triển khai.
- Có test cho logic mới hoặc bug fix.
- Có cập nhật tài liệu liên quan (spec/changelog/ADR nếu cần).
- Được review và approved trước khi merge.

## 17. Kế hoạch triển khai spec (execution plan)

### 17.1. Mục tiêu triển khai MVP

- Đưa ứng dụng PomoTime MVP lên mức usable end-to-end trên Linux/Windows với Tauri 2.
- Đảm bảo luồng cốt lõi hoạt động đầy đủ: login -> onboarding goal -> quick study -> timer -> lưu history -> xem stats.
- Bảo đảm local-first: chạy ổn offline với SQLite, đồng thời chuẩn bị sẵn boundary để đồng bộ cloud ở giai đoạn sau.

### 17.2. Nguyên tắc triển khai

- Triển khai theo vertical slice: mỗi sprint hoàn tất 1 luồng có thể demo được.
- Ưu tiên test-first cho core logic (timer, progress, streak, aggregation).
- Frontend không gọi SQL trực tiếp; mọi dữ liệu đi qua command/service.
- Mọi bảng dữ liệu và policy thay đổi qua migration có version.

### 17.3. Phân rã module và phụ thuộc

- Stream A - Platform/Foundation:
  - Tauri shell, bootstrap app, router/view state, logging nền tảng.
  - Là tiền đề cho toàn bộ stream còn lại.
- Stream B - Auth (Supabase):
  - Session restore khi mở app, email/password, Google OAuth, sign out.
  - Phụ thuộc Stream A.
- Stream C - Data Layer local-first:
  - SQLite schema + repository + command contracts.
  - Phụ thuộc Stream A, đồng thời cung cấp nền cho Stream D/E/F.
- Stream D - Goals + Onboarding:
  - Tạo goal, weekly target, active goal, quick study defaults.
  - Phụ thuộc Stream B + C.
- Stream E - Session Timer + History:
  - Start/pause/resume/stop, persist session, edit/delete history.
  - Phụ thuộc Stream B + C + D (active goal/subject context).
- Stream F - Dashboard + Statistics:
  - Daily progress, 7/30-day metrics, chart aggregation, achieved-day highlight.
  - Phụ thuộc Stream C + E (+ D cho target comparison).
- Stream G - Quality/Release:
  - Test automation, CI gates, packaging, release checklist.
  - Chạy xuyên suốt và chốt ở sprint cuối.

### 17.4. Roadmap theo sprint (đề xuất 6 sprint / 12 tuần)

#### Sprint 1 (Tuần 1-2) - Foundation + Architecture skeleton

- Deliverables:
  - Khởi tạo project structure theo mục 16.2.
  - Thiết lập design tokens, layout shell, view routing cơ bản.
  - Chuẩn hóa AppError + response contract `success/data/error`.
  - Thiết lập lint/format/test pipeline cơ bản.
- Exit criteria:
  - App chạy được desktop Linux/Windows.
  - Có pipeline CI chạy format + lint + unit test.

#### Sprint 2 (Tuần 3-4) - Auth end-to-end

- Deliverables:
  - Tích hợp Supabase Auth: email/password + Google OAuth.
  - Startup auth decision: có session vào app, không có session vào login.
  - Màn login riêng (không sidebar), handling lỗi login rõ ràng.
  - Hiển thị avatar + tên user trên top bar sau login.
  - Luồng sign out quay lại login.
- Exit criteria:
  - E2E pass cho login success/fail và logout.

#### Sprint 3 (Tuần 5-6) - Goals + Onboarding

- Deliverables:
  - Schema/migration cho LearningGoal và WeeklyGoalTarget.
  - Onboarding tạo goal đầu tiên, validate form.
  - Goal list -> detail -> set active goal.
  - Quick Study text editable (subject/work mode), modal chỉnh nhanh.
  - Default logic: latest session; fallback newest subject + Focus Clock.
- Exit criteria:
  - User mới có thể tạo goal và bắt đầu quick study không cần thao tác thủ công ngoài luồng.

#### Sprint 4 (Tuần 7-8) - Session Timer + History

- Deliverables:
  - Timer state machine (start/pause/resume/stop) ổn định.
  - Persist StudySession vào SQLite theo `user_id`.
  - History list + filter cơ bản + edit/delete phiên học.
  - Manual add session nếu quên bấm timer.
- Exit criteria:
  - Mọi phiên học kết thúc đều lưu đúng duration và xuất hiện ở History.

#### Sprint 5 (Tuần 9-10) - Dashboard + Statistics

- Deliverables:
  - Tổng hợp số liệu hôm nay/7 ngày/30 ngày/tháng hiện tại.
  - Daily progress theo target của đúng weekday.
  - Study time chart 7 ngày (total theo ngày), cột đạt target màu xanh.
  - Các chỉ số: total hours, sessions, avg/session, streak.
- Exit criteria:
  - Dashboard/Statistics phản ánh đúng dữ liệu từ history.

#### Sprint 6 (Tuần 11-12) - Hardening + Release MVP

- Deliverables:
  - Tối ưu lỗi/edge case, empty states, error states.
  - Tăng coverage core logic >= 80%.
  - Chuẩn hóa release checklist và smoke test desktop.
  - Tài liệu vận hành dev/test/release.
- Exit criteria:
  - Đạt tiêu chí DoD mục 16.11 cho toàn bộ MVP scope.

### 17.5. Backlog kỹ thuật chi tiết theo lớp

- Frontend (WebView):
  - Auth screens + guarded routes/views.
  - Onboarding wizard + quick-study modal editing.
  - Timer UI, history table, stats charts, settings screens.
- Rust Core/Services:
  - Timer engine và state transitions.
  - Domain logic: streak, daily progress, aggregates.
  - Use cases cho goals/sessions/stats.
- Infrastructure:
  - SQLite repositories + migrations local.
  - Supabase client integration cho Auth.
  - Mapping DB model <-> domain model.
- Supabase:
  - Project setup, auth providers, environment configs.
  - RLS policies theo `auth.uid() = user_id`.
  - Migration/policy review checklist.

### 17.6. Kế hoạch test-first (TDD) theo luồng

- Auth stream:
  - RED: test startup session decision, login fail/success, logout.
  - GREEN: implement auth service + UI handlers tối thiểu để pass.
  - REFACTOR: tách adapter Supabase và auth state store.
- Goal/Onboarding stream:
  - RED: test validate goal input, set active goal, quick-study default resolver.
  - GREEN: implement use cases + UI integration.
  - REFACTOR: cô lập logic resolver thành pure function.
- Timer/Session stream:
  - RED: test state machine transitions + duration computation.
  - GREEN: implement timer core + persistence.
  - REFACTOR: tách command handler khỏi domain service.
- Stats stream:
  - RED: test aggregation theo ngày/tuần/tháng, achieved-day detector.
  - GREEN: implement stats queries + projections.
  - REFACTOR: tối ưu query và cache read model.

### 17.7. Quality gates (CI bắt buộc)

- Gate 1: format pass (`rustfmt`, formatter frontend).
- Gate 2: lint pass (`clippy -D warnings`, eslint/tsc strict).
- Gate 3: unit + integration test pass.
- Gate 4: e2e smoke pass cho 3 luồng critical:
  - login/logout
  - create first goal
  - start/stop study session
- Gate 5: coverage core logic >= 80%.

### 17.8. Rủi ro chính và hướng giảm thiểu

- Rủi ro: OAuth redirect flow khác nhau theo OS.
  - Giảm thiểu: chốt redirect strategy sớm từ Sprint 2, test trên Linux/Windows ngay khi tích hợp.
- Rủi ro: drift giữa prototype UI và domain logic thật.
  - Giảm thiểu: dùng contract test giữa UI handlers và command responses.
- Rủi ro: sai số timer khi app background/sleep.
  - Giảm thiểu: tính duration theo timestamp monotonic thay vì chỉ đếm tick UI.
- Rủi ro: schema thay đổi liên tục làm gãy dữ liệu local.
  - Giảm thiểu: migration versioned + backward-compatible scripts cho dev data.
- Rủi ro: flaky e2e do phụ thuộc mạng/Supabase.
  - Giảm thiểu: tách test mock auth và smoke test thật; retry có kiểm soát.

### 17.9. Phân bổ nguồn lực đề xuất

- Frontend engineer:
  - Owner Stream D/E/F (UI/UX và interaction).
- Rust engineer:
  - Owner Stream C/E/F (domain + command + repository abstraction).
- Backend/Supabase engineer:
  - Owner Stream B + policy/migration Supabase.
- QA engineer:
  - Owner test plan, e2e critical paths, regression matrix theo sprint.

### 17.10. Cột mốc demo và nghiệm thu

- Demo 1 (cuối Sprint 2): login/logout hoàn chỉnh.
- Demo 2 (cuối Sprint 4): onboarding + timer + history end-to-end.
- Demo 3 (cuối Sprint 5): dashboard/statistics đúng số liệu.
- Go/No-Go MVP (cuối Sprint 6): pass quality gates + DoD + smoke desktop.

## 18. Task breakdown chi tiết (execution checklist)

### 18.1. Nhóm A - Desktop shell Linux/Windows (Tauri 2)

- [x] A1. Khởi tạo `package.json` với scripts `dev/build/tauri`.
- [x] A2. Khởi tạo `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`.
- [x] A3. Tạo `src-tauri/tauri.conf.json` cho cửa sổ desktop chuẩn Linux/Windows.
- [x] A4. Tạo capability mặc định `src-tauri/capabilities/default.json`.
- [x] A5. Bật CSP linh hoạt cho prototype webview (`csp: null`) để không chặn inline script hiện tại.
- [x] A6. Cài `@tauri-apps/cli` vào workspace để chạy script Tauri.
- [x] A7. Cài Rust toolchain (`cargo`) trên máy build.
- [ ] A8. Cài dependencies hệ thống Linux để build Tauri bundle (`webkit2gtk`, `libsoup`, ...).
- [ ] A9. Chạy thành công `npm run dev` với Tauri shell.
- [ ] A10. Build artifact Linux (`appimage/deb`) và Windows (`msi/nsis`).

### 18.2. Nhóm B - Auth và user session

- [x] B1. Màn login riêng, không sidebar.
- [x] B2. Login email/password với validate input.
- [x] B3. Google login adapter (Supabase OAuth nếu có config, fallback demo nếu chưa có key).
- [x] B4. Session restore qua Supabase khi app mở lại (nếu có session hợp lệ).
- [x] B5. Logout + clear state + quay lại màn login.
- [x] B6. Hiển thị avatar + tên + email user trên top bar.
- [x] B7. Tách file config runtime `app-config.js` để cấu hình Supabase không sửa code lõi.

### 18.3. Nhóm C - Dữ liệu local-first và mô hình app state

- [x] C1. Tổ chức app state theo user (`goals`, `subjects`, `sessions`, `weeklyTargets`).
- [x] C2. Persist local theo namespace user (`pomotime.v2.user.<id>`).
- [x] C3. Seed data cho user mới đăng nhập để demo luồng đầy đủ.
- [x] C4. Chuẩn hóa dữ liệu khi load từ localStorage.
- [x] C5. Đồng bộ persist sau mọi thao tác CRUD chính.
- [ ] C6. Chuyển persistence từ localStorage sang SQLite thực sự theo spec.

### 18.4. Nhóm D - Goals + Onboarding + Quick Study

- [x] D1. Create goal từ Onboarding.
- [x] D2. Goal list -> Detail -> Set active.
- [x] D3. Weekly target theo weekday, save theo goal.
- [x] D4. Quick Study hiển thị Subject/Work mode dạng text click-edit modal.
- [x] D5. Default Quick Study theo phiên gần nhất; fallback subject mới nhất + Focus Clock.
- [x] D6. Onboarding chart 7 ngày theo tổng thời gian/ngày + highlight ngày đạt target.

### 18.5. Nhóm E - Timer + Session persistence

- [x] E1. Timer mode: Tomato countdown + Focus Clock count-up.
- [x] E2. Quick Start từ Onboarding đẩy context sang Timer.
- [x] E3. Ghi nhận thời điểm bắt đầu phiên học (`timerSessionStartedAt`).
- [x] E4. Stop timer sẽ lưu StudySession vào dữ liệu user.
- [x] E5. Lưu title, note, subject, duration, work mode, start/end time.
- [x] E6. Sau khi lưu phiên học, auto refresh Dashboard/Onboarding/Stats/History.

### 18.6. Nhóm F - History + Subject management + Export

- [x] F1. History table render động từ sessions.
- [x] F2. Filter theo search/from/to/subject.
- [x] F3. Edit/Delete session trực tiếp từ history.
- [x] F4. Add manual session.
- [x] F5. Subject CRUD (add/rename/delete).
- [x] F6. Reassign sessions khi xóa subject.
- [x] F7. Export sessions JSON.
- [x] F8. Export sessions CSV.

### 18.7. Nhóm G - Dashboard + Statistics

- [x] G1. Dashboard KPI động: today progress, 7-day total, session count.
- [x] G2. Dashboard trend bars động theo dữ liệu thật.
- [x] G3. Filter dashboard theo goal/time range/subject.
- [x] G4. Statistics summary: total time, achieved days, average/day.
- [x] G5. Subject achievement matrix và streak analytics.

### 18.8. Nhóm H - Hardening và release readiness

- [x] H1. Kiểm tra không còn lỗi editor cho `index.html`.
- [x] H2. Smoke test các màn hình chính trên browser nội bộ.
- [ ] H3. Tách code frontend thành module TypeScript strict theo cấu trúc mục 16.2.
- [ ] H4. Viết unit/integration/e2e tests đạt coverage mục tiêu >= 80%.
- [ ] H5. Bổ sung lớp Rust commands + SQLite repository + mapping domain model.
- [ ] H6. Hoàn thiện CI pipeline format/lint/test/build cho Linux/Windows.
