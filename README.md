# PunchPulse HR — Biometric Attendance, In/Out & Overtime (OT) SaaS 🚀

A modern full-stack web application designed for HR, Operations, and Payroll managers to process raw biometric machine Excel logs (.xlsx / .csv) and automatically compute:
- **Work Duration (Hours & Minutes)**
- **Present (Full Day) vs Half Day vs Absent**
- **Overtime (OT) Hours & Payout Estimates**
- **Late Arrivals & Early Departures**
- **Net Payable Days & Monthly Consolidated Timesheets**
- **Direct Excel Export for Payroll**

---

## 🏗️ Architecture & Folder Structure

```
New folder/
├── frontend/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/           # UI Views (Overview, Upload, Logs, Payroll, OT, Settings)
│   │   ├── services/             # API client with automatic client-side fallback
│   │   ├── types/                # Strict TypeScript models
│   │   ├── utils/                # Calculator logic & Excel SheetJS parser
│   │   └── data/                 # Sample preloaded biometric company data
│   ├── .env                      # Frontend environment config
│   └── .env.example
│
├── backend/                      # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/          # Upload, Recalculate, Template & Export controllers
│   │   ├── routes/               # Express API endpoints
│   │   ├── services/             # Calculation engine & Excel processing services
│   │   ├── types/                # Shared backend schema
│   │   └── server.ts             # Express server setup
│   ├── .env                      # Backend environment config
│   └── .env.example
│
└── package.json                  # Root monorepo scripts
```

---

## ⚡ Environment Variables

### Frontend (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME="PunchPulse HR SaaS"
```

### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=10
```

---

## 🚀 How to Run Locally

### 1. Start the Backend API (Port 5000)
```bash
cd backend
npm run dev
```

### 2. Start the Frontend Web App (Port 5173)
```bash
cd frontend
npm run dev
```

Or from the root directory:
```bash
npm run dev:backend
npm run dev:frontend
```

---

## 🧮 Calculation Rules & Logic

- **Full Day (Present):** Worked Hours $\ge$ 8.0 hrs (Payable value: `1.0`)
- **Half Day:** Worked Hours between 4.0 hrs and 8.0 hrs (Payable value: `0.5`)
- **Absent:** Worked Hours $<$ 4.0 hrs or missed punches (Payable value: `0.0`)
- **Overtime (OT):** Worked Hours $>$ 8.0 hrs $\rightarrow$ `OT = Worked - 8.0`
- **Net Payable Days:** `Total Full Days + (Total Half Days * 0.5)`
- **Late Entry:** Punch In $>$ Shift Start (09:00 AM) + Grace period (15 mins)
- **Night Shifts:** Automatically detects when Out Time $<$ In Time and adds 24-hour wrap.

