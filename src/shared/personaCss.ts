import type { PersonaId } from "@/shared/types";

/* ─────────────────────────────────────────────────────────────────
   Override CSS custom properties used by popular frameworks so their
   components automatically pick up the accessibility color scheme.
   Bootstrap, Tailwind, Material UI, Ant Design, Chakra, Mantine…
   all leak at least some of these variables.
───────────────────────────────────────────────────────────────── */
const ELDERLY_VARS = `
:root {
  color-scheme: light !important;
  /* Generic semantic tokens */
  --background: #f8f7f5 !important;
  --background-color: #f8f7f5 !important;
  --surface: #ffffff !important;
  --foreground: #1a1814 !important;
  --text-color: #1a1814 !important;
  --primary: #1d4ed8 !important;
  --primary-color: #1d4ed8 !important;
  --accent-color: #1d4ed8 !important;
  --link-color: #1d4ed8 !important;
  /* Bootstrap 5 */
  --bs-body-bg: #f8f7f5 !important;
  --bs-body-color: #1a1814 !important;
  --bs-primary: #1d4ed8 !important;
  --bs-primary-rgb: 29,78,216 !important;
  --bs-link-color: #1d4ed8 !important;
  --bs-border-radius: 10px !important;
  /* Tailwind */
  --tw-bg-opacity: 1 !important;
  /* Material UI / MUI */
  --mui-palette-primary-main: #1d4ed8 !important;
  --mui-palette-background-default: #f8f7f5 !important;
  --mui-palette-text-primary: #1a1814 !important;
}`;

const FIRST_TIME_VARS = `
:root {
  color-scheme: light !important;
  --background: #f0fdf4 !important;
  --background-color: #f0fdf4 !important;
  --surface: #ffffff !important;
  --foreground: #1a1a1a !important;
  --text-color: #1a1a1a !important;
  --primary: #059669 !important;
  --primary-color: #059669 !important;
  --accent-color: #059669 !important;
  --link-color: #059669 !important;
  --bs-body-bg: #f0fdf4 !important;
  --bs-body-color: #1a1a1a !important;
  --bs-primary: #059669 !important;
  --bs-primary-rgb: 5,150,105 !important;
  --bs-link-color: #059669 !important;
  --bs-border-radius: 10px !important;
  --mui-palette-primary-main: #059669 !important;
  --mui-palette-background-default: #f0fdf4 !important;
  --mui-palette-text-primary: #1a1a1a !important;
}`;

const ELDERLY_CSS = `
${ELDERLY_VARS}

/* ── Page chrome ─────────────────────────────────────────── */
html,
html body {
  background-color: #f8f7f5 !important;
  color: #1a1814 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
  line-height: 1.85 !important;
  font-size: 18px !important;
}

/* ── Framework roots ─────────────────────────────────────── */
html body #root,
html body #app,
html body #__next,
html body #__nuxt,
html body #app-root,
html body #main-app {
  background-color: #f8f7f5 !important;
}

/* ── Semantic text only (NOT div/span — those break layouts) */
html body p,
html body li,
html body td,
html body th,
html body label,
html body blockquote,
html body figcaption {
  font-size: max(18px, 1rem) !important;
  line-height: 1.85 !important;
  color: #1a1814 !important;
}

html body h1 { font-size: 2.1rem !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1.2 !important; }
html body h2 { font-size: 1.7rem !important; font-weight: 700 !important; color: #0f172a !important; }
html body h3 { font-size: 1.4rem !important; font-weight: 700 !important; color: #0f172a !important; }
html body h4, html body h5, html body h6 { font-size: 1.15rem !important; font-weight: 600 !important; color: #0f172a !important; }

html body a { color: #1d4ed8 !important; text-decoration: underline !important; text-underline-offset: 4px !important; }
html body a:hover { color: #1e40af !important; }
html body a:visited { color: #6d28d9 !important; }

/* ── Buttons ─────────────────────────────────────────────── */
html body button,
html body [role="button"],
html body input[type="submit"],
html body input[type="button"],
html body input[type="reset"],
html body a.btn,
html body a.button {
  min-height: 52px !important;
  padding: 12px 24px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  letter-spacing: 0.01em !important;
  border-width: 2px !important;
  border-style: solid !important;
}

html body button[type="submit"],
html body input[type="submit"],
html body [class*="btn-primary"],
html body [class*="button-primary"],
html body [class*="btn-main"],
html body [class*="submit-btn"],
html body [class*="cta-btn"] {
  background-color: #1d4ed8 !important;
  color: #ffffff !important;
  border-color: #1e40af !important;
  font-size: 18px !important;
  min-height: 58px !important;
  padding: 16px 36px !important;
  box-shadow: 0 4px 20px rgba(29,78,216,0.38) !important;
}

/* ── Inputs ──────────────────────────────────────────────── */
html body input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
html body textarea,
html body select {
  min-height: 52px !important;
  padding: 12px 16px !important;
  font-size: 17px !important;
  border: 2.5px solid #94a3b8 !important;
  border-radius: 8px !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  line-height: 1.5 !important;
}

html body input:focus,
html body textarea:focus,
html body select:focus {
  border-color: #1d4ed8 !important;
  outline: 3px solid rgba(29,78,216,0.28) !important;
  outline-offset: 2px !important;
}

html body input[type="checkbox"],
html body input[type="radio"] {
  width: 20px !important;
  height: 20px !important;
  accent-color: #1d4ed8 !important;
  cursor: pointer !important;
}

html body label {
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  display: block !important;
  margin-bottom: 6px !important;
}

/* ── Navigation ──────────────────────────────────────────── */
html body nav,
html body [role="navigation"],
html body header {
  background-color: #1e293b !important;
}

html body nav a,
html body [role="navigation"] a,
html body header nav a,
html body header a {
  color: #e2e8f0 !important;
  font-size: 16px !important;
  padding: 10px 14px !important;
  text-decoration: none !important;
}

html body nav a:hover,
html body header nav a:hover {
  color: #7dd3fc !important;
}

/* ── Main content ────────────────────────────────────────── */
html body main,
html body [role="main"],
html body #main,
html body #content,
html body .main-content {
  background-color: #ffffff !important;
  padding: 32px !important;
  border-radius: 14px !important;
  max-width: 900px !important;
  margin: 20px auto !important;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06) !important;
}

/* ── Cards ───────────────────────────────────────────────── */
html body [class*="card"],
html body [class*="panel"],
html body article {
  background-color: #ffffff !important;
  border: 2px solid #e2e8f0 !important;
  border-radius: 12px !important;
  padding: 20px !important;
}

/* ── Tables ──────────────────────────────────────────────── */
html body table { border-collapse: collapse !important; width: 100% !important; }
html body td, html body th { padding: 14px 18px !important; border: 2px solid #e2e8f0 !important; font-size: 17px !important; }
html body th { background-color: #f1f5f9 !important; font-weight: 700 !important; color: #0f172a !important; }
html body tr:nth-child(even) { background-color: #f8fafc !important; }

/* ── Scrollbar ───────────────────────────────────────────── */
::-webkit-scrollbar { width: 18px !important; }
::-webkit-scrollbar-thumb { background: #94a3b8 !important; border-radius: 9px !important; border: 4px solid #f8f7f5 !important; }
::-webkit-scrollbar-track { background: #f1f5f9 !important; }

/* ── Hide clutter ────────────────────────────────────────── */
html body [class*="cookie-banner"],
html body [id*="cookie-banner"],
html body [class*="cookie-consent"],
html body [id*="cookie-consent"],
html body [class*="cookie-notice"],
html body [id*="cookie-notice"],
html body [class*="gdpr-banner"],
html body [id*="gdpr"],
html body [class*="consent-banner"],
html body [class*="ad-unit"],
html body [id*="ad-unit"],
html body [class*="newsletter-popup"],
html body [class*="subscribe-popup"],
html body [class*="popup-overlay"],
html body [class*="chat-bubble"],
html body [id*="chat-widget"],
html body [class*="intercom-"],
html body [class*="zendesk"],
html body [class*="notification-bar"]:not([role="alert"]),
html body [class*="promo-banner"] {
  display: none !important;
}
`;

const FIRST_TIME_CSS = `
${FIRST_TIME_VARS}

/* ── Page chrome ─────────────────────────────────────────── */
html,
html body {
  background-color: #f0fdf4 !important;
  color: #1a1a1a !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
  line-height: 1.8 !important;
  font-size: 17px !important;
}

/* ── Framework roots ─────────────────────────────────────── */
html body #root,
html body #app,
html body #__next,
html body #__nuxt,
html body #app-root,
html body #main-app {
  background-color: #f0fdf4 !important;
}

/* ── Semantic text only (NOT div/span — those break layouts) */
html body p,
html body li,
html body td,
html body th,
html body label,
html body blockquote {
  font-size: max(17px, 1rem) !important;
  line-height: 1.8 !important;
  color: #1a1a1a !important;
}

html body h1 { font-size: 1.95rem !important; font-weight: 800 !important; color: #14532d !important; }
html body h2 { font-size: 1.6rem !important; font-weight: 700 !important; color: #166534 !important; }
html body h3 { font-size: 1.3rem !important; font-weight: 700 !important; color: #166534 !important; }
html body h4, html body h5, html body h6 { font-size: 1.1rem !important; font-weight: 600 !important; color: #1a1a1a !important; }

html body a { color: #059669 !important; text-decoration: underline !important; text-underline-offset: 3px !important; }
html body a:hover { color: #047857 !important; }

/* ── Buttons ─────────────────────────────────────────────── */
html body button,
html body [role="button"],
html body input[type="submit"],
html body input[type="button"],
html body input[type="reset"],
html body a.btn,
html body a.button {
  min-height: 50px !important;
  padding: 12px 24px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  border: 2px solid #86efac !important;
  background-color: #dcfce7 !important;
  color: #14532d !important;
}

html body button[type="submit"],
html body input[type="submit"],
html body [class*="btn-primary"],
html body [class*="button-primary"],
html body [class*="btn-main"],
html body [class*="cta-btn"],
html body [class*="get-started"],
html body [class*="sign-up"] {
  background-color: #059669 !important;
  color: #ffffff !important;
  border-color: #047857 !important;
  font-size: 18px !important;
  font-weight: 800 !important;
  min-height: 58px !important;
  padding: 16px 36px !important;
  box-shadow: 0 4px 20px rgba(5,150,105,0.4) !important;
  border-radius: 12px !important;
}

/* ── Inputs ──────────────────────────────────────────────── */
html body input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
html body textarea,
html body select {
  min-height: 50px !important;
  padding: 12px 16px !important;
  font-size: 16px !important;
  border: 2px solid #86efac !important;
  border-radius: 10px !important;
  background-color: #ffffff !important;
  color: #1a1a1a !important;
}

html body input:focus, html body textarea:focus, html body select:focus {
  border-color: #059669 !important;
  outline: 3px solid rgba(5,150,105,0.22) !important;
  outline-offset: 2px !important;
}

html body input[type="checkbox"],
html body input[type="radio"] {
  width: 20px !important;
  height: 20px !important;
  accent-color: #059669 !important;
  cursor: pointer !important;
}

html body label {
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #166534 !important;
  display: block !important;
  margin-bottom: 6px !important;
}

/* ── Navigation ──────────────────────────────────────────── */
html body nav,
html body [role="navigation"],
html body header {
  background-color: #166534 !important;
}

html body nav a,
html body [role="navigation"] a,
html body header nav a,
html body header a {
  color: #dcfce7 !important;
  font-size: 16px !important;
  padding: 10px 14px !important;
  text-decoration: none !important;
}

/* ── Main content ────────────────────────────────────────── */
html body main,
html body [role="main"],
html body #main,
html body #content,
html body .main-content {
  background-color: #ffffff !important;
  padding: 28px !important;
  border-radius: 14px !important;
  max-width: 860px !important;
  margin: 20px auto !important;
  box-shadow: 0 2px 14px rgba(0,0,0,0.07) !important;
  border: 2px solid #d1fae5 !important;
}

/* ── Cards ───────────────────────────────────────────────── */
html body [class*="card"],
html body [class*="panel"],
html body article {
  background-color: #f0fdf4 !important;
  border: 2px solid #d1fae5 !important;
  border-radius: 12px !important;
  padding: 20px !important;
}

/* ── Tables ──────────────────────────────────────────────── */
html body table { border-collapse: collapse !important; width: 100% !important; }
html body td, html body th { padding: 13px 16px !important; border: 2px solid #d1fae5 !important; }
html body th { background-color: #dcfce7 !important; font-weight: 700 !important; color: #14532d !important; }

/* ── Hide clutter ────────────────────────────────────────── */
html body [class*="cookie-banner"],
html body [id*="cookie-banner"],
html body [class*="cookie-consent"],
html body [id*="cookie-consent"],
html body [class*="gdpr-banner"],
html body [id*="gdpr"],
html body [class*="consent-banner"],
html body [class*="ad-unit"],
html body [id*="ad-unit"],
html body [class*="newsletter-popup"],
html body [class*="popup-overlay"],
html body [class*="chat-bubble"],
html body [id*="chat-widget"],
html body [class*="intercom-"],
html body [class*="zendesk"],
html body [class*="notification-bar"]:not([role="alert"]),
html body [class*="promo-banner"] {
  display: none !important;
}
`;

export function getPersonaTransformCss(persona: PersonaId): string {
  if (persona === "elderly") return ELDERLY_CSS;
  if (persona === "firstTime") return FIRST_TIME_CSS;
  return "";
}
