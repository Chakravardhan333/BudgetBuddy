# BudgetBuddy — Personal Budget Planning & Expense Management Platform

BudgetBuddy is a commercial-grade, full-stack personal finance web application built with **React**, **Vite**, **Tailwind CSS**, **Python**, and **Django REST Framework**.

---

## 1. System Architecture & Tech Stack

```
                        +-----------------------------------------+
                        |        CLIENT APPLICATION (Vercel)      |
                        |   React 19 + Vite + Tailwind CSS        |
                        |   React Router v7 + Recharts + Axios    |
                        +--------------------+--------------------+
                                             |
                                             | REST API (HTTP + JWT)
                                             v
                        +-----------------------------------------+
                        |       BACKEND API SERVER (Render)       |
                        |   Django 5.2 + Django REST Framework    |
                        |   SimpleJWT (Bearer Authentication)     |
                        |   ReportLab (PDF) + OpenPyXL (Excel)    |
                        +--------------------+--------------------+
                                             |
                                             | ORM Database Access
                                             v
                        +-----------------------------------------+
                        |             DATA STORAGE                |
                        |   Development: SQLite                   |
                        |   Production:  PostgreSQL               |
                        +-----------------------------------------+
```

---

## 2. Implemented Capabilities

1. **User Authentication & Authorization**:
   - Secure registration, login, logout, and token refresh using SimpleJWT.
   - Strict data isolation: every database query is filtered by `request.user`.
   - Three distinct user roles: **Student**, **Premium User**, and **Admin**.
2. **Personalized User Profiles**:
   - Multi-currency support (`USD $`, `EUR €`, `INR ₹`, `GBP £`, `CAD C$`, `AUD A$`).
   - Profile information editing, contact details, bio, and password updates.
3. **Expense Management**:
   - Full CRUD operations: record, view, filter by category/period, search by description, and delete.
   - Support for payment methods (*Card, Cash, UPI, Bank Transfer*).
4. **Income Tracking**:
   - Full CRUD operations: record inflows, filter by source (*Salary, Scholarship, Freelance, Pocket Money, Family Support*).
5. **Unified Transaction Ledger**:
   - Consolidated debit and credit view sorted chronologically with print and filter support.
6. **Smart Monthly Budgets**:
   - Overall monthly limits and category-specific caps (*Food, Travel, Bills, etc.*).
   - Real-time spending utilization percentage and remaining cushion calculations.
7. **Savings Goals Management**:
   - Target amounts, deadlines, and visual progress bars.
   - Atomic contribution logging with automatic milestone status updates.
8. **Financial Analytics**:
   - Real-time **Recharts** visualizations: Cash Inflow vs Outflow bar charts, and Category Outlay distribution donut charts.
   - Automated monthly savings rate and cash flow ratio calculations.
9. **Tax-Ready Financial Reports**:
   - **PDF Generation**: Formatted statements using ReportLab with executive summaries, category aggregates, and transaction tables.
   - **Excel XLSX Generation**: Multi-sheet workbooks using OpenPyXL with auto-adjusted column widths and numeric cells.
10. **In-App Notifications**:
    - Automated threshold warnings when spending reaches 80% or 100% of budget caps.
    - Savings milestone alerts (50% and 100% achieved).
    - Intelligent deduplication preventing repeated alerts.
    - Unread count badge on navigation bell.
11. **System Administration**:
    - Privileged administrative portal with tenant metrics, user audit tables, and health status.

---

## 3. Quick Start (Local Development)

### Prerequisites
- Node.js `v20+` or `v24+` with npm
- Python `3.11+`, `3.12+`, `3.13+`, or `3.14+`

### Step 1: Start Backend Server
```powershell
# Open terminal in project root
cd backend

# Activate Python virtual environment
.venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Seed demonstration accounts and initial transactions
python manage.py seed_users
python manage.py seed_financial_data

# Start development server on port 8000
python manage.py runserver 127.0.0.1:8000
```
Backend will be available at: `http://127.0.0.1:8000/`

---

### Step 2: Start Frontend Server
```powershell
# Open a second terminal in project root
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```
Frontend will be available at: `http://localhost:5173/`

---

## 4. Demonstration Accounts

The database comes pre-seeded with three ready-to-test accounts:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Student** | `demo_student` | `BudgetBuddy123!` | Pre-seeded with realistic student expenses, income, budget, and goals |
| **Premium** | `demo_premium` | `BudgetBuddy123!` | Multi-currency and premium tier |
| **Admin** | `admin` | `BudgetBuddyAdmin123!` | Access to `/admin-portal` and system monitoring |

*(You can also click the quick-fill buttons on the [Login Page](http://localhost:5173/login) to log in instantly!)*

---

## 5. Automated Test Suite

Run all automated unit and integration tests covering Authentication, Transactions, Budgets, Savings Goals, PDF/Excel Reports, and Notifications:

```powershell
cd backend
.venv\Scripts\python.exe manage.py test accounts transactions reports notifications budgetbuddy_core
```

To test the frontend production bundle:
```powershell
cd frontend
npm run build
```

---

## 6. Production Deployment Instructions

### Frontend (Vercel)
1. Push project to your GitHub repository.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select your repository and configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
5. Click **Deploy**. Vercel will use `vercel.json` for seamless client-side SPA routing.

### Backend (Render)
1. Log in to [Render](https://render.com) and create a **PostgreSQL Database**:
   - Note the **Internal Database URL** or **External Database URL**.
2. Create a new **Web Service**:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn budgetbuddy_core.wsgi:application`
3. Configure Environment Variables in Render:
   - `DATABASE_URL`: `postgresql://user:password@host:port/database`
   - `SECRET_KEY`: `<generate-a-strong-secret-key>`
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `.onrender.com`
   - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
   - `EMAIL_BACKEND`: `django.core.mail.backends.smtp.EmailBackend` (Optional)
   - `EMAIL_HOST`: `smtp.sendgrid.net` (Optional)
   - `EMAIL_HOST_USER`: `apikey` (Optional)
   - `EMAIL_HOST_PASSWORD`: `<your-sendgrid-api-key>` (Optional)
4. Deploy the service. Your backend API will be live with automatic HTTPS and PostgreSQL database migrations applied.
