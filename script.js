const categories = [
  "Hull",
  "Navigation",
  "Main Engine",
  "Auxiliary Engine",
  "Other Machinery",
  "Charter-Party Performance",
  "Incidents / Off-hire",
  "Cargo Equipment",
  "Ballast Tanks",
  "MLC",
  "Structure",
  "MARPOL",
  "Emergency Equipment",
  "Documents",
  "Crew",
  "Inspections",
  "Class Conditions",
];

const APP_STATE_KEY = "fleetTechnicalOversightState.v1";
let remoteSaveTimer = null;
let remoteStateAvailable = false;
let currentUser = null;

const reportTemplate = {
  "Hull": [
    { name: "Topside appearance", guidance: "If any dents, provide details.", fields: ["Condition remarks"] },
    { name: "Underwater fouling", guidance: "Report last hull cleaning date and cleaning method/location.", fields: ["Last hull cleaned", "Remarks"] },
    { name: "Propeller fouling", guidance: "Report last propeller cleaning date and cleaning method/location.", fields: ["Last propeller cleaned", "Remarks"] },
  ],
  "Navigation": [
    { name: "Navigation & GMDSS equipment operation", guidance: "Report last navigation audit date and audit type.", fields: ["Last navigation audit", "Audit / visit type"] },
  ],
  "Main Engine": [
    { name: "Main Engine performance at 80% MCR", guidance: "Report last performance test, load percentage, SFOC, SCLOC and speed.", fields: ["Last performance taken", "Load %", "SFOC g/kWh", "SCLOC g/kWh", "Speed knots"] },
    { name: "Main Engine scavenge space", guidance: "Report last scavenge space inspection date.", fields: ["Inspection date", "Findings"] },
    { name: "Main Engine crankcase & camshaft inspection", guidance: "Report crankcase and camshaft inspection dates.", fields: ["Crankcase inspection date", "Camshaft inspection date"] },
    { name: "Main Engine unit overhaul", guidance: "If any unit is overdue, score zero and advise overhaul plan.", fields: ["Units overdue", "Overhaul plan"] },
  ],
  "Auxiliary Engine": [
    { name: "Auxiliary Engine performance at 85% loaded capacity", guidance: "Report each generator performance date and load. Comment if below 85%.", fields: ["AE-1 date/load", "AE-2 date/load", "AE-3 date/load", "AE-4 date/load", "Comments"] },
    { name: "Auxiliary Engine overhaul", guidance: "If any generator overhaul is overdue, score zero and advise plan.", fields: ["Auxiliary engines overdue", "Plan"] },
  ],
  "Other Machinery": [
    { name: "Boiler", guidance: "Report condition and number of tubes plugged.", fields: ["No. of tubes plugged", "Remarks"] },
    { name: "All purifiers operational", guidance: "Report FO and LO purifier inlet temperatures and efficiency test status.", fields: ["FO purifier inlet temp", "LO purifier inlet temp", "Last efficiency test"] },
    { name: "UMS / ERM alarms / trips / safeties", guidance: "Confirm alarms, trips and safeties remain operational.", fields: ["Status", "Deficiencies"] },
    { name: "Fresh Water Generator", guidance: "Report generation per day and rated capacity.", fields: ["Generation per day", "Rated capacity"] },
    { name: "Other critical machinery", guidance: "Include steering gear and other machinery that can affect safe operation.", fields: ["Status", "Deficiencies"] },
    { name: "Critical spares available", guidance: "If 100% available, rating is 10; otherwise score according to shortage risk.", fields: ["Availability %", "Shortages"] },
    { name: "Cleanliness of machinery spaces", guidance: "Report engine room and machinery space cleanliness.", fields: ["Condition remarks"] },
  ],
  "Charter-Party Performance": [
    { name: "Charter-party requirements met during the month", guidance: "Enter voyage analysis with good weather speed/consumption versus CP values.", fields: ["From port", "To port", "Arrival date", "Good wx speed", "Good wx consumption", "CP speed", "CP consumption", "Laden/Ballast", "CP met"] },
  ],
  "Incidents / Off-hire": [
    { name: "Incidents, off-hires and underperformance claims", guidance: "Report date, description, off-hire days, off-hire cost, bunker cost and total owner cost.", fields: ["Date", "Brief description", "Off-hire days", "Off-hire USD", "Bunkers USD", "Total owner cost USD"] },
  ],
  "Cargo Equipment": [
    { name: "Cargo tank condition", guidance: "Report tank condition and any coating/cargo readiness issue.", fields: ["Condition remarks"] },
    { name: "Cargo gear: pumps, pipelines, IG system", guidance: "If any issue exists, advise details and plan.", fields: ["Issue details", "Plan"] },
    { name: "Valve operating & gauging system", guidance: "Report valve remote control, gauging and associated defects.", fields: ["Status", "Defects"] },
  ],
  "Ballast Tanks": [
    { name: "Ballast tank coatings", guidance: "Report coating condition and any upcoming repair requirement.", fields: ["Condition remarks"] },
    { name: "Ballast pumps, piping & BWTS", guidance: "Report ballast system and BWTS operating condition.", fields: ["Status", "Deficiencies"] },
  ],
  "MLC": [
    { name: "Air-conditioning plant", guidance: "Report crew accommodation cooling condition.", fields: ["Status", "Deficiencies"] },
    { name: "Sanitation & sewage plant", guidance: "Report sanitary system and sewage plant condition.", fields: ["Status", "Deficiencies"] },
    { name: "Galley equipment & fridge rooms", guidance: "Report food storage and galley equipment condition.", fields: ["Status", "Deficiencies"] },
    { name: "MLC compliance other items", guidance: "Report any MLC non-compliance or welfare issue.", fields: ["Status", "Deficiencies"] },
  ],
  "Structure": [
    { name: "Loadline items condition", guidance: "Include hatch covers, domes and related loadline items.", fields: ["Condition remarks"] },
    { name: "Windlass and winches", guidance: "Report mooring and anchoring equipment condition.", fields: ["Condition remarks"] },
  ],
  "MARPOL": [
    { name: "OWS / ODME / Incinerator", guidance: "If any deficiency exists, score zero.", fields: ["Deficiencies", "Corrective action"] },
    { name: "Waste generation", guidance: "Report sludge generation as percentage of fuel consumed and average bilge generation per day.", fields: ["Sludge % of fuel", "Average bilge m3/day"] },
    { name: "MARPOL / environmental compliance", guidance: "If any deficiency exists, advise details.", fields: ["Deficiencies", "Corrective action"] },
  ],
  "Emergency Equipment": [
    { name: "Safety equipment in good order", guidance: "If any deficiency exists, advise details.", fields: ["Deficiencies", "Corrective action"] },
    { name: "Crew performance in drills", guidance: "Report drill performance and any training gaps.", fields: ["Drill remarks", "Training gaps"] },
  ],
  "Documents": [
    { name: "Statutory & trade certificates valid", guidance: "If any certificate is expired, score zero and provide comments.", fields: ["Expired certificates", "Renewal plan"] },
    { name: "Planned maintenance up to date", guidance: "Report overdue PMS items on critical machinery as a percentage.", fields: ["Critical PMS overdue %", "Remarks"] },
  ],
  "Crew": [
    { name: "Sufficiency of crew for safe operation", guidance: "Report current crew onboard number, excluding riding squad on technical budget.", fields: ["Crew onboard", "Remarks"] },
  ],
  "Inspections": [
    { name: "External inspections during the month", guidance: "Report date, port, inspection type, deficiencies and delay details.", fields: ["Date", "Port", "Inspection type", "No. of deficiencies", "Details / delay"] },
    { name: "Vetting inspection / RightShip status", guidance: "If any rejection exists, score zero.", fields: ["Status", "Rejection details"] },
    { name: "Internal inspection summary", guidance: "Report last technical superintendent inspection and last internal audit.", fields: ["Last technical superintendent inspection", "Last internal audit", "Findings"] },
  ],
  "Class Conditions": [
    { name: "Conditions of class / memos / flag deficiencies / ISM NCs / PR-17", guidance: "Report issue date, target date, type, description and plan.", fields: ["Issue date", "Target date", "Type", "Description & plan"] },
  ],
};

const vessels = [
  { owner: "SEA TRANSPORT", vessel: "KINGIS", classSociety: "BUREAU VERITAS", flag: "NIGERIA", imo: "9210892", marine: "Capt. Naveen", technical: "Mr. Kishore", electrical: "Mr. Ravindra", purchaser: "Mr. Omkar", manning: "Mr. Ghag" },
  { owner: "SEA TRANSPORT", vessel: "ST ILHAAM", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9278480", marine: "Capt. Ved", technical: "Mr. Sandesh / Mr. Jaskaran", electrical: "Mr. Upendra", purchaser: "Mr. Omkar", manning: "Ms. Rimi" },
  { owner: "SEA TRANSPORT", vessel: "ST ZEE ZEE", classSociety: "BUREAU VERITAS", flag: "NIGERIA", imo: "9241815", marine: "Capt. Ved", technical: "Mr. Kishore", electrical: "Mr. Ravindra", purchaser: "Ms. Nutan", manning: "Ms. Rimi" },
  { owner: "SEA TRANSPORT", vessel: "ST NENNE", classSociety: "BUREAU VERITAS", flag: "NIGERIA", imo: "9271834", marine: "Capt. Gokul", technical: "Mr. Subram", electrical: "Mr. Ravindra", purchaser: "Ms. Nutan", manning: "Mr. Ghag" },
  { owner: "SEA TRANSPORT", vessel: "ST AMRAH", classSociety: "BUREAU VERITAS", flag: "NIGERIA", imo: "9273624", marine: "Capt. Naveen", technical: "Mr. Subram", electrical: "Mr. Ravindra", purchaser: "Ms. Nutan", manning: "Mr. Ghag" },
  { owner: "SEA TRANSPORT", vessel: "ST WALGA", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9286061", marine: "Capt. Ved", technical: "Mr. Sundeep / Mr. Jaskaran", electrical: "Mr. Upendra", purchaser: "Ms. Nutan", manning: "Ms. Rimi" },
  { owner: "SEA TRANSPORT", vessel: "DIDDI", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9247493", marine: "Capt. Gokul", technical: "Mr. Sundeep / Mr. Dhirendra", electrical: "Mr. Upendra", purchaser: "Ms. Nutan", manning: "Mr. Menge" },
  { owner: "SEA TRANSPORT", vessel: "UM BALWA", classSociety: "RINA", flag: "LIBERIA", imo: "9379038", marine: "Capt. Naveen", technical: "Mr. Sundeep / Mr. Dhirendra", electrical: "Mr. Upendra", purchaser: "Ms. Nutan", manning: "Ms. Rimi" },
  { owner: "SEA TRANSPORT", vessel: "AMIF", classSociety: "LLOYD'S REGISTER", flag: "LIBERIA", imo: "9396373", marine: "Capt. Naveen", technical: "Mr. Subram / Mr. Dhirendra", electrical: "Mr. Ravindra", purchaser: "Ms. Nutan", manning: "Ms. Rimi" },
  { owner: "AP MARITIME", vessel: "ASHABI", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9313448", marine: "Capt. Ved", technical: "Mr. Sandesh / Mr. Jaskaran", electrical: "Mr. Upendra", purchaser: "Mr. Omkar", manning: "Mr. Menge" },
  { owner: "AP MARITIME", vessel: "SL AREMU", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9293947", marine: "Capt. Naveen", technical: "Mr. Kishore", electrical: "Mr. Ravindra", purchaser: "Mr. Omkar", manning: "Mr. Menge" },
  { owner: "AP MARITIME", vessel: "MOSUNMOLA", classSociety: "LLOYD'S REGISTER", flag: "NIGERIA", imo: "9312456", marine: "Capt. Ved", technical: "Mr. Dhirendra", electrical: "Mr. Upendra", purchaser: "Mr. Omkar", manning: "Mr. Menge" },
  { owner: "INTERORIENT", vessel: "HW OTTO", classSociety: "RINA", flag: "LIBERIA", imo: "9394040", marine: "Capt. Gokul", technical: "Mr. Roy", electrical: "", purchaser: "", manning: "" },
  { owner: "LSC", vessel: "SV WAKILI", classSociety: "LLOYD'S REGISTER", flag: "LIBERIA", imo: "9590711", marine: "Capt. Gokul", technical: "Mr. Roy", electrical: "", purchaser: "", manning: "" },
];

const seedScores = [8.4, 7.8, 8.1, 6.9, 7.2, 8.6, 7.5, 8.0, 8.7, 7.1, 8.3, 6.8, 8.5, 7.9];

const reports = vessels.map((vessel, index) => {
  const scores = {};
  const parameters = {};
  categories.forEach((category, categoryIndex) => {
    parameters[category] = reportTemplate[category].map((item, itemIndex) => {
      const drift = ((index + categoryIndex + itemIndex) % 5 - 2) * 0.35;
      const score = Math.max(2, Math.min(10, seedScores[index] + drift));
      return {
        ...item,
        score: Number(score.toFixed(1)),
        comment: sampleValue(item, index, itemIndex),
        fieldValues: Object.fromEntries(item.fields.map((field, fieldIndex) => [field, sampleFieldValue(field, index, itemIndex, fieldIndex)])),
      };
    });
    scores[category] = categoryAverage(parameters[category]);
  });

  if (index === 3) parameters["Incidents / Off-hire"][0].score = 4.2;
  if (index === 11) parameters["Main Engine"][0].score = 5.8;
  if (index === 4) parameters["Documents"][0].score = 6.1;
  refreshCategoryScores(scores, parameters);

  return {
    vessel: vessel.vessel,
    period: "May 2026",
    status: index % 4 === 0 ? "Submitted" : index % 3 === 0 ? "Draft" : "Owner Review",
    scores,
    parameters,
    remarks: defaultRemark(vessel.vessel, index),
    openIssues: issueCount(scores),
    targetDate: index % 3 === 0 ? "2026-06-30" : "2026-07-15",
  };
});

let claims = [
  { vessel: "KINGIS", type: "Charterers Recoverable", amount: 12500, target: "2026-06-12", description: "Bunker differential and port delay documents under review." },
  { vessel: "ST NENNE", type: "Insurance Claim", amount: 48000, target: "2026-07-01", description: "Machinery damage claim. Awaiting surveyor final note." },
  { vessel: "MOSUNMOLA", type: "Awaiting Issue", amount: 9500, target: "2026-06-20", description: "Underperformance calculation pending voyage data confirmation." },
];

let drydockPlans = vessels.map((vessel, index) => {
  const baseDue = addDays(new Date("2026-05-22T00:00:00"), 70 + index * 34);
  return {
    vessel: vessel.vessel,
    specialStart: toDateInput(addDays(baseDue, -90)),
    specialEnd: toDateInput(addDays(baseDue, 30)),
    intermediateStart: index % 3 === 0 ? toDateInput(addDays(baseDue, -120)) : "",
    intermediateEnd: index % 3 === 0 ? toDateInput(addDays(baseDue, 20)) : "",
    bottomDue: toDateInput(baseDue),
    prepDays: 30 + (index % 3) * 10,
    projectDays: 15 + (index % 4) * 5,
    charterStart: index % 4 === 0 ? toDateInput(addDays(baseDue, -45)) : "",
    charterEnd: index % 4 === 0 ? toDateInput(addDays(baseDue, -15)) : "",
    notes: index % 4 === 0 ? "Check docking window against charter commitment and owner cost exposure." : "Routine DD planning record created from vessel register.",
  };
});

function loadAppState() {
  try {
    const saved = JSON.parse(localStorage.getItem(APP_STATE_KEY) || "null");
    if (!saved) return;
    if (Array.isArray(saved.reports)) {
      reports.splice(0, reports.length, ...saved.reports);
    }
    if (Array.isArray(saved.claims)) {
      claims = saved.claims;
    }
    if (Array.isArray(saved.drydockPlans)) {
      drydockPlans = saved.drydockPlans;
    }
  } catch (error) {
    console.warn("Unable to load saved offline data", error);
  }
}

function saveAppState() {
  const state = {
    reports,
    claims,
    drydockPlans,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
  queueRemoteSave(state);
}

async function loadRemoteState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return false;
    const saved = await response.json();
    const hasRemoteState = Array.isArray(saved.reports) && Array.isArray(saved.claims) && Array.isArray(saved.drydockPlans);
    if (!hasRemoteState) {
      remoteStateAvailable = true;
      await saveRemoteState({ reports, claims, drydockPlans });
      return true;
    }
    reports.splice(0, reports.length, ...saved.reports);
    claims = saved.claims;
    drydockPlans = saved.drydockPlans;
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(saved));
    remoteStateAvailable = true;
    return true;
  } catch (error) {
    if (String(error.message || "").includes("Sign in required")) {
      remoteStateAvailable = false;
      updateSyncStatus();
      return false;
    }
    console.warn("Remote state unavailable; using local data", error);
    return false;
  }
}

function queueRemoteSave(state) {
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(() => saveRemoteState(state), 500);
}

function updateSyncStatus() {
  const status = document.querySelector("#syncStatus");
  if (!status) return;
  status.textContent = remoteStateAvailable ? "Server sync on" : "Local fallback";
  status.className = `sync-status ${remoteStateAvailable ? "online" : "local"}`;
}

async function saveRemoteState(state = { reports, claims, drydockPlans }) {
  try {
    if (!currentUser) {
      remoteStateAvailable = false;
      updateSyncStatus();
      return false;
    }
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
    remoteStateAvailable = response.ok;
    updateSyncStatus();
    return response.ok;
  } catch (error) {
    remoteStateAvailable = false;
    updateSyncStatus();
    console.warn("Remote save failed; local save remains available", error);
    return false;
  }
}

function registerOfflineSupport() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch((error) => {
    console.warn("Offline support registration failed", error);
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function loadCurrentUser() {
  try {
    const data = await apiRequest("/api/auth/me");
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }
  applyAuthState();
  return currentUser;
}

function applyAuthState() {
  document.body.classList.toggle("requires-login", !currentUser);
  document.body.classList.toggle("is-admin", currentUser?.role === "admin");
  const chip = document.querySelector("#currentUserChip");
  if (chip) {
    chip.textContent = currentUser ? `${currentUser.name} (${currentUser.role.replace("_", " ")})` : "Not signed in";
  }
}

function sampleValue(item, vesselIndex, itemIndex) {
  const samples = {
    "Last hull cleaned": "Last completed during scheduled underwater service.",
    "Last propeller cleaned": "Propeller condition reviewed by diver report.",
    "Last navigation audit": "Marine superintendent visit completed.",
    "Load %": "80%",
    "SFOC g/kWh": "To be entered from sea-trial comparison.",
    "SCLOC g/kWh": "To be entered when performance test is completed.",
    "AE-1 date/load": "Performance taken at 85% load.",
    "From port": "Enter voyage leg details for this month.",
    "Brief description": "No incident reported unless listed here.",
    "Expired certificates": "None reported.",
    "Issue date": "Enter latest issue date if applicable.",
  };
  const firstField = item.fields[0];
  return samples[firstField] || (((vesselIndex + itemIndex) % 4 === 0) ? "Satisfactory. No owner-impacting defect reported." : "");
}

function sampleFieldValue(field, vesselIndex, itemIndex, fieldIndex) {
  const dateFields = ["date", "taken", "cleaned", "audit", "inspection"];
  const numberFields = ["%", "usd", "days", "speed", "consumption", "capacity", "temp", "knots", "g/kwh", "m3"];
  const lower = field.toLowerCase();
  if (dateFields.some((term) => lower.includes(term))) {
    const day = String(5 + ((vesselIndex + itemIndex + fieldIndex) % 20)).padStart(2, "0");
    return `2026-05-${day}`;
  }
  if (lower.includes("load %")) return "85";
  if (lower.includes("sfoc")) return "189.5";
  if (lower.includes("scloc")) return "1.0";
  if (lower.includes("speed")) return "13.0";
  if (lower.includes("crew onboard")) return "21";
  if (lower.includes("deficiencies")) return "0";
  if (numberFields.some((term) => lower.includes(term))) return "0";
  if (lower.includes("status") || lower.includes("condition")) return "Satisfactory";
  return "";
}

function inputTypeForField(field) {
  const lower = field.toLowerCase();
  if (["date", "taken", "cleaned", "audit", "inspection"].some((term) => lower.includes(term))) return 'type="date"';
  if (["%", "usd", "days", "speed", "consumption", "capacity", "temp", "knots", "g/kwh", "m3", "crew onboard"].some((term) => lower.includes(term))) return 'type="number" step="0.01"';
  return 'type="text"';
}

function categoryAverage(items) {
  const scoredItems = items.filter((item) => typeof item.score === "number");
  return Number(average(scoredItems.map((item) => item.score)).toFixed(1));
}

function refreshCategoryScores(scores, parameters) {
  categories.forEach((category) => {
    scores[category] = categoryAverage(parameters[category]);
  });
}

function defaultRemark(vessel, index) {
  const remarks = [
    "All critical equipment operational. Routine PMS items remain within target.",
    "Minor procurement follow-up required for safety stock and deck spares.",
    "Upcoming inspection window requires owner visibility on readiness.",
    "Off-hire exposure requires close monitoring and weekly update.",
  ];
  return `${vessel}: ${remarks[index % remarks.length]}`;
}

function issueCount(scores) {
  return Object.values(scores).filter((score) => score < 7).length;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reportAverage(report) {
  return Number(average(Object.values(report.scores)).toFixed(1));
}

function statusForScore(score) {
  if (score < 7) return { label: "Critical", className: "danger" };
  if (score < 8) return { label: "Watch", className: "warn" };
  return { label: "Healthy", className: "good" };
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toDateInput(date) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function subtractDays(date, days) {
  return addDays(date, -days);
}

function daysBetween(from, to) {
  if (!from || !to) return null;
  const ms = parseDate(toDateInput(to)) - parseDate(toDateInput(from));
  return Math.ceil(ms / 86400000);
}

function minDate(dates) {
  return dates.filter(Boolean).sort((a, b) => a - b)[0] || null;
}

function maxDate(dates) {
  return dates.filter(Boolean).sort((a, b) => b - a)[0] || null;
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function calculateDrydockSchedule(plan) {
  const bottomDue = parseDate(plan.bottomDue);
  const specialStart = parseDate(plan.specialStart);
  const specialEnd = parseDate(plan.specialEnd);
  const intermediateStart = parseDate(plan.intermediateStart);
  const intermediateEnd = parseDate(plan.intermediateEnd);
  const charterStart = parseDate(plan.charterStart);
  const charterEnd = parseDate(plan.charterEnd);
  const prepDays = Number(plan.prepDays || 0);
  const projectDays = Number(plan.projectDays || 0);
  const dockingDays = Math.max(1, projectDays || 14);
  const finalDeadline = minDate([bottomDue, specialEnd, intermediateEnd]);
  const earliestSurveyWindow = maxDate([specialStart, intermediateStart]);
  const latestDockingEnd = finalDeadline;
  let dockingStart = latestDockingEnd ? subtractDays(latestDockingEnd, dockingDays) : null;
  let dockingEnd = latestDockingEnd;

  if (charterStart && charterEnd && dockingStart && dockingEnd && dockingStart <= charterEnd && dockingEnd >= charterStart) {
    const beforeCharterStart = subtractDays(charterStart, dockingDays);
    const afterCharterEnd = addDays(charterEnd, 1);
    const canFitBeforeCharter = beforeCharterStart >= (earliestSurveyWindow || beforeCharterStart);
    const canFitAfterCharter = latestDockingEnd >= addDays(afterCharterEnd, dockingDays);
    if (canFitBeforeCharter) {
      dockingStart = beforeCharterStart;
      dockingEnd = subtractDays(charterStart, 1);
    } else if (canFitAfterCharter) {
      dockingStart = afterCharterEnd;
      dockingEnd = addDays(afterCharterEnd, dockingDays);
    }
  }

  const issues = [];
  if (!bottomDue) issues.push("Bottom survey closing date is required.");
  if (earliestSurveyWindow && dockingStart && dockingStart < earliestSurveyWindow) issues.push("Tentative docking starts before the combined survey window opens.");
  if (finalDeadline && dockingEnd && dockingEnd > finalDeadline) issues.push("Tentative docking completion is after the earliest survey deadline.");
  if (charterStart && charterEnd && dockingStart && dockingEnd && dockingStart <= charterEnd && dockingEnd >= charterStart) issues.push("Tentative docking overlaps with the time charter window.");

  return {
    bottomDue,
    finalDeadline,
    dockingStart,
    dockingEnd,
    preparationStart: dockingStart ? subtractDays(dockingStart, prepDays) : null,
    daysUntilBottomDue: daysBetween(new Date("2026-05-22T00:00:00"), bottomDue),
    notices: [
      { label: "6 months notice", date: bottomDue ? subtractDays(bottomDue, 183) : null },
      { label: "3 months notice", date: bottomDue ? subtractDays(bottomDue, 91) : null },
      { label: "60 days notice", date: bottomDue ? subtractDays(bottomDue, 60) : null },
      { label: "40 days notice", date: bottomDue ? subtractDays(bottomDue, 40) : null },
    ],
    issues,
  };
}

function drydockStatus(schedule) {
  if (schedule.issues.length) return { label: "Review", className: "danger" };
  if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 40) return { label: "40 days notice", className: "danger" };
  if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 91) return { label: "3 months notice", className: "warn" };
  if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 183) return { label: "6 months notice", className: "warn" };
  return { label: "Planned", className: "good" };
}

function predictVesselRisk(vessel) {
  const report = reports.find((item) => item.vessel === vessel.vessel);
  const plan = drydockPlans.find((item) => item.vessel === vessel.vessel);
  const schedule = calculateDrydockSchedule(plan);
  const vesselClaims = claims.filter((claim) => claim.vessel === vessel.vessel);
  const claimExposure = vesselClaims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0);
  const categoryScores = Object.entries(report.scores);
  const avg = reportAverage(report);
  const lowCategories = categoryScores.filter(([, score]) => score < 7);
  const weakCategories = categoryScores.filter(([, score]) => score >= 7 && score < 8);
  const criticalParameters = Object.entries(report.parameters).flatMap(([category, parameters]) =>
    parameters.filter((parameter) => parameter.score < 7).map((parameter) => `${category}: ${parameter.name}`),
  );

  let risk = 100 - avg * 8;
  risk += lowCategories.length * 7;
  risk += weakCategories.length * 2;
  risk += criticalParameters.length * 3;
  risk += Math.min(18, claimExposure / 5000);
  risk += schedule.issues.length * 12;
  if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 40) risk += 18;
  else if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 91) risk += 12;
  else if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 183) risk += 6;
  if (report.status === "Draft") risk += 6;
  risk = Math.max(0, Math.min(100, Math.round(risk)));

  const level = risk >= 70 ? "High" : risk >= 45 ? "Medium" : "Low";
  const className = risk >= 70 ? "danger" : risk >= 45 ? "warn" : "good";
  const drivers = [];
  if (lowCategories.length) drivers.push(`${lowCategories.length} category score${lowCategories.length === 1 ? "" : "s"} below 7`);
  if (criticalParameters.length) drivers.push(`${criticalParameters.length} parameter score${criticalParameters.length === 1 ? "" : "s"} below 7`);
  if (claimExposure) drivers.push(`${money(claimExposure)} claims exposure`);
  if (schedule.issues.length) drivers.push(`${schedule.issues.length} dry dock planning conflict${schedule.issues.length === 1 ? "" : "s"}`);
  if (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 183) drivers.push(`Bottom survey due in ${schedule.daysUntilBottomDue} days`);
  if (report.status === "Draft") drivers.push("Monthly report is still draft");
  if (!drivers.length) drivers.push("No immediate technical or planning pressure detected");

  const recommendations = [];
  if (lowCategories.some(([category]) => ["Main Engine", "Auxiliary Engine", "Other Machinery"].includes(category))) recommendations.push("Request superintendent action plan for machinery-related low scores.");
  if (lowCategories.some(([category]) => ["Documents", "Inspections", "Class Conditions", "MARPOL"].includes(category))) recommendations.push("Escalate compliance review before owner approval.");
  if (claimExposure > 0) recommendations.push("Review recoverability and time-bar dates with operations.");
  if (schedule.issues.length || (schedule.daysUntilBottomDue !== null && schedule.daysUntilBottomDue <= 183)) recommendations.push("Confirm dry dock slot, preparation start date and charter constraints.");
  if (!recommendations.length) recommendations.push("Continue monthly monitoring; no immediate escalation recommended.");

  return {
    vessel: vessel.vessel,
    owner: vessel.owner,
    avg,
    risk,
    level,
    className,
    drivers,
    recommendations,
    claimExposure,
    daysUntilBottomDue: schedule.daysUntilBottomDue,
  };
}

function filteredVessels() {
  const query = document.querySelector("#globalSearch").value.trim().toLowerCase();
  const owner = document.querySelector("#ownerFilter").value;
  return vessels.filter((vessel) => {
    const matchesOwner = owner === "all" || vessel.owner === owner;
    const text = Object.values(vessel).join(" ").toLowerCase();
    return matchesOwner && (!query || text.includes(query));
  });
}

function renderDashboard() {
  const visible = filteredVessels();
  const visibleNames = new Set(visible.map((vessel) => vessel.vessel));
  const visibleReports = reports.filter((report) => visibleNames.has(report.vessel));
  const fleetAverage = visibleReports.length ? average(visibleReports.map(reportAverage)) : 0;
  const exposure = claims.reduce((sum, claim) => sum + Number(claim.amount), 0);

  document.querySelector("#fleetCount").textContent = vessels.length;
  document.querySelector("#avgScore").textContent = fleetAverage.toFixed(1);
  document.querySelector("#criticalCount").textContent = reports.reduce((sum, report) => sum + report.openIssues, 0);
  document.querySelector("#claimsExposure").textContent = money(exposure);

  const rows = visible.map((vessel) => {
    const report = reports.find((item) => item.vessel === vessel.vessel);
    const score = reportAverage(report);
    const status = statusForScore(score);
    return `
      <tr>
        <td><strong>${vessel.vessel}</strong><br><span class="muted">IMO ${vessel.imo}</span></td>
        <td>${vessel.owner}</td>
        <td>${vessel.classSociety}</td>
        <td><span class="score-pill ${status.className}">${score}</span></td>
        <td><span class="status-pill ${status.className}">${status.label}</span></td>
        <td>${report.openIssues}</td>
      </tr>
    `;
  });
  document.querySelector("#fleetTable tbody").innerHTML = rows.join("");

  renderCategoryBars(visibleReports);
  renderPriorityItems();
}

function renderCategoryBars(visibleReports) {
  const bars = categories.map((category) => {
    const score = visibleReports.length ? average(visibleReports.map((report) => report.scores[category])) : 0;
    const status = statusForScore(score);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${category}</span>
          <strong>${score.toFixed(1)}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill ${status.className}" style="width:${score * 10}%"></div></div>
      </div>
    `;
  });
  document.querySelector("#categoryBars").innerHTML = bars.join("");
}

function renderPriorityItems() {
  const items = reports
    .flatMap((report) =>
      Object.entries(report.scores)
        .filter(([, score]) => score < 7)
        .map(([category, score]) => ({ report, category, score })),
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  document.querySelector("#priorityItems").innerHTML = items
    .map(
      (item) => `
        <article class="issue-card">
          <strong>${item.report.vessel} - ${item.category}</strong>
          <p>Score ${item.score}. Target close-out ${item.report.targetDate}. ${item.report.remarks}</p>
        </article>
      `,
    )
    .join("");
}

function renderVesselRegister() {
  const rows = vessels
    .map(
      (vessel) => `
      <tr>
        <td>${vessel.owner}</td>
        <td><strong>${vessel.vessel}</strong></td>
        <td>${vessel.classSociety}</td>
        <td>${vessel.flag}</td>
        <td>${vessel.imo}</td>
        <td>${vessel.marine}</td>
        <td>${vessel.technical}</td>
        <td>${vessel.electrical || "-"}</td>
        <td>${vessel.purchaser || "-"}</td>
        <td>${vessel.manning || "-"}</td>
      </tr>
    `,
    )
    .join("");
  document.querySelector("#vesselRegister tbody").innerHTML = rows;
}

function renderReportEditor() {
  const selected = document.querySelector("#reportVessel").value || vessels[0].vessel;
  const vessel = vessels.find((item) => item.vessel === selected);
  const report = reports.find((item) => item.vessel === selected);

  document.querySelector("#reportMeta").innerHTML = [
    ["Owner", vessel.owner],
    ["Class", vessel.classSociety],
    ["IMO", vessel.imo],
    ["Marine Supt.", vessel.marine],
    ["Technical Supt.", vessel.technical],
    ["Status", report.status],
  ]
    .map(([label, value]) => `<div class="meta-item"><span>${label}</span><strong>${value || "-"}</strong></div>`)
    .join("");

  document.querySelector("#scoreInputs").innerHTML = categories
    .map((category) => {
      const status = statusForScore(report.scores[category]);
      const parameters = report.parameters[category]
        .map(
          (parameter, parameterIndex) => `
            <div class="parameter-row">
              <div class="parameter-copy">
                <strong>${parameter.name}</strong>
                <p>${parameter.guidance}</p>
                <span class="required-values-title">Required values to report</span>
                <div class="field-entry-grid">
                  ${parameter.fields
                    .map(
                      (field) => `
                        <label>
                          <span>${field}</span>
                          <input ${inputTypeForField(field)} value="${parameter.fieldValues[field] ?? ""}" data-param-field="${category}" data-param-index="${parameterIndex}" data-field-name="${field}" />
                        </label>
                      `,
                    )
                    .join("")}
                </div>
                <label class="parameter-comment">
                  <span>Comments / action plan</span>
                  <textarea rows="2" data-param-note="${category}" data-param-index="${parameterIndex}" aria-label="${parameter.name} comments">${parameter.comment}</textarea>
                </label>
              </div>
              <div class="parameter-score">
                <label>
                  <span>Score</span>
                  <strong data-param-score-label="${category}-${parameterIndex}">${parameter.score.toFixed(1)}</strong>
                </label>
                <input type="range" min="0" max="10" step="0.1" value="${parameter.score}" data-param-score="${category}" data-param-index="${parameterIndex}" />
              </div>
            </div>
          `,
        )
        .join("");

      return `
        <article class="category-section">
          <div class="category-header">
            <div>
              <h4>${category}</h4>
              <p>${reportTemplate[category].length} reporting parameter${reportTemplate[category].length === 1 ? "" : "s"}</p>
            </div>
            <span class="score-pill ${status.className}" data-category-score="${category}">${report.scores[category].toFixed(1)}</span>
          </div>
          <div class="parameter-list">${parameters}</div>
        </article>
      `;
    })
    .join("");

  document.querySelector("#reportRemarks").value = report.remarks;
  renderChecklist(report);
}

function renderChecklist(report) {
  const parameterCount = Object.values(report.parameters).flat().length;
  const completedParameterNotes = Object.values(report.parameters)
    .flat()
    .filter((parameter) => parameter.comment.trim().length > 0 || Object.values(parameter.fieldValues).some((value) => String(value).trim().length > 0)).length;
  const checks = [
    ["All category scores completed", Object.keys(report.scores).length === categories.length],
    [`${parameterCount} parameter scores included`, parameterCount > categories.length],
    [`${completedParameterNotes} parameter descriptions entered`, completedParameterNotes >= Math.round(parameterCount * 0.5)],
    ["Critical remarks entered", report.remarks.trim().length > 20],
    ["Low scores identified", report.openIssues === 0 || Object.values(report.scores).some((score) => score < 7)],
    ["Target date assigned", Boolean(report.targetDate)],
    ["Ready for owner review", report.status !== "Draft"],
  ];
  document.querySelector("#reportChecklist").innerHTML = checks
    .map(
      ([label, ok]) => `
        <div class="check-item">
          <strong class="${ok ? "good" : "warn"}">${ok ? "Complete" : "Pending"}</strong>
          <p>${label}</p>
        </div>
      `,
    )
    .join("");
}

function renderClaims() {
  document.querySelector("#claimsList").innerHTML = claims
    .map(
      (claim) => `
        <article class="claim-card">
          <strong>${claim.vessel} - ${claim.type}</strong>
          <p>${money(claim.amount)} | Target ${claim.target || "not set"}</p>
          <p>${claim.description}</p>
        </article>
      `,
    )
    .join("");
}

function renderReviewQueue() {
  const queue = reports.filter((report) => report.status === "Owner Review" || report.openIssues > 0);
  document.querySelector("#reviewQueue").innerHTML = queue
    .map((report) => {
      const score = reportAverage(report);
      const status = statusForScore(score);
      return `
        <article class="review-card">
          <strong>${report.vessel} <span class="score-pill ${status.className}">${score}</span></strong>
          <p>${report.status}. ${report.openIssues} open technical items. ${report.remarks}</p>
        </article>
      `;
    })
    .join("");
}

async function renderUsers() {
  if (currentUser?.role !== "admin") return;
  try {
    const data = await apiRequest("/api/users");
    document.querySelector("#usersList").innerHTML = data.users
      .map(
        (user) => `
          <article class="review-card">
            <strong>${user.name}</strong>
            <p>${user.email}</p>
            <p>Role: ${user.role.replace("_", " ")}</p>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    showToast(error.message);
  }
}

function selectedDrydockPlan() {
  const selected = document.querySelector("#ddVessel").value || vessels[0].vessel;
  return drydockPlans.find((plan) => plan.vessel === selected);
}

function renderDrydock() {
  const schedules = drydockPlans.map((plan) => ({ plan, schedule: calculateDrydockSchedule(plan) }));
  const next = schedules
    .filter((item) => item.schedule.bottomDue)
    .sort((a, b) => a.schedule.bottomDue - b.schedule.bottomDue)[0];

  document.querySelector("#ddPlanCount").textContent = drydockPlans.length;
  document.querySelector("#ddSixMonthCount").textContent = schedules.filter((item) => item.schedule.daysUntilBottomDue !== null && item.schedule.daysUntilBottomDue <= 183).length;
  document.querySelector("#ddReviewCount").textContent = schedules.filter((item) => item.schedule.issues.length).length;
  document.querySelector("#ddNextSurvey").textContent = next ? `${next.plan.vessel}: ${formatDate(next.schedule.bottomDue)}` : "-";

  document.querySelector("#drydockTable tbody").innerHTML = schedules
    .sort((a, b) => (a.schedule.bottomDue || new Date("2999-01-01")) - (b.schedule.bottomDue || new Date("2999-01-01")))
    .map(({ plan, schedule }) => {
      const status = drydockStatus(schedule);
      return `
        <tr>
          <td><strong>${plan.vessel}</strong></td>
          <td>${formatDate(schedule.bottomDue)}</td>
          <td>${schedule.daysUntilBottomDue ?? "N/A"}</td>
          <td>${formatDate(schedule.preparationStart)}</td>
          <td>${formatDate(schedule.dockingStart)} to ${formatDate(schedule.dockingEnd)}</td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");

  renderDrydockEditor();
  renderDrydockNotifications();
}

function renderDrydockEditor() {
  const plan = selectedDrydockPlan();
  if (!plan) return;
  const fields = {
    ddSpecialStart: "specialStart",
    ddSpecialEnd: "specialEnd",
    ddIntermediateStart: "intermediateStart",
    ddIntermediateEnd: "intermediateEnd",
    ddBottomDue: "bottomDue",
    ddPrepDays: "prepDays",
    ddProjectDays: "projectDays",
    ddCharterStart: "charterStart",
    ddCharterEnd: "charterEnd",
    ddNotes: "notes",
  };
  Object.entries(fields).forEach(([id, key]) => {
    document.querySelector(`#${id}`).value = plan[key] ?? "";
  });
  renderDrydockDecision();
}

function renderDrydockDecision() {
  const plan = selectedDrydockPlan();
  if (!plan) return;
  const schedule = calculateDrydockSchedule(plan);
  const issueRows = schedule.issues.length
    ? schedule.issues.map((issue) => `<li><span>${issue}</span><strong>Action needed</strong></li>`).join("")
    : `<li><span>Planning status</span><strong>No conflicts detected</strong></li>`;

  document.querySelector("#ddDecision").innerHTML = `
    <ul>
      <li><span>Bottom survey closes</span><strong>${formatDate(schedule.bottomDue)}</strong></li>
      <li><span>Preparation starts</span><strong>${formatDate(schedule.preparationStart)}</strong></li>
      <li><span>Tentative docking</span><strong>${formatDate(schedule.dockingStart)} to ${formatDate(schedule.dockingEnd)}</strong></li>
      <li><span>Final survey deadline</span><strong>${formatDate(schedule.finalDeadline)}</strong></li>
      ${issueRows}
    </ul>
  `;
}

function renderDrydockNotifications() {
  const dueItems = drydockPlans.flatMap((plan) => {
    const schedule = calculateDrydockSchedule(plan);
    return schedule.notices.map((notice) => ({
      vessel: plan.vessel,
      notice: notice.label,
      date: notice.date,
      dueIn: daysBetween(new Date("2026-05-22T00:00:00"), notice.date),
    }));
  });

  const rows = dueItems
    .filter((item) => item.date && item.dueIn <= 45)
    .sort((a, b) => a.date - b.date)
    .slice(0, 10)
    .map((item) => `<li><span>${item.vessel} - ${item.notice}</span><strong>${formatDate(item.date)}</strong></li>`)
    .join("");

  document.querySelector("#ddNotifications").innerHTML = rows ? `<ul>${rows}</ul>` : "<p>No notification dates due in the next 45 days.</p>";
}

function renderAiReview() {
  const filter = document.querySelector("#aiVesselFilter").value;
  let predictions = vessels.map(predictVesselRisk).sort((a, b) => b.risk - a.risk);
  if (filter === "high") predictions = predictions.filter((item) => item.level === "High");
  if (filter === "medium") predictions = predictions.filter((item) => item.level !== "Low");

  const allPredictions = vessels.map(predictVesselRisk);
  const averageRisk = allPredictions.length ? Math.round(average(allPredictions.map((item) => item.risk))) : 0;
  document.querySelector("#aiHighRisk").textContent = allPredictions.filter((item) => item.level === "High").length;
  document.querySelector("#aiAverageRisk").textContent = `${averageRisk}%`;
  document.querySelector("#aiNearDrydock").textContent = allPredictions.filter((item) => item.daysUntilBottomDue !== null && item.daysUntilBottomDue <= 183).length;
  document.querySelector("#aiClaimsFlagged").textContent = allPredictions.filter((item) => item.claimExposure > 0).length;

  document.querySelector("#aiRiskList").innerHTML = predictions
    .map(
      (item) => `
        <article class="ai-risk-card">
          <div class="ai-risk-heading">
            <div>
              <strong>${item.vessel}</strong>
              <span>${item.owner} | Avg technical score ${item.avg}</span>
            </div>
            <span class="score-pill ${item.className}">${item.risk}% ${item.level}</span>
          </div>
          <div class="risk-meter"><div class="risk-fill ${item.className}" style="width:${item.risk}%"></div></div>
          <div class="ai-card-grid">
            <div>
              <h4>Drivers</h4>
              <ul>${item.drivers.map((driver) => `<li>${driver}</li>`).join("")}</ul>
            </div>
            <div>
              <h4>Recommended Action</h4>
              <ul>${item.recommendations.map((recommendation) => `<li>${recommendation}</li>`).join("")}</ul>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function populateSelects() {
  const owners = [...new Set(vessels.map((vessel) => vessel.owner))];
  document.querySelector("#ownerFilter").innerHTML =
    `<option value="all">All owners</option>` + owners.map((owner) => `<option value="${owner}">${owner}</option>`).join("");

  const vesselOptions = vessels.map((vessel) => `<option value="${vessel.vessel}">${vessel.vessel}</option>`).join("");
  document.querySelector("#reportVessel").innerHTML = vesselOptions;
  document.querySelector("#claimVessel").innerHTML = vesselOptions;
  document.querySelector("#ddVessel").innerHTML = vesselOptions;
}

function setView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  const titles = {
    dashboard: "Fleet Dashboard",
    vessels: "Vessel Register",
    reports: "Monthly Reports",
    claims: "Operations & Claims",
    drydock: "Dry Dock Planner",
    aiReview: "AI Review",
    review: "Owner Review",
    users: "Users",
  };
  document.querySelector("#viewTitle").textContent = titles[viewId];
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.querySelector("#loginEmail").value,
          password: document.querySelector("#loginPassword").value,
        }),
      });
      currentUser = data.user;
      applyAuthState();
      await loadRemoteState();
      renderDashboard();
      renderReportEditor();
      renderClaims();
      renderDrydock();
      renderAiReview();
      renderReviewQueue();
      renderUsers();
      updateSyncStatus();
      showToast("Signed in successfully.");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await apiRequest("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    currentUser = null;
    remoteStateAvailable = false;
    applyAuthState();
    updateSyncStatus();
    showToast("Signed out.");
  });

  document.querySelector("#userForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: document.querySelector("#newUserName").value,
          email: document.querySelector("#newUserEmail").value,
          password: document.querySelector("#newUserPassword").value,
          role: document.querySelector("#newUserRole").value,
        }),
      });
      event.target.reset();
      await renderUsers();
      showToast("User created.");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelector("#globalSearch").addEventListener("input", renderDashboard);
  document.querySelector("#ownerFilter").addEventListener("change", renderDashboard);
  document.querySelector("#reportVessel").addEventListener("change", renderReportEditor);
  document.querySelector("#ddVessel").addEventListener("change", renderDrydockEditor);
  document.querySelector("#aiVesselFilter").addEventListener("change", renderAiReview);

  document.querySelector("#scoreInputs").addEventListener("input", (event) => {
    const selected = document.querySelector("#reportVessel").value;
    const report = reports.find((item) => item.vessel === selected);

    const scoreCategory = event.target.dataset.paramScore;
    if (scoreCategory) {
      const parameterIndex = Number(event.target.dataset.paramIndex);
      report.parameters[scoreCategory][parameterIndex].score = Number(event.target.value);
      refreshCategoryScores(report.scores, report.parameters);
      report.openIssues = issueCount(report.scores);
      const parameterLabel = document.querySelector(`[data-param-score-label="${scoreCategory}-${parameterIndex}"]`);
      const categoryLabel = document.querySelector(`[data-category-score="${scoreCategory}"]`);
      const status = statusForScore(report.scores[scoreCategory]);
      parameterLabel.textContent = Number(event.target.value).toFixed(1);
      categoryLabel.textContent = report.scores[scoreCategory].toFixed(1);
      categoryLabel.className = `score-pill ${status.className}`;
      saveAppState();
      renderChecklist(report);
      renderDashboard();
      renderReviewQueue();
      renderAiReview();
      return;
    }

    const noteCategory = event.target.dataset.paramNote;
    if (noteCategory) {
      const parameterIndex = Number(event.target.dataset.paramIndex);
      report.parameters[noteCategory][parameterIndex].comment = event.target.value;
      saveAppState();
    }

    const fieldCategory = event.target.dataset.paramField;
    if (fieldCategory) {
      const parameterIndex = Number(event.target.dataset.paramIndex);
      const fieldName = event.target.dataset.fieldName;
      report.parameters[fieldCategory][parameterIndex].fieldValues[fieldName] = event.target.value;
      saveAppState();
    }

    renderChecklist(report);
  });

  document.querySelector("#reportRemarks").addEventListener("input", (event) => {
    const selected = document.querySelector("#reportVessel").value;
    const report = reports.find((item) => item.vessel === selected);
    report.remarks = event.target.value;
    saveAppState();
    renderChecklist(report);
  });

  document.querySelector("#saveReport").addEventListener("click", () => {
    saveAppState();
    showToast("Draft report saved locally.");
  });
  document.querySelector("#submitReport").addEventListener("click", () => {
    const selected = document.querySelector("#reportVessel").value;
    const report = reports.find((item) => item.vessel === selected);
    report.status = "Owner Review";
    saveAppState();
    renderReportEditor();
    renderReviewQueue();
    showToast(`${selected} submitted for owner review.`);
  });

  document.querySelector("#addClaim").addEventListener("click", () => {
    claims.unshift({
      vessel: document.querySelector("#claimVessel").value,
      type: document.querySelector("#claimType").value,
      amount: Number(document.querySelector("#claimAmount").value || 0),
      target: document.querySelector("#claimTarget").value,
      description: document.querySelector("#claimDescription").value,
    });
    saveAppState();
    renderClaims();
    renderDashboard();
    renderAiReview();
    showToast("Claim added to operations tracker.");
  });

  document.querySelector("#saveDrydock").addEventListener("click", () => {
    const plan = selectedDrydockPlan();
    if (!plan) return;
    Object.assign(plan, {
      specialStart: document.querySelector("#ddSpecialStart").value,
      specialEnd: document.querySelector("#ddSpecialEnd").value,
      intermediateStart: document.querySelector("#ddIntermediateStart").value,
      intermediateEnd: document.querySelector("#ddIntermediateEnd").value,
      bottomDue: document.querySelector("#ddBottomDue").value,
      prepDays: Number(document.querySelector("#ddPrepDays").value || 0),
      projectDays: Number(document.querySelector("#ddProjectDays").value || 0),
      charterStart: document.querySelector("#ddCharterStart").value,
      charterEnd: document.querySelector("#ddCharterEnd").value,
      notes: document.querySelector("#ddNotes").value,
    });
    saveAppState();
    renderDrydock();
    renderAiReview();
    showToast(`${plan.vessel} dry dock plan saved.`);
  });

  document.querySelector("#newDrydock").addEventListener("click", () => {
    const plan = selectedDrydockPlan();
    if (!plan) return;
    Object.assign(plan, {
      specialStart: "",
      specialEnd: "",
      intermediateStart: "",
      intermediateEnd: "",
      bottomDue: "",
      prepDays: 30,
      projectDays: 15,
      charterStart: "",
      charterEnd: "",
      notes: "",
    });
    saveAppState();
    renderDrydock();
    renderAiReview();
    showToast(`${plan.vessel} planner dates reset.`);
  });

  document.querySelector("#downloadRegister").addEventListener("click", () => {
    const header = ["Owner", "Vessel", "Class", "Flag", "IMO", "Marine Supt.", "Technical Supt.", "Electrical Supt.", "Purchaser", "Manning"];
    const rows = vessels.map((v) => [v.owner, v.vessel, v.classSociety, v.flag, v.imo, v.marine, v.technical, v.electrical, v.purchaser, v.manning]);
    downloadCsv("vessel-register.csv", [header, ...rows]);
  });

  document.querySelector("#downloadDrydock").addEventListener("click", () => {
    const header = ["Vessel", "Bottom Survey Due", "Days Left", "Preparation Starts", "Docking Starts", "Docking Ends", "Status", "Notes"];
    const rows = drydockPlans.map((plan) => {
      const schedule = calculateDrydockSchedule(plan);
      const status = drydockStatus(schedule);
      return [plan.vessel, plan.bottomDue, schedule.daysUntilBottomDue ?? "", toDateInput(schedule.preparationStart), toDateInput(schedule.dockingStart), toDateInput(schedule.dockingEnd), status.label, plan.notes];
    });
    downloadCsv("dry-dock-planner.csv", [header, ...rows]);
  });

  document.querySelector("#exportSummary").addEventListener("click", () => {
    const header = ["Vessel", "Owner", "Average Score", "Open Issues", "Status", "Remarks"];
    const rows = reports.map((report) => {
      const vessel = vessels.find((item) => item.vessel === report.vessel);
      const score = reportAverage(report);
      return [report.vessel, vessel.owner, score, report.openIssues, statusForScore(score).label, report.remarks];
    });
    downloadCsv("owner-fleet-summary.csv", [header, ...rows]);
  });

  document.querySelector("#approveAll").addEventListener("click", () => {
    reports.filter((report) => report.openIssues === 0).forEach((report) => {
      report.status = "Approved";
    });
    saveAppState();
    renderReviewQueue();
    renderReportEditor();
    showToast("Clear reports approved. Reports with open items remain in review.");
  });
}

async function init() {
  loadAppState();
  registerOfflineSupport();
  populateSelects();
  bindEvents();
  await loadCurrentUser();
  if (currentUser) {
    await loadRemoteState();
  }
  renderDashboard();
  renderVesselRegister();
  renderReportEditor();
  renderClaims();
  renderDrydock();
  renderAiReview();
  renderReviewQueue();
  renderUsers();
  updateSyncStatus();
}

init();
