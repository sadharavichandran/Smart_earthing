import { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";

/* ═══════════════════════════════════════════════════════════════
  EARTHGUARD — Smart Earthing Health Monitoring System
  Full Auth (Register/Login/Forgot Password) + 3 Role Dashboards
  Storage: Backend API + MySQL
═══════════════════════════════════════════════════════════════ */

// ── IMAGES (Unsplash, high quality) ─────────────────────────────
const IMGS = {
  hero: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1400&q=80",           // electrical grid night
  electrical: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",          // electrical tower
  technician: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",       // technician working
  safety: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",           // safety concept
  monitoring: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",       // monitoring screens
  field: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",            // field work
  city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",           // city infrastructure
  team: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",             // team/official
};

// ── DESIGN TOKENS ────────────────────────────────────────────────
const C = {
  bg0: "#05080d",
  bg1: "#080e16",
  bg2: "#0c1520",
  bg3: "#101e2c",
  bg4: "#152540",
  border: "#1a2d42",
  borderGlow: "#234060",
  t1: "#e2edf8",
  t2: "#7da4c4",
  t3: "#3a5a78",
  t4: "#1e3348",
  blue: "#0ea5e9",
  cyan: "#06d6f4",
  green: "#10e8a0",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const sc = s => ({ safe: C.green, warning: C.amber, critical: C.red, danger: C.red }[s] || "#888");
const sb = s => ({ safe: C.green + "15", warning: C.amber + "15", critical: C.red + "15" }[s]);
const sevc = s => ({ Critical: C.red, Warning: C.amber, Info: C.cyan }[s] || "#888");

// ── POLE DATA ────────────────────────────────────────────────────
let POLES = [
  { id: "P101", area: "Bus Stand", status: "critical", leakage: 42, resistance: 18.4, continuity: "Broken", voltage: 92, moisture: 8, temp: 38, lastCheck: "2 days ago", cause: "Corroded earth rod", history: ["Fault reported 3 weeks ago", "Partial repair Dec 2025"] },
  { id: "P102", area: "Market Road", status: "warning", leakage: 19, resistance: 9.1, continuity: "Weak", voltage: 54, moisture: 14, temp: 35, lastCheck: "Yesterday", cause: "Loose conductor", history: ["Inspected Jan 2026"] },
  { id: "P103", area: "Hospital Zone", status: "safe", leakage: 4, resistance: 3.2, continuity: "Good", voltage: 12, moisture: 22, temp: 32, lastCheck: "Today", cause: null, history: ["Maintained Nov 2025", "OK"] },
  { id: "P104", area: "School Area", status: "safe", leakage: 6, resistance: 4.5, continuity: "Good", voltage: 15, moisture: 20, temp: 31, lastCheck: "Today", cause: null, history: ["OK"] },
  { id: "P105", area: "Railway Gate", status: "warning", leakage: 22, resistance: 8.7, continuity: "Weak", voltage: 61, moisture: 11, temp: 36, lastCheck: "3 days ago", cause: "Moisture depletion", history: ["Flagged Jan 2026"] },
  { id: "P106", area: "Park Entrance", status: "safe", leakage: 3, resistance: 2.9, continuity: "Good", voltage: 9, moisture: 28, temp: 30, lastCheck: "Today", cause: null, history: ["OK"] },
];

const INIT_ALERTS = [
  { id: 1, pole: "P101", fault: "High Touch Voltage (92V)", severity: "Critical", time: "10:15 AM", date: "19 Feb", status: "Open", tech: "", notes: "", priority: 1 },
  { id: 2, pole: "P101", fault: "Earth Resistance 18.4Ω (> 5Ω limit)", severity: "Critical", time: "10:16 AM", date: "19 Feb", status: "Open", tech: "", notes: "", priority: 1 },
  { id: 3, pole: "P102", fault: "Continuity Weak – conductor loose", severity: "Warning", time: "09:42 AM", date: "19 Feb", status: "Assigned", tech: "", notes: "", priority: 2 },
  { id: 4, pole: "P105", fault: "Leakage Current 22mA (>15mA)", severity: "Warning", time: "08:30 AM", date: "19 Feb", status: "Assigned", tech: "", notes: "", priority: 2 },
  { id: 5, pole: "P103", fault: "Soil Moisture Low (8%)", severity: "Info", time: "07:00 AM", date: "19 Feb", status: "Resolved", tech: "", notes: "Earthing compound applied", priority: 3 },
];

const HISTORY_DATA = [
  { month: "Sep", faults: 8, resolved: 8 }, { month: "Oct", faults: 12, resolved: 11 },
  { month: "Nov", faults: 6, resolved: 6 }, { month: "Dec", faults: 9, resolved: 8 },
  { month: "Jan", faults: 14, resolved: 12 }, { month: "Feb", faults: 5, resolved: 3 },
];

const REPAIR_STEPS = [
  "⚠️ Verify power isolation before approaching pole",
  "🧤 Wear PPE — rubber gloves, safety boots, helmet",
  "📏 Measure earth resistance with earth tester",
  "🔩 Inspect earth rod for corrosion or damage",
  "💧 Apply earthing compound if soil moisture < 15%",
  "🔗 Check all bonding conductors for continuity",
  "📸 Upload photos of completed repair",
  "✅ Re-measure and verify all values are within limits",
];

// ── DEFAULT THRESHOLDS ─────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  leakage: "15 mA",
  resistance: "5 Ω",
  voltage: "40 V",
  moisture: "15%",
  temp: "35°C",
};

// ── API + IN-MEMORY STORAGE HELPERS ───────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4004/api";
let authToken = "";
let pendingRequests = new Set();

const storage = {
  cache: {
    alerts: INIT_ALERTS,
    reports: [],
    checklists: [],
    thresholds: DEFAULT_THRESHOLDS,
    poles: POLES,
  },

  setToken(token) {
    authToken = token || "";
  },

  cancelPendingRequests() {
    // Cancel all pending requests on logout
    pendingRequests.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        // ignore if already aborted
      }
    });
    pendingRequests.clear();
  },

  async request(path, options = {}) {
    const controller = new AbortController();
    pendingRequests.add(controller);

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}.`);
      }

      return data;
    } catch (error) {
      // Don't throw abort errors - they're expected on logout
      if (error.name === 'AbortError') {
        return { cancelled: true };
      }
      // Re-throw other errors with better context
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error: Cannot connect to ${API_BASE}. Please check if backend is running on port 4004.`);
      }
      throw error;
    } finally {
      pendingRequests.delete(controller);
    }
  },

  async signup(payload) {
    return this.request("/auth/signup", { method: "POST", body: payload });
  },

  async login(payload) {
    return this.request("/auth/login", { method: "POST", body: payload });
  },

  async forgotPassword(payload) {
    return this.request("/auth/forgot-password", { method: "POST", body: payload });
  },

  async bootstrap() {
    const data = await this.request("/bootstrap");
    this.hydrate(data);
    return data;
  },

  hydrate(data = {}) {
    this.cache.alerts = Array.isArray(data.alerts) ? data.alerts : this.cache.alerts;
    this.cache.reports = Array.isArray(data.reports) ? data.reports : this.cache.reports;
    this.cache.checklists = Array.isArray(data.checklists) ? data.checklists : this.cache.checklists;
    this.cache.thresholds = data.thresholds || this.cache.thresholds;
    this.cache.poles = Array.isArray(data.poles) && data.poles.length ? data.poles : this.cache.poles;
    if (Array.isArray(this.cache.poles) && this.cache.poles.length) {
      // Recalculate status based on current sensor values
      POLES = this.cache.poles.map(p => ({
        ...p,
        status: calculatePoleStatus(p)
      }));
    }
  },

  getAlerts() { return this.cache.alerts; },
  setAlerts(alerts) {
    this.cache.alerts = Array.isArray(alerts) ? alerts : [];
    this.request("/alerts", { method: "PUT", body: { alerts: this.cache.alerts } }).catch(() => {});
  },

  getReports() { return this.cache.reports; },
  setReports(reports) {
    this.cache.reports = Array.isArray(reports) ? reports : [];
    this.request("/reports", { method: "PUT", body: { reports: this.cache.reports } }).catch(() => {});
  },

  getChecklists() { return this.cache.checklists; },
  setChecklists(checklists) {
    this.cache.checklists = Array.isArray(checklists) ? checklists : [];
    this.request("/checklists", { method: "PUT", body: { checklists: this.cache.checklists } }).catch(() => {});
  },

  getThresholds() { return this.cache.thresholds || DEFAULT_THRESHOLDS; },
  setThresholds(thresholds) {
    this.cache.thresholds = thresholds || DEFAULT_THRESHOLDS;
    this.request("/thresholds", { method: "PUT", body: { thresholds: this.cache.thresholds } }).catch(() => {});
  },
};

// ── CALCULATE POLE STATUS FROM SENSOR VALUES ────────────────────
function calculatePoleStatus(pole) {
  if (!pole) return "safe";
  
  const thresholds = storage.getThresholds();
  
  // Parse threshold values
  const parseNum = s => {
    const m = String(s).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 50;
  };
  
  const leakWarn = parseNum(thresholds.leakage);
  const moistMin = parseNum(thresholds.moisture);
  const leakage = parseFloat(pole.leakage) || 0;
  const moisture = parseFloat(pole.moisture) || 0;

  // Only use leakage and moisture for the live top-right status
  if (leakage > leakWarn * 2) return "critical";
  if (moisture < moistMin / 2) return "critical";
  if (leakage > leakWarn) return "warning";
  if (moisture < moistMin) return "warning";

  return "safe";
}

// ── REPORT DOWNLOAD HELPER ───────────────────────────────────────
function downloadReport(title) {
  // build some basic text that simulates report details
  let content = `Report: ${title}\nGenerated on ${new Date().toLocaleString()}\n\n`;
  // include some dynamic data based on the report type
  switch (title) {
    case "Monthly Safety Report":
      content += POLES.map(p => {
        // add small random variation to simulate live readings
        const leak = (p.leakage + (Math.random() * 6 - 3)).toFixed(1);
        const res = (p.resistance + (Math.random() * 2 - 1)).toFixed(1);
        const volt = (p.voltage + (Math.random() * 10 - 5)).toFixed(1);
        return `${p.id} (${p.area}) – status: ${p.status} | I:${leak}mA R:${res}Ω V:${volt}V M:${p.moisture}% T:${p.temp}°C`;
      }).join("\n");
      break;
    case "Fault Analytics Report":
      content += HISTORY_DATA.map(d => `${d.month}: ${d.faults} faults, ${d.resolved} resolved`).join("\n");
      break;
    case "IS 3043 Compliance Log":
      const th = storage.getThresholds();
      content += "Configured thresholds:\n" +
        Object.entries(th).map(([k, v]) => `${k}: ${v}`).join("\n");
      break;
    case "Work Order Summary":
      const allAlerts = storage.getAlerts();
      content += allAlerts.map(a => `[${a.date} ${a.time}] ${a.pole}: ${a.fault} (${a.status})`).join("\n");
      break;
    case "Accident Prevention Stats":
      // simulate yearly accident count
      content += `Total accidents so far: ${Math.floor(Math.random() * 10)}\n`;
      content += "(Values are simulated for demo)";
      break;
    case "Audit Log Export":
      const logs = storage.getAlerts();
      content += logs.map(a => `[${a.date} ${a.time}] ${a.pole} - ${a.fault}`).join("\n");
      break;
    default:
      // keep basic content for unknown titles
      break;
  }

  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // sanitize the title for a filename
  a.download = title.replace(/\s+/g, "_") + ".pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── GLOBAL STYLE ─────────────────────────────────────────────────
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@200;400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{min-height:100vh;background:${C.bg0}}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:${C.bg0}}
    ::-webkit-scrollbar-thumb{background:${C.borderGlow};border-radius:2px}
    input,textarea,select{outline:none;font-family:inherit}
    button{font-family:inherit;cursor:pointer;border:none}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
    @keyframes borderPulse{0%,100%{border-color:${C.blue}40}50%{border-color:${C.blue}90}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    .fu{animation:fadeUp .4s ease both}
    .fi{animation:fadeIn .5s ease both}
    .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}.d4{animation-delay:.24s}.d5{animation-delay:.3s}
    .live{display:inline-block;width:8px;height:8px;border-radius:50%;background:${C.green};animation:pulse 2s infinite}
    .hover-card:hover{transform:translateY(-2px);border-color:${C.borderGlow} !important;transition:all .2s}
    .btn-hover:hover{filter:brightness(1.15);transform:translateY(-1px)}
    .row-hover:hover{background:${C.bg3} !important}
    input:focus,textarea:focus,select:focus{border-color:${C.blue} !important;box-shadow:0 0 0 3px ${C.blue}18}
    .tab-active{background:linear-gradient(90deg,${C.blue},${C.cyan}) !important;color:#fff !important}
    .glow-text{background:linear-gradient(90deg,${C.blue},${C.cyan},${C.blue});background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
  `}</style>
);

// ── REUSABLE UI ATOMS ─────────────────────────────────────────────
function Badge({ s }) {
  const map = {
    safe: [C.green, "SAFE"], warning: [C.amber, "WARN"], critical: [C.red, "FAULT"],
    Open: [C.red, "OPEN"], Assigned: [C.amber, "IN PROGRESS"], Resolved: [C.green, "RESOLVED"],
    Critical: [C.red, "CRITICAL"], Warning: [C.amber, "WARNING"], Info: [C.cyan, "INFO"],
  };
  const [c, label] = map[s] || ["#888", String(s).toUpperCase()];
  return (
    <span style={{ background: c + "18", color: c, border: `1px solid ${c}45`, borderRadius: 5, padding: "2px 10px", fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.2, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Bar({ val, max, color }) {
  return (
    <div style={{ background: "#ffffff0a", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min((val / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 1s ease" }} />
    </div>
  );
}

function Card({ children, style, className, onClick }) {
  return (
    <div onClick={onClick} className={`hover-card ${className || ""}`} style={{
      background: `linear-gradient(135deg,${C.bg2} 0%,${C.bg1} 100%)`,
      border: `1px solid ${C.border}`, borderRadius: 16,
      padding: "22px 24px", transition: "all .2s", ...style
    }}>{children}</div>
  );
}

function SecTitle({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ width: 4, height: 18, background: `linear-gradient(180deg,${C.blue},${C.cyan})`, borderRadius: 2 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, letterSpacing: 2, fontFamily: "'JetBrains Mono',monospace" }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{children}
      </span>
    </div>
  );
}

function Btn({ children, onClick, color, outline, full, small, disabled, style }) {
  const c = color || C.blue;
  return (
    <button onClick={onClick} disabled={disabled} className="btn-hover" style={{
      background: outline ? "transparent" : `linear-gradient(135deg,${c}dd,${c})`,
      border: `1px solid ${c}${outline ? "88" : ""}`,
      color: outline ? c : "#fff",
      padding: small ? "7px 16px" : "12px 28px",
      borderRadius: 10, fontWeight: 700,
      fontSize: small ? 11 : 13, letterSpacing: .8,
      width: full ? "100%" : undefined,
      opacity: disabled ? .5 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all .2s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
      ...style
    }}>{children}</button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 2, display: "block", marginBottom: 7, fontFamily: "'JetBrains Mono',monospace" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || label}
        style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.t1, fontSize: 14, fontFamily: "'Rajdhani',sans-serif", fontWeight: 500, transition: "all .2s" }} />
      {hint && <div style={{ fontSize: 11, color: C.t3, marginTop: 5, fontFamily: "monospace" }}>{hint}</div>}
    </div>
  );
}

// ── POLE MAP SVG ──────────────────────────────────────────────────
const POS = [[115, 85], [245, 52], [365, 122], [188, 198], [296, 238], [68, 208]];

function PoleMap({ poles, selected, onSelect, h = 300 }) {
  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: h, background: `linear-gradient(135deg,${C.bg0} 0%,${C.bg2} 100%)`, border: `1px solid ${C.border}` }}>
      {/* background city image overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMGS.city})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.07 }} />
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%" viewBox="0 0 470 290" preserveAspectRatio="xMidYMid meet">
        {[...Array(8)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 37} x2="470" y2={i * 37} stroke={C.border} strokeWidth=".5" />)}
        {[...Array(12)].map((_, i) => <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="290" stroke={C.border} strokeWidth=".5" />)}
        {/* Roads */}
        <path d="M 0 148 Q 235 125 470 148" stroke={C.bg4} strokeWidth="18" fill="none" />
        <path d="M 0 148 Q 235 125 470 148" stroke={C.borderGlow} strokeWidth="1" fill="none" strokeDasharray="8 5" opacity=".6" />
        <path d="M 185 0 Q 196 145 185 290" stroke={C.bg4} strokeWidth="14" fill="none" />
        <path d="M 185 0 Q 196 145 185 290" stroke={C.borderGlow} strokeWidth="1" fill="none" strokeDasharray="8 5" opacity=".6" />
        {/* Road labels */}
        <text x="235" y="142" textAnchor="middle" fill={C.t4} fontSize="8" fontFamily="monospace">MAIN ROAD</text>
        <text x="176" y="60" textAnchor="middle" fill={C.t4} fontSize="8" fontFamily="monospace" transform="rotate(-90,176,60)">CROSS ST</text>
        {poles.map((p, i) => {
          const [cx, cy] = POS[i] || [100 + i * 60, 150];
          const col = sc(p.status);
          const sel = selected?.id === p.id;
          return (
            <g key={p.id} onClick={() => onSelect && onSelect(p)} style={{ cursor: onSelect ? "pointer" : "default" }}>
              {sel && <circle cx={cx} cy={cy} r={34} fill="none" stroke={col + "50"} strokeWidth="1.5" strokeDasharray="5 3" />}
              {sel && <circle cx={cx} cy={cy} r={26} fill={col + "12"} stroke={col + "30"} strokeWidth="1" />}
              <circle cx={cx} cy={cy} r={sel ? 16 : 13} fill={col + "22"} stroke={col} strokeWidth={sel ? 2.5 : 1.8} />
              <circle cx={cx} cy={cy} r={5} fill={col} />
              <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 22} stroke={col} strokeWidth="2" opacity=".6" />
              <line x1={cx - 4} y1={cy + 22} x2={cx + 4} y2={cy + 22} stroke={col} strokeWidth="2" opacity=".6" />
              <text x={cx} y={cy - 22} textAnchor="middle" fill={C.t2} fontSize="8.5" fontFamily="monospace" fontWeight="700">{p.id}</text>
              <text x={cx} y={cy + 35} textAnchor="middle" fill={C.t3} fontSize="7" fontFamily="monospace">{p.area.split(" ")[0]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 12 }}>
        {[["safe", "SAFE"], ["warning", "WARN"], ["critical", "FAULT"]].map(([s, l]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: C.t3, fontFamily: "monospace" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc(s) }} />{l}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 9, color: C.t4, fontFamily: "monospace" }}>
        <span className="live" style={{ marginRight: 5 }} />LIVE · COIMBATORE ZONE
      </div>
    </div>
  );
}

// ── SENSOR READINGS ───────────────────────────────────────────────
function SensorPanel({ pole }) {
  if (!pole) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: C.t3, gap: 12 }}>
      <div style={{ fontSize: 36 }}>📍</div>
      <div style={{ fontFamily: "monospace", fontSize: 12 }}>Select a pole on the map</div>
    </div>
  );

  // read thresholds dynamically from storage so edits take effect immediately
  const th = storage.getThresholds();
  const parseNum = s => {
    // strip numbers and dot characters; regex simplified to avoid unnecessary escape
    const m = String(s).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const leakWarn = parseNum(th.leakage);
  const moistMin = parseNum(th.moisture);
  const status = calculatePoleStatus(pole);

  const rows = [
    {
      n: "Leakage Current",
      v: `${pole.leakage} mA`,
      s: pole.leakage > leakWarn * 2 ? "critical" : pole.leakage > leakWarn ? "warning" : "safe",
      lim: `<${leakWarn}mA`,
      pct: pole.leakage,
      max: leakWarn * 3 || 50
    },
    {
      n: "Soil Moisture",
      v: `${pole.moisture}%`,
      s: pole.moisture < moistMin / 2 ? "critical" : pole.moisture < moistMin ? "warning" : "safe",
      lim: `>${moistMin}%`,
      pct: pole.moisture,
      max: 50
    },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.t1, fontFamily: "'Exo 2',sans-serif" }}>{pole.id} — {pole.area}</div>
          {pole.cause && <div style={{ fontSize: 11, color: C.amber, marginTop: 3, fontFamily: "monospace" }}>Root cause: {pole.cause}</div>}
        </div>
        <Badge s={status} />
      </div>
      {rows.map(r => (
        <div key={r.n} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, alignItems: "center" }}>
            <span style={{ color: C.t2 }}>{r.n}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: C.t3, fontSize: 10, fontFamily: "monospace" }}>{r.lim}</span>
              <span style={{ color: sc(r.s), fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{r.v}</span>
              <Badge s={r.s} />
            </div>
          </div>
          {r.pct !== null && <Bar val={r.pct} max={r.max} color={sc(r.s)} />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AUTH PAGES
// ═══════════════════════════════════════════════════════════════════
function AuthWrapper({ onAuth }) {
  const [page, setPage] = useState("login"); // login | register | forgot
  const [role, setRole] = useState("user");
  const [form, setForm] = useState({ name: "", email: "", phone: "", empId: "", dept: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [
    { key: "user", icon: "👤", label: "Public User", color: C.green, desc: "Safety awareness" },
    { key: "official", icon: "🏛️", label: "Official", color: C.blue, desc: "TNEB / Municipality" },
    { key: "technician", icon: "🔧", label: "Technician", color: C.amber, desc: "Field staff" },
  ];
  const rc = roles.find(r => r.key === role);

  const upd = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); };

  const doLogin = async () => {
    if (!form.email || !form.password) return setErr("Please fill all fields.");
    setLoading(true);
    setErr("");
    try {
      const auth = await storage.login({
        role,
        email: form.email,
        password: form.password,
      });
      onAuth(auth);
    } catch (e) {
      setErr(e.message || "Invalid login credentials.");
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.confirm) return setErr("Please fill all required fields.");
    if (form.password !== form.confirm) return setErr("Passwords do not match.");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters.");
    setLoading(true);
    setErr("");
    try {
      await storage.signup({
        role,
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        empId: form.empId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        dept: form.dept,
      });
      setSuccess("Account created! You can now login.");
      setLoading(false);
      setTimeout(() => { setPage("login"); setSuccess(""); setForm(f => ({ ...f, password: "", confirm: "" })); }, 1800);
    } catch (e) {
      setErr(e.message || "Could not create account.");
      setLoading(false);
    }
  };

  const doForgot = async () => {
    if (!form.email) return setErr("Enter your registered email.");
    setLoading(true);
    setErr("");
    try {
      const result = await storage.forgotPassword({ role, email: form.email });
      setSuccess(result.message || "Password reset request accepted.");
      setLoading(false);
    } catch (e) {
      setErr(e.message || "Could not process request.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: C.bg0, position: "relative", overflow: "hidden" }}>
      <GS />
      {/* Left panel - image */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 56px" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMGS.hero})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#05080ddd 20%,#05080d88 60%,#05080dcc 100%)" }} />
        {/* Grid overlay */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .08 }}>
          {[...Array(20)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} stroke={C.blue} strokeWidth=".8" />)}
          {[...Array(24)].map((_, i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="1000" stroke={C.blue} strokeWidth=".8" />)}
        </svg>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${C.blue},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 0 30px ${C.blue}60` }}>⚡</div>
            <div>
              <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: 22, color: C.t1, letterSpacing: 3 }}>EARTHGUARD</div>
              <div style={{ fontSize: 10, color: C.blue, letterSpacing: 3, fontFamily: "monospace" }}>SMART MONITORING SYSTEM</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 800, fontSize: 42, lineHeight: 1.1, color: C.t1, marginBottom: 16 }}>
            Protecting Lives<br /><span className="glow-text">Through Smart</span><br />Earthing Safety
          </div>
          <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.7, maxWidth: 420 }}>
            Real-time monitoring of electrical earthing infrastructure across Coimbatore. Preventing accidents through intelligent fault detection, instant alerts, and rapid response coordination.
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
            {[["6", "Zones Monitored"], ["24/7", "Live Monitoring"], ["99.2%", "Uptime"], ["<2h", "Avg Response"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Exo 2',sans-serif", color: C.cyan }}>{v}</div>
                <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1, fontFamily: "monospace" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - auth */}
      <div style={{ width: 480, background: C.bg1, borderLeft: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "32px 44px", overflowY: "auto" }}>
        <div style={{ width: "100%" }} className="fu">
          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Exo 2',sans-serif", color: C.t1, marginBottom: 6 }}>
              {page === "login" ? "Welcome Back" : page === "register" ? "Create Account" : "Reset Password"}
            </div>
            <div style={{ fontSize: 13, color: C.t2 }}>
              {page === "login" ? "Sign in to your EarthGuard account" : page === "register" ? "Join the EarthGuard network" : "Recover your account access"}
            </div>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: 2, marginBottom: 10, fontFamily: "monospace" }}>SELECT YOUR ROLE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {roles.map(r => (
                <button key={r.key} onClick={() => { setRole(r.key); setErr(""); }} style={{
                  background: role === r.key ? r.color + "20" : C.bg3,
                  border: `1.5px solid ${role === r.key ? r.color : C.border}`,
                  borderRadius: 12, padding: "12px 8px", color: role === r.key ? r.color : C.t2,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all .2s"
                }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: .5 }}>{r.label}</span>
                  <span style={{ fontSize: 9, color: role === r.key ? r.color + "bb" : C.t3 }}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Forms */}
          {page === "register" && (
            <>
              <Input label="FULL NAME *" value={form.name} onChange={v => upd("name", v)} placeholder="Your full name" />
              {role === "technician" && <Input label="EMPLOYEE ID" value={form.empId} onChange={v => upd("empId", v)} placeholder="e.g. TEC-042 (auto-generated if empty)" />}
              {role === "official" && <Input label="DEPARTMENT" value={form.dept} onChange={v => upd("dept", v)} placeholder="e.g. TNEB Coimbatore" />}
              <Input label="PHONE NUMBER" value={form.phone} onChange={v => upd("phone", v)} placeholder="+91 XXXXX XXXXX" />
            </>
          )}
          <Input label="EMAIL ADDRESS *" type="email" value={form.email} onChange={v => upd("email", v)} placeholder="you@example.com" />
          {page !== "forgot" && <Input label="PASSWORD *" type="password" value={form.password} onChange={v => upd("password", v)} placeholder="Min. 6 characters" />}
          {page === "register" && <Input label="CONFIRM PASSWORD *" type="password" value={form.confirm} onChange={v => upd("confirm", v)} placeholder="Repeat password" />}

          {err && <div style={{ background: C.red + "12", border: `1px solid ${C.red}40`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 12, marginBottom: 14, fontFamily: "monospace" }}>⚠ {err}</div>}
          {success && <div style={{ background: C.green + "12", border: `1px solid ${C.green}40`, borderRadius: 8, padding: "10px 14px", color: C.green, fontSize: 12, marginBottom: 14, fontFamily: "monospace" }}>✓ {success}</div>}

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <Btn full color={rc.color} onClick={page === "login" ? doLogin : page === "register" ? doRegister : doForgot} disabled={loading}>
              {loading ? "⏳ Please wait..." : page === "login" ? `🔐 Login as ${rc.label}` : page === "register" ? `✨ Create Account` : `📧 Send Reset Info`}
            </Btn>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.t3 }}>
            {page === "login"
              ? <>
                <button onClick={() => { setPage("register"); setErr(""); }} style={{ background: "none", color: C.blue, fontSize: 12, fontWeight: 600 }}>Create new account →</button>
                <button onClick={() => { setPage("forgot"); setErr(""); }} style={{ background: "none", color: C.t3, fontSize: 12 }}>Forgot password?</button>
              </>
              : <button onClick={() => { setPage("login"); setErr(""); setSuccess(""); }} style={{ background: "none", color: C.blue, fontSize: 12, fontWeight: 600 }}>← Back to Login</button>
            }
          </div>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.t4, textAlign: "center", fontFamily: "monospace" }}>
            EarthGuard v3.0 · TNEB Smart Grid Initiative<br />IS 3043 · IEEE 80 Compliant Monitoring
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════════════════════════════════
function TopBar({ user, onLogout }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const roleClr = { user: C.green, official: C.blue, technician: C.amber };
  const roleIcon = { user: "👤", official: "🏛️", technician: "🔧" };
  const rc = roleClr[user.role];
  return (
    <div style={{ background: C.bg1, borderBottom: `1px solid ${C.border}`, height: 62, display: "flex", alignItems: "center", padding: "0 28px", gap: 14, position: "sticky", top: 0, zIndex: 300, backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.blue},${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 0 14px ${C.blue}40` }}>⚡</div>
        <div>
          <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: 15, color: C.t1, letterSpacing: 2 }}>EARTHGUARD</div>
          <div style={{ fontSize: 9, color: C.t4, letterSpacing: 2, fontFamily: "monospace" }}>SMART EARTHING MONITOR</div>
        </div>
      </div>
      <div style={{ width: 1, height: 30, background: C.border, marginLeft: 8 }} />
      <div style={{ background: rc + "18", border: `1px solid ${rc}40`, borderRadius: 8, padding: "5px 13px", display: "flex", alignItems: "center", gap: 7 }}>
        <span className="live" style={{ background: rc }} />
        <span style={{ fontSize: 11, color: rc, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>{roleIcon[user.role]} {user.role.toUpperCase()}</span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, color: C.cyan, fontWeight: 700, lineHeight: 1 }}>{time.toLocaleTimeString("en-IN")}</div>
          <div style={{ fontSize: 10, color: C.t4, fontFamily: "monospace", marginTop: 2 }}>{time.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
        </div>
        <div style={{ width: 1, height: 30, background: C.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${rc}40,${rc}20)`, border: `1px solid ${rc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{roleIcon[user.role]}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{user.name}</div>
            <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace" }}>{user.dept || user.empId || user.area || "Coimbatore"}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: C.red + "15", border: `1px solid ${C.red}40`, color: C.red, padding: "8px 16px", borderRadius: 9, fontWeight: 700, fontSize: 11, letterSpacing: .5, transition: "all .2s" }}>LOGOUT</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OFFICIAL DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function OfficialDashboard({ user, alerts, setAlerts }) {
  const [tab, setTab] = useState("overview");
  const [selectedPoleId, setSelectedPoleId] = useState(null);
  const sel = POLES.find(p => p.id === selectedPoleId) || null;
  const [techInput, setTechInput] = useState({ id: null, val: "" });
  const [selectedWork, setSelectedWork] = useState(null);
  const reports = storage.getReports();

  // editable threshold values stored in localStorage
  const [thresholds, setThresholds] = useState(() => storage.getThresholds());
  const thresholdLabels = {
    leakage: "Leakage Current Limit",
    resistance: "Earth Resistance Max",
    voltage: "Touch Voltage Max",
    moisture: "Soil Moisture Min",
    temp: "Temperature Max",
  };
  const editThreshold = (key, label) => {
    const current = thresholds[key];
    const val = prompt(`Enter new value for ${label}`, current);
    if (val !== null) {
      const updated = { ...thresholds, [key]: val };
      setThresholds(updated);
      storage.setThresholds(updated);
    }
  };

  const total = POLES.length, safe = POLES.filter(p => p.status === "safe").length;
  const faulty = POLES.filter(p => p.status === "critical").length;
  const warn = POLES.filter(p => p.status === "warning").length;
  const open = alerts.filter(a => a.status !== "Resolved").length;

  const assign = (id) => {
    if (!techInput.val.trim()) return;
    const updated = alerts.map(a => a.id === id ? { ...a, status: "Assigned", tech: techInput.val } : a);
    setAlerts(updated); storage.setAlerts(updated);
    setTechInput({ id: null, val: "" });
  };

  const checklistReports = storage.getChecklists();
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  const tabs = [
    { id: "overview", label: "📊 OVERVIEW" },
    { id: "live", label: "📡 LIVE SENSORS" },
    { id: "alerts", label: `🚨 ALERTS (${open})` },
    { id: "work", label: `🔧 COMPLETED WORK` },
    { id: "checklists", label: `📝 CHECKLISTS (${checklistReports.length})` },
    { id: "analytics", label: "📈 ANALYTICS" },
    { id: "reports", label: "📑 REPORTS" },
    { id: "settings", label: "⚙️ SETTINGS" },
  ];

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1380, margin: "0 auto" }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 26 }}>
        {[
          { icon: "🏗️", label: "TOTAL POLES", val: total, c: C.cyan, img: IMGS.electrical },
          { icon: "✅", label: "HEALTHY", val: safe, c: C.green, sub: `${((safe/total)*100).toFixed(0)}% network` },
          { icon: "⚠️", label: "WARNING", val: warn, c: C.amber },
          { icon: "🔴", label: "CRITICAL", val: faulty, c: C.red },
          { icon: "🚨", label: "OPEN ALERTS", val: open, c: C.purple },
        ].map((k, i) => (
          <div key={k.label} className={`fu d${i + 1} hover-card`} style={{
            background: `linear-gradient(135deg,${C.bg2},${C.bg1})`, border: `1px solid ${k.c}30`,
            borderRadius: 16, padding: "20px 22px", overflow: "hidden", position: "relative", transition: "all .2s"
          }}>
            <div style={{ position: "absolute", right: 0, top: 0, width: 80, height: 80, background: k.c + "0a", borderRadius: "0 16px 0 80px" }} />
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 700, color: k.c, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginTop: 5, fontFamily: "monospace" }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 10, color: k.c + "90", marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.bg2, borderRadius: 12, padding: 5, marginBottom: 24, width: "fit-content", border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `linear-gradient(90deg,${C.blue},${C.cyan})` : "transparent",
            border: "none", color: tab === t.id ? "#fff" : C.t2,
            padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 11,
            letterSpacing: 1, fontFamily: "monospace", transition: "all .2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          <Card className="fu"><SecTitle>INTERACTIVE ZONE MAP</SecTitle><PoleMap poles={POLES} selected={sel} onSelect={p => setSelectedPoleId(p.id)} h={320} /></Card>
          <Card className="fu d2">
            <SecTitle>POLE STATUS</SecTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {POLES.map(p => (
                <div key={p.id} onClick={() => setSelectedPoleId(p.id)} className="row-hover" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                  background: sel?.id === p.id ? sb(p.status) : C.bg3,
                  border: `1px solid ${sel?.id === p.id ? sc(p.status) + "60" : C.border}`, transition: "all .15s"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.t1 }}>{p.id} — {p.area}</div>
                    <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace", marginTop: 2 }}>R:{p.resistance}Ω · I:{p.leakage}mA · V:{p.voltage}V</div>
                  </div>
                  <Badge s={p.status} />
                </div>
              ))}
            </div>
          </Card>
          {/* Image cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, gridColumn: "1 / -1" }}>
            {[
              { img: IMGS.monitoring, title: "24/7 Monitoring", sub: "All 6 zones active", color: C.blue },
              { img: IMGS.team, title: "Official Control", sub: "Command & response ready", color: C.purple },
              { img: IMGS.safety, title: "Safety First", sub: "IS 3043 compliant", color: C.green },
            ].map(c => (
              <div key={c.title} className="hover-card fu" style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${c.color}30`, height: 160, position: "relative", transition: "all .2s" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${c.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top,${C.bg0}ee,transparent 40%)` }} />
                <div style={{ position: "absolute", bottom: 14, left: 16 }}>
                  <div style={{ fontWeight: 800, color: C.t1, fontSize: 14, fontFamily: "'Exo 2',sans-serif" }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: c.color, marginTop: 2 }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LIVE SENSORS ── */}
      {tab === "live" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
          <Card className="fu"><SecTitle>ZONE MAP — CLICK POLE</SecTitle><PoleMap poles={POLES} selected={sel} onSelect={p => setSelectedPoleId(p.id)} h={330} /></Card>
          <Card className="fu d2"><SecTitle>SENSOR READINGS</SecTitle><SensorPanel pole={sel} /></Card>
          {sel && (
            <Card className="fu" style={{ gridColumn: "1 / -1" }}>
              <SecTitle>REPAIR HISTORY — {sel.id}</SecTitle>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {sel.history.map((h, i) => (
                  <div key={i} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, color: C.t2 }}>📋 {h}</div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── ALERTS ── */}
      {tab === "alerts" && (
        <Card className="fu">
          <SecTitle>PRIORITY-BASED FAULT MANAGEMENT</SecTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["#", "POLE", "FAULT", "SEVERITY", "DATE/TIME", "STATUS", "TECHNICIAN", "ACTION"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.t3, fontSize: 10, letterSpacing: 1.5, fontFamily: "monospace", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...alerts].sort((a, b) => a.priority - b.priority).map((a, idx) => (
                  <tr key={a.id} className="row-hover" style={{ borderBottom: `1px solid ${C.bg3}` }}>
                    <td style={{ padding: "13px 14px", color: C.t3, fontFamily: "monospace" }}>{idx + 1}</td>
                    <td style={{ padding: "13px 14px", fontFamily: "'JetBrains Mono',monospace", color: C.cyan, fontWeight: 700 }}>{a.pole}</td>
                    <td style={{ padding: "13px 14px", color: C.t1, maxWidth: 220 }}>{a.fault}</td>
                    <td style={{ padding: "13px 14px" }}><Badge s={a.severity} /></td>
                    <td style={{ padding: "13px 14px", color: C.t3, fontFamily: "monospace", fontSize: 11 }}>{a.date} · {a.time}</td>
                    <td style={{ padding: "13px 14px" }}><Badge s={a.status} /></td>
                    <td style={{ padding: "13px 14px", color: C.t2, fontSize: 12 }}>{a.tech || "—"}</td>
                    <td style={{ padding: "13px 14px" }}>
                      {a.status === "Open" ? (
                        techInput.id === a.id
                          ? <div style={{ display: "flex", gap: 6 }}>
                              <input value={techInput.val} onChange={e => setTechInput(x => ({ ...x, val: e.target.value }))} placeholder="Tech name"
                                style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.t1, padding: "5px 10px", borderRadius: 7, fontSize: 11, width: 130 }} />
                              <Btn small color={C.green} onClick={() => assign(a.id)}>✓</Btn>
                              <Btn small outline color={C.red} onClick={() => setTechInput({ id: null, val: "" })}>✕</Btn>
                            </div>
                          : <Btn small color={C.blue} onClick={() => setTechInput({ id: a.id, val: "" })}>Assign</Btn>
                      ) : a.status === "Assigned"
                        ? <span style={{ color: C.amber, fontSize: 11, fontFamily: "monospace" }}>⚙ In Progress</span>
                        : <span style={{ color: C.green, fontSize: 11, fontFamily: "monospace" }}>✓ Resolved</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CHECKLISTS ── */}
      {tab === "checklists" && (
        <Card className="fu">
          <SecTitle>TECHNICIAN CHECKLIST SUBMISSIONS</SecTitle>
          {selectedChecklist ? (
            <div>
              <button onClick={() => setSelectedChecklist(null)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>← Back to List</button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{selectedChecklist.pole} — {selectedChecklist.area}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>Technician: {selectedChecklist.tech}</div>
                  <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>Submitted: {selectedChecklist.createdAt}</div>
                  <div style={{ marginTop: 14 }}>
                    {REPAIR_STEPS.map((step, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: selectedChecklist.steps[idx] ? C.green : C.bg3, border: `1px solid ${selectedChecklist.steps[idx] ? C.green : C.border}` }} />
                        <div style={{ fontSize: 12, color: selectedChecklist.steps[idx] ? C.t1 : C.t2 }}>{step}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 12, color: C.blue }}>Completed {selectedChecklist.completedSteps}/{REPAIR_STEPS.length} steps</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {checklistReports.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: C.t3 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <div style={{ fontSize: 13 }}>No checklists submitted yet</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                  {checklistReports.map(chk => (
                    <div key={chk.id} className="hover-card" onClick={() => setSelectedChecklist(chk)} style={{
                      background: `linear-gradient(135deg,${C.bg2},${C.bg1})`,
                      border: `1px solid ${C.blue}30`,
                      borderRadius: 14,
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all .2s"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: C.t1, fontSize: 13 }}>{chk.pole}</div>
                          <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace", marginTop: 2 }}>{chk.area}</div>
                          <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>{chk.createdAt}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: C.t2 }}>Tech: {chk.tech} · {chk.completedSteps}/{REPAIR_STEPS.length} steps</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── ANALYTICS ── */}
      {tab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card className="fu">
            <SecTitle>MONTHLY FAULT TREND</SecTitle>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, marginBottom: 12 }}>
              {HISTORY_DATA.map(d => {
                const maxV = Math.max(...HISTORY_DATA.map(x => x.faults));
                return (
                  <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace", marginBottom: 5 }}>{d.faults}</div>
                    <div style={{ width: "70%", height: (d.faults / maxV) * 110, borderRadius: "5px 5px 0 0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ flex: d.faults - d.resolved, background: C.red + "70" }} />
                      <div style={{ flex: d.resolved, background: C.green + "80" }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace", marginTop: 6 }}>{d.month}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 20 }}>
              {[[C.red + "70", "Pending"], [C.green + "80", "Resolved"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: C.t2 }}>
                  <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />{l}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[["Total", HISTORY_DATA.reduce((a, d) => a + d.faults, 0), C.red], ["Resolved", HISTORY_DATA.reduce((a, d) => a + d.resolved, 0), C.green], ["Pending", HISTORY_DATA.reduce((a, d) => a + d.faults - d.resolved, 0), C.amber]].map(([l, v, c]) => (
                <div key={l} style={{ background: C.bg3, border: `1px solid ${c}30`, borderRadius: 10, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="fu d2">
            <SecTitle>ZONE RISK ANALYSIS</SecTitle>
            {POLES.map(p => (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: C.t2 }}>{p.id} — {p.area}</span>
                  <span style={{ color: sc(p.status), fontWeight: 700, fontFamily: "monospace", fontSize: 11 }}>{p.voltage}V · {p.status === "critical" ? "HIGH RISK" : p.status === "warning" ? "MED RISK" : "LOW RISK"}</span>
                </div>
                <Bar val={p.voltage} max={100} color={sc(p.status)} />
              </div>
            ))}
            <div style={{ marginTop: 20, background: C.cyan + "0c", border: `1px solid ${C.cyan}30`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 6, fontFamily: "monospace" }}>🤖 AI PREDICTION ENGINE</div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>P102 (Market Road) voltage trending up. Monsoon season expected to worsen soil resistance. <strong style={{ color: C.amber }}>Proactive inspection recommended by May 2026.</strong></div>
            </div>
          </Card>
        </div>
      )}

      {/* ── COMPLETED WORK ── */}
      {tab === "work" && (
        <div>
          {selectedWork ? (
            <Card className="fu">
              <button onClick={() => setSelectedWork(null)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>← Back to Work List</button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <SecTitle>WORK DETAILS</SecTitle>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4, fontFamily: "monospace" }}>POLE ID</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>{selectedWork.pole}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4, fontFamily: "monospace" }}>FAULT DESCRIPTION</div>
                      <div style={{ fontSize: 12, color: C.t2 }}>{selectedWork.fault}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4, fontFamily: "monospace" }}>TECHNICIAN</div>
                      <div style={{ fontSize: 12, color: C.t2 }}>{selectedWork.tech}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4, fontFamily: "monospace" }}>COMPLETED DATE & TIME</div>
                      <div style={{ fontSize: 12, color: C.green, fontFamily: "monospace" }}>{selectedWork.completedAt}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>REPAIR NOTES</div>
                      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", fontSize: 12, color: C.t2, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                        {selectedWork.notes || "No notes provided"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>MATERIAL USED</div>
                      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", fontSize: 12, color: C.t2, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
                        {selectedWork.material || "No materials listed"}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <SecTitle>REPAIR IMAGE</SecTitle>
                  {selectedWork.image ? (
                    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.green}40`, background: C.bg3 }}>
                      <img src={selectedWork.image} alt="repair work" style={{ width: "100%", height: "auto", display: "block" }} />
                      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: 11, color: C.green, fontFamily: "monospace" }}>✓ Image uploaded successfully</div>
                    </div>
                  ) : (
                    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px dashed ${C.border}`, background: C.bg3, padding: "40px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                      <div style={{ fontSize: 12, color: C.t3 }}>No image uploaded</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="fu">
              <SecTitle>TECHNICIAN WORK SUBMISSIONS</SecTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {alerts.filter(a => a.status === "Resolved" && (a.notes || a.material || a.image)).length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: C.t3 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
                    <div style={{ fontSize: 13 }}>No completed work with submissions yet</div>
                  </div>
                ) : (
                  alerts.filter(a => a.status === "Resolved" && (a.notes || a.material || a.image)).map(a => {
                    const pole = POLES.find(p => p.id === a.pole);
                    return (
                      <div key={a.id} className="hover-card" onClick={() => setSelectedWork(a)} style={{ 
                        background: `linear-gradient(135deg,${C.bg2},${C.bg1})`,
                        border: `1px solid ${C.green}30`, 
                        borderRadius: 14, 
                        padding: "16px", 
                        cursor: "pointer",
                        transition: "all .2s"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: C.t1, fontSize: 13 }}>{a.pole} — {pole?.area}</div>
                            <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace", marginTop: 2 }}>Tech: {a.tech}</div>
                          </div>
                          {a.image && <span style={{ fontSize: 16 }}>📸</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.t2, marginBottom: 8, lineHeight: 1.5 }}>{a.fault}</div>
                        <div style={{ fontSize: 10, color: C.t4, fontFamily: "monospace" }}>{a.completedAt}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === "reports" && (
        <div>
          <Card className="fu" style={{ marginBottom: 20 }}>
            <SecTitle>COMPLIANCE & SAFETY REPORTS</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
              {[
                { icon: "📄", t: "Monthly Safety Report", sub: "February 2026", c: C.blue },
                { icon: "📊", t: "Fault Analytics Report", sub: "Last 6 months", c: C.cyan },
                { icon: "🛡️", t: "IS 3043 Compliance Log", sub: "Earthing standards", c: C.green },
                { icon: "🔧", t: "Work Order Summary", sub: "All technicians", c: C.amber },
                { icon: "⚡", t: "Accident Prevention Stats", sub: "FY 2025-26", c: C.purple },
                { icon: "📋", t: "Audit Log Export", sub: "Full sensor history", c: C.red },
              ].map(r => (
                <div key={r.t} className="hover-card" style={{ background: C.bg3, border: `1px solid ${r.c}30`, borderRadius: 14, padding: "18px 20px", display: "flex", gap: 14, transition: "all .2s" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: r.c + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{r.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.t1, fontSize: 13 }}>{r.t}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>{r.sub}</div>
                    <button onClick={() => downloadReport(r.t)} style={{ marginTop: 10, background: r.c + "18", border: `1px solid ${r.c}40`, color: r.c, padding: "5px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: .5 }}>↓ DOWNLOAD PDF</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {reports.length > 0 && (
            <Card className="fu">
              <SecTitle>USER SUBMITTED REPORTS</SecTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reports.map((r, i) => (
                  <div key={i} style={{ background: C.bg3, border: `1px solid ${C.amber}30`, borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: C.amber, fontSize: 13 }}>📍 {r.area} — Reported by {r.user}</div>
                    <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>{r.desc}</div>
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 4, fontFamily: "monospace" }}>{r.time}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card className="fu">
            <SecTitle>ALERT THRESHOLDS</SecTitle>
            {Object.entries(thresholds).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.t2 }}>{thresholdLabels[k]}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue, fontWeight: 700 }}>{v}</span>
                  <button onClick={() => editThreshold(k, thresholdLabels[k])} style={{ background: C.blue + "18", border: `1px solid ${C.blue}40`, color: C.blue, padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>EDIT</button>
                </div>
              </div>
            ))}
          </Card>
          <Card className="fu d2">
            <SecTitle>SYSTEM INFORMATION</SecTitle>
            {[["System Version", "EarthGuard v3.0"], ["Standards", "IS 3043 / IEEE 80"], ["Zones Monitored", "6 zones active"], ["Sensor Network", "18 IoT sensors"], ["Data Refresh", "Every 30 seconds"], ["Your Account", user.email]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.t2 }}>{l}</span>
                <span style={{ color: C.t1, fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TECHNICIAN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function TechnicianDashboard({ user, alerts, setAlerts }) {
  const [tab, setTab] = useState("tasks");
  const [selectedPoleId, setSelectedPoleId] = useState(null);
  const sel = POLES.find(p => p.id === selectedPoleId) || null;
  const [notes, setNotes] = useState({});
  const [material, setMaterial] = useState({});
  const [checklist, setChecklist] = useState({});
  const [checklistPole, setChecklistPole] = useState("");
  const [checklistArea, setChecklistArea] = useState("");
  const [images, setImages] = useState({});

  const myTasks = alerts.filter(a => a.tech === user.name && a.status === "Assigned");
  const done = alerts.filter(a => a.tech === user.name && a.status === "Resolved");

  const handleImageUpload = (id, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => ({ ...prev, [id]: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const markDone = (id) => {
    const updated = alerts.map(a => 
      a.id === id 
        ? { 
            ...a, 
            status: "Resolved", 
            notes: notes[id] || "", 
            material: material[id] || "",
            image: images[id] || null,
            completedAt: new Date().toLocaleString("en-IN")
          } 
        : a
    );
    setAlerts(updated); 
    storage.setAlerts(updated);
  };

  const tabs = [
    { id: "tasks", label: `📋 MY TASKS (${myTasks.length})` },
    { id: "inspect", label: "🔍 INSPECTION" },
    { id: "guide", label: "📖 REPAIR GUIDE" },
    { id: "done", label: `✅ COMPLETED (${done.length})` },
  ];

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Tech KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 26 }}>
        {[
          { icon: "📋", label: "ASSIGNED TASKS", val: myTasks.length, c: C.amber },
          { icon: "✅", label: "COMPLETED", val: done.length, c: C.green },
          { icon: "🔴", label: "CRITICAL POLES", val: POLES.filter(p => p.status === "critical").length, c: C.red },
          { icon: "🏷️", label: "EMPLOYEE ID", val: user.empId || "TEC-001", c: C.cyan },
        ].map((k, i) => (
          <div key={k.label} className={`fu d${i + 1} hover-card`} style={{ background: `linear-gradient(135deg,${C.bg2},${C.bg1})`, border: `1px solid ${k.c}30`, borderRadius: 16, padding: "20px 22px", display: "flex", gap: 14, alignItems: "center", transition: "all .2s" }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: k.c + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: typeof k.val === "string" ? 16 : 28, fontWeight: 700, color: k.c, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1, marginTop: 5, fontFamily: "monospace" }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.bg2, borderRadius: 12, padding: 5, marginBottom: 24, width: "fit-content", border: `1px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `linear-gradient(90deg,${C.amber},${C.amber}bb)` : "transparent",
            border: "none", color: tab === t.id ? C.bg0 : C.t2,
            padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 11,
            letterSpacing: 1, fontFamily: "monospace", transition: "all .2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── MY TASKS ── */}
      {tab === "tasks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {myTasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ color: C.green, fontSize: 18, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>All Clear! No pending tasks.</div>
              <div style={{ color: C.t3, fontSize: 13, marginTop: 8 }}>Check back later for new assignments from officials.</div>
            </div>
          )}
          {myTasks.map(a => {
            const pole = POLES.find(p => p.id === a.pole);
            return (
              <Card key={a.id} className="fu" style={{ border: `1px solid ${sevc(a.severity)}30` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20 }}>
                  <div>
                    {/* Task header */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ background: sevc(a.severity) + "18", color: sevc(a.severity), border: `1px solid ${sevc(a.severity)}40`, borderRadius: 8, padding: "4px 14px", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>⚠ {a.severity.toUpperCase()}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.cyan, fontWeight: 700, fontSize: 16 }}>{a.pole}</span>
                      <span style={{ fontWeight: 700, color: C.t1, fontSize: 15 }}>{a.fault}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.t3, fontFamily: "monospace", marginBottom: 16 }}>
                      📍 {pole?.area} · Reported: {a.date}, {a.time}
                    </div>

                    {/* PPE Warning */}
                    <div style={{ background: C.red + "10", border: `1px solid ${C.red}35`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 6 }}>⚠️ SAFETY WARNING — Touch Voltage: {pole?.voltage}V</div>
                      <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.6 }}>
                        Wear Class-2 rubber gloves · Safety boots · Insulated helmet · Verify power isolation before contact.
                      </div>
                    </div>

                    {/* Repair inputs */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>REPAIR NOTES</div>
                        <textarea rows={3} value={notes[a.id] || ""} onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
                          placeholder="Describe the repair performed..."
                          style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, color: C.t1, borderRadius: 9, padding: "10px 12px", fontSize: 12, resize: "vertical" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>MATERIAL USED</div>
                        <textarea rows={3} value={material[a.id] || ""} onChange={e => setMaterial(m => ({ ...m, [a.id]: e.target.value }))}
                          placeholder="e.g. GI wire 4mm², earthing compound, earth rod..."
                          style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, color: C.t1, borderRadius: 9, padding: "10px 12px", fontSize: 12, resize: "vertical" }} />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div style={{ marginTop: 12, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 8, fontFamily: "monospace" }}>📸 UPLOAD REPAIR IMAGE</div>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", background: C.bg0, border: `1px dashed ${C.border}`, borderRadius: 8, transition: "all .2s" }}>
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(a.id, e.target.files[0])} style={{ display: "none" }} />
                        <span style={{ fontSize: 16 }}>🔗</span>
                        <span style={{ fontSize: 12, color: images[a.id] ? C.green : C.t2 }}>
                          {images[a.id] ? "✓ Image selected" : "Click to upload image of the completed repair"}
                        </span>
                      </label>
                      {images[a.id] && (
                        <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", maxHeight: 120 }}>
                          <img src={images[a.id]} alt="repair" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: 8 }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: live readings + complete */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
                    <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 10, fontFamily: "monospace" }}>LIVE READINGS</div>
                      {[["⚡", "Voltage", `${pole?.voltage}V`, pole?.voltage > 65 ? C.red : C.green], ["Ω", "Resistance", `${pole?.resistance}Ω`, pole?.resistance > 10 ? C.red : C.green], ["💧", "Moisture", `${pole?.moisture}%`, pole?.moisture < 15 ? C.amber : C.green]].map(([ic, l, v, col]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                          <span style={{ color: C.t3 }}>{ic} {l}</span>
                          <span style={{ color: col, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <Btn color={C.green} full onClick={() => markDone(a.id)}>✓ Mark Resolved</Btn>
                    <div style={{ fontSize: 10, color: C.t3, textAlign: "center", fontFamily: "monospace" }}>Priority: {a.priority === 1 ? "🔴 HIGH" : "🟡 MEDIUM"}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── INSPECTION ── */}
      {tab === "inspect" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
          <Card className="fu"><SecTitle>ZONE MAP — SELECT POLE</SecTitle><PoleMap poles={POLES} selected={sel} onSelect={p => setSelectedPoleId(p.id)} h={320} /></Card>
          <Card className="fu d2">
            <SecTitle>SENSOR READINGS</SecTitle>
            <SensorPanel pole={sel} />
            {sel && (
              <div style={{ marginTop: 14, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace" }}>Last checked: <span style={{ color: C.cyan }}>{sel.lastCheck}</span></div>
                {sel.cause && <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>⚠ Root cause: {sel.cause}</div>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── REPAIR GUIDE ── */}
      {tab === "guide" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card className="fu">
            <SecTitle>STEP‑BY‑STEP REPAIR CHECKLIST</SecTitle>
            {/* pole & area inputs for checklist submission */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>POLE ID</div>
                <select value={checklistPole} onChange={e => setChecklistPole(e.target.value)}
                  style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.t1, fontSize: 12 }}>
                  <option value="">Select pole</option>
                  {POLES.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 6, fontFamily: "monospace" }}>AREA / PLACE</div>
                <input value={checklistArea} onChange={e => setChecklistArea(e.target.value)} placeholder="e.g. Bus Stand"
                  style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.t1, fontSize: 12 }} />
              </div>
            </div>

            {REPAIR_STEPS.map((step, i) => (
              <div key={i} onClick={() => setChecklist(c => ({ ...c, [i]: !c[i] }))} style={{
                display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                borderRadius: 10, background: checklist[i] ? C.green + "10" : C.bg3,
                border: `1px solid ${checklist[i] ? C.green + "40" : C.border}`, transition: "all .2s"
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checklist[i] ? C.green : C.border}`, background: checklist[i] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12 }}>
                  {checklist[i] && "✓"}
                </div>
                <span style={{ fontSize: 13, color: checklist[i] ? C.green : C.t2, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "10px 14px", background: C.blue + "10", border: `1px solid ${C.blue}30`, borderRadius: 10, fontSize: 12, color: C.blue, textAlign: "center", fontFamily: "monospace" }}>
              {Object.values(checklist).filter(Boolean).length}/{REPAIR_STEPS.length} steps completed
            </div>
            {/* submit button for checklist */}
            <Btn full color={C.blue} style={{ marginTop: 14 }} onClick={async () => {
              if (!checklistPole.trim() || !checklistArea.trim()) {
                return alert("Please select pole ID and enter area before submitting the checklist.");
              }
              const stepsArray = REPAIR_STEPS.map((_, idx) => !!checklist[idx]);
              const newChk = {
                pole: checklistPole,
                area: checklistArea,
                steps: stepsArray,
                completedSteps: stepsArray.filter(Boolean).length,
                tech: user.name,
                createdAt: new Date().toLocaleString("en-IN")
              };
              try {
                // Send to backend
                await storage.request("/checklists", { method: "POST", body: newChk });
                // Update local cache
                const existing = storage.getChecklists();
                storage.cache.checklists = [...existing, { id: Date.now(), ...newChk }];
                setChecklist({});
                setChecklistPole("");
                setChecklistArea("");
                alert("Checklist submitted successfully.");
              } catch (err) {
                console.error("Failed to submit checklist:", err);
                alert("Failed to submit checklist.");
              }
            }}>Submit Checklist</Btn>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="hover-card fu" style={{ borderRadius: 16, overflow: "hidden", height: 200, border: `1px solid ${C.border}`, position: "relative", transition: "all .2s" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMGS.technician})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top,${C.bg0}ee,transparent 50%)` }} />
              <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                <div style={{ fontWeight: 800, color: C.t1, fontSize: 16, fontFamily: "'Exo 2',sans-serif" }}>Field Safety Protocol</div>
                <div style={{ fontSize: 12, color: C.amber, marginTop: 3 }}>IS 3043 · IEEE 80 Standards</div>
              </div>
            </div>
            <Card className="fu d2">
              <SecTitle>PPE REQUIREMENTS</SecTitle>
              {[["🧤", "Class-2 Rubber Gloves", "Mandatory for all work"], ["👢", "Insulated Safety Boots", "Min 1000V rated"], ["⛑️", "Hard Hat / Helmet", "Dielectric type"], ["🥽", "Safety Goggles", "Arc flash protection"], ["🦺", "High-Vis Safety Vest", "For field visibility"]].map(([ic, l, sub]) => (
                <div key={l} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{ic}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{l}</div>
                    <div style={{ fontSize: 11, color: C.t3 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {tab === "done" && (
        <Card className="fu">
          <SecTitle>COMPLETED WORK HISTORY</SecTitle>
          {done.length === 0
            ? <div style={{ textAlign: "center", color: C.t3, padding: "40px 0", fontSize: 13 }}>No completed tasks yet.</div>
            : done.map(a => (
              <div key={a.id} className="hover-card" style={{ background: C.bg3, border: `1px solid ${C.green}25`, borderRadius: 12, padding: "16px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .2s" }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.t1, fontSize: 14 }}>{a.pole} — {a.fault}</div>
                  <div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace", marginTop: 4 }}>
                    {a.date} · {a.time}{a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge s="Resolved" />
                  <span style={{ fontSize: 22, color: C.green }}>✓</span>
                </div>
              </div>
            ))
          }
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// USER DASHBOARD (PUBLIC)
// ═══════════════════════════════════════════════════════════════════
function UserDashboard({ user, alerts }) {
  const [reportForm, setReportForm] = useState({ loc: "", desc: "" });
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState("status");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardSlow, setDashboardSlow] = useState(false);
  const dashboardTimerRef = useRef(null);

  const crit = POLES.filter(p => p.status === "critical").length;
  const warn = POLES.filter(p => p.status === "warning").length;
  const active = alerts.filter(a => a.status !== "Resolved");
  const overall = crit > 0 ? "critical" : warn > 0 ? "warning" : "safe";
  const dashboardEmbedUrl = "https://us1.ca.analytics.ibm.com/bi/?perspective=dashboard&pathRef=.my_folders%2FBI%2B2&closeWindowOnLastView=true&ui_appbar=false&ui_navbar=false&shareMode=embedded&action=view&mode=dashboard&subView=model0000019d5c0ec8b6_00000000&nav_filter=true";

  useEffect(() => {
    if (tab === "dashboard") {
      setDashboardLoading(true);
      setDashboardSlow(false);
      if (dashboardTimerRef.current) clearTimeout(dashboardTimerRef.current);
      dashboardTimerRef.current = setTimeout(() => setDashboardSlow(true), 12000);
    }
    return () => {
      if (dashboardTimerRef.current) {
        clearTimeout(dashboardTimerRef.current);
        dashboardTimerRef.current = null;
      }
    };
  }, [tab]);

  const submitReport = async () => {
    if (!reportForm.loc || !reportForm.desc) return;
    try {
      const newReport = {
        area: POLES.find(p => p.id === reportForm.loc)?.area || reportForm.loc,
        desc: reportForm.desc,
        user: user.name,
        time: new Date().toLocaleString("en-IN"),
      };
      // Send to backend
      await storage.request("/reports", { method: "POST", body: newReport });
      // Update local cache
      const existing = storage.getReports();
      storage.cache.reports = [...existing, { id: Date.now(), ...newReport }];
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit report:", err);
    }
  };

  const tabs = [
    { id: "status", label: "🛡️ SAFETY STATUS" },
    { id: "map", label: "🗺️ RISK MAP" },
    { id: "alerts", label: `🔔 ALERTS (${active.length})` },
    { id: "dashboard", label: "📊 DASHBOARD" },
    { id: "report", label: "📢 REPORT ISSUE" },
  ];

  return (
    <div style={{ padding: "28px 20px", maxWidth: tab === "dashboard" ? 1360 : 1000, margin: "0 auto" }}>
      {/* Hero banner */}
      <div className="fu" style={{ borderRadius: 20, overflow: "hidden", position: "relative", marginBottom: 26, height: 180 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMGS.city})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${C.bg0}f0 30%,${C.bg0}70)` }} />
        <div style={{ position: "relative", zIndex: 2, padding: "32px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.t3, letterSpacing: 2.5, fontFamily: "monospace", marginBottom: 8 }}>WELCOME, {user.name.toUpperCase()}</div>
            <div style={{ fontFamily: "'Exo 2',sans-serif", fontWeight: 900, fontSize: 28, color: C.t1, lineHeight: 1.1 }}>Coimbatore<br />Safety Network</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: C.t2 }}>
              <span className="live" /><span>Live monitoring · {POLES.length} poles · {user.area}</span>
            </div>
          </div>
          <div style={{ textAlign: "center", background: sb(overall), border: `2px solid ${sc(overall)}60`, borderRadius: 18, padding: "20px 32px", backdropFilter: "blur(10px)" }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>{overall === "safe" ? "✅" : overall === "warning" ? "⚠️" : "🔴"}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 900, color: sc(overall) }}>{overall.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: sc(overall) + "bb", fontFamily: "monospace", marginTop: 4, letterSpacing: 1.5 }}>ZONE STATUS</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: C.bg2, borderRadius: 12, padding: 5, marginBottom: 24, width: "fit-content", border: `1px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `linear-gradient(90deg,${C.green},${C.cyan}aa)` : "transparent",
            border: "none", color: tab === t.id ? C.bg0 : C.t2,
            padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 11,
            letterSpacing: 1, fontFamily: "monospace", transition: "all .2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── SAFETY STATUS ── */}
      {tab === "status" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { icon: "⚡", label: "ELECTRICAL SAFETY", val: crit > 0 ? "UNSAFE" : "SAFE", c: crit > 0 ? C.red : C.green },
              { icon: "🌍", label: "EARTHING CONDITION", val: crit > 0 ? "POOR" : warn > 0 ? "FAIR" : "GOOD", c: crit > 0 ? C.red : warn > 0 ? C.amber : C.green },
              { icon: "✋", label: "TOUCH VOLTAGE RISK", val: crit > 0 ? "HIGH" : warn > 0 ? "MEDIUM" : "LOW", c: crit > 0 ? C.red : warn > 0 ? C.amber : C.green },
              { icon: "🚨", label: "ACTIVE ALERTS", val: active.length, c: active.length > 0 ? C.red : C.green },
            ].map((s, i) => (
              <Card key={s.label} className={`fu d${i + 1}`} style={{ borderColor: s.c + "30", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: s.c }}>{s.val}</div>
                <div style={{ fontSize: 9, color: C.t3, marginTop: 6, letterSpacing: 1.5, fontFamily: "monospace" }}>{s.label}</div>
              </Card>
            ))}
          </div>
          {/* Pole list */}
          <Card className="fu">
            <SecTitle>NEARBY POLE SAFETY STATUS</SecTitle>
            {POLES.map(p => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", borderRadius: 12, marginBottom: 10,
                background: sb(p.status), border: `1px solid ${sc(p.status)}28`
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: sc(p.status) + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {p.status === "safe" ? "✅" : p.status === "warning" ? "⚠️" : "🔴"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.t1, fontSize: 14 }}>{p.area}</div>
                    <div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace", marginTop: 2 }}>
                      Pole {p.id} · Touch risk: {p.voltage}V · Last check: {p.lastCheck}
                    </div>
                    {p.status !== "safe" && <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>⚠ {p.cause}</div>}
                  </div>
                </div>
                <Badge s={p.status} />
              </div>
            ))}
          </Card>
          {/* Trust info */}
          <Card className="fu" style={{ marginTop: 20 }}>
            <SecTitle>TRUST & TRANSPARENCY</SecTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["🏛️", "Authority", "TNEB Coimbatore"], ["📋", "Standard", "IS 3043 Compliant"], ["🔄", "Last System Audit", "15 Feb 2026"], ["⚡", "Sensor Refresh", "Every 30 seconds"], ["👷", "Response Team", "24/7 on standby"], ["📞", "Emergency", "1912 (TNEB Helpline)"]].map(([ic, l, v]) => (
                <div key={l} style={{ display: "flex", gap: 10, alignItems: "center", background: C.bg3, borderRadius: 10, padding: "12px 14px" }}>
                  <span style={{ fontSize: 18 }}>{ic}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace" }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── RISK MAP ── */}
      {tab === "map" && (
        <Card className="fu">
          <SecTitle>LOCATION-BASED RISK MAP</SecTitle>
          <PoleMap poles={POLES} h={380} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 18 }}>
            {[["🟢", "Safe Zones", POLES.filter(p => p.status === "safe").map(p => p.area).join(", "), C.green],
              ["🟡", "Caution Areas", POLES.filter(p => p.status === "warning").map(p => p.area).join(", "), C.amber],
              ["🔴", "Danger Zones", POLES.filter(p => p.status === "critical").map(p => p.area).join(", ") || "None", C.red]].map(([ic, l, areas, c]) => (
              <div key={l} style={{ background: c + "0d", border: `1px solid ${c}30`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 6 }}>{ic} {l}</div>
                <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.6 }}>{areas || "None currently"}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, background: C.red + "0f", border: `1px solid ${C.red}30`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontWeight: 700, color: C.red, fontSize: 13, marginBottom: 4 }}>⚠️ Public Safety Advisory</div>
            <div style={{ fontSize: 12, color: C.t2 }}>Do not touch or approach electrical poles. If you notice sparks, unusual sounds, or shock hazards — move away immediately and call <strong style={{ color: C.red }}>1912</strong>.</div>
          </div>
        </Card>
      )}

      {/* ── ALERTS ── */}
      {tab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {active.length === 0
            ? <Card className="fu"><div style={{ textAlign: "center", color: C.green, fontSize: 16, padding: "30px 0", fontWeight: 700 }}>✅ No active alerts in your area!</div></Card>
            : active.map(a => {
                const pole = POLES.find(p => p.id === a.pole);
                return (
                  <div key={a.id} className="hover-card fu" style={{
                    background: `linear-gradient(135deg,${C.bg2},${C.bg1})`,
                    border: `1px solid ${sevc(a.severity)}40`, borderRadius: 16, padding: "20px 24px", transition: "all .2s"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: sevc(a.severity), fontSize: 15, marginBottom: 6 }}>⚠️ {a.fault}</div>
                        <div style={{ fontSize: 13, color: C.t2, marginBottom: 4 }}>📍 Near {pole?.area} — {a.date} at {a.time}</div>
                        <div style={{ fontSize: 12, color: C.t3 }}>
                          {a.severity === "Critical" ? "🚫 DO NOT approach this area. Stay at safe distance." : "⚠ Exercise caution near this location."}
                        </div>
                        {a.status === "Assigned" && <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>🔧 Repair team has been dispatched. Expected resolution soon.</div>}
                      </div>
                      <Badge s={a.severity} />
                    </div>
                  </div>
                );
              })
          }
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>📞 Emergency Contacts</div>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 2 }}>TNEB Emergency: <strong style={{ color: C.red }}>1912</strong> &nbsp;|&nbsp; Police: <strong style={{ color: C.red }}>100</strong> &nbsp;|&nbsp; Fire: <strong style={{ color: C.red }}>101</strong></div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        <Card className="fu" style={{ padding: 10 }}>
          <div style={{ padding: "6px 6px 10px" }}>
            <SecTitle>LIVE ANALYTICS DASHBOARD</SecTitle>
          </div>
          <div style={{
            position: "relative",
            width: "100%",
            minHeight: "70vh",
            height: "calc(100vh - 230px)",
            maxHeight: "980px",
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
            background: C.bg3,
          }}>
            {dashboardLoading && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.t2,
                fontSize: 12,
                letterSpacing: 1,
                fontFamily: "monospace",
                background: `linear-gradient(180deg,${C.bg2},${C.bg1})`,
                zIndex: 1,
              }}>
                Loading dashboard...
              </div>
            )}
            <iframe
              title="IBM Cognos Dashboard"
              src={dashboardEmbedUrl}
              onLoad={() => {
                setDashboardLoading(false);
                setDashboardSlow(false);
                if (dashboardTimerRef.current) {
                  clearTimeout(dashboardTimerRef.current);
                  dashboardTimerRef.current = null;
                }
              }}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                opacity: dashboardLoading ? 0 : 1,
                transition: "opacity .3s ease",
              }}
              loading="eager"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="fullscreen"
              allowFullScreen
            />
          </div>
          {dashboardSlow && (
            <div style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${C.amber}45`,
              background: `${C.amber}12`,
              color: C.t2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 12,
            }}>
              <span>
                Dashboard is taking longer than expected. If it keeps spinning, open it once in a new tab and sign in to Cognos, then return here.
              </span>
              <Btn
                small
                outline
                color={C.amber}
                onClick={() => window.open(dashboardEmbedUrl, "_blank", "noopener,noreferrer")}
              >
                Open Dashboard
              </Btn>
            </div>
          )}
        </Card>
      )}

      {/* ── REPORT ISSUE ── */}
      {tab === "report" && (
        <Card className="fu">
          <SecTitle>REPORT A SAFETY HAZARD</SecTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              {submitted
                ? <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 50, marginBottom: 16 }}>✅</div>
                    <div style={{ fontWeight: 800, color: C.green, fontSize: 18, fontFamily: "'Exo 2',sans-serif" }}>Report Submitted!</div>
                    <div style={{ color: C.t2, fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>TNEB officials have been notified. A technician will be dispatched. Thank you for keeping Coimbatore safe.</div>
                    <Btn color={C.blue} style={{ marginTop: 20 }} onClick={() => { setSubmitted(false); setReportForm({ loc: "", desc: "" }); }}>Submit Another Report</Btn>
                  </div>
                : <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 2, marginBottom: 7, fontFamily: "monospace" }}>SELECT LOCATION *</div>
                      <select value={reportForm.loc} onChange={e => setReportForm(f => ({ ...f, loc: e.target.value }))}
                        style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, color: reportForm.loc ? C.t1 : C.t3, padding: "12px 16px", borderRadius: 10, fontSize: 13 }}>
                        <option value="">Choose pole / area</option>
                        {POLES.map(p => <option key={p.id} value={p.id}>{p.area} (Pole {p.id})</option>)}
                        <option value="other">Other / Unknown location</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: C.t3, letterSpacing: 2, marginBottom: 7, fontFamily: "monospace" }}>DESCRIBE THE ISSUE *</div>
                      <textarea rows={4} value={reportForm.desc} onChange={e => setReportForm(f => ({ ...f, desc: e.target.value }))}
                        placeholder="e.g. Sparks from pole, electric shock felt, cable broken, strange burning smell..."
                        style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border}`, color: C.t1, padding: "12px 16px", borderRadius: 10, fontSize: 13, resize: "vertical" }} />
                    </div>
                    <Btn full color={C.green} onClick={submitReport}>📢 Submit Safety Report</Btn>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 10, textAlign: "center" }}>Your report goes directly to TNEB officials.</div>
                  </>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ borderRadius: 14, overflow: "hidden", height: 160, position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${IMGS.field})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top,${C.bg0}cc,transparent 50%)` }} />
                <div style={{ position: "absolute", bottom: 14, left: 16, color: C.t1, fontWeight: 700, fontSize: 14, fontFamily: "'Exo 2',sans-serif" }}>Field Response Team</div>
              </div>
              <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginBottom: 10 }}>🚨 Emergency Protocol</div>
                {["Move at least 10 meters away from the pole", "Do NOT touch any electrical equipment", "Call TNEB Emergency: 1912", "Call Police if anyone is injured: 100", "Do NOT attempt to repair yourself"].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: C.t2 }}>
                    <span style={{ color: C.red, flexShrink: 0 }}>→</span>{s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(() => {
    // Restore session from localStorage on mount
    try {
      const saved = localStorage.getItem("earthguard_session");
      const token = localStorage.getItem("earthguard_token");
      if (saved && token) {
        const user = JSON.parse(saved);
        storage.setToken(token);
        return user;
      }
    } catch (e) {
      console.error("Could not restore session:", e);
    }
    return null;
  });
  const [alerts, setAlerts] = useState(() => storage.getAlerts());
  const [bootError, setBootError] = useState("");
  const socketRef = useRef(null);
  const [, forceUpdate] = useState({});

  // Bootstrap data when session is restored from localStorage
  useEffect(() => {
    if (session && socketRef.current === null) {
      (async () => {
        try {
          const data = await storage.bootstrap();
          setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
          if (Array.isArray(data.poles) && data.poles.length) {
            POLES = data.poles;
          }
        } catch (e) {
          setBootError(e.message || "Could not load project data from backend.");
        }

        // 🔌 Connect to WebSocket for real-time updates
        const baseURL = API_BASE.replace("/api", "");
        const socket = io(baseURL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        });

        socket.on("connect", () => {
          console.log("✅ Connected to real-time server");
        });

        socket.on("pole-updated", (updatedPole) => {
          console.log("🔄 Pole updated in real-time:", updatedPole);
          const idx = POLES.findIndex(p => p.id === updatedPole.id);
          if (idx >= 0) {
            const merged = { ...POLES[idx], ...updatedPole };
            merged.status = calculatePoleStatus(merged);
            POLES[idx] = merged;
          } else {
            updatedPole.status = calculatePoleStatus(updatedPole);
            POLES.push(updatedPole);
          }
          forceUpdate({});
          storage.hydrate({ poles: POLES });
        });

        socket.on("disconnect", () => {
          console.log("❌ Disconnected from real-time server");
        });

        socket.on("error", (error) => {
          console.error("⚠️ Socket error:", error);
        });

        socketRef.current = socket;
      })();
    }
  }, [session]);

  const handleAuth = useCallback(async (authResult) => {
    storage.setToken(authResult.token);
    // Persist to localStorage
    localStorage.setItem("earthguard_token", authResult.token);
    localStorage.setItem("earthguard_session", JSON.stringify(authResult.user));
    setSession(authResult.user);
    setBootError("");
  }, []);

  const handleLogout = useCallback(() => {
    storage.cancelPendingRequests(); // Cancel all pending requests first
    storage.setToken("");
    setSession(null);
    setBootError(""); // Clear any boot errors
    // Clear localStorage
    localStorage.removeItem("earthguard_token");
    localStorage.removeItem("earthguard_session");

    // 🔌 Disconnect WebSocket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log("🔌 WebSocket disconnected");
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, fontFamily: "'Rajdhani','Segoe UI',sans-serif", color: C.t1 }}>
      <GS />
      {!session
        ? <AuthWrapper onAuth={handleAuth} />
        : <>
            <TopBar user={session} onLogout={handleLogout} />
            {bootError && (
              <div style={{ margin: "14px 28px 0", padding: "10px 12px", borderRadius: 10, background: C.amber + "12", border: `1px solid ${C.amber}45`, color: C.amber, fontSize: 12, fontFamily: "monospace" }}>
                {bootError}
              </div>
            )}
            {session.role === "official" && <OfficialDashboard user={session} alerts={alerts} setAlerts={setAlerts} />}
            {session.role === "technician" && <TechnicianDashboard user={session} alerts={alerts} setAlerts={setAlerts} />}
            {session.role === "user" && <UserDashboard user={session} alerts={alerts} />}
          </>
      }
    </div>
  );
}
