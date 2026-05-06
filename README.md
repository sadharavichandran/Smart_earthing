# EarthGuard — Smart Earthing Health Monitoring System

**Live System. Secure Authentication. MySQL Backend.**

A full-stack application for real-time monitoring of electrical earthing infrastructure with role-based dashboards, secure signup/login, and complete database persistence.

---

## ⚡ Quick Start (5 Minutes)

**First time setup?** Read [QUICKSTART.md](QUICKSTART.md) – it walks you through everything.

```bash
# 1. Install dependencies
npm install

# 2. Configure MySQL credentials in .env
# (Copy .env.example to .env and fill in your MySQL password)

# 3. Start both backend and frontend
npm run dev
```

Then open http://localhost:3000

---

## 📚 Documentation

| Document                                                   | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| **[QUICKSTART.md](QUICKSTART.md)**                         | 5-minute setup guide (start here!)        |
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)**                       | Comprehensive reference & troubleshooting |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | What was built & how it works             |

---

## 🎯 Features

✅ **Secure Authentication**

- Signup and login with bcrypt-hashed passwords
- JWT tokens (12-hour expiry)
- Second-time login detection
- Invalid login error handling

✅ **Three User Types**

- **Users**: Report hazards, view safety status
- **Officials**: Monitor poles, assign work, configure thresholds
- **Technicians**: View tasks, upload repairs, submit checklists

✅ **Full Database Backend**

- MySQL persistent storage
- Auto-schema initialization
- Real-time data sync
- Role-based access control

✅ **Monitoring Dashboard**

- Interactive pole map
- Live sensor readings
- Alert management
- Work order tracking

---

## 🔧 Running the App

### Development (Recommended)

```bash
npm run dev
```

Starts both backend (port 4000) and frontend (port 3000)

### Backend Only

```bash
npm run server
```

### Frontend Only

```bash
npm start
```

---

## 📋 Prerequisites

- **Node.js** v16+ — [Install](https://nodejs.org)
- **MySQL** v5.7+ — [Install](https://www.mysql.com/downloads/mysql/)
- **Git** (optional)

---

## 🗄️ Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE earthing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Configure .env with your MySQL password
# The schema auto-initializes on first backend start
```

---

## 🧪 Test It Out

1. **Signup**: Create a new account with any role
2. **Login**: Use your email & password
3. **Explore**: Navigate the role-specific dashboard
4. **Verify**: Data persists on page refresh (stored in MySQL!)

---

## 🛠️ Tech Stack

- **Frontend**: React 19 with custom UI
- **Backend**: Express.js + Node.js
- **Database**: MySQL 5.7+
- **Auth**: JWT + bcryptjs
- **Deployment**: Ready for production

---

## 📖 API Endpoints

All authenticated endpoints require: `Authorization: Bearer <token>`

### Auth

- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Get JWT token
- `POST /api/auth/forgot-password` — Password reset

### Data

- `GET /api/bootstrap` — Load all project data
- `PUT /api/alerts` — Save alerts
- `GET/PUT /api/reports` — Hazard reports
- `GET/PUT /api/checklists` — Technician submissions
- `GET/PUT /api/thresholds` — Alert configuration

---

## ⚙️ Configuration

Create a `.env` file (or copy from `.env.example`):

```env
PORT=4000
JWT_SECRET=your-secret-key
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=earthing
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 🐛 Troubleshooting

- **MySQL connection failed?** Check `.env` credentials match your MySQL setup
- **Port already in use?** Change `PORT` in `.env`
- **Dependencies missing?** Run `npm install`
- **Frontend won't connect?** Verify backend is running on port 4000

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting.

---

## 🚀 Deployment

For production:

1. Use strong `JWT_SECRET`
2. Enable HTTPS
3. Use managed MySQL database
4. Set `FRONTEND_ORIGIN` to your domain
5. Configure rate limiting
6. Add monitoring/logging

---

## 📁 Project Structure

```
earthing/
├── server/               # Backend API & MySQL
│   ├── index.js         # Express routes
│   ├── db.js            # Database connection
│   ├── schema.sql       # Database DDL
│   └── validate.js      # System checker
├── src/                 # React frontend
│   ├── App.js           # Main component
│   └── index.js         # Entry point
├── .env                 # Configuration (create from .env.example)
├── QUICKSTART.md        # 5-minute setup
├── SETUP_GUIDE.md       # Full reference
└── package.json         # Dependencies
```

---

## 💡 Key Features Implemented

✅ Backend Express API with JWT auth  
✅ MySQL database with auto-schema  
✅ Bcrypt password hashing  
✅ Role-based access control  
✅ Second-login detection  
✅ Persistent data storage  
✅ Invalid login error handling  
✅ Bootstrap data loading  
✅ Alert & report management  
✅ Technician checklist support

---

## 📞 Support

- **Getting started?** → [QUICKSTART.md](QUICKSTART.md)
- **Need help setting up?** → [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Want technical details?** → [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 📄 License

EarthGuard v3.0 — TNEB Smart Grid Initiative  
IS 3043 · IEEE 80 Compliant Monitoring

**Last Updated**: April 15, 2026
