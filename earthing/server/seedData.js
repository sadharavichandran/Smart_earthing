const DEFAULT_THRESHOLDS = {
  leakage: "15 mA",
  resistance: "5 ohm",
  voltage: "40 V",
  moisture: "15%",
  temp: "35C",
};

const POLES = [
  { id: "P101", area: "Bus Stand", status: "critical", leakage: 42, resistance: 18.4, continuity: "Broken", voltage: 92, moisture: 8, temp: 38, lastCheck: "2 days ago", cause: "Corroded earth rod", history: ["Fault reported 3 weeks ago", "Partial repair Dec 2025"] },
  { id: "P102", area: "Market Road", status: "warning", leakage: 19, resistance: 9.1, continuity: "Weak", voltage: 54, moisture: 14, temp: 35, lastCheck: "Yesterday", cause: "Loose conductor", history: ["Inspected Jan 2026"] },
  { id: "P103", area: "Hospital Zone", status: "safe", leakage: 4, resistance: 3.2, continuity: "Good", voltage: 12, moisture: 22, temp: 32, lastCheck: "Today", cause: null, history: ["Maintained Nov 2025", "OK"] },
  { id: "P104", area: "School Area", status: "safe", leakage: 6, resistance: 4.5, continuity: "Good", voltage: 15, moisture: 20, temp: 31, lastCheck: "Today", cause: null, history: ["OK"] },
  { id: "P105", area: "Railway Gate", status: "warning", leakage: 22, resistance: 8.7, continuity: "Weak", voltage: 61, moisture: 11, temp: 36, lastCheck: "3 days ago", cause: "Moisture depletion", history: ["Flagged Jan 2026"] },
  { id: "P106", area: "Park Entrance", status: "safe", leakage: 3, resistance: 2.9, continuity: "Good", voltage: 9, moisture: 28, temp: 30, lastCheck: "Today", cause: null, history: ["OK"] },
];

const INIT_ALERTS = [
  { id: 1, pole: "P101", fault: "High Touch Voltage (92V)", severity: "Critical", time: "10:15 AM", date: "19 Feb", status: "Open", tech: "", notes: "", material: "", image: null, completedAt: null, priority: 1 },
  { id: 2, pole: "P101", fault: "Earth Resistance 18.4 ohm (> 5 ohm limit)", severity: "Critical", time: "10:16 AM", date: "19 Feb", status: "Open", tech: "", notes: "", material: "", image: null, completedAt: null, priority: 1 },
  { id: 3, pole: "P102", fault: "Continuity Weak - conductor loose", severity: "Warning", time: "09:42 AM", date: "19 Feb", status: "Assigned", tech: "", notes: "", material: "", image: null, completedAt: null, priority: 2 },
  { id: 4, pole: "P105", fault: "Leakage Current 22mA (>15mA)", severity: "Warning", time: "08:30 AM", date: "19 Feb", status: "Assigned", tech: "", notes: "", material: "", image: null, completedAt: null, priority: 2 },
  { id: 5, pole: "P103", fault: "Soil Moisture Low (8%)", severity: "Info", time: "07:00 AM", date: "19 Feb", status: "Resolved", tech: "", notes: "Earthing compound applied", material: "", image: null, completedAt: null, priority: 3 },
];

module.exports = {
  DEFAULT_THRESHOLDS,
  POLES,
  INIT_ALERTS,
};
