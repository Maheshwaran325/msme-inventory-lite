# MSME Inventory Lite

AI-Native inventory management system for corner-store chains with intermittent internet and concurrent editing capabilities.

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker (optional, for Supabase)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/msme-inventory-lite.git
   cd msme-inventory-lite
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Environment Variables:**
   - Copy `backend-node/.env.example` to `backend-node/.env`
   - Copy `frontend-nextjs/.env.local.example` to `frontend-nextjs/.env.local`

4. **Setup Supabase:**
   - Create a new project on [Supabase](https://supabase.com/).
   - Run the schema migrations from `backend-node/schema/01-schema.sql` and `backend-node/schema/02-import-logs.sql` in the Supabase SQL editor.
   - Fill in the `.env` and `.env.local` files with your Supabase URL and anon key.

### Environment Variables

**`backend-node/.env`**
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**`frontend-nextjs/.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Running the Application

```bash
npm run dev
```

- Frontend will be available at `http://localhost:3000`
- Backend will be available at `http://localhost:4000`

---

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel (Frontend + Backend)

### Architecture Diagram
![Architecture Diagram](./docs/architecture.png)

Key features shown:
- Offline handling with queue and replay
- Optimistic concurrency with conflict resolution modal
- Role-based access control (Owner vs Staff)
- Server-computed KPIs
- CSV import with idempotent upsert

---

## Data Model

### Profiles (Users)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID (PK, references auth.users) | Required |
| email | Text | Unique |
| role | Text | Default `staff` (can be `owner` or `staff`) |

### Products
| Column | Type | Constraints |
|------------|--------------|-------------|
| id | Bigserial PK | Auto-increment |
| name | Text | Required |
| sku | Varchar(64) | Unique, Required |
| category | Text | Optional |
| quantity | Integer | ≥ 0 |
| unit_price | Decimal(10,2)| ≥ 0 |
| version | Integer | For optimistic concurrency |
| created_at | Timestamptz | Auto-generated |
| updated_at | Timestamptz | Auto-generated |

### Import Logs
| Column | Type | Constraints |
|------------|--------------|-------------|
| id | Bigserial PK | Auto-increment |
| file_name | Text | Required |
| status | Text | `success` or `failed` |
| total_rows | Integer | - |
| success_rows | Integer | - |
| failed_rows | Integer | - |
| created_at | Timestamptz | Auto-generated |

---

## API Table

| Route | Method | Description | Request | Response | Errors |
|------------------------|--------|-------------|---------|----------|--------|
| `/api/auth/register` | POST | Register a new user | `{email, password}` | `{user}` | 400 VALIDATION_ERROR |
| `/api/auth/login` | POST | Authenticate user | `{email, password}` | `{token, role}` | 401 INVALID_CREDENTIALS |
| `/api/products` | GET | List products (search/filter) | `?q, ?category` | `[products...]` | 400 INVALID_QUERY |
| `/api/products/:id` | GET | Get single product | `id` | `{product}` | 404 NOT_FOUND |
| `/api/products` | POST | Create product | `{name, sku, category?, quantity, unit_price}` | `{product}` | 400 VALIDATION_ERROR |
| `/api/products/:id` | PUT | Update product | `{fields, version}` | `{updated_product}` | 403 FORBIDDEN, 409 CONFLICT |
| `/api/products/:id` | DELETE | Delete product | `id` | `{status}` | 404 NOT_FOUND |
| `/api/import/csv` | POST | Upload CSV | `file` | `{row_statuses}` | 400 VALIDATION_ERROR |
| `/api/dashboard/kpis` | GET | Server-computed KPIs | none | `{total_items, stock_value, low_stock}` | - |
| `/api/metrics` | GET | Metrics/logs | none | `{counts, p95_latency}` | - |
| `/api/health` | GET | Health check | none | `{status: ok}` | - |

### Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { }
  }
}
```

- `403` → `PERMISSION_EDIT_PRICE`
- `409` → `CONFLICT`
- `400` → `VALIDATION_ERROR`
- `404` → `NOT_FOUND`

---

## Design Justifications

- **Optimistic Concurrency**:
  Used a **version column**. Versions increment on each update → avoids timestamp precision issues.

- **Search Implementation**:
  Chose **exact search + category chips** instead of fuzzy search.
  - Lower complexity, faster for MSME scale
  - Predictable for shopkeepers
  - Better performance on low-end devices

- **Offline Queue**:
  Implemented using **LocalStorage** for simplicity (fast to build and works reliably in all browsers).
  - Each edit is queued if offline, replayed when back online
  - Light enough for this prototype
  - **Limitations:** small storage (~5MB), synchronous API, may not handle very large queues
  - In production → would switch to **IndexedDB (with Dexie.js)** for async, larger storage, and persistence across sessions

---

## Trade-offs

- **Database**: Supabase/PostgreSQL chosen for SQL + real-time support. Firebase was an option but Postgres fits KPI aggregations better.
- **Search**: Did not implement fuzzy search → overkill for small inventory size.
- **Offline Sync**: Basic queue + retry with backoff → not a full production-grade sync engine.

---

## What I didn't build (and why)

- **Real-time updates**: While Supabase supports real-time, it was not implemented to keep the scope focused on core requirements.
- **Advanced analytics**: The dashboard is basic. A production system would have more detailed analytics and reporting.
- **Full-text search**: For a larger inventory, a more robust search solution like Elasticsearch or a dedicated search service would be necessary.

---

## Performance Notes
(Space for performance notes to be added later)

---

## Performance Budget

**Target**: First dashboard render < 2.5s on a cold load

### Measurement Results ✅

**URL Tested**: `https://msme-inventory-frontend.vercel.app/dashboard`

**Key Metrics**:
- **First Contentful Paint (FCP)**: 789.13ms ✅
- **Largest Contentful Paint (LCP)**: 1125.10ms ✅  
- **Speed Index**: 1982.46ms ✅
- **Time to Interactive (TTI)**: 1125.10ms ✅
- **Total Blocking Time (TBT)**: 0ms ✅
- **Cumulative Layout Shift (CLS)**: 0 ✅

**Performance Score**: 100/100 ✅

### Measurement Methodology

**Tools Used**:
- **Lighthouse** (v11.6.0) - Google's web performance auditing tool
- **Chrome DevTools** - For browser-based testing
- **Vercel Analytics** - For real-world performance monitoring

**Steps Taken**:
1. **Cold Load Testing**: 
   - Cleared browser cache and cookies
   - Disabled browser extensions
   - Used incognito/private browsing mode
   - Tested on production URL: `https://msme-inventory-frontend.vercel.app/dashboard`

2. **Lighthouse Configuration**:
   - **Device**: Desktop (simulated)
   - **Throttling**: Simulated throttling enabled
   - **Network**: Fast 3G (1.6 Mbps down / 0.8 Mbps up)
   - **CPU**: 4x slowdown
   - **Audit Mode**: Navigation (full page load)

3. **Test Environment**:
   - **Browser**: Chrome (latest stable)
   - **Connection**: Simulated slow 3G network
   - **Device**: Desktop simulation
   - **Location**: Default (no specific geographic location)

**Assumptions Made**:
- **Network Conditions**: Used Fast 3G throttling to simulate real-world conditions in areas with intermittent connectivity
- **Device Performance**: Simulated mid-range desktop performance (4x CPU slowdown)
- **User Journey**: Measured complete dashboard load including authentication and data fetching
- **Cold Load**: Assumed no cached resources (worst-case scenario)

**Performance Analysis**:
- **Dashboard Render Time**: ~1.1s (LCP metric)
- **Interactive Time**: ~1.1s (TTI metric)
- **Visual Stability**: Perfect (0 CLS)
- **Blocking Time**: None (0ms TBT)

**Conclusion**: The dashboard meets the performance budget with significant margin, rendering in approximately 1.1 seconds on a cold load under simulated slow network conditions.

---

## How I used AI
[See detailed AI usage and prompts](./prompts/prompt_to_production.md)

---

## Prompts
- [Project Architecture](./prompts/2025-08-23_01_project_architecture.md)
- [Project Plan](./prompts/2025-08-23_02_project-plan.md)
- [Architecture Diagram](./prompts/2025-08-23_03_architecture_diagram.md)
- [Schema Review](./prompts/2025-08-24_01_schema-review.md)
- [RLS Policy Check](./prompts/2025-08-25_01_rls-policy-check.md)
- [Database Schema](./prompts/2025-08-25_02_database_schema.md)


---

## Test Artifacts

- **API Test**: Jest + Supertest → verifies stale update returns `409 CONFLICT`.
- **UI Test**: Playwright → verifies the conflict resolution modal appears when server returns conflict/permission error.
- **Sample CSV**: `sample-data/product_sample.csv`