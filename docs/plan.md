# Ke hoach thuc hien PomoTime

## 1) Muc tieu

Xay dung PomoTime thanh desktop app Linux/Windows co the dung end-to-end:
- Dang nhap
- Tao va quan ly goal
- Bat dau/ket thuc phien hoc
- Luu lich su va thong ke
- San sang dong goi ban phat hanh

Nguon yeu cau chi tiet: docs/spec.md

## 2) Hien trang du an

### Da co
- Tauri 2 shell va cau hinh desktop
- Khung UI prototype va logic MVP (dang o dang artifact)
- Auth adapter Supabase o muc co ban
- Local-first persistence tam thoi
- Danh sach task chi tiet trong docs/spec.md (muc 18)

### Chua xong / can uu tien
- Linux prerequisites cho Tauri build
- Frontend architecture dung React + TypeScript strict
- Chuyen localStorage sang SQLite qua Tauri commands
- Test tu dong (unit/integration/e2e) dat >= 80% core coverage
- CI pipeline cho format/lint/test/build

## 3) Ke hoach theo giai doan

## Giai doan 0 - On dinh moi truong (1-2 ngay)
Muc tieu: chay duoc dev va build tren may hien tai.

Cong viec:
- Cai dependencies he thong Linux cho Tauri (webkit2gtk, libsoup, ...)
- Xac nhan npm run dev va npm run build pass
- Chot bo cong cu frontend (React + Vite + TypeScript strict)

Dieu kien hoan thanh:
- Co the chay app bang npm run dev
- Co artifact build thanh cong tren Linux

## Giai doan 1 - Frontend chinh quy (3-5 ngay)
Muc tieu: thay prototype bang source frontend co cau truc ro rang.

Cong viec:
- Scaffold React + TypeScript
- To chuc thu muc theo huong feature/domain
- Tach view: Auth, Onboarding, Dashboard, Timer, History, Stats, Goals
- Dong bo config de Tauri dung frontend build output

Dieu kien hoan thanh:
- Frontend build ra dist on dinh
- Khong phu thuoc vao file prototype cho runtime

## Giai doan 2 - Data layer thuc te (4-6 ngay)
Muc tieu: bo localStorage, dua du lieu vao SQLite qua Rust commands.

Cong viec:
- Thiet ke schema SQLite: goals, sessions, subjects, weekly_targets
- Tao migration
- Viet repository + service trong Rust
- Tao Tauri commands cho CRUD va thong ke
- Mapping model UI <-> domain <-> DB

Dieu kien hoan thanh:
- Tat ca CRUD chinh chay qua Rust commands
- Du lieu giu duoc qua restart app

## Giai doan 3 - Hoan thien nghiep vu MVP (4-6 ngay)
Muc tieu: day du luong su dung theo spec.

Cong viec:
- Auth flow day du (restore session, login fail/success, logout)
- Goal list -> detail -> active goal
- Timer state machine (start/pause/resume/stop)
- History CRUD + export JSON/CSV
- Dashboard + Statistics theo du lieu that

Dieu kien hoan thanh:
- Luong core chay thong: login -> goal -> timer -> history -> stats

## Giai doan 4 - Chat luong va release (3-5 ngay)
Muc tieu: san sang release MVP.

Cong viec:
- Unit tests cho core logic (timer, streak, progress)
- Integration tests cho commands + DB
- E2E smoke test 3 luong critical
- CI: format + lint + test + build
- Release checklist Linux/Windows

Dieu kien hoan thanh:
- Dat quality gates theo spec
- Co release candidate MVP

## 4) Backlog uu tien (theo thu tu lam truoc)

P0:
- Cai Linux Tauri prerequisites
- Khoa frontend stack React + TS
- Chot pipeline build frontend -> dist

P1:
- SQLite schema + migration
- Tauri commands cho sessions/goals/subjects
- Chuyen persistence tu localStorage sang SQLite

P2:
- Hoan thien dashboard/statistics projection
- Test coverage >= 80% cho core logic
- CI pipeline day du

P3:
- Tinh chinh UX, empty/error states
- Toi uu hieu nang va release docs

## 5) Rui ro va giai phap

- Rui ro: Build Linux fail do thieu system libs
  - Giai phap: chot checklist prerequisites, verify ngay dau sprint

- Rui ro: Frontend va Tauri config lech nhau
  - Giai phap: standard hoa 1 duong build, document ro trong README

- Rui ro: Sai so timer
  - Giai phap: tinh theo timestamp thay vi chi dua vao tick UI

- Rui ro: Regression khi doi data layer
  - Giai phap: tao test cho use cases truoc khi migrate

## 6) Tieu chi Done tung phase

Moi phase duoc xem la done khi:
- Co deliverables ro rang
- Code khong loi editor
- Da chay validate toi thieu lien quan
- Cap nhat tai lieu lien quan (neu thay doi hanh vi)

## 7) Action ngay tiep theo

1. Cai Linux prerequisites de mo blocker build
2. Scaffold React + TypeScript va noi vao Tauri build
3. Bat dau Giai doan 2: thiet ke schema SQLite + Tauri commands
