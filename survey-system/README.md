# SurveyOS — Online Survey System with Real-Time Dashboard
### MERN Stack Mini Project

A full-stack online survey platform with live response tracking, analytics, and role-based access control.

---

## 📁 Project Structure

```
survey-system/
├── backend/                   # Node.js + Express + Socket.io
│   ├── models/
│   │   ├── User.js            # User model with bcrypt
│   │   ├── Survey.js          # Survey model with questions schema
│   │   └── Response.js        # Response model with answers
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile
│   │   ├── surveys.js         # CRUD surveys, share token
│   │   ├── responses.js       # Submit, fetch, export CSV
│   │   ├── dashboard.js       # Stats, per-survey analytics
│   │   └── analytics.js       # Hourly/weekly/monthly trends
│   ├── middleware/
│   │   └── auth.js            # JWT protect, adminOnly, optionalAuth
│   ├── server.js              # Express + Socket.io entry point
│   └── .env.example
│
└── frontend/                  # React 18
    └── src/
        ├── context/
        │   ├── AuthContext.js  # JWT auth state
        │   └── SocketContext.js# Socket.io real-time context
        ├── pages/
        │   ├── Login.js        # Auth pages
        │   ├── Register.js
        │   ├── Dashboard.js    # Real-time dashboard with charts
        │   ├── Surveys.js      # Survey list + management
        │   ├── SurveyBuilder.js# Dynamic form builder
        │   ├── SurveyAnalytics.js # Per-survey charts
        │   ├── SurveyResponses.js # Response table + detail panel
        │   ├── PublicSurvey.js # Respondent-facing survey form
        │   ├── Analytics.js    # Global analytics overview
        │   └── Profile.js      # User profile & password
        ├── components/ui/
        │   ├── Sidebar.js      # Navigation sidebar
        │   └── Topbar.js       # Top header bar
        └── utils/
            ├── api.js          # Axios API helper
            └── uuid.js         # UUID generator
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

---

### 1. Backend Setup

```bash
cd survey-system/backend
npm install

# Create .env from example
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

**`.env` file:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/survey_system
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

```bash
# Start backend
npm run dev      # development (nodemon)
npm start        # production
```

Backend runs at: `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd survey-system/frontend
npm install

# Optional: create .env
echo "REACT_APP_API_URL=http://localhost:5000" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env
echo "REACT_APP_CLIENT_URL=http://localhost:3000" >> .env

# Start frontend
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 🌟 Features

### 🔐 Authentication
- JWT-based login/register
- Role-based access: **Admin** and **User**
- Password hashing with **bcrypt (12 rounds)**
- Protected routes, auto-logout on token expiry
- First registered user becomes **Admin** automatically

### 📝 Survey Builder (Admin)
- Create / Edit / Delete surveys
- 6 question types: **MCQ, Text, Rating (Stars), Checkbox, Dropdown, Linear Scale**
- Drag-style question reordering (up/down)
- Required question toggle
- Survey settings: active/inactive, anonymous, multiple submissions
- Unique share link via `shareToken`

### 📊 Response System
- Public survey form (no login required for respondents)
- One-page-per-question flow with progress bar
- Session-based duplicate prevention
- Timer tracks how long each response takes
- Real-time submission count updates via **Socket.io**

### ⚡ Real-Time Dashboard
- **Socket.io** live feed of new responses
- Line chart — daily response trend (7 days)
- Bar chart — top surveys by response count
- Live activity feed with new-response animations
- Connection status indicator (Online/Offline)

### 📈 Analytics Pages
- **Per-survey analytics:**
  - 30-day response trend (line chart)
  - MCQ/Checkbox/Dropdown → Doughnut chart with legend bars
  - Rating/Scale → Bar chart with average score
  - Text responses → displayed inline
- **Global analytics:**
  - 6-month monthly trend
  - Responses by hour of day (24h bar chart)
  - Responses by day of week
  - Survey performance comparison (horizontal bar)
  - Date range and survey filters

### 📤 Export
- CSV export for any survey's responses
- Includes all question answers, respondent info, timestamps

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register user |
| POST | `/api/auth/login` | None | Login |
| GET | `/api/auth/me` | JWT | Get current user |
| PUT | `/api/auth/profile` | JWT | Update profile |
| PUT | `/api/auth/change-password` | JWT | Change password |
| GET | `/api/surveys` | JWT | List own surveys |
| POST | `/api/surveys` | JWT | Create survey |
| GET | `/api/surveys/:id` | JWT | Get survey (owner) |
| PUT | `/api/surveys/:id` | JWT | Update survey |
| DELETE | `/api/surveys/:id` | JWT | Delete survey |
| GET | `/api/surveys/public/:token` | None | Get public survey |
| POST | `/api/surveys/:id/toggle` | JWT | Toggle active |
| POST | `/api/responses` | None | Submit response |
| GET | `/api/responses/survey/:id` | JWT | Get responses |
| GET | `/api/responses/survey/:id/export` | JWT | Export CSV |
| DELETE | `/api/responses/:id` | JWT | Delete response |
| GET | `/api/dashboard/stats` | JWT | Dashboard stats |
| GET | `/api/dashboard/survey/:id/analytics` | JWT | Survey analytics |
| GET | `/api/analytics/overview` | JWT | Global analytics |

---

## ⚡ Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-dashboard` | Client → Server | Subscribe to dashboard updates |
| `join-survey-room` | Client → Server | Subscribe to specific survey |
| `new-response` | Server → Client | Emitted when survey gets a response |
| `survey-deleted` | Server → Client | Emitted when a survey is deleted |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Chart.js, Socket.io-client |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Real-time | Socket.io (WebSocket) |
| Styling | Custom CSS with CSS variables |

---

## 🖥️ Demo Credentials

After first registration, that user becomes **Admin**.

To test with pre-seeded data, register at `/register` and create surveys.

---

## 📦 Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve with express (add to backend server.js)
# app.use(express.static(path.join(__dirname, '../frontend/build')));
```

---

*Made with ❤️ using MERN Stack + Socket.io*
