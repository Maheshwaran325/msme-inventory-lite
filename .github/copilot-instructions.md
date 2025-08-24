# AI Assistant Instructions for MSME Inventory Lite

You are an AI coding assistant tasked with helping implement and maintain MSME Inventory Lite, an AI-Native inventory management system for corner-store chains.

## 🔑 Project Architecture

### Core Components
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Supabase (Postgres + Auth + RLS)
- **Deployment:** Vercel (both frontend and backend)

### Key Features
- Offline queue with replay (using LocalStorage for prototype)
- Optimistic concurrency with `version` column
- Role-based access control (Owner vs Staff) via RLS
- CSV import with idempotent upsert
- Server-computed KPIs
- Exact search + category filter chips

## 📋 API Contracts

Must follow these exact endpoints:
```
/api/auth/login     → POST
/api/products       → GET, POST
/api/products/:id   → GET, PUT, DELETE
/api/import/csv     → POST
/api/dashboard/kpis → GET
/api/metrics        → GET
/api/health        → GET
```

### Error Response Format
```json
{
  "error": {
    "code": "CONFLICT | PERMISSION_EDIT_PRICE | VALIDATION_ERROR | NOT_FOUND",
    "message": "Readable explanation",
    "details": {...}
  }
}
```

## 🔒 Authentication & Authorization

1. Authentication via Supabase
2. Role-based access:
   - Staff cannot modify `unit_price`
   - Enforced via RLS policies
   - Permission errors trigger conflict modal

## 💾 Data Management

### Offline Capabilities
- Queue edits in LocalStorage while offline
- Replay queued changes when online
- Show conflict resolution modal for 409 responses

### Concurrency Control
- Use `version` column for optimistic locking
- Return 409 for version conflicts with this shape:
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Stale update — product has changed",
    "details": {
      "resource": "product",
      "id": "prod_123",
      "expected_version": 5,
      "actual_version": 7
    }
  }
}
```

### CSV Import
- Upsert by `sku` using `ON CONFLICT (sku) DO UPDATE`
- Returns per-row status: `created | updated | skipped | error`

## 📊 KPIs & Metrics

### Dashboard KPIs
Single SQL query must return:
- `total_items`: count of products
- `stock_value`: sum(quantity * unit_price)
- `low_stock`: count where quantity < threshold

### Observability
- Structured logging with `pino` or `winston`
- Prometheus metrics at `/api/metrics`
- Track latency histograms and request counters

## 🛠️ Development Workflow

### Environment Setup
1. Frontend: `.env.local` with Supabase credentials
2. Backend: `nodemon.json` for environment config
3. Database: Apply schema to Supabase instance

### Key Commands
```bash
# Frontend
cd frontend-nextjs
npm run dev     # Development server
npm run build   # Production build

# Backend
cd backend-node
npm run dev     # Development with nodemon
```

### Testing Requirements
- Jest + Supertest for API testing (verify 409)
- Playwright for UI testing (verify conflict modal)
- Performance target: <2.5s cold load

## 📁 Project Structure
```
frontend-nextjs/   # Frontend app
backend-node/      # Express API server
prompts/          # AI prompt documentation
docs/             # Diagrams, performance outputs
```

## ⚠️ Critical Rules
1. Always align with README and schema
2. Never change field names
3. Code must be production-grade
4. Use LocalStorage for offline queue in prototype
5. Don't invent new APIs or fields unless explicitly asked
