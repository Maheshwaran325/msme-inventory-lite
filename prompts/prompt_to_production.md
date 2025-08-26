# Prompt-to-Production Note 

This note documents how I used AI tools during the development of **MSME Inventory Lite**. It explains my workflow, decomposition, iteration, the role of AI in coding and decision-making, pitfalls I encountered, and what I solved manually.  

---

## Workflow, Decomposition & Iteration  

I broke the assignment into clear stages, then iterated with AI at each stage:  

1. **Requirement Analysis**  
   - Read the brief thoroughly.  
   - Asked **Gemini 2.5 Pro** clarifying questions to fully understand the must-haves (auth, CRUD, concurrency, CSV, search) vs. nice-to-haves (offline, metrics, AI polish).  

2. **Architecture & Scaffold**  
   - Iteration: **Claude** generated an initial architecture diagram → I refined it.  
   - Used **Claude + Perplexity** to evaluate folder structure.  
   - Scaffolded project with **Gemini CLI**, tested briefly with **Qwen CLI**.  

3. **Schema & API Contracts**  
   - Iteration: **Claude** proposed an over-engineered schema with permissive RLS → I rewrote it simpler.  
   - **Gemini** proposed product schema → I accepted but added `version` for concurrency.  
   - Used **Claude** to draft `openapi.yaml`, then trimmed endpoints.  

4. **Authentication**  
   - Iteration: AI suggested backend JWT/bcrypt + exposing Supabase service keys in frontend.  
   - I rejected both (unsafe) and implemented Supabase Auth correctly in frontend.  

5. **CRUD & Concurrency**  
   - Iteration: **Kilo Code** + **Qwen Coder 3** generated CRUD.  
   - AI initially ignored optimistic concurrency enforcement → I added `WHERE version = client_version`.  
   - Built conflict modal with “Keep mine / Accept remote / Merge manually”.  

6. **Roles & Unit Price Tripwire**  
   - Iteration: AI hid `unit_price` from staff. I rejected this and implemented correct tripwire (staff can see price but editing triggers rejection + modal).  

7. **CSV Import**  
   - Iteration: Claude suggested import logs + client-side idempotency. I rejected both as overkill.  
   - Final: implemented **upsert by `sku`** for idempotency.  
   - Staff can upload CSV, but rows with `unit_price` edits are rejected per spec.  

8. **Search & KPIs**  
   - Iteration: AI suggested fuzzy search. I chose exact + category chips for simplicity + speed.  
   - Implemented KPIs with parallel queries for faster frontend render.  

9. **Offline Edits & Observability**  
   - Iteration: AI outputs suggested IndexedDB sync engine. I simplified to a localStorage queue (documented trade-offs).  
   - Added `/metrics` with CRUD counts + latency; added structured logs + error shapes.  

10. **Deployment**  
    - Manual debugging of Vercel build and Supabase env vars.  
    - Deployed with `/health` and `/metrics` endpoints live.  

---

## AI Pitfalls & Corrections  

- AI proposed insecure Supabase keys in frontend → rejected.  
- AI proposed backend auth (JWT) → rejected, used Supabase Auth directly.  
- AI proposed client-side idempotency for CSV → rejected, used server-side upsert by `sku`.  
- AI proposed permissive RLS → rejected, tightened rules.  
- AI hid `unit_price` from staff → rejected, implemented error modal instead.  

---

## What I Solved Without AI  

- Final schema simplification and RLS rules.  
- Deployment debugging (Vercel + Supabase).  
- Frontend performance fixes (parallel queries, spinner removal).  
- Offline queue simplification.  

---

## Mandatory Q&A  

- **Which AI output misled you most and how did you catch it?**  
  AI suggested handling CSV idempotency on the client via file hashing. I realized this fails for multi-user uploads, so I switched to server-side `upsert by sku` for correctness.  

- **Which part did you solve without AI and why?**  
  Offline edits: AI suggested IndexedDB with complex sync. I built a simple localStorage queue instead because of time and assignment scope.  

---

## Reflection  

AI sped up schema drafts, contracts, and boilerplate, but often over-engineered or insecure. The project shows how I iterated with AI: generating, reviewing, rejecting, and refining. This hybrid workflow let me ship an MVP aligned with requirements under a tight deadline.

