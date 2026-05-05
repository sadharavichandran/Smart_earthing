# EarthGuard Backend Integration — Implementation Summary

**Date**: April 15, 2026  
**Project**: EarthGuard Smart Earthing Health Monitoring System  
**Status**: ✅ Complete & Ready for Testing

---

## What Was Implemented

### 1. ✅ Secure Backend API (Express + Node.js)

**File**: `server/index.js`

**Features**:

- JWT-based authentication (12-hour tokens)
- Bcrypt password hashing for secure storage
- Role-based access control (Users, Officials, Technicians)
- CORS enabled for frontend communication
- Automatic schema initialization and data seeding

**Endpoints Implemented**:

- `POST /api/auth/signup` — Create new user account
- `POST /api/auth/login` — Authenticate and get JWT token
- `POST /api/auth/forgot-password` — Password recovery (placeholder)
- `GET /api/bootstrap` — Load all project data (poles, alerts, reports, checklists, thresholds)
- `PUT /api/alerts` — Save alert state changes to database
- `GET /api/reports` — Fetch all user-submitted reports
- `POST /api/reports` — Submit new hazard report
- `PUT /api/reports` — Bulk save reports
- `GET /api/checklists` — Fetch technician checklists
- `POST /api/checklists` — Submit new checklist
- `PUT /api/checklists` — Bulk save checklists
- `GET /api/thresholds` — Fetch alert configuration
- `PUT /api/thresholds` — Update thresholds (Officials only)

### 2. ✅ MySQL Database Schema

**File**: `server/schema.sql`

**Tables Created**:

- `users` — User accounts, credentials, login tracking
  - Fields: id, role, name, email, phone, emp_id, dept, area, password_hash, login_count, last_login_at
  - Unique constraint: (email, role) — prevents duplicate accounts per role
- `poles` — Electrical pole monitoring data
  - Fields: id, area, status, leakage, resistance, continuity, voltage, moisture, temp, last_check, cause, history_json
- `alerts` — Fault alerts with resolution tracking
  - Fields: id, pole_id, fault, severity, time, date, status, tech, notes, material, image, completed_at, priority
  - Foreign key: pole_id → poles.id
- `reports` — Public hazard reports
  - Fields: id, area, description, user_name, reported_time
- `checklists` — Technician repair checklists
  - Fields: id, pole_id, area, steps_json, completed_steps, tech, created_at_text
  - Foreign key: pole_id → poles.id
- `settings` — Configuration storage
  - Fields: setting_key (PRIMARY), setting_value, updated_at

### 3. ✅ Database Seeding & Auto-Initialization

**File**: `server/db.js`

**On First Run**:

- Auto-creates all tables if missing
- Seeds 6 sample poles (P101–P106) with realistic earthing data
- Seeds 5 initial alerts (varying severities and statuses)
- Sets default thresholds (IS 3043 compliant)
- All data **persists** across app restarts

### 4. ✅ Frontend-Backend Integration

**File**: `src/App.js` (Updated)

**Changes**:

- Removed localStorage for auth/data storage
- Added `storage` object with API request methods
- All authentication now goes through `/api/auth/*` endpoints
  - Signup → POST to `/api/auth/signup`
  - Login → POST to `/api/auth/login` (returns JWT token + user data)
  - Forgot password → POST to `/api/auth/forgot-password`
- All project data now synced with backend
  - Alerts → PUT to `/api/alerts`
  - Reports → PUT to `/api/reports`
  - Checklists → PUT to `/api/checklists`
  - Thresholds → PUT to `/api/thresholds`

- JWT token stored in memory, passed in `Authorization: Bearer <token>` header
- Bootstrap data loaded on login (polls, alerts, reports, checklists, thresholds)
- Session cleared on logout, token removed

### 5. ✅ Security Implementation

**Authentication**:

- Passwords hashed with bcryptjs (10 rounds)
- Plaintext passwords never stored or logged
- JWT tokens expire after 12 hours
- Role validation on protected endpoints

**Authorization**:

- Role-based middleware checks (Officials, Technicians, Users)
- Different endpoints restricted by role:
  - Thresholds edit: Officials only
  - Task assignment: Officials only
  - Checklist submission: Technicians only

**Data Validation**:

- Email required and unique per role
- Password minimum 6 characters
- Required fields validated before DB insert

### 6. ✅ Second-Time Login Detection

**Implementation**:

- `login_count` field incremented on each login
- Backend returns `isReturningUser: true/false`
- Frontend can display personalized greeting or prompt

---

## File Structure

```
earthing/
├── server/
│   ├── index.js              ← Express API server (auth + data endpoints)
│   ├── db.js                 ← MySQL connection pool + schema auto-init
│   ├── seedData.js           ← Seed values (poles, alerts, thresholds)
│   ├── schema.sql            ← Database DDL (CREATE TABLE...)
│   └── validate.js           ← System readiness checker
├── src/
│   ├── App.js                ← React UI (updated with API integration)
│   ├── index.js              ← React entry point
│   └── index.css             ← Styling
├── .env                       ← DB credentials (created, add your MySQL password)
├── .env.example               ← Environment template
├── QUICKSTART.md              ← 5-minute setup guide
├── SETUP_GUIDE.md             ← Comprehensive setup & troubleshooting
├── package.json               ← Dependencies + scripts
└── package-lock.json

```

---

## How to Run

### Prerequisites Checklist

- [ ] Node.js v16+ installed
- [ ] MySQL v5.7+ installed and running
- [ ] Database `earthing` created
- [ ] `.env` file configured with MySQL credentials
- [ ] `npm install` completed

### Start Application

```powershell
# From within project directory
cd "c:\Users\HP\Desktop\Poject Expo\earthing"

# Option 1: Both services together (recommended)
npm run dev

# Option 2: Backend only
npm run server

# Option 3: Frontend only
npm start
```

**Expected Output**:

```
Backend running on http://localhost:4000
Compiled successfully.
You can now view react-scripts in the browser. Open http://localhost:3000
```

---

## Testing Checklist

### Authentication Flow

- [ ] Signup with new email/role → Account created
- [ ] Login with correct credentials → JWT token received
- [ ] Login with wrong password → "Invalid login" error
- [ ] Login with wrong role but correct email → Error
- [ ] Second login → API returns `isReturningUser: true`

### Data Persistence

- [ ] Create alert assignment → Saved to database
- [ ] Submit report → Appears in reports list
- [ ] Refresh page (Ctrl+F5) → Data persists
- [ ] Logout and login as different role → Role-specific data loads

### Role-Based Access

- [ ] **User**: Can submit reports, view status
- [ ] **Official**: Can assign work, edit thresholds
- [ ] **Technician**: Can submit checklists, mark tasks complete

### Database Integrity

- [ ] Check users table: `SELECT * FROM earthing.users;`
- [ ] Check alerts: `SELECT * FROM earthing.alerts;`
- [ ] Check reports: `SELECT * FROM earthing.reports;`
- [ ] Check checklists: `SELECT * FROM earthing.checklists;`

---

## Configuration Reference

### Environment Variables (`.env`)

| Variable          | Purpose              | Example                 |
| ----------------- | -------------------- | ----------------------- |
| `PORT`            | Backend API port     | `4000`                  |
| `JWT_SECRET`      | Token signing secret | `strong-random-string`  |
| `MYSQL_HOST`      | Database hostname    | `localhost`             |
| `MYSQL_PORT`      | Database port        | `3306`                  |
| `MYSQL_USER`      | Database username    | `root`                  |
| `MYSQL_PASSWORD`  | Database password    | `your-password`         |
| `MYSQL_DATABASE`  | Database name        | `earthing`              |
| `FRONTEND_ORIGIN` | For CORS             | `http://localhost:3000` |

---

## API Response Examples

### Successful Login

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isReturningUser": true,
  "user": {
    "id": 1,
    "role": "technician",
    "name": "John Doe",
    "email": "john@example.com",
    "empId": "TEC-042",
    "area": "Coimbatore Zone"
  }
}
```

### Bootstrap Data

```json
{
  "poles": [
    {
      "id": "P101",
      "area": "Bus Stand",
      "status": "critical",
      "leakage": 42,
      "resistance": 18.4,
      ...
    }
  ],
  "alerts": [...],
  "reports": [...],
  "checklists": [...],
  "thresholds": {"leakage": "15 mA", ...}
}
```

---

## Known Limitations & Future Enhancements

### Current Implementation

- ✅ Secure login/signup with JWT
- ✅ Role-based dashboards
- ✅ Three user types
- ✅ Alert management with assignment
- ✅ Report submissions
- ✅ Checklist submissions
- ✅ Persistent MySQL storage
- ✅ Second-time login detection

### Potential Enhancements

- 🔄 Email-based password reset (currently placeholder)
- 🔄 Real-time WebSocket updates (currently polling)
- 🔄 Advanced analytics dashboard
- 🔄 Mobile app (iOS/Android)
- 🔄 Automated email alerts on critical faults
- 🔄 Slack/Teams integration
- 🔄 Photo storage in cloud (S3, Azure Blob)

---

## Production Deployment Checklist

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Enable HTTPS/TLS on backend
- [ ] Use managed MySQL (AWS RDS, Azure Database, etc.)
- [ ] Set `FRONTEND_ORIGIN` to production domain
- [ ] Implement rate limiting on auth endpoints
- [ ] Add monitoring/logging (Sentry, DataDog, etc.)
- [ ] Regular database backups
- [ ] Update dependencies: `npm audit fix`
- [ ] Load test for target concurrent users
- [ ] Security audit before production launch

---

## Support

**Documentation Files**:

- `QUICKSTART.md` — 5-minute setup guide
- `SETUP_GUIDE.md` — Comprehensive reference
- `server/schema.sql` — Database structure
- API responses logged in browser console (DevTools → Network tab)

**Common Commands**:

```bash
npm install              # Install dependencies
npm run server           # Start backend only
npm start                # Start frontend only
npm run dev              # Start both
npm run build            # Production build
node server/validate.js  # Check system readiness
```

---

## Summary

✅ **Complete Backend Integration**

- Express API with JWT auth
- MySQL database with auto-schema setup
- Secure password hashing
- Role-based access control
- Second-time login detection
- Full data persistence

✅ **Frontend Connected**

- All signup/login → API calls
- All data changes → Database
- Session tokens managed
- Bootstrapped data on login

✅ **Ready to Deploy**

- Validation script included
- Comprehensive documentation
- Error handling implemented
- Security best practices followed

**Next Step**: Follow `QUICKSTART.md` to set up MySQL and start the application!

---

_EarthGuard v3.0 — TNEB Smart Grid Initiative_  
_IS 3043 · IEEE 80 Compliant Monitoring_
