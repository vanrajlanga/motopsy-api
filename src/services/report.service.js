const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const inspectionService = require('./inspection.service');
const Result = require('../utils/result');
const logger = require('../config/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN');
}

function formatRupees(n) {
  if (n == null || n === 0) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function conditionInfo(severityScore, isRedFlag, selectedOption) {
  if (selectedOption == null) return { label: 'N/A', cls: 'cond-na', dot: 'dot-na' };
  if (severityScore == null || severityScore === 0) return { label: 'Normal', cls: 'cond-normal', dot: 'dot-normal' };
  if (isRedFlag && severityScore > 0.5) return { label: 'Critical', cls: 'cond-critical', dot: 'dot-critical' };
  if (severityScore <= 0.25) return { label: 'Minor', cls: 'cond-minor', dot: 'dot-minor' };
  if (severityScore <= 0.55) return { label: 'Moderate', cls: 'cond-moderate', dot: 'dot-moderate' };
  if (severityScore <= 0.80) return { label: 'Major', cls: 'cond-major', dot: 'dot-major' };
  return { label: 'Critical', cls: 'cond-critical', dot: 'dot-critical' };
}

function ratingInfo(rating) {
  if (rating == null) return { bar: 0, barCls: 'bar-poor', pillCls: 'pill-poor', label: 'Poor' };
  const pct = Math.round((rating / 5) * 100);
  if (rating >= 4.5) return { bar: pct, barCls: 'bar-excellent', pillCls: 'pill-excellent', label: 'Excellent' };
  if (rating >= 3.8) return { bar: pct, barCls: 'bar-good',      pillCls: 'pill-good',      label: 'Good' };
  if (rating >= 3.0) return { bar: pct, barCls: 'bar-neutral',   pillCls: 'pill-neutral',   label: 'Neutral' };
  if (rating >= 2.0) return { bar: pct, barCls: 'bar-poor',      pillCls: 'pill-poor',      label: 'Poor' };
  return { bar: pct, barCls: 'bar-critical', pillCls: 'pill-critical', label: 'Critical' };
}

function certBadgeSvg(cert) {
  if (cert === 'Gold') return `<svg viewBox="0 0 24 24" width="64" height="64" fill="#d4a200" stroke="#9a7200" stroke-width="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  if (cert === 'Silver') return `<svg viewBox="0 0 24 24" width="64" height="64" fill="#7a8fa0" stroke="#5a6f80" stroke-width="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  if (cert === 'Verified') return `<svg viewBox="0 0 24 24" width="64" height="64" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#e0f9ff" stroke="#00b7d4" stroke-width="1.5"/><polyline points="9 12 11 14 15 10" stroke="#00b7d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  return `<svg viewBox="0 0 24 24" width="64" height="64" fill="none"><circle cx="12" cy="12" r="10" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" stroke-width="2"/></svg>`;
}

function certColor(cert) {
  if (cert === 'Gold')    return 'var(--gold)';
  if (cert === 'Silver')  return 'var(--silver)';
  if (cert === 'Verified')return 'var(--cyan)';
  return 'var(--danger)';
}

function moduleHeaderColor(modRisk) {
  if (modRisk == null || modRisk <= 0.1) return 'var(--navy)';
  if (modRisk <= 0.3) return 'hsl(217,60%,35%)';
  if (modRisk <= 0.5) return 'hsl(38,80%,38%)';
  if (modRisk <= 0.7) return 'hsl(25,90%,38%)';
  return 'hsl(0,75%,40%)';
}

function getModuleRating(slug, score) {
  if (!score) return null;
  const risk = score.moduleRisks?.[slug];
  if (risk == null) return null;
  return parseFloat(((1 - risk) * 5).toFixed(1));
}

function getModuleRepairCost(slug, score) {
  if (!score) return 0;
  return score.repairCostBreakdown?.[slug]?.repairCost ?? 0;
}

function countModuleIssues(mod) {
  let count = 0;
  for (const sg of mod.subGroups || []) {
    for (const r of sg.responses || []) {
      if (r.selectedOption != null && r.severityScore != null && r.severityScore > 0) count++;
    }
  }
  return count;
}

function photoToDataUrl(storedPath) {
  // storedPath is e.g. "uploads/photo-123.jpeg" relative to the API root
  try {
    if (!storedPath) return null;
    const absPath = path.resolve(__dirname, '../../', storedPath);
    if (!fs.existsSync(absPath)) return null;
    const buf = fs.readFileSync(absPath);
    const ext = path.extname(absPath).slice(1).toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

function selectedOptionText(resp) {
  if (resp.selectedOption == null) return '—';
  const idx = resp.selectedOption - 1;
  return resp.options?.[idx] || `Option ${resp.selectedOption}`;
}

// Maps module emoji icon (stored in DB) → inline SVG path(s)
const MODULE_ICON_SVGS = {
  // 🔧 Engine System — wrench
  '🔧': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  // ⚙️ Transmission & Drivetrain — gear/settings
  '⚙️': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  // 🏗️ Structural Integrity — layers
  '🏗️': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  // 🎨 Paint & Panel — paintbrush/droplet
  '🎨': '<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/>',
  // 🛞 Suspension & Brakes — disc brake / circle
  '🛞': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  // ⚡ Electrical & Electronics — zap
  '⚡': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  // 💺 Interior & Safety — shield with check
  '💺': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  // 📋 Documentation — file-text
  '📋': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  // 🛣️ Road Test — gauge/speedometer
  '🛣️': '<path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 8.93 5.58"/><path d="M12 12h4.42"/>',
};
const DEFAULT_MODULE_ICON_SVG = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';

function getModuleIconSvg(icon, size = 26, stroke = 'rgba(255,255,255,0.85)') {
  const paths = MODULE_ICON_SVGS[icon] || DEFAULT_MODULE_ICON_SVG;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

// ─── CSS (extracted from template) ──────────────────────────────────────────

const CSS = `
  :root {
    --navy: hsl(217,71%,25%); --navy-deep: hsl(217,71%,18%);
    --cyan: hsl(195,100%,42%); --cyan-light: hsl(195,100%,94%);
    --bg: hsl(210,40%,98%); --card: #ffffff;
    --muted: hsl(210,40%,96%); --muted-fg: hsl(215,20%,45%);
    --border: hsl(214,32%,91%); --success: hsl(142,71%,42%);
    --warning: hsl(38,92%,50%); --danger: hsl(0,84%,58%);
    --text: hsl(215,50%,15%);
    --sev-normal: hsl(142,71%,42%); --sev-minor: hsl(217,91%,55%);
    --sev-moderate: hsl(38,92%,50%); --sev-major: hsl(25,95%,53%);
    --sev-critical: hsl(0,84%,58%); --sev-na: hsl(210,15%,58%);
    --gold: hsl(45,100%,48%); --silver: hsl(210,15%,55%); --verified: hsl(195,100%,42%);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 10px; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 1.2rem; color: var(--text); background: white; line-height: 1.5; }
  .page { width: 210mm; min-height: 297mm; background: var(--card); margin: 0 auto; padding: 14mm 16mm; position: relative; overflow: hidden; page-break-after: always; }
  @media print { body { background: white; } .page { margin: 0; box-shadow: none; page-break-after: always; } }
  @page { size: A4; margin: 0; }

  /* page header */
  .page-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid var(--border); margin-bottom: 18px; }
  .logo-wrap { display: flex; align-items: center; gap: 8px; }
  .logo-mark { width: 32px; height: 32px; background: linear-gradient(135deg, var(--navy), var(--cyan)); border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.5rem; font-weight: 900; letter-spacing: -1px; }
  .logo-text { font-size: 1.6rem; font-weight: 900; color: var(--navy); letter-spacing: -0.5px; }
  .logo-text span { color: var(--cyan); }
  .header-tag { font-size: 1rem; color: var(--muted-fg); font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .header-cert-badge { font-size: 0.95rem; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
  .cert-gold { background: hsl(45,100%,92%); color: hsl(45,100%,32%); }
  .cert-silver { background: hsl(210,15%,92%); color: hsl(210,15%,32%); }
  .cert-verified { background: var(--cyan-light); color: hsl(195,100%,25%); }
  .cert-none { background: hsl(0,84%,94%); color: hsl(0,84%,40%); }

  /* cover */
  .cover-page { background: linear-gradient(150deg, hsl(217,71%,18%) 0%, hsl(217,60%,28%) 55%, hsl(195,80%,22%) 100%); color: #fff; padding: 0; display: flex; flex-direction: column; min-height: 297mm; }
  .cover-top { padding: 12mm 16mm 10mm; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .cover-logo-text { color: #fff; }
  .cover-logo-text span { color: hsl(195,100%,60%); }
  .cover-logo-mark { background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); }
  .cover-top-right { text-align: right; }
  .cover-doc-type { font-size: 1rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: hsl(195,100%,65%); }
  .cover-date { font-size: 1.05rem; color: rgba(255,255,255,0.55); margin-top: 3px; }

  .cover-body { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .cover-left { padding: 14mm 10mm 10mm 16mm; display: flex; flex-direction: column; justify-content: center; }
  .cover-right { padding: 14mm 16mm 10mm 10mm; display: flex; flex-direction: column; align-items: stretch; justify-content: center; gap: 14px; }

  .cover-eyebrow { font-size: 0.95rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: hsl(195,100%,65%); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .cover-eyebrow::before { content: ''; display: block; width: 24px; height: 2px; background: hsl(195,100%,60%); border-radius: 2px; }
  .cover-main-title { font-size: 4.8rem; font-weight: 900; line-height: 1.05; letter-spacing: -1px; margin-bottom: 16px; }
  .cover-main-title .t-light { font-weight: 300; opacity: 0.7; }
  .cover-main-title .t-accent { color: hsl(195,100%,60%); }

  .cover-divider { width: 48px; height: 3px; background: hsl(195,100%,55%); border-radius: 2px; margin-bottom: 20px; }

  .cover-plate { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .cover-plate-tag { background: #fff; color: hsl(217,71%,20%); font-size: 1.3rem; font-weight: 900; padding: 4px 14px; border-radius: 6px; letter-spacing: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
  .cover-plate-label { font-size: 0.9rem; opacity: 0.5; margin-left: 4px; }

  .cover-vehicle-name { font-size: 3.2rem; font-weight: 900; line-height: 1.1; margin-bottom: 4px; }
  .cover-vehicle-sub { font-size: 1.2rem; opacity: 0.6; margin-bottom: 24px; letter-spacing: 0.3px; }

  .cover-stats-row { display: flex; gap: 20px; }
  .cover-stat { display: flex; flex-direction: column; }
  .cover-stat .cs-num { font-size: 2rem; font-weight: 900; line-height: 1; color: hsl(195,100%,65%); }
  .cover-stat .cs-lbl { font-size: 0.9rem; opacity: 0.5; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }

  .cover-photo-card { border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); height: 180px; display: flex; align-items: center; justify-content: center; }
  .cover-photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .cover-cert-card { border-radius: 14px; border: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
  .cover-cert-icon { flex-shrink: 0; }
  .cover-cert-info { flex: 1; }
  .cover-cert-label { font-size: 0.85rem; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; opacity: 0.55; margin-bottom: 3px; }
  .cover-cert-level { font-size: 1.8rem; font-weight: 900; line-height: 1; }
  .cover-cert-rating { font-size: 1.1rem; opacity: 0.7; margin-top: 2px; }

  .cover-bottom { background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.08); padding: 10mm 16mm; }
  .cover-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .cover-meta-box { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; }
  .cover-meta-box .cmb-label { font-size: 0.85rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .cover-meta-box .cmb-value { font-size: 1.15rem; font-weight: 700; }

  .cover-footer-bar { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
  .cover-footer-brand { font-size: 1.05rem; font-weight: 800; letter-spacing: -0.3px; }
  .cover-footer-brand span { color: hsl(195,100%,60%); }
  .cover-footer-tagline { font-size: 0.95rem; opacity: 0.4; }
  .cover-footer-cert { font-size: 0.9rem; font-weight: 600; opacity: 0.6; }

  /* toc */
  .toc-item { display: flex; align-items: flex-start; gap: 16px; padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 12px; margin-bottom: 10px; border-left: 4px solid var(--cyan); background: hsl(210,40%,99%); }
  .toc-num { font-size: 2.4rem; font-weight: 900; color: var(--cyan); line-height: 1; min-width: 36px; opacity: 0.3; }
  .toc-content h3 { font-size: 1.3rem; font-weight: 700; color: var(--navy); margin-bottom: 2px; }
  .toc-content p { font-size: 1.05rem; color: var(--muted-fg); }
  .toc-content ul { margin-top: 6px; padding-left: 16px; font-size: 1.05rem; color: var(--muted-fg); }

  /* section */
  .section-title { font-size: 2rem; font-weight: 800; color: var(--navy); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .section-title .icon { width: 32px; height: 32px; background: var(--cyan-light); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: var(--cyan); }
  .section-desc { font-size: 1.15rem; color: var(--muted-fg); margin-bottom: 20px; line-height: 1.6; }

  /* overview */
  .overview-card { border: 1.5px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
  .overview-card-inner { display: grid; grid-template-columns: 1fr 1.1fr; }
  .overview-photo { background: var(--muted); display: flex; align-items: center; justify-content: center; min-height: 160px; height: 160px; font-size: 6rem; color: var(--border); overflow: hidden; }
  .overview-info { padding: 16px; }
  .overview-vehicle-name { font-size: 1.7rem; font-weight: 800; color: var(--navy); }
  .overview-vehicle-sub { font-size: 1.1rem; color: var(--muted-fg); margin-bottom: 10px; }
  .rating-badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .rating-label { font-size: 1rem; color: var(--muted-fg); border: 1px solid var(--border); padding: 3px 8px; border-radius: 6px; }
  .rating-score { font-size: 2rem; font-weight: 900; color: var(--navy); }
  .rating-cert { font-size: 1.5rem; font-weight: 800; }
  .overview-stats { display: flex; gap: 16px; margin-bottom: 10px; }
  .stat-item { font-size: 1.1rem; }
  .stat-item .stat-label { color: var(--muted-fg); font-size: 1rem; }
  .stat-item .stat-val { font-weight: 700; color: var(--navy); }
  .info-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .info-box { border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
  .info-box .ib-icon { width: 36px; display: flex; align-items: center; justify-content: center; color: var(--navy); }
  .info-box .ib-label { font-size: 1rem; color: var(--muted-fg); }
  .info-box .ib-val { font-size: 1.2rem; font-weight: 700; color: var(--navy); }

  /* module health grid */
  .mod-health-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
  .mod-health-item { border: 1.5px solid var(--border); border-radius: 10px; padding: 8px 12px; }
  .mhi-name { font-size: 1rem; font-weight: 600; color: var(--navy); margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mhi-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .mhi-bar { flex: 1; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .mhi-bar-fill { height: 100%; border-radius: 3px; }
  .mhi-score { font-size: 1rem; font-weight: 700; color: var(--navy); min-width: 28px; text-align: right; }
  .mhi-na { font-size: 0.95rem; color: var(--muted-fg); }

  /* summary table */
  .summary-table { width: 100%; border-collapse: collapse; font-size: 1.15rem; margin-bottom: 20px; }
  .summary-table thead tr { background: var(--navy); color: #fff; }
  .summary-table thead th { padding: 10px 14px; text-align: left; font-weight: 700; font-size: 1.1rem; }
  .summary-table tbody tr { border-bottom: 1px solid var(--border); }
  .summary-table tbody tr:nth-child(even) { background: var(--muted); }
  .summary-table tbody td { padding: 10px 14px; vertical-align: middle; }
  .module-name-cell { display: flex; align-items: center; gap: 8px; }
  .mod-icon { width: 30px; height: 30px; background: var(--cyan-light); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }

  /* rating bars */
  .rating-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .rating-bar { flex: 1; height: 7px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .rating-bar-fill { height: 100%; border-radius: 4px; }
  .bar-excellent { background: var(--success); } .bar-good { background: var(--sev-minor); }
  .bar-neutral { background: var(--warning); } .bar-poor { background: var(--sev-major); }
  .bar-critical { background: var(--danger); }
  .rating-pill { font-size: 1.1rem; font-weight: 700; padding: 2px 10px; border-radius: 12px; min-width: 44px; text-align: center; }
  .pill-excellent { background: hsl(142,71%,92%); color: var(--success); }
  .pill-good { background: hsl(217,91%,92%); color: hsl(217,91%,40%); }
  .pill-neutral { background: hsl(38,92%,92%); color: hsl(38,92%,35%); }
  .pill-poor { background: hsl(25,95%,92%); color: hsl(25,95%,40%); }
  .pill-critical { background: hsl(0,84%,92%); color: var(--danger); }

  /* vri */
  .vri-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .vri-box { border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; position: relative; overflow: hidden; }
  .vri-box::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0) 60%, rgba(0,180,220,0.04) 100%); }
  .vri-box .vb-label { font-size: 0.95rem; color: var(--muted-fg); margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .vri-box .vb-val { font-size: 2.2rem; font-weight: 900; color: var(--navy); }
  .vri-box .vb-sub { font-size: 1.05rem; font-weight: 600; margin-top: 2px; }

  /* module header card */
  .module-header-card { display: flex; align-items: center; justify-content: space-between; color: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 14px; position: relative; overflow: hidden; }
  .module-header-card::after { content: ''; position: absolute; right: -20px; top: -20px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.05); }
  .mhc-left h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; position: relative; }
  .mhc-meta { font-size: 1rem; opacity: 0.7; display: flex; flex-wrap: wrap; gap: 10px; position: relative; }
  .mhc-meta .sep { opacity: 0.3; }
  .mhc-icon { width: 52px; height: 52px; background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }

  /* param table */
  .param-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 1.1rem; }
  .param-table thead tr { background: var(--muted); border-bottom: 2px solid var(--border); }
  .param-table thead th { padding: 8px 12px; text-align: left; font-weight: 700; color: var(--muted-fg); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .param-table thead th.center { text-align: center; }
  .param-table tbody tr { border-bottom: 1px solid var(--border); }
  .param-table tbody tr:last-child { border-bottom: none; }
  .param-table tbody td { padding: 9px 12px; vertical-align: middle; }
  .param-num { font-size: 1rem; color: var(--muted-fg); font-weight: 600; white-space: nowrap; }
  .param-name-cell { font-weight: 500; }
  .rf-badge { display: inline-block; font-size: 0.8rem; font-weight: 800; background: hsl(0,84%,94%); color: var(--danger); padding: 1px 5px; border-radius: 3px; margin-left: 5px; }
  .cond-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 1rem; font-weight: 600; white-space: nowrap; }
  .cond-normal { background: hsl(142,71%,92%); color: var(--success); }
  .cond-minor { background: hsl(217,91%,92%); color: hsl(217,91%,40%); }
  .cond-moderate { background: hsl(38,92%,92%); color: hsl(38,92%,35%); }
  .cond-major { background: hsl(25,95%,92%); color: hsl(25,95%,40%); }
  .cond-critical { background: hsl(0,84%,92%); color: var(--danger); }
  .cond-na { background: hsl(210,15%,92%); color: hsl(210,15%,45%); }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .dot-normal { background: var(--success); } .dot-minor { background: hsl(217,91%,55%); }
  .dot-moderate { background: var(--warning); } .dot-major { background: hsl(25,95%,53%); }
  .dot-critical { background: var(--danger); } .dot-na { background: var(--sev-na); }
  .selected-option { font-size: 1.05rem; color: var(--muted-fg); }
  .notes-cell { font-size: 1rem; color: var(--muted-fg); font-style: italic; max-width: 140px; }

  /* repair cost */
  .repair-total-card { background: linear-gradient(135deg, var(--navy) 0%, hsl(195,80%,22%) 100%); color: #fff; border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; position: relative; overflow: hidden; }
  .repair-total-card::after { content: ''; position: absolute; right: -30px; bottom: -30px; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.04); }
  .rtc-left h2 { font-size: 1.9rem; font-weight: 900; }
  .rtc-left p { font-size: 1.1rem; opacity: 0.65; }
  .rtc-right { text-align: right; }
  .rtc-amount { font-size: 2.4rem; font-weight: 900; color: var(--cyan); }
  .rtc-sub { font-size: 1rem; opacity: 0.65; }

  /* legend */
  .legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 14px; background: var(--muted); border-radius: 10px; margin-bottom: 14px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 1rem; color: var(--muted-fg); }

  /* subgroup */
  .subgroup-header { background: var(--muted); padding: 6px 12px; font-size: 1.05rem; font-weight: 700; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.5px; border-radius: 6px; margin: 8px 0 4px; }
  thead { display: table-row-group; }

  /* footer */
  .page-footer { position: absolute; bottom: 10mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; align-items: center; font-size: 1rem; color: var(--muted-fg); border-top: 1px solid var(--border); padding-top: 8px; }
  .page-footer .footer-brand { font-weight: 700; color: var(--navy); }

  /* certificate page */
  .cert-page-inner { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
  .cert-card { width: 100%; border-radius: 20px; padding: 28px 32px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 8px 40px rgba(28,59,84,0.12); }
  .cert-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14rem; font-weight: 900; color: rgba(0,0,0,0.03); white-space: nowrap; pointer-events: none; }
  .cert-badge-big { margin-bottom: 8px; display: flex; justify-content: center; }
  .cert-title { font-size: 2.4rem; font-weight: 900; color: var(--navy); margin-bottom: 4px; letter-spacing: -0.5px; }
  .cert-sub { font-size: 1.3rem; color: var(--muted-fg); margin-bottom: 24px; }
  .cert-number-box { font-size: 1.4rem; font-weight: 700; color: var(--muted-fg); border: 2px dashed; border-radius: 8px; padding: 8px 24px; display: inline-block; margin-bottom: 20px; letter-spacing: 2px; }
  .cert-qr { width: 130px; height: 130px; margin: 0 auto 16px; }
  .cert-qr img { width: 100%; height: 100%; }
  .cert-details-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; text-align: left; }
  .cert-detail-box { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; background: #fff; }
  .cert-detail-box .label { font-size: 1rem; color: var(--muted-fg); }
  .cert-detail-box .value { font-size: 1.2rem; font-weight: 700; color: var(--navy); }

  /* utils */
  .text-navy { color: var(--navy); } .text-cyan { color: var(--cyan); }
  .text-muted { color: var(--muted-fg); } .fw-700 { font-weight: 700; }
  .text-right { text-align: right; } .divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
`;

// ─── Page builders ────────────────────────────────────────────────────────────

function pageHeader(certLabel, certCls) {
  return `
    <div class="page-header">
      <div class="logo-wrap">
        <div class="logo-mark">M</div>
        <div class="logo-text">moto<span>psy</span></div>
      </div>
      <div class="header-tag">
        Vehicle Inspection Report
        ${certLabel ? `<span class="header-cert-badge ${certCls}">${certLabel.toUpperCase()}</span>` : ''}
      </div>
    </div>`;
}

function pageFooter(regNum, vehicleName, certNumber, pageNum) {
  return `
    <div class="page-footer">
      <span class="footer-brand">motopsy</span>
      <span>${regNum} &nbsp;·&nbsp; ${vehicleName}</span>
      <span>Page ${pageNum}</span>
    </div>`;
}

function buildCoverPage(d) {
  const cert = d.score?.certification || '';
  const certColor = cert === 'Gold' ? 'hsl(45,100%,65%)' : cert === 'Silver' ? 'hsl(210,15%,75%)' : cert === 'Verified' ? 'hsl(195,100%,65%)' : 'hsl(0,84%,65%)';
  const certSvgSmall = cert === 'Gold'
    ? `<svg viewBox="0 0 24 24" width="40" height="40" fill="hsl(45,100%,55%)" stroke="hsl(45,80%,40%)" stroke-width="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    : cert === 'Silver'
    ? `<svg viewBox="0 0 24 24" width="40" height="40" fill="hsl(210,15%,70%)" stroke="hsl(210,15%,50%)" stroke-width="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    : cert === 'Verified'
    ? `<svg viewBox="0 0 24 24" width="40" height="40" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" stroke="hsl(195,100%,60%)" stroke-width="1.5"/><polyline points="9 12 11 14 15 10" stroke="hsl(195,100%,60%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
    : `<svg viewBox="0 0 24 24" width="40" height="40" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(239,68,68,0.2)" stroke="hsl(0,84%,65%)" stroke-width="1.5"/><line x1="15" y1="9" x2="9" y2="15" stroke="hsl(0,84%,65%)" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="hsl(0,84%,65%)" stroke-width="2"/></svg>`;

  const vehiclePhotoDataUrl = d.vehiclePhotoPath ? photoToDataUrl(d.vehiclePhotoPath) : null;

  return `
<div class="page cover-page">
  <div class="cover-top">
    <div class="logo-wrap">
      <div class="logo-mark cover-logo-mark">M</div>
      <div class="logo-text cover-logo-text">moto<span>psy</span></div>
    </div>
    <div class="cover-top-right">
      <div class="cover-doc-type">Vehicle Inspection Report</div>
      <div class="cover-date">${formatDate(d.completedAt || d.startedAt)}</div>
    </div>
  </div>

  <div class="cover-body">
    <div class="cover-left">
      <div class="cover-eyebrow">Pre-Delivery Inspection</div>
      <h1 class="cover-main-title"><span class="t-light">Vehicle</span><br><span class="t-accent">Inspection</span><br>Report</h1>
      <div class="cover-divider"></div>
      <div class="cover-plate">
        <span class="cover-plate-tag">${d.vehicleRegNumber}</span>
      </div>
      <div class="cover-vehicle-name">${d.vehicleMake} ${d.vehicleModel}</div>
      <div class="cover-vehicle-sub">${d.vehicleYear} &nbsp;&middot;&nbsp; ${d.transmissionType} &nbsp;&middot;&nbsp; ${d.fuelType}</div>
      <div class="cover-stats-row">
        <div class="cover-stat">
          <span class="cs-num">${d.modules?.length || 0}</span>
          <span class="cs-lbl">Modules</span>
        </div>
        <div class="cover-stat">
          <span class="cs-num">${d.totalApplicableParams}</span>
          <span class="cs-lbl">Parameters</span>
        </div>
        ${d.score ? `<div class="cover-stat"><span class="cs-num">${Number(d.score.rating).toFixed(1)}</span><span class="cs-lbl">Rating</span></div>` : ''}
      </div>
    </div>

    <div class="cover-right">
      <div class="cover-photo-card">
        ${vehiclePhotoDataUrl
          ? `<img src="${vehiclePhotoDataUrl}" alt="Vehicle" />`
          : `<svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`}
      </div>
      ${d.score ? `
      <div class="cover-cert-card">
        <div class="cover-cert-icon">${certSvgSmall}</div>
        <div class="cover-cert-info">
          <div class="cover-cert-label">Certification</div>
          <div class="cover-cert-level" style="color:${certColor};">${cert || 'Uncertified'}</div>
          <div class="cover-cert-rating">${Number(d.score.rating).toFixed(1)} / 5.0 &nbsp;&middot;&nbsp; VRI ${Number(d.score.vri).toFixed(3)}</div>
        </div>
      </div>` : ''}
    </div>
  </div>

  <div class="cover-bottom">
    <div class="cover-meta-grid">
      <div class="cover-meta-box">
        <div class="cmb-label">Inspected On</div>
        <div class="cmb-value">${formatDate(d.completedAt || d.startedAt)}</div>
      </div>
      <div class="cover-meta-box">
        <div class="cmb-label">Odometer</div>
        <div class="cmb-value">${formatNum(d.odometerKm)} km</div>
      </div>
      <div class="cover-meta-box">
        <div class="cmb-label">Location</div>
        <div class="cmb-value">${d.gpsAddress ? d.gpsAddress.split(',').slice(-2).join(',').trim() : '—'}</div>
      </div>
      <div class="cover-meta-box">
        <div class="cmb-label">Est. Repair Cost</div>
        <div class="cmb-value">${d.score ? formatRupees(d.score.totalRepairCost) : '—'}</div>
      </div>
    </div>
    <div class="cover-footer-bar">
      <div class="cover-footer-brand">moto<span>psy</span></div>
      <div class="cover-footer-tagline">Vehicle Intelligence Platform</div>
      <div class="cover-footer-cert">${d.certificate ? `Cert. No. ${d.certificate.certificateNumber}` : 'motopsy.com'}</div>
    </div>
  </div>
</div>`;
}

function buildTocPage(d, pageNum) {
  const cert = d.score?.certification || '';
  const certCls = cert === 'Gold' ? 'cert-gold' : cert === 'Silver' ? 'cert-silver' : cert === 'Verified' ? 'cert-verified' : 'cert-none';

  const modListItems = (d.modules || []).map((m, i) => `<li>${i + 1}. ${m.name}</li>`).join('');

  return `
<div class="page">
  ${pageHeader(cert, certCls)}
  <h2 class="section-title" style="color:var(--cyan);font-size:2.6rem;">Contents of Report</h2>
  <div class="toc-item">
    <div class="toc-num">01</div>
    <div class="toc-content">
      <h3>Report at a Glance</h3>
      <p>Overview of overall vehicle condition, rating and key details</p>
    </div>
  </div>
  <div class="toc-item">
    <div class="toc-num">02</div>
    <div class="toc-content">
      <h3>Inspection Summary</h3>
      <p>Module-wise ratings, VRI score and total estimated repair cost</p>
    </div>
  </div>
  <div class="toc-item">
    <div class="toc-num">03</div>
    <div class="toc-content">
      <h3>Detailed Evaluation — All ${d.modules?.length || 0} Modules</h3>
      <ul>${modListItems}</ul>
    </div>
  </div>
  <div class="toc-item">
    <div class="toc-num">04</div>
    <div class="toc-content">
      <h3>Total Estimated Repair Cost</h3>
      <p>Module-wise repair cost breakdown with total estimate</p>
    </div>
  </div>
  ${d.certificate ? `
  <div class="toc-item">
    <div class="toc-num">05</div>
    <div class="toc-content">
      <h3>Inspection Certificate</h3>
      <p>Motopsy certification with QR code for verification</p>
    </div>
  </div>` : ''}
  ${pageFooter(d.vehicleRegNumber, `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`, d.certificate?.certificateNumber, pageNum)}
</div>`;
}

function buildOverviewPage(d, pageNum, vehiclePhotoDataUrl) {
  const cert = d.score?.certification || '';
  const certCls = cert === 'Gold' ? 'cert-gold' : cert === 'Silver' ? 'cert-silver' : cert === 'Verified' ? 'cert-verified' : 'cert-none';
  const certColorVal = certColor(cert);

  const totalIssues = (d.modules || []).reduce((acc, m) => acc + countModuleIssues(m), 0);

  // Health summary bullets
  const bullets = (d.modules || []).map(m => {
    const issues = countModuleIssues(m);
    if (issues === 0) return `<li>${m.name}: No issues found — in good condition.</li>`;
    return `<li>${m.name}: ${issues} issue${issues > 1 ? 's' : ''} found.</li>`;
  }).join('');

  const overallStatus = cert === 'Gold' ? 'excellent condition' : cert === 'Silver' ? 'good condition' : cert === 'Verified' ? 'fair condition' : 'poor condition — significant repairs needed';

  return `
<div class="page">
  ${pageHeader(cert, certCls)}
  <h2 class="section-title"><span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Report at a Glance</h2>

  <div class="overview-card">
    <div class="overview-card-inner">
      <div class="overview-photo" style="${vehiclePhotoDataUrl ? 'padding:0;' : ''}">
        ${vehiclePhotoDataUrl
          ? `<img src="${vehiclePhotoDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          : '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="hsl(214,32%,80%)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h13l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>'}
      </div>
      <div class="overview-info">
        <div class="overview-vehicle-name">${d.vehicleMake} ${d.vehicleModel}</div>
        <div class="overview-vehicle-sub">${d.vehicleYear} &nbsp;|&nbsp; ${d.transmissionType} &nbsp;|&nbsp; ${d.fuelType}</div>
        ${d.score ? `
        <div class="rating-badge">
          <span class="rating-label">Overall Rating</span>
          <span class="rating-score">${Number(d.score.rating).toFixed(1)}/5</span>
          <span class="rating-cert" style="color:${certColorVal}">${cert}</span>
        </div>` : ''}
        <div class="overview-stats">
          <div class="stat-item">
            <div class="stat-label">Odometer</div>
            <div class="stat-val">${formatNum(d.odometerKm)} km</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Inspected</div>
            <div class="stat-val">${formatDate(d.completedAt || d.startedAt)}</div>
          </div>
          ${d.gpsAddress ? `
          <div class="stat-item">
            <div class="stat-label">Location</div>
            <div class="stat-val">${d.gpsAddress.split(',').slice(-2).join(',').trim()}</div>
          </div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="info-grid-3">
    ${d.score ? `<div class="info-box"><div class="ib-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div><div><div class="ib-label">VRI Score</div><div class="ib-val">${Number(d.score.vri).toFixed(4)}</div></div></div>` : ''}
    <div class="info-box"><div class="ib-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg></div><div><div class="ib-label">Params Checked</div><div class="ib-val">${d.totalAnsweredParams} / ${d.totalApplicableParams}</div></div></div>
    <div class="info-box"><div class="ib-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="ib-label">Issues Found</div><div class="ib-val">${totalIssues}</div></div></div>
  </div>

  <h3 class="section-title" style="font-size:1.5rem;margin-bottom:10px;"><span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span> Module Health</h3>
  <div class="mod-health-grid">
    ${(d.modules || []).map(m => {
      const modRating = getModuleRating(m.slug, d.score);
      const ri = modRating != null ? ratingInfo(modRating) : null;
      return `<div class="mod-health-item">
        <div class="mhi-name">${m.name}</div>
        <div class="mhi-bar-wrap">
          ${ri ? `<div class="mhi-bar"><div class="mhi-bar-fill ${ri.barCls}" style="width:${ri.bar}%;"></div></div><div class="mhi-score">${modRating.toFixed(1)}</div>` : '<div class="mhi-na">Not scored</div>'}
        </div>
      </div>`;
    }).join('')}
  </div>

  <h3 class="section-title" style="font-size:1.5rem;margin-bottom:10px;"><span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Health Summary</h3>
  <div style="border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;font-size:1.15rem;line-height:1.8;color:var(--muted-fg);">
    Motopsy inspected this vehicle across <strong style="color:var(--navy);">${d.modules?.length || 0} modules</strong> and <strong style="color:var(--navy);">${d.totalApplicableParams} parameters</strong>.
    <ul style="padding-left:18px;margin-top:8px;">${bullets}</ul>
    <p style="margin-top:8px;">Overall the vehicle is in <strong style="color:var(--success);">${overallStatus}</strong>.</p>
  </div>

  ${pageFooter(d.vehicleRegNumber, `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`, d.certificate?.certificateNumber, pageNum)}
</div>`;
}

function buildSummaryPage(d, pageNum) {
  const cert = d.score?.certification || '';
  const certCls = cert === 'Gold' ? 'cert-gold' : cert === 'Silver' ? 'cert-silver' : cert === 'Verified' ? 'cert-verified' : 'cert-none';

  const modRows = (d.modules || []).map(m => {
    const modRating = getModuleRating(m.slug, d.score);
    const modCost = getModuleRepairCost(m.slug, d.score);
    const ri = modRating != null ? ratingInfo(modRating) : { bar: 0, barCls: 'bar-poor', pillCls: 'pill-poor' };
    return `
      <tr>
        <td><div class="module-name-cell"><div class="mod-icon">${getModuleIconSvg(m.icon, 16, 'var(--cyan)')}</div> ${m.name}</div></td>
        <td class="text-muted">${m.answeredParams}/${m.totalParams}</td>
        <td>
          <div class="rating-bar-wrap">
            <div class="rating-bar"><div class="rating-bar-fill ${ri.barCls}" style="width:${ri.bar}%"></div></div>
            <span class="rating-pill ${ri.pillCls}">${modRating != null ? modRating.toFixed(1) : '—'}</span>
          </div>
        </td>
        <td class="text-right fw-700 text-navy">${modRating != null ? modRating.toFixed(1) + '/5' : '—'}</td>
        <td class="text-right">${formatRupees(modCost)}</td>
      </tr>`;
  }).join('');

  return `
<div class="page">
  ${pageHeader(cert, certCls)}
  <h2 class="section-title"><span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></span> Inspection Summary</h2>
  <p class="section-desc">Module-wise evaluation across all ${d.modules?.length || 0} inspection categories.</p>

  ${d.score ? `
  <div class="vri-card">
    <div class="vri-box" style="border-color:${certColor(cert)};">
      <div class="vb-label">Overall Rating</div>
      <div class="vb-val">${Number(d.score.rating).toFixed(1)}<span style="font-size:1.3rem;font-weight:500;">/5</span></div>
      <div class="vb-sub" style="color:${certColor(cert)};">${cert}</div>
    </div>
    <div class="vri-box">
      <div class="vb-label">VRI Score</div>
      <div class="vb-val">${Number(d.score.vri).toFixed(4)}</div>
      <div class="vb-sub text-muted">${d.score.vri < 0.2 ? 'Low Risk' : d.score.vri < 0.5 ? 'Medium Risk' : 'High Risk'}</div>
    </div>
    <div class="vri-box">
      <div class="vb-label">Est. Repair Cost</div>
      <div class="vb-val" style="font-size:1.7rem;">${formatRupees(d.score.totalRepairCost)}</div>
      <div class="vb-sub text-muted">${(d.modules || []).reduce((a, m) => a + countModuleIssues(m), 0)} issues found</div>
    </div>
  </div>` : ''}

  <table class="summary-table">
    <thead>
      <tr>
        <th style="width:36%;">Module</th>
        <th style="width:12%;">Params</th>
        <th style="width:26%;">Condition</th>
        <th style="width:13%;text-align:right;">Rating</th>
        <th style="width:13%;text-align:right;">Repair Cost</th>
      </tr>
    </thead>
    <tbody>${modRows}</tbody>
  </table>

  <div class="legend">
    <div class="legend-item"><span class="dot dot-normal"></span> Normal</div>
    <div class="legend-item"><span class="dot dot-minor"></span> Minor</div>
    <div class="legend-item"><span class="dot dot-moderate"></span> Moderate</div>
    <div class="legend-item"><span class="dot dot-major"></span> Major</div>
    <div class="legend-item"><span class="dot dot-critical"></span> Critical</div>
    <div class="legend-item"><span class="dot dot-na"></span> N/A</div>
  </div>

  ${pageFooter(d.vehicleRegNumber, `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`, d.certificate?.certificateNumber, pageNum)}
</div>`;
}

// ─── Subgroup table HTML builder ─────────────────────────────────────────────

function buildSgTableHtml(sgName, rowsHtml) {
  return `
  <div class="subgroup-header">${sgName}</div>
  <table class="param-table">
    <thead>
      <tr>
        <th style="width:8%;">#</th>
        <th style="width:35%;">Parameter</th>
        <th style="width:22%;">Selected Option</th>
        <th style="width:18%;" class="center">Condition</th>
        <th style="width:17%;">Notes</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

// ─── Module pages (JS height-based layout — no CSS page-break hacks) ─────────
//
// Height estimates (px at 96 dpi, html font-size: 10px baseline)
//   A4 inner height: ~1017px  →  minus page-header (~65px) + footer reserve (~32px) = ~920px
//   Conservative budget per page: 840px
//
const MOD_LAYOUT = {
  CONTENT_H:   840,   // usable vertical budget per page
  MOD_HDR_H:    90,   // module-header-card (incl. bottom margin)
  SG_HDR_H:     34,   // subgroup-header bar
  TBL_HDR_H:    32,   // <thead> row
  ROW_H:        36,   // normal param row
  PHOTO_ROW_H: 120,   // photo-evidence row (label + 90 px image + padding)
};

function buildModulePage(d, mod, modIndex, startPageNum) {
  const { CONTENT_H, MOD_HDR_H, SG_HDR_H, TBL_HDR_H, ROW_H, PHOTO_ROW_H } = MOD_LAYOUT;

  const modRating   = getModuleRating(mod.slug, d.score);
  const modCost     = getModuleRepairCost(mod.slug, d.score);
  const modIssues   = countModuleIssues(mod);
  const modRisk     = d.score?.moduleRisks?.[mod.slug];
  const headerBg    = moduleHeaderColor(modRisk);
  const ri          = modRating != null ? ratingInfo(modRating) : null;
  const vehicleName = `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`;
  const certNum     = d.certificate?.certificateNumber;

  const moduleHeaderHtml = `
  <div class="module-header-card" style="background:${headerBg};">
    <div class="mhc-left">
      <h2>${String(modIndex + 1).padStart(2, '0')}. ${mod.name}</h2>
      <div class="mhc-meta">
        <span>${mod.totalParams} parameters checked</span>
        <span class="sep">|</span>
        <span>${modIssues} issue${modIssues !== 1 ? 's' : ''} found</span>
        ${ri ? `<span class="sep">|</span><span>Rating: <strong>${modRating.toFixed(1)} / 5 — ${ri.label}</strong></span>` : ''}
        ${modCost > 0 ? `<span class="sep">|</span><span>Est. Repair: ${formatRupees(modCost)}</span>` : ''}
      </div>
    </div>
    <div class="mhc-icon">${getModuleIconSvg(mod.icon, 26, 'rgba(255,255,255,0.85)')}</div>
  </div>`;

  // ── Pre-build all rows with height estimates ──────────────────────────────
  const subgroups = (mod.subGroups || []).map(sg => {
    const rows = (sg.responses || []).map(resp => {
      const optText = selectedOptionText(resp);
      const cond    = conditionInfo(resp.severityScore, resp.isRedFlag, resp.selectedOption);

      let photoHtml = '';
      let extraH    = 0;
      const photos  = resp.photos || [];
      if (photos.length > 0) {
        const imgs = photos.map(photo => {
          const filename = path.basename(photo.filePath);
          const dataUrl  = photoToDataUrl(`uploads/${filename}`);
          return dataUrl
            ? `<img src="${dataUrl}" style="height:90px;width:auto;max-width:140px;border-radius:6px;border:1.5px solid var(--border);object-fit:cover;" />`
            : '';
        }).filter(Boolean).join('');
        if (imgs) {
          photoHtml = `
        <tr style="background:hsl(210,40%,98.5%);">
          <td style="padding:2px;border-bottom:1px solid var(--border);"></td>
          <td colspan="4" style="padding:6px 12px 10px;border-bottom:1px solid var(--border);">
            <div style="font-size:0.85rem;font-weight:700;color:var(--muted-fg);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Photo Evidence</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${imgs}</div>
          </td>
        </tr>`;
          extraH = PHOTO_ROW_H;
        }
      }

      return {
        height: ROW_H + extraH,
        html: `
        <tr>
          <td class="param-num">${modIndex + 1}.${resp.paramNumber}</td>
          <td class="param-name-cell">
            ${resp.paramName}
            ${resp.isRedFlag ? '<span class="rf-badge">RED FLAG</span>' : ''}
          </td>
          <td class="selected-option">${optText}</td>
          <td style="text-align:center;">
            <span class="cond-badge ${cond.cls}">
              <span class="dot ${cond.dot}"></span>${cond.label}
            </span>
          </td>
          <td class="notes-cell">${resp.notes || '—'}</td>
        </tr>${photoHtml}`
      };
    });
    return { name: sg.name, rows };
  });

  // ── Page layout engine ────────────────────────────────────────────────────
  const renderedPages = [];
  let pageContent = '';
  let remaining   = CONTENT_H - MOD_HDR_H;   // first page: budget minus module header
  let isFirstPage = true;

  const flushPage = () => {
    const pNum = startPageNum + renderedPages.length;
    renderedPages.push(`<div class="page">
  ${pageHeader('', '')}
  ${isFirstPage ? moduleHeaderHtml : ''}
  ${pageContent}
  ${pageFooter(d.vehicleRegNumber, vehicleName, certNum, pNum)}
</div>`);
    pageContent = '';
    isFirstPage = false;
    remaining   = CONTENT_H;
  };

  for (const sg of subgroups) {
    const sgTotalH = SG_HDR_H + TBL_HDR_H + sg.rows.reduce((s, r) => s + r.height, 0);

    if (sgTotalH <= remaining) {
      // Whole subgroup fits on current page
      pageContent += buildSgTableHtml(sg.name, sg.rows.map(r => r.html).join(''));
      remaining   -= sgTotalH;
    } else {
      // Subgroup doesn't fit — check if at least header + 1 row can start here
      const minFit = SG_HDR_H + TBL_HDR_H + (sg.rows[0]?.height || ROW_H);
      if (remaining < minFit) {
        flushPage();
      }

      // Lay rows one by one, spilling to new pages as needed
      remaining -= SG_HDR_H + TBL_HDR_H;   // reserve header + thead on current page
      let currentRows = '';

      for (const row of sg.rows) {
        if (row.height > remaining) {
          // Flush and continue subgroup on new page
          pageContent += buildSgTableHtml(sg.name, currentRows);
          flushPage();
          remaining  -= SG_HDR_H + TBL_HDR_H;  // new page also needs sg header + thead
          currentRows = '';
        }
        currentRows += row.html;
        remaining   -= row.height;
      }

      if (currentRows) {
        pageContent += buildSgTableHtml(sg.name, currentRows);
      }
    }
  }

  // Flush remaining content (or the only page for a small module)
  if (pageContent || renderedPages.length === 0) flushPage();

  return { html: renderedPages.join('\n'), pagesUsed: renderedPages.length };
}

function buildRepairCostPage(d, pageNum) {
  const cert = d.score?.certification || '';
  const totalIssues = (d.modules || []).reduce((a, m) => a + countModuleIssues(m), 0);
  const modulesWithCost = (d.modules || []).filter(m => getModuleRepairCost(m.slug, d.score) > 0);

  const rows = (d.modules || []).map(m => {
    const cost = getModuleRepairCost(m.slug, d.score);
    const issues = countModuleIssues(m);
    const modRisk = d.score?.moduleRisks?.[m.slug];
    const condLabel = modRisk == null ? 'N/A'
      : modRisk <= 0.1 ? 'Normal'
      : modRisk <= 0.3 ? 'Minor'
      : modRisk <= 0.55 ? 'Moderate'
      : modRisk <= 0.8 ? 'Major'
      : 'Critical';
    const condCls = modRisk == null ? 'cond-na'
      : modRisk <= 0.1 ? 'cond-normal'
      : modRisk <= 0.3 ? 'cond-minor'
      : modRisk <= 0.55 ? 'cond-moderate'
      : modRisk <= 0.8 ? 'cond-major'
      : 'cond-critical';
    return `
      <tr>
        <td><div class="module-name-cell"><div class="mod-icon">${getModuleIconSvg(m.icon, 16, 'var(--cyan)')}</div> ${m.name}</div></td>
        <td style="text-align:center;color:${issues > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700;">${issues}</td>
        <td style="text-align:center;"><span class="cond-badge ${condCls}">${condLabel}</span></td>
        <td style="text-align:right;font-weight:700;">${formatRupees(cost)}</td>
      </tr>`;
  }).join('');

  return `
<div class="page">
  ${pageHeader('', '')}
  <h2 class="section-title"><span class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></span> Total Estimated Repair Cost</h2>
  <p class="section-desc">A rough estimate of the cost required to fix identified issues in the vehicle.</p>

  ${d.score ? `
  <div class="repair-total-card">
    <div class="rtc-left">
      <h2>Total Estimated Repair Cost</h2>
      <p>${totalIssues} issues found across ${modulesWithCost.length} module${modulesWithCost.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="rtc-right">
      <div class="rtc-amount">${formatRupees(d.score.totalRepairCost)}</div>
      <div class="rtc-sub">Approximate estimate</div>
    </div>
  </div>` : ''}

  <table class="summary-table">
    <thead>
      <tr>
        <th>Module</th>
        <th style="text-align:center;">Issues Found</th>
        <th style="text-align:center;">Severity</th>
        <th style="text-align:right;">Est. Repair Cost</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${pageFooter(d.vehicleRegNumber, `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`, d.certificate?.certificateNumber, pageNum)}
</div>`;
}

async function buildCertificatePage(d, pageNum) {
  if (!d.certificate) return '';
  const cert = d.certificate;
  const score = d.score;
  const certLevel = cert.certification || score?.certification || 'Verified';
  const borderColor = certColor(certLevel);

  // Generate QR code as data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(cert.qrCodeData, {
      width: 130, margin: 1,
      color: { dark: '#1c3b54', light: '#ffffff' }
    });
  } catch (e) { /* no QR if fails */ }

  return `
<div class="page">
  ${pageHeader('', '')}
  <div class="cert-page-inner">
    <div class="cert-card" style="border: 3px solid ${borderColor}; background: linear-gradient(150deg, hsl(217,71%,98%) 0%, #ffffff 50%, hsl(195,100%,98%) 100%); box-shadow: inset 0 0 80px rgba(0,180,220,0.03);">
      <div class="cert-watermark">${certLevel.toUpperCase()}</div>
      <div class="cert-badge-big">${certBadgeSvg(certLevel)}</div>
      <div class="cert-title">Motopsy ${certLevel} Certificate</div>
      <div class="cert-sub">This vehicle has been inspected and certified by Motopsy</div>
      <div style="margin-bottom:16px;">
        <span style="font-size:2rem;font-weight:900;color:var(--navy);">${d.vehicleMake} ${d.vehicleModel}</span><br>
        <span style="font-size:1.2rem;color:var(--muted-fg);">${d.vehicleYear} &nbsp;·&nbsp; ${d.transmissionType} &nbsp;·&nbsp; ${d.fuelType}</span>
      </div>
      <div class="cert-number-box" style="border-color:${borderColor};">${cert.certificateNumber}</div>
      ${qrDataUrl ? `
      <div class="cert-qr">
        <img src="${qrDataUrl}" alt="QR Code" />
      </div>` : ''}
      <div style="font-size:1.05rem;color:var(--muted-fg);margin-bottom:20px;">
        Scan to verify this certificate at <strong style="color:var(--navy);">motopsy.com/verify/${cert.certificateNumber}</strong>
      </div>
      <div class="cert-details-row">
        <div class="cert-detail-box">
          <div class="label">Overall Rating</div>
          <div class="value" style="color:${borderColor};">${Number(cert.rating).toFixed(1)} / 5 — ${certLevel}</div>
        </div>
        ${score ? `
        <div class="cert-detail-box">
          <div class="label">VRI Score</div>
          <div class="value">${Number(score.vri).toFixed(4)}</div>
        </div>` : ''}
        <div class="cert-detail-box">
          <div class="label">Issued Date</div>
          <div class="value">${formatDate(cert.issuedAt)}</div>
        </div>
        <div class="cert-detail-box">
          <div class="label">Valid Until</div>
          <div class="value">${formatDate(cert.expiresAt)}</div>
        </div>
        <div class="cert-detail-box">
          <div class="label">Location</div>
          <div class="value">${d.gpsAddress ? d.gpsAddress.split(',').slice(-2).join(',').trim() : '—'}</div>
        </div>
      </div>
    </div>
  </div>
  ${pageFooter(d.vehicleRegNumber, `${d.vehicleMake} ${d.vehicleModel} ${d.vehicleYear}`, cert.certificateNumber, pageNum)}
</div>`;
}

// ─── Main HTML builder ────────────────────────────────────────────────────────

async function buildHtml(d) {
  let pageNum = 1;
  const pages = [];

  const vehiclePhotoDataUrl = photoToDataUrl(d.vehiclePhotoPath);

  pages.push(buildCoverPage(d));                                            // Page 1: Cover
  pages.push(buildTocPage(d, ++pageNum));                                   // Page 2: TOC
  pages.push(buildOverviewPage(d, ++pageNum, vehiclePhotoDataUrl));         // Page 3: At a Glance
  pages.push(buildSummaryPage(d, ++pageNum));               // Page 4: Summary
  for (let i = 0; i < (d.modules || []).length; i++) {
    const result = buildModulePage(d, d.modules[i], i, ++pageNum);
    pages.push(result.html);
    pageNum += result.pagesUsed - 1;  // advance counter for extra pages this module used
  }
  pages.push(buildRepairCostPage(d, ++pageNum));            // Repair Cost
  if (d.certificate) {
    pages.push(await buildCertificatePage(d, ++pageNum));   // Certificate
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Motopsy Inspection Report — ${d.vehicleRegNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

// ─── PDF generation ────────────────────────────────────────────────────────────

class ReportService {
  async generate(inspectionId) {
    try {
      const result = await inspectionService.getById(inspectionId);
      if (!result.isSuccess) return Result.failure(result.error);
      const data = result.value;

      const html = await buildHtml(data);

      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfUint8 = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        const pdfBuffer = Buffer.from(pdfUint8);
        return Result.success({ buffer: pdfBuffer, filename: `Motopsy_Report_${data.vehicleRegNumber}_${Date.now()}.pdf` });
      } finally {
        await browser.close();
      }
    } catch (error) {
      logger.error('Report generate error:', error);
      return Result.failure(error.message || 'Failed to generate report');
    }
  }
}

module.exports = new ReportService();
