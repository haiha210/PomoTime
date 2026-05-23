# Tasks trien khai PomoTime

## 1. Muc tieu cua file nay

File nay phan ra task chi tiet tu docs/plan.md de co the thuc hien theo tung buoc ro rang.

Nguon tham chieu:
- docs/plan.md
- docs/spec.md

## 2. Quy uoc

- Trang thai task:
[ ] TODO
[~] IN-PROGRESS
[x] DONE

- Muc do uu tien:
P0 = blocker can xu ly ngay
P1 = core MVP
P2 = quality
P3 = toi uu

- Rule thuc thi:
Moi task phai co dau ra ro rang va tieu chi nghiem thu.
Task nao lien quan build/test phai co command validate.

## 3. Danh sach task theo milestone

## M0 - Mo blocker moi truong (1-2 ngay)

[~] TSK-0001 (P0) Cai Linux prerequisites cho Tauri
Phu thuoc: khong
Dau ra: may local co day du system libs de build Tauri
Checklist:
- Cai pkg-config, libwebkit2gtk, libgtk-3, libayatana-appindicator3, librsvg2, patchelf
- Chup lai command da chay trong log
Nghiem thu:
- cargo check --manifest-path src-tauri/Cargo.toml pass
- npm run dev khong fail do thieu library he thong
Ghi chu trang thai:
- Da xac nhan pkg-config/webkit2gtk/gtk3/ayatana-appindicator3/librsvg OK.
- Con thieu patchelf tren may local.

[x] TSK-0002 (P0) Xac nhan toolchain Node + Rust
Phu thuoc: TSK-0001
Dau ra: moi truong dev baseline on dinh
Checklist:
- Xac nhan node -v, npm -v, cargo -V, rustc -V
- Xac nhan npm install thanh cong
Nghiem thu:
- Khong co loi dependency install

[x] TSK-0003 (P0) Smoke build desktop Linux
Phu thuoc: TSK-0002
Dau ra: artifact build Linux tao duoc
Checklist:
- Chay npm run build
- Kiem tra output bundle Linux
Nghiem thu:
- Build complete voi exit code 0
Ghi chu trang thai:
- Da build thanh cong voi target Linux deb.
- Artifact xac nhan: src-tauri/target/release/bundle/deb/PomoTime_0.1.0_amd64.deb
- Da bo sung icon bundle va dieu chinh target local sang deb de tranh blocker linuxdeploy/AppImage tren may hien tai.

[x] TSK-0004 (P0) Chot huong frontend React + TypeScript
Phu thuoc: TSK-0002
Dau ra: quyet dinh stack duoc document
Checklist:
- Chot Vite + React + TypeScript strict
- Chot convention thu muc src theo feature
Nghiem thu:
- docs/plan.md va docs/tasks.md khong mau thuan

[x] TSK-0005 (P0) Thiet lap PostgreSQL local bang Docker
Phu thuoc: khong
Dau ra: local environment co DB Postgres chay bang docker compose
Checklist:
- Tao docker-compose.yml voi service postgres
- Tao .env.example cho DATABASE_URL local
- Tao scripts db:up/db:down/db:logs
Nghiem thu:
- docker compose up -d postgres chay duoc

[x] TSK-0006 (P0) Chuan hoa flow task -> test -> commit -> push
Phu thuoc: TSK-0002
Dau ra: co script tu dong hoa cho moi task
Checklist:
- Tao script scripts/task_complete.sh
- Tao npm script task:complete
- Co test:all de gom frontend + rust tests
Nghiem thu:
- Co the goi npm run task:complete -- <TASK_ID> "message"

## M1 - Frontend React chinh quy (3-5 ngay)

[x] TSK-1001 (P0) Scaffold React + Vite + TypeScript
Phu thuoc: TSK-0004
Dau ra: source frontend that su ton tai (khong dung runtime tu file prototype)
Checklist:
- Tao project frontend trong src/
- Bat TypeScript strict
- Cai dat script build frontend
Nghiem thu:
- Frontend build tao ra dist/

[x] TSK-1002 (P0) Noi build frontend vao Tauri config
Phu thuoc: TSK-1001
Dau ra: luong build desktop dung frontend output dung cach
Checklist:
- Cap nhat beforeDevCommand va beforeBuildCommand trong src-tauri/tauri.conf.json
- Dam bao frontendDist tro dung dist
Nghiem thu:
- npm run dev mo app voi frontend moi
- npm run build dung frontend output moi

[x] TSK-1003 (P1) Tao app shell va router views
Phu thuoc: TSK-1001
Dau ra: khung man hinh theo spec
Checklist:
- Tao views: auth, onboarding, dashboard, timer, history, stats, goals
- Tao layout voi sidebar + topbar
Nghiem thu:
- Co the dieu huong qua tat ca views khong crash
Ghi chu trang thai:
- Da them router + shell layout trong src/app/AppRouter.tsx va src/app/MainLayout.tsx.
- Da tao views auth/onboarding/dashboard/timer/history/stats/goals theo feature folders.
- Da them test dieu huong frontend trong src/App.test.tsx.

[x] TSK-1004 (P1) Tach module theo feature/domain
Phu thuoc: TSK-1003
Dau ra: cau truc de mo rong de dang
Checklist:
- Tach state va logic theo features
- Tao shared utilities cho date/time/format
Nghiem thu:
- Khong con 1 file frontend qua lon lam trung tam moi logic
Ghi chu trang thai:
- Da tach code frontend theo src/features, src/app, src/core, src/shared.
- Da bo sung utility src/shared/utils/dateTime.ts cho logic format dung chung.

[x] TSK-1005 (P1) Ket noi runtime config Supabase
Phu thuoc: TSK-1003
Dau ra: frontend doc config tu app-config.js
Checklist:
- Doc POMOTIME_SUPABASE_URL va POMOTIME_SUPABASE_ANON_KEY
- Giu backward compatibility voi key legacy
Nghiem thu:
- Khong co loi khi key trong (demo mode)
- Co the init supabase client khi co key
Ghi chu trang thai:
- Da them config loader src/core/config/supabaseConfig.ts voi fallback key legacy LEARNTIME.
- Da them Supabase client bootstrap src/core/supabase/client.ts va auth service su dung runtime config.
- Da them test config runtime trong src/core/config/supabaseConfig.test.ts.

## M2 - Data layer that su voi PostgreSQL + Tauri commands (4-6 ngay)

[x] TSK-2001 (P0) Chot schema PostgreSQL v1
Phu thuoc: TSK-1002
Dau ra: schema cho goals, weekly_targets, subjects, sessions
Checklist:
- Dinh nghia bang + khoa ngoai + index co ban
- Co created_at/updated_at voi bang can thiet
Nghiem thu:
- Schema pass tao moi tren DB trong
Ghi chu trang thai:
- Da tao migration: src-tauri/migrations/0001_init_postgres.sql
- Da apply migration tren Docker Postgres local va xac nhan 4 bang duoc tao.

[x] TSK-2002 (P0) Tao migration runner PostgreSQL
Phu thuoc: TSK-2001
Dau ra: co co che migrate DB local
Checklist:
- Tao folder migration trong src-tauri
- Tao logic run migration khi app start
Nghiem thu:
- App start lan dau tu tao schema
- App start lan sau khong bi migrate lap
Ghi chu trang thai:
- Da them migration runner trong Rust: src-tauri/src/database.rs
- App startup goi initialize_database() truoc khi tao Tauri runtime.
- Da verify 2 lan chay lien tiep voi POMOTIME_RUN_MIGRATIONS_ONLY=1, migration chi duoc ghi 1 ban ghi trong schema_migrations.

[x] TSK-2003 (P1) Implement repository layer (Rust)
Phu thuoc: TSK-2002
Dau ra: CRUD layer cho tung entity
Checklist:
- Goal repository
- Subject repository
- Session repository
- Weekly target repository
Nghiem thu:
- CRUD co test co ban cho moi repository
Ghi chu trang thai:
- Da them repository layer trong src-tauri/src/repository/ cho 4 entity chinh.
- Da them 4 test CRUD cho tung repository, chay qua cargo test voi PostgreSQL local.

[x] TSK-2004 (P1) Implement service/use-case layer (Rust)
Phu thuoc: TSK-2003
Dau ra: xu ly nghiep vu tach khoi transport layer
Checklist:
- Use-case cho auth-state sync local
- Use-case cho timer stop -> save session
- Use-case cho daily progress va streak
Nghiem thu:
- Logic nghiep vu khong nam truc tiep trong command handler
Ghi chu trang thai:
- Da them service layer trong src-tauri/src/services/ (auth_state_service, timer_service, progress_service).
- Da them test cho use-case auth sync, timer stop->save session, daily progress va streak.

[x] TSK-2005 (P1) Tao Tauri commands contracts
Phu thuoc: TSK-2004
Dau ra: command input/output ro rang
Checklist:
- goals commands
- subjects commands
- sessions commands
- stats commands
Nghiem thu:
- Frontend goi command thanh cong cho cac luong chinh
Ghi chu trang thai:
- Da them command layer trong src-tauri/src/commands cho goals/subjects/sessions/stats.
- Da dang ky invoke_handler trong main.rs voi command contracts ro rang.
- Da them frontend wrapper src/lib/tauriCommands.ts va unit tests cho mapping payload command.

[x] TSK-2006 (P1) Migrate persistence tu localStorage sang PostgreSQL
Phu thuoc: TSK-2005
Dau ra: runtime khong phu thuoc localStorage cho core data
Checklist:
- Mapping local model -> DB model
- One-time migration logic (neu co)
- Loai bo code path localStorage cho CRUD chinh
Nghiem thu:
- Restart app van giu du lieu
- Tao/sua/xoa du lieu qua command va DB
Ghi chu trang thai:
- Da them one-time migration module src/lib/legacyMigration.ts de import du lieu localStorage prototype vao DB qua Tauri commands.
- Runtime CRUD frontend dung command wrapper src/lib/tauriCommands.ts (khong them localStorage fallback cho CRUD chinh).
- Da them unit tests cho migration mapping va command payload contracts.

## M3 - Hoan thien nghiep vu MVP (4-6 ngay)

[x] TSK-3001 (P1) Hoan thien auth flow theo spec
Phu thuoc: TSK-2005
Dau ra: login/logout/session restore on dinh
Checklist:
- Email/password login
- Google login
- Session restore khi app mo
- Logout clear state
Nghiem thu:
- Luong login fail/success hien thi dung
- Logout quay ve man auth
Ghi chu trang thai:
- Da hoan thien login email/password + Google fallback demo trong src/features/auth/AuthView.tsx va authService.ts.
- Da bo sung session restore luc startup (App.tsx + sessionStore.ts).
- Da bo sung test cho login fail/success, restore session va logout routing trong src/App.test.tsx.

[x] TSK-3002 (P1) Hoan thien goals + onboarding
Phu thuoc: TSK-2006
Dau ra: user moi co the tao goal va quick study ngay
Checklist:
- Goal list -> detail -> set active
- Weekly targets theo weekday
- Quick Study default theo phien gan nhat
Nghiem thu:
- User moi tao goal dau tien va bat dau hoc trong 1 luong lien tuc
Ghi chu trang thai:
- Da bo sung command set_active_goal + list/upsert weekly targets trong backend.
- Da cap nhat Goals view voi luong list/detail/set active va cap nhat target theo tung weekday.
- Da cap nhat Onboarding view de tao goal dau tien va xac dinh quick study mode theo session gan nhat.

[ ] TSK-3003 (P1) Hoan thien timer state machine
Phu thuoc: TSK-2006
Dau ra: timer dung voi start/pause/resume/stop
Checklist:
- Tomato countdown
- Focus clock count-up
- Save session tai stop event
Nghiem thu:
- Duration khong sai lech khi pause/resume

[ ] TSK-3004 (P1) Hoan thien history CRUD + export
Phu thuoc: TSK-2006
Dau ra: user quan ly lich su day du
Checklist:
- Filter by date/subject/search
- Edit/Delete session
- Add manual session
- Export JSON/CSV
Nghiem thu:
- CRUD va export chay tu du lieu DB that

[ ] TSK-3005 (P1) Hoan thien dashboard + statistics
Phu thuoc: TSK-3003, TSK-3004
Dau ra: thong ke dung du lieu that theo spec
Checklist:
- KPI hom nay, 7 ngay, 30 ngay
- So sanh target theo weekday
- Streak, average/session, achieved days
Nghiem thu:
- So lieu dashboard khop voi history va target

## M4 - Chat luong, test, CI, release (3-5 ngay)

[ ] TSK-4001 (P2) Unit tests cho core logic
Phu thuoc: TSK-3003, TSK-3005
Dau ra: test cho timer, streak, progress
Checklist:
- Timer transitions
- Daily progress calc
- Streak calc
Nghiem thu:
- Unit test pass on local

[ ] TSK-4002 (P2) Integration tests cho command + DB
Phu thuoc: TSK-2006
Dau ra: test duong di du lieu frontend <-> command <-> DB
Checklist:
- CRUD integration cho goals/sessions/subjects
- Stats projection integration
Nghiem thu:
- Integration test pass

[ ] TSK-4003 (P2) E2E smoke cho 3 luong critical
Phu thuoc: TSK-3001, TSK-3002, TSK-3003
Dau ra: test tu dong cho luong MVP can ban
Checklist:
- login/logout
- create first goal
- start/stop study session
Nghiem thu:
- E2E smoke pass o local CI-like run

[ ] TSK-4004 (P2) Thiet lap CI pipeline
Phu thuoc: TSK-4001, TSK-4002
Dau ra: pipeline format/lint/test/build
Checklist:
- Rust format + clippy
- Frontend lint + type-check
- Test jobs
- Build jobs Linux/Windows
Nghiem thu:
- Pipeline xanh tren branch chinh

[ ] TSK-4005 (P2) Dat muc tieu coverage >= 80% cho core logic
Phu thuoc: TSK-4001, TSK-4002
Dau ra: bao cao coverage
Checklist:
- Bổ sung test cho cac case con thieu
- Kiem tra nguong coverage
Nghiem thu:
- Coverage core logic >= 80%

[ ] TSK-4006 (P3) Release checklist Linux/Windows
Phu thuoc: TSK-4004
Dau ra: release candidate MVP
Checklist:
- Verify artifact Linux (appimage/deb)
- Verify artifact Windows (msi/nsis)
- Smoke run tai moi platform
Nghiem thu:
- Co release candidate dat tieu chi go/no-go

## 4. Task song song de giam lead time

[ ] PAR-01 Viet unit test cho pure logic song song voi implementation commands
[ ] PAR-02 Chuan bi CI skeleton song song khi frontend scaffold xong
[ ] PAR-03 Chuan bi e2e smoke scripts song song khi auth flow da on dinh

## 5. Task dang can lam ngay (Next 7 days)

[~] NOW-01 Hoan thanh TSK-0001 va TSK-0002
[x] NOW-02 Hoan thanh TSK-1001 va TSK-1002
[x] NOW-03 Bat dau TSK-2001 de khoa schema v1

## 6. Definition of Done cho moi task

Mot task duoc tick DONE khi:
- Co commit code va tai lieu lien quan
- Da co bang chung command validate
- Khong con loi editor o file vua sua
- Khong pha vo cac luong da pass truoc do
