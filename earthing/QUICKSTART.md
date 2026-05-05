# EarthGuard Quick Start — Complete Setup in 5 Minutes

Follow these steps **in order** to get EarthGuard running locally.

---

## Step 1: Verify Node.js is Installed

Open PowerShell and run:

```powershell
node --version
npm --version
```

If these fail, install from: https://nodejs.org/

---

## Step 2: Install MySQL (If Not Already Installed)

### Download & Install MySQL Server

1. Go to https://www.mysql.com/downloads/mysql/
2. Download **MySQL Community Server** (latest version)
3. Run the installer and choose:
   - **Setup Type**: Developer Default
   - **Config Type**: Development Machine
   - **MySQL Port**: 3306 (default)
   - **MySQL Root Password**: Set a password (e.g., `admin123` or leave blank for no password)
4. Click "Finish" and wait for MySQL to start

### Verify MySQL is Running

```powershell
mysql --version
mysql -u root -p
```

If prompted for password, enter what you set during install. If successful, you'll see `mysql>` prompt. Type `EXIT;` to quit.

---

## Step 3: Create the Database

Open PowerShell and run:

```powershell
mysql -u root -p "earthing"
```

This will prompt for your MySQL password. If you set no password, just press Enter.

If MySQL prompts "**ERR 1049 Unknown database 'earthing'**", create it first:

```powershell
mysql -u root -p -e "CREATE DATABASE earthing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## Step 4: Navigate to Project & Configure Environment

```powershell
cd "c:\Users\HP\Desktop\Poject Expo\earthing"
```

Edit the `.env` file with your MySQL credentials. Open `.env` in any text editor and fill in:

```env
PORT=4000
JWT_SECRET=earth-guard-dev-secret-2026
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
MYSQL_DATABASE=earthing
FRONTEND_ORIGIN=http://localhost:3000
```

**Example if you used password `admin123`:**

```env
MYSQL_PASSWORD=admin123
```

**Example if you used no password:**

```env
MYSQL_PASSWORD=
```

Save the file (Ctrl+S).

---

## Step 5: Install Dependencies

```powershell
npm install
```

This takes 1–2 minutes. Wait for it to complete.

---

## Step 6: Validate Setup (Optional But Recommended)

```powershell
node server/validate.js
```

You should see all ✓ checks pass. If MySQL connection fails, double-check your `.env` credentials.

---

## Step 7: Start the Application

### Option A: Both Frontend + Backend (Recommended)

```powershell
npm run dev
```

This will start both on:

- 🖥️ **Frontend**: http://localhost:3000
- 🔧 **Backend**: http://localhost:4000

Wait ~15 seconds for both to start, then open http://localhost:3000 in your browser.

### Option B: Start Separately (For Debugging)

Terminal 1:

```powershell
npm run server
```

Terminal 2 (new PowerShell window):

```powershell
cd "c:\Users\HP\Desktop\Poject Expo\earthing"
npm start
```

---

## Step 8: Test Login

### Option 1: Create a New Account (Recommended)

1. On the login screen, click **"Create new account →"**
2. Select **"Public User"** role
3. Fill in:
   - **Name**: Your name
   - **Email**: your.email@example.com
   - **Phone**: 9876543210 (optional)
   - **Password**: test123456 (min 6 characters)
4. Click **"✨ Create Account"**
5. Wait 2 seconds, then click **"← Back to Login"**
6. Log in with your email and password

### Option 2: Import Test Accounts (Alternative)

If you want pre-loaded test data, run in MySQL:

```sql
INSERT INTO earthing.users (role, name, email, phone, area, password_hash, login_count)
VALUES
('user', 'Test User', 'user@test.com', '9999999999', 'Coimbatore Zone', '$2a$10$N9qo8uLOickgx2ZMRZoMye', 0),
('official', 'Test Official', 'official@test.com', '8888888888', 'Coimbatore Zone', '$2a$10$N9qo8uLOickgx2ZMRZoMye', 0),
('technician', 'Test Tech', 'tech@test.com', '7777777777', 'Coimbatore Zone', '$2a$10$N9qo8uLOickgx2ZMRZoMye', 0);
```

Then log in with:

- **Email**: user@test.com
- **Password**: password123
- **Role**: Users

---

## Troubleshooting

### ❌ "npm: command not found"

→ Install Node.js from https://nodejs.org/

### ❌ "mysql: command not found"

→ Install MySQL from https://www.mysql.com/downloads/mysql/

### ❌ "Access denied for user 'root'@'localhost'"

→ Check your `.env` MYSQL_PASSWORD matches what you set during MySQL install

### ❌ "Port 4000 already in use"

→ Change PORT in `.env` to 4001 and restart

### ❌ Frontend loads but says "Cannot reach backend"

→ Check backend is running: Open new PowerShell and verify with `curl http://localhost:4000/api/health`

### ❌ "Database does not exist"

→ Run: `mysql -u root -p -e "CREATE DATABASE earthing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`

---

## What Happens on First Startup

When you run `npm run dev`, the backend automatically:

1. ✓ Connects to MySQL
2. ✓ Creates all tables (users, poles, alerts, reports, checklists, settings)
3. ✓ Seeds 6 sample poles (P101–P106) with real earthing data
4. ✓ Seeds 5 sample alerts (critical, warning, info statuses)
5. ✓ Sets default thresholds (IS 3043 compliant)

You'll see:

```
Backend running on http://localhost:4000
Compiled successfully.
You can now view react-scripts in the browser.
```

---

## Key Features to Test

### 1. Login & Second-Time Detection

- Sign up and log in once (note "first login")
- Log out and log in again (note "returning user" detection)

### 2. Role Dashboards

- **User**: View safety status, report hazards
- **Official**: Monitor poles, assign work, configure thresholds
- **Technician**: View tasks, submit repairs, upload checklists

### 3. Data Persistence

- Make changes (assign work, update alerts)
- Hard-refresh browser (Ctrl+F5)
- Changes persist! (stored in MySQL)

### 4. Secure Auth

- Try wrong password → "Invalid login" error
- Try wrong role with correct email → Error
- Success only with correct email + password + role

---

## Next: Explore the App

Once logged in, explore:

- 📊 **Overview**: Live pole map and status cards
- 📡 **Live Sensors**: Detailed readings for each pole
- 🚨 **Alerts**: Faults by priority with assignment workflow
- 🔧 **Work Orders**: Completed repairs with notes & photos
- 📈 **Analytics**: Trends and risk analysis
- ⚙️ **Settings**: Adjust alert thresholds

---

## Stop the Application

In the terminal where it's running, press **Ctrl+C** to stop.

---

## Production Deployment

When ready for production:

1. Change `.env` values to production MySQL credentials
2. Set strong `JWT_SECRET`
3. Use HTTPS
4. Deploy backend to a server (Heroku, AWS, DigitalOcean, etc.)
5. Deploy frontend to CDN (Netlify, Vercel, etc.)

Refer to [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed production guidance.

---

**You're all set! Start with `npm run dev` and open http://localhost:3000** 🚀
