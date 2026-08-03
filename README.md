[English](./README.en.md)

# 馬偕復健資料後端 MackayBackend

> 馬偕紀念醫院 × 台灣科技大學 復健硬體專案的資料後端。復健裝置透過 API 上傳訓練資料，醫護人員透過網頁後台檢視病患的復健歷史與逐次嘗試紀錄。

---

## 目錄

1. [專案簡介](#專案簡介)
2. [系統架構](#系統架構)
3. [技術棧](#技術棧)
4. [快速開始](#快速開始)
5. [環境變數](#環境變數)
6. [資料庫](#資料庫)
7. [API 文件](#api-文件)
8. [管理後台](#管理後台)
9. [測試](#測試)
10. [部署（Vercel）](#部署vercel)
11. [專案結構](#專案結構)
12. [注意事項與常見問題](#注意事項與常見問題)
13. [交接注意](#交接注意)
14. [相關文件](#相關文件)

---

## 專案簡介

本專案是馬偕紀念醫院與台灣科技大學合作的復健硬體專案的**資料後端**，同時包含兩個角色：

- **裝置資料 API**：復健裝置（硬體端）以 `X-API-Key` 認證，將病患每次的訓練嘗試（attempt）批次上傳到後端。後端會自動維護「病患 → 每日復健會話 → 會話運動 → 逐次嘗試」的資料階層。
- **管理後台**：醫護人員以帳號密碼登入網頁後台，逐層檢視病患列表、復健歷史、單次會話的運動明細，以及每一次嘗試的成功／失敗與感測數據。

整個系統以 Next.js 14 App Router 建置，同一份程式碼同時提供 API 路由與伺服器端渲染（SSR）的後台頁面，資料庫使用 PostgreSQL（正式環境為 Neon），部署於 Vercel。

> 特別注意：資料庫的**資料表、欄位、enum 值全部使用繁體中文命名**（透過 Prisma `@map`），例如資料表 `病患`、欄位 `API金鑰`。詳見 [資料庫](#資料庫) 章節。

---

## 系統架構

系統分為三層：

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│   復健裝置（硬體端）          │        │   醫護人員（瀏覽器）          │
│   X-API-Key 認證             │        │   帳號密碼登入 (NextAuth)     │
└──────────────┬──────────────┘        └──────────────┬──────────────┘
               │ HTTPS                                 │ HTTPS
               ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js 14 (App Router)                        │
│                                                                   │
│   裝置 API 層                        管理後台層                     │
│   /api/patients/*                    /  、/patients/*             │
│   /api/sessions/*                    (SSR 後台頁面)               │
│   (X-API-Key)                        /api/admin/*  (NextAuth)     │
│                                                                   │
│   middleware.ts（Edge）：rate limit + API key 存在性 + session gate │
│   route handler（Node.js）：實際 DB 驗證與商業邏輯                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Prisma
                               ▼
              ┌────────────────────────────────┐
              │  PostgreSQL（Neon / 本地 Docker）│
              │  中文命名的資料表與欄位           │
              └────────────────────────────────┘

              ┌────────────────────────────────┐
              │  Upstash Redis（rate limiting） │
              └────────────────────────────────┘
```

**資料流（裝置上傳）**：

1. 裝置以 `X-API-Key` 呼叫 `POST /api/patients/exercise-attempts`，帶上 `exerciseCode` 與一批 `attempts`。
2. Edge middleware 先做 rate limit 與 API key 存在性檢查（**不碰資料庫**，因為 Edge runtime 無法執行 Prisma）。
3. Node.js route handler 以 `authenticateApiRequest` 查詢 `病患.API金鑰` 做真正的驗證，取得 `patientId`。
4. Handler 依 `sessionDate` upsert 當日的 `RehabSession` 與 `RehabSessionExercise`，再批次寫入 `ExerciseAttempt`。

**資料流（後台檢視）**：

1. 醫護人員在 `/login` 以帳號密碼登入，NextAuth 簽發 JWT session。
2. 首頁 `/` 透過伺服器端 `fetch` 呼叫自身的 `/api/admin/patients`（需 `role === 'admin'`）取得病患列表。
3. 更深層的病患子頁面（復健歷史、會話明細、嘗試明細）在伺服器元件中**直接查詢 Prisma**，不經過 API。

---

## 技術棧

| 類別 | 技術 | 版本 | 說明 |
| --- | --- | --- | --- |
| 框架 | Next.js（App Router） | ^14.2.33 | 同時提供 API 路由與 SSR 後台頁面；`"type": "module"`（ESM） |
| UI | React / React DOM | ^18.3.1 | 伺服器元件為主 |
| 語言 | TypeScript | ^5.9.3 | `strict: true`，path alias `@/* → ./src/*` |
| ORM | Prisma / @prisma/client | ^6.17.1 / ^6.16.3 | 資料表／欄位以繁體中文 `@map` |
| 資料庫 | PostgreSQL | Neon（正式）／`postgres:15`（本地 Docker） | provider `postgresql` |
| 後台認證 | NextAuth | ^4.24.11 | Credentials provider，JWT session |
| 密碼雜湊 | bcryptjs | ^2.4.3 | 登入用 `compareSync`（同步阻塞） |
| Rate limit | @upstash/ratelimit + @upstash/redis | ^2.0.6 / ^1.35.6 | Sliding window 3 req / 10s |
| 測試 | Node 內建 `node:test` + tsx | tsx ^4.20.6 | 依賴注入，測試不需資料庫 |
| Lint | ESLint + eslint-config-next | ^8.57.0 / ^15.5.4 | 注意：lint config 為 Next 15，runtime 為 Next 14 |

> Node 版本**未在專案中鎖定**（無 `engines`、無 `.nvmrc`）。建議 Node >= 21（因為 `npm test` 的 glob 展開行為，見 [測試](#測試)）。

---

## 快速開始

以下為**全新 clone 從零到登入後台**的完整步驟，每一步可直接複製貼上。

### 前置需求

- Node.js（建議 >= 21，最低 >= 18.17）與 npm
- Docker（本地 PostgreSQL）
- 一組 Upstash Redis 憑證（**本地開發也必須**，見下方說明）

> **為什麼本地也要 Upstash？** `src/lib/ratelimit.ts` 在 module 載入時就呼叫 `Redis.fromEnv()`，而 `src/middleware.ts` 會 import 它。若 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 未設定，`fromEnv()` 會在載入時直接 throw，導致所有被 middleware 匹配的路由（`/`、`/login`、`/patients/*`、`/api/patients/*`、`/api/sessions/*`、`/api/admin/*`）全部 500（`/api/health` 與 `/api/auth/*` 不在 matcher 內，即使缺 Upstash env 仍可運作）。沒有 in-memory fallback。請先向原團隊索取一組 Upstash 憑證，或自行到 [upstash.com](https://upstash.com) 免費建立一個 Redis database。

### 步驟 1：啟動本地 PostgreSQL

```bash
docker compose up -d
```

這會啟動 `postgres:15`，監聽 `localhost:5432`，帳密為 `user` / `password`，資料庫 `localdb`。

> **等待資料庫就緒**：`docker compose up -d` 一回傳只代表容器「已啟動」；首次啟動還需拉取 `postgres:15` 映像並執行 `initdb`，此時 Postgres 可能尚未接受連線，太早跑 migrate 會失敗。請先等資料庫就緒：
>
> ```bash
> until docker compose exec -T postgres pg_isready -U user; do sleep 1; done
> ```
>
> （或首次啟動約等 3-5 秒。）

### 步驟 2：建立 `.env`

> **重要**：請建立 `.env`（**不是只有 `.env.local`**）。Prisma CLI 與 `tsx` seed script 只讀 `.env`，不讀 `.env.local`（詳見 [環境變數](#環境變數)）。最安全的做法是把所有變數都放進 `.env`。

於專案根目錄建立 `.env`，內容如下（本地 Docker 版本）：

```bash
# 本地 Docker：務必移除 sslmode，postgres:15 不支援 SSL
DATABASE_URL="postgresql://user:password@localhost:5432/localdb?schema=public"

# NEXTAUTH_SECRET：先在終端機執行 openssl rand -base64 32，再把輸出貼進下面引號內。
# .env 由 dotenv 解析、不會執行 shell，$(...) 會被當成字面字串（見下方說明）。
NEXTAUTH_SECRET="<貼上 openssl rand -base64 32 的輸出>"
NEXTAUTH_URL="http://localhost:3000"

# 必填，否則 middleware 載入即崩潰
UPSTASH_REDIS_REST_URL="https://<your-db>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<your-upstash-token>"

# 只有要跑 prisma:seed:prod 時才需要
ADMIN_EMAIL="admin@example.com"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="<choose-a-password>"
ADMIN_NAME="Admin"
SEED_ALLOW_PROD="true"
```

> **不要**在本地 Docker 的 `DATABASE_URL` 保留 `sslmode=require` 或 `channel_binding=require`（那是給 Neon 用的）。對本地 `postgres:15` 會回報「The server does not support SSL connections.」。

> **產生 `NEXTAUTH_SECRET`**：`.env` 由 dotenv 解析、**不會執行 shell 指令替換 `$(...)`**。若把 `NEXTAUTH_SECRET="$(openssl rand -base64 32)"` 照字面貼進 `.env`，值會變成字面字串 `$(openssl rand -base64 32)`——登入仍可運作（NextAuth 接受任何非空 secret），但等於寫死一組公開密鑰，屬安全隱患。正確做法是在終端機執行 `openssl rand -base64 32`，把輸出貼進引號內；或用會實際觸發替換的 shell 追加寫法（於終端機執行，而非寫成 `.env` 檔案內容）：`echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env`。

### 步驟 3：安裝相依套件

```bash
npm install
```

`postinstall` 會自動執行 `prisma generate`。

### 步驟 4：套用資料庫 schema（migration）

```bash
npx prisma migrate deploy
```

這會套用既有的 `20251029062111_initial_schema`。

> 若 migrate 回報 `Can't reach database server at localhost:5432`，代表 Postgres 尚未就緒，稍候重試即可（見步驟 1 的「等待資料庫就緒」）。

### 步驟 5：塞入示範資料（seed）

```bash
npm run prisma:seed
```

`prisma:seed`（`prisma/seed.ts`）會**清空所有資料表**後塞入示範資料：5 種運動類型、3 位病患、一組會話與嘗試，以及一個管理員（帳號 `admin` / 密碼 `password`）。它還會把第一位病患（王大明）的 `apiKey` 印到 console，供 `X-API-Key` 測試使用。

> ⚠️ `prisma:seed` 具破壞性（`TRUNCATE ... RESTART IDENTITY`）。**切勿對共用／正式資料庫執行。** 三個 seed 的差異見 [資料庫](#資料庫)。

### 步驟 6：啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000。

### 步驟 7：登入後台

前往 http://localhost:3000/login，使用 seed 建立的帳密登入：

- 帳號：`admin`
- 密碼：`password`

登入後即可看到病患列表，逐層點入檢視復健資料。

---

## 環境變數

| 變數名 | 用途 | 範例 | 需要的環境 |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:password@localhost:5432/localdb?schema=public`（本地）／Neon 帶 `?sslmode=require`（正式） | 全部 |
| `NEXTAUTH_SECRET` | NextAuth JWT 簽章密鑰 | `openssl rand -base64 32` 產生 | 全部（後台登入必需） |
| `NEXTAUTH_URL` | NextAuth 對外 URL | `http://localhost:3000`（本地）／正式網址 | 全部 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 端點 | `https://xxx.upstash.io` | 全部（middleware 載入即需要） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | `<token>` | 全部 |
| `ADMIN_EMAIL` | prod seed 建立的管理員 email | `admin@example.com` | 僅 `prisma:seed:prod` |
| `ADMIN_USERNAME` | prod seed 建立的管理員帳號 | `admin` | 僅 `prisma:seed:prod` |
| `ADMIN_PASSWORD` | prod seed 建立的管理員密碼 | `<secret>` | 僅 `prisma:seed:prod` |
| `ADMIN_NAME` | 管理員顯示名稱（可選，預設 `Admin`） | `Admin` | 僅 `prisma:seed:prod`（可選） |
| `SEED_ALLOW_PROD` | 放行 prod seed 的旗標 | `true` / `false` | 僅在 `NODE_ENV != production` 時跑 prod seed |
| `NODE_ENV` | 執行環境（Prisma log 等級 / global 快取 / prod seed 放行） | `development` / `production` | 由平台設定（`.env.example` 未列出） |

### `.env` 與 `.env.local` 的載入差異（重要）

專案根目錄有三個 env 檔：`.env`、`.env.local`、`.env.example`。`.gitignore` 規則為 `.env*` 全部忽略，**僅 `!.env.example` 例外**——所以全新 clone 沒有任何 `.env`，必須自行重建。

三種執行情境載入**不同**的檔案集：

| 情境 | 載入的檔案 | 說明 |
| --- | --- | --- |
| Next.js runtime（`next dev` / `build` / `start`） | `.env` + `.env.local` | `.env.local` 覆蓋 `.env`（test 環境除外） |
| Prisma CLI（`migrate` / `generate` / `studio` / `postinstall`） | **只有 `.env`** | 不讀 `.env.local`。所有 migration / 產生 client 用的 `DATABASE_URL` 都來自 `.env` |
| tsx seed script（`tsx prisma/seed*.ts`） | **只有 `.env`** | seed 不 import dotenv；env 是在 `new PrismaClient()` 建構時作為**副作用**載入的（Prisma runtime 讀取專案根 `.env`）。這也是 `seed.prod.ts` 不需 import dotenv 就能讀到 `ADMIN_*` / `SEED_ALLOW_PROD` 的原因 |

> **結論**：若你只複製 `.env.example → .env.local`，`prisma migrate` 與所有 seed 都會看不到 `DATABASE_URL`。請把變數（至少 `DATABASE_URL`）放進 `.env`。最保險是把全部變數都放進 `.env`。

> 另注意：`.env.local` 中若有 `AUTH_SECRET`（NextAuth v5 / Auth.js 的名稱），本專案用的是 NextAuth **v4**，只讀 `NEXTAUTH_SECRET`（在 `.env`），該 `AUTH_SECRET` 幾乎確定為殘留、未使用。

---

## 資料庫

### 模型總覽

共 10 個 model（含 5 個復健領域 model、4 個 NextAuth adapter model 與 `Admin`）+ 3 個 enum；下表刻意將 4 個 NextAuth model（`User`/`Account`/`Session`/`VerificationToken`）併為一列呈現。**領域模型（復健相關）** 的 Prisma 欄位是英文 camelCase，但 `@map` 到繁體中文的資料庫欄位／資料表名；**認證模型**（NextAuth adapter + 自訂 `Admin`）維持英文、無 `@map`。

| Prisma model | DB 資料表（`@@map`） | 說明 |
| --- | --- | --- |
| `Patient` | `病患` | 病患。`id` 為**呼叫端提供的 String**（類身分證號，非自動產生）；`apiKey`（`API金鑰`）為 `@unique @default(cuid())`，即裝置的 `X-API-Key` |
| `ExerciseType` | `運動類型` | 運動類型；`code` 唯一（如 `squat`），供裝置以 `exerciseCode` 引用 |
| `RehabSession` | `運動會話` | 每位病患**每日一筆**復健會話（`@@unique([patientId, sessionDate])`） |
| `RehabSessionExercise` | `會話運動` | 一次會話中的某項運動（`@@unique([sessionId, exerciseTypeId])`） |
| `ExerciseAttempt` | `運動紀錄` | 逐次嘗試；`data`（`數據`）為 `Json?` 自由格式感測數據 |
| `Admin` | `Admin` | 後台管理員；`passwordHash` 為 bcrypt，`userId` 1:1 對 `User` |
| `User` / `Account` / `Session` / `VerificationToken` | 同名（英文） | NextAuth v4 adapter schema。因 session 策略為 JWT，`Account`/`Session`/`VerificationToken` **實際未被使用**（殘留 schema） |

**關聯（文字描述）**：

```
Patient (病患)
  └─ 1:N ─ RehabSession (運動會話)          [onDelete: Cascade]
              └─ 1:N ─ RehabSessionExercise (會話運動)   [onDelete: Cascade]
                          ├─ N:1 ─ ExerciseType (運動類型) [onDelete: Restrict]
                          └─ 1:N ─ ExerciseAttempt (運動紀錄) [onDelete: Cascade]

Admin ─ 1:1 ─ User   (認證用；JWT session，DB session 未使用)
```

**Enum**（值同樣 `@map` 到中文）：

- `RehabSessionStatus`：`open`(開啟) / `closed`(關閉) / `aborted`(中止)
- `RehabSessionExerciseStatus`：`open`(開啟) / `closed`(關閉) / `aborted`(中止)
- `AttemptOutcome`：`success`(成功) / `fail`(失敗) / `invalid`(無效)

> **GOTCHA**：資料庫中的**資料表、欄位、enum 值全部是繁體中文識別碼**（如 `病患`、`API金鑰`、`開啟`）。任何 raw SQL / psql / 外部工具都必須用中文識別碼並加引號，不能用 Prisma 的英文欄位名。`seed.ts` 的 `TRUNCATE` 就是寫死中文表名——改任何 `@@map` 都會默默弄壞該 seed。

### Migration 流程

- 目前只有**一個** migration：`prisma/migrations/20251029062111_initial_schema/`。
- 本地套用：`npx prisma migrate deploy`（套用既有 migration）或 `npx prisma migrate dev`（開發時建立新 migration，需 shadow DB）。
- 產生 client：`npm run prisma:generate`（`postinstall` 也會自動跑）。
- 檢視資料：`npm run prisma:studio`。

### 三個 seed script 的用途與差異

package.json **沒有** `"prisma": { "seed": ... }` 區塊，所以 `npx prisma db seed` **無法運作**。必須用具名的 npm script。

| Script | 檔案 | 破壞性 | 建立內容 | 需要的 env | 防呆 |
| --- | --- | --- | --- | --- | --- |
| `npm run prisma:seed` | `prisma/seed.ts` | ⚠️ **極高**：`TRUNCATE ... RESTART IDENTITY` 清空所有表並重置序號 | 5 運動類型、3 病患（寫死長數字 id）、1 會話 + ~24 嘗試、admin `admin`/`password`（bcrypt cost 10）；印出病患 apiKey | `DATABASE_URL` | **無** |
| `npm run prisma:seed1` | `prisma/seed1.ts` | ⚠️ **高**：對所有表 `deleteMany`（不重置序號） | 5 病患（短 id）、5 運動類型、每人 3 天會話與嘗試（時間戳固定）、admin `admin`/`password`（cost 10） | `DATABASE_URL` | **無** |
| `npm run prisma:seed:prod` | `prisma/seed.prod.ts` | ✅ **無**（idempotent `upsert`） | 5 運動類型 upsert、admin 由 `ADMIN_*` env upsert（bcrypt cost 12） | `DATABASE_URL` + `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD`（三者必填，缺一即 throw）；`ADMIN_NAME` 可選 | ✅ 除非 `NODE_ENV=production` 或 `SEED_ALLOW_PROD=true`，否則拒絕執行 |

> ⚠️ `seed.ts` 與 `seed1.ts` **無任何 prod 防呆**，且會摧毀包含 admin / 認證在內的所有資料。對共用或正式資料庫，**只能**用 `prisma:seed:prod`。
>
> ⚠️ `prisma/seed.prod.ts` 目前在此工作目錄中是 **untracked（未進 git）**，全新 clone 可能沒有這個檔案——交接時務必一併提供，見 [交接注意](#交接注意)。

---

## API 文件

共 8 個 route 檔、9 個 handler。兩套認證機制：裝置端用 **`X-API-Key`** header；後台用 **NextAuth session cookie**。

| 方法 | 路徑 | 認證 | Rate limit | 用途 |
| --- | --- | --- | --- | --- |
| `POST` | `/api/patients/exercise-attempts` | X-API-Key | 僅 middleware | **主要上傳端點**：以 `exerciseCode` 批次上傳嘗試，自動 upsert 當日會話階層 |
| `GET` | `/api/patients/validate-key` | X-API-Key | ✅ **雙重**（見下） | 驗證 API key，回傳病患公開資料 `{id,name,dob}` |
| `GET` | `/api/patients` | X-API-Key | 僅 middleware | 回傳本人完整病患資料列 |
| `GET` | `/api/patients/[id]` | X-API-Key + 擁有權 | 僅 middleware | 回傳含 `sessions` 的病患；key 的 patientId 需等於 `id`，否則 403 |
| `POST` | `/api/sessions/[sessionId]/exercises/[rehabSessionExerciseId]/attempts` | X-API-Key + 擁有權 | 僅 middleware | **舊版上傳**：直接對已知 `rehabSessionExerciseId` 寫入嘗試 |
| `GET` | `/api/admin/patients` | NextAuth session（`role==='admin'`） | 無 | 列出所有病患（含 sessions），供後台首頁使用 |
| `GET`/`POST` | `/api/auth/[...nextauth]` | NextAuth 本身 | 無 | NextAuth Credentials 登入 handler |
| `GET` | `/api/health` | 無 | 無 | Liveness / DB 檢查（`SELECT 1`） |

### `X-API-Key` 認證說明

- Header 名稱為 `x-api-key`（程式也讀 `X-API-Key`，但 `Headers.get` 本就不分大小寫，屬冗餘）。
- 驗證流程（`src/lib/apiAuth.ts`）：讀 header → `prisma.patient.findUnique({ where: { apiKey } })` → 找到回傳 `{ patientId }`，找不到回 `401`。
- API key 即 `Patient.apiKey`（`API金鑰`），為 cuid，**以明文儲存、以原值比對**。任何有 DB 讀取權者即握有所有裝置憑證。
- Edge middleware **只檢查 header 是否存在**（Edge runtime 不能跑 Prisma），真正的 DB 驗證在 Node.js route handler 內。

### Rate limit 數字

- 引擎：Upstash `Ratelimit.slidingWindow(3, "10 s")` → **3 次請求 / 10 秒**。Redis key prefix `mackay_backend_ratelimit`。
- Middleware（`src/middleware.ts`）對任何 `/api/*` 生效，識別子 = `x-api-key` header，否則 `req.ip`，否則 `'127.0.0.1'`。超過回 `429` 純文字。
- `validate-key` handler **另有一組獨立的** rate limit（識別子 = `x-forwarded-for[0]` / `x-real-ip` / `cf-connecting-ip` / `'unknown'`），超過回 `429 {ok:false,error:'Too Many Requests'}` 並帶 `Retry-After` header。因此 `/api/patients/validate-key` 會被限流**兩次**（middleware by key + handler by IP），可能提早 429。
- ⚠️ `src/lib/ratelimit.ts` 原始碼註解寫「10 requests per 10 seconds」是**錯的**，實際是 3 次。

### curl 範例

裝置上傳（主要端點）。將 `<API_KEY>` 換成病患的 `apiKey`（由 `npm run prisma:seed` 印出）：

```bash
curl -X POST http://localhost:3000/api/patients/exercise-attempts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{
    "exerciseCode": "alternating_knees",
    "sessionDate": "2025-10-10T00:00:00Z",
    "attempts": [
      { "startedAt": "2025-10-10T10:00:01Z", "endedAt": "2025-10-10T10:00:03Z", "outcome": "success", "data": { "angleDeg": 92.5 } },
      { "startedAt": "2025-10-10T10:05:01Z", "outcome": "fail" }
    ]
  }'
# 201 -> {"sessionId":<n>,"sessionExerciseId":<n>,"count":2}
```

驗證 API key：

```bash
curl -i -X GET http://localhost:3000/api/patients/validate-key \
  -H "X-API-Key: <API_KEY>"
# 200 -> {"ok":true,"patient":{"id":"...","name":"...","dob":"..."}}
# 401 -> {"error":"Unauthorized: Invalid API key."}
# 429（帶 Retry-After）-> 超過 3 次 / 10 秒
```

健康檢查（公開）：

```bash
curl -s http://localhost:3000/api/health
# 200 -> {"ok":true,"status":"ok","latencyMs":<n>}
# 503 -> DATABASE_URL 未設定
```

> **主要上傳端點（#1）vs 舊版（#5）**：#1 驗證嚴格（檢查 outcome enum、ISO 時間格式、自動建立會話階層）；#5 較寬鬆（不檢查 outcome enum、不檢查 ISO、且**完全忽略** `sessionId` route 參數，僅以運動所屬病患做授權）。**新的裝置程式碼請一律用 #1。**
>
> ⚠️ `GET /api/patients`（#3）回傳整列病患資料，**含 `apiKey`**；`validate-key`（#2）則刻意只回傳 `id/name/dob`。

---

## 管理後台

### 登入方式

- `/login`（`'use client'`）：掛載時以 `getCsrfToken()` 取得 NextAuth CSRF token，渲染純 HTML `<form>` POST 到 `/api/auth/callback/credentials`，欄位為 `username`、`password`。CSRF 完全交由 NextAuth 內建的 double-submit-cookie 機制處理。
- 認證流程（`src/lib/auth.ts` `authorize`）：`prisma.admin.findUnique({ where: { username } })` → `bcrypt.compareSync(password, admin.passwordHash)` → 查 `User` → 回傳 `{ id, name, email, role: 'admin' }`。
- Session 策略為 **JWT**（無 DB session adapter）；`role` 透過 `jwt` → `session` callback 傳遞。

### 導覽層級（逐層 drill-down）

| 路徑 | 頁面 | 內容 |
| --- | --- | --- |
| `/` | 病患列表（首頁） | 伺服器端 `fetch` 自身 `/api/admin/patients`，顯示病患姓名與年齡，連向各病患的復健歷史 |
| `/patients/[id]/sessions` | 復健歷史 | 直接查 Prisma，依日期分組列出該病患的會話 |
| `/patients/[id]/sessions/[sessionId]` | 會話明細 | 列出該次會話的各項運動與嘗試次數 |
| `/patients/[id]/sessions/[sessionId]/exercises/[rehabSessionExerciseId]` | 嘗試明細 | 3 張統計卡（成功 / 失敗 / 成功率）+ 動態欄位表格 |

> 導覽為單向 drill-down，唯一的返回元件是 `BackHomeButton`（`回到首頁`），**沒有麵包屑或返回上一層**——每個「返回」都直接跳回首頁 `/`。
>
> 深層子頁面**繞過 API 直接查 Prisma**，因此這些頁面在 request 當下需要 `DATABASE_URL` 可連線，而不只是 API 需要。

### 動態欄位機制

嘗試明細頁的表格欄位是**從 `ExerciseAttempt.data`（`Json?`）的 key 動態產生**的：

- 走訪所有 attempts，收集每筆 `data` 物件的 `Object.keys()` 聯集（以首次出現順序），即為動態欄位。
- 固定欄位（永遠在前）：`ID`、`結果`（outcome）、`紀錄時間`。
- 中文對照由頁面內兩張本地 map 處理：`headerLocalizationMap`（`angleDeg→角度`、`holdSeconds→維持秒數`、`steps→步數`、`deviations→偏移次數`、`reason→原因`）與 `outcomeLocalizationMap`（`success→成功` 等）。
- ⚠️ **未在對照表中的 key 會原樣顯示為英文欄位標題**（無 schema / 白名單）。上游裝置寫進 `data` 的任何 key 都會變成可見欄位。新增 key 或 outcome 需編輯該頁面檔案。
- 統計：`成功率 = 成功 /（成功 + 失敗）× 100`，`invalid` 不計入分母；0 筆時顯示 0%。

---

## 測試

```bash
npm test
```

- Runner：`node --import tsx --test tests/**/*.test.ts`，使用 Node 內建 `node:test` + `node:assert/strict`。
- 共 3 個測試檔、9 個測試：

| 測試檔 | 涵蓋範圍 |
| --- | --- |
| `tests/patients-route.test.ts` | `GET /api/patients`（200 / 401 / 404）+ admin patients 的 admin 角色檢查（200 / 403），共 4 個 |
| `tests/exercise-attempts-route.test.ts` | `POST exercise-attempts` happy path（201、會話階層）+ 無效 `exerciseCode`（400），共 2 個 |
| `tests/validate-key-route.test.ts` | validate-key 的 200 / 401 forward / 429 限流，共 3 個 |

### 依賴注入（DI）讓測試不需資料庫

每個可測試的 route 都提供 `create*Handler(deps = defaultDeps)` 工廠函式（在 `handler.ts`），對應的 `route.ts` 只是用真實 `defaultDeps` 薄薄地 `export const GET/POST = create*Handler()`。測試時注入**完全 mock 的** `prismaClient` / `authenticateRequest` / `rateLimiter` / `ensureSession` 等，handler 以一個 `new Request(...)` 直接呼叫——**不需要啟動 Next server、不需要資料庫、不需要 env**。已驗證 `npm test` 在無資料庫、無 env 下 9/9 通過。

> ⚠️ **GOTCHA（測試 glob）**：`tests/**/*.test.ts` 交由 `node --test` 展開，這需要 **Node >= 21**。在 Node 18/20 上可能匹配到零檔案而「靜默通過」。測試檔其實都平放在 `tests/` 下，可攜寫法應為 `tests/*.test.ts`。

---

## 部署（Vercel）

### 1. 建置外部服務

- **資料庫（Neon）**：建立一個 PostgreSQL 專案，取得連線字串。正式環境**保留** `?sslmode=require`（Neon 需要）。
- **Redis（Upstash）**：建立一個 Redis database，取得 `UPSTASH_REDIS_REST_URL` 與 `UPSTASH_REDIS_REST_TOKEN`。

### 2. Vercel 環境變數

於 Vercel Project Settings → Environment Variables 設定：

| 變數 | 值 |
| --- | --- |
| `DATABASE_URL` | Neon 連線字串（帶 `sslmode=require`） |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 正式網址（**非** localhost） |
| `UPSTASH_REDIS_REST_URL` | Upstash URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| （若在部署步驟跑 prod seed）`ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `SEED_ALLOW_PROD` | 見 [環境變數](#環境變數) |

### 3. CI/CD 行為

- 本專案**無 `vercel.json`、無 `.vercelignore`、無 `.github/` CI**。「CI/CD」= Vercel 的 Git 整合。
- Vercel 預設流程：`npm install`（觸發 `postinstall` → `prisma generate`）→ Build Command `next build`。`postinstall` 是讓 Prisma client 在 Vercel 每次全新安裝時保持有效的關鍵，**請勿移除**。
- ⚠️ **GOTCHA（migration 不會自動執行）**：Vercel **不會**自動跑 `prisma migrate deploy`（沒有任何設定把它接起來）。若要在部署時套用 migration，需將 Vercel 的 **Build Command 改為** `prisma migrate deploy && next build`。否則 schema 變更永遠不會到達資料庫。
- 4 個後台頁面皆 `export const dynamic = "force-dynamic"`（首頁另有 `revalidate = 0`），刻意強制 SSR、避免 Vercel 在 build 期做靜態最佳化 / build-time DB 呼叫。

### 4. 正式環境 seeding

正式資料庫**只能**用 idempotent 的 `seed.prod.ts`：

> **前置**：確認 `prisma/seed.prod.ts` 已 commit 進 repo（clean clone 預設**沒有**此檔，見 [交接注意](#交接注意)）。若缺此檔，`npm run prisma:seed:prod` 會立刻以 tsx「找不到 `prisma/seed.prod.ts`」錯誤失敗，導致管理員帳號永遠不會建立、沒有人能登入已部署的後台。
>
> **執行位置**：此步驟需**在本機執行**——Vercel build **不會**自動 seed。請將 `DATABASE_URL` 指向 Neon，並先 `export ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD`（`ADMIN_NAME` 可選）。

```bash
# 前置：prisma/seed.prod.ts 已 commit 進 repo（clean clone 預設沒有）
# 在本機執行；DATABASE_URL 指向 Neon，並先 export ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD
SEED_ALLOW_PROD=true npm run prisma:seed:prod
# 或在 NODE_ENV=production 的環境中直接跑
```

- 它 upsert 5 種運動類型與一個 admin（由 `ADMIN_*` env、bcrypt cost 12），**不會**清空任何資料。
- 防呆：除非 `NODE_ENV=production` 或 `SEED_ALLOW_PROD=true`，否則直接 throw 拒絕執行——避免誤將正式 seed 跑在錯的環境。
- **切勿**對正式 / 共用資料庫執行 `prisma:seed` 或 `prisma:seed1`（兩者都會清空全部資料）。

---

## 專案結構

```
MackayBackend/
├── docker-compose.yml          # 本地 postgres:15（user/password/localdb）
├── next.config.mjs             # 僅 reactStrictMode: true（無自訂 rewrites/headers）
├── package.json                # scripts / 相依；type: module
├── tsconfig.json               # strict、path alias @/* → ./src/*
├── .env.example                # env 範本（唯一進 git 的 env 檔）
├── prisma/
│   ├── schema.prisma           # 10 model + 3 enum，中文 @map
│   ├── migrations/
│   │   └── 20251029062111_initial_schema/
│   ├── seed.ts                 # 破壞性 dev seed（TRUNCATE）
│   ├── seed1.ts                # 破壞性 dev seed（deleteMany）
│   └── seed.prod.ts            # 正式 idempotent seed（untracked！）
├── src/
│   ├── middleware.ts           # Edge：rate limit + API key 存在性 + session gate
│   ├── app/
│   │   ├── layout.tsx          # 根 layout（注意 <html lang="en"> 但 UI 全繁中）
│   │   ├── globals.css
│   │   ├── page.tsx            # 首頁：病患列表（fetch /api/admin/patients）
│   │   ├── login/              # 登入頁（client component）+ style.css
│   │   ├── patients/[id]/sessions/...   # 逐層 drill-down 後台頁（直接查 Prisma）
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── admin/patients/{route,handler}.ts
│   │       ├── patients/{route,handler}.ts
│   │       ├── patients/[id]/route.ts
│   │       ├── patients/validate-key/{route,handler}.ts
│   │       ├── patients/exercise-attempts/{route,handler}.ts
│   │       └── sessions/[sessionId]/exercises/[rehabSessionExerciseId]/attempts/route.ts
│   ├── components/
│   │   └── BackHomeButton.tsx  # 唯一的元件（回到首頁）
│   └── lib/
│       ├── prisma.ts           # PrismaClient 單例（global 快取）
│       ├── auth.ts             # NextAuth authOptions + GET/POST
│       ├── apiAuth.ts          # authenticateApiRequest（X-API-Key）
│       ├── ratelimit.ts        # Upstash ratelimit 單例（載入即需 env）
│       └── rehabSessions.ts    # ensureDailySession / ensureSessionExercise（DI）
├── tests/                      # 3 個測試檔，DI mock，不需 DB
├── types/bcryptjs.d.ts         # 手寫型別（未裝 @types/bcryptjs）
├── AGENTS.md / GEMINI.md       # 給 AI 工具的說明
└── 5.4_API數據網頁後台.md       # 系統設計章節（學術報告）
```

---

## 注意事項與常見問題

- **Upstash 為強制相依（全新 clone 會崩）**：`src/lib/ratelimit.ts` 在 import 時就 `Redis.fromEnv()`；若缺 Upstash env，middleware 匹配的所有路由（`/`、`/login`、`/patients/*`、`/api/patients/*`、`/api/sessions/*`、`/api/admin/*`）全部 500；但 `/api/health` 與 `/api/auth/*` 不在 matcher 內，即使缺 env 仍可運作。本地也必須設定。
- **`.env` vs `.env.local` 載入差異**：Prisma CLI 與 seed 只讀 `.env`；Next runtime 讀兩者。請把變數放進 `.env`。詳見 [環境變數](#環境變數)。
- **本地 Docker 的 SSL**：`.env.example` 帶 `sslmode=require`（給 Neon）。對本地 `postgres:15` 必須移除 `sslmode` / `channel_binding`，否則連線失敗。
- **Edge runtime 限制**：middleware 跑在 Edge，無法使用 Prisma（無 TCP socket），因此只做 API key **存在性**檢查；真正的 DB 驗證在 Node.js route handler（`authenticateApiRequest`）。沒有任何 API route 設 `export const runtime = 'edge'`。
- **`force-dynamic` 只在頁面、不在 API**：`src/app/page.tsx` 及三個病患子頁面設 `force-dynamic`（commit `c9ed7de`），用來修正「build 後才新增的病患 / 會話回 404」的問題。API route **沒有**設 `dynamic`／`runtime`／`revalidate`（但因其讀 header / DB，Next 本就視為 dynamic）。
- **時區**：所有對人顯示的日期時間都寫死 `timeZone: 'Asia/Taipei'`（`toLocaleDateString/TimeString('zh-TW', ...)`）。但首頁的 `calculateAge()` 用伺服器本地時區的 `new Date()`——若伺服器非台北時區，生日前後年齡可能差一天。會話列表以 `.toISOString()`（UTC）分組但以台北時間顯示標籤，跨 UTC/台北午夜邊界的會話可能分組／標籤不一致。
- **兩條並存的上傳路徑**：`#1 /api/patients/exercise-attempts`（嚴格）與 `#5 /api/sessions/.../attempts`（寬鬆、忽略 `sessionId`）都會寫入 `ExerciseAttempt`，驗證嚴謹度不同。新裝置請用 #1。
- **`/api/patients` 洩漏 apiKey**：#3 回整列含 `apiKey`；#2 validate-key 刻意只回白名單欄位。
- **API key 為明文**：`Patient.apiKey`（`API金鑰`）未雜湊、以原值比對，有 DB 讀取權即握有所有裝置憑證。
- **admin 路由僅由 handler 保護**：middleware 不 gate `/api/admin/*`；保護在 handler 內的 `getServerSession` + `role==='admin'`。任何新增的 `/api/admin/*` 若忘了這段檢查即完全不設防。
- **限流很兇（3 次 / 10 秒）**：真實裝置容易觸發 429。`req.ip` 在部分 Next 14 host 為 `undefined`，會落到 `'127.0.0.1'` 這個共用 bucket，使匿名 API 流量形同全域限流。
- **JWT 策略、孤兒 schema**：schema 中的 `Account`/`Session`/`VerificationToken` 因 JWT 策略而未使用，勿假設有 DB session。
- **bcrypt 為同步阻塞**：登入用 `compareSync`、seed 用 `hashSync`，每次請求會阻塞 event loop。
- **`prisma db seed` 無法用**：package.json 無 `prisma.seed` 區塊，只能用具名 script（`prisma:seed` / `prisma:seed1` / `prisma:seed:prod`）。
- **測試 glob 需 Node >= 21**：見 [測試](#測試)。
- **`<html lang="en">` 但 UI 全繁中**：`src/app/layout.tsx` 的 lang 屬性為 `en`，實際畫面文字皆 `zh-TW`。
- **README（舊版）對 Vercel 自動 migration 的敘述有誤**：Vercel 不會自動跑 `prisma migrate deploy`，見 [部署](#部署vercel)。

---

## 交接注意

- **外部服務帳號需另行移交**：Vercel、Neon、Upstash 三個帳號的存取權需由原團隊另行移交；或依 [部署（Vercel）](#部署vercel) 章節自建全新的 Neon 資料庫與 Upstash Redis。
- **`prisma/seed.prod.ts` 目前未進 git（untracked）**：正式環境 seeding 依賴此檔，全新 clone 可能沒有它。交接時務必確認此檔已一併提供或已 commit 進 repo。
- **輪換所有機密**：交接前請輪換（rotate）所有既有機密——Neon 資料庫密碼、`NEXTAUTH_SECRET`、Upstash token、以及既有的管理員密碼。工作目錄的 `.env` 若含正式 Neon 連線與 live 憑證，請勿外流，並在交接後立即更換。
- **本地 `.env` 預設可能指向遠端 Neon**：確認本地開發用的 `.env` 指向本地 Docker（`localhost:5432`），避免誤將破壞性 seed 跑在正式資料庫。
- **Node 版本未鎖定**：專案無 `engines` / `.nvmrc`。建議團隊統一 Node >= 21（見 [測試](#測試)）。若需鎖定版本，需向原團隊確認。

---

## 相關文件

- [`5.4_API數據網頁後台.md`](./5.4_API數據網頁後台.md)：學術報告章節，完整描述三層架構、資料模型、endpoint 規格、後台 drill-down UX、雙層認證與限流的安全模型，以及部署 / CI 說明。可作為本 README 的延伸閱讀與背景資料。
- `AGENTS.md` / `GEMINI.md`：給 AI 開發工具的說明；`GEMINI.md` 有一則重要架構註記——middleware 因 Edge runtime 無法使用 Prisma，DB 驗證必須在 route handler 內。