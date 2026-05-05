require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const socketIO = require("socket.io");
const { initializeDatabase, getPool, ensureSchemaAndSeed } = require("./db");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:4001", "http://127.0.0.1:3000", "http://127.0.0.1:4001"],
    methods: ["GET", "POST"],
    credentials: false
  }
});

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "unsafe-dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:4001";

// Accept requests from frontend (allow both 3000 and 4001 for flexibility)
const allowedOrigins = ["http://localhost:3000", "http://localhost:4001", "http://127.0.0.1:3000", "http://127.0.0.1:4001"];
app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', cors({
  origin: allowedOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "10mb" }));

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired auth token." });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied for this role." });
    }
    return next();
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await getPool().query("SELECT 1 AS ok");
    res.json({ 
      ok: rows[0].ok === 1, 
      service: "earthing-backend",
      timestamp: new Date().toISOString(),
      port: PORT,
      allowedOrigins: allowedOrigins
    });
  } catch (err) {
    res.status(500).json({ 
      ok: false, 
      error: "Database connection failed",
      message: err.message 
    });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { role, name, email, password, phone = "", empId = "", dept = "" } = req.body || {};

  if (!["user", "official", "technician"].includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [result] = await getPool().query(
      `INSERT INTO users (role, name, email, phone, emp_id, dept, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [role, name.trim(), normalizedEmail, phone, empId, dept, passwordHash]
    );

    return res.status(201).json({
      id: result.insertId,
      role,
      email: normalizedEmail,
      name: name.trim(),
      message: "Account created successfully.",
    });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Account already exists for this email and role." });
    }
    return res.status(500).json({ message: "Could not create account.", detail: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { role, email, password } = req.body || {};

  if (!["user", "official", "technician"].includes(role) || !email || !password) {
    return res.status(400).json({ message: "Role, email, and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [rows] = await getPool().query(
    `SELECT id, role, name, email, phone, emp_id AS empId, dept, area, password_hash AS passwordHash,
            login_count AS loginCount
     FROM users WHERE email = ? AND role = ? LIMIT 1`,
    [normalizedEmail, role]
  );

  if (!rows.length) {
    return res.status(401).json({ message: "Invalid login credentials." });
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid login credentials." });
  }

  await getPool().query(
    `UPDATE users SET login_count = login_count + 1, last_login_at = NOW() WHERE id = ?`,
    [user.id]
  );

  const token = signToken(user);
  const isReturningUser = Number(user.loginCount) >= 1;

  return res.json({
    token,
    isReturningUser,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      empId: user.empId,
      dept: user.dept,
      area: user.area,
    },
  });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { role, email } = req.body || {};
  if (!role || !email) {
    return res.status(400).json({ message: "Role and email are required." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const [rows] = await getPool().query(
    "SELECT id FROM users WHERE email = ? AND role = ? LIMIT 1",
    [normalizedEmail, role]
  );
  if (!rows.length) {
    return res.status(404).json({ message: "No account found with this email and role." });
  }

  return res.json({ message: "Password reset request accepted. Contact admin to reset securely." });
});

app.get("/api/bootstrap", authRequired, async (_req, res) => {
  const [poleRows] = await getPool().query(
    `SELECT id, area, status, leakage, resistance, continuity, voltage, moisture, temp,
            last_check AS lastCheck, cause, history_json AS history
     FROM poles ORDER BY id ASC`
  );
  const poles = poleRows.map((row) => ({
    ...row,
    history: typeof row.history === "string" ? JSON.parse(row.history) : row.history || [],
  }));

  const [alertRows] = await getPool().query(
    `SELECT id, pole_id AS pole, fault, severity, time, date, status, tech, notes, material, image,
            completed_at AS completedAt, priority
     FROM alerts
     ORDER BY priority ASC, id ASC`
  );

  const [reportRows] = await getPool().query(
    `SELECT id, area, description AS \`desc\`, user_name AS user, reported_time AS time
     FROM reports ORDER BY id DESC`
  );

  const [checklistRows] = await getPool().query(
    `SELECT id, pole_id AS pole, area, steps_json AS steps, completed_steps AS completedSteps,
            tech, created_at_text AS createdAt
     FROM checklists ORDER BY id DESC`
  );
  const checklists = checklistRows.map((row) => ({
    ...row,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
  }));

  const [settingsRows] = await getPool().query(
    "SELECT setting_value AS value FROM settings WHERE setting_key = 'thresholds' LIMIT 1"
  );
  const thresholds = settingsRows.length
    ? (typeof settingsRows[0].value === "string" ? JSON.parse(settingsRows[0].value) : settingsRows[0].value)
    : {};

  return res.json({
    poles,
    alerts: alertRows,
    reports: reportRows,
    checklists,
    thresholds,
  });
});

app.put("/api/alerts", authRequired, roleRequired("official", "technician"), async (req, res) => {
  const { alerts } = req.body || {};
  if (!Array.isArray(alerts)) {
    return res.status(400).json({ message: "alerts must be an array." });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    for (const a of alerts) {
      await conn.query(
        `INSERT INTO alerts
         (id, pole_id, fault, severity, time, date, status, tech, notes, material, image, completed_at, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          pole_id = VALUES(pole_id),
          fault = VALUES(fault),
          severity = VALUES(severity),
          time = VALUES(time),
          date = VALUES(date),
          status = VALUES(status),
          tech = VALUES(tech),
          notes = VALUES(notes),
          material = VALUES(material),
          image = VALUES(image),
          completed_at = VALUES(completed_at),
          priority = VALUES(priority)`,
        [
          a.id,
          a.pole,
          a.fault,
          a.severity,
          a.time,
          a.date,
          a.status,
          a.tech || "",
          a.notes || "",
          a.material || "",
          a.image || null,
          a.completedAt || null,
          a.priority || 3,
        ]
      );
    }

    await conn.commit();
    return res.json({ message: "Alerts saved." });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to save alerts.", detail: err.message });
  } finally {
    conn.release();
  }
});

app.get("/api/reports", authRequired, async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT id, area, description AS \`desc\`, user_name AS user, reported_time AS time
     FROM reports ORDER BY id DESC`
  );
  return res.json(rows);
});

app.post("/api/reports", authRequired, async (req, res) => {
  const { area, desc, user, time } = req.body || {};
  if (!area || !desc || !user || !time) {
    return res.status(400).json({ message: "area, desc, user, and time are required." });
  }

  await getPool().query(
    `INSERT INTO reports (area, description, user_name, reported_time)
     VALUES (?, ?, ?, ?)`,
    [area, desc, user, time]
  );
  return res.status(201).json({ message: "Report submitted." });
});

app.put("/api/reports", authRequired, async (req, res) => {
  const { reports } = req.body || {};
  if (!Array.isArray(reports)) {
    return res.status(400).json({ message: "reports must be an array." });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const r of reports) {
      await conn.query(
        `INSERT INTO reports (id, area, description, user_name, reported_time)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          area = VALUES(area),
          description = VALUES(description),
          user_name = VALUES(user_name),
          reported_time = VALUES(reported_time)`,
        [r.id || null, r.area, r.desc, r.user, r.time]
      );
    }
    await conn.commit();
    return res.json({ message: "Reports saved." });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to save reports.", detail: err.message });
  } finally {
    conn.release();
  }
});

app.get("/api/checklists", authRequired, async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT id, pole_id AS pole, area, steps_json AS steps, completed_steps AS completedSteps,
            tech, created_at_text AS createdAt
     FROM checklists ORDER BY id DESC`
  );
  const parsed = rows.map((row) => ({
    ...row,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
  }));
  return res.json(parsed);
});

app.post("/api/checklists", authRequired, roleRequired("technician"), async (req, res) => {
  const { pole, area, steps, completedSteps, tech, createdAt } = req.body || {};
  if (!pole || !area || !Array.isArray(steps) || !tech || !createdAt) {
    return res.status(400).json({ message: "Invalid checklist payload." });
  }

  const [result] = await getPool().query(
    `INSERT INTO checklists (pole_id, area, steps_json, completed_steps, tech, created_at_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [pole, area, JSON.stringify(steps), completedSteps || 0, tech, createdAt]
  );
  return res.status(201).json({ id: result.insertId, message: "Checklist submitted." });
});

app.put("/api/checklists", authRequired, roleRequired("technician", "official"), async (req, res) => {
  const { checklists } = req.body || {};
  if (!Array.isArray(checklists)) {
    return res.status(400).json({ message: "checklists must be an array." });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const c of checklists) {
      await conn.query(
        `INSERT INTO checklists (id, pole_id, area, steps_json, completed_steps, tech, created_at_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          pole_id = VALUES(pole_id),
          area = VALUES(area),
          steps_json = VALUES(steps_json),
          completed_steps = VALUES(completed_steps),
          tech = VALUES(tech),
          created_at_text = VALUES(created_at_text)`,
        [
          c.id || null,
          c.pole,
          c.area,
          JSON.stringify(c.steps || []),
          c.completedSteps || 0,
          c.tech,
          c.createdAt,
        ]
      );
    }
    await conn.commit();
    return res.json({ message: "Checklists saved." });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ message: "Failed to save checklists.", detail: err.message });
  } finally {
    conn.release();
  }
});

app.get("/api/thresholds", authRequired, async (_req, res) => {
  const [rows] = await getPool().query(
    "SELECT setting_value AS value FROM settings WHERE setting_key = 'thresholds' LIMIT 1"
  );
  const thresholds = rows.length
    ? (typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value)
    : {};
  return res.json(thresholds);
});

app.put("/api/thresholds", authRequired, roleRequired("official"), async (req, res) => {
  const { thresholds } = req.body || {};
  if (!thresholds || typeof thresholds !== "object") {
    return res.status(400).json({ message: "thresholds must be an object." });
  }

  await getPool().query(
    `INSERT INTO settings (setting_key, setting_value)
     VALUES ('thresholds', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [JSON.stringify(thresholds)]
  );

  return res.json({ message: "Thresholds updated." });
});

// ==============================
// 🔄 REAL-TIME POLE UPDATES
// ==============================
// Endpoint for Blynk data logger to notify about pole updates
app.post("/api/poles/update", async (req, res) => {
  try {
    const { poleId } = req.body || {};
    
    if (!poleId) {
      return res.status(400).json({ message: "poleId is required." });
    }

    // Fetch updated pole data from database
    const [poleRows] = await getPool().query(
      `SELECT id, area, status, leakage, resistance, continuity, voltage, moisture, temp,
              last_check AS lastCheck, cause, history_json AS history, updated_at AS updatedAt
       FROM poles WHERE id = ?`,
      [poleId]
    );

    if (!poleRows.length) {
      return res.status(404).json({ message: "Pole not found." });
    }

    const pole = {
      ...poleRows[0],
      history: typeof poleRows[0].history === "string" ? JSON.parse(poleRows[0].history) : poleRows[0].history || [],
    };

    // Broadcast update to all connected clients
    io.emit("pole-updated", pole);

    return res.json({ 
      message: "Pole update broadcasted.",
      pole: pole
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to broadcast update.", detail: err.message });
  }
});

// ==============================
// 🔌 WEBSOCKET CONNECTION
// ==============================
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });

  socket.on("error", (error) => {
    console.error("⚠️ Socket error:", error);
  });
});


async function start() {
  try {
    await initializeDatabase();
    await ensureSchemaAndSeed();
    server.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server ready`);
    });
  } catch (err) {
    console.error("❌ Failed to start backend:", err);
    process.exit(1);
  }
}

start();
