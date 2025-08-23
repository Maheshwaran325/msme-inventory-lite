# MSME Inventory Lite

AI-Native inventory management system for corner-store chains with intermittent internet and concurrent editing capabilities.

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (Frontend) + Node.js hosting (Backend)

## Project Structure

- `frontend-nextjs/` - Next.js frontend application
- `backend-node/` - Express API server
- `prompts/` - AI prompt receipts and documentation

## Tech Stack Justification

- **Next.js**: Chosen for superior performance optimizations and built-in features to meet the 2.5s cold load requirement
- **Express Backend**: Dedicated API server for clear separation of concerns and robust business logic handling
- **Supabase**: PostgreSQL with real-time capabilities and built-in authentication

## Getting Started

1. Install dependencies for both frontend and backend
2. Set up Supabase database
3. Configure environment variables
4. Run development servers

**Access the applications:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:4000/api/health

Detailed setup instructions coming soon.
