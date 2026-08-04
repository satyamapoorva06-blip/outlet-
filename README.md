# 🚀 FranchiseOps AI — Enterprise Multi-Agent Franchise Operations & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Express.js](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**FranchiseOps AI** is an enterprise-grade multi-agent operations and analytics platform designed to monitor outlet performance, model sales & profit trends, evaluate operational efficiency, and deliver dynamic mathematical AI insights for franchise networks.

---

## 🌟 Key Features & Capabilities

- 🤖 **10-Step Multi-Agent Workflow**:
  1. Data Aggregation & Ingestion
  2. Data Cleaning & Schema Validation
  3. Store Audit & Performance Monitoring
  4. Inventory & Stock Tracking
  5. Staff Scheduling & Efficiency
  6. Automated Marketing Optimization
  7. Audit Log Analysis
  8. Intelligence & Mathematical Insight Engine
  9. Actionable Recommendations
  10. Real-time Escalation & Alerts
- 📊 **Interactive Analytics Dashboard**:
  - Store Audit Logs with real-time searching, sorting, and pagination.
  - Interactive Recharts area & bar charts visualizing Gross Revenue, Operating Costs, Net Profit, and Payment Method Splits (UPI, Card, Cash).
  - Multi-outlet comparison view for regional performance evaluation.
- 📐 **Dynamic Mathematical Insight Engine**:
  - **Revenue Momentum**: Linear regression slope calculation ($\beta_1 = \frac{n\sum x_i y_i - \sum x_i \sum y_i}{n\sum x_i^2 - (\sum x_i)^2}$) tracking growth trajectories.
  - **Revenue Volatility**: Coefficient of Variation ($CV = \frac{\sigma}{\mu} \times 100$) evaluating sales stability.
  - **Period-over-Period Growth**: Comparative analysis across split date windows.
  - **Profit Margin Drift**: Regression slope tracking margin shifts over time.
  - **Peak Revenue Detection**: Z-Score outlier detection ($z = \frac{x_i - \mu}{\sigma}$).
- 🔄 **Fallback Standalone Demo Mode**:
  - Integrated deterministic fallback dataset ensures full UI usability even without an active database connection.
- 🔐 **JWT Authentication & Role Control**:
  - Role-based authorization for Store Managers, Regional Directors, and Franchise Owners.

---

## 🏗️ Architecture & Technology Stack

```text
FranchiseOps-AI/
├── frontend/                   # Client-side Next.js 16 Application
│   ├── app/                    # Next.js App Router (Pages, Layouts, Components)
│   │   ├── components/         # Reusable UI Components & Modals
│   │   ├── lib/                # API client (Axios with interceptors)
│   │   └── types/              # TypeScript interface definitions
│   ├── public/                 # Static branding assets
│   ├── .env.example            # Environment template for Frontend
│   └── package.json
├── backend/                    # Server-side REST API & Database Layer
│   ├── server.js               # Express 5 server & API routes
│   ├── seed.js                 # Database seeding script
│   ├── prisma/                 # Prisma ORM Schema & Migration definitions
│   │   └── schema.prisma       # PostgreSQL Schema definition
│   ├── .env.example            # Environment template for Backend
│   └── package.json
├── .gitignore                  # Root Git Ignore configuration
└── README.md                   # Project Documentation
```

### Stack Breakdown:
- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, Recharts, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js 5, Prisma ORM 6, PostgreSQL (Supabase Connection Pooling / Direct).
- **Authentication**: JSON Web Tokens (JWT) & bcrypt password hashing.

---

## ⚙️ Environment Configuration

Before running the application, set up environment variables for both backend and frontend services.

### Backend (`/backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
JWT_SECRET=your_secure_jwt_secret_key
DATABASE_URL="postgresql://postgres:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Frontend (`/frontend/.env.local`)
Copy `frontend/.env.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **PostgreSQL Database** (e.g. Supabase, Neon, or local instance)

### 1. Backend Setup & Database Migration

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate   # or: npx prisma generate --schema prisma/schema.prisma

# Push database schema to PostgreSQL
npx prisma db push

# (Optional) Seed initial demo outlets & sales data
npm run seed

# Start development server (runs on http://localhost:5000)
npm start
```

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/signup` | Register a new franchise user | ❌ |
| `POST` | `/api/auth/login` | Authenticate & obtain JWT | ❌ |
| `GET` | `/api/outlets` | List all franchise outlets | ✅ |
| `GET` | `/api/outlets/compare` | Compare multi-outlet financial metrics | ✅ |
| `GET` | `/api/sales/metrics` | Aggregate sales summary & AI math metrics | ✅ |
| `GET` | `/api/sales/trends` | Daily revenue, cost & profit trends | ✅ |
| `GET` | `/api/sales/list` | Paginated sales records for store audit | ✅ |
| `GET` | `/api/inventory` | Real-time stock status & threshold tracking | ✅ |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git checkout main && git merge feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **ISC License**. See `LICENSE` for more information.
