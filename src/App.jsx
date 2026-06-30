import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

console.log(
  "%cCOSTRACE BUILD 2026-06-18-d (delete_scheduled_at column)",
  "background:#111;color:#42C3E6;font-weight:bold;padding:4px 8px;border-radius:4px;"
);

// ── ENVIRONMENT ─────────────────────────────────────────────────────────────
const ENV = "production"; // "development" | "production"

const SUPABASE_URL = "https://nevqeqsxxuwrhtbderwv.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldnFlcXN4eHV3cmh0YmRlcnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjAxNTYsImV4cCI6MjA5NjMzNjE1Nn0.vEPHbVX9kSJ4PmKkrKMfXBcpCcnoHLOvXyWv3szDxUQ";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
// Public key only — safe to ship in client code. The matching private key lives
// only in the Supabase Edge Function's environment secrets, never here.
const VAPID_PUBLIC_KEY =
  "BHG6nZLnxaYzO9k1H-G3ptSl6D2UEyl9Iq7lSmPks_lomyhNTtHqnyrJCE5VyUW8i-JBeF0qkUMCvexshBYm5jk";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Registers the service worker, asks browser permission, subscribes, and saves
// the subscription to Supabase so the Edge Function can find it later.
async function enablePushNotifications(userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const subJson = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );
    if (error) {
      console.error("enablePushNotifications: save failed", error);
      return { ok: false, reason: "error" };
    }
    return { ok: true };
  } catch (e) {
    console.error("enablePushNotifications failed", e);
    return { ok: false, reason: "error" };
  }
}

// Fire-and-forget: ask the Edge Function to push to these users. Never blocks the UI,
// and a failure here (e.g. function not deployed yet) should never break the app.
async function sendPushTo(userIds, title, body, url) {
  if (!userIds || userIds.length === 0) return;
  try {
    const { error } = await sb.functions.invoke("send-push", {
      body: { user_ids: userIds, title, body, url: url || "/" },
    });
    if (error) console.error("sendPushTo failed", error);
  } catch (e) {
    console.error("sendPushTo failed", e);
  }
}

// Dynamic invite link — works on any host (CodeSandbox, production, localhost)
const inviteBase = () =>
  `${window.location.origin}${window.location.pathname.replace(/\/?$/, "")}`;
const ledgerJoinLink = (ledgerId) => `${inviteBase()}?join=${ledgerId}`;

// -- COVERS  -  gradient + emoji (clean, always works) -------------------------
const COVERS = [
  {
    id: "house",
    label: "Household",
    emoji: "",
    bg: "linear-gradient(135deg,#465A78,#5B6C8F)",
  },
  {
    id: "family",
    label: "Family",
    emoji: "",
    bg: "linear-gradient(135deg,#8F525B,#B76E79)",
  },
  {
    id: "friends",
    label: "Friends / Trip",
    emoji: "",
    bg: "linear-gradient(135deg,#1F6780,#2A7F9E)",
  },
  {
    id: "colleagues",
    label: "Colleagues",
    emoji: "",
    bg: "linear-gradient(135deg,#5A7260,#6E8B74)",
  },
  {
    id: "parents",
    label: "Parents",
    emoji: "",
    bg: "linear-gradient(135deg,#9E875F,#B89B72)",
  },
  {
    id: "construction",
    label: "Construction",
    emoji: "",
    bg: "linear-gradient(135deg,#874A36,#A65D45)",
  },
  {
    id: "wedding",
    label: "Wedding",
    emoji: "",
    bg: "linear-gradient(135deg,#BCA989,#D6C3A3)",
  },
  {
    id: "baby",
    label: "Baby",
    emoji: "",
    bg: "linear-gradient(135deg,#90B29E,#A8C7B5)",
  },
  {
    id: "pet",
    label: "Pets",
    emoji: "",
    bg: "linear-gradient(135deg,#627247,#7B8D5B)",
  },
  {
    id: "roommates",
    label: "Roommates",
    emoji: "",
    bg: "linear-gradient(135deg,#3D5770,#4F6D8A)",
  },
  {
    id: "travel",
    label: "Travel",
    emoji: "",
    bg: "linear-gradient(135deg,#1B2638,#243447)",
  },
  {
    id: "fitness",
    label: "Fitness",
    emoji: "",
    bg: "linear-gradient(135deg,#A86119,#D07A1F)",
  },
];

const COVER_COMPONENTS = {};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --white:#ffffff;--bg:#f4f6f9;--bg2:#ebeef3;
    --border:#dde1ea;--border2:#c8cdd9;
    --text:#111827;--text2:#4b5563;--text3:#9ca3af;
    --accent:#3B5998;--accent-light:#eef2ff;--accent-hover:#2d4a82;
    --success:#2E7D56;--success-light:#edfaf3;
    --danger:#C0392B;--danger-light:#fef2f0;
    --warning:#B7770D;--warning-light:#fef9ec;
    --locked:#4a5568;--locked-light:#f7f8fa;
    --settle:#2E7D56;--settle-light:#edfaf3;
    --shadow:0 2px 12px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04);
    --shadow-lg:0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.05);
    --radius:12px;--radius-sm:8px;--radius-lg:16px;
    --font:'Plus Jakarta Sans',sans-serif;--mono:'DM Mono',monospace;
    --header:#1F2937;--header-border:#2d3748;
    --sidebar-bg:#151E2B;--sidebar-text:rgba(255,255,255,0.75);--sidebar-active:rgba(255,255,255,0.12);
  }
  body{font-family:var(--font);background:#F2F4F7;color:var(--text);-webkit-font-smoothing:antialiased;}
  .app{min-height:100vh;}
  /* AUTH */
  :root{--auth-bg:#161E2B;--auth-bg2:#1D2738;--auth-surface:rgba(255,255,255,.045);--auth-border:rgba(255,255,255,.08);--auth-accent:#DC2626;}
  .auth-page{min-height:100vh;background:radial-gradient(circle at top right,rgba(255,255,255,.05),transparent 40%),linear-gradient(180deg,var(--auth-bg),var(--auth-bg2));padding:32px 0 80px;color:white;overflow-x:hidden;}
  .auth-container{max-width:1280px;margin:0 auto;padding:0 48px;}
  @media(max-width:1200px){.auth-container{padding:0 32px;}}
  @media(max-width:768px){.auth-container{padding:0 24px;}}
  .auth-page-top{display:flex;align-items:center;justify-content:flex-start;margin-bottom:64px;}
  @media(max-width:768px){.auth-page-top{margin-bottom:40px;}}
  .auth-logo-img{height:180px;object-fit:contain;display:block;}
  @media(max-width:992px){.auth-logo-img{height:140px;}}
  @media(max-width:768px){.auth-logo-img{height:100px;}}
  .auth-hero-row{display:grid;grid-template-columns:46% 54%;align-items:center;gap:64px;margin-bottom:100px;}
  @media(max-width:1200px){.auth-hero-row{grid-template-columns:1fr;gap:48px;text-align:center;}.auth-hero-text{margin:0 auto;}.auth-hero-text p{margin-left:auto;margin-right:auto;}.auth-hero-photos{margin:0 auto;max-width:720px;}}
  @media(max-width:992px){.auth-hero-row{grid-template-columns:1fr;}}
  .auth-hero-text h2{font-size:72px;font-weight:800;color:white;line-height:1.03;letter-spacing:-2px;max-width:620px;margin-bottom:28px;}
  @media(max-width:1200px){.auth-hero-text h2{font-size:56px;max-width:760px;margin-left:auto;margin-right:auto;}}
  @media(max-width:768px){.auth-hero-text h2{font-size:42px;}}
  @media(max-width:480px){.auth-hero-text h2{font-size:36px;letter-spacing:-1px;}}
  .auth-hero-text h2 .accent{color:var(--auth-accent);}
  .auth-hero-text p{font-size:20px;line-height:1.75;color:rgba(255,255,255,.82);max-width:520px;margin-bottom:38px;}
  @media(max-width:768px){.auth-hero-text p{font-size:17px;}}
  .auth-secure{display:flex;align-items:center;gap:7px;font-size:11.5px;color:rgba(255,255,255,0.35);margin-top:14px;justify-content:center;}
  @media(min-width:1201px){.auth-secure{justify-content:flex-start;}}
  .auth-hero-photos{position:relative;height:520px;}
  @media(max-width:768px){.auth-hero-photos{height:auto;min-height:340px;}}
  .auth-collage-img{position:absolute;border-radius:24px;object-fit:cover;border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 70px rgba(0,0,0,.28);transition:transform .3s ease,box-shadow .3s ease;}
  .auth-collage-img:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 40px 80px rgba(0,0,0,.35);}
  .auth-badge-chip{position:absolute;background:rgba(21,46,66,.96);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:8px 12px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);display:flex;align-items:center;gap:6px;box-shadow:0 18px 45px rgba(0,0,0,.20);white-space:nowrap;}
  .auth-features-row{display:grid;grid-template-columns:repeat(4,minmax(96px,1fr));gap:10px;margin:36px auto 48px;}
  @media(max-width:1100px){.auth-features-row{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:768px){.auth-features-row{grid-template-columns:1fr;gap:8px;margin:24px auto;}}
  .auth-feature-card{background:var(--auth-surface);border:1px solid var(--auth-border);border-radius:10px;padding:12px;min-height:88px;backdrop-filter:blur(18px);box-shadow:0 7px 18px rgba(0,0,0,.18);transition:all .3s ease;}
  .auth-feature-card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.16);box-shadow:0 9px 19px rgba(0,0,0,.22);}
  @media(max-width:768px){.auth-feature-card{min-height:auto;}}
  .auth-feature-dot{width:23px;height:23px;border-radius:6px;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.3);color:var(--auth-accent);display:flex;align-items:center;justify-content:center;margin-bottom:10px;}
  .auth-feature-label{font-size:9px;font-weight:700;line-height:1.35;margin-bottom:6px;color:#fff;}
  .auth-feature-desc{font-size:6px;line-height:1.7;color:rgba(255,255,255,.72);}
  .auth-build-section{max-width:1280px;margin:140px auto;padding:0 48px;}
  @media(max-width:768px){.auth-build-section{padding:0 24px;margin:90px auto;}}
  .auth-build-header{display:grid;grid-template-columns:1.4fr .9fr;gap:48px;align-items:end;margin-bottom:64px;}
  @media(max-width:1100px){.auth-build-header{grid-template-columns:1fr;}}
  .auth-build-header h2{font-size:56px;font-weight:800;line-height:1.08;letter-spacing:-1.6px;color:#fff;max-width:680px;}
  @media(max-width:768px){.auth-build-header h2{font-size:38px;}}
  .auth-build-header p{font-size:18px;line-height:1.7;color:rgba(255,255,255,.75);max-width:420px;}
  .auth-build-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  @media(max-width:1100px){.auth-build-grid{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:768px){.auth-build-grid{grid-template-columns:1fr;gap:20px;}}
  .auth-build-card{background:var(--auth-surface);border:1px solid var(--auth-border);border-radius:28px;padding:34px;min-height:270px;backdrop-filter:blur(18px);box-shadow:0 18px 45px rgba(0,0,0,.18);transition:.3s ease;}
  .auth-build-card:hover{transform:translateY(-10px);box-shadow:0 24px 48px rgba(0,0,0,.22);}
  .auth-build-card h3{font-size:22px;font-weight:700;line-height:1.35;margin-bottom:16px;color:#fff;}
  .auth-build-card p{font-size:16px;line-height:1.8;color:rgba(255,255,255,.72);}
  .auth-final-cta{display:flex;justify-content:flex-start;gap:14px;flex-wrap:wrap;margin-top:8px;}
  @media(max-width:1200px){.auth-final-cta{justify-content:center;}}
  .auth-btn-primary{height:58px;display:inline-flex;align-items:center;gap:8px;background:var(--auth-accent);color:white;border:none;border-radius:16px;padding:0 34px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 10px 30px rgba(220,38,38,.28);transition:.3s ease;}
  .auth-btn-primary:hover{filter:brightness(1.08);}
  .auth-btn-secondary{height:58px;display:inline-flex;align-items:center;background:transparent;color:white;border:1.5px solid rgba(255,255,255,0.22);border-radius:16px;padding:0 34px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:.3s ease;}
  .auth-btn-secondary:hover{border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.04);}
  @media(max-width:768px){.auth-btn-primary,.auth-btn-secondary{width:100%;max-width:340px;justify-content:center;}}
  .auth-footer{max-width:1280px;margin:0 auto;padding:24px 48px;border-top:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.55);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:14px;}
  .auth-form-inner{width:100%;max-width:400px;}
  .auth-form-inner h1{font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px;}
  .auth-form-inner .subtitle{font-size:14px;color:var(--text3);margin-bottom:32px;}
  .form-group{margin-bottom:16px;}
  .form-group label{display:block;font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;}
  .form-group input,.form-group select{width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:14px;color:var(--text);background:var(--white);transition:border-color 0.15s,box-shadow 0.15s;outline:none;}
  .form-group input:focus,.form-group select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,110,247,0.1);}
  .form-group input::placeholder{color:var(--text3);}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px 18px;border-radius:var(--radius-sm);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all 0.15s;}
  .btn-primary{background:var(--accent);color:white;}
  .btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,110,247,0.35);}
  .btn-primary:disabled{opacity:0.55;cursor:not-allowed;transform:none;box-shadow:none;}
  .btn-secondary{background:var(--white);color:var(--text2);border:2px solid var(--border);}
  .btn-secondary:hover{border-color:var(--border2);background:var(--bg);}
  .btn-full{width:100%;padding:13px;font-size:14px;}
  .btn-settle{background:var(--settle-light);color:var(--settle);border:2px solid #6ee7b7;}
  .btn-settle:hover{background:#d1fae5;border-color:#34d399;}
  .btn-lock{background:var(--locked);color:white;}
  .btn-lock:hover{background:#4b5563;}
  .btn-icon{background:none;border:none;cursor:pointer;color:var(--text3);padding:7px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all 0.12s;}
  .btn-icon:hover{background:var(--bg);color:var(--text2);}
  .auth-switch{text-align:center;margin-top:20px;font-size:13px;color:var(--text3);}
  .auth-switch a{color:var(--accent);font-weight:600;cursor:pointer;}
  .error-msg{background:var(--danger-light);color:var(--danger);border:1.5px solid #fecaca;padding:10px 14px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:14px;}
  /* LAYOUT */
  .layout{display:flex;min-height:100vh;}
  .sidebar{width:220px;flex-shrink:0;background:var(--sidebar-bg);border-right:1px solid var(--header-border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;box-shadow:4px 0 24px rgba(0,0,0,0.18);}
  @media(max-width:768px){.sidebar{display:none;}.main-content{margin-left:0!important;max-width:100vw!important;padding:20px 16px 90px!important;}.mobile-nav{display:flex!important;}}
  .sidebar-logo{padding:20px 18px 16px;border-bottom:1px solid var(--header-border);font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;}
  .sidebar-logo span{color:#7BA3D4;}
  .sidebar-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:2px;}
  .nav-item{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;color:var(--sidebar-text);cursor:pointer;transition:all 0.12s;border:none;background:none;width:100%;text-align:left;}
  .nav-item:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.95);}
  .nav-item.active{background:var(--sidebar-active);color:white;border-left:3px solid #7BA3D4;}
  .sidebar-bottom{padding:10px 8px;border-top:1px solid var(--header-border);}
  .sidebar-user{display:flex;align-items:center;gap:9px;padding:10px 12px;}
  .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#7c3aed);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
  .user-info{flex:1;min-width:0;}
  .user-name{font-size:13px;font-weight:700;color:rgba(255,255,255,0.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .user-email{font-size:11px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .main-content{margin-left:220px;flex:1;padding:28px 32px;max-width:calc(100vw - 220px);}
  /* DESKTOP TOP NAVBAR — converts the left sidebar into a horizontal top bar above 768px.
     Mobile is untouched: it already hides .sidebar entirely and uses .mobile-nav instead. */
  @media(min-width:769px){
    .sidebar{width:100%;height:64px;flex-direction:row;align-items:center;justify-content:space-between;position:fixed;top:0;left:0;right:0;bottom:auto;border-right:none;border-bottom:1px solid var(--header-border);padding:0 28px;gap:24px;}
    .sidebar-logo{padding:0;border-bottom:none;flex-direction:row!important;align-items:center;gap:14px!important;flex-shrink:0;}
    .sidebar-nav{flex:0 1 auto;flex-direction:row;padding:0;gap:4px;}
    .sidebar-nav .nav-item{padding:9px 14px;}
    .sidebar-nav .nav-item.active{border-left:none;border-bottom:3px solid #7BA3D4;border-radius:8px 8px 0 0;}
    .sidebar-bottom{flex:0 0 auto;padding:0;border-top:none;display:flex;align-items:center;gap:14px;}
    .sidebar-bottom .sidebar-user{padding:6px 10px;}
    .sidebar-bottom .user-info{max-width:160px;}
    .sidebar-bottom .nav-item{width:auto;padding:9px 12px;white-space:nowrap;}
    .main-content{margin-left:0;margin-top:64px;max-width:100vw;padding:32px 40px 48px;}
  }
  @media(max-width:768px){.main-content{margin-top:0!important;}}
  .mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--header);border-top:1px solid var(--header-border);padding:8px 0 18px;gap:0;z-index:100;box-shadow:0 -4px 24px rgba(0,0,0,0.2);overflow:hidden;}
  .mobile-nav-item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:6px 2px 0;border-radius:0;font-size:9px;font-weight:600;color:rgba(255,255,255,0.45);cursor:pointer;border:none;background:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mobile-nav-item .nav-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .mobile-nav-item svg{width:20px;height:20px;flex-shrink:0;}
  .mobile-nav-item.active{color:#7BA3D4;}
  /* PAGE */
  .page-header{margin-bottom:22px;}
  .page-header h1{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.4px;}
  .page-header p{font-size:14px;color:var(--text3);margin-top:3px;}
  /* LEDGER CARDS */
  .ledger-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
  @media(min-width:769px){.ledger-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}.new-ledger-card{min-height:200px;}}
  .ledger-card{background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer;transition:all 0.18s;overflow:hidden;}
  .ledger-card:hover{border-color:var(--border2);box-shadow:var(--shadow-lg);transform:translateY(-2px);}
  .ledger-cover{position:relative;}
  .ledger-cover-lock{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.4);color:white;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;z-index:1;backdrop-filter:blur(4px);}
  .ledger-body{padding:14px 16px;}
  .ledger-name{font-size:15px;font-weight:800;color:var(--text);margin-bottom:3px;}
  .ledger-meta{font-size:12px;color:var(--text3);margin-bottom:12px;}
  .ledger-balance{display:flex;justify-content:space-between;align-items:flex-end;padding-top:10px;border-top:1.5px solid var(--border);}
  .bal-label{font-size:11px;color:var(--text3);margin-bottom:2px;font-weight:500;}
  .bal-val{font-size:15px;font-weight:800;font-family:var(--mono);}
  .bal-pos{color:var(--success);}.bal-neg{color:var(--danger);}.bal-zero{color:var(--text3);}
  .new-ledger-card{background:var(--bg);border:2px dashed var(--border2);border-radius:var(--radius-lg);cursor:pointer;transition:all 0.15s;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:10px;color:var(--text3);}
  .new-ledger-card:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light);}
  .new-ledger-card span{font-size:13px;font-weight:700;}
  /* MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(17,24,39,0.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(3px);animation:fadeIn 0.15s ease;}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal{background:var(--white);border-radius:var(--radius-lg);width:100%;max-width:500px;box-shadow:var(--shadow-lg);animation:slideUp 0.2s ease;max-height:90vh;overflow-y:auto;}
  @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-header{padding:20px 22px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .modal-header h2{font-size:17px;font-weight:800;color:var(--text);}
  .modal-body{padding:20px 22px;}
  .modal-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;}
  /* INPUTS */
  .members-list{display:flex;flex-direction:column;gap:9px;margin-bottom:10px;}
  .member-row{display:flex;align-items:center;gap:7px;}
  .member-row input{flex:1;}
  .pct-input{width:68px!important;flex:none!important;text-align:center;font-family:var(--mono)!important;font-size:13px!important;}
  .add-member-btn{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:var(--accent);background:none;border:none;cursor:pointer;padding:5px 0;}
  .pct-warn{font-size:12px;color:var(--warning);margin-top:3px;font-weight:600;}
  .pct-ok{font-size:12px;color:var(--success);margin-top:3px;font-weight:600;}
  .pct-error{font-size:12px;color:var(--danger);margin-top:3px;font-weight:600;}
  .checkbox-wrap{display:flex;align-items:center;gap:8px;cursor:pointer;}
  .checkbox-wrap input{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;}
  .checkbox-wrap span{font-size:13px;color:var(--text2);font-weight:500;}
  .tip{font-size:11px;color:var(--text3);font-style:italic;margin-top:5px;}
  /* COVER PICKER */
  .avatar-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:4px;}
  .cover-opt{height:60px;border-radius:10px 10px 0 0;cursor:pointer;border:2px solid transparent;border-bottom:none;overflow:hidden;position:relative;transition:all 0.15s;display:flex;align-items:center;justify-content:center;font-size:24px;}
  .cover-opt:hover{transform:scale(1.04);}
  .cover-opt.selected{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent);}
  .cover-opt-wrap{display:flex;flex-direction:column;cursor:pointer;width:100%;}
  .cover-opt-wrap:hover .cover-opt{transform:scale(1.04);}
  .cover-opt-wrap.selected .cover-opt{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent);}
  .cover-opt-label{font-size:10px;font-weight:600;color:var(--text2);text-align:center;padding:3px 2px 4px;background:white;border:2px solid transparent;border-top:none;border-radius:0 0 8px 8px;line-height:1.2;}
  .cover-opt-wrap.selected .cover-opt-label{border-color:var(--accent);color:var(--accent);}
  .cover-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  /* LEDGER DETAIL */
  .back-btn{display:flex;align-items:center;gap:5px;font-size:13px;color:var(--text3);background:none;border:none;cursor:pointer;margin-bottom:10px;padding:0;font-weight:500;font-family:var(--font);}
  .back-btn:hover{color:var(--text);}
  .ledger-hd{background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);margin-bottom:14px;overflow:hidden;}
  .ledger-hd-content{padding:14px 18px;}
  .ledger-hd-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
  .ledger-hd-title{font-size:19px;font-weight:800;color:var(--text);letter-spacing:-0.3px;}
  .ledger-hd-sub{font-size:12px;color:var(--text3);margin-top:1px;}
  .ledger-hd-actions{display:flex;align-items:center;gap:6px;}
  .member-pills{display:flex;flex-wrap:wrap;gap:6px;}
  .mpill{display:flex;align-items:center;gap:5px;background:var(--bg2);border-radius:20px;padding:4px 10px 4px 4px;font-size:12px;color:var(--text2);font-weight:600;border:1.5px solid var(--border);}
  .mpill-av{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:white;flex-shrink:0;}
  .mpill-pct{font-size:11px;color:var(--text3);font-family:var(--mono);margin-left:2px;}
  .approval-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:var(--warning-light);color:var(--warning);}
  /* MONTH TABS */
  .month-tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;}.month-tabs::-webkit-scrollbar{height:3px;}.month-tabs::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  .mtab{padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:2px solid var(--border);background:var(--white);color:var(--text2);transition:all 0.12s;white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;}
  .mtab:hover{border-color:var(--accent);color:var(--accent);}
  .mtab.active{background:var(--accent);color:white;border-color:var(--accent);box-shadow:0 2px 8px rgba(79,110,247,0.3);}
  .mtab.locked-t{border-color:#d1d5db;color:var(--locked);}
  .mtab.locked-t.active{background:var(--locked);color:white;border-color:var(--locked);}
  /* LOCKED */
  .locked-banner{background:var(--locked-light);border:2px solid #e5e7eb;border-radius:var(--radius);padding:11px 15px;display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .locked-banner span{font-size:13px;color:var(--locked);font-weight:500;}
  /* STATEMENT */
  .stmt-card{background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);margin-bottom:14px;overflow:hidden;}
  .stmt-header{padding:13px 17px;background:linear-gradient(135deg,#f8f9ff,#f0f3ff);border-bottom:1.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .stmt-header h3{font-size:14px;font-weight:800;color:var(--text);}
  .stmt-total-badge{background:var(--accent-light);color:var(--accent);font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;font-family:var(--mono);}
  .stmt-body{padding:14px 17px;}
  .stmt-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1.5px solid var(--border);}
  .stmt-row:last-child{border-bottom:none;}
  .stmt-member{display:flex;align-items:center;gap:9px;}
  .stmt-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0;}
  .stmt-name{font-size:13px;font-weight:700;color:var(--text);}
  .stmt-sub{font-size:11px;color:var(--text3);margin-top:1px;}
  .stmt-net{font-size:16px;font-weight:800;font-family:var(--mono);}
  .net-pos{color:var(--success);}.net-neg{color:var(--danger);}.net-zero{color:var(--text3);}
  .settle-box{margin-top:12px;padding:12px 14px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
  .settle-box.owes{background:linear-gradient(135deg,#fef2f2,#fff5f5);border:1.5px solid #fecaca;}
  .settle-box.clear{background:linear-gradient(135deg,var(--success-light),#f0fdf8);border:1.5px solid #a7f3d0;}
  .settle-text{font-size:13px;color:var(--text2);font-weight:500;}
  .settle-amt{font-weight:800;color:var(--danger);font-family:var(--mono);font-size:14px;}
  .carry-note{font-size:11px;color:var(--text3);margin-top:10px;font-style:italic;padding-top:10px;border-top:1px solid var(--border);}
  .carry-info{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;}
  .carry-chip{font-size:11px;font-family:var(--mono);font-weight:600;padding:3px 8px;border-radius:20px;background:var(--bg2);}
  /* EXPENSE ROWS */
  .exp-card{background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;}
  .exp-card-header{padding:10px 14px;border-bottom:1.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);}
  .exp-card-header h3{font-size:14px;font-weight:800;color:var(--text);}
  .exp-empty{padding:36px 20px;text-align:center;color:var(--text3);font-size:14px;font-weight:500;}
  .exp-row{padding:6px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;transition:background 0.1s;}
  .exp-row:last-child{border-bottom:none;}
  .exp-row:hover{background:var(--bg);}
  .exp-row.row-pending{background:#fffbeb;border-left:3px solid var(--warning);}
  .exp-row.row-approved{border-left:3px solid transparent;}
  .exp-row.row-denied{background:#fef2f2;border-left:3px solid var(--danger);opacity:0.75;}
  .exp-row.row-settle{background:var(--settle-light);border-left:3px solid var(--settle);}
  .exp-date{font-size:10px;color:var(--text3);font-family:var(--mono);white-space:nowrap;width:36px;font-weight:400;}
  .exp-info{flex:1;min-width:0;}
  .exp-desc{font-size:12px;font-weight:600;color:var(--text);line-height:1.2;}
  .exp-desc.denied-text{text-decoration:line-through;color:var(--text3);}
  .exp-meta{font-size:10px;color:var(--text3);margin-top:0;font-weight:400;}
  .status-tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;}
  .tag-pending{background:var(--warning-light);color:var(--warning);border:1px solid #fcd34d;}
  .tag-approved{background:var(--success-light);color:var(--success);border:1px solid #6ee7b7;}
  .tag-denied{background:var(--danger-light);color:var(--danger);border:1px solid #fca5a5;}
  .tag-settle{background:var(--settle-light);color:var(--settle);border:1px solid #6ee7b7;}
  .exp-amt{font-size:12px;font-weight:700;font-family:var(--mono);color:var(--text);white-space:nowrap;}
  .exp-amt.settle-color{color:var(--settle);}
  .exp-amt.denied-color{color:var(--text3);}
  /* LOCK */
  .lock-section{margin-top:12px;display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;}
  .lock-confirm{display:flex;gap:8px;align-items:center;background:var(--warning-light);padding:10px 14px;border-radius:var(--radius-sm);border:1.5px solid #fcd34d;flex-wrap:wrap;}
  .lock-confirm span{font-size:13px;color:#92400e;font-weight:500;}
  /* SETTINGS */
  .settings-section{background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);margin-bottom:14px;overflow:hidden;}
  .settings-body{padding:12px 14px;}
  .settings-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1.5px solid var(--border);gap:12px;}
  .settings-row:last-child{border-bottom:none;}
  .settings-label{font-size:13px;font-weight:600;color:var(--text);}
  .settings-sub{font-size:11px;color:var(--text3);margin-top:2px;}
  .toggle{position:relative;width:40px;height:22px;flex-shrink:0;}
  .toggle input{opacity:0;width:0;height:0;}
  .toggle-slider{position:absolute;inset:0;background:#d1d5db;border-radius:22px;cursor:pointer;transition:0.2s;}
  .toggle-slider::before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:white;border-radius:50%;transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}
  .toggle input:checked + .toggle-slider{background:var(--accent);}
  .toggle input:checked + .toggle-slider::before{transform:translateX(18px);}
  .msetting-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1.5px solid var(--border);}
  .msetting-row:last-child{border-bottom:none;}
  .msetting-name{flex:1;font-size:13px;font-weight:600;color:var(--text);}
  .msetting-date{font-size:11px;color:var(--text3);}
  .invite-box{background:var(--accent-light);border:1.5px solid #c7d7ff;border-radius:var(--radius-sm);padding:14px;margin-top:12px;}
  .invite-box h4{font-size:13px;font-weight:700;color:var(--accent);margin-bottom:5px;}
  .invite-box p{font-size:12px;color:var(--text2);margin-bottom:10px;}
  .invite-link{display:flex;gap:7px;}
  .invite-link input{flex:1;font-size:12px;font-family:var(--mono);background:white;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);outline:none;color:var(--text);}
  /* SPLIT */
  .split-override{background:var(--bg);border-radius:var(--radius-sm);padding:12px;margin-top:8px;border:1.5px solid var(--border);}
  .split-override h4{font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.3px;}
  .split-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  /* NOTIFICATIONS */
  .notif-toast-wrap{position:fixed;top:20px;right:20px;z-index:999;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
  @media(max-width:768px){.notif-toast-wrap{top:auto;bottom:90px;right:12px;left:12px;}}
  .notif-toast{background:var(--white);border:1.5px solid var(--border);border-radius:var(--radius);padding:13px 16px;box-shadow:var(--shadow-lg);display:flex;align-items:flex-start;gap:11px;pointer-events:all;animation:slideInRight 0.3s ease;max-width:340px;width:100%;}
  @keyframes slideInRight{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
  .notif-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:var(--accent-light);}
  .notif-content{flex:1;min-width:0;}
  .notif-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px;}
  .notif-body{font-size:12px;color:var(--text2);line-height:1.4;}
  .notif-ledger{font-size:11px;color:var(--text3);margin-top:3px;font-weight:500;}
  .notif-close{background:none;border:none;cursor:pointer;color:var(--text3);padding:2px;font-size:16px;line-height:1;flex-shrink:0;}
  /* EMPTY */
  .empty-state{text-align:center;padding:60px 32px;}
  .empty-icon{font-size:52px;margin-bottom:16px;}
  .empty-state h2{font-size:22px;font-weight:800;margin-bottom:8px;}
  .empty-state p{font-size:14px;color:var(--text3);max-width:320px;margin:0 auto 24px;line-height:1.6;}
  .av0{background:linear-gradient(135deg,#465A78,#5B6C8F)}
  .av1{background:linear-gradient(135deg,#8F525B,#B76E79)}
  .av2{background:linear-gradient(135deg,#1F6780,#2A7F9E)}
  .av3{background:linear-gradient(135deg,#5A7260,#6E8B74)}
  .av4{background:linear-gradient(135deg,#9E875F,#B89B72)}
  .av5{background:linear-gradient(135deg,#874A36,#A65D45)}
  .av6{background:linear-gradient(135deg,#627247,#7B8D5B)}
  .av7{background:linear-gradient(135deg,#3D5770,#4F6D8A)}
  .av8{background:linear-gradient(135deg,#1B2638,#243447)}
  .av9{background:linear-gradient(135deg,#A86119,#D07A1F)}
`;

// -- HELPERS -------------------------------------------------------------------
const initials = (n) =>
  n
    ? n
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const fmtAmt = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const mk = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
const mlbl = (k) => {
  const [y, m] = k.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
};

// A single solid color representing a ledger, for the pie chart — reuses whatever
// color the user picked for that ledger's cover, falling back to its cover's
// gradient (just pulls one hex out of it) so every ledger has a stable, distinct color.
function ledgerSolidColor(l) {
  const cv = COVERS.find((c) => c.id === (l.cover || "house")) || COVERS[0];
  const src = l.coverColor || cv.bg;
  const m = src.match(/#[0-9a-fA-F]{6}/);
  return m ? m[0] : "#6b7280";
}

function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(mk(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Y axis = total debt, X axis = months.
function MonthlyDebtChart({ data }) {
  const w = 460,
    h = 170,
    padL = 46,
    padB = 22,
    padT = 14,
    padR = 8;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxVal = Math.max(1, ...data.map((d) => d.debt));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + plotH - (d.debt / maxVal) * plotH,
    ...d,
  }));
  // Smooth the line with simple cubic bezier segments between points.
  const smoothPath = (pts) => {
    if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i],
        p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };
  const pathD = smoothPath(points);
  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`
      : "";
  const yTicks = [0, 0.5, 1].map((f) => ({ val: maxVal * f, y: padT + plotH - f * plotH }));
  const gradId = "debtAreaGrad";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "170px", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42C3E6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#42C3E6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={t.y} x2={w - padR} y2={t.y} stroke="var(--border)" strokeWidth="1" />
          <text x={padL - 6} y={t.y + 3} fontSize="9" fill="var(--text3)" textAnchor="end">
            {fmtAmt(t.val)}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={areaD} fill={`url(#${gradId})`} />}
      {points.length > 1 && <path d={pathD} fill="none" stroke="#42C3E6" strokeWidth="2.5" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--white)" stroke="#42C3E6" strokeWidth="2">
            <title>{`${p.label}: ${fmtAmt(p.debt)}`}</title>
          </circle>
          <text x={p.x} y={h - 5} fontSize="9" fill="var(--text3)" textAnchor="middle">
            {p.label.split(" ")[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Donut chart of current debt share per ledger, colored to match each ledger's own color,
// with the grand total shown in the center hole.
function DebtPieChart({ slices, mode, centerLabel }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 150,
    r = 64,
    rInner = 42,
    cx = size / 2,
    cy = size / 2;
  if (total <= 0) {
    return (
      <div style={{ fontSize: "12px", color: "var(--text3)", textAlign: "center", padding: "44px 0", width: "150px" }}>
        No debt right now 🎉
      </div>
    );
  }
  let angleStart = -90;
  const toRad = (a) => (a * Math.PI) / 180;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const angle = (s.value / total) * 360;
      const angleEnd = angleStart + angle;
      const large = angle > 180 ? 1 : 0;
      const x1 = cx + r * Math.cos(toRad(angleStart));
      const y1 = cy + r * Math.sin(toRad(angleStart));
      const x2 = cx + r * Math.cos(toRad(angleEnd));
      const y2 = cy + r * Math.sin(toRad(angleEnd));
      const xi1 = cx + rInner * Math.cos(toRad(angleEnd));
      const yi1 = cy + rInner * Math.sin(toRad(angleEnd));
      const xi2 = cx + rInner * Math.cos(toRad(angleStart));
      const yi2 = cy + rInner * Math.sin(toRad(angleStart));
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${large} 0 ${xi2} ${yi2} Z`;
      const out = { ...s, d, pct: (s.value / total) * 100 };
      angleStart = angleEnd;
      return out;
    });
  return (
    <div style={{ position: "relative", width: "150px", height: "150px", flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "150px", height: "150px" }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} stroke="var(--white)" strokeWidth="2">
            <title>{`${a.name}: ${mode === "percent" ? a.pct.toFixed(0) + "%" : fmtAmt(a.value)}`}</title>
          </path>
        ))}
      </svg>
      {centerLabel && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "9px", color: "var(--text3)" }}>Total debt</div>
          <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--text)", fontFamily: "var(--mono)" }}>
            {centerLabel}
          </div>
        </div>
      )}
    </div>
  );
}

// Real layout detection (not just CSS fluidity) — components branch their JSX/inline
// styles on this where a genuinely different desktop layout is needed (vs. mobile,
// which always keeps rendering its existing, untouched code path).
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 768
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isDesktop;
}

const now = () => new Date().toISOString();
// Persist "which expenses has this browser already seen per ledger" so the
// new-expense badge doesn't reset on every refresh. Per-device is fine here —
// this is just a notification-dot state, not data that needs to sync across devices.
const SEEN_EXPENSES_KEY = "costrace_seen_expenses";
const loadSeenFromStorage = () => {
  try {
    const raw = localStorage.getItem(SEEN_EXPENSES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out = {};
    Object.keys(parsed).forEach((k) => {
      out[k] = new Set(parsed[k]);
    });
    return out;
  } catch {
    return {};
  }
};
const saveSeenToStorage = (map) => {
  try {
    const plain = {};
    Object.keys(map).forEach((k) => {
      plain[k] = [...map[k]];
    });
    localStorage.setItem(SEEN_EXPENSES_KEY, JSON.stringify(plain));
  } catch {}
};
// Single source of truth for the "everyone approved → auto-delete" countdown.
// TESTING: set to 30 seconds. PRODUCTION: change to 3*24*60*60 (3 days = 259200).
const DELETE_COUNTDOWN_SECONDS = 3 * 24 * 60 * 60; // 3 days
// deadlineIso is an absolute timestamp (ledgers.delete_scheduled_at) — not a start time.
// Storing the deadline directly (rather than start+duration) means the actual moment of
// deletion lives in one plain, dedicated DB column you can read straight from the table editor.
const secondsUntil = (deadlineIso) => {
  if (!deadlineIso) return null;
  const remaining = (new Date(deadlineIso).getTime() - Date.now()) / 1000;
  return Math.max(0, Math.round(remaining));
};
const formatCountdown = (secondsLeft) => {
  if (secondsLeft === null) return "";
  if (secondsLeft >= 86400) {
    const d = Math.ceil(secondsLeft / 86400);
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  if (secondsLeft >= 3600) {
    const h = Math.ceil(secondsLeft / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  if (secondsLeft >= 60) {
    const m = Math.ceil(secondsLeft / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  return `${secondsLeft} ${secondsLeft === 1 ? "second" : "seconds"}`;
};
// A ledger counts toward plan limits only while truly active: not archived, and not
// mid delete-countdown (once all members approve deletion, it's locked and excluded
// from limit checks — same as archived — until the countdown finishes or admin cancels it).
const isCountingActive = (l) => !l.archived && !l.deleteScheduledAt;

// Clones an entire ledger (all members + all expenses + all splits) into a brand-new
// Supabase ledger row owned by a single user, marked archived. Used whenever a ledger
// is archived or deleted-with-keep-copy — each member who wants a copy gets their own
// fully independent clone, so deleting one copy never touches anyone else's.
// Module-level on purpose: it must be callable from inside the App component regardless
// of where in the render it's referenced (e.g. an effect that runs before other consts
// are defined) without any Rules-of-Hooks ordering risk.
async function persistArchivedLedgerCopy(sbClient, original, ownerUserId) {
  const { data: lRow } = await sbClient
    .from("ledgers")
    .insert({
      name: original.name,
      cover: original.cover || "house",
      require_approval: original.require_approval || false,
      notifications_enabled: original.notifications_enabled !== false,
      auto_lock: original.auto_lock !== false,
      cover_color: original.coverColor || null,
      label_color: original.labelColor || null,
      custom_label: original.customLabel || null,
      card_color: original.cardColor || null,
      locked_months: original.lockedMonths || {},
      archived: true,
      archived_at: now(),
      archived_from: original.id,
      owner_id: ownerUserId,
      payout_mode: original.payout_mode || "offset_ledger",
      payout_custom_splits: original.payout_custom_splits || null,
    })
    .select()
    .single();
  if (!lRow) return null;
  const memberRows = await Promise.all(
    (original.members || []).map((om) =>
      sbClient
        .from("ledger_members")
        .insert({
          ledger_id: lRow.id,
          user_id: om.user_id || null,
          display_name: om.display_name,
          share_percent: om.share_percent,
          is_spectator: om.is_spectator || false,
          is_admin: om.is_admin || false,
          invited_email: om.invited_email || null,
          avatar: om.avatar || null,
          plan: om.plan || "free",
          share_history: om.share_history || [],
        })
        .select()
        .single()
        .then((r) => ({ oldId: om.id, row: r.data }))
    )
  );
  const memberIdMap = {};
  memberRows.forEach(({ oldId, row }) => {
    if (row) memberIdMap[oldId] = row.id;
  });
  await Promise.all(
    (original.expenses || []).map(async (exp) => {
      const { data: newExp } = await sbClient
        .from("expenses")
        .insert({
          ledger_id: lRow.id,
          description: exp.description,
          amount: exp.amount,
          paid_by_name: exp.paid_by_name,
          paid_by_id: exp.paid_by_id || null,
          expense_date: exp.expense_date,
          approval_status: exp.approval_status,
          is_settlement: exp.is_settlement || false,
          is_payout: exp.is_payout || false,
          payout_mode: exp.payout_mode || null,
        })
        .select()
        .single();
      if (newExp && exp.splits && exp.splits.length > 0) {
        await sbClient.from("expense_splits").insert(
          exp.splits.map((s) => ({
            expense_id: newExp.id,
            ledger_member_id: memberIdMap[s.member_id] || null,
            share_percent: s.share_percent,
            amount_owed: s.amount_owed || 0,
          }))
        );
      }
    })
  );
  return lRow.id;
}
async function deleteLedgerEverywhere(sbClient, ledgerId) {
  await sbClient.from("ledger_members").delete().eq("ledger_id", ledgerId);
  await sbClient.from("expenses").delete().eq("ledger_id", ledgerId);
  await sbClient.from("ledgers").delete().eq("id", ledgerId);
}

// -- ICONS ---------------------------------------------------------------------
const Icon = {
  Home: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Plus: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  X: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ChevL: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Lock: () => (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  MessageSquare: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  LogOut: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Gear: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Copy: () => (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
};

const LOGO_SIDEBAR =
  "data:image/jpeg;base64,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";
const LOGO_ICON = "data:image/jpeg;base64,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";

// Real Unsplash stock photography for the auth hero collage (free Unsplash License, no attribution required)
const AUTH_PHOTO_CAMPFIRE = "https://images.unsplash.com/photo-1661758211116-388aae0197f0?auto=format&fit=crop&w=480&q=70";
const AUTH_PHOTO_BEACH = "https://images.unsplash.com/photo-1709216461598-018ae6307dc0?auto=format&fit=crop&w=480&q=70";
const AUTH_PHOTO_PIZZA = "https://images.unsplash.com/photo-1753351055582-67172f8c4d27?auto=format&fit=crop&w=480&q=70";

// -- COVER COMPONENT -----------------------------------------------------------
function CoverImg({
  cover,
  height = 110,
  coverColor,
  labelColor,
  customLabel,
  children,
}) {
  const id = typeof cover === "string" ? cover : "house";
  const cv = COVERS.find((c) => c.id === id) || COVERS[0];
  const bg = coverColor || cv.bg;
  const label =
    customLabel !== undefined && customLabel !== null && customLabel !== ""
      ? customLabel
      : cv.label;
  // Text always white — covers are designed to support it
  const txtColor = "rgba(255,255,255,0.95)";
  return (
    <div
      style={{
        height,
        position: "relative",
        overflow: "hidden",
        background: bg,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top,rgba(0,0,0,0.30) 0%,rgba(0,0,0,0.08) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: txtColor,
            fontSize: Math.max(12, height * 0.28),
            fontWeight: "800",
            letterSpacing: "-0.5px",
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            userSelect: "none",
            textAlign: "center",
            padding: "0 12px",
            lineHeight: 1.1,
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// -- MOCK DATA -----------------------------------------------------------------
const MOCK_LEDGERS = [
  {
    id: "l1",
    name: "Troskovi kuce",
    cover: "house",
    require_approval: false,
    members: [
      {
        id: "m1",
        plan: "gold",
        display_name: "Viktor",
        share_percent: 60,
        user_id: "u1",
        joined_date: "2026-01-01",
      },
      {
        id: "m2",
        plan: "regular",
        display_name: "Vesna",
        share_percent: 40,
        user_id: null,
        joined_date: "2026-01-01",
      },
    ],
    lockedMonths: {
      "2026-04": true,
      "2026-05": true,
      "2025-01": true,
      "2025-02": true,
      "2025-03": true,
      "2025-04": true,
      "2025-05": true,
      "2025-06": true,
      "2025-07": true,
      "2025-08": true,
      "2025-09": true,
      "2025-10": true,
      "2025-11": true,
      "2025-12": true,
      "2024-01": true,
      "2024-02": true,
      "2024-03": true,
      "2024-04": true,
      "2024-05": true,
      "2024-06": true,
      "2024-07": true,
      "2024-08": true,
      "2024-09": true,
      "2024-10": true,
      "2024-11": true,
      "2024-12": true,
    },
    expenses: [
      {
        id: "e100",
        description: "Komunalije 2024",
        amount: 8000,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-01-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4800 },
          { member_id: "m2", share_percent: 40, amount_owed: 3200 },
        ],
      },
      {
        id: "e101",
        description: "Namirnice",
        amount: 4005,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-01-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2403 },
          { member_id: "m2", share_percent: 40, amount_owed: 1602 },
        ],
      },
      {
        id: "e102",
        description: "Komunalije 2024",
        amount: 8020,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-02-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4812 },
          { member_id: "m2", share_percent: 40, amount_owed: 3208 },
        ],
      },
      {
        id: "e103",
        description: "Namirnice",
        amount: 4015,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-02-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2409 },
          { member_id: "m2", share_percent: 40, amount_owed: 1606 },
        ],
      },
      {
        id: "e104",
        description: "Komunalije 2024",
        amount: 8040,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-03-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4824 },
          { member_id: "m2", share_percent: 40, amount_owed: 3216 },
        ],
      },
      {
        id: "e105",
        description: "Namirnice",
        amount: 4025,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-03-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2415 },
          { member_id: "m2", share_percent: 40, amount_owed: 1610 },
        ],
      },
      {
        id: "e106",
        description: "Komunalije 2024",
        amount: 8060,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-04-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4836 },
          { member_id: "m2", share_percent: 40, amount_owed: 3224 },
        ],
      },
      {
        id: "e107",
        description: "Namirnice",
        amount: 4035,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-04-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2421 },
          { member_id: "m2", share_percent: 40, amount_owed: 1614 },
        ],
      },
      {
        id: "e108",
        description: "Komunalije 2024",
        amount: 8080,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-05-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4848 },
          { member_id: "m2", share_percent: 40, amount_owed: 3232 },
        ],
      },
      {
        id: "e109",
        description: "Namirnice",
        amount: 4045,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-05-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2427 },
          { member_id: "m2", share_percent: 40, amount_owed: 1618 },
        ],
      },
      {
        id: "e110",
        description: "Komunalije 2024",
        amount: 8100,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-06-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4860 },
          { member_id: "m2", share_percent: 40, amount_owed: 3240 },
        ],
      },
      {
        id: "e111",
        description: "Namirnice",
        amount: 4055,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-06-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2433 },
          { member_id: "m2", share_percent: 40, amount_owed: 1622 },
        ],
      },
      {
        id: "e112",
        description: "Komunalije 2024",
        amount: 8120,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-07-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4872 },
          { member_id: "m2", share_percent: 40, amount_owed: 3248 },
        ],
      },
      {
        id: "e113",
        description: "Namirnice",
        amount: 4065,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-07-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2439 },
          { member_id: "m2", share_percent: 40, amount_owed: 1626 },
        ],
      },
      {
        id: "e114",
        description: "Komunalije 2024",
        amount: 8140,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-08-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4884 },
          { member_id: "m2", share_percent: 40, amount_owed: 3256 },
        ],
      },
      {
        id: "e115",
        description: "Namirnice",
        amount: 4075,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-08-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2445 },
          { member_id: "m2", share_percent: 40, amount_owed: 1630 },
        ],
      },
      {
        id: "e116",
        description: "Komunalije 2024",
        amount: 8160,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-09-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4896 },
          { member_id: "m2", share_percent: 40, amount_owed: 3264 },
        ],
      },
      {
        id: "e117",
        description: "Namirnice",
        amount: 4085,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-09-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2451 },
          { member_id: "m2", share_percent: 40, amount_owed: 1634 },
        ],
      },
      {
        id: "e118",
        description: "Komunalije 2024",
        amount: 8180,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-10-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4908 },
          { member_id: "m2", share_percent: 40, amount_owed: 3272 },
        ],
      },
      {
        id: "e119",
        description: "Namirnice",
        amount: 4095,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-10-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2457 },
          { member_id: "m2", share_percent: 40, amount_owed: 1638 },
        ],
      },
      {
        id: "e120",
        description: "Komunalije 2024",
        amount: 8200,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-11-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4920 },
          { member_id: "m2", share_percent: 40, amount_owed: 3280 },
        ],
      },
      {
        id: "e121",
        description: "Namirnice",
        amount: 4105,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-11-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2463 },
          { member_id: "m2", share_percent: 40, amount_owed: 1642 },
        ],
      },
      {
        id: "e122",
        description: "Komunalije 2024",
        amount: 8220,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2024-12-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4932 },
          { member_id: "m2", share_percent: 40, amount_owed: 3288 },
        ],
      },
      {
        id: "e123",
        description: "Namirnice",
        amount: 4115,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2024-12-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2469 },
          { member_id: "m2", share_percent: 40, amount_owed: 1646 },
        ],
      },
      {
        id: "e124",
        description: "Komunalije 2025",
        amount: 8240,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-01-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4944 },
          { member_id: "m2", share_percent: 40, amount_owed: 3296 },
        ],
      },
      {
        id: "e125",
        description: "Namirnice",
        amount: 4125,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-01-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2475 },
          { member_id: "m2", share_percent: 40, amount_owed: 1650 },
        ],
      },
      {
        id: "e126",
        description: "Komunalije 2025",
        amount: 8260,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-02-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4956 },
          { member_id: "m2", share_percent: 40, amount_owed: 3304 },
        ],
      },
      {
        id: "e127",
        description: "Namirnice",
        amount: 4135,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-02-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2481 },
          { member_id: "m2", share_percent: 40, amount_owed: 1654 },
        ],
      },
      {
        id: "e128",
        description: "Komunalije 2025",
        amount: 8280,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-03-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4968 },
          { member_id: "m2", share_percent: 40, amount_owed: 3312 },
        ],
      },
      {
        id: "e129",
        description: "Namirnice",
        amount: 4145,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-03-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2487 },
          { member_id: "m2", share_percent: 40, amount_owed: 1658 },
        ],
      },
      {
        id: "e130",
        description: "Komunalije 2025",
        amount: 8300,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-04-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4980 },
          { member_id: "m2", share_percent: 40, amount_owed: 3320 },
        ],
      },
      {
        id: "e131",
        description: "Namirnice",
        amount: 4155,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-04-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2493 },
          { member_id: "m2", share_percent: 40, amount_owed: 1662 },
        ],
      },
      {
        id: "e132",
        description: "Komunalije 2025",
        amount: 8320,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-05-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 4992 },
          { member_id: "m2", share_percent: 40, amount_owed: 3328 },
        ],
      },
      {
        id: "e133",
        description: "Namirnice",
        amount: 4165,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-05-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2499 },
          { member_id: "m2", share_percent: 40, amount_owed: 1666 },
        ],
      },
      {
        id: "e134",
        description: "Komunalije 2025",
        amount: 8340,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-06-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5004 },
          { member_id: "m2", share_percent: 40, amount_owed: 3336 },
        ],
      },
      {
        id: "e135",
        description: "Namirnice",
        amount: 4175,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-06-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2505 },
          { member_id: "m2", share_percent: 40, amount_owed: 1670 },
        ],
      },
      {
        id: "e136",
        description: "Komunalije 2025",
        amount: 8360,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-07-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5016 },
          { member_id: "m2", share_percent: 40, amount_owed: 3344 },
        ],
      },
      {
        id: "e137",
        description: "Namirnice",
        amount: 4185,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-07-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2511 },
          { member_id: "m2", share_percent: 40, amount_owed: 1674 },
        ],
      },
      {
        id: "e138",
        description: "Komunalije 2025",
        amount: 8380,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-08-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5028 },
          { member_id: "m2", share_percent: 40, amount_owed: 3352 },
        ],
      },
      {
        id: "e139",
        description: "Namirnice",
        amount: 4195,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-08-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2517 },
          { member_id: "m2", share_percent: 40, amount_owed: 1678 },
        ],
      },
      {
        id: "e140",
        description: "Komunalije 2025",
        amount: 8400,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-09-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5040 },
          { member_id: "m2", share_percent: 40, amount_owed: 3360 },
        ],
      },
      {
        id: "e141",
        description: "Namirnice",
        amount: 4205,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-09-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2523 },
          { member_id: "m2", share_percent: 40, amount_owed: 1682 },
        ],
      },
      {
        id: "e142",
        description: "Komunalije 2025",
        amount: 8420,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-10-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5052 },
          { member_id: "m2", share_percent: 40, amount_owed: 3368 },
        ],
      },
      {
        id: "e143",
        description: "Namirnice",
        amount: 4215,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-10-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2529 },
          { member_id: "m2", share_percent: 40, amount_owed: 1686 },
        ],
      },
      {
        id: "e144",
        description: "Komunalije 2025",
        amount: 8440,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-11-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5064 },
          { member_id: "m2", share_percent: 40, amount_owed: 3376 },
        ],
      },
      {
        id: "e145",
        description: "Namirnice",
        amount: 4225,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-11-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2535 },
          { member_id: "m2", share_percent: 40, amount_owed: 1690 },
        ],
      },
      {
        id: "e146",
        description: "Komunalije 2025",
        amount: 8460,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2025-12-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5076 },
          { member_id: "m2", share_percent: 40, amount_owed: 3384 },
        ],
      },
      {
        id: "e147",
        description: "Namirnice",
        amount: 4235,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2025-12-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2541 },
          { member_id: "m2", share_percent: 40, amount_owed: 1694 },
        ],
      },
      {
        id: "e148",
        description: "Komunalije 2026",
        amount: 8480,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-01-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5088 },
          { member_id: "m2", share_percent: 40, amount_owed: 3392 },
        ],
      },
      {
        id: "e149",
        description: "Namirnice",
        amount: 4245,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-01-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2547 },
          { member_id: "m2", share_percent: 40, amount_owed: 1698 },
        ],
      },
      {
        id: "e150",
        description: "Komunalije 2026",
        amount: 8500,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-02-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5100 },
          { member_id: "m2", share_percent: 40, amount_owed: 3400 },
        ],
      },
      {
        id: "e151",
        description: "Namirnice",
        amount: 4255,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-02-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2553 },
          { member_id: "m2", share_percent: 40, amount_owed: 1702 },
        ],
      },
      {
        id: "e152",
        description: "Komunalije 2026",
        amount: 8520,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-03-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5112 },
          { member_id: "m2", share_percent: 40, amount_owed: 3408 },
        ],
      },
      {
        id: "e153",
        description: "Namirnice",
        amount: 4265,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-03-15T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2559 },
          { member_id: "m2", share_percent: 40, amount_owed: 1706 },
        ],
      },
      {
        id: "e1",
        description: "Komunalije",
        amount: 8500,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-04-03T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5100 },
          { member_id: "m2", share_percent: 40, amount_owed: 3400 },
        ],
      },
      {
        id: "e2",
        description: "Namirnice  -  Maxi",
        amount: 4200,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-04-10T14:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2520 },
          { member_id: "m2", share_percent: 40, amount_owed: 1680 },
        ],
      },
      {
        id: "e3",
        description: "Struja",
        amount: 3100,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-04-18T09:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 1860 },
          { member_id: "m2", share_percent: 40, amount_owed: 1240 },
        ],
      },
      {
        id: "e3s",
        description: "Otplata  -  april",
        amount: 560,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-04-30T18:00:00",
        approval_status: "approved",
        is_settlement: true,
        splits: [{ member_id: "m1", share_percent: 100, amount_owed: 560 }],
      },
      {
        id: "e4",
        description: "Internet",
        amount: 1500,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-05-01T09:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 900 },
          { member_id: "m2", share_percent: 40, amount_owed: 600 },
        ],
      },
      {
        id: "e5",
        description: "Komunalije",
        amount: 8800,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-05-04T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5280 },
          { member_id: "m2", share_percent: 40, amount_owed: 3520 },
        ],
      },
      {
        id: "e6",
        description: "Namirnice  -  Lidl",
        amount: 3600,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-05-15T16:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 2160 },
          { member_id: "m2", share_percent: 40, amount_owed: 1440 },
        ],
      },
      {
        id: "e6s",
        description: "Otplata  -  maj",
        amount: 1050,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-05-31T18:00:00",
        approval_status: "approved",
        is_settlement: true,
        splits: [{ member_id: "m1", share_percent: 100, amount_owed: 1050 }],
      },
      {
        id: "e7",
        description: "Internet  -  jun",
        amount: 1500,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-06-01T09:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 900 },
          { member_id: "m2", share_percent: 40, amount_owed: 600 },
        ],
      },
      {
        id: "e8",
        description: "Komunalije  -  jun",
        amount: 9100,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-06-05T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 5460 },
          { member_id: "m2", share_percent: 40, amount_owed: 3640 },
        ],
      },
      {
        id: "e9",
        description: "Rucak  -  Restoran",
        amount: 2400,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-06-06T13:00:00",
        approval_status: "pending",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 50, amount_owed: 1200 },
          { member_id: "m2", share_percent: 50, amount_owed: 1200 },
        ],
      },
      {
        id: "e10",
        description: "Parking  -  centar",
        amount: 800,
        paid_by_name: "Vesna",
        paid_by_id: null,
        expense_date: "2026-06-06T15:00:00",
        approval_status: "denied",
        is_settlement: false,
        splits: [
          { member_id: "m1", share_percent: 60, amount_owed: 480 },
          { member_id: "m2", share_percent: 40, amount_owed: 320 },
        ],
      },
    ],
  },
  {
    id: "l2",
    name: "Troskovi dece",
    cover: "family",
    require_approval: true,
    members: [
      {
        id: "m3",
        plan: "gold",
        display_name: "Viktor",
        share_percent: 50,
        user_id: "u1",
        joined_date: "2026-01-01",
      },
      {
        id: "m4",
        plan: "light",
        display_name: "Ana",
        share_percent: 50,
        user_id: null,
        joined_date: "2026-01-01",
      },
    ],
    lockedMonths: { "2026-04": true, "2026-05": true },
    expenses: [
      {
        id: "f1",
        description: "Skola  -  april",
        amount: 4000,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-04-01T08:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m3", share_percent: 50, amount_owed: 2000 },
          { member_id: "m4", share_percent: 50, amount_owed: 2000 },
        ],
      },
      {
        id: "f2",
        description: "Vannastavne aktivnosti",
        amount: 3500,
        paid_by_name: "Ana",
        paid_by_id: null,
        expense_date: "2026-04-20T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m3", share_percent: 50, amount_owed: 1750 },
          { member_id: "m4", share_percent: 50, amount_owed: 1750 },
        ],
      },
      {
        id: "f3",
        description: "Skola  -  maj",
        amount: 4000,
        paid_by_name: "Ana",
        paid_by_id: null,
        expense_date: "2026-05-01T08:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m3", share_percent: 50, amount_owed: 2000 },
          { member_id: "m4", share_percent: 50, amount_owed: 2000 },
        ],
      },
      {
        id: "f4",
        description: "Ekskurzija",
        amount: 6000,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-05-22T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m3", share_percent: 50, amount_owed: 3000 },
          { member_id: "m4", share_percent: 50, amount_owed: 3000 },
        ],
      },
      {
        id: "f5",
        description: "Skola  -  jun",
        amount: 4000,
        paid_by_name: "Ana",
        paid_by_id: null,
        expense_date: "2026-06-01T08:00:00",
        approval_status: "pending",
        is_settlement: false,
        splits: [
          { member_id: "m3", share_percent: 50, amount_owed: 2000 },
          { member_id: "m4", share_percent: 50, amount_owed: 2000 },
        ],
      },
    ],
  },
  {
    id: "l3",
    name: "Ekipa",
    cover: "friends",
    require_approval: false,
    members: [
      {
        id: "m10",
        plan: "gold",
        display_name: "Viktor",
        share_percent: 25,
        user_id: "u1",
        joined_date: "2026-01-01",
      },
      {
        id: "m11",
        plan: "regular",
        display_name: "Pera",
        share_percent: 25,
        user_id: null,
        joined_date: "2026-01-01",
      },
      {
        id: "m12",
        plan: "light",
        display_name: "Mika",
        share_percent: 25,
        user_id: null,
        joined_date: "2026-01-01",
      },
      {
        id: "m13",
        plan: "free",
        display_name: "Djura",
        share_percent: 25,
        user_id: null,
        joined_date: "2026-01-01",
      },
      {
        id: "m14",
        plan: "free",
        display_name: "Tanja",
        share_percent: 0,
        user_id: null,
        joined_date: "2026-01-01",
        is_spectator: true,
      },
    ],
    lockedMonths: {},
    payouts_enabled: true,
    payouts: [
      {
        id: "p1",
        title: "Svirka - Klub 20/20",
        description: "Nastup subota",
        amount: 60000,
        received_by_name: "Viktor",
        received_by_id: "u1",
        payout_date: "2026-06-07T22:00:00",
        mode: "separate",
        splits: [
          { member_id: "m10", share_percent: 40, amount_due: 24000 },
          { member_id: "m11", share_percent: 30, amount_due: 18000 },
          { member_id: "m12", share_percent: 20, amount_due: 12000 },
          { member_id: "m13", share_percent: 10, amount_due: 6000 },
        ],
      },
      {
        id: "p2",
        title: "Streaming prihodi",
        description: "Spotify + Apple Music jun",
        amount: 18500,
        received_by_name: "Pera",
        received_by_id: null,
        payout_date: "2026-06-10T10:00:00",
        mode: "equal",
        splits: [
          { member_id: "m10", share_percent: 25, amount_due: 4625 },
          { member_id: "m11", share_percent: 25, amount_due: 4625 },
          { member_id: "m12", share_percent: 25, amount_due: 4625 },
          { member_id: "m13", share_percent: 25, amount_due: 4625 },
        ],
      },
      {
        id: "p3",
        title: "Sponzorstvo",
        description: "Energetski napitak brand deal",
        amount: 30000,
        received_by_name: "Viktor",
        received_by_id: "u1",
        payout_date: "2026-06-12T14:00:00",
        mode: "offset",
        splits: [
          { member_id: "m10", share_percent: 25, amount_due: 7500 },
          { member_id: "m11", share_percent: 25, amount_due: 7500 },
          { member_id: "m12", share_percent: 25, amount_due: 7500 },
          { member_id: "m13", share_percent: 25, amount_due: 7500 },
        ],
      },
    ],
    expenses: [
      {
        id: "g1",
        description: "Vikendica",
        amount: 40000,
        paid_by_name: "Pera",
        paid_by_id: null,
        expense_date: "2026-06-01T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 10000 },
          { member_id: "m11", share_percent: 25, amount_owed: 10000 },
          { member_id: "m12", share_percent: 25, amount_owed: 10000 },
          { member_id: "m13", share_percent: 25, amount_owed: 10000 },
        ],
      },
      {
        id: "g2",
        description: "Hrana i pice",
        amount: 24000,
        paid_by_name: "Mika",
        paid_by_id: null,
        expense_date: "2026-06-02T12:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 6000 },
          { member_id: "m11", share_percent: 25, amount_owed: 6000 },
          { member_id: "m12", share_percent: 25, amount_owed: 6000 },
          { member_id: "m13", share_percent: 25, amount_owed: 6000 },
        ],
      },
      {
        id: "g3",
        description: "Gorivo",
        amount: 8000,
        paid_by_name: "Djura",
        paid_by_id: null,
        expense_date: "2026-06-03T08:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 2000 },
          { member_id: "m11", share_percent: 25, amount_owed: 2000 },
          { member_id: "m12", share_percent: 25, amount_owed: 2000 },
          { member_id: "m13", share_percent: 25, amount_owed: 2000 },
        ],
      },
      {
        id: "g4",
        description: "Restoran",
        amount: 16000,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-06-04T20:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 4000 },
          { member_id: "m11", share_percent: 25, amount_owed: 4000 },
          { member_id: "m12", share_percent: 25, amount_owed: 4000 },
          { member_id: "m13", share_percent: 25, amount_owed: 4000 },
        ],
      },
      {
        id: "g5",
        description: "Nocni izlaz",
        amount: 12000,
        paid_by_name: "Pera",
        paid_by_id: null,
        expense_date: "2026-06-05T23:00:00",
        approval_status: "approved",
        is_settlement: false,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 3000 },
          { member_id: "m11", share_percent: 25, amount_owed: 3000 },
          { member_id: "m12", share_percent: 25, amount_owed: 3000 },
          { member_id: "m13", share_percent: 25, amount_owed: 3000 },
        ],
      },
      {
        id: "p1",
        description: "Svirka - Klub 20/20",
        amount: 60000,
        paid_by_name: "Viktor",
        paid_by_id: "u1",
        expense_date: "2026-06-07T22:00:00",
        approval_status: "approved",
        is_settlement: false,
        is_payout: true,
        payout_offset: true,
        payout_record: false,
        splits: [
          { member_id: "m10", share_percent: 40, amount_owed: 24000 },
          { member_id: "m11", share_percent: 30, amount_owed: 18000 },
          { member_id: "m12", share_percent: 20, amount_owed: 12000 },
          { member_id: "m13", share_percent: 10, amount_owed: 6000 },
        ],
      },
      {
        id: "p2",
        description: "Streaming prihodi jun",
        amount: 18500,
        paid_by_name: "Pera",
        paid_by_id: null,
        expense_date: "2026-06-10T10:00:00",
        approval_status: "approved",
        is_settlement: false,
        is_payout: true,
        payout_offset: false,
        payout_record: true,
        splits: [
          { member_id: "m10", share_percent: 25, amount_owed: 4625 },
          { member_id: "m11", share_percent: 25, amount_owed: 4625 },
          { member_id: "m12", share_percent: 25, amount_owed: 4625 },
          { member_id: "m13", share_percent: 25, amount_owed: 4625 },
        ],
      },
    ],
  },
];

// -- COMPUTE BALANCES (skip pending & denied) ----------------------------------
function computeBalances(ledger, expenses) {
  if (!ledger || !Array.isArray(ledger.members)) return [];
  const paid = {},
    owed = {};
  ledger.members
    .filter((m) => m && m.id && !m.is_spectator)
    .forEach((m) => {
      paid[m.id] = 0;
      owed[m.id] = 0;
    });

  // Get a member's share_percent at a given date (respects share_history)
  const pctAt = (member, date) => {
    if (!member.share_history || !member.share_history.length)
      return member.share_percent;
    const d = new Date(date);
    // Find the last history entry before this date
    const past = [...member.share_history]
      .filter((h) => new Date(h.date) <= d)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (past.length) return past[0].from; // 'from' was the pct before the change
    return member.share_percent;
  };

  expenses
    .filter((e) => e.approval_status === "approved")
    .forEach((exp) => {
      // Only compare by user_id when paid_by_id is truthy. Two virtual (no-account)
      // members both have user_id === null/undefined, so "m.user_id === exp.paid_by_id"
      // would match the FIRST such member whenever paid_by_id is also null/undefined —
      // attributing the payment to the wrong person in ledgers with 2+ accountless
      // members. Falling back to display_name match only is unambiguous here because
      // paid_by_name is always set to the exact member that was actually selected.
      const payer = ledger.members.find(
        (m) =>
          (exp.paid_by_id && m.user_id === exp.paid_by_id) ||
          m.display_name === exp.paid_by_name
      );
      if (exp.is_settlement) {
        if (payer) paid[payer.id] = (paid[payer.id] || 0) + exp.amount;
        exp.splits.forEach((s) => {
          owed[s.member_id] = (owed[s.member_id] || 0) + s.amount_owed;
        });
      } else {
        if (
          payer &&
          (!payer.joined_date ||
            new Date(exp.expense_date) >= new Date(payer.joined_date))
        )
          paid[payer.id] = (paid[payer.id] || 0) + exp.amount;
        exp.splits.forEach((s) => {
          const mem = ledger.members.find((m) => m.id === s.member_id);
          if (
            mem &&
            (!mem.joined_date ||
              new Date(exp.expense_date) >= new Date(mem.joined_date))
          )
            owed[s.member_id] = (owed[s.member_id] || 0) + s.amount_owed;
        });
      }
    });
  return ledger.members
    .filter((m) => m && m.id && !m.is_spectator)
    .map((m) => ({
      ...m,
      paid: paid[m.id] || 0,
      owed: owed[m.id] || 0,
      net: (paid[m.id] || 0) - (owed[m.id] || 0),
    }));
}

// Given a month that's being locked, compute each member's net for that month
// and turn it into real "Carry-over" expenses dated at the start of the next
// month — paid_by the creditor, owed by the debtor. Because this reuses the
// exact same paid/owed math as every other expense, the new month's balance
// automatically includes it with no separate "carryover" calculation needed
// anywhere else. Returns [] if everyone is already settled for that month.
function buildCarryoverExpenses(ledger, lockedMonth) {
  const monthExpenses = ledger.expenses.filter(
    (e) => mk(e.expense_date) === lockedMonth
  );
  const balances = computeBalances(ledger, monthExpenses);
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b, rem: -b.net }))
    .sort((a, b) => b.rem - a.rem);
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b, rem: b.net }))
    .sort((a, b) => b.rem - a.rem);
  const [y, m] = lockedMonth.split("-").map(Number);
  const nextMonthDate = new Date(y, m, 1); // m is 1-based in the key, so this lands on day 1 of the following month
  const expenses = [];
  let di = 0,
    ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di],
      c = creditors[ci];
    const amt = Math.min(d.rem, c.rem);
    if (amt > 0.01) {
      const rounded = parseFloat(amt.toFixed(2));
      expenses.push({
        id: `ecarry${Date.now()}_${di}_${ci}_${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        description: `Carry-over from ${mlbl(lockedMonth)}`,
        amount: rounded,
        paid_by_name: c.display_name,
        paid_by_id: c.user_id || null,
        expense_date: nextMonthDate.toISOString(),
        approval_status: "approved",
        is_settlement: false,
        is_carryover: true,
        splits: [
          { member_id: d.id, share_percent: 100, amount_owed: rounded },
        ],
      });
    }
    d.rem -= amt;
    c.rem -= amt;
    if (d.rem < 0.01) di++;
    if (c.rem < 0.01) ci++;
  }
  return expenses;
}

function getMonths(l) {
  return [...new Set(l.expenses.map((e) => mk(e.expense_date)))].sort();
}

// -- AUTH

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [category, setCategory] = useState(null);

  const submit = async () => {
    if (!form.email) {
      setError("Email is required.");
      return;
    }
    if (!form.password) {
      setError("Password is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let res;
      if (mode === "register") {
        res = await sb.auth.signUp({
          email: form.email,
          password: form.password,
        });
        if (res.error) throw res.error;
        // Create profile
        await sb
          .from("profiles")
          .upsert({
            id: res.data.user.id,
            email: form.email,
            full_name: form.name?.trim() || null,
            plan: "free",
          });
      } else {
        res = await sb.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (res.error) throw res.error;
      }
      const u = res.data.user;
      onLogin({ id: u.id, email: u.email, full_name: form.name || "" });
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
    setLoading(false);
  };

  // Small inline icons for the hero — kept local to this component since
  // they're only used here (shield-check, eye, people, heart, plane, briefcase).
  const HeroIcon = {
    Check: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    Shield: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    Eye: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    People: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    Heart: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.6z" />
      </svg>
    ),
    Plane: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
    Briefcase: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
    Clock: () => (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </svg>
    ),
  };

  return (
    <div className="auth-page">
      <div className="auth-page-top auth-container">
        <img src={LOGO_SIDEBAR} alt="CosTrace" className="auth-logo-img" />
      </div>

      <div className="auth-hero-row auth-container">
        <div className="auth-hero-text">
          <h2>
            Shared Expenses.
            <br />
            One <span className="accent">Truth.</span>
          </h2>
          <p>
            Every expense, settlement and adjustment preserved in one
            transparent history. Today, tomorrow, always.
          </p>
          <div className="auth-secure">
            <Icon.Lock />
            Your data is secure and private.
          </div>
          <div className="auth-final-cta">
            <button
              type="button"
              className="auth-btn-primary"
              onClick={() => {
                setMode("register");
                setError("");
                setShowAuthModal(true);
              }}
            >
              Try for free
            </button>
            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                setMode("login");
                setError("");
                setShowAuthModal(true);
              }}
            >
              Log in
            </button>
          </div>
        </div>

        <div className="auth-hero-photos">
          <img
            src={AUTH_PHOTO_CAMPFIRE}
            alt="Friends around a campfire"
            className="auth-collage-img"
            style={{ top: 0, left: 0, width: "62%", height: "46%", zIndex: 1, transform: "rotate(-1.5deg)" }}
          />
          <img
            src={AUTH_PHOTO_BEACH}
            alt="Family walking on the beach at sunset"
            className="auth-collage-img"
            style={{ top: "20%", right: 0, width: "55%", height: "48%", zIndex: 2, transform: "rotate(1.5deg)" }}
          />
          <img
            src={AUTH_PHOTO_PIZZA}
            alt="Friends sharing pizza"
            className="auth-collage-img"
            style={{ top: "56%", left: "10%", width: "62%", height: "44%", zIndex: 3, transform: "rotate(-1deg)" }}
          />
          <div className="auth-badge-chip" style={{ top: "-10px", right: "8%" }}>
            <HeroIcon.Clock />
            History that stays
          </div>
          <div className="auth-badge-chip" style={{ bottom: "-10px", left: "4%" }}>
            <Icon.Lock />
            Monthly locking
          </div>
        </div>
      </div>

      <div className="auth-features-row auth-container">
        <div className="auth-feature-card">
          <div className="auth-feature-dot">
            <HeroIcon.People />
          </div>
          <div className="auth-feature-label">Smart cost splits</div>
          <div className="auth-feature-desc">Divide expenses by % or exact amounts</div>
        </div>
        <div className="auth-feature-card">
          <div className="auth-feature-dot">
            <HeroIcon.Shield />
          </div>
          <div className="auth-feature-label">Approval workflow</div>
          <div className="auth-feature-desc">Review and approve with full control</div>
        </div>
        <div className="auth-feature-card">
          <div className="auth-feature-dot">
            <HeroIcon.Eye />
          </div>
          <div className="auth-feature-label">Complete transparency</div>
          <div className="auth-feature-desc">See who paid, who owes, always clear</div>
        </div>
        <div className="auth-feature-card">
          <div className="auth-feature-dot">
            <Icon.Lock />
          </div>
          <div className="auth-feature-label">Monthly locking</div>
          <div className="auth-feature-desc">Close the month, avoid changes later</div>
        </div>
        <div className="auth-feature-card">
          <div className="auth-feature-dot">
            <HeroIcon.Check />
          </div>
          <div className="auth-feature-label">Easy settlements</div>
          <div className="auth-feature-desc">Track payments, close the loop fast</div>
        </div>
      </div>

      <section className="auth-build-section">
        <div className="auth-build-header">
          <h2>Build for real life shared experiences.</h2>
          <p>
            Everything you need to organize shared expenses, settle balances
            and keep every participant on the same page.
          </p>
        </div>
        <div className="auth-build-grid">
          <div className="auth-build-card">
            <h3>Flexible Groups</h3>
            <p>Create expense groups for trips, homes or teams.</p>
          </div>
          <div className="auth-build-card">
            <h3>Automatic Balances</h3>
            <p>Instantly see who owes what after every expense.</p>
          </div>
          <div className="auth-build-card">
            <h3>Transparent History</h3>
            <p>Every change is visible and easy to verify.</p>
          </div>
        </div>
      </section>

      <footer className="auth-footer">
        <div>© 2026 CosTrace</div>
        <div>Privacy • Terms</div>
      </footer>

      {showAuthModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}
        >
          <div className="modal" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <img
                  src={LOGO_ICON}
                  alt="CosTrace"
                  style={{ height: "32px", objectFit: "contain", borderRadius: "6px" }}
                />
                <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowAuthModal(false)}>
                <Icon.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="auth-form-inner" style={{ maxWidth: "none" }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginBottom: "20px",
                  }}
                >
                  {mode === "login"
                    ? "Sign in to your account"
                    : "Join CosTrace for free"}
                </p>
                {error && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      color: "#ef4444",
                      marginBottom: "12px",
                    }}
                  >
                    {error}
                  </div>
                )}
                {mode === "register" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#374151",
                        marginBottom: "5px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Full name
                    </label>
                    <input
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        border: "1.5px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#374151",
                      marginBottom: "5px",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 7 10-7" />
                    </svg>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "13px 16px 13px 40px",
                        border: "1.5px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#374151",
                      marginBottom: "5px",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="........"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      style={{
                        width: "100%",
                        padding: "13px 60px 13px 40px",
                        border: "1.5px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={() => setShowPwd((p) => !p)}
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#6b7280",
                        fontFamily: "inherit",
                      }}
                    >
                      {showPwd ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={submit}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "14px",
                    border: "none",
                    background: "linear-gradient(90deg,#DC2626,#b91c1c)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "800",
                    cursor: "pointer",
                    marginBottom: "14px",
                    opacity: loading ? 0.7 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                </button>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                  <span style={{ fontSize: "13px", color: "#9ca3af" }}>or</span>
                  <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                </div>
                <button
                  onClick={async () => {
                    await sb.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: window.location.origin },
                    });
                  }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "1.5px solid #e5e7eb",
                    background: "white",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    marginBottom: "8px",
                    fontFamily: "inherit",
                    color: "#0f172a",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                {mode === "login" ? (
                  <>
                    No account?{" "}
                    <span
                      style={{ color: "#DC2626", fontWeight: "700", cursor: "pointer" }}
                      onClick={() => {
                        setMode("register");
                        setError("");
                      }}
                    >
                      Sign up free
                    </span>
                  </>
                ) : (
                  <>
                    Already have one?{" "}
                    <span
                      style={{ color: "#DC2626", fontWeight: "700", cursor: "pointer" }}
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                    >
                      Sign in
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- NEW LEDGER MODAL ----------------------------------------------------------
function NewLedgerModal({
  onClose,
  onCreate,
  currentUser,
  networkPeople = [],
  prefillMember = null,
}) {
  const [name, setName] = useState("");
  const [cover, setCover] = useState("house");
  const [req, setReq] = useState(false);
  const [members, setMembers] = useState(
    prefillMember
      ? [{ name: prefillMember, email: "", percent: "" }]
      : [{ name: "", email: "", percent: "" }]
  );
  const [selfPct, setSelfPct] = useState("");

  const totalOthers = members.reduce(
    (s, m) => s + (parseFloat(m.percent) || 0),
    0
  );
  const totalAll = totalOthers + (parseFloat(selfPct) || 0);
  const overLimit = totalAll > 100.001;
  const pctEntered = members.some((m) => m.percent) || selfPct;
  const pctOk = !pctEntered || Math.abs(totalAll - 100) < 0.01;

  const upd = (i, f, v) => {
    const n = [...members];
    n[i] = { ...n[i], [f]: v };
    setMembers(n);
  };

  // Duplicate-name guard: two members (or a member and the creator) sharing the
  // same name make the payer-matching logic in computeBalances ambiguous —
  // it has no way to tell them apart since neither has a user_id yet. Block it
  // here, before it ever becomes a ledger with mixed-up payments.
  const allNamesRaw = [
    currentUser?.full_name || "",
    ...members.map((m) => m.name),
  ];
  const nameCounts = {};
  allNamesRaw.forEach((n) => {
    const key = n.trim().toLowerCase();
    if (!key) return;
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });
  const duplicateNameKeys = Object.keys(nameCounts).filter(
    (k) => nameCounts[k] > 1
  );
  const hasDuplicateNames = duplicateNameKeys.length > 0;
  const duplicateNameLabel = (() => {
    if (!hasDuplicateNames) return "";
    const key = duplicateNameKeys[0];
    const original = allNamesRaw.find((n) => n.trim().toLowerCase() === key);
    return original ? original.trim() : key;
  })();

  const create = () => {
    if (!name.trim() || overLimit || hasDuplicateNames) return;
    const valid = members.filter((m) => m.name.trim());
    const count = valid.length + 1;
    const eq = parseFloat((100 / count).toFixed(2));
    const built = valid.map((m, i) => {
      const netMatch = networkPeople?.find((p) => p.name === m.name);
      return {
        id: `nm${i}_${Date.now()}`,
        display_name: m.name,
        share_percent: parseFloat(m.percent) || eq,
        user_id: netMatch?.user_id || null,
        is_admin: false,
        avatar: netMatch?.avatar || null,
        invited_email: m.email || netMatch?.email || null,
        joined_date: now(),
      };
    });
    const selfShare = parseFloat(selfPct) || eq;
    onCreate({
      name,
      require_approval: req,
      cover,
      members: built,
      selfShare,
      networkPeople,
    });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>New Ledger</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input
              placeholder="e.g. Household, Trip, Kids..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category / Cover */}
          <div className="form-group">
            <label>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {COVERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCover(c.id);
                    if (!name.trim()) setName(c.label);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 11px",
                    borderRadius: "10px",
                    border: `1.5px solid ${
                      cover === c.id ? "#1F2937" : "var(--border)"
                    }`,
                    background: cover === c.id ? "#1F2937" : "white",
                    color: cover === c.id ? "white" : "var(--text2)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      background: c.bg,
                      flexShrink: 0,
                    }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Your share ({currentUser?.full_name || "You"})</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                className="pct-input"
                placeholder="%"
                value={selfPct}
                onChange={(e) => setSelfPct(e.target.value)}
                style={{
                  width: "80px",
                  padding: "10px",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--mono)",
                  fontSize: "14px",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "13px", color: "var(--text3)" }}>
                % (leave empty for equal split)
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Members</label>
            <div className="members-list">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="member-row"
                  style={{ position: "relative" }}
                >
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      placeholder={`Name ${i + 1}`}
                      value={m.name}
                      onChange={(e) => upd(i, "name", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1.5px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {/* Network autocomplete */}
                    {m.name.trim().length >= 1 &&
                      (() => {
                        const q = m.name.toLowerCase();
                        const hits = networkPeople.filter(
                          (p) =>
                            p.name.toLowerCase().includes(q) &&
                            p.name.toLowerCase() !== q
                        );
                        if (!hits.length) return null;
                        return (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 2px)",
                              left: 0,
                              right: 0,
                              zIndex: 200,
                              background: "white",
                              border: "1.5px solid var(--accent)",
                              borderRadius: "10px",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                              overflow: "hidden",
                            }}
                          >
                            {hits.slice(0, 5).map((p, pi) => (
                              <div
                                key={pi}
                                onClick={() => upd(i, "name", p.name)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "9px 12px",
                                  cursor: "pointer",
                                  borderBottom:
                                    pi < hits.length - 1
                                      ? "1px solid var(--border)"
                                      : "none",
                                  background: "white",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "var(--accent-light)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "white")
                                }
                              >
                                <div
                                  className="stmt-av av0"
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    fontSize: "9px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials(p.name)}
                                </div>
                                {p.name}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                  </div>
                  <input
                    placeholder="Email"
                    value={m.email}
                    onChange={(e) => upd(i, "email", e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <input
                    className="pct-input"
                    placeholder="%"
                    value={m.percent}
                    onChange={(e) => upd(i, "percent", e.target.value)}
                    style={{
                      width: "60px",
                      padding: "10px",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                  {members.length > 1 && (
                    <button
                      className="btn-icon"
                      onClick={() =>
                        setMembers(members.filter((_, j) => j !== i))
                      }
                    >
                      <Icon.X />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="add-member-btn"
              onClick={() =>
                setMembers([...members, { name: "", email: "", percent: "" }])
              }
            >
              <Icon.Plus /> Add member
            </button>
            {pctEntered && (
              <div
                className={
                  overLimit ? "pct-error" : pctOk ? "pct-ok" : "pct-warn"
                }
              >
                {overLimit
                  ? `! Total ${totalAll.toFixed(1)}% — cannot exceed 100%`
                  : pctOk
                  ? "✓ OK"
                  : `Total: ${totalAll.toFixed(1)}% (must equal 100%)`}
              </div>
            )}
            {hasDuplicateNames && (
              <div className="pct-error">
                ! "{duplicateNameLabel}" is used more than once — every member
                needs a different name.
              </div>
            )}
            <p className="tip">
              Leave % empty for equal split. You can customize cover & style
              later in Settings.
            </p>
          </div>

          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={req}
              onChange={(e) => setReq(e.target.checked)}
            />
            <span>Require approval for each expense</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={create}
            disabled={!name.trim() || overLimit || hasDuplicateNames}
          >
            Create →
          </button>
        </div>
      </div>
    </div>
  );
}

// -- ADD EXPENSE MODAL ---------------------------------------------------------
function AddExpenseModal({
  ledger,
  currentUser,
  onClose,
  onAdd,
  currency = "RSD",
  canPayout = false,
}) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [notMe, setNotMe] = useState(false);
  const [paidById, setPaidById] = useState("");
  const [isSettle, setIsSettle] = useState(false);
  const [isPayout, setIsPayout] = useState(false);
  const [showPayoutInfo, setShowPayoutInfo] = useState(false);
  const [payoutOffset, setPayoutOffset] = useState(true); // default: reduces balances
  const [payoutRecord, setPayoutRecord] = useState(false); // record only, no balance effect
  const [paidToId, setPaidToId] = useState("");
  const [overrideSplits, setOverrideSplits] = useState(false);
  // Unique descriptions from this ledger (most recent first, exclude settlements)
  const PAYOUT_SUGGESTIONS = [
    "Rental income",
    "Concert fee",
    "Project payment",
    "Sales revenue",
    "Freelance payment",
    "Sponsorship",
    "Dividend",
    "Commission",
    "License fee",
    "Sublease income",
  ];
  const descSuggestions = [
    ...new Set(
      [...ledger.expenses]
        .filter((e) => !e.is_settlement && e.description)
        .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
        .map((e) => e.description)
    ),
  ].slice(0, 20);
  const [splits, setSplits] = useState(
    ledger.members
      .filter((m) => !m.is_spectator)
      .map((m) => ({
        member_id: m.id,
        share_percent: m.share_percent,
        included: true,
      }))
  );

  const totalSplitPct = splits
    .filter((s) => s.included)
    .reduce((sum, s) => sum + (parseFloat(s.share_percent) || 0), 0);
  const overLimit = totalSplitPct > 100.001;
  const splitsOk = Math.abs(totalSplitPct - 100) < 0.01;
  const payer = notMe
    ? ledger.members.find((m) => m.id === paidById)
    : ledger.members.find((m) => m.user_id === currentUser.id);
  const activeMembers = ledger.members.filter((m) => !m.is_spectator);
  const multiMember = activeMembers.length > 2;

  // Compute pairwise debts using creditor/debtor matching
  const balances = computeBalances(
    ledger,
    ledger.expenses.filter((e) => e.approval_status === "approved")
  );
  const debtors = [
    ...balances
      .filter((b) => b.net < -0.01)
      .map((b) => ({ ...b, rem: -b.net })),
  ].sort((a, b) => b.rem - a.rem);
  const creditors = [
    ...balances.filter((b) => b.net > 0.01).map((b) => ({ ...b, rem: b.net })),
  ].sort((a, b) => b.rem - a.rem);
  const allDebts = [];
  let di = 0,
    ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di],
      c = creditors[ci];
    const amt = Math.min(d.rem, c.rem);
    if (amt > 0.01)
      allDebts.push({
        from: d.id,
        to: c.id,
        fromName: d.display_name,
        toName: c.display_name,
        amount: amt,
      });
    d.rem -= amt;
    c.rem -= amt;
    if (d.rem < 0.01) di++;
    if (c.rem < 0.01) ci++;
  }
  // Debts relevant to the current payer
  const myDebts = payer ? allDebts.filter((d) => d.from === payer.id) : [];

  // Only members who are in the positive (creditors) can receive a settlement
  const creditorMembers = activeMembers.filter((m) => {
    const b = balances.find((bb) => bb.id === m.id);
    return b && b.net > 0.01 && m.id !== payer?.id;
  });
  // Max amount payer can settle to selected recipient
  const selectedDebt = paidToId ? myDebts.find((d) => d.to === paidToId) : null;
  const maxSettle = selectedDebt ? selectedDebt.amount : null;
  const overMaxSettle =
    isSettle && amount && maxSettle && parseFloat(amount) > maxSettle + 0.01;

  const handleAdd = () => {
    if (!desc.trim() || !amount) return;
    if (isSettle && multiMember && !paidToId) return;
    if (overMaxSettle) return;
    const amt = parseFloat(amount);
    let finalSplits;
    if (isSettle) {
      const creditors =
        multiMember && paidToId
          ? ledger.members.filter((m) => m.id === paidToId)
          : ledger.members.filter((m) => m.id !== payer?.id && !m.is_spectator);
      finalSplits = creditors.length
        ? creditors.map((c) => ({
            member_id: c.id,
            share_percent: 100 / creditors.length,
            amount_owed: amt / creditors.length,
          }))
        : [];
    } else {
      const active = splits.filter((s) => s.included);
      const tp = active.reduce(
        (s, sp) => s + parseFloat(sp.share_percent || 0),
        0
      );
      finalSplits = active.map((s) => ({
        member_id: s.member_id,
        share_percent: parseFloat(s.share_percent),
        amount_owed: parseFloat(((s.share_percent / tp) * amt).toFixed(2)),
      }));
    }
    const pm = ledger.payout_mode || "offset_ledger";
    onAdd({
      id: `e${Date.now()}`,
      description: desc,
      amount: amt,
      paid_by_name: payer?.display_name || currentUser.full_name,
      // Only fall back to currentUser.id when there's truly no payer selected.
      // If a payer IS selected but has no account (user_id is null — a virtual
      // member like Vesna before she signs up), keep it null. Falling back to
      // currentUser.id here was silently reattributing the payment to whoever
      // is logged in, instead of the member actually picked in "Someone else paid".
      paid_by_id: payer ? payer.user_id || null : currentUser.id,
      expense_date: now(),
      approval_status:
        ledger.require_approval && !isSettle && !isPayout
          ? "pending"
          : "approved",
      is_settlement: isSettle,
      is_payout: isPayout,
      payout_mode: isPayout ? pm : undefined,
      splits: finalSplits,
    });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>
            {isPayout ? "Payout" : isSettle ? " Settlement" : " Add Expense"}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
            <button
              className={`btn${
                !isSettle && !isPayout ? " btn-primary" : " btn-secondary"
              }`}
              style={{ flex: 1, fontSize: "12px" }}
              onClick={() => {
                setIsSettle(false);
                setIsPayout(false);
              }}
            >
              Expense
            </button>
            <button
              className={`btn${isSettle ? " btn-settle" : " btn-secondary"}`}
              style={{ flex: 1, fontSize: "12px" }}
              onClick={() => {
                setIsSettle(true);
                setIsPayout(false);
              }}
            >
              Settlement
            </button>
            {canPayout && (
              <button
                className={`btn${isPayout ? " btn-primary" : " btn-secondary"}`}
                style={{
                  flex: 1,
                  fontSize: "12px",
                  background: isPayout ? "#d97706" : undefined,
                  borderColor: isPayout ? "#d97706" : undefined,
                  color: isPayout ? "white" : undefined,
                }}
                onClick={() => {
                  setIsPayout(true);
                  setIsSettle(false);
                }}
              >
                Payout
              </button>
            )}
          </div>
          {isSettle && myDebts.length > 0 && (
            <div
              style={{
                background: "var(--settle-light)",
                border: "1.5px solid #6ee7b7",
                borderRadius: "var(--radius-sm)",
                padding: "10px 13px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--settle)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Current balances
              </div>
              {myDebts.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "var(--text2)",
                    marginBottom: "3px",
                  }}
                >
                  <span>
                    You owe <strong>{d.toName}</strong>
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: "700",
                      color: "var(--settle)",
                    }}
                  >
                    {fmtAmt(d.amount)} {currency}
                  </span>
                </div>
              ))}
            </div>
          )}
          {isSettle && (
            <div
              style={{
                background: "var(--settle-light)",
                border: "1.5px solid #6ee7b7",
                borderRadius: "var(--radius-sm)",
                padding: "11px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "var(--settle)",
                fontWeight: "500",
              }}
            >
              Settlement reduces debt — doesn't add to shared expenses.
            </div>
          )}
          <div className="form-group">
            <label>Description</label>
            <div style={{ position: "relative" }}>
              <input
                placeholder={
                  isPayout
                    ? "Rental income, concert fee, project payment, sales revenue..."
                    : isSettle
                    ? "Cash payment, transfer..."
                    : "Groceries, utilities..."
                }
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {(() => {
                if (isPayout && desc.trim().length === 0) {
                  return null;
                }
                if (desc.trim().length >= 1) {
                  const q = desc.toLowerCase();
                  const pool = isPayout ? PAYOUT_SUGGESTIONS : descSuggestions;
                  const matches = pool.filter(
                    (d) => d.toLowerCase().includes(q) && d.toLowerCase() !== q
                  );
                  if (!matches.length) return null;
                  return (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 2px)",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: "white",
                        border: `1.5px solid ${
                          isPayout ? "#d97706" : "var(--accent)"
                        }`,
                        borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      {matches.slice(0, 6).map((d, i) => (
                        <div
                          key={i}
                          onClick={() => setDesc(d)}
                          style={{
                            padding: "9px 14px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: isPayout ? "#92400e" : "var(--text)",
                            borderBottom:
                              i < Math.min(matches.length, 6) - 1
                                ? "1px solid var(--border)"
                                : "none",
                            background: "white",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = isPayout
                              ? "#fffbeb"
                              : "var(--accent-light)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "white")
                          }
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
          <div className="form-group">
            <label>
              Amount ({currency})
              {isSettle && maxSettle && (
                <span
                  style={{
                    float: "right",
                    fontSize: "11px",
                    color: "var(--settle)",
                    fontWeight: "600",
                  }}
                >
                  max {fmtAmt(maxSettle)}
                </span>
              )}
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={maxSettle || undefined}
              style={{
                fontFamily: "var(--mono)",
                borderColor: overMaxSettle ? "var(--danger)" : undefined,
              }}
            />
            {overMaxSettle && (
              <p
                className="tip"
                style={{ color: "var(--danger)", marginTop: "4px" }}
              >
                Cannot exceed debt of {fmtAmt(maxSettle)} {currency}
              </p>
            )}
          </div>
          <label className="checkbox-wrap" style={{ marginBottom: "12px" }}>
            <input
              type="checkbox"
              checked={notMe}
              onChange={(e) => setNotMe(e.target.checked)}
            />
            <span>
              {isPayout
                ? "Someone else received the money"
                : "Someone else paid"}
            </span>
          </label>
          {notMe && (
            <div className="form-group">
              <label>
                {isPayout ? "Who received the money?" : "Who paid?"}
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
              >
                <option value="">Select...</option>
                {ledger.members
                  .filter(
                    (m) =>
                      m.user_id !== currentUser.id &&
                      !m.is_spectator &&
                      (!isSettle ||
                        balances.find((b) => b.id === m.id)?.net < -0.01)
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {isSettle && multiMember && (
            <div className="form-group">
              <label>
                Paid to{" "}
                <span style={{ color: "var(--danger)", fontWeight: "800" }}>
                  *
                </span>
              </label>
              <select
                value={paidToId}
                onChange={(e) => setPaidToId(e.target.value)}
                style={{ borderColor: !paidToId ? "#fca5a5" : "#6ee7b7" }}
              >
                <option value="">Select recipient...</option>
                {creditorMembers.map((m) => {
                  const debt = myDebts.find((d) => d.to === m.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                      {debt ? ` — owe ${fmtAmt(debt.amount)} ` + currency : ""}
                    </option>
                  );
                })}
              </select>
              {!paidToId && (
                <p
                  className="tip"
                  style={{ marginTop: "5px", color: "var(--danger)" }}
                >
                  Required — select who receives this payment.
                </p>
              )}
            </div>
          )}
          {isPayout && (
            <div
              style={{
                background: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: "var(--radius-sm)",
                marginBottom: "12px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowPayoutInfo((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 13px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "12px",
                    color: "#b45309",
                  }}
                >
                  <span>💸</span>
                  <span>
                    Handled as:{" "}
                    <strong>
                      {
                        {
                          offset_ledger: "Reduce debt (ledger %)",
                          offset_custom: "Reduce debt (custom %)",
                          record_no_split: "Record only",
                          record_ledger: "Record (ledger %)",
                          record_custom: "Record (custom %)",
                        }[ledger.payout_mode || "offset_ledger"]
                      }
                    </strong>
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "#b45309" }}>
                  {showPayoutInfo ? "▲" : "▼"}
                </span>
              </button>
              {showPayoutInfo && (
                <div
                  style={{
                    padding: "0 13px 10px",
                    fontSize: "12px",
                    color: "#92400e",
                    lineHeight: 1.5,
                    borderTop: "1px solid #fde68a",
                  }}
                >
                  <div style={{ paddingTop: "8px", marginBottom: "6px" }}>
                    Distribution mode is set per ledger. You can change it in{" "}
                    <strong>Ledger Settings → Payout options</strong>.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {[
                      {
                        id: "offset_ledger",
                        label: "Reduce debt (ledger %)",
                        desc: "Income reduces balances by ledger share",
                      },
                      {
                        id: "offset_custom",
                        label: "Reduce debt (custom %)",
                        desc: "Income reduces balances by custom key",
                      },
                      {
                        id: "record_no_split",
                        label: "Record only",
                        desc: "Logs income, no effect on balances",
                      },
                      {
                        id: "record_ledger",
                        label: "Record (ledger %)",
                        desc: "Logs with ledger % distribution",
                      },
                      {
                        id: "record_custom",
                        label: "Record (custom %)",
                        desc: "Logs with custom distribution",
                      },
                    ].map((o) => (
                      <div
                        key={o.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          opacity:
                            (ledger.payout_mode || "offset_ledger") === o.id
                              ? 1
                              : 0.5,
                        }}
                      >
                        <span
                          style={{
                            color:
                              (ledger.payout_mode || "offset_ledger") === o.id
                                ? "#d97706"
                                : "transparent",
                            fontWeight: "800",
                          }}
                        >
                          →
                        </span>
                        <span
                          style={{
                            fontWeight:
                              (ledger.payout_mode || "offset_ledger") === o.id
                                ? "700"
                                : "400",
                          }}
                        >
                          {o.label}
                        </span>
                        <span style={{ color: "#b45309" }}>— {o.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!isSettle && (
            <>
              <label className="checkbox-wrap" style={{ marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={overrideSplits}
                  onChange={(e) => setOverrideSplits(e.target.checked)}
                />
                <span>
                  Custom split for this {isPayout ? "payout" : "expense"}
                </span>
              </label>
              {overrideSplits && (
                <div className="split-override">
                  <h4>Split breakdown</h4>
                  {ledger.members
                    .filter((m) => !m.is_spectator)
                    .map((m, i) => {
                      const sp = splits[i];
                      return (
                        <div key={m.id} className="split-row">
                          <label
                            className="checkbox-wrap"
                            style={{ margin: 0, flex: 1 }}
                          >
                            <input
                              type="checkbox"
                              checked={sp.included}
                              onChange={(e) => {
                                const n = [...splits];
                                n[i] = { ...sp, included: e.target.checked };
                                setSplits(n);
                              }}
                            />
                            <span>{m.display_name}</span>
                          </label>
                          <input
                            value={sp.share_percent}
                            disabled={!sp.included}
                            onChange={(e) => {
                              const n = [...splits];
                              n[i] = { ...sp, share_percent: e.target.value };
                              setSplits(n);
                            }}
                            style={{
                              width: "64px",
                              fontFamily: "var(--mono)",
                              padding: "7px",
                              border: "1.5px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: "13px",
                              textAlign: "center",
                              outline: "none",
                            }}
                          />
                          <span
                            style={{ fontSize: "12px", color: "var(--text3)" }}
                          >
                            %
                          </span>
                        </div>
                      );
                    })}
                  <div
                    className={
                      overLimit ? "pct-error" : splitsOk ? "pct-ok" : "pct-warn"
                    }
                    style={{ marginTop: "6px" }}
                  >
                    {overLimit
                      ? `! Total ${totalSplitPct.toFixed(
                          1
                        )}%  -  cannot exceed 100%`
                      : splitsOk
                      ? "v 100%"
                      : `Total: ${totalSplitPct.toFixed(1)}%`}
                  </div>
                </div>
              )}
              {ledger.require_approval && (
                <p
                  className="tip"
                  style={{ marginTop: "8px", color: "var(--warning)" }}
                >
                  ! Expense will be pending until approved by members.
                </p>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${
              isSettle ? "btn-settle" : isPayout ? "btn-primary" : "btn-primary"
            }`}
            style={
              isPayout ? { background: "#d97706", borderColor: "#d97706" } : {}
            }
            onClick={handleAdd}
            disabled={
              !desc.trim() ||
              !amount ||
              (overrideSplits && (overLimit || !splitsOk)) ||
              (isSettle && multiMember && !paidToId)
            }
          >
            {isSettle ? "Confirm" : isPayout ? "Add Payout" : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- LEDGER SETTINGS -----------------------------------------------------------
function LedgerSettingsModal({
  ledger,
  currentUser,
  onClose,
  onUpdate,
  onArchive,
  isSoloDeletable,
  onRequestDelete,
  onExecuteDelete,
  userPlan,
  onShowUpgrade,
  allLedgers = [],
  onLeave,
}) {
  const plan = userPlan || PLANS.free;
  // All unique people from other ledgers (network)
  const networkPeople = [];
  const seen = new Set(ledger.members.map((m) => m.display_name));
  allLedgers.forEach((l) => {
    l.members.forEach((m) => {
      if (!seen.has(m.display_name) && m.display_name) {
        seen.add(m.display_name);
        networkPeople.push({
          name: m.display_name,
          email: m.invited_email || null,
          plan: m.plan || "free",
          user_id: m.user_id || null,
          avatar: m.avatar || null,
        });
      }
    });
  });
  const isLedgerAdmin = ledger.members.some(
    (m) => m.user_id === currentUser.id && m.is_admin
  );
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  // Non-admin: read-only settings view
  if (!isLedgerAdmin) {
    return (
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal">
          <div className="modal-header">
            <h2>Ledger settings</h2>
            <button className="btn-icon" onClick={onClose}>
              <Icon.X />
            </button>
          </div>
          <div className="modal-body">
            {/* Read-only info */}
            <div
              style={{
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "var(--text2)",
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  color: "var(--text)",
                  marginBottom: "6px",
                }}
              >
                {ledger.name}
              </div>
              <div style={{ marginBottom: "3px" }}>
                Category:{" "}
                <strong>
                  {COVERS.find((c) => c.id === ledger.cover)?.label ||
                    ledger.cover}
                </strong>
              </div>
              <div style={{ marginBottom: "3px" }}>
                Approval required:{" "}
                <strong>{ledger.require_approval ? "Yes" : "No"}</strong>
              </div>
              <div>
                Auto-lock: <strong>{ledger.auto_lock !== false ? "Yes" : "No"}</strong>
              </div>
              <div>
                Carry over balance:{" "}
                <strong>{ledger.carry_balance ? "Yes" : "No"}</strong>
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "10px",
                }}
              >
                Members
              </div>
              {ledger.members.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {m.avatar && AVATARS.find((a) => a.id === m.avatar) ? (
                    <img
                      src={AVATARS.find((a) => a.id === m.avatar).src}
                      alt=""
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className={`stmt-av av${i % 10}`}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        fontSize: "11px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {initials(m.display_name)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text)",
                      }}
                    >
                      {m.display_name}
                      {i === 0 ? " (admin)" : ""}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                      {m.is_spectator ? "Viewer" : `${m.share_percent}% share`}
                    </div>
                  </div>
                  {m.user_id === currentUser.id && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "var(--accent)",
                        background: "var(--accent-light)",
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Leave ledger */}
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#dc2626",
                  marginBottom: "4px",
                }}
              >
                Leave ledger
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#b91c1c",
                  marginBottom: "12px",
                  lineHeight: 1.5,
                }}
              >
                You'll lose access to this ledger. Your expense history stays
                intact and your name remains as a virtual member — nothing
                changes for other members.
              </div>
              {!leaveConfirm ? (
                <button
                  className="btn"
                  style={{
                    background: "var(--danger)",
                    color: "white",
                    border: "none",
                    fontSize: "13px",
                  }}
                  onClick={() => setLeaveConfirm(true)}
                >
                  Leave ledger
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setLeaveConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{
                      flex: 1,
                      background: "var(--danger)",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => {
                      onClose();
                      onLeave && onLeave(ledger.id);
                    }}
                  >
                    Yes, leave
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sBals = computeBalances(
    ledger,
    ledger.expenses.filter((e) => e.approval_status !== "denied")
  );
  const sUnsettled = sBals.some((b) => Math.abs(b.net) > 0.01);
  const [archConfirm, setArchConfirm] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [delUnsettledAck, setDelUnsettledAck] = useState(false);
  const [soloWord, setSoloWord] = useState("");
  const solo = isSoloDeletable ? isSoloDeletable(ledger) : false;
  const [name, setName] = useState(ledger.name);
  const [req, setReq] = useState(ledger.require_approval);
  const [notifEnabled, setNotifEnabled] = useState(
    ledger.notifications_enabled !== false
  );
  const [autoLock, setAutoLock] = useState(ledger.auto_lock !== false);
  const [carryBalance, setCarryBalance] = useState(
    ledger.carry_balance || false
  );
  // Payout mode: "offset_ledger" | "offset_custom" | "record_no_split" | "record_ledger" | "record_custom"
  const [payoutMode, setPayoutMode] = useState(
    ledger.payout_mode || "offset_ledger"
  );
  const [payoutCustomSplits, setPayoutCustomSplits] = useState(
    ledger.payout_custom_splits ||
      ledger.members
        .filter((m) => !m.is_spectator)
        .map((m) => ({ member_id: m.id, share_percent: m.share_percent }))
  );
  const [selectedCover, setSelectedCover] = useState(ledger.cover || "house");
  const [members, setMembers] = useState(
    ledger.members.map((m) => ({ ...m, pct: String(m.share_percent) }))
  );
  const [newM, setNewM] = useState({ name: "", email: "", pct: "" });
  const [removingMember, setRemovingMember] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverColor, setCoverColor] = useState(ledger.coverColor || null);
  const [labelColor, setLabelColor] = useState(ledger.labelColor || null);
  const [customLabel, setCustomLabel] = useState(ledger.customLabel || "");
  const [showStyle, setShowStyle] = useState(false);
  const canCustomizeColor = true; // all plans can pick themes (limited by themeLimit)
  const canCustomizeLabel = plan.id === "gold";
  // 18 professional themes — tiered by plan
  const ALL_THEMES = [
    { name: "Household", bg: "linear-gradient(135deg,#465A78,#5B6C8F)" },
    { name: "Family", bg: "linear-gradient(135deg,#8F525B,#B76E79)" },
    { name: "Travel", bg: "linear-gradient(135deg,#1B2638,#243447)" },
    { name: "Colleagues", bg: "linear-gradient(135deg,#5A7260,#6E8B74)" },
    { name: "Fitness", bg: "linear-gradient(135deg,#A86119,#D07A1F)" },
    { name: "Friends", bg: "linear-gradient(135deg,#1F6780,#2A7F9E)" },
    // Bronze (12)
    { name: "Parents", bg: "linear-gradient(135deg,#9E875F,#B89B72)" },
    { name: "Construction", bg: "linear-gradient(135deg,#874A36,#A65D45)" },
    { name: "Roommates", bg: "linear-gradient(135deg,#3D5770,#4F6D8A)" },
    { name: "Wedding", bg: "linear-gradient(135deg,#BCA989,#D6C3A3)" },
    { name: "Baby", bg: "linear-gradient(135deg,#90B29E,#A8C7B5)" },
    { name: "Pets", bg: "linear-gradient(135deg,#627247,#7B8D5B)" },
    // Silver (18)
    { name: "Charcoal", bg: "linear-gradient(135deg,#2C3E50,#374151)" },
    { name: "Espresso", bg: "linear-gradient(135deg,#4A3728,#6B5344)" },
    { name: "Forest", bg: "linear-gradient(135deg,#2E4A3E,#3D6B5A)" },
    { name: "Plum", bg: "linear-gradient(135deg,#5C4A72,#7B6499)" },
    { name: "Terracotta", bg: "linear-gradient(135deg,#7A4F3A,#A0674D)" },
    { name: "Steel", bg: "linear-gradient(135deg,#3A5A6B,#4E7A8F)" },
  ];
  const themeLimit =
    plan.id === "free"
      ? 6
      : plan.id === "light"
      ? 12
      : plan.id === "regular"
      ? 18
      : 18;
  const COLOR_PRESETS = ALL_THEMES; // keep alias for reset button
  const LABEL_PRESETS = [
    "#ffffff",
    "#111827",
    "#f59e0b",
    "#3b82f6",
    "#10b981",
    "#ef4444",
    "#8b5cf6",
    "#f43f5e",
  ];
  const [cardColor, setCardColor] = useState(ledger.cardColor || null);
  const CARD_COLORS = [
    null,
    "#fef2f2",
    "#fff7ed",
    "#fefce8",
    "#f0fdf4",
    "#ecfdf5",
    "#f0f9ff",
    "#eff6ff",
    "#f5f3ff",
    "#fdf4ff",
    "#fce7f3",
    "#f3f4f6",
    "#1e293b",
  ];

  const total = members.reduce((s, m) => s + (parseFloat(m.pct) || 0), 0);
  const over = total > 100.001;
  const ok = Math.abs(total - 100) < 0.01;
  const currentCover = COVERS.find((c) => c.id === selectedCover) || COVERS[0];

  const save = () => {
    if (over || !name.trim()) return;
    const changeDate = now();
    const updatedMembers = members.map((m) => {
      const newPct = parseFloat(m.pct) || m.share_percent;
      const oldPct = ledger.members.find((lm) => lm.id === m.id)?.share_percent;
      // Record share_history if percent changed for existing member
      const history = m.share_history || [];
      const changed = oldPct !== undefined && Math.abs(oldPct - newPct) > 0.01;
      return {
        ...m,
        share_percent: newPct,
        share_history: changed
          ? [...history, { from: oldPct, to: newPct, date: changeDate }]
          : history,
      };
    });
    onUpdate({
      ...ledger,
      name,
      require_approval: req,
      cover: selectedCover,
      notifications_enabled: notifEnabled,
      auto_lock: autoLock,
      carry_balance: carryBalance,
      payout_mode: payoutMode,
      payout_custom_splits:
        payoutMode === "offset_custom" || payoutMode === "record_custom"
          ? payoutCustomSplits
          : undefined,
      cardColor,
      coverColor: coverColor || undefined,
      labelColor: labelColor || undefined,
      customLabel: customLabel || undefined,
      members: updatedMembers,
    });
    onClose();
  };
  // Duplicate-name guard — same reasoning as in NewLedgerModal: two members
  // with the same name can't be told apart once neither has a user_id, and
  // computeBalances' payer-matching would attribute payments to the wrong one.
  const isDuplicateNewMemberName = (() => {
    const key = newM.name.trim().toLowerCase();
    if (!key) return false;
    return members.some((m) => m.display_name.trim().toLowerCase() === key);
  })();

  const addM = () => {
    if (!newM.name.trim()) return;
    if (isDuplicateNewMemberName) return;
    const activeCurrent = members.filter((m) => !m.is_spectator);
    if (plan.maxMembers && activeCurrent.length >= plan.maxMembers) {
      onShowUpgrade && onShowUpgrade();
      return;
    }
    const newCount = activeCurrent.length + 1;
    const eq = parseFloat((100 / newCount).toFixed(2));
    const redistributed = members.map((m) =>
      m.is_spectator ? m : { ...m, share_percent: eq, pct: String(eq) }
    );
    const customPct = newM.pct.trim() ? parseFloat(newM.pct) : null;
    const netMatch = networkPeople.find((p) => p.name === newM.name.trim());
    const newMember = {
      id: `nm_${Date.now()}`,
      display_name: newM.name,
      share_percent: customPct || eq,
      user_id: netMatch?.user_id || null,
      avatar: netMatch?.avatar || null,
      joined_date: now(),
      pct: String(customPct || eq),
      share_history: [],
    };
    setMembers([...redistributed, newMember]);
    setNewM({ name: "", email: "", pct: "" });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Cover & Style — single collapsible */}
          {
            <div style={{ marginBottom: "10px" }}>
              <button
                onClick={() => setShowStyle((p) => !p)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border)",
                  background: "var(--bg)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: coverColor || currentCover.bg,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "var(--text)",
                      }}
                    >
                      Cover & Style
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                      {customLabel || currentCover.label}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  {showStyle ? "▲" : "▼"}
                </span>
              </button>
              {showStyle && (
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1.5px solid var(--border)",
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    padding: "14px",
                  }}
                >
                  {/* Cover image picker */}
                  <div className="form-group">
                    <label>Cover image</label>
                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        gap: "10px",
                        padding: "10px 14px",
                      }}
                      onClick={() => setShowCoverPicker(!showCoverPicker)}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          background: currentCover.bg,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {currentCover.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                        {showCoverPicker ? "hide" : "show"}
                      </span>
                    </button>
                    {showCoverPicker && (
                      <div style={{ marginTop: "8px" }}>
                        <div className="cover-grid">
                          {COVERS.map((c) => (
                            <div
                              key={c.id}
                              className={`cover-opt-wrap${
                                selectedCover === c.id ? " selected" : ""
                              }`}
                              onClick={() => {
                                setSelectedCover(c.id);
                                setShowCoverPicker(false);
                              }}
                            >
                              <div
                                className="cover-opt"
                                style={{ background: c.bg }}
                              />
                              <div className="cover-opt-label">{c.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cover theme — tiered */}
                  <div className="form-group">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Cover theme</span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text3)",
                          fontWeight: "500",
                        }}
                      >
                        {themeLimit === 18
                          ? "All 18 themes"
                          : themeLimit + " of 18 themes"}
                      </span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        padding: "4px 0",
                      }}
                    >
                      {/* Reset to category default */}
                      <div
                        onClick={() => setCoverColor(null)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                          opacity: 1,
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: currentCover.bg,
                            border: !coverColor
                              ? "3px solid #1F2937"
                              : "2px solid #e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            color: "white",
                            fontWeight: "800",
                            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                            flexShrink: 0,
                          }}
                        >
                          ↺
                        </div>
                        <span
                          style={{
                            fontSize: "9px",
                            color: "var(--text3)",
                            fontWeight: "600",
                            textAlign: "center",
                            lineHeight: 1.2,
                            maxWidth: "44px",
                          }}
                        >
                          Default
                        </span>
                      </div>
                      {/* Theme swatches */}
                      {ALL_THEMES.map((theme, i) => {
                        const locked = i >= themeLimit;
                        const isActive = coverColor === theme.bg;
                        return (
                          <div
                            key={i}
                            onClick={() =>
                              locked
                                ? onShowUpgrade && onShowUpgrade()
                                : setCoverColor(theme.bg)
                            }
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "4px",
                              cursor: locked ? "not-allowed" : "pointer",
                              opacity: locked ? 0.45 : 1,
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: theme.bg,
                                border: isActive
                                  ? "3px solid #1F2937"
                                  : "2px solid transparent",
                                boxShadow: isActive
                                  ? "0 0 0 1px #1F2937"
                                  : "0 1px 4px rgba(0,0,0,0.15)",
                                flexShrink: 0,
                                position: "relative",
                              }}
                            >
                              {locked && (
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.5)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                  }}
                                >
                                  🔒
                                </div>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: "9px",
                                color: isActive
                                  ? "var(--text)"
                                  : "var(--text3)",
                                fontWeight: isActive ? "700" : "500",
                                textAlign: "center",
                                lineHeight: 1.2,
                                maxWidth: "44px",
                              }}
                            >
                              {theme.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {themeLimit < 18 && (
                      <p className="tip" style={{ marginTop: "6px" }}>
                        {themeLimit === 6
                          ? "Upgrade to Bronze for 12 themes, Silver for all 18."
                          : themeLimit === 12
                          ? "Upgrade to Silver for all 18 themes."
                          : ""}{" "}
                        <span
                          style={{
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                          onClick={() => onShowUpgrade && onShowUpgrade()}
                        >
                          Upgrade →
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Custom label — Gold only */}
                  <div className="form-group">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Category name
                      <span
                        style={{
                          fontSize: "10px",
                          background: "#b45309",
                          color: "white",
                          padding: "1px 6px",
                          borderRadius: "20px",
                        }}
                      >
                        Gold
                      </span>
                    </label>
                    {canCustomizeLabel ? (
                      <>
                        <input
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder={`Default: ${currentCover.label}`}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1.5px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "13px",
                            fontFamily: "inherit",
                            outline: "none",
                          }}
                        />
                        <p className="tip" style={{ marginTop: "4px" }}>
                          Leave empty for default name.
                        </p>
                      </>
                    ) : (
                      <p className="tip">
                        Upgrade to Gold to rename the category.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          }
          <div className="settings-section">
            <div className="settings-body">
              <div className="settings-row" style={{ paddingTop: 0 }}>
                <div>
                  <div className="settings-label">Require approval</div>
                  <div className="settings-sub">
                    Members must approve each expense
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={req}
                    onChange={(e) => setReq(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-label">Notifications</div>
                  <div className="settings-sub">
                    Get notified on new expenses, approvals, lock
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifEnabled}
                    onChange={(e) => setNotifEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-label">Auto-lock months</div>
                  <div className="settings-sub">
                    Past months lock automatically when the next month begins
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={autoLock}
                    onChange={(e) => setAutoLock(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-label">
                    Carry over balance to next month
                  </div>
                  <div className="settings-sub">
                    When a month is locked, each member's +/- is recorded as a
                    "Carry-over" entry at the start of the next month, instead
                    of resetting to 0
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={carryBalance}
                    onChange={(e) => setCarryBalance(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          {/* PAYOUT OPTIONS — Gold / Payout Pass only */}
          {hasPayoutsAccess(userPlan, ledger, currentUser) &&
            (() => {
              const isOffset =
                payoutMode === "offset_ledger" ||
                payoutMode === "offset_custom";
              const isRecord =
                payoutMode === "record_no_split" ||
                payoutMode === "record_ledger" ||
                payoutMode === "record_custom";
              const renderCustomSplits = () => {
                const active = ledger.members.filter((m) => !m.is_spectator);
                const total = payoutCustomSplits.reduce(
                  (s, sp) => s + (parseFloat(sp.share_percent) || 0),
                  0
                );
                const over = total > 100.001;
                const ok = Math.abs(total - 100) < 0.01;
                return (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "white",
                      borderRadius: "10px",
                      border: "1.5px solid #fde68a",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#92400e",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      Custom distribution %
                    </div>
                    {active.map((m) => {
                      const sp = payoutCustomSplits.find(
                        (s) => s.member_id === m.id
                      ) || { share_percent: 0 };
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text)",
                            }}
                          >
                            {m.display_name}
                          </span>
                          <input
                            value={sp.share_percent}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPayoutCustomSplits((prev) =>
                                prev.some((s) => s.member_id === m.id)
                                  ? prev.map((s) =>
                                      s.member_id === m.id
                                        ? { ...s, share_percent: v }
                                        : s
                                    )
                                  : [
                                      ...prev,
                                      { member_id: m.id, share_percent: v },
                                    ]
                              );
                            }}
                            style={{
                              width: "64px",
                              fontFamily: "var(--mono)",
                              padding: "7px",
                              border: `1.5px solid ${
                                over ? "var(--danger)" : "var(--border)"
                              }`,
                              borderRadius: "8px",
                              fontSize: "13px",
                              textAlign: "center",
                              outline: "none",
                            }}
                          />
                          <span
                            style={{ fontSize: "12px", color: "var(--text3)" }}
                          >
                            %
                          </span>
                        </div>
                      );
                    })}
                    <div
                      className={
                        over ? "pct-error" : ok ? "pct-ok" : "pct-warn"
                      }
                      style={{ marginTop: "4px" }}
                    >
                      {over
                        ? `! ${total.toFixed(1)}% — max 100%`
                        : ok
                        ? "✓ 100%"
                        : `Total: ${total.toFixed(1)}%`}
                    </div>
                  </div>
                );
              };
              return (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1.5px solid #fde68a",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "14px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1.5px solid #fde68a",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>💸</span>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "800",
                          color: "#92400e",
                        }}
                      >
                        Payout options
                      </div>
                      <div style={{ fontSize: "11px", color: "#b45309" }}>
                        How this ledger handles incoming payments
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {/* GROUP 1: Reduce debt */}
                    <div
                      style={{
                        border: `1.5px solid ${
                          isOffset ? "#d97706" : "#fde68a"
                        }`,
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: isOffset ? "#fef3c7" : "white",
                      }}
                    >
                      <button
                        onClick={() =>
                          setPayoutMode(isOffset ? payoutMode : "offset_ledger")
                        }
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "11px 14px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                          }}
                        >
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              border: `2px solid ${
                                isOffset ? "#d97706" : "#fde68a"
                              }`,
                              background: isOffset ? "#d97706" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isOffset && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "white",
                                }}
                              />
                            )}
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "700",
                                color: isOffset ? "#92400e" : "var(--text)",
                              }}
                            >
                              Reduce debt
                            </div>
                            <div style={{ fontSize: "11px", color: "#b45309" }}>
                              Income reduces what members owe
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: "12px", color: "#b45309" }}>
                          {isOffset ? "▲" : "▼"}
                        </span>
                      </button>
                      {isOffset && (
                        <div
                          style={{
                            padding: "0 14px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {[
                            {
                              id: "offset_ledger",
                              label: "By ledger %",
                              sub: "Uses each member's existing ledger share",
                            },
                            {
                              id: "offset_custom",
                              label: "Custom %",
                              sub: "Set a separate distribution key",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "9px",
                                padding: "9px 11px",
                                borderRadius: "8px",
                                border: `1.5px solid ${
                                  payoutMode === opt.id ? "#d97706" : "#fde68a"
                                }`,
                                background:
                                  payoutMode === opt.id
                                    ? "white"
                                    : "transparent",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name="payoutMode"
                                value={opt.id}
                                checked={payoutMode === opt.id}
                                onChange={() => setPayoutMode(opt.id)}
                                style={{
                                  marginTop: "3px",
                                  accentColor: "#d97706",
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color:
                                      payoutMode === opt.id
                                        ? "#92400e"
                                        : "var(--text2)",
                                  }}
                                >
                                  {opt.label}
                                </div>
                                <div
                                  style={{ fontSize: "11px", color: "#b45309" }}
                                >
                                  {opt.sub}
                                </div>
                              </div>
                            </label>
                          ))}
                          {payoutMode === "offset_custom" &&
                            renderCustomSplits()}
                        </div>
                      )}
                    </div>

                    {/* GROUP 2: Record only */}
                    <div
                      style={{
                        border: `1.5px solid ${
                          isRecord ? "#d97706" : "#fde68a"
                        }`,
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: isRecord ? "#fef3c7" : "white",
                      }}
                    >
                      <button
                        onClick={() =>
                          setPayoutMode(
                            isRecord ? payoutMode : "record_no_split"
                          )
                        }
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "11px 14px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                          }}
                        >
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              border: `2px solid ${
                                isRecord ? "#d97706" : "#fde68a"
                              }`,
                              background: isRecord ? "#d97706" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isRecord && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "white",
                                }}
                              />
                            )}
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "700",
                                color: isRecord ? "#92400e" : "var(--text)",
                              }}
                            >
                              Record only
                            </div>
                            <div style={{ fontSize: "11px", color: "#b45309" }}>
                              Logs income, no effect on balances
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: "12px", color: "#b45309" }}>
                          {isRecord ? "▲" : "▼"}
                        </span>
                      </button>
                      {isRecord && (
                        <div
                          style={{
                            padding: "0 14px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {[
                            {
                              id: "record_no_split",
                              label: "No split",
                              sub: "Just logs the total amount",
                            },
                            {
                              id: "record_ledger",
                              label: "Split by ledger %",
                              sub: "Tracks who gets what, by ledger share",
                            },
                            {
                              id: "record_custom",
                              label: "Custom %",
                              sub: "Custom distribution key",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "9px",
                                padding: "9px 11px",
                                borderRadius: "8px",
                                border: `1.5px solid ${
                                  payoutMode === opt.id ? "#d97706" : "#fde68a"
                                }`,
                                background:
                                  payoutMode === opt.id
                                    ? "white"
                                    : "transparent",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name="payoutMode"
                                value={opt.id}
                                checked={payoutMode === opt.id}
                                onChange={() => setPayoutMode(opt.id)}
                                style={{
                                  marginTop: "3px",
                                  accentColor: "#d97706",
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color:
                                      payoutMode === opt.id
                                        ? "#92400e"
                                        : "var(--text2)",
                                  }}
                                >
                                  {opt.label}
                                </div>
                                <div
                                  style={{ fontSize: "11px", color: "#b45309" }}
                                >
                                  {opt.sub}
                                </div>
                              </div>
                            </label>
                          ))}
                          {payoutMode === "record_custom" &&
                            renderCustomSplits()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* MEMBERS & SPLIT */}
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={() => setShowMembers((p) => !p)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--bg)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--text)",
                  }}
                >
                  Members & split %
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {(over || !ok) && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      display: "inline-block",
                    }}
                  />
                )}
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  {members.length} members · {showMembers ? "▲" : "▼"}
                </span>
              </div>
            </button>
            {showMembers && (
              <div
                style={{
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "12px 14px",
                }}
              >
                {over && (
                  <div className="pct-error" style={{ marginBottom: "8px" }}>
                    ! Total {total.toFixed(1)}% — cannot exceed 100%
                  </div>
                )}
                {!over && !ok && (
                  <div className="pct-warn" style={{ marginBottom: "8px" }}>
                    Total: {total.toFixed(1)}% (must equal 100%)
                  </div>
                )}
                {members.map((m, i) => {
                  const isMemberAdmin = i === 0;
                  const isSpec = !!m.is_spectator;
                  return (
                    <div key={m.id} className="msetting-row">
                      {withPlanDot(
                        <AvatarWithMedal
                          plan={m.plan}
                          size={28}
                          radius="50%"
                          colorClass={`stmt-av av${i % 10}`}
                          style={{ opacity: isSpec ? 0.5 : 1 }}
                          avatarId={m.avatar || null}
                        >
                          {initials(m.display_name)}
                        </AvatarWithMedal>,
                        m.plan
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <div className="msetting-name">
                            {m.display_name}
                            {m.user_id === currentUser.id ? " (you)" : ""}
                          </div>
                          {isSpec && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "#6b7280",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                                padding: "1px 6px",
                                borderRadius: "20px",
                              }}
                            >
                              viewer
                            </span>
                          )}
                          {planBadge(m.plan || "free")}
                        </div>
                        <div className="msetting-date">
                          Since {m.joined_date ? fmtDate(m.joined_date) : " - "}
                        </div>
                      </div>
                      {!isSpec && (
                        <input
                          value={m.pct}
                          onChange={(e) => {
                            const n = [...members];
                            n[i] = { ...n[i], pct: e.target.value };
                            setMembers(n);
                          }}
                          style={{
                            width: "60px",
                            fontFamily: "var(--mono)",
                            padding: "7px",
                            border: "1.5px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "13px",
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                      )}
                      {!isSpec && (
                        <span
                          style={{ fontSize: "12px", color: "var(--text3)" }}
                        >
                          %
                        </span>
                      )}
                      {isSpec && (
                        <span
                          style={{ fontSize: "12px", color: "var(--text3)" }}
                        >
                          0%
                        </span>
                      )}
                      {!isMemberAdmin && (
                        <button
                          onClick={() => {
                            const toggled = members.map((mb, j) =>
                              j === i ? { ...mb, is_spectator: !isSpec } : mb
                            );
                            const active = toggled.filter(
                              (mb) => !mb.is_spectator
                            );
                            const eq =
                              active.length > 0
                                ? parseFloat((100 / active.length).toFixed(2))
                                : 0;
                            setMembers(
                              toggled.map((mb) =>
                                mb.is_spectator
                                  ? { ...mb, share_percent: 0, pct: "0" }
                                  : {
                                      ...mb,
                                      share_percent: eq,
                                      pct: String(eq),
                                    }
                              )
                            );
                          }}
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            padding: "3px 8px",
                            borderRadius: "20px",
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text3)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            marginLeft: "2px",
                          }}
                        >
                          {isSpec ? "Make member" : "Make spectator"}
                        </button>
                      )}
                      {!isMemberAdmin && (
                        <button
                          onClick={() => {
                            const expCount = ledger.expenses.filter(
                              (e) =>
                                !e.is_settlement &&
                                e.approval_status !== "denied" &&
                                e.splits?.some((s) => s.member_id === m.id)
                            ).length;
                            setRemovingMember({
                              member: m,
                              index: i,
                              expCount,
                            });
                          }}
                          style={{
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#ef4444",
                            cursor: "pointer",
                            flexShrink: 0,
                            marginLeft: "2px",
                          }}
                          title="Remove member"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "var(--text2)",
                      marginBottom: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    Add member
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "9px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1, position: "relative" }}>
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "12px",
                            pointerEvents: "none",
                          }}
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        <input
                          placeholder="Full name"
                          value={newM.name}
                          onChange={(e) =>
                            setNewM({
                              ...newM,
                              name: e.target.value,
                              email: "",
                            })
                          }
                          autoComplete="off"
                          style={{
                            width: "100%",
                            padding: "10px 10px 10px 30px",
                            border: "1.5px solid var(--border)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            outline: "none",
                            boxSizing: "border-box",
                            background: "white",
                          }}
                        />
                        {/* Autocomplete dropdown */}
                        {newM.name.trim().length >= 1 &&
                          (() => {
                            const q = newM.name.toLowerCase();
                            const matches = networkPeople.filter((p) =>
                              p.name.toLowerCase().includes(q)
                            );
                            if (matches.length === 0) return null;
                            return (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 2px)",
                                  left: 0,
                                  right: 0,
                                  zIndex: 100,
                                  background: "white",
                                  border: "1.5px solid var(--accent)",
                                  borderRadius: "10px",
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                {matches.map((p, i) => (
                                  <div
                                    key={i}
                                    onClick={() =>
                                      setNewM({
                                        ...newM,
                                        name: p.name,
                                        email: p.email || "",
                                      })
                                    }
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "9px 12px",
                                      cursor: "pointer",
                                      borderBottom:
                                        i < matches.length - 1
                                          ? "1px solid var(--border)"
                                          : "none",
                                      background: "white",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        "var(--accent-light)")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        "white")
                                    }
                                  >
                                    {planBadge(p.plan || "free")}
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "var(--text)",
                                      }}
                                    >
                                      {p.name}
                                    </span>
                                    {p.email && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "var(--text3)",
                                          marginLeft: "auto",
                                        }}
                                      >
                                        {p.email}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                      </div>
                      <input
                        placeholder="%"
                        value={newM.pct}
                        onChange={(e) =>
                          setNewM({ ...newM, pct: e.target.value })
                        }
                        style={{
                          width: "58px",
                          padding: "10px 8px",
                          border: "1.5px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          outline: "none",
                          textAlign: "center",
                          background: "white",
                        }}
                      />
                    </div>
                    <div style={{ position: "relative" }}>
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        style={{
                          position: "absolute",
                          left: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m2 7 10 7 10-7" />
                      </svg>
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newM.email}
                        onChange={(e) =>
                          setNewM({ ...newM, email: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px 10px 10px 30px",
                          border: "1.5px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "white",
                        }}
                      />
                    </div>
                  </div>
                  <p className="tip" style={{ marginBottom: "10px" }}>
                    Join date = today. Past expenses won't affect this member.
                    All active members' percentages will be split equally unless
                    you enter a custom %.
                  </p>
                  {isDuplicateNewMemberName && (
                    <div className="pct-error" style={{ marginBottom: "10px" }}>
                      ! "{newM.name.trim()}" is already a member — every member
                      needs a different name.
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "13px", padding: "10px" }}
                    onClick={addM}
                    disabled={!newM.name.trim() || isDuplicateNewMemberName}
                  >
                    <Icon.Plus /> Add member
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* INVITE */}
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={() => setShowInvite((p) => !p)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                background: "var(--bg)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--text)",
                  }}
                >
                  Invite member
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                {showInvite ? "▲" : "▼"}
              </span>
            </button>
            {showInvite && (
              <div
                style={{
                  background: "var(--bg)",
                  border: "1.5px solid var(--border)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {[
                    {
                      label: "WhatsApp",
                      color: "#25d366",
                      bg: "#f0fdf4",
                      border: "#a7f3d0",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="22"
                          height="22"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Telegram",
                      color: "#229ed9",
                      bg: "#f0f9ff",
                      border: "#bae6fd",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="22"
                          height="22"
                        >
                          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Viber",
                      color: "#7360f2",
                      bg: "#f5f3ff",
                      border: "#c4b5fd",
                      mobile: true,
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="22"
                          height="22"
                        >
                          <path d="M11.4 0C7.4.1 2.7 1.4.9 5.8c-.8 2-.8 4.6-.6 6.7.4 3.4 2.1 6.4 5 8l.1 3.5 3.2-1.8c3.6.8 7.5.4 10.6-1.4 3.3-2 5.1-5.7 5.2-9.4C24.7 4.9 18.5-.2 11.4 0zm.1 1.9c6.1-.2 10.8 4.2 10.6 9.7-.1 3.2-1.7 6.3-4.6 7.9-2.9 1.7-6.7 1.9-9.9.9l-2.3 1.3-.1-2.6c-2.6-1.5-4.2-4.2-4.5-7.1-.2-1.9-.1-4.1.6-5.8C2.6 3 6.7 2.1 11.5 1.9zm-.4 3.4c-.3 0-.5.2-.5.5 0 .3.2.5.5.5 3 .1 5.6 2.5 5.6 5.6 0 .3.2.5.5.5s.5-.2.5-.5c0-3.6-2.9-6.5-6.6-6.6zm-3.2.8c-.4-.1-.8 0-1.1.4l-.5.6c-.6.7-.7 1.7-.2 2.5 1 1.7 2.4 3.1 4.1 4.1.8.5 1.8.4 2.5-.2l.6-.5c.6-.5.5-1.3.1-1.8l-1.3-1.3c-.4-.4-1-.4-1.5 0l-.4.4c-.7-.5-1.2-1-1.7-1.7l.4-.4c.4-.4.4-1.1 0-1.5L7.9 6.1zm3.6 1.4c-.3 0-.5.2-.5.5 0 .3.2.5.5.5 1.7.1 3 1.4 3 3.1 0 .3.2.5.5.5s.5-.2.5-.5c-.1-2.2-1.8-4-4-4.1zm-.1 2.2c-.3 0-.6.3-.6.6s.3.6.6.6c.5 0 .8.4.8.8 0 .3.3.6.6.6s.6-.3.6-.6c.1-1.1-.8-2-2-2z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Email",
                      color: "#4f46e5",
                      bg: "#eef2ff",
                      border: "#c7d7ff",
                      mobile: true,
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          width="22"
                          height="22"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m2 7 10 7 10-7" />
                        </svg>
                      ),
                    },
                    {
                      label: "SMS",
                      color: "#374151",
                      bg: "#f9fafb",
                      border: "#e5e7eb",
                      mobile: true,
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          width="22"
                          height="22"
                        >
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                      ),
                    },
                  ].map((opt) => {
                    const href =
                      opt.label === "WhatsApp"
                        ? `https://wa.me/?text=${encodeURIComponent(
                            `Hey, I'm using CosTrace to track shared expenses. Join me: ${ledgerJoinLink(
                              ledger.id
                            )}`
                          )}`
                        : opt.label === "Telegram"
                        ? `https://t.me/share/url?url=${encodeURIComponent(
                            `${ledgerJoinLink(ledger.id)}`
                          )}&text=${encodeURIComponent("Join me on CosTrace!")}`
                        : opt.label === "Viber"
                        ? `viber://forward?text=${encodeURIComponent(
                            `Hey, join me on CosTrace: ${ledgerJoinLink(
                              ledger.id
                            )}`
                          )}`
                        : opt.label === "Email"
                        ? `mailto:?subject=Join me on CosTrace&body=${encodeURIComponent(
                            `Hey, I'm using CosTrace to track shared expenses. Join here: ${ledgerJoinLink(
                              ledger.id
                            )}`
                          )}`
                        : `sms:?body=${encodeURIComponent(
                            `Hey, join me on CosTrace: ${ledgerJoinLink(
                              ledger.id
                            )}`
                          )}`;
                    return (
                      <a
                        key={opt.label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          padding: "12px 6px",
                          borderRadius: "12px",
                          border: `1.5px solid ${opt.border}`,
                          background: opt.bg || "white",
                          color: opt.color,
                          fontSize: "11px",
                          fontWeight: "700",
                          textDecoration: "none",
                          fontFamily: "inherit",
                          minHeight: "68px",
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </a>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "7px" }}>
                  <input
                    value={`${ledgerJoinLink(ledger.id)}`}
                    readOnly
                    style={{
                      flex: 1,
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      background: "white",
                      padding: "9px 12px",
                      border: "1.5px solid var(--border)",
                      borderRadius: "10px",
                      outline: "none",
                      color: "var(--text2)",
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{
                      padding: "9px 12px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        `${ledgerJoinLink(ledger.id)}`
                      )
                    }
                  >
                    <Icon.Copy /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Remove member confirm modal */}
          {removingMember && (
            <div
              className="modal-overlay"
              onClick={() => setRemovingMember(null)}
            >
              <div
                className="modal"
                style={{ maxWidth: "380px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>Remove member</h2>
                  <button
                    className="btn-icon"
                    onClick={() => setRemovingMember(null)}
                  >
                    <Icon.X />
                  </button>
                </div>
                <div className="modal-body">
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text)",
                      marginBottom: "12px",
                    }}
                  >
                    Remove <strong>{removingMember.member.display_name}</strong>{" "}
                    from this ledger?
                  </p>
                  {removingMember.expCount > 0 && (
                    <div
                      style={{
                        background: "#fef3c7",
                        border: "1.5px solid #fde68a",
                        borderRadius: "var(--radius-sm)",
                        padding: "12px 14px",
                        marginBottom: "12px",
                        fontSize: "13px",
                        color: "#92400e",
                        lineHeight: 1.5,
                      }}
                    >
                      ⚠️ This member is part of{" "}
                      <strong>
                        {removingMember.expCount} expense
                        {removingMember.expCount !== 1 ? "s" : ""}
                      </strong>
                      . Their recorded splits stay in the history as-is — only
                      future expenses will exclude them.
                    </div>
                  )}
                  <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                    Their {removingMember.member.share_percent}% share will be
                    redistributed equally among remaining active members.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setRemovingMember(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: "var(--danger)",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => {
                      const i = removingMember.index;
                      const remaining = members.filter((_, j) => j !== i);
                      const active = remaining.filter((mb) => !mb.is_spectator);
                      const eq =
                        active.length > 0
                          ? parseFloat((100 / active.length).toFixed(2))
                          : 0;
                      setMembers(
                        remaining.map((mb) =>
                          mb.is_spectator
                            ? mb
                            : { ...mb, share_percent: eq, pct: String(eq) }
                        )
                      );
                      setRemovingMember(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLedgerAdmin && (
            <div
              style={{
                marginTop: "18px",
                paddingTop: "16px",
                borderTop: "1.5px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "var(--text3)",
                  marginBottom: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Danger zone
              </div>
              {!archConfirm ? (
                <button
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    fontSize: "13px",
                    borderColor: "var(--border2)",
                  }}
                  onClick={() => setArchConfirm(true)}
                >
                  Archive ledger
                </button>
              ) : (
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px",
                  }}
                >
                  {sUnsettled && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid #fecaca",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "800",
                          color: "#dc2626",
                        }}
                      >
                        Unsettled balances
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#b91c1c",
                          marginTop: "1px",
                        }}
                      >
                        Some members still owe or are owed money. Balances will
                        be frozen as they are.
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginBottom: "14px",
                    }}
                  >
                    {[
                      {
                        t: "Each member gets their own copy",
                        d: "On archiving, every active member receives an independent personal copy of the full history.",
                      },
                      {
                        t: "You can only delete your own copy",
                        d: "Deleting from your archive never affects anyone else's copy. Others keep their records.",
                      },
                      {
                        t: "Expenses are frozen forever",
                        d: "No new expenses or settlements can be added. Archiving cannot be reactivated.",
                      },
                    ].map((b, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "9px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "#e0e7ff",
                            color: "#4f46e5",
                            fontSize: "10px",
                            fontWeight: "800",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#374151",
                            }}
                          >
                            {b.t}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6b7280" }}>
                            {b.d}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      background: "#eef1ff",
                      border: "1px solid #ddd6fe",
                      borderRadius: "8px",
                      padding: "9px 11px",
                      marginBottom: "14px",
                    }}
                  >
                    As admin you can archive without other members' permission.
                    This protects everyone's financial records: once archived,
                    each member owns their copy and no one — not even the admin
                    — can delete another member's records.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: "12px" }}
                      onClick={() => setArchConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        fontSize: "12px",
                        background: "#374151",
                      }}
                      onClick={() => {
                        onArchive && onArchive(ledger.id);
                      }}
                    >
                      Confirm archive
                    </button>
                  </div>
                </div>
              )}

              {/* DELETE LEDGER */}
              <div style={{ marginTop: "10px" }}>
                {!delConfirm ? (
                  <button
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      fontSize: "13px",
                      color: "var(--danger)",
                      borderColor: "#fecaca",
                    }}
                    onClick={() => setDelConfirm(true)}
                  >
                    Delete ledger
                  </button>
                ) : (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "800",
                        color: "#dc2626",
                        marginBottom: "6px",
                      }}
                    >
                      Delete "{ledger.name}"
                    </div>
                    {sUnsettled && (
                      <label
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "flex-start",
                          background: "white",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          padding: "9px 11px",
                          marginBottom: "10px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={delUnsettledAck}
                          onChange={(e) => setDelUnsettledAck(e.target.checked)}
                          style={{ marginTop: "2px" }}
                        />
                        <span style={{ fontSize: "11px", color: "#b91c1c" }}>
                          There are <strong>unsettled balances</strong>. I
                          understand they will be lost and deletion will proceed
                          anyway.
                        </span>
                      </label>
                    )}
                    {solo ? (
                      <>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            marginBottom: "10px",
                          }}
                        >
                          You're the only member with the app, so no one else
                          needs to approve. This permanently deletes everything
                          related to this ledger. Type <strong>delete</strong>{" "}
                          to confirm.
                        </div>
                        <input
                          value={soloWord}
                          onChange={(e) => setSoloWord(e.target.value)}
                          placeholder="delete"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            marginBottom: "12px",
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: "12px" }}
                            onClick={() => {
                              setDelConfirm(false);
                              setSoloWord("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn"
                            style={{
                              flex: 1,
                              fontSize: "12px",
                              background: "var(--danger)",
                              color: "white",
                              opacity:
                                soloWord === "delete" &&
                                (!sUnsettled || delUnsettledAck)
                                  ? 1
                                  : 0.4,
                              cursor:
                                soloWord === "delete" &&
                                (!sUnsettled || delUnsettledAck)
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                            disabled={
                              soloWord !== "delete" ||
                              (sUnsettled && !delUnsettledAck)
                            }
                            onClick={() => onExecuteDelete(ledger.id)}
                          >
                            Delete forever
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            marginBottom: "12px",
                          }}
                        >
                          Every member with the app must approve. After all
                          approve, a <strong>3-day countdown</strong> begins,
                          after which the ledger is permanently deleted. The
                          ledger is locked while the countdown runs. Once
                          approved you can still choose to keep a personal copy,
                          but only the admin can cancel the deletion itself.
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: "12px" }}
                            onClick={() => {
                              setDelConfirm(false);
                              setDelUnsettledAck(false);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn"
                            style={{
                              flex: 1,
                              fontSize: "12px",
                              background: "var(--danger)",
                              color: "white",
                              opacity: !sUnsettled || delUnsettledAck ? 1 : 0.4,
                              cursor:
                                !sUnsettled || delUnsettledAck
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                            disabled={sUnsettled && !delUnsettledAck}
                            onClick={() => onRequestDelete(ledger.id)}
                          >
                            Request deletion
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={over || !name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// -- STATEMENT CARD ------------------------------------------------------------
function StatementCard({
  ledger,
  monthExpenses,
  activeMonth,
  currentUser,
  currency = "RSD",
}) {
  const [showAllStmt, setShowAllStmt] = useState(false);
  const curMk = mk(new Date());
  const isCurrentMonth = activeMonth === curMk;
  const allMks = getMonths(ledger);
  const prevLocked = allMks.filter(
    (m) => m < activeMonth && ledger.lockedMonths?.[m]
  );
  const carryover = {};
  ledger.members.forEach((m) => {
    carryover[m.id] = 0;
  });
  // Carry-over only relevant in current month
  if (isCurrentMonth) {
    prevLocked.forEach((pmk) => {
      const exps = ledger.expenses.filter((e) => mk(e.expense_date) === pmk);
      computeBalances(ledger, exps).forEach((b) => {
        carryover[b.id] = (carryover[b.id] || 0) + b.net;
      });
    });
  }
  const regularExp = monthExpenses.filter(
    (e) => !e.is_settlement && e.approval_status === "approved"
  );
  const totalSpent = regularExp.reduce((s, e) => s + e.amount, 0);
  const monthBals = computeBalances(ledger, monthExpenses);
  const combined = ledger.members
    .filter((m) => !m.is_spectator)
    .map((m) => {
      const mb = monthBals.find((b) => b.id === m.id);
      return {
        ...m,
        monthNet: mb?.net || 0,
        monthPaid: mb?.paid || 0,
        monthOwed: mb?.owed || 0,
        carry: carryover[m.id] || 0,
        total: mb?.net || 0,
      };
    });
  const hasCarry = prevLocked.length > 0;
  const lifetimeBalances = ledger.carry_balance
    ? computeBalances(
        ledger,
        ledger.expenses.filter((e) => e.approval_status === "approved")
      )
    : null;
  const myLifetimeBalance = lifetimeBalances
    ? lifetimeBalances.find((b) => b.user_id === currentUser.id)
    : null;
  const debtors = combined.filter((m) => m.total < -0.01);
  const creditors = combined.filter((m) => m.total > 0.01);
  const pendingCount = monthExpenses.filter(
    (e) => e.approval_status === "pending"
  ).length;
  const deniedCount = monthExpenses.filter(
    (e) => e.approval_status === "denied"
  ).length;

  return (
    <div className="stmt-card">
      <div className="stmt-header">
        <h3>Statement - {mlbl(activeMonth)}</h3>
        <span className="stmt-total-badge">
          {fmtAmt(totalSpent)} {currency}
        </span>
      </div>
      <div className="stmt-body">
        {ledger.carry_balance && myLifetimeBalance && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                Lifetime balance
              </div>
              <div
                style={{ fontSize: "10px", color: "var(--text3)", marginTop: "1px" }}
              >
                Carried across all locked months
              </div>
            </div>
            <div
              className={
                myLifetimeBalance.net > 0.01
                  ? "net-pos"
                  : myLifetimeBalance.net < -0.01
                  ? "net-neg"
                  : "net-zero"
              }
              style={{
                fontSize: "18px",
                fontWeight: "800",
                fontFamily: "var(--font)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {myLifetimeBalance.net > 0.01 ? "+" : ""}
              {fmtAmt(myLifetimeBalance.net)} {currency}
            </div>
          </div>
        )}
        {(pendingCount > 0 || deniedCount > 0) && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            {pendingCount > 0 && (
              <span className="status-tag tag-pending">
                {pendingCount} pending - not counted
              </span>
            )}
            {deniedCount > 0 && (
              <span className="status-tag tag-denied">
                {deniedCount} denied - excluded
              </span>
            )}
          </div>
        )}
        {(() => {
          // Always show current user, then others up to 3, rest collapsed
          const me = combined.find((m) => m.user_id === currentUser.id);
          const others = combined.filter((m) => m.user_id !== currentUser.id);
          const visibleOthers = showAllStmt ? others : others.slice(0, 3);
          const hiddenCount = others.length - 3;
          const rows = me ? [me, ...visibleOthers] : visibleOthers;
          return (
            <>
              {rows.map((m, i) => (
                <div key={m.id} className="stmt-row">
                  <div className="stmt-member">
                    {withPlanDot(
                      m.avatar && AVATARS.find((a) => a.id === m.avatar) ? (
                        <img
                          src={AVATARS.find((a) => a.id === m.avatar).src}
                          alt=""
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          className={`stmt-av av${combined.indexOf(m) % 10}`}
                        >
                          {initials(m.display_name)}
                        </div>
                      ),
                      m.plan
                    )}
                    <div>
                      <div className="stmt-name">
                        {m.display_name}
                        {m.user_id === currentUser.id ? " (you)" : ""}
                      </div>
                      <div className="stmt-sub">
                        paid {fmtAmt(m.monthPaid)} · share {fmtAmt(m.monthOwed)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className={`stmt-net ${
                        m.total > 0.01
                          ? "net-pos"
                          : m.total < -0.01
                          ? "net-neg"
                          : "net-zero"
                      }`}
                    >
                      {m.total > 0.01 ? "+" : ""}
                      {fmtAmt(m.total)}
                    </div>
                  </div>
                </div>
              ))}
              {!showAllStmt && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllStmt(true)}
                  style={{
                    width: "100%",
                    padding: "7px",
                    border: "none",
                    background: "var(--bg)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text3)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: "4px",
                  }}
                >
                  +{hiddenCount} more members ▾
                </button>
              )}
              {showAllStmt && others.length > 3 && (
                <button
                  onClick={() => setShowAllStmt(false)}
                  style={{
                    width: "100%",
                    padding: "7px",
                    border: "none",
                    background: "var(--bg)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text3)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: "4px",
                  }}
                >
                  ▴ Show less
                </button>
              )}
            </>
          );
        })()}
        {combined.length > 0 &&
          combined.every((m) => Math.abs(m.total) < 0.01) && (
            <div className="settle-box clear">
              <div className="settle-text">
                <strong>All settled</strong>
              </div>
            </div>
          )}
        {!ledger.carry_balance && isCurrentMonth && hasCarry && (
          <div className="carry-note">
            Carry-over from previous locked months (info only):
            <div className="carry-info">
              {combined.map((m) => (
                <span
                  key={m.id}
                  className="carry-chip"
                  style={{
                    color:
                      m.carry > 0
                        ? "var(--success)"
                        : m.carry < 0
                        ? "var(--danger)"
                        : "var(--text3)",
                  }}
                >
                  {m.display_name}: {m.carry >= 0 ? "+" : ""}
                  {fmtAmt(m.carry)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- APPROVAL MODAL ------------------------------------------------------------
function ExpenseDetailModal({
  exp,
  ledger,
  currentUser,
  isLocked,
  onClose,
  onApprove,
  onDeny,
  currency = "RSD",
}) {
  const isPayout = !!exp.is_payout;
  const isPending = exp.approval_status === "pending";
  const isDenied = exp.approval_status === "denied";
  const isSettle = exp.is_settlement;
  const canApprove =
    isPending && !isLocked && exp.paid_by_id !== currentUser.id;

  const hasCustomSplit =
    exp.splits &&
    exp.splits.some((s) => {
      const mem = ledger.members.find((m) => m.id === s.member_id);
      return mem && Math.abs(s.share_percent - mem.share_percent) > 0.01;
    });

  const statusColor = isPending
    ? "var(--warning)"
    : isDenied
    ? "var(--danger)"
    : isSettle
    ? "var(--settle)"
    : "var(--success)";
  const statusBg = isPending
    ? "var(--warning-light)"
    : isDenied
    ? "var(--danger-light)"
    : isSettle
    ? "var(--settle-light)"
    : "var(--success-light)";
  const statusLabel = isPending
    ? "Pending approval"
    : isDenied
    ? "Denied"
    : isSettle
    ? "Settlement"
    : "Approved";
  const modeLabels = {
    offset_ledger: "Reduce debt (ledger %)",
    offset_custom: "Reduce debt (custom %)",
    record_no_split: "Record only",
    record_ledger: "Record (ledger %)",
    record_custom: "Record (custom %)",
  };

  // ── Payout detail view ──────────────────────────────────────────────────────
  if (isPayout) {
    return (
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal" style={{ maxWidth: "420px" }}>
          <div className="modal-header">
            <h2>Payout Details</h2>
            <button className="btn-icon" onClick={onClose}>
              <Icon.X />
            </button>
          </div>
          <div className="modal-body">
            <div
              style={{
                background: "#fffbeb",
                borderRadius: "var(--radius-sm)",
                padding: "16px",
                marginBottom: "16px",
                border: "1px solid #fde68a",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#92400e",
                    flex: 1,
                  }}
                >
                  {exp.description}
                </div>
                {exp.payout_mode && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      background: "white",
                      color: "#d97706",
                      border: "1px solid #fde68a",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {modeLabels[exp.payout_mode] || "Payout"}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#b45309",
                  marginBottom: "14px",
                }}
              >
                {fmtDate(exp.expense_date)} · received by{" "}
                <strong style={{ color: "#92400e" }}>{exp.paid_by_name}</strong>
              </div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "800",
                  fontFamily: "var(--mono)",
                  color: "#d97706",
                }}
              >
                +{fmtAmt(exp.amount)}{" "}
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#b45309",
                  }}
                >
                  {currency}
                </span>
              </div>
            </div>

            {exp.splits && exp.splits.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--text2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    Distribution
                  </div>
                  {hasCustomSplit && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#d97706",
                        background: "#fffbeb",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        border: "1px solid #fde68a",
                      }}
                    >
                      % Custom key
                    </span>
                  )}
                </div>
                {exp.splits.map((s, i) => {
                  const mem = ledger.members.find((m) => m.id === s.member_id);
                  const defaultPct = mem?.share_percent || 0;
                  const isCustom =
                    Math.abs(s.share_percent - defaultPct) > 0.01;
                  const amtDue =
                    s.amount_owed ||
                    s.amount_due ||
                    parseFloat(
                      ((s.share_percent / 100) * exp.amount).toFixed(2)
                    );
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 10px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "6px",
                        background: isCustom ? "#fffbeb" : "var(--bg)",
                        border: isCustom
                          ? "1px solid #fde68a"
                          : "1px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {withPlanDot(
                          mem?.avatar &&
                            AVATARS.find((a) => a.id === mem.avatar) ? (
                            <img
                              src={AVATARS.find((a) => a.id === mem.avatar).src}
                              alt=""
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              className={`stmt-av av${i % 10}`}
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                fontSize: "10px",
                              }}
                            >
                              {initials(mem?.display_name || "?")}
                            </div>
                          ),
                          mem?.plan
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text)",
                            }}
                          >
                            {mem?.display_name || "Unknown"}
                          </div>
                          {isCustom && (
                            <div style={{ fontSize: "10px", color: "#d97706" }}>
                              custom (ledger {defaultPct}%)
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "800",
                            fontFamily: "var(--mono)",
                            color: "#d97706",
                          }}
                        >
                          +{fmtAmt(amtDue)}
                        </div>
                        <div
                          style={{ fontSize: "11px", color: "var(--text3)" }}
                        >
                          {s.share_percent}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h2>{isSettle ? " Settlement" : " Expense Details"}</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          {/* Main info */}
          <div
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "var(--text)",
                  flex: 1,
                }}
              >
                {exp.description}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "20px",
                  background: statusBg,
                  color: statusColor,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {statusLabel}
              </span>
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text3)",
                marginBottom: "14px",
              }}
            >
              {fmtDate(exp.expense_date)} · paid by{" "}
              <strong style={{ color: "var(--text2)" }}>
                {exp.paid_by_name}
              </strong>
              {isSettle &&
                exp.splits?.length === 1 &&
                ledger.members.find(
                  (m) => m.id === exp.splits[0].member_id
                ) && (
                  <>
                    {" "}
                    to{" "}
                    <strong style={{ color: "var(--settle)" }}>
                      {
                        ledger.members.find(
                          (m) => m.id === exp.splits[0].member_id
                        ).display_name
                      }
                    </strong>
                  </>
                )}
            </div>
            <div
              style={{
                fontSize: "30px",
                fontWeight: "800",
                fontFamily: "var(--mono)",
                color: isSettle ? "var(--settle)" : "var(--accent)",
              }}
            >
              {fmtAmt(exp.amount)}{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--text3)",
                }}
              >
                {currency}
              </span>
            </div>
          </div>

          {/* Split breakdown */}
          {!isSettle && exp.splits && exp.splits.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Split breakdown
                </div>
                {hasCustomSplit && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#7c3aed",
                      background: "#f5f3ff",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      border: "1px solid #ddd6fe",
                    }}
                  >
                    Custom split
                  </span>
                )}
              </div>
              {exp.splits.map((s, i) => {
                const mem = ledger.members.find((m) => m.id === s.member_id);
                const defaultPct = mem?.share_percent || 0;
                const isCustom = Math.abs(s.share_percent - defaultPct) > 0.01;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 10px",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "6px",
                      background: isCustom ? "#f5f3ff" : "var(--bg)",
                      border: isCustom
                        ? "1px solid #ddd6fe"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {withPlanDot(
                        mem?.avatar &&
                          AVATARS.find((a) => a.id === mem.avatar) ? (
                          <img
                            src={AVATARS.find((a) => a.id === mem.avatar).src}
                            alt=""
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            className={`stmt-av av${i % 10}`}
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "50%",
                              fontSize: "10px",
                            }}
                          >
                            {initials(mem?.display_name || "?")}
                          </div>
                        ),
                        mem?.plan
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--text)",
                          }}
                        >
                          {mem?.display_name || "Unknown"}
                        </div>
                        {isCustom && (
                          <div style={{ fontSize: "10px", color: "#7c3aed" }}>
                            custom (default {defaultPct}%)
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          fontFamily: "var(--mono)",
                          color: isCustom ? "#7c3aed" : "var(--text)",
                        }}
                      >
                        {fmtAmt(s.amount_owed)}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                        {s.share_percent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Approval warning */}
          {canApprove && (
            <div
              style={{
                background: "var(--warning-light)",
                border: "1.5px solid #fcd34d",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                fontSize: "13px",
                color: "#92400e",
                fontWeight: "500",
              }}
            >
              By approving, this expense will be included in the shared balance.
            </div>
          )}
          {isDenied && (
            <div
              style={{
                background: "var(--danger-light)",
                border: "1.5px solid #fca5a5",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                fontSize: "13px",
                color: "var(--danger)",
                fontWeight: "500",
              }}
            >
              This expense was denied and is excluded from balance calculations.
            </div>
          )}
        </div>
        <div
          className="modal-footer"
          style={{ justifyContent: canApprove ? "space-between" : "flex-end" }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {canApprove && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn"
                style={{
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                  border: "1.5px solid #fca5a5",
                  fontSize: "13px",
                }}
                onClick={() => onDeny(exp.id)}
              >
                Deny
              </button>
              <button
                className="btn btn-primary"
                style={{ fontSize: "13px" }}
                onClick={() => onApprove(exp.id)}
              >
                Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOUTS MODULE
// ─────────────────────────────────────────────────────────────────────────────

// Check if user/ledger has payouts access
function hasPayoutsAccess(userPlan, ledger, currentUser) {
  if (!userPlan) return false;
  if (userPlan.id === "gold") return true;
  if (currentUser?.payoutPass) return true;
  return !!(ledger && ledger.payouts_addon);
}

// Payouts upsell gate
function PayoutsUpsellGate({ onShowUpgrade, userPlan }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
        border: "2px solid #f59e0b",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        textAlign: "center",
        margin: "14px 0",
      }}
    >
      <div style={{ fontSize: "36px", marginBottom: "10px" }}>💸</div>
      <div
        style={{
          fontSize: "17px",
          fontWeight: "800",
          color: "#92400e",
          marginBottom: "6px",
        }}
      >
        Payouts Module
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "#b45309",
          marginBottom: "16px",
          lineHeight: 1.6,
          maxWidth: "320px",
          margin: "0 auto 16px",
        }}
      >
        Track income and automatically distribute earnings between members.
        Perfect for bands, freelancer teams, rental properties and shared
        businesses.
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn"
          style={{
            background: "#d97706",
            color: "white",
            border: "none",
            fontSize: "13px",
            fontWeight: "800",
            padding: "10px 20px",
          }}
          onClick={onShowUpgrade}
        >
          💸 Payout Pass — 19.99€ one-time
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: "12px" }}
          onClick={onShowUpgrade}
        >
          Included in Gold (7.99€/mo)
        </button>
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#92400e",
          marginTop: "10px",
          opacity: 0.7,
        }}
      >
        One-time purchase · unlocks all your ledgers · forever
      </div>
    </div>
  );
}

// Add Payout Modal
function AddPayoutModal({
  ledger,
  currentUser,
  onClose,
  onAdd,
  currency = "RSD",
}) {
  const activeMembers = ledger.members.filter((m) => !m.is_spectator);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedBy, setReceivedBy] = useState(
    activeMembers.find((m) => m.user_id === currentUser.id)?.id ||
      activeMembers[0]?.id ||
      ""
  );
  const [mode, setMode] = useState("equal"); // equal | separate | offset | payout_only
  const [splits, setSplits] = useState(
    activeMembers.map((m) => ({
      member_id: m.id,
      share_percent: parseFloat((100 / activeMembers.length).toFixed(2)),
    }))
  );

  const totalPct = splits.reduce(
    (s, sp) => s + (parseFloat(sp.share_percent) || 0),
    0
  );
  const over = totalPct > 100.001;
  const ok = Math.abs(totalPct - 100) < 0.01;
  const amt = parseFloat(amount) || 0;

  const MODES = [
    {
      id: "equal",
      label: "Equal split",
      desc: "Distributed evenly among all members",
    },
    {
      id: "separate",
      label: "Custom key",
      desc: "Each member gets their own percentage",
    },
    {
      id: "offset",
      label: "Offset expenses",
      desc: "Income reduces what members owe",
    },
    {
      id: "payout_only",
      label: "Payout only",
      desc: "Shows how much each member receives, doesn't affect balances",
    },
  ];

  const updateSplit = (i, val) => {
    const n = [...splits];
    n[i] = { ...n[i], share_percent: val };
    setSplits(n);
  };

  const handleAdd = () => {
    if (!title.trim() || !amount) return;
    const activeSplits = splits.filter((s) => s.member_id);
    const tp = activeSplits.reduce(
      (s, sp) => s + (parseFloat(sp.share_percent) || 0),
      0
    );
    const finalSplits = activeSplits.map((s) => ({
      member_id: s.member_id,
      share_percent: parseFloat(s.share_percent) || 0,
      amount_due: parseFloat(((s.share_percent / tp) * amt).toFixed(2)),
    }));
    const receiver = activeMembers.find((m) => m.id === receivedBy);
    onAdd({
      id: `p${Date.now()}`,
      title,
      description: desc,
      amount: amt,
      received_by_name: receiver?.display_name || currentUser.full_name,
      received_by_id: receiver?.user_id || null,
      payout_date: now(),
      mode,
      splits: finalSplits,
    });
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>💸 Add Payout</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          {/* Mode selector */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text2)",
                marginBottom: "7px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Distribution mode
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {MODES.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: `1.5px solid ${
                      mode === m.id ? "#d97706" : "var(--border)"
                    }`,
                    background: mode === m.id ? "#fffbeb" : "white",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="payout_mode"
                    value={m.id}
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                    style={{ marginTop: "2px", accentColor: "#d97706" }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: mode === m.id ? "#92400e" : "var(--text)",
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                      {m.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              placeholder="e.g. Concert fee, Rental income, Project payment..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <input
              placeholder="Additional notes..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Amount ({currency})</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ fontFamily: "var(--mono)" }}
            />
          </div>
          <div className="form-group">
            <label>Received by</label>
            <select
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
            >
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom split — only for "separate" mode */}
          {mode === "separate" && (
            <div className="split-override">
              <h4>Distribution key</h4>
              {activeMembers.map((m, i) => {
                const sp = splits[i] || { share_percent: 0 };
                return (
                  <div key={m.id} className="split-row">
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        flex: 1,
                        color: "var(--text)",
                      }}
                    >
                      {m.display_name}
                    </span>
                    <input
                      value={sp.share_percent}
                      onChange={(e) => updateSplit(i, e.target.value)}
                      style={{
                        width: "64px",
                        fontFamily: "var(--mono)",
                        padding: "7px",
                        border: "1.5px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "13px",
                        textAlign: "center",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                      %
                    </span>
                    {amt > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#d97706",
                          fontFamily: "var(--mono)",
                          minWidth: "60px",
                          textAlign: "right",
                        }}
                      >
                        {fmtAmt((sp.share_percent / 100) * amt)}
                      </span>
                    )}
                  </div>
                );
              })}
              <div
                className={over ? "pct-error" : ok ? "pct-ok" : "pct-warn"}
                style={{ marginTop: "6px" }}
              >
                {over
                  ? `! Total ${totalPct.toFixed(1)}% — cannot exceed 100%`
                  : ok
                  ? "✓ 100%"
                  : `Total: ${totalPct.toFixed(1)}%`}
              </div>
            </div>
          )}

          {/* Preview for equal and offset modes */}
          {(mode === "equal" || mode === "offset" || mode === "payout_only") &&
            amt > 0 && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1.5px solid #fde68a",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#92400e",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                  }}
                >
                  {mode === "offset"
                    ? "Income offsets expenses"
                    : "Distribution preview"}
                </div>
                {activeMembers.map((m, i) => {
                  const share = 100 / activeMembers.length;
                  const due = (share / 100) * amt;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "var(--text2)",
                        padding: "3px 0",
                      }}
                    >
                      <span>{m.display_name}</span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: "700",
                          color: "#d97706",
                        }}
                      >
                        +{fmtAmt(due)} {currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            style={{
              background: "#d97706",
              color: "white",
              border: "none",
              opacity:
                !title.trim() ||
                !amount ||
                (mode === "separate" && (over || !ok))
                  ? 0.4
                  : 1,
              cursor:
                !title.trim() ||
                !amount ||
                (mode === "separate" && (over || !ok))
                  ? "not-allowed"
                  : "pointer",
            }}
            onClick={handleAdd}
            disabled={
              !title.trim() || !amount || (mode === "separate" && (over || !ok))
            }
          >
            Add Payout
          </button>
        </div>
      </div>
    </div>
  );
}

// Payout Detail Modal
function PayoutDetailModal({ payout, ledger, onClose, currency = "RSD" }) {
  const modeLabels = {
    equal: "Equal split",
    separate: "Custom key",
    offset: "Offset expenses",
    payout_only: "Payout only",
  };
  const modeColors = {
    equal: "#0284c7",
    separate: "#7c3aed",
    offset: "#15803d",
    payout_only: "#d97706",
  };
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <h2>Payout Details</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              background: "#fffbeb",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "#92400e",
                  flex: 1,
                }}
              >
                {payout.title}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "20px",
                  background: "white",
                  color: modeColors[payout.mode] || "#d97706",
                  border: `1px solid ${modeColors[payout.mode] || "#d97706"}44`,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {modeLabels[payout.mode] || payout.mode}
              </span>
            </div>
            {payout.description && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#b45309",
                  marginBottom: "10px",
                }}
              >
                {payout.description}
              </div>
            )}
            <div
              style={{
                fontSize: "13px",
                color: "#92400e",
                marginBottom: "14px",
              }}
            >
              {fmtDate(payout.payout_date)} · received by{" "}
              <strong>{payout.received_by_name}</strong>
            </div>
            <div
              style={{
                fontSize: "30px",
                fontWeight: "800",
                fontFamily: "var(--mono)",
                color: "#d97706",
              }}
            >
              {fmtAmt(payout.amount)}{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#b45309",
                }}
              >
                {currency}
              </span>
            </div>
          </div>

          {payout.splits && payout.splits.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: "10px",
                }}
              >
                Distribution
              </div>
              {payout.splits.map((s, i) => {
                const mem = ledger.members.find((m) => m.id === s.member_id);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 10px",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "6px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {withPlanDot(
                        mem?.avatar &&
                          AVATARS.find((a) => a.id === mem.avatar) ? (
                          <img
                            src={AVATARS.find((a) => a.id === mem.avatar).src}
                            alt=""
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            className={`stmt-av av${i % 10}`}
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "50%",
                              fontSize: "10px",
                            }}
                          >
                            {initials(mem?.display_name || "?")}
                          </div>
                        ),
                        mem?.plan
                      )}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "var(--text)",
                        }}
                      >
                        {mem?.display_name || "Unknown"}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "800",
                          fontFamily: "var(--mono)",
                          color: "#d97706",
                        }}
                      >
                        +{fmtAmt(s.amount_due)}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                        {s.share_percent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Payouts Panel — shown inside LedgerDetail as a tab
function PayoutsPanel({
  ledger,
  currentUser,
  currency,
  userPlan,
  onShowUpgrade,
  onUpdateLedger,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [detailPayout, setDetailPayout] = useState(null);
  const [buyConfirm, setBuyConfirm] = useState(false);
  const hasAccess = hasPayoutsAccess(userPlan, ledger, currentUser);

  const payouts = ledger.payouts || [];
  const curMk = mk(new Date());
  const monthPayouts = payouts.filter((p) => mk(p.payout_date) === curMk);

  // Stats
  const monthExpenses = ledger.expenses.filter(
    (e) =>
      mk(e.expense_date) === curMk &&
      e.approval_status === "approved" &&
      !e.is_settlement
  );
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthPayouts.reduce((s, p) => s + p.amount, 0);
  const netResult = totalIncome - totalExpenses;

  const addPayout = (p) => {
    const updated = { ...ledger, payouts: [...(ledger.payouts || []), p] };
    onUpdateLedger(updated);
  };

  const modeIcon = { equal: "=", separate: "%", offset: "↕", payout_only: "→" };
  const modeColor = {
    equal: "#0284c7",
    separate: "#7c3aed",
    offset: "#15803d",
    payout_only: "#d97706",
  };

  if (!hasAccess) {
    return (
      <div>
        <PayoutsUpsellGate onShowUpgrade={onShowUpgrade} userPlan={userPlan} />
        {buyConfirm && (
          <div
            className="modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget && setBuyConfirm(false)
            }
          >
            <div className="modal" style={{ maxWidth: "380px" }}>
              <div className="modal-header">
                <h2>Buy Payouts Module</h2>
                <button
                  className="btn-icon"
                  onClick={() => setBuyConfirm(false)}
                >
                  <Icon.X />
                </button>
              </div>
              <div className="modal-body">
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>
                    💸
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "var(--text)",
                      marginBottom: "6px",
                    }}
                  >
                    Lifetime access — 19.99€
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
                      lineHeight: 1.6,
                      marginBottom: "16px",
                    }}
                  >
                    One-time payment. Works on all your ledgers, forever. No
                    subscription needed.
                  </div>
                  <div
                    style={{
                      background: "var(--bg)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px",
                      marginBottom: "16px",
                      textAlign: "left",
                    }}
                  >
                    {[
                      "Track income & revenue",
                      "3 distribution modes",
                      "Net result reports",
                      "Works alongside expenses",
                      "All your ledgers",
                    ].map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                          color: "var(--text2)",
                          padding: "4px 0",
                        }}
                      >
                        <span
                          style={{ color: "var(--settle)", fontWeight: "800" }}
                        >
                          ✓
                        </span>{" "}
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setBuyConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{
                    background: "#d97706",
                    color: "white",
                    border: "none",
                    fontWeight: "800",
                  }}
                  onClick={() => {
                    onUpdateLedger({
                      ...ledger,
                      payouts_addon: true,
                      payouts: ledger.payouts || [],
                    });
                    setBuyConfirm(false);
                  }}
                >
                  Pay 19.99€
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Net result card */}
      <div
        style={{
          background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
          border: "2px solid #fde68a",
          borderRadius: "var(--radius-lg)",
          padding: "16px 18px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#92400e",
            marginBottom: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          Financial overview — {mlbl(curMk)}
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "80px" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#b45309",
                fontWeight: "600",
                marginBottom: "3px",
              }}
            >
              Expenses
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                fontFamily: "var(--mono)",
                color: "var(--danger)",
              }}
            >
              -{fmtAmt(totalExpenses)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "80px" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#b45309",
                fontWeight: "600",
                marginBottom: "3px",
              }}
            >
              Income
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                fontFamily: "var(--mono)",
                color: "#16a34a",
              }}
            >
              +{fmtAmt(totalIncome)}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: "80px",
              borderLeft: "1.5px solid #fde68a",
              paddingLeft: "16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#b45309",
                fontWeight: "600",
                marginBottom: "3px",
              }}
            >
              Net result
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                fontFamily: "var(--mono)",
                color: netResult >= 0 ? "#16a34a" : "var(--danger)",
              }}
            >
              {netResult >= 0 ? "+" : ""}
              {fmtAmt(netResult)}
            </div>
          </div>
        </div>
      </div>

      {/* Payouts list */}
      <div className="exp-card">
        <div
          className="exp-card-header"
          style={{ background: "linear-gradient(90deg,#fffbeb,#fef3c7)" }}
        >
          <h3 style={{ color: "#92400e" }}>Payouts</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{ fontSize: "11px", color: "#b45309", fontWeight: "600" }}
            >
              {monthPayouts.length} this month
            </span>
            <button
              className="btn"
              style={{
                background: "#d97706",
                color: "white",
                border: "none",
                fontSize: "12px",
                padding: "6px 12px",
              }}
              onClick={() => setShowAdd(true)}
            >
              <Icon.Plus /> Add
            </button>
          </div>
        </div>
        {monthPayouts.length === 0 ? (
          <div className="exp-empty" style={{ color: "#b45309" }}>
            No payouts recorded this month. Add your first income entry!
          </div>
        ) : (
          [...monthPayouts].reverse().map((p) => (
            <div
              key={p.id}
              onClick={() => setDetailPayout(p)}
              style={{
                padding: "8px 14px",
                borderBottom: "1px solid #fde68a",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                background: "#fffbeb",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#fef3c7")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#fffbeb")
              }
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: modeColor[p.mode] || "#d97706",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "800",
                  flexShrink: 0,
                }}
              >
                {modeIcon[p.mode] || "💸"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#92400e",
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#b45309",
                    marginTop: "1px",
                  }}
                >
                  {fmtDate(p.payout_date)} · {p.received_by_name} received
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "800",
                    fontFamily: "var(--mono)",
                    color: "#d97706",
                  }}
                >
                  +{fmtAmt(p.amount)}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: "#b45309",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {p.mode.replace("_", " ")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <AddPayoutModal
          ledger={ledger}
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onAdd={addPayout}
          currency={currency}
        />
      )}
      {detailPayout && (
        <PayoutDetailModal
          payout={detailPayout}
          ledger={ledger}
          onClose={() => setDetailPayout(null)}
          currency={currency}
        />
      )}
    </div>
  );
}

// -- LEDGER DETAIL -------------------------------------------------------------

const PLAN_BADGES = {
  light:
    "data:image/webp;base64,UklGRjQFAABXRUJQVlA4WAoAAAAQAAAAQQAAFQAAQUxQSEoCAAAN8Gtt27Ftt23t+/l87+/INqvtmtXsD6utqC4IF8FGWNOa2a41tG3zec49eN9/HSJiArA7XvnI7dddKRjnLQXIEDZHgmWAcjjF8U8/+vx7f2zuI2/8D+y26CYmhAhsMgtgmJEA4tn19z33sR/9hN3zJo7/O4w7JCQkkAQIqwQCyZQRcmKe/7oPfv7sZcf/nx02DAMD43yTBFKTgQFNgMuh/e8DL37H4x7gmAlccLE1kQnQsGY2ubMCTKE997LH/gVdO5eYGY2LJC7MSQQysgksgdlrH/ekf50OmQkEYAJkUkp7aBbk4oQkk7363jtPxyFwBYQwQDIk4LCuhJ2TOG9mXH35RhPNiguSsGgSiMdJJEAILwjowGVnBU3uRENmNtGsSXRYMNwJ0L0AhDgYSTYZNLk2CwazqSvsAA3BqhRC8r8myczVDGZpcLEGaAJP01DYxCISs0jSrNAEGTuypuky64rNGik1aa64cna8BCSPaolhEjRzosFAwkAyxKWJ/nLNWWbnkjQDCGk2x03cnLLUgNDC4/dvv3IRkyYMyTKTBMJMQiEIQMLm9Ouv3nNTEJA0QImuhIFpJEYgAQJr6N+//63jMxeBBBZBMg1XgLQwScCVjEl2fvXdP378hTcdAZtogoyGMJhtIDBglmxCztf0Mfzsb19yaVfmZLOgO1kakp7MJsjkUVeTS37yB/D/N1/7wtvOCqNxaXIVwHAPgZmugRhJ0/7lY9/E/M3bf/OCp9x+1YiGARkr7hBJTrMAEjsJx7/94jtfPMMFVlA4IMQCAADQDgCdASpCABYAPlEijUUjoiETNYA4BQS2AE6Zo5ub278gPyA6gveYzOsAf0D2HZwDzkPRBvEHoAfqB5EvwUnyA3B7QX88f9T3Bv1P/4PXg9C8od2Llr00isugBOMzYPZGmABYv+ac8bwhkcpCaAKbiyRKrdsLYAH+I9oNuBUYAP72NHKjqtb3p/n18bmPxskLDAYmLOF2kJPn0hbx/+uWjmEln0nw/3XI/9vWk03xHucMiT/Tuov23CuKxZJbwfFsP1Pty8jnNwqOeV2IOxdFf8Y9GAn328D0n+on93tPGsm8wOtpwWSwkPh+EC6K+7sX1hKfAV5M5fX6b6uDaN3WZ/avsuXQGHZHfIdccwqEAr4xQbvX15D7Yek42ArXVNZChhe6rjoALAWe2MwWKKtWOttFy3PL6es/wV9/6JfnCwyChBf0u/QmH4cpgMqxUTKbecOrGTsTvMqMjPxQJohzVRGa8sjNxsCJmaNv+bG8E0P6Ij989v+QG7XAcWR0tm5FBCCiS3PaRJmxkr3FtE3+CgVSyk+k0UT1EpVLlaNkHJ6K80BLUo/sMTSTUNtK6QfsmUH9efvne/ZAbsIT/vz5V5P/iXyV9mxJ6pf9JaXTFwblLK9lPP2g2MCwL9oNiQ+xEQ/goBjK7C/goBcZhacl3/TvKs4J9N6srH+/239UR26Hf/9Kk5L+/4xcWuTvvCrcGfQY0qHTuGoX+ylzfmgz0sEYnjgfu/Jwd02J+ohd9ktR1wrZnnlIe/im9Zdjyay1ElrHJ8D7dImfN7aq49Frobhq6KO4umVJB73/96zELjkl7QtEfLTS18HG9PAiytAM0rdKPD2xJcMvI+Gdy/9s/xMf/xixa6Il5n0IXF8Itw6hBr4kFE7iygld1JbdX0o/I9X5xdFuHd6auvxCokssG/MlFZw1PaTL4XF+wwv4CL9agAA=",
  regular:
    "data:image/webp;base64,UklGRjAGAABXRUJQVlA4WAoAAAAQAAAASwAAFQAAQUxQSNECAAAN8KJt27Lntq0dx/2EPmaQrTOT6pKZufcSdN2rQJK7YlK9BuhIdslMrjFDkvc6RFKIiJgAMO6+/Mb9y9dvHx2cPnE8F2/t98wTJ7srV/bWU8/svH7Zk8efP9luXthOHj/eHd084KlHTk8Or2899eTpdv3ohQf/8oe/sQacw3d/+MZzJ5zdu3bA2cvX9jeAK5c2gP3rR3sA+9cPNoArN/f3Aq9c2aCjOy/u1z99wpy7X77J7HbDcFaKRQaLSAeEQIgWmQRgEgdv+tyNb/3Wrn2BOV0KCBYYCDiAtCJnORIG5ojpGMhpH/zYV/7m54+P97cCDGaZrQJIzk1AZoXMNmAGjhKO8sKb3vbtB97CCWGcX2sWSQJIaQaZMCIgAQ4Ya3Tx4Qdf81hbmZFkphmGwSzIVkjAYiQHDTBMwu699tqzgwRiCVYiGZLQiiAlyXAWjkmYIcylN6c5IoUhEgYJaZCADq2QnJWDjgghgTf2T8fZspS0RgNmpdYsx1aOLchZs2YFgS3OJrm3f0rOGkkglBHadts4toJWZmts7XDttt2CZLZJzrY4uXA8tmaFYdiKYdHaOatFrMqwNSbDmhWuETIj1nB8dJyMEOe2klXWyhwxA8Sd2CKsVmYAYhmQrcDzGDLNUlJ2Gm0T24QELIwEEgKTJy/t5Zic20qGFUoD2Aog17QIECdJDGlWYj52+WBYkeeYIeGsUWCE1J2jGKwYB02AsBW1/ff6NZyVEawgIWVWkGQscAxARmhlloTG2f/8lVfWGgFx1qDYILMSMgkQC4HZRhyBkDBnPf3rx3/3rsPQIGe1CAeDbWIljGQa5qDBKgsJgebgV0/6k4ufbQABI6E1JgmRrDBqBS2gVRI66Fgc/f+H8NjX3vT+SwxBoCO0MgnEwawFIcRZ42xaq03+9H1W/usLNz/x0ksHmwJEKAFImMawCAkkCxHAyTl+8pHf/wx3AFZQOCA4AwAAsBAAnQEqTAAWAD5RII1FI6IhFmoGADgFBLYAWpCgvwDnUrsdG/JCMAbYDmZtQA/bH2AOkw8qN35pwR/Kv87pF3Fzdgea3/eejh/l/bd7Zfn/2BP5V/Pf+J2EPRR/bEcdy//afkKS8xPFaN4oo9xsiPegUGvXLHZJ41wIv5vXJGjVGbkd/bA2oyFFfhHTAAD+hI+BSPS19oMdDNQssSVJ5qSxE4++cURGtuE7H7G0Ek9ljNUSQ17zGkIo3MxHnmZEmBVs2QvxEQrSWM969WNUz5OW9xOjxdscE9Gb9rPHAr/khdANe9/p1YxgAB4y/NLjK3N12nhem9Zjz5/+arO5Ak7kI+zsDCNrAZVSX9XdKekvJH+1D78pzja0U88YminDeDD5eHChVf/yw74HIE8jPXPSelWguMav0pEYAqF0Z6333GPPqp+YTwD1rC5Zca9qWXr67+wA2EaPKl+in9OnJfd8uulDeKTUpsskGI4DOqJh/61mLLks09iU/xDvd5H7fkXc01g01kL+81nT/wfkR8/W+/+U0dORmLTD+HNfW8ow9p0lz8xqndMt5RjRrfhI2hv5LigLGZuHm2brei7ZR0cFOHcL6dFQn2jf2k/O4hMksSwMtj+8z5xFGBujZlNlLR/wNRtrLPzjcpPgzk5xF218+/749+zuUXdTj+/HT+Ymon1tiQ2L1hKL/417l5/32LWbZIGLQVzojb/1l06feNf5YdIdDP39uqvt9zVCXBg7PcwhyPuD8OgR7qednLV012+KRsHFrCgkDh00G4N1TZuf/nWWgfL6zWSVscf/XfrQS/FsstD41TYq3wKN8PK9uBTxnPJP/mmDDhV88tdltRrAlxn9DAxWcRd1xIjKIZi4TZ2O4NcvBFoqXSUPhS7/Pn7QyauO+K2LhHAwJASy5t+hzhPPpYyV78xmeGrslr1Os5Dr6kX+M29wVq6PWPXvl45n3Dm9J4OaUS+qBa82AZtFsaKUrbs5bnJTzaZ8iv+Ox4D26uUyz07dno/y7PfjYc+eEw+AwXg+J1UCnHl9RSFQuXjMDJFP3/QzXh9qZeSEgcSq3iP+8ES6/8chOxDaWpu8RxDNAAA=",
  gold: "data:image/webp;base64,UklGRlgFAABXRUJQVlA4WAoAAAAQAAAAPgAAFQAAQUxQSFoCAAAN8Gpt2zLZtm3d9xsRrTMzc5fs2fbSD4LZc1fouuq2K2YmxSSZmZk5s8V7i6i1H0NETADM8tD7PfyOd7jDnW9f1xyPJ852a8fhfNXc5niu83IbllvPHW/p/N9//vWnP/vh32cBz3d9/tNv/d95AT1xecCjwOEWgYMeBhiOB8HDbe94p/s96O+v/bLhPvz1S+25uFy5HDanpFBKBEJzbnt6wss++ubZ7v8arndEFUohiUszMwuNBAu2vffLv/T+8aV7fZqwuKkZIIQ7GSlAJmHI/O9uz3nrH+77GM6zAtiFNUlgJIlJlgAJCcz1k+78qUf8g1kJowkCyKEmw2LKmBUwMJBueeJXHv3fDCSbRZFNElYB3TQ8D/9nID7wd3fd84CEAa7kFKCFpQTmehPDwtP5FsINxHClIQPj5k0Qk124TBjT9SkbkgAkXBMSM2SnhgyMSwPksP89HXfKDAFkZycgMBC3WQ5ZCMYN87BXx6EJwIgpm51WMQOykWrCoCFJZq8PB9ppIpHFJlKrKRqYLSVpIjDA9WqOKayQJLADuZpIO0BCJtnEja9Of7/NbSMkcSXEFWCdZbJkJ7ApuQyEf5x+dqe7ITc0Q1ZMwIImXcSAsAuB2K/yIx655kWCq7By43SnJkIzUgJwj7//Nv/+wDPvdnUgjEsjJkjAcBHQxZBIkrOntx71XX98yfG80gSERiYZGELCTmCSYByPX/gy8r83Xj3rYScEAQwJQYAkEDPkpuL++i3fwc1/v+kLz3jcvW57cA6yZ9cOu8NoCwy0MA67Je71f3//rU+DC1ZQOCDYAgAAMBAAnQEqPwAWAD5RJI9Fo6IhFAQAOAUEtgBdnIAcxpS3qH4uzwB2gNtn4mfpAeoDyZusW9AD9gPTH9iX9rP2w9oB43Hs2cTmx7/Dai/zss73zL/s/cC/jv83/2XX29CD9t0d91arkxZ8prgowY0W+OPMulNG49s4eP9pe9d6O1OxFTVDHLBRa/gAAP78lOr7Jms4liTO/nK+nodOTBhQ/UWNprijY3XZS/CH2u++ogzgaMBfN/7AHSn1cHH/YAmwBP+xlf6t0HJ6wqWcT5/OA/o1nxrXXkrYaBjYnlhqk5T8aq6olCIrxcFJmgvWi9cwIkTrn27PweGgUvWqqYAwdLcau3wF7lSH/zmsv9eVGCSF315MRX8dc2/UIEvvGZwOQY/xDt9QjCn+ffa5v7/BWPcoB7k67/htHKJZ4L6Z3vxjE74h/+SkZ9YrmXKmk000S95gDA1pv/qVDE2H22DShGkf8w4tAepW/5zqHShSo/NG9gw5GeP1FUsl5FfTpcAo8WVN5+PkvOxw1dKDDU8FmpAWcradcpA8izP/yNH5ZCj6SbNjVX3hW+l/S4tu4sgq6W28Cow1q5ZHM6SuDTviJx8JP5zbd+TJOCwjd30TIFTpweqDa6GfDKx5BSH0DpNed1N2EIE5qIz6e52MBFoy/B7b/gAN1lMr91ctWCr0EWDHtGj6dqIPZ6coUK87ftD/Fh04f8/e/gJSDIdVjqof/8WefZaobBQQ1h3U9R538nLvQnRk1eo+zGu0nAvMa3JKA8TX2/gnwq7aBh4bSd9oZbyhXp9oT68P8YsldUAjJu7z5KkUkyfqMiC+cSDnAjNoirBOzNdDRQUfhh+KCHwzU1jvEb4OsVxuVzCeq74SQmL4gbdiCbCUiByupXeOPB/1zPzOfgRyodyO2lLCjRdyTbrU8ImP19M5DTUS+vuJVIAJos/+t92cv+NcGw9+m1ViDc1bnz4AAAA=",
};

const planBadge = (planId, size = 14) => {
  if (!planId || planId === "free") return null;
  const src = PLAN_BADGES[planId];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={planId}
      style={{ height: `${size}px`, display: "block" }}
    />
  );
};
const medals = { free: "⚫", light: "🥉", regular: "🥈", gold: "🥇" };

const planDot = (planId) => {
  const colors = {
    free: "#6B7280",
    light: "#3B82F6",
    regular: "#16A34A",
    gold: "#EAB308",
  };
  const c = colors[planId || "free"] || colors.free;
  return (
    <span
      style={{
        position: "absolute",
        bottom: "-1px",
        right: "-1px",
        width: "13px",
        height: "13px",
        borderRadius: "50%",
        background: c,
        border: "2px solid white",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
};
const withPlanDot = (node, planId) => (
  <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
    {node}
    {planDot(planId || "free")}
  </div>
);
const planLedgerBadge = (planId) => {
  const cfg = {
    free: { label: "Free ledger", color: "#6B7280", bg: "#F3F4F6" },
    light: { label: "Light ledger", color: "#ffffff", bg: "#3B82F6" },
    regular: { label: "Regular ledger", color: "#ffffff", bg: "#16A34A" },
    gold: { label: "Gold ledger", color: "#ffffff", bg: "#EAB308" },
  };
  const c = cfg[planId || "free"] || cfg.free;
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "700",
        padding: "2px 8px",
        borderRadius: "20px",
        background: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
        letterSpacing: "0.2px",
      }}
    >
      {c.label}
    </span>
  );
};
function AvatarWithMedal({
  plan,
  size = 36,
  radius = "50%",
  colorClass,
  children,
  style = {},
  avatarId = null,
}) {
  const isFree = !plan || plan === "free";
  const medalSize = isFree ? Math.round(size * 0.28) : Math.round(size * 0.55);
  const medal = null;
  const avSrc = avatarId ? AVATARS.find((a) => a.id === avatarId)?.src : null;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        flexShrink: 0,
        ...style,
      }}
    >
      {avSrc ? (
        <img
          src={avSrc}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          className={colorClass}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.38,
            fontWeight: "700",
            color: "white",
          }}
        >
          {children}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: isFree
            ? -Math.round(medalSize * 0.3)
            : -Math.round(medalSize * 0.5),
          right: isFree
            ? -Math.round(medalSize * 0.3)
            : -Math.round(medalSize * 0.5),
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        {medal}
      </div>
    </div>
  );
}

function LedgerDetail({
  ledger,
  currentUser,
  onBack,
  onUpdate,
  onNotify,
  onArchive,
  onStartFresh,
  onDeleteCopy,
  onRequestDelete,
  onRespondDelete,
  onCancelDeleteRequest,
  onExecuteDelete,
  isSoloDeletable,
  currency = "RSD",
  userPlan,
  onShowUpgrade,
  seenExpenses = new Set(),
  overLedgerLimit = false,
  overParticipantLimit = false,
  onLeave,
  allLedgers = [],
}) {
  const isArchived = !!ledger.archived;
  const [delCopyConfirm, setDelCopyConfirm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(ledger.name);
  const [showMemberDrop, setShowMemberDrop] = useState(false);
  const dr = ledger.deleteRequest;
  const isAdmin = ledger.members.some(
    (m) => m.user_id === currentUser.id && m.is_admin
  );
  const canPayout = hasPayoutsAccess(userPlan, ledger, currentUser);
  const hasPayoutData = ledger.expenses.some((e) => e.is_payout);
  const showPayoutsTab = canPayout || (hasPayoutData && isAdmin);
  const myMember = ledger.members.find((m) => m.user_id === currentUser.id);
  const isDesktop = useIsDesktop();
  const deleteVoters = ledger.members.filter(
    (m) => !m.is_spectator && m.user_id
  );
  const myConsent = dr && myMember ? dr.consents?.[myMember.id] : null;
  const inCountdown = !!ledger.deleteScheduledAt;
  // Tick once a second while the countdown is running so the displayed time stays accurate.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!inCountdown) return;
    const t = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [inCountdown]);
  const countdownSecondsLeft = inCountdown
    ? secondsUntil(ledger.deleteScheduledAt)
    : null;
  // During the countdown the ledger is locked: no new expenses.
  const deleteLock = inCountdown;

  // Auto-lock: actually perform the lock (not just display it as locked) for
  // any past month that hasn't been locked yet, the moment this ledger is
  // opened on or after the 1st of the following month. Without this, months
  // were only ever "treated as locked" in the UI — lockMonth() itself, and
  // therefore carry-over generation, never ran unless an admin clicked the
  // lock button by hand.
  useEffect(() => {
    if (ledger.auto_lock === false || isArchived || deleteLock) return;
    const nowMk = mk(new Date());
    const monthsPresent = [
      ...new Set(ledger.expenses.map((e) => mk(e.expense_date))),
    ];
    const toLock = monthsPresent
      .filter((m) => m < nowMk && !ledger.lockedMonths?.[m])
      .sort();
    if (toLock.length === 0) return;
    let workingExpenses = ledger.expenses;
    const newLockedMonths = { ...(ledger.lockedMonths || {}) };
    toLock.forEach((m) => {
      newLockedMonths[m] = true;
      if (ledger.carry_balance) {
        const carry = buildCarryoverExpenses(
          { ...ledger, expenses: workingExpenses },
          m
        );
        if (carry.length) workingExpenses = [...workingExpenses, ...carry];
      }
    });
    onUpdate({
      ...ledger,
      lockedMonths: newLockedMonths,
      expenses: workingExpenses,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.id, ledger.auto_lock, ledger.carry_balance, isArchived, deleteLock]);
  const allMks = getMonths(ledger);
  const curMk = mk(new Date());
  const prevMk = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return mk(d);
  })();
  const defMonth = allMks.includes(curMk)
    ? curMk
    : allMks[allMks.length - 1] || curMk;
  const [activeMonth, setActiveMonth] = useState(defMonth);
  const [showExpense, setShowExpense] = useState(false);
  const [detailTab, setDetailTab] = useState("all"); // "all" | "expenses" | "payouts"
  const [showSettings, setShowSettings] = useState(false);
  const [lockConfirm, setLockConfirm] = useState(false);
  const [approvalExp, setApprovalExp] = useState(null);
  const [expandedYear, setExpandedYear] = useState(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const plan = userPlan || PLANS.free;
  // If over participant limit and not admin, treat all as seen (hide new badge + blue rows)
  const effectiveSeenExpenses =
    overParticipantLimit && !isAdmin
      ? new Set(ledger.expenses.map((e) => e.id))
      : seenExpenses;
  const allMonths = [...new Set([...allMks, curMk])].sort();
  const visMonths = visibleMonths(allMonths, plan);
  const curYear = new Date().getFullYear().toString();
  const years = [...new Set(allMonths.map((m) => m.split("-")[0]))].sort();
  const curYearMonths = allMonths.filter((m) => m.startsWith(curYear));
  const pastYears = years.filter((y) => y !== curYear);

  const canAccess = (monthKey) => visMonths.includes(monthKey);

  const effectiveLocked = (monthKey) => {
    if (isArchived) return true;
    if (ledger.lockedMonths?.[monthKey]) return true;
    if (ledger.auto_lock !== false && monthKey < curMk) return true;
    return false;
  };
  const isLocked = effectiveLocked(activeMonth);
  const monthExpenses = ledger.expenses.filter(
    (e) => mk(e.expense_date) === activeMonth
  );
  const months = [...new Set([...allMks, curMk])].sort();
  const cover =
    COVERS.find((c) => c.id === (ledger.cover || "house")) || COVERS[0];

  // Expense limit: per calendar month (resets 1st of each month)
  const monthlyExpenseCount = getMonthlyExpenseCount(ledger);
  const expenseLimit = plan.maxExpensesPerLedger;
  const atExpenseLimit = !!(
    expenseLimit && monthlyExpenseCount >= expenseLimit
  );

  // Member limit
  const activeMemCount = ledger.members.filter((m) => !m.is_spectator).length;
  const atMemberLimit = plan.maxMembers && activeMemCount >= plan.maxMembers;

  // Downgrade conflict detection
  const downgradedFrom = ledger.downgraded_from; // set when plan was lowered
  const conflicts = downgradedFrom ? getDowngradeConflicts(ledger, plan) : [];
  const hasConflict = conflicts.length > 0;
  // History locked if plan historyMonths < months available
  const historyLocked =
    plan.historyMonths && allMks.some((m) => !canAccess(m) && m < curMk);

  const addExpense = (exp) => {
    // Enforce expense limit (settlements bypass)
    if (!exp.is_settlement && atExpenseLimit) {
      onNotify(
        "pending",
        "Monthly limit reached",
        `Your ${plan.name} plan allows ${expenseLimit} expenses per ledger per month. Resets on the 1st.`,
        ledger.name
      );
      onShowUpgrade && onShowUpgrade();
      return;
    }
    onUpdate({ ...ledger, expenses: [...ledger.expenses, exp] });
    if (ledger.notifications_enabled !== false) {
      if (exp.is_settlement)
        onNotify(
          "settlement",
          "Settlement added",
          `${exp.paid_by_name} logged ${fmtAmt(
            exp.amount
          )} ${currency} settlement`,
          ledger.name
        );
      else if (exp.approval_status === "pending")
        onNotify(
          "pending",
          "Pending approval",
          `"${exp.description}" — ${fmtAmt(
            exp.amount
          )} ${currency} needs approval`,
          ledger.name
        );
      else if (exp.is_payout)
        onNotify(
          "new-expense",
          "New payout received",
          `"${exp.description}" — ${fmtAmt(exp.amount)} ${currency}`,
          ledger.name
        );
      else
        onNotify(
          "new-expense",
          "New expense added",
          `"${exp.description}" — ${fmtAmt(exp.amount)} ${currency}`,
          ledger.name
        );
    }
  };
  const lockMonth = () => {
    const carryExpenses = ledger.carry_balance
      ? buildCarryoverExpenses(ledger, activeMonth)
      : [];
    onUpdate({
      ...ledger,
      lockedMonths: { ...(ledger.lockedMonths || {}), [activeMonth]: true },
      expenses: carryExpenses.length
        ? [...ledger.expenses, ...carryExpenses]
        : ledger.expenses,
    });
    setLockConfirm(false);
    if (ledger.notifications_enabled !== false)
      onNotify(
        "locked",
        "Month locked",
        carryExpenses.length
          ? `${mlbl(
              activeMonth
            )} is finalized — balances carried into next month`
          : `${mlbl(activeMonth)} is now finalized`,
        ledger.name
      );
  };
  const updateApproval = (expId, status) => {
    onUpdate({
      ...ledger,
      expenses: ledger.expenses.map((e) =>
        e.id === expId ? { ...e, approval_status: status } : e
      ),
    });
    if (ledger.notifications_enabled !== false) {
      const exp = ledger.expenses.find((e) => e.id === expId);
      if (exp) {
        if (status === "approved")
          onNotify(
            "approved",
            "Expense approved",
            `"${exp.description}"  -  ${fmtAmt(exp.amount)} RSD approved`,
            ledger.name
          );
        else
          onNotify(
            "denied",
            "Expense denied",
            `"${exp.description}" was denied`,
            ledger.name
          );
      }
    }
  };

  return (
    <div
      style={isArchived ? { filter: "grayscale(1)", opacity: 0.92 } : undefined}
    >
      <button className="back-btn" onClick={onBack}>
        <Icon.ChevL /> All ledgers
      </button>
      {isArchived && (
        <div
          style={{
            background: "#f3f4f6",
            border: "2px solid #e5e7eb",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#374151",
                }}
              >
                This is your copy of an archived ledger
              </div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}
              >
                Read-only and frozen. This copy is yours — deleting it won't
                affect other members' copies.
              </div>
            </div>
            {isAdmin && (
              <button
                className="btn btn-primary"
                style={{
                  fontSize: "12px",
                  padding: "7px 14px",
                  whiteSpace: "nowrap",
                }}
                onClick={() => onStartFresh && onStartFresh(ledger)}
              >
                <Icon.Plus /> Start fresh
              </button>
            )}
            {!delCopyConfirm && (
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "7px 14px",
                  whiteSpace: "nowrap",
                  color: "var(--danger)",
                  borderColor: "#fecaca",
                }}
                onClick={() => setDelCopyConfirm(true)}
              >
                Delete my copy
              </button>
            )}
          </div>
          {/* Rename my copy */}
          {renaming ? (
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1.5px solid var(--accent)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                className="btn btn-primary"
                style={{ fontSize: "12px", padding: "7px 12px" }}
                onClick={() => {
                  if (newName.trim())
                    onUpdate({ ...ledger, name: newName.trim() });
                  setRenaming(false);
                }}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "12px", padding: "7px 12px" }}
                onClick={() => {
                  setNewName(ledger.name);
                  setRenaming(false);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              style={{
                marginTop: "8px",
                background: "none",
                border: "none",
                fontSize: "12px",
                color: "var(--text3)",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "0",
                textDecoration: "underline",
              }}
            >
              ✏️ Rename my copy
            </button>
          )}
          {delCopyConfirm && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#374151",
                  marginBottom: "10px",
                }}
              >
                Delete <strong>your</strong> copy of "{ledger.name}"? This
                removes it only from your archive. Every other member keeps
                their own copy — this cannot be undone for you.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "7px 14px" }}
                  onClick={() => setDelCopyConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{
                    fontSize: "12px",
                    padding: "7px 14px",
                    background: "var(--danger)",
                    color: "white",
                  }}
                  onClick={() => {
                    setDelCopyConfirm(false);
                    onDeleteCopy && onDeleteCopy(ledger.id);
                  }}
                >
                  Delete my copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {hasConflict && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #fca5a5",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: "#dc2626",
              marginBottom: "6px",
            }}
          >
            ⚠ Plan downgrade — action required
          </div>
          {conflicts.map((c, i) => (
            <div
              key={i}
              style={{
                fontSize: "12px",
                color: "#b91c1c",
                marginBottom: "4px",
              }}
            >
              {c.type === "members" &&
                `This ledger has ${
                  c.count
                } active members but your plan allows ${
                  c.limit
                }. Admin must remove ${c.count - c.limit} member(s) to unlock.`}
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "6px" }}>
            Ledger is locked until conflicts are resolved or plan is upgraded.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: "10px", fontSize: "12px", padding: "6px 14px" }}
            onClick={() => onShowUpgrade && onShowUpgrade()}
          >
            Upgrade plan
          </button>
        </div>
      )}
      {overLedgerLimit && !isArchived && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #fca5a5",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: "14px",
            fontSize: "12px",
            color: "#dc2626",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span>🔒 Ledger limit exceeded — new entries are blocked.</span>
          <button
            className="btn btn-primary"
            style={{ fontSize: "11px", padding: "5px 12px" }}
            onClick={() => onShowUpgrade && onShowUpgrade()}
          >
            Upgrade
          </button>
        </div>
      )}
      {overParticipantLimit && !isArchived && !isAdmin && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #fca5a5",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: "12px",
                color: "#dc2626",
                fontWeight: "600",
              }}
            >
              🔒 You've exceeded your participation limit. You can't add
              expenses or see new entries here. Leave this ledger or upgrade
              your plan.
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "11px",
                  padding: "5px 12px",
                  color: "#dc2626",
                  borderColor: "#fca5a5",
                }}
                onClick={() => onLeave && onLeave(ledger.id)}
              >
                Leave ledger
              </button>
              <button
                className="btn btn-primary"
                style={{ fontSize: "11px", padding: "5px 12px" }}
                onClick={() => onShowUpgrade && onShowUpgrade()}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
      {!isArchived && dr && (
        <div
          style={{
            background: inCountdown ? "#fef2f2" : "#fffbeb",
            border: `2px solid ${inCountdown ? "#fecaca" : "#fde68a"}`,
            borderRadius: "var(--radius)",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              {inCountdown ? (
                <>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#b91c1c",
                    }}
                  >
                    This ledger will be deleted in{" "}
                    {formatCountdown(countdownSecondsLeft)}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "2px",
                    }}
                  >
                    All members approved. The ledger is locked — no new
                    expenses. Only the admin can cancel this now; you can still
                    choose to keep a personal copy.
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#92400e",
                    }}
                  >
                    Deletion requested
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#b45309",
                      marginTop: "2px",
                    }}
                  >
                    The admin asked to delete this ledger. All members with the
                    app must approve before the 3-day countdown begins.
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "7px 14px",
                  whiteSpace: "nowrap",
                }}
                onClick={() => onCancelDeleteRequest(ledger.id)}
              >
                Withdraw request
              </button>
            )}
          </div>

          {/* Per-member status */}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: `1px solid ${inCountdown ? "#fecaca" : "#fde68a"}`,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {deleteVoters.map((m) => {
              const st = dr.consents?.[m.id] || "pending";
              const isMe = m.user_id === currentUser.id;
              const c =
                st === "approved"
                  ? { bg: "#ecfdf5", fg: "#059669", t: "Approved" }
                  : st === "rejected"
                  ? { bg: "#fef2f2", fg: "#dc2626", t: "Rejected" }
                  : {
                      bg: "#f3f4f6",
                      fg: "#6b7280",
                      t: inCountdown ? "—" : "Waiting",
                    };
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {m.display_name}
                    {isMe && " (you)"}
                    {ledger.members[0]?.id === m.id && " · admin"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 9px",
                      borderRadius: "20px",
                      background: c.bg,
                      color: c.fg,
                    }}
                  >
                    {c.t}
                  </span>
                </div>
              );
            })}
          </div>

          {/* My consent controls — exactly 3 choices: Approve / Approve & keep my copy / Reject.
              During the countdown, rejecting is no longer possible — only the admin can
              cancel the whole deletion (Withdraw request, above). Members can still upgrade
              from "no copy" to "keep my copy" while the countdown runs. */}
          {myMember &&
            (() => {
              const myCopyChoice = dr.copyChoices?.[myMember.id] || "none";
              if (inCountdown) {
                return (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #fecaca",
                    }}
                  >
                    {myCopyChoice === "archive" ? (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#b91c1c",
                          fontWeight: "700",
                        }}
                      >
                        ✓ You're keeping a personal copy in your Archive.
                      </span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#b91c1c",
                            fontWeight: "700",
                          }}
                        >
                          You approved without keeping a copy.
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                          onClick={() =>
                            onRespondDelete(ledger.id, "approved", "archive")
                          }
                        >
                          Actually, keep my copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #fde68a",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      marginBottom: "8px",
                      color: myConsent === "approved" ? "#059669" : "#374151",
                    }}
                  >
                    {myConsent === "approved"
                      ? `You approved${
                          myCopyChoice === "archive"
                            ? " — keeping a copy in your Archive"
                            : ""
                        }.`
                      : "The admin wants to delete this ledger. Do you approve? Rejecting cancels the request for everyone."}
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "7px 14px" }}
                      onClick={() =>
                        onRespondDelete(ledger.id, "approved", "none")
                      }
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "7px 14px" }}
                      onClick={() =>
                        onRespondDelete(ledger.id, "approved", "archive")
                      }
                    >
                      Approve & keep my copy
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{
                        fontSize: "12px",
                        padding: "7px 14px",
                        color: "var(--danger)",
                        borderColor: "#fecaca",
                      }}
                      onClick={() => onRespondDelete(ledger.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })()}

          {/* Admin: execute when countdown elapsed (or simulate) */}
          {isAdmin && inCountdown && countdownSecondsLeft === 0 && (
            <div style={{ marginTop: "12px" }}>
              <button
                className="btn"
                style={{
                  width: "100%",
                  fontSize: "12px",
                  background: "var(--danger)",
                  color: "white",
                }}
                onClick={() => onExecuteDelete(ledger.id)}
              >
                Delete now (countdown complete)
              </button>
            </div>
          )}
        </div>
      )}
      <div className="ledger-hd">
        <CoverImg
          cover={cover.id}
          height={80}
          coverColor={ledger.coverColor}
          labelColor={ledger.labelColor}
          customLabel={ledger.customLabel}
        />
        <div className="ledger-hd-content">
          <div className="ledger-hd-top">
            <div>
              <div className="ledger-hd-title">{ledger.name}</div>
              <div className="ledger-hd-sub">
                {ledger.expenses.filter((e) => !e.is_settlement).length}{" "}
                expenses .{" "}
                {ledger.expenses.filter((e) => e.is_settlement).length}{" "}
                settlements
                {ledger.require_approval && (
                  <span className="approval-tag" style={{ marginLeft: "8px" }}>
                    Approval on
                  </span>
                )}
              </div>
            </div>
            <div className="ledger-hd-actions">
              {!isLocked && !isArchived && !deleteLock && atExpenseLimit && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "5px 10px",
                    fontSize: "11px",
                    color: "#dc2626",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                  onClick={() => onShowUpgrade && onShowUpgrade()}
                >
                  ⚠ {monthlyExpenseCount}/{expenseLimit} this month —{" "}
                  <span style={{ textDecoration: "underline" }}>Upgrade</span>
                </div>
              )}
              {!isLocked && !isArchived && !deleteLock && (
                <button
                  className="btn btn-primary"
                  style={{
                    fontSize: "12px",
                    padding: "8px 12px",
                    opacity:
                      atExpenseLimit ||
                      hasConflict ||
                      overLedgerLimit ||
                      overParticipantLimit
                        ? 0.4
                        : 1,
                    cursor:
                      atExpenseLimit ||
                      hasConflict ||
                      overLedgerLimit ||
                      overParticipantLimit
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() =>
                    !atExpenseLimit &&
                    !hasConflict &&
                    !overLedgerLimit &&
                    !overParticipantLimit &&
                    setShowExpense(true)
                  }
                >
                  <Icon.Plus /> Add
                </button>
              )}
              {!isArchived && (
                <button
                  className="btn-icon"
                  onClick={() => setShowSettings(true)}
                >
                  <Icon.Gear />
                </button>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "5px",
              alignItems: "center",
              position: "relative",
            }}
          >
            {ledger.members.slice(0, 4).map((m, i) => {
              const isMe = m.user_id === currentUser.id;
              const showLeave = isMe && !isAdmin && overParticipantLimit;
              return (
                <div
                  key={m.id}
                  className="mpill"
                  style={{ opacity: m.is_spectator ? 0.65 : 1 }}
                >
                  {withPlanDot(
                    <AvatarWithMedal
                      plan={m.plan}
                      size={26}
                      radius="50%"
                      colorClass={`mpill-av av${i % 10}`}
                      avatarId={m.avatar || null}
                    >
                      {initials(m.display_name)}
                    </AvatarWithMedal>,
                    m.plan
                  )}
                  <span style={{ fontSize: "11px" }}>
                    {m.display_name}
                    {isMe ? " (you)" : ""}
                  </span>
                  {m.is_spectator ? (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        color: "#6b7280",
                        background: "#f3f4f6",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      viewer
                    </span>
                  ) : (
                    <span className="mpill-pct">{m.share_percent}%</span>
                  )}
                  {showLeave && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLeave && onLeave(ledger.id);
                      }}
                      style={{
                        background: "#fca5a5",
                        border: "none",
                        borderRadius: "50%",
                        width: "16px",
                        height: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "9px",
                        fontWeight: "800",
                        color: "#dc2626",
                        padding: 0,
                        marginLeft: "2px",
                        flexShrink: 0,
                      }}
                      title="Leave this ledger"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {ledger.members.length > 4 && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMemberDrop((p) => !p);
                  }}
                  className="mpill"
                  style={{
                    cursor: "pointer",
                    background: "var(--accent-light)",
                    borderColor: "var(--accent)",
                    color: "var(--accent)",
                    fontWeight: "700",
                    fontSize: "11px",
                    gap: "4px",
                  }}
                >
                  +{ledger.members.length - 4} more ▾
                </button>
                {showMemberDrop && (
                  <div
                    style={{
                      position: "fixed",
                      top: "auto",
                      left: "auto",
                      zIndex: 999,
                      background: "white",
                      border: "1.5px solid var(--border)",
                      borderRadius: "12px",
                      padding: "8px",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      minWidth: "160px",
                    }}
                    ref={(el) => {
                      if (el) {
                        const btn = el.previousSibling;
                        if (btn) {
                          const r = btn.getBoundingClientRect();
                          el.style.top = r.bottom + 4 + "px";
                          el.style.left =
                            Math.min(r.left, window.innerWidth - 170) + "px";
                        }
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ledger.members.slice(4).map((m, i) => (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "4px 6px",
                          borderRadius: "8px",
                          background: "var(--bg)",
                        }}
                      >
                        {withPlanDot(
                          <AvatarWithMedal
                            plan={m.plan}
                            size={22}
                            radius="50%"
                            colorClass={`mpill-av av${(i + 4) % 10}`}
                            avatarId={m.avatar || null}
                          >
                            {initials(m.display_name)}
                          </AvatarWithMedal>,
                          m.plan
                        )}
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "var(--text2)",
                          }}
                        >
                          {m.display_name}
                        </span>
                        {!m.is_spectator && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--text3)",
                              fontFamily: "var(--mono)",
                              marginLeft: "auto",
                            }}
                          >
                            {m.share_percent}%
                          </span>
                        )}
                        {m.is_spectator && (
                          <span
                            style={{
                              fontSize: "9px",
                              color: "#6b7280",
                              marginLeft: "auto",
                            }}
                          >
                            viewer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const YEAR_COLORS = {
          2024: { pill: "#7c3aed", bg: "#f5f3ff", text: "#5b21b6" },
          2025: { pill: "#0369a1", bg: "#e0f2fe", text: "#0c4a6e" },
          2023: { pill: "#065f46", bg: "#d1fae5", text: "#064e3b" },
          2022: { pill: "#92400e", bg: "#fef3c7", text: "#78350f" },
        };
        const getYC = (yr) =>
          YEAR_COLORS[yr] || {
            pill: "#374151",
            bg: "#f3f4f6",
            text: "#111827",
          };
        const sortedCurYear = [...curYearMonths].sort();
        // Show only last 3 by default, or all if expanded
        const visibleCurMonths = showAllMonths
          ? sortedCurYear
          : sortedCurYear.slice(-3);

        return (
          <div
            style={{
              overflowX: "auto",
              paddingBottom: "6px",
              marginBottom: "10px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "6px",
                minWidth: "max-content",
                padding: "2px 0",
                alignItems: "center",
              }}
            >
              {/* Expand/collapse older months */}
              {!showAllMonths &&
                (sortedCurYear.length > 3 || pastYears.length > 0) && (
                  <button
                    onClick={() => setShowAllMonths(true)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "20px",
                      border: "1.5px solid var(--border)",
                      fontFamily: "inherit",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      color: "var(--text3)",
                      background: "var(--bg)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    ‹ All
                  </button>
                )}

              {/* Past year pills — only when expanded */}
              {showAllMonths &&
                [...pastYears].sort().map((yr) => {
                  const yc = getYC(yr);
                  const isOpen = expandedYear === yr;
                  const yearMonths = [...allMonths]
                    .filter((m) => m.startsWith(yr))
                    .sort();
                  return (
                    <div
                      key={yr}
                      style={{
                        position: "relative",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => setExpandedYear(isOpen ? null : yr)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: `1.5px solid ${yc.pill}`,
                          fontFamily: "inherit",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          background: isOpen ? yc.pill : yc.bg,
                          color: isOpen ? "white" : yc.text,
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          transition: "all 0.15s",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        {yr} {isOpen ? "▲" : "▼"}
                      </button>
                      {isOpen && (
                        <div
                          style={{
                            position: "fixed",
                            zIndex: 999,
                            background: "white",
                            border: `2px solid ${yc.pill}`,
                            borderRadius: "14px",
                            padding: "10px",
                            boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "5px",
                            width: "220px",
                          }}
                          ref={(el) => {
                            if (el) {
                              const btn = el.previousSibling;
                              if (btn) {
                                const r = btn.getBoundingClientRect();
                                el.style.top = r.bottom + 6 + "px";
                                el.style.left =
                                  Math.min(r.left, window.innerWidth - 230) +
                                  "px";
                              }
                            }
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: yc.text,
                              marginBottom: "4px",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {yr}
                          </div>
                          {yearMonths.map((m) => {
                            const accessible = canAccess(m);
                            const isActive = m === activeMonth;
                            return (
                              <button
                                key={m}
                                onClick={() => {
                                  if (accessible) {
                                    setActiveMonth(m);
                                    setExpandedYear(null);
                                  } else onShowUpgrade && onShowUpgrade();
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "10px",
                                  fontFamily: "inherit",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: accessible
                                    ? "pointer"
                                    : "not-allowed",
                                  whiteSpace: "nowrap",
                                  background: isActive
                                    ? yc.pill
                                    : accessible
                                    ? yc.bg
                                    : "#f3f4f6",
                                  color: isActive
                                    ? "white"
                                    : accessible
                                    ? yc.text
                                    : "#9ca3af",
                                  border: `1.5px solid ${
                                    isActive
                                      ? yc.pill
                                      : accessible
                                      ? yc.pill + "55"
                                      : "#e5e7eb"
                                  }`,
                                }}
                              >
                                {!accessible && "🔒 "}
                                {MONTHS[parseInt(m.split("-")[1]) - 1]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Current year months (last 3 or all) */}
              {visibleCurMonths.map((m) => {
                const locked = effectiveLocked(m);
                const accessible = canAccess(m);
                const isActive = m === activeMonth;
                const isCurrent = m === curMk;
                let bg, color, border;
                if (isActive) {
                  bg = "#16a34a";
                  color = "white";
                  border = "none";
                } else if (!accessible) {
                  bg = "#f3f4f6";
                  color = "#9ca3af";
                  border = "1.5px solid #e5e7eb";
                } else if (locked) {
                  bg = "#1e1b4b";
                  color = "white";
                  border = "none";
                } else if (isCurrent) {
                  bg = "white";
                  color = "var(--accent)";
                  border = "2px solid var(--accent)";
                } else {
                  bg = "white";
                  color = "var(--text2)";
                  border = "1.5px solid var(--border)";
                }
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (accessible) setActiveMonth(m);
                      else onShowUpgrade && onShowUpgrade();
                    }}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "20px",
                      border,
                      fontFamily: "inherit",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: accessible ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexShrink: 0,
                      background: bg,
                      color,
                      transition: "all 0.12s",
                    }}
                  >
                    {!accessible && "🔒 "}
                    {accessible && locked && !isActive && "🔒 "}
                    {mlbl(m)}
                  </button>
                );
              })}

              {/* Collapse button */}
              {showAllMonths && (
                <button
                  onClick={() => {
                    setShowAllMonths(false);
                    setExpandedYear(null);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "20px",
                    border: "1.5px solid var(--border)",
                    fontFamily: "inherit",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    color: "var(--text3)",
                    background: "var(--bg)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  ✕ Less
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "10px",
          fontSize: "10px",
          color: "var(--text3)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#16a34a",
              display: "inline-block",
            }}
          />{" "}
          Active
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#1e1b4b",
              display: "inline-block",
            }}
          />{" "}
          Locked
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#9ca3af",
              display: "inline-block",
            }}
          />{" "}
          Plan limit
        </span>
      </div>

      {isLocked && (
        <div className="locked-banner">
          <span></span>
          <span>
            <strong>{mlbl(activeMonth)} is locked</strong> - official record.
          </span>
        </div>
      )}

      <div
        style={
          isDesktop
            ? {
                display: "grid",
                gridTemplateColumns: "320px 1fr",
                gap: "24px",
                alignItems: "start",
              }
            : undefined
        }
      >
        <div>
          <StatementCard
            ledger={ledger}
            monthExpenses={monthExpenses}
            activeMonth={activeMonth}
            currentUser={currentUser}
            currency={currency}
          />
        </div>

        {/* View filter — All / Expenses / Payouts */}
        <div>
          {(() => {
            // monthExpenses already contains everything — split by type, no duplication
            const allEntries = [...monthExpenses]
              .map((e) => ({ ...e, _type: e.is_payout ? "payout" : "expense" }))
              .sort(
                (a, b) => new Date(b.expense_date) - new Date(a.expense_date)
              );
            const expOnly = allEntries.filter((e) => e._type === "expense");
            const payOnly = allEntries.filter((e) => e._type === "payout");
            const payCount = payOnly.length;
            const shown =
              detailTab === "expenses"
                ? expOnly
                : detailTab === "payouts"
                ? payOnly
                : allEntries;

            return (
              <>
                <div
                  style={{ display: "flex", gap: "5px", marginBottom: "12px" }}
                >
                  {[
                    { id: "all", label: "All" },
                    { id: "expenses", label: "Expenses" },
                    ...(showPayoutsTab
                      ? [{ id: "payouts", label: "Payouts", count: payCount }]
                      : []),
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDetailTab(t.id)}
                      style={{
                        padding: "6px 13px",
                        borderRadius: "20px",
                        border: `1.5px solid ${
                          detailTab === t.id ? "#d97706" : "var(--border)"
                        }`,
                        fontFamily: "inherit",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: detailTab === t.id ? "#d97706" : "white",
                        color: detailTab === t.id ? "white" : "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span
                          style={{
                            background:
                              detailTab === t.id
                                ? "rgba(255,255,255,0.3)"
                                : "#d97706",
                            color: "white",
                            borderRadius: "20px",
                            padding: "1px 6px",
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="exp-card">
                  <div className="exp-card-header">
                    <h3>
                      {detailTab === "payouts"
                        ? "Payouts"
                        : detailTab === "expenses"
                        ? "Transactions"
                        : "All entries"}
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        fontWeight: "600",
                      }}
                    >
                      {shown.length} entries
                    </span>
                  </div>
                  {shown.length === 0 ? (
                    <div className="exp-empty">
                      No{" "}
                      {detailTab === "payouts"
                        ? "payouts"
                        : detailTab === "expenses"
                        ? "transactions"
                        : "entries"}{" "}
                      for {mlbl(activeMonth)}.
                      {!isLocked && " Add the first one!"}
                    </div>
                  ) : (
                    shown.map((exp) => {
                      const isPayout = exp._type === "payout";
                      const isPending = exp.approval_status === "pending";
                      const isDenied = exp.approval_status === "denied";
                      const isSettle = exp.is_settlement;
                      const isCarryover = exp.is_carryover;
                      const rowClass = isPayout
                        ? "row-settle"
                        : isSettle
                        ? "row-settle"
                        : isCarryover
                        ? "row-settle"
                        : isPending
                        ? "row-pending"
                        : isDenied
                        ? "row-denied"
                        : "row-approved";
                      const isNew =
                        !effectiveSeenExpenses.has(exp.id) &&
                        !isSettle &&
                        !isCarryover &&
                        !isPayout &&
                        !isPending &&
                        !isDenied;
                      // % badge for expenses with custom split vs ledger shares
                      const hasCustomSplit =
                        !isCarryover &&
                        !isSettle &&
                        !isPayout &&
                        exp.splits &&
                        exp.splits.some((s) => {
                          const mem = ledger.members.find(
                            (m) => m.id === s.member_id
                          );
                          return (
                            mem &&
                            Math.abs(s.share_percent - mem.share_percent) > 0.01
                          );
                        });
                      // % badge for payouts with custom split vs ledger shares
                      const hasPayoutCustomSplit =
                        isPayout &&
                        exp.splits &&
                        exp.splits.some((s) => {
                          const mem = ledger.members.find(
                            (m) => m.id === s.member_id
                          );
                          return (
                            mem &&
                            Math.abs(s.share_percent - mem.share_percent) > 0.01
                          );
                        });
                      return (
                        <div
                          key={exp.id}
                          className={`exp-row ${rowClass}`}
                          style={{
                            cursor: "pointer",
                            background: isPayout
                              ? "#fffbeb"
                              : isNew
                              ? "#eff6ff"
                              : undefined,
                            borderLeft: isPayout
                              ? "3px solid #d97706"
                              : isNew
                              ? "3px solid #93c5fd"
                              : undefined,
                          }}
                          onClick={() =>
                            isPayout ? setApprovalExp(exp) : setApprovalExp(exp)
                          }
                        >
                          <div className="exp-date">
                            {fmtDate(exp.expense_date)}
                          </div>
                          <div className="exp-info">
                            <div className="exp-desc">{exp.description}</div>
                            <div className="exp-meta">
                              {isPayout ? (
                                <span
                                  style={{
                                    color: "#d97706",
                                    fontWeight: "600",
                                  }}
                                >
                                  💸{" "}
                                  {exp.payout_record
                                    ? "Record only"
                                    : exp.payout_offset
                                    ? "Offsets balances"
                                    : "Payout"}
                                </span>
                              ) : isCarryover &&
                                exp.splits?.length === 1 &&
                                ledger.members.find(
                                  (m) => m.id === exp.splits[0].member_id
                                ) ? (
                                <span style={{ color: "var(--settle)" }}>
                                  {
                                    ledger.members.find(
                                      (m) =>
                                        m.id === exp.splits[0].member_id
                                    ).display_name
                                  }{" "}
                                  owes {exp.paid_by_name}
                                </span>
                              ) : (
                                exp.paid_by_name +
                                " paid" +
                                (isSettle &&
                                exp.splits?.length === 1 &&
                                ledger.members.find(
                                  (m) => m.id === exp.splits[0].member_id
                                )
                                  ? ` to ${
                                      ledger.members.find(
                                        (m) => m.id === exp.splits[0].member_id
                                      ).display_name
                                    }`
                                  : "")
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "3px",
                              minWidth: "70px",
                            }}
                          >
                            {isPayout ? (
                              <>
                                {hasPayoutCustomSplit && (
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: "700",
                                      color: "#d97706",
                                      background: "#fffbeb",
                                      padding: "1px 5px",
                                      borderRadius: "20px",
                                      border: "1px solid #fde68a",
                                    }}
                                  >
                                    %
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    color: "#d97706",
                                    background: "#fffbeb",
                                    padding: "1px 5px",
                                    borderRadius: "20px",
                                    border: "1px solid #fde68a",
                                  }}
                                >
                                  Payout
                                </span>
                              </>
                            ) : isSettle ? (
                              <span
                                className="status-tag tag-settle"
                                style={{ fontSize: "9px", padding: "1px 5px" }}
                              >
                                Settlement
                              </span>
                            ) : isCarryover ? (
                              <span
                                className="status-tag tag-settle"
                                style={{ fontSize: "9px", padding: "1px 5px" }}
                              >
                                Carry-over
                              </span>
                            ) : isPending ? (
                              <span
                                className="status-tag tag-pending"
                                style={{ fontSize: "9px", padding: "1px 5px" }}
                              >
                                Pending
                              </span>
                            ) : isDenied ? (
                              <span
                                className="status-tag tag-denied"
                                style={{ fontSize: "9px", padding: "1px 5px" }}
                              >
                                Denied
                              </span>
                            ) : hasCustomSplit ? (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "700",
                                  color: "#7c3aed",
                                  background: "#f5f3ff",
                                  padding: "1px 5px",
                                  borderRadius: "20px",
                                  border: "1px solid #ddd6fe",
                                }}
                              >
                                %
                              </span>
                            ) : null}
                            <div
                              className={`exp-amt${
                                isPayout
                                  ? " settle-color"
                                  : isSettle
                                  ? " settle-color"
                                  : isDenied
                                  ? " denied-color"
                                  : ""
                              }`}
                            >
                              {isPayout ? "+" : ""}
                              {fmtAmt(exp.amount)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {!isLocked &&
        monthExpenses.filter(
          (e) => e.approval_status === "approved" && !e.is_payout
        ).length > 0 &&
        ledger.auto_lock === false &&
        isAdmin && (
          <div className="lock-section">
            {!lockConfirm ? (
              <button
                className="btn btn-lock"
                style={{ fontSize: "12px", padding: "8px 14px" }}
                onClick={() => setLockConfirm(true)}
              >
                <Icon.Lock /> Lock {mlbl(activeMonth)}
              </button>
            ) : (
              <div className="lock-confirm">
                <span>Lock this month? Cannot be undone.</span>
                <button
                  className="btn btn-lock"
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                  onClick={lockMonth}
                >
                  Yes, lock
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                  onClick={() => setLockConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      {ledger.auto_lock !== false && activeMonth < mk(new Date()) === false && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text3)",
            textAlign: "center",
            padding: "8px 0",
            fontStyle: "italic",
          }}
        >
          Auto-lock is on — past months lock automatically.
        </div>
      )}

      {showExpense && (
        <AddExpenseModal
          ledger={ledger}
          currentUser={currentUser}
          onClose={() => setShowExpense(false)}
          onAdd={addExpense}
          currency={currency}
          canPayout={canPayout}
        />
      )}
      {showSettings && (
        <LedgerSettingsModal
          ledger={ledger}
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
          onLeave={onLeave}
          onUpdate={(u) => {
            onUpdate(u);
            setShowSettings(false);
          }}
          onArchive={(id) => {
            setShowSettings(false);
            onArchive(id);
            if (ledger.notifications_enabled !== false)
              onNotify(
                "locked",
                "Ledger archived",
                `"${ledger.name}" was moved to archive`,
                ledger.name
              );
          }}
          isSoloDeletable={isSoloDeletable}
          onRequestDelete={(id) => {
            setShowSettings(false);
            onRequestDelete(id);
          }}
          onExecuteDelete={(id) => {
            setShowSettings(false);
            onExecuteDelete(id);
          }}
          userPlan={plan}
          onShowUpgrade={onShowUpgrade}
          allLedgers={allLedgers}
        />
      )}
      {approvalExp && (
        <ExpenseDetailModal
          exp={approvalExp}
          ledger={ledger}
          currentUser={currentUser}
          isLocked={isLocked}
          onClose={() => setApprovalExp(null)}
          onApprove={(id) => {
            updateApproval(id, "approved");
            setApprovalExp(null);
          }}
          onDeny={(id) => {
            updateApproval(id, "denied");
            setApprovalExp(null);
          }}
          currency={currency}
        />
      )}
    </div>
  );
}

// -- NOTIFICATION SYSTEM -------------------------------------------------------
function useNotifications() {
  const [toasts, setToasts] = useState([]);
  const push = (type, title, body, ledgerName) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, title, body, ledgerName }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, push, dismiss };
}

function ToastContainer({ toasts, dismiss }) {
  const icons = {
    pending: "",
    approved: "",
    denied: "",
    "new-expense": "",
    locked: "",
    settlement: "",
  };
  return (
    <div className="notif-toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="notif-toast">
          <div className={`notif-icon ${t.type}`}>{icons[t.type] || ""}</div>
          <div className="notif-content">
            <div className="notif-title">{t.title}</div>
            <div className="notif-body">{t.body}</div>
            {t.ledgerName && <div className="notif-ledger">{t.ledgerName}</div>}
          </div>
          <button className="notif-close" onClick={() => dismiss(t.id)}>
            x
          </button>
        </div>
      ))}
    </div>
  );
}

const AVATARS = [
  {
    id: "av1",
    gender: "m",
    label: "Dark hair, stubble",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av2",
    gender: "f",
    label: "Red updo, freckles",
    src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGiEcFxgfGRQUHScdHyIjJSUlFhwpLCgkKyEkJST/2wBDAQYGBgkICREJCREkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCT/wAARCACgAKADASIAAhEBAxEB/8QAHAAAAQQDAQAAAAAAAAAAAAAAAAQFBgcCAwgB/8QAQhAAAgEDAQYEAwQGCQMFAAAAAQIDAAQFEQYSITFBUQcTImEycZEUUoGhCCNCYnKxFTOCksHC0eHwFkOiJERjc9L/xAAaAQACAwEBAAAAAAAAAAAAAAADBAACBQEG/8QAKhEAAgIBBAEEAQQDAQAAAAAAAQIAAxEEEiExQRMiMlEFQmFxgRQjM/D/2gAMAwEAAhEDEQA/AOqKKKKkkKKKKkkKKxkkSJC7sFUcyaZrzPMSUtV0H32HH8BVWcL3CV1NYfbHiWaOBd6WRUHdjTfNnrdOEaPIe/IVFMtnIrKRFm8+6u5VLR28I35HUc24kBVHDVmIA71B8n4yQYi8Fvc4R3BPE29/DMV+e7qB9aUt1YXviaNP47d+8tiTPXDfBHGg99Sa0nMXp/7qj5KKp298e7KOdI7XDTqjc5LqQD6Kmuv1qQ7L+KuF2iyMeMci2vJf6niTHMfugkAhvYjj0JoK6tWOA0ZOh2DJSWCMzej/ALqn5qK3R564XTfjjf5aio5Y5dLnK32KlUJdWgSXh8MkT67rDsdQQR0I7GnHSiixvBgmoTysfoc7budJFeI9+YpfFNHMu9G6uvdTrUSrJJXhbfjZkYdQaIt5HcA+jU/HiS6imWzzp4JdLqPvqP5inhJElQOjBlPIg0wrhuojZU1Zw0yoooq0HCiiipJCiiipJCtN1dR2kXmSH2AHMmvbi4S2haWQ6AfUntUburp7uUySH5Doo7UOyzbGKKPUOT1C9vZbx9ZDoo+FRyFIL29tcdayXd7cw2tvGNXlmcKq/Mmsry6isbSa7nYrDBG0jkcwoGp/GufPFvL3WTyptr6UmWzVXkgDei2dwCIwORKqRvNzLE8gAKzr7tg3GbWno3nYvEbtrdrsptVm8nJa3Dx4y6n0ij+FpoUG7Hv/ALnxMAeGrk6E8o80NzA2nnoSvTc1A9q0w3ohg89uZ0Og69hWN3PK4BlRC8nwq3qY/gOAFYljvY2Wm5WiVpgT2S5Y6iQjf5jT4XrFsmbf1xOYygEiMOaHmCPcHSk8WLmkfVnVB91DqT/pSqTE2yx6Sjj/APYRU9gPcn+xgeJZ+wvidc5TbWe/vLa3+05WOO1iDzmOKLd5JrusSWPInQan3FXJiczHk2uIHgltby1YLPbS6Fk1GqsCODKw5MOx5EaVyRbBLSeN42MbxsGjkU+pCDqCCOoNS/C+JO0uEyct/HkDkZp0RJher5nmIhO6N7gRpvNyPXrT1OrC8PEbtGW5SdMV4e9VzifHDBXKQrlrS7xkrAb7jSaJT/Evq0/s1YFjfWmTtI7uxuYbm3lGqSxMGVvxFPpYr/E5me9bJwwxNh50psr+WyfVDvIfiQ8j/vScigCrgkHIlGUMMGSu1uo7uISRHh1B5g9jW6orZ3clnKJE4jqvRhUmt50uYlljOqt+XtTldm4fvMq+g1nI6myiiiiReFFFIcvdfZ7Uqp0eT0j2HWuMcDMsilmCiNeUvftc+6p/VJwX3PekVecq9pIkk5M2VUKNojdtHj58rgMhZWrolxNAyxM/w7/NdfbUAH2Ncy+It5K+2uTvHtLm2a9ZZpLa6jKPC5UB048CAwOhGoIINdO5zMW2z+JuspeE+TbpvELzc8go9ySAPnVB+MVhtJc2OP2g2ju7eP7RI8dtiFbQ2sZUNr7nh6j09PfQK6kBl2xrTEq26VmJmidUVdeqprrofc06C2eNFdzq5O83uf8ASksNl5QWXcG6Y+Gn3tdSP+dqcDMsxXebX261kWN9TYqXHyiu2t/tEBldRFGByPNv9BWua0Op3l3OwA4/7Upsp93dkkGqr8I7e/z/AJUplaG4kAUhSV3mJ6D/AJ/jSu4gxvaCIwSWSya+lz7g6VojZrfeDhuBGnv2p9i2YzG1M4s8TGnlDTzZXcIATxC9+XE09xeCW0tvGY0yWMYEcCWf0H29NMKRjkxR22twJFYGlddx9zdbmN01N/DfbBNk7xoZ38iBiCyk6JKg5qRyDgepW5nQodQV0jGV2C2k2PlFxdIt3Z85Ht2L8O+h48OdKRZW09tIszK6sN0r/pUW00uGU5Et6YvQq3c6i1B4ggg8iOtFVv4V+IP9LW8eByuq3tsFhguf2LpQvpBPSTdB4ftbp04g1ZFb6OHXcswHQo21p4RS7E332Wfy3P6qQ6H2PekRrEirqcHIg3QOpUyY0UixN19ptRvHV09Le/Y0tp4HIzMV1KkqYVHcvP514wB9MfpH+NSCRxHGznkoJqJs5dix5k6mg3njEb0a5YtPKKKKXmhI/tzjZslh7fyYXuBa31vdywINWljR9WAHU6cdOulUh445OHO7VhYboTx24EYCn0ohVGH4szOT/Dp0rpAaEjU6Dv2rlTbvIz5XaPI5K8/9/uXEK/chPCMf3Ap/GldUdq5HnEa0g3Pg+MxpRJiPK8zQDlwGoFbI7dI2KrxJ4uxOpatEby3KBWUgrw3+Q+etEt3FDGILf9ZITpz13j7msXBPAm1lRyYtMuh0Fa5JihVf25W3R/z5V4qeTGodgz6ak/zNaoL+2ubOSSyjuL283tFWGIsFQDgBpzYk7x04AAcedRELdSWWhcZMuLwgswuEnuiOMkzaH25f5an27VV7FeKOBxNrYYK5xmYx7arF51xAN1nPDU6HUcfarWPCquhU8iK+oHOQYjyVkl7aSQsoJI9Pzrni+ilxeUucfIpURtomvUDl+Wh+tW1tHndtL7MTYjZbEQW8MOiyZS//AKskgEiNf2tNeeh41XXiRs5n8HZ22XzeStMnL56J9ogh8l1J19LLydeeh4Ean8LpVngkczq3lfBxE2Bz0OEykc90rvZzaQ3CodHC6gh1PR0YBlPdfc10ps9kjlsNbXbSRyuwKPJH8LspKlh7HTX8a5TtYJcllsfZWyF3vLiKNF011YuBp+ddMeHdrHZbMiGAf+lW8u/sx570PnPuN7gjke2laWg3AY8RX8htJz5klooorRmdF2Gn8q8CE+mQbv49KkNRFGMTq681II/CparB1DDkRqKYoPGJnaxcMG+4myj7lhMe40+pqNVIM2dLE+7rUf5VS75Q+jHshpQaNeFGtCjUNAwKtroRoflXMXiZjzYXGPD7sd1aWyY28g5MrxaiOUDqkke6VYcNVI5jSunarHx5SCfZ60tI8bFd5O5mIgl8sGWGONTJIVbmBoOPTiaDeoZDmGoYq4xKKxeDy+ejnOPxVxeiAAyNEo0HYcSOPtzpJCVtXZrgxxSoSgiJ0KHkQRz1q0PCu1hyGy0h+0SQm0uZZJHiYhwSqFW4c+AP0pn24hsMrcw3P2Ef0yOFyYxoJgBrGd0cN4g8e2720rFLjJUzYCnhhEmy+zc+XtWyl1Yxy2HHda8mWG3bQ6EyHXe3Qf2QOPU1la+LWJ2Xzb2mDx020OVuWELXcQWGMkHQRwL0QaaDvoKtHYiO1bYbF27xRTQy2oEqMoZXJ13gQeBBOtRnajwX2e2kns2hf+jI7WMxRxW8CkBS5fv0LN9dOQFWpsp3EWg4i+pr1DDNWJKti9rpNqoEe8x89hNJAl1FHOARNE3KSNgSrr0JGhB4EDUayS+uTa2U0yjVkQlR3PIfmRWuxhtrLFY7GW9vHHbY2FYLYBdWRQuh4njxA496xvl862lhJ3d9SAex6Gl7Sm4+n1LUrZtAs7lH7deJeTuttjsnichNjre2mjt5biKHfmuZC6KwTUEDTeJ1PPdPEaivdvNl9scJj7/DZvaCDL4y0vlW1uDH+ukYQs/q46KF13SOJ19hVv3ezuHu8pDm5sZbHJRbpS5A0dSBoOI7dDUR8WkK7IHyVVSlwgA7b28p/H1Gm/8AJr2qla4P3AppLC5ssfI+pBfDybDx7QYy7zXmfYdGjdlcoI2dd0Fiuh3dSQfY11HDHHFEkcKokaqFRUAChQOAGnDTSud5Ng58T4b43aS2BjlYs9yn/wAbSHypB/4g9wQelXF4dZIZHZ2MoNIY9wxLrr5aPGr7nyUsyj2Ap7SbkJRv5H9wOr2uBYv8H+pKNKKNaNadiUKkuOffsYSfu6fThUaqQ4c62KDsWH50an5RTWD2CY5sa2J9nWo+akuUTfsJgOg3voajVcuHundGfZiFHWgc6KDG4VF9rbZbbObP56ZQ1lYSzQ3RI1ESTJuiRv3QwAJ6Bu2tSgV6ePyNRlyMTobBzKeu9g8h4dZe8z2z4ivtnp0L3dm0qq9vENSWQsd1wvHTjrodOPA1E9mbnHZDbe6vxfRrZPI4tt9SRICAACT8PAjn7irO2kxq7Y5v/o2zIssNZLHc5ZrcBDIWOqQrpy4DeJ+Xaqf2z2flwm08c1rHHBZxTiGS3Rt0QeWdTqPuMup1OuupB6a5WsqXll4mjpb2HtaWHsf5drd32OtZ1nsRMZLYq28oVlDjdPb4h8196lSQnWql8EcnBaZDJY+dSqrueS7Pwj3i3o0+g178OtXSEFZtiYbEeW04mMUYUcqbru6vI523cW8kQU+vfBLHsFH8yaMk2btWknsRaXUJ00hkRlePhx0YE73fQgVGptpNoWYgC1i14cG4L+G7rXNstVWz8iSjE292to7XqJHLLK0nlI28IgdPTr1PAk+5qL+JmNkymKgxcCO0k8hk9I4DdU6b3YFmUa9yKkWz1tkTF9ryd5LLK4KpDpuIi8OOnMsdOZ5DtxpIttl9o7+UW+Nlisbp4UiyLyKF+zo28xVee878u6hT11o9FZd+PEWvtNeRmIX2yss34ZNiYkM2amtRjkx0a70rygBQwXoug3iTwGhHSptsXs4uyuzdnjC2/Mib876670p+LQ9hyHsBVaeHmSceI+anshri7m+mtGK/CS7yPGR+KN+DVc9bdB3Dc3Y4mbeAp2r0ef8A38TyvdK8r2jxeFSHEDSxT3LH86jwqTY9PLsoVP3dfrxo1PcU1h9gE3SIJEZDyYEVE2UoxUjip0NS6o9mIPJuy4HpkG8Pn1q144zBaN8MViE0CjSilpowr2iiuzkiuNs7nZ7arOzy2dzcWmYmiuYri3jMnluqbjRuBxXlqDy0PMVDtrbKbxP2vlwWOghhscWQl9kDGCwk6qD+0RxCry1BJ4AVbinRgT0OtQrw2tVwtrk8Rd6RZNMjPLKH4NOrnVJF+8pXqOWhFBsTdhT1DVvjLeRGOfw+xGz20KQ4u28uO5x7eczneZysigE8ANdCeOmp461tgzF9gZfs17HJd2y8mXjKg9tfjH5j3qS5BxcbSzbp1FraRxH2Z2Lkf3Qn1pPkMbHkItx/S4+F+1Yut/7HE09I2agGmywydnlIPOs7iOdBwbdPFT2YcwfY1lJY2s0qzSQRvIvJiNSKhGQxEtpdiQmS3uQPTPC5RiPZhzHsfpThsw2Zy+dTHXWaufswtpJmaOKJZDusigb27+8emvCg1p6jBV7hbQa1L54kjeBs1enFRlhAgD30inTRDyiB6M/Xsup6itfihnJ9ndkJBjwI7q8kSxgK8BHv6gkdtFBA7cO1SfH462xdsLe0jKJqWYsxZnY82ZjxZj1JpHtNs3ZbV4eXF3++I3YOkkZ0eN1+Fh7j/E1u1af0q9q9zHa3e4Zuo2bM7C2uzFpj7G3C+VZubiWT9u5uShTfPZVBbQfLtxk9MGy1zlY5b/DZieO7ucaYgl4i7v2iJ1JUuvRxoQe/A9af6OoAHEGxJPJhRRRVpWZRIZZFQc2IFSxVCqFHIcBTDhYPNuvMI9MY1/HpT/TNI4zM7WPlgv1CkeUtftVsd0aunqX37illFFIyMGLKxUhhIhRpThl7L7PL5yD9W5/umm/WkmXBwZso4ddwgK9pj2j222f2UXTL5KKCUjVbdNXmYeyLqfxOgqu8x+kAvqTB4Rm7TX0m6P7ian6sK5KPci9mW+7rFG0kjKiIN5mY6BR3JPKmK42wxU6lMRc2mXvF1VY7aUOsZ7yONQi9+p6AmuddodsM7tTMZMvkJJoydRbodyCPtog4fidT71JvDrb2z2ethh8lEsNpvlo7pF+AnpIBxI/e59+9AvsdUJrGTK0ait7NrnAlsWNs9vG5ml86eZzLNLpp5jnmdOg4AAdAAKU0nt761uoklguYJY3GqukgIYex61vDA8QQflXnSSTk9z0QAAwJhNbxXCFJUV1PQimu1ucds1tLDJOjQW89nJGbjQlIz5iH1n9kHvyHXSng1qmjViGIGoBGvsedXqs9Jw48SrrvXYTJKh30EiepGGqsvEEdwaKpXxEssfhcemQx13c4/I+aqwLZ3Lxq511bVFO7wGp5D86ZcL4z7V4omO5lt8tENOF2u64+TpofqDXoKLxau4DEw9Swos2NL/gtYLUOIIkj8xi77o4s3cnqeA+lbqq7E+PeHuCqZbF3tgTzkiInjH00b8jVh4fN43P2YvcVfQXluTpvxNrunsRzU+x0NGnFsVviYtoHGinLD2PnS+e49CHh7n/arKuTgTruEXcY5461+y2qqw9bepvnSqiinAMDEx2YscmFFFFdlZhLEk8bRyLvKw0IqnPGva7IbB4+CzxqSC7yBYR3hj1SBBpqQTwMnHgOnE9KuamzaLZzGbVYmbFZa2W4tZeh4FWHJlPRh0IobpuH7wiWsgIHmcRF5JZpJ7h3lmlbeeV2LM57sTxJ962hdanHiN4TZfYKd7hFe+w7N+rvFXjH+7IB8J9+R9uVQZT0pFgQcGUmW6Kx0KEEAso6dRWwcRXulczJFeG2gyWCkL4y8eAMdXhYBo3Puh4fiND71N8b4ulFC5LCRORzks33Nf7Lf/qq8MatzFHlkDQMaFZRXZ8hGadXdVwjcS3oPFvAIh3oMsOytCrFfbUNxpvyXi/bqrjHYmaWQ8nvHVVX+ypJP1FVoFf7w+le7jHjvfQaUIaGkHqMH8nqCMZijNZu/wA5dm7yM5nmI3URRurGOyqOAH5nqTSAIRxPEnnW4RhOIHHvRu602AAMCIsSxyTzNW7Ths7tFktlMsmSxcu5KugkjY/q7hPuOOo9+YPEUhkO6pPapz4beEmV29uRdziSwwqt6rpl9U2nNYgef8XIe54V1QSeJUHByJfOx+Qt9ssVaZaxJFrOm82vxRtyZD+8CCPw1qaRxrEioihVUaAUhwOBx2zWLhxmKtUtrWEaKi9T1YnmSeZJ504U8ibRL23NZ3CiiirwUKKKKkkKKKKkkwlijnieKVEkjcFWRhqGB5gg8xVPbc/o8Y/JvJfbLzJjbg8TaSamBz+6eafmPYVclFVZA3ck4u2g2Qz2yc5hzWMntOOiyMNYn/hcek/WmrQ6V3FPbw3ULQzxRzRONGSRQysPcGoNm/BDYvNM0i458dK3EvYyeWNf4eK/lSzac/pM7mcsAVkBqKvHIfo0rqWx20bAdEubYH81I/lTRJ+jjtKn9VlMRIPdpF/ymh+k48TsqbSsgOFWvF+jntM39Zk8PGO4aRv8op5x36Ng1DZLaIkdUtrfT/yYn+VQVP8AUmRKNIJp42c2Oz21kwiw2Nmuhro0oG7Enzc8B/OujsJ4K7GYVlkONbISrxD3r+YP7vBfyqcQwRW0SwwxpFGg0VEUKqj2A5UVdOf1SZlSbE/o+4zFlLzaaSPKXI0ItVBFuh99eL/joPY1bkcaRIscaKiKAqqo0CgcgBWVFMKoXgSsKKKKtJCiiipJP//Z",
  },
  {
    id: "av3",
    gender: "m",
    label: "Curly, glasses, hoodie",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av4",
    gender: "f",
    label: "Black bob, earrings",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av5",
    gender: "f",
    label: "Black hair, glasses, necklace",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av6",
    gender: "m",
    label: "Curly young, white tee",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av7",
    gender: "m",
    label: "Beard, white shirt",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av8",
    gender: "f",
    label: "Silver short hair",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av9",
    gender: "f",
    label: "Wavy brown, glasses",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av10",
    gender: "f",
    label: "Brunette, green dress",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av11",
    gender: "m",
    label: "Dark beard, brown jacket",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av12",
    gender: "m",
    label: "Man bun, green tee",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av13",
    gender: "f",
    label: "Dark wavy, round glasses",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av14",
    gender: "f",
    label: "Brunette wavy, earrings",
    src: "data:image/jpeg;base64,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",
  },
  {
    id: "av15",
    gender: "f",
    label: "Blonde bob, turtleneck",
    src: "data:image/jpeg;base64,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",
  },
];

// -- PERSONAL AVATAR CTA
function PersonalAvatarCTA({ user, userPlan }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);
  const plan = userPlan || PLANS.free;
  const isGold = plan.id === "gold";
  const isPaid = plan.id !== "free";
  // Feature not yet live — Gold gets early access notification
  const featureLive = false;

  const send = async () => {
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

  return (
    <div>
      <button
        className="btn btn-secondary"
        style={{
          width: "100%",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
        onClick={() => setOpen(!open)}
      >
        🎨 Make me a personal avatar
        {isGold ? (
          <span
            style={{
              fontSize: "10px",
              background: "#f59e0b",
              color: "white",
              padding: "1px 6px",
              borderRadius: "20px",
            }}
          >
            Gold
          </span>
        ) : (
          <span
            style={{
              fontSize: "10px",
              background: "var(--accent)",
              color: "white",
              padding: "1px 6px",
              borderRadius: "20px",
            }}
          >
            Coming soon
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            marginTop: "10px",
            background: "var(--bg)",
            borderRadius: "var(--radius-sm)",
            padding: "14px",
            border: "1.5px solid var(--border)",
          }}
        >
          {!featureLive ? (
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              {isGold ? (
                <>
                  <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                    🥇
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "var(--text)",
                      marginBottom: "6px",
                    }}
                  >
                    Coming soon for Gold members
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text3)",
                      lineHeight: 1.5,
                      marginBottom: "12px",
                    }}
                  >
                    Upload your photo and our illustrators will create a unique
                    custom avatar for you. You'll be notified as soon as this
                    feature launches.
                  </div>
                  {notifyMe ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--settle)",
                        fontWeight: "700",
                      }}
                    >
                      ✓ We'll notify you at <strong>{user.email}</strong>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                      onClick={() => setNotifyMe(true)}
                    >
                      Notify me when available
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--text)",
                      marginBottom: "6px",
                    }}
                  >
                    Available on Gold plan
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text3)",
                      lineHeight: 1.5,
                    }}
                  >
                    Upgrade to Gold and get a custom illustrated avatar created
                    from your photo.
                  </div>
                </>
              )}
            </div>
          ) : sent ? (
            <div
              style={{
                textAlign: "center",
                padding: "8px 0",
                fontSize: "13px",
                color: "var(--settle)",
                fontWeight: "700",
              }}
            >
              ✓ Request sent! Check {user.email} in 24-48h.
            </div>
          ) : (
            <div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text2)",
                  marginBottom: "10px",
                }}
              >
                Upload a photo and get a custom illustrated avatar sent to{" "}
                {user.email}.
              </p>
              {file && (
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "10px",
                    fontSize: "12px",
                    color: "var(--settle)",
                  }}
                >
                  Photo selected: {file.name}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                style={{
                  fontSize: "12px",
                  marginBottom: "10px",
                  display: "block",
                  width: "100%",
                }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button
                className="btn btn-primary"
                style={{ width: "100%", fontSize: "12px" }}
                onClick={send}
                disabled={!file || sending}
              >
                {sending ? "Sending..." : "Send request"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- NETWORK PAGE --------------------------------------------------------------
const NetworkIcon = ({ name, color, size = 24 }) => {
  const s = {
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  const icons = {
    Family: (
      <svg {...s}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    Friends: (
      <svg {...s}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    Colleagues: (
      <svg {...s}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    Roommates: (
      <svg {...s}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    Travel: (
      <svg {...s}>
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.18 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0121.73 15l.19 1.92z" />
      </svg>
    ),
    Sport: (
      <svg {...s}>
        <circle cx="12" cy="12" r="10" />
        <path d="M4.93 4.93l4.24 4.24" />
        <path d="M14.83 9.17l4.24-4.24" />
        <path d="M14.83 14.83l4.24 4.24" />
        <path d="M9.17 14.83l-4.24 4.24" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    "Co-parents": (
      <svg {...s}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <circle cx="19" cy="5" r="2" />
      </svg>
    ),
    Neighbors: (
      <svg {...s}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
        <path d="M2 9h20" />
      </svg>
    ),
  };
  return (
    icons[name] || (
      <svg {...s}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 3" />
      </svg>
    )
  );
};

const NETWORK_SUGGESTIONS = [
  { name: "Family", color: "#7c3aed", bg: "#f5f3ff" },
  { name: "Friends", color: "#e11d48", bg: "#fff1f2" },
  { name: "Colleagues", color: "#0f766e", bg: "#ccfbf1" },
  { name: "Roommates", color: "#b45309", bg: "#fef3c7" },
  { name: "Travel", color: "#0369a1", bg: "#e0f2fe" },
  { name: "Sport", color: "#15803d", bg: "#dcfce7" },
  { name: "Co-parents", color: "#be185d", bg: "#fce7f3" },
  { name: "Neighbors", color: "#92400e", bg: "#fef3c7" },
];

const MOCK_NETWORKS = [
  {
    id: "n1",
    name: "Family",
    color: "#7c3aed",
    bg: "#f5f3ff",
    members: ["Vesna", "Ana"],
  },
  {
    id: "n2",
    name: "Ekipa",
    color: "#0284c7",
    bg: "#e0f2fe",
    members: ["Pera", "Mika", "Djura", "Tanja"],
  },
];

function NetworkPage({ ledgers, currentUser, onCreateLedgerWith }) {
  const [tab, setTab] = useState("networks");
  const [networks, setNetworks] = useState([]);
  const [networksLoaded, setNetworksLoaded] = useState(false);
  // Load networks from Supabase (falls back to a one-time localStorage migration
  // for anyone who had networks saved on this device from before this synced).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser?.id) return;
      const { data, error } = await sb
        .from("user_networks")
        .select("networks")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("loadNetworks failed", error);
        setNetworksLoaded(true);
        return;
      }
      if (data) {
        setNetworks(data.networks || []);
      } else {
        // Nothing in the DB yet — migrate this device's local copy once, if any.
        let local = [];
        try {
          const saved = localStorage.getItem(`eq_networks_${currentUser.id}`);
          local = saved ? JSON.parse(saved) : [];
        } catch (e) {}
        setNetworks(local);
        if (local.length > 0) {
          await sb.from("user_networks").upsert({ user_id: currentUser.id, networks: local });
        }
      }
      setNetworksLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);
  // Persist networks to Supabase on change (skip the very first load so we don't
  // immediately re-write what we just fetched).
  useEffect(() => {
    if (!networksLoaded || !currentUser?.id) return;
    sb.from("user_networks")
      .upsert({ user_id: currentUser.id, networks })
      .then(({ error }) => {
        if (error) console.error("saveNetworks failed", error);
      });
  }, [networks, networksLoaded, currentUser?.id]);
  const [showNew, setShowNew] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0284c7");
  const [newBg, setNewBg] = useState("#e0f2fe");
  const [expandedNet, setExpandedNet] = useState(null);
  const [editingNet, setEditingNet] = useState(null); // {id, name, color, bg}
  const [inviteTarget, setInviteTarget] = useState(null);

  const PALETTE = [
    { color: "#7c3aed", bg: "#f5f3ff" },
    { color: "#0284c7", bg: "#e0f2fe" },
    { color: "#15803d", bg: "#dcfce7" },
    { color: "#b45309", bg: "#fef3c7" },
    { color: "#be185d", bg: "#fce7f3" },
    { color: "#0f766e", bg: "#ccfbf1" },
    { color: "#1d4ed8", bg: "#eff6ff" },
    { color: "#dc2626", bg: "#fef2f2" },
    { color: "#374151", bg: "#f3f4f6" },
    { color: "#92400e", bg: "#fef3c7" },
  ];

  // All unique people from ledgers
  const allPeople = {};
  ledgers.forEach((l) => {
    l.members
      .filter((m) => m.user_id !== currentUser.id)
      .forEach((m) => {
        if (!allPeople[m.display_name])
          allPeople[m.display_name] = {
            name: m.display_name,
            plan: m.plan || "free",
            user_id: m.user_id,
            ledgers: [l.name],
            email: m.invited_email || null,
            avatar: m.avatar || null,
          };
        else if (!allPeople[m.display_name].ledgers.includes(l.name))
          allPeople[m.display_name].ledgers.push(l.name);
      });
  });
  const people = Object.values(allPeople);
  // People not in any network
  const inNetwork = new Set(networks.flatMap((n) => n.members));
  const standalone = people.filter((p) => !inNetwork.has(p.name));

  // Dynamic link — first shared ledger with this person
  const personJoinLink = (person) => {
    const sharedLedger = ledgers.find((l) =>
      l.members.some((m) => m.display_name === person.name)
    );
    return sharedLedger
      ? ledgerJoinLink(sharedLedger.id)
      : ledgerJoinLink("missing");
  };
  const inviteMsg = (n, person) =>
    `Hey ${n}, join me on CosTrace to track our shared expenses. Tap the link to join: ${personJoinLink(
      person
    )}`;

  const addNetwork = () => {
    if (!newName.trim()) return;
    setNetworks((p) => [
      ...p,
      {
        id: `net_${Date.now()}`,
        name: newName,
        color: newColor,
        bg: newBg,
        members: [],
      },
    ]);
    setNewName("");
    setShowNew(false);
  };

  const PersonRow = ({ p, i, showLedgers = true }) => (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            flexShrink: 0,
          }}
        >
          <AvatarWithMedal
            plan={p.plan}
            size={34}
            radius="50%"
            colorClass={`stmt-av av${i % 10}`}
            avatarId={p.avatar || null}
          >
            {initials(p.name)}
          </AvatarWithMedal>
          {planDot(p.plan || "free")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--text)",
            }}
          >
            {p.name}
          </div>
          {showLedgers && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text3)",
                marginTop: "1px",
              }}
            >
              {p.ledgers.join(", ")}
            </div>
          )}
        </div>
        {p.user_id ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                background: "var(--success-light)",
                color: "var(--success)",
                padding: "2px 8px",
                borderRadius: "20px",
                border: "1px solid #a7f3d0",
                whiteSpace: "nowrap",
              }}
            >
              On app
            </span>
            <button
              onClick={() => onCreateLedgerWith && onCreateLedgerWith(p)}
              style={{
                fontSize: "10px",
                fontWeight: "700",
                padding: "3px 9px",
                borderRadius: "20px",
                border: "1.5px solid var(--accent)",
                color: "var(--accent)",
                background: "var(--accent-light)",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              + Ledger
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{
              fontSize: "10px",
              padding: "4px 10px",
              whiteSpace: "nowrap",
            }}
            onClick={() =>
              setInviteTarget(inviteTarget === p.name ? null : p.name)
            }
          >
            Invite
          </button>
        )}
      </div>
      {inviteTarget === p.name && (
        <div
          style={{
            background: "var(--accent-light)",
            padding: "10px 16px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "var(--accent)",
              marginBottom: "8px",
            }}
          >
            Send invite via:
          </div>
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            {[
              {
                label: "WhatsApp",
                color: "#25d366",
                border: "#a7f3d0",
                href: `https://wa.me/?text=${encodeURIComponent(
                  inviteMsg(p.name, p)
                )}`,
              },
              {
                label: "Telegram",
                color: "#229ed9",
                border: "#bae6fd",
                href: `https://t.me/share/url?url=${encodeURIComponent(
                  personJoinLink(p)
                )}&text=${encodeURIComponent("Join me on CosTrace!")}`,
              },
              {
                label: "Viber",
                color: "#7360f2",
                border: "#c4b5fd",
                href: `viber://forward?text=${encodeURIComponent(
                  inviteMsg(p.name, p)
                )}`,
              },
              {
                label: "Email",
                color: "#4f46e5",
                border: "#c7d7ff",
                href: `mailto:${
                  p.email || ""
                }?subject=Join me on CosTrace&body=${encodeURIComponent(
                  inviteMsg(p.name, p)
                )}`,
              },
              {
                label: "SMS",
                color: "#374151",
                border: "#e5e7eb",
                href: `sms:?body=${encodeURIComponent(inviteMsg(p.name, p))}`,
              },
              {
                label: "New ledger",
                color: "var(--accent)",
                border: "var(--accent-light)",
                href: null,
                onClick: () => onCreateLedgerWith && onCreateLedgerWith(p),
              },
            ].map((o) =>
              o.href ? (
                <a
                  key={o.label}
                  href={o.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "5px 11px",
                    borderRadius: "8px",
                    border: `1.5px solid ${o.border}`,
                    color: o.color,
                    textDecoration: "none",
                    background: "white",
                  }}
                >
                  {o.label}
                </a>
              ) : (
                <button
                  key={o.label}
                  onClick={o.onClick}
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "5px 11px",
                    borderRadius: "8px",
                    border: `1.5px solid ${o.border}`,
                    color: o.color,
                    background: "white",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {o.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Network</h1>
        <p>Your groups and people</p>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          background: "var(--bg2)",
          borderRadius: "12px",
          padding: "3px",
          marginBottom: "16px",
        }}
      >
        {["networks", "people"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "10px",
              border: "none",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              background: tab === t ? "white" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--text3)",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              textTransform: "capitalize",
            }}
          >
            {t === "networks" ? "Networks" : "People"}
          </button>
        ))}
      </div>

      {tab === "networks" && (
        <div>
          {/* Network cards */}
          {networks.map((net, ni) => {
            const netPeople = people.filter((p) =>
              net.members.includes(p.name)
            );
            const isOpen = expandedNet === net.id;
            const totalThisMonth = ledgers.reduce((sum, l) => {
              const curMk = mk(new Date());
              return (
                sum +
                l.expenses
                  .filter(
                    (e) =>
                      mk(e.expense_date) === curMk &&
                      e.approval_status === "approved" &&
                      !e.is_settlement &&
                      l.members.some(
                        (m) =>
                          net.members.includes(m.display_name) &&
                          m.user_id !== currentUser.id
                      )
                  )
                  .reduce((s, e) => s + e.amount, 0)
              );
            }, 0);
            return (
              <div
                key={net.id}
                style={{
                  background: "var(--white)",
                  border: `2px solid ${net.color}33`,
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    background: isOpen ? net.bg : "white",
                  }}
                >
                  {/* Network icon */}
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: net.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: `2px solid ${net.color}33`,
                      position: "relative",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedNet(isOpen ? null : net.id)}
                  >
                    <NetworkIcon
                      name={
                        editingNet?.id === net.id ? editingNet.name : net.name
                      }
                      color={
                        editingNet?.id === net.id ? editingNet.color : net.color
                      }
                      size={24}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        background: net.color,
                        color: "white",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "800",
                        border: "2px solid white",
                      }}
                    >
                      {net.members.length}
                    </span>
                  </div>
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                    onClick={() => setExpandedNet(isOpen ? null : net.id)}
                  >
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: "var(--text)",
                        marginBottom: "2px",
                      }}
                    >
                      {net.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                      }}
                    >
                      <span>
                        👥 {net.members.length} member
                        {net.members.length !== 1 ? "s" : ""}
                      </span>
                      {totalThisMonth > 0 && (
                        <span>💳 {fmtAmt(totalThisMonth)} this month</span>
                      )}
                    </div>
                  </div>
                  {/* Avatar stack */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedNet(isOpen ? null : net.id)}
                  >
                    {netPeople.slice(0, 3).map((p, pi) => (
                      <div
                        key={p.name}
                        className={`stmt-av av${pi % 10}`}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          fontSize: "10px",
                          marginLeft: pi > 0 ? "-8px" : "0",
                          border: "2px solid white",
                          flexShrink: 0,
                          zIndex: 3 - pi,
                        }}
                      >
                        {initials(p.name)}
                      </div>
                    ))}
                    {netPeople.length > 3 && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "var(--text3)",
                          marginLeft: "4px",
                        }}
                      >
                        +{netPeople.length - 3}
                      </span>
                    )}
                  </div>
                  {/* Gear button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNet(
                        editingNet?.id === net.id
                          ? null
                          : {
                              id: net.id,
                              name: net.name,
                              color: net.color,
                              bg: net.bg,
                            }
                      );
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: net.color,
                      padding: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.Gear />
                  </button>
                  <span
                    style={{
                      color: "var(--text3)",
                      fontSize: "14px",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedNet(isOpen ? null : net.id)}
                  >
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>

                {/* Inline settings panel */}
                {editingNet?.id === net.id && (
                  <div
                    style={{
                      background: "var(--bg)",
                      borderTop: `1px solid ${net.color}22`,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--text3)",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      Edit network
                    </div>
                    <input
                      value={editingNet.name}
                      onChange={(e) =>
                        setEditingNet({ ...editingNet, name: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid var(--border)",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontFamily: "inherit",
                        outline: "none",
                        marginBottom: "10px",
                        boxSizing: "border-box",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "7px",
                        flexWrap: "wrap",
                        marginBottom: "12px",
                      }}
                    >
                      {PALETTE.map((p) => (
                        <div
                          key={p.color}
                          onClick={() =>
                            setEditingNet({
                              ...editingNet,
                              color: p.color,
                              bg: p.bg,
                            })
                          }
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: p.color,
                            cursor: "pointer",
                            border:
                              editingNet.color === p.color
                                ? "3px solid #111827"
                                : "3px solid transparent",
                            boxShadow:
                              editingNet.color === p.color
                                ? "0 0 0 1px " + p.color
                                : "none",
                            transition: "all 0.1s",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: "12px" }}
                        onClick={() => setEditingNet(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          fontSize: "12px",
                          background: editingNet.color,
                          borderColor: editingNet.color,
                        }}
                        onClick={() => {
                          setNetworks((prev) =>
                            prev.map((n) =>
                              n.id === net.id
                                ? {
                                    ...n,
                                    name: editingNet.name,
                                    color: editingNet.color,
                                    bg: editingNet.bg,
                                  }
                                : n
                            )
                          );
                          setEditingNet(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="btn"
                        style={{
                          fontSize: "12px",
                          padding: "8px 12px",
                          background: "var(--danger-light)",
                          color: "var(--danger)",
                          border: "1.5px solid #fca5a5",
                        }}
                        onClick={() => {
                          setNetworks((prev) =>
                            prev.filter((n) => n.id !== net.id)
                          );
                          setEditingNet(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {isOpen && (
                  <div>
                    {netPeople.length === 0 ? (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "var(--text3)",
                        }}
                      >
                        No members yet. Add people from your ledgers.
                      </div>
                    ) : (
                      netPeople.map((p, pi) => (
                        <PersonRow key={p.name} p={p} i={pi} showLedgers />
                      ))
                    )}
                    {/* Add person to network */}
                    <div
                      style={{
                        padding: "10px 16px",
                        borderTop: "1px solid var(--border)",
                        background: "var(--bg)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "var(--text3)",
                          marginBottom: "6px",
                        }}
                      >
                        Add to {net.name}:
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {people
                          .filter((p) => !net.members.includes(p.name))
                          .map((p) => (
                            <button
                              key={p.name}
                              onClick={() =>
                                setNetworks((prev) =>
                                  prev.map((n) =>
                                    n.id === net.id
                                      ? {
                                          ...n,
                                          members: [...n.members, p.name],
                                        }
                                      : n
                                  )
                                )
                              }
                              style={{
                                fontSize: "11px",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                border: "1.5px solid var(--border)",
                                background: "white",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                color: "var(--text2)",
                                fontWeight: "600",
                              }}
                            >
                              + {p.name}
                            </button>
                          ))}
                        {people.filter((p) => !net.members.includes(p.name))
                          .length === 0 && (
                          <span
                            style={{ fontSize: "11px", color: "var(--text3)" }}
                          >
                            Everyone is in this network.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* New network */}
          {!showNew ? (
            <button
              onClick={() => setShowNew(true)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "var(--radius-lg)",
                border: "2px dashed var(--border2)",
                background: "var(--bg)",
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--text3)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "18px" }}>+</span> New network
            </button>
          ) : (
            <div
              style={{
                background: "var(--white)",
                border: "2px solid var(--accent)",
                borderRadius: "var(--radius-lg)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--text)",
                  marginBottom: "12px",
                }}
              >
                New network
              </div>
              {/* Suggestions */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                {NETWORK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      setNewName(s.name);
                      setNewColor(s.color);
                      setNewBg(s.bg);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      border: `1.5px solid ${
                        newName === s.name ? s.color : "var(--border)"
                      }`,
                      background: newName === s.name ? s.bg : "white",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: newName === s.name ? s.color : "var(--text2)",
                      fontWeight: "600",
                    }}
                  >
                    <NetworkIcon
                      name={s.name}
                      color={newName === s.name ? s.color : "#9ca3af"}
                      size={14}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "12px" }}
              >
                <input
                  placeholder="Or type a custom name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1.5px solid var(--border)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: "13px" }}
                  onClick={() => {
                    setShowNew(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: "13px" }}
                  disabled={!newName.trim()}
                  onClick={addNetwork}
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "people" && (
        <div>
          <div
            style={{
              background: "var(--white)",
              border: "2px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              Not in any network ({standalone.length})
            </div>
            {standalone.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--text3)",
                }}
              >
                Everyone is in a network! 🎉
              </div>
            ) : (
              standalone.map((p, i) => (
                <PersonRow key={p.name} p={p} i={i} showLedgers />
              ))
            )}
          </div>
          {/* All people */}
          <div
            style={{
              background: "var(--white)",
              border: "2px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              All people ({people.length})
            </div>
            {people.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--text3)",
                }}
              >
                No connections yet. Invite people to your ledgers!
              </div>
            ) : (
              people.map((p, i) => (
                <PersonRow key={p.name} p={p} i={i} showLedgers />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -- PROFILE MODAL -------------------------------------------------------------
const CURRENCY_SEARCH_DATA = [
  {
    code: "RSD",
    flag: "🇷🇸",
    label: "RSD — Serbian Dinar",
    keywords: "serbia srbija",
  },
  {
    code: "EUR",
    flag: "🇪🇺",
    label: "EUR — Euro",
    keywords:
      "germany france italy spain netherlands belgium austria portugal greece ireland finland slovakia slovenia estonia latvia lithuania malta cyprus luxembourg croatia montenegro kosovo",
  },
  {
    code: "USD",
    flag: "🇺🇸",
    label: "USD — US Dollar",
    keywords: "united states america usa",
  },
  {
    code: "GBP",
    flag: "🇬🇧",
    label: "GBP — British Pound",
    keywords: "united kingdom britain england uk",
  },
  {
    code: "CHF",
    flag: "🇨🇭",
    label: "CHF — Swiss Franc",
    keywords: "switzerland swiss",
  },
  {
    code: "HUF",
    flag: "🇭🇺",
    label: "HUF — Hungarian Forint",
    keywords: "hungary magyarország",
  },
  {
    code: "BAM",
    flag: "🇧🇦",
    label: "BAM — Bosnia Mark",
    keywords: "bosnia herzegovina bosna",
  },
  {
    code: "RON",
    flag: "🇷🇴",
    label: "RON — Romanian Leu",
    keywords: "romania românia",
  },
  {
    code: "MKD",
    flag: "🇲🇰",
    label: "MKD — Macedonian Denar",
    keywords: "north macedonia makedonija",
  },
  {
    code: "ALL",
    flag: "🇦🇱",
    label: "ALL — Albanian Lek",
    keywords: "albania shqipëri",
  },
  {
    code: "CZK",
    flag: "🇨🇿",
    label: "CZK — Czech Koruna",
    keywords: "czech republic czechia",
  },
  {
    code: "PLN",
    flag: "🇵🇱",
    label: "PLN — Polish Zloty",
    keywords: "poland polska",
  },
  {
    code: "SEK",
    flag: "🇸🇪",
    label: "SEK — Swedish Krona",
    keywords: "sweden sverige",
  },
  {
    code: "NOK",
    flag: "🇳🇴",
    label: "NOK — Norwegian Krone",
    keywords: "norway norge",
  },
  {
    code: "DKK",
    flag: "🇩🇰",
    label: "DKK — Danish Krone",
    keywords: "denmark danmark",
  },
  { code: "JPY", flag: "🇯🇵", label: "JPY — Japanese Yen", keywords: "japan" },
  {
    code: "CNY",
    flag: "🇨🇳",
    label: "CNY — Chinese Yuan",
    keywords: "china kina",
  },
  {
    code: "YER",
    flag: "🇾🇪",
    label: "YER — Yemeni Rial",
    keywords: "yemen jemen",
  },
  {
    code: "AED",
    flag: "🇦🇪",
    label: "AED — UAE Dirham",
    keywords: "united arab emirates dubai abu dhabi",
  },
  {
    code: "SAR",
    flag: "🇸🇦",
    label: "SAR — Saudi Riyal",
    keywords: "saudi arabia saudijska arabija",
  },
  {
    code: "TRY",
    flag: "🇹🇷",
    label: "TRY — Turkish Lira",
    keywords: "turkey türkiye turska",
  },
  {
    code: "INR",
    flag: "🇮🇳",
    label: "INR — Indian Rupee",
    keywords: "india indija",
  },
  {
    code: "AUD",
    flag: "🇦🇺",
    label: "AUD — Australian Dollar",
    keywords: "australia australija",
  },
  {
    code: "CAD",
    flag: "🇨🇦",
    label: "CAD — Canadian Dollar",
    keywords: "canada kanada",
  },
  {
    code: "BRL",
    flag: "🇧🇷",
    label: "BRL — Brazilian Real",
    keywords: "brazil",
  },
  {
    code: "MXN",
    flag: "🇲🇽",
    label: "MXN — Mexican Peso",
    keywords: "mexico meksiko",
  },
  {
    code: "ZAR",
    flag: "🇿🇦",
    label: "ZAR — South African Rand",
    keywords: "south africa",
  },
  {
    code: "EGP",
    flag: "🇪🇬",
    label: "EGP — Egyptian Pound",
    keywords: "egypt egipat",
  },
  {
    code: "NGN",
    flag: "🇳🇬",
    label: "NGN — Nigerian Naira",
    keywords: "nigeria",
  },
  {
    code: "PKR",
    flag: "🇵🇰",
    label: "PKR — Pakistani Rupee",
    keywords: "pakistan",
  },
  {
    code: "PHP",
    flag: "🇵🇭",
    label: "PHP — Philippine Peso",
    keywords: "philippines filipini",
  },
  {
    code: "IDR",
    flag: "🇮🇩",
    label: "IDR — Indonesian Rupiah",
    keywords: "indonesia",
  },
  {
    code: "MYR",
    flag: "🇲🇾",
    label: "MYR — Malaysian Ringgit",
    keywords: "malaysia",
  },
  {
    code: "THB",
    flag: "🇹🇭",
    label: "THB — Thai Baht",
    keywords: "thailand tajland",
  },
  {
    code: "KRW",
    flag: "🇰🇷",
    label: "KRW — South Korean Won",
    keywords: "south korea koreja",
  },
  {
    code: "HKD",
    flag: "🇭🇰",
    label: "HKD — Hong Kong Dollar",
    keywords: "hong kong",
  },
  {
    code: "SGD",
    flag: "🇸🇬",
    label: "SGD — Singapore Dollar",
    keywords: "singapore singapur",
  },
  {
    code: "NZD",
    flag: "🇳🇿",
    label: "NZD — New Zealand Dollar",
    keywords: "new zealand",
  },
  {
    code: "ILS",
    flag: "🇮🇱",
    label: "ILS — Israeli Shekel",
    keywords: "israel izrael",
  },
  {
    code: "RUB",
    flag: "🇷🇺",
    label: "RUB — Russian Ruble",
    keywords: "russia rusija",
  },
  {
    code: "UAH",
    flag: "🇺🇦",
    label: "UAH — Ukrainian Hryvnia",
    keywords: "ukraine ukrajina",
  },
  {
    code: "GEL",
    flag: "🇬🇪",
    label: "GEL — Georgian Lari",
    keywords: "georgia gruzija",
  },
  {
    code: "IQD",
    flag: "🇮🇶",
    label: "IQD — Iraqi Dinar",
    keywords: "iraq irak",
  },
  { code: "KWD", flag: "🇰🇼", label: "KWD — Kuwaiti Dinar", keywords: "kuwait" },
  {
    code: "QAR",
    flag: "🇶🇦",
    label: "QAR — Qatari Riyal",
    keywords: "qatar katar",
  },
  {
    code: "BHD",
    flag: "🇧🇭",
    label: "BHD — Bahraini Dinar",
    keywords: "bahrain",
  },
  { code: "OMR", flag: "🇴🇲", label: "OMR — Omani Rial", keywords: "oman" },
  { code: "MDL", flag: "🇲🇩", label: "MDL — Moldovan Leu", keywords: "moldova" },
  {
    code: "AZN",
    flag: "🇦🇿",
    label: "AZN — Azerbaijani Manat",
    keywords: "azerbaijan azerbejdžan",
  },
  {
    code: "AMD",
    flag: "🇦🇲",
    label: "AMD — Armenian Dram",
    keywords: "armenia armenija",
  },
  {
    code: "KZT",
    flag: "🇰🇿",
    label: "KZT — Kazakhstani Tenge",
    keywords: "kazakhstan kazahstan",
  },
];

function CurrencySearch({ currency, currencies, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const current = CURRENCY_SEARCH_DATA.find((c) => c.code === currency);

  const filtered =
    q.trim().length > 0
      ? CURRENCY_SEARCH_DATA.filter((c) => {
          const s = q.toLowerCase();
          return (
            c.code.toLowerCase().includes(s) ||
            c.label.toLowerCase().includes(s) ||
            c.keywords.includes(s)
          );
        }).slice(0, 6)
      : [];

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          padding: "10px 12px",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "white",
          cursor: "text",
        }}
        onClick={() => setOpen(true)}
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>
          {current?.flag || "🏳️"}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontWeight: "700",
            color: "var(--accent)",
            fontSize: "14px",
          }}
        >
          {currency}
        </span>
        <span style={{ fontSize: "12px", color: "var(--text2)", flex: 1 }}>
          {current?.label.split("—")[1]?.trim() || ""}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text3)" }}>▼</span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ padding: "8px" }}>
            <input
              autoFocus
              placeholder="Search country or currency..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid var(--border)",
                borderRadius: "8px",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {filtered.length > 0 && (
            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
              {filtered.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    onSelect(c.code);
                    setQ("");
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderTop: "1px solid var(--border)",
                    background:
                      c.code === currency ? "var(--accent-light)" : "white",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      c.code === currency ? "var(--accent-light)" : "white")
                  }
                >
                  <span style={{ fontSize: "20px", lineHeight: 1 }}>
                    {c.flag || "🏳️"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontWeight: "700",
                      color: "var(--accent)",
                      fontSize: "13px",
                      minWidth: "36px",
                    }}
                  >
                    {c.code}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {c.label.split("—")[1]?.trim() || c.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {q.trim().length > 0 && filtered.length === 0 && (
            <div
              style={{
                padding: "12px",
                fontSize: "12px",
                color: "var(--text3)",
                textAlign: "center",
              }}
            >
              No results for "{q}"
            </div>
          )}
          {q.trim().length === 0 && (
            <div
              style={{
                padding: "12px",
                fontSize: "12px",
                color: "var(--text3)",
                textAlign: "center",
              }}
            >
              Type a country name or currency code
            </div>
          )}
          <div style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", fontSize: "12px", padding: "7px" }}
              onClick={() => {
                setOpen(false);
                setQ("");
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileModal({
  user,
  onClose,
  onUpdate,
  onLogout,
  onDelete,
  currency = "RSD",
  onCurrencyChange,
  currencies = [],
  userPlan,
  onShowUpgrade,
}) {
  const plan = userPlan || PLANS.free;
  const [name, setName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [dob, setDob] = useState(user.date_of_birth || user.dob || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  // Password change
  const [showPwdSection, setShowPwdSection] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleteScheduled, setDeleteScheduled] = useState(
    user.deleteScheduled || null
  );
  const [pushStatus, setPushStatus] = useState("checking"); // checking | unsupported | default | granted | denied | enabling
  useEffect(() => {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus(Notification.permission); // "default" | "granted" | "denied"
  }, []);
  const handleEnablePush = async () => {
    setPushStatus("enabling");
    const res = await enablePushNotifications(user.id);
    setPushStatus(
      res.ok ? "granted" : res.reason === "denied" ? "denied" : "default"
    );
  };

  const save = async () => {
    const updated = {
      ...user,
      full_name: name,
      email,
      date_of_birth: dob || null,
      avatar: selectedAvatar,
    };
    onUpdate(updated);
    // Persist to Supabase
    if (ENV === "production") {
      const { error: profErr } = await sb
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: name || null,
          email: email || null,
          avatar: selectedAvatar || null,
          date_of_birth: dob || null,
        })
        .eq("id", user.id);
      if (profErr) console.error("Profile save error:", profErr);
      // Sync display_name on all ledger_members where this user is a member
      await sb
        .from("ledger_members")
        .update({
          display_name: name || null,
        })
        .eq("user_id", user.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changePassword = async () => {
    if (!pwdCurrent) {
      setPwdMsg("Enter current password.");
      return;
    }
    if (pwdNew.length < 6) {
      setPwdMsg("New password must be at least 6 characters.");
      return;
    }
    if (pwdNew !== pwdNew2) {
      setPwdMsg("Passwords don't match.");
      return;
    }
    if (ENV === "production") {
      const { error } = await sb.auth.updateUser({ password: pwdNew });
      if (error) {
        setPwdMsg(error.message);
        return;
      }
    }
    setPwdMsg("Password changed successfully!");
    setPwdCurrent("");
    setPwdNew("");
    setPwdNew2("");
    setTimeout(() => {
      setPwdMsg("");
      setShowPwdSection(false);
    }, 2000);
  };

  const scheduleDelete = () => {
    if (deleteWord !== "delete") return;
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);
    const updated = { ...user, deleteScheduled: scheduledDate.toISOString() };
    onUpdate(updated);
    setDeleteScheduled(scheduledDate.toISOString());
    setShowDelete(false);
    setDeleteWord("");
  };

  const cancelDelete = () => {
    const updated = { ...user, deleteScheduled: null };
    onUpdate(updated);
    setDeleteScheduled(null);
  };

  const daysLeft = deleteScheduled
    ? Math.ceil(
        (new Date(deleteScheduled) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const renderAvatar = (size = 72) => {
    const av = AVATARS.find((a) => a.id === selectedAvatar);
    if (av)
      return (
        <img
          src={av.src}
          alt={av.label}
          style={{
            width: size,
            height: size,
            borderRadius: "16px",
            objectFit: "contain",
            background: "white",
            flexShrink: 0,
          }}
        />
      );
    return withPlanDot(
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "20px",
          background: "linear-gradient(135deg,var(--accent),#7c3aed)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: "800",
          flexShrink: 0,
        }}
      >
        {initials(user.full_name)}
      </div>,
      user.plan
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h2>My Profile</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          {/* Avatar section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "22px",
              gap: "10px",
            }}
          >
            {renderAvatar(72)}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  background: plan.bg,
                  color: plan.color,
                  padding: "3px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${plan.color}44`,
                }}
              >
                {plan.name} plan
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "11px", padding: "3px 12px" }}
                onClick={() => {
                  onClose();
                  onShowUpgrade && onShowUpgrade();
                }}
              >
                {plan.id === "gold" ? "View plans" : "Upgrade"}
              </button>
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              {showAvatarPicker ? "Close" : "Change avatar"}
            </button>
          </div>

          {/* Push notifications */}
          <div
            style={{
              marginBottom: "20px",
              background: "var(--bg)",
              borderRadius: "var(--radius-sm)",
              padding: "14px",
              border: "1.5px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700" }}>
                Notifications
              </div>
              <div style={{ fontSize: "12px", color: "var(--text2)" }}>
                {pushStatus === "granted"
                  ? "Enabled on this device."
                  : pushStatus === "denied"
                  ? "Blocked — enable in your browser's site settings."
                  : pushStatus === "unsupported"
                  ? "Not supported in this browser."
                  : pushStatus === "enabling"
                  ? "Enabling…"
                  : "Get notified about new expenses, approvals, and delete requests."}
              </div>
            </div>
            {pushStatus === "default" && (
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 14px",
                  whiteSpace: "nowrap",
                }}
                onClick={handleEnablePush}
              >
                Enable
              </button>
            )}
            {pushStatus === "enabling" && (
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 14px",
                  whiteSpace: "nowrap",
                }}
                disabled
              >
                Enabling…
              </button>
            )}
          </div>

          {/* Avatar picker */}
          {showAvatarPicker && (
            <div
              style={{
                marginBottom: "20px",
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
                padding: "14px",
                border: "1.5px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {AVATARS.map((av) => (
                  <img
                    key={av.id}
                    src={av.src}
                    alt={av.label}
                    onClick={() => {
                      setSelectedAvatar(av.id);
                      setShowAvatarPicker(false);
                    }}
                    style={{
                      width: "72px",
                      height: "72px",
                      cursor: "pointer",
                      border:
                        selectedAvatar === av.id
                          ? "3px solid var(--accent)"
                          : "3px solid transparent",
                      borderRadius: "14px",
                      objectFit: "contain",
                      transition: "all 0.15s",
                      display: "block",
                      background: "white",
                    }}
                  />
                ))}
              </div>
              {selectedAvatar && (
                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: "11px", padding: "4px 10px" }}
                    onClick={() => setSelectedAvatar(null)}
                  >
                    Reset to initials
                  </button>
                </div>
              )}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  marginTop: "12px",
                  paddingTop: "12px",
                }}
              >
                <PersonalAvatarCTA user={user} userPlan={plan} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <CurrencySearch
              currency={currency}
              currencies={currencies}
              onSelect={(c) => {
                onCurrencyChange && onCurrencyChange(c);
              }}
            />
            <p className="tip" style={{ marginTop: "4px" }}>
              Auto-detected from your location. Type a country or currency code.
            </p>
          </div>
          {saved && (
            <div
              style={{
                background: "var(--success-light)",
                border: "1px solid #a7f3d0",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--success)",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Changes saved
            </div>
          )}

          {/* Change password */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
              marginTop: "4px",
              marginBottom: "8px",
            }}
          >
            <button
              className="btn btn-secondary"
              style={{ width: "100%", fontSize: "13px" }}
              onClick={() => setShowPwdSection((p) => !p)}
            >
              {showPwdSection ? "Hide password" : "Change password"}
            </button>
            {showPwdSection && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Current password"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "var(--text3)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="New password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={pwdNew2}
                  onChange={(e) => setPwdNew2(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                {pwdMsg && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: pwdMsg.startsWith("Password changed")
                        ? "var(--success)"
                        : "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    {pwdMsg}
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  style={{ fontSize: "13px" }}
                  onClick={changePassword}
                >
                  Update password
                </button>
              </div>
            )}
          </div>

          {/* Deletion scheduled banner */}
          {deleteScheduled && daysLeft > 0 && (
            <div
              style={{
                background: "#fff7ed",
                border: "2px solid #fed7aa",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#c2410c",
                  }}
                >
                  Account deletion in {daysLeft} days
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#9a3412",
                    marginTop: "2px",
                  }}
                >
                  Your account and all data will be permanently deleted.
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  whiteSpace: "nowrap",
                }}
                onClick={cancelDelete}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Sign out + Delete */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
              marginTop: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <button
              className="btn"
              style={{
                width: "100%",
                background: "var(--danger-light)",
                color: "var(--danger)",
                border: "1.5px solid #fca5a5",
                fontSize: "13px",
              }}
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              <Icon.LogOut /> Sign out
            </button>
            {!deleteScheduled && (
              <button
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  fontSize: "12px",
                  color: "var(--danger)",
                  borderColor: "#fca5a5",
                }}
                onClick={() => setShowDelete(true)}
              >
                Delete my account permanently
              </button>
            )}
          </div>

          {/* Delete confirmation modal */}
          {showDelete && (
            <div
              className="modal-overlay"
              onClick={(e) =>
                e.target === e.currentTarget && setShowDelete(false)
              }
            >
              <div className="modal" style={{ maxWidth: "380px" }}>
                <div className="modal-header">
                  <h2>Delete account</h2>
                  <button
                    className="btn-icon"
                    onClick={() => setShowDelete(false)}
                  >
                    <Icon.X />
                  </button>
                </div>
                <div className="modal-body">
                  <div
                    style={{
                      background: "var(--danger-light)",
                      border: "1.5px solid #fca5a5",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                      marginBottom: "16px",
                      fontSize: "13px",
                      color: "var(--danger)",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      Your account will be permanently deleted in 30 days.
                    </strong>{" "}
                    You can cancel within that period. After 30 days all your
                    data is gone forever.
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "var(--text)",
                      marginBottom: "8px",
                    }}
                  >
                    What happens to your ledgers?
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
                      marginBottom: "6px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "var(--bg)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ marginRight: "6px", color: "var(--text3)" }}>
                      -
                    </span>
                    <div>
                      <strong>If you are admin of a ledger</strong> - the ledger
                      is deleted. Members you shared it with will no longer see
                      it.
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "var(--bg)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "16px",
                    }}
                  >
                    <span style={{ marginRight: "6px", color: "var(--text3)" }}>
                      -
                    </span>
                    <div>
                      <strong>If you are just a member</strong> - the ledger
                      stays, but your name will show as having no account.
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ color: "var(--danger)" }}>
                      Type <strong>delete</strong> to confirm
                    </label>
                    <input
                      placeholder="delete"
                      value={deleteWord}
                      onChange={(e) =>
                        setDeleteWord(e.target.value.toLowerCase())
                      }
                      style={{
                        borderColor:
                          deleteWord && deleteWord !== "delete"
                            ? "var(--danger)"
                            : "var(--border)",
                      }}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteWord("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: "var(--danger)",
                      color: "white",
                      opacity: deleteWord === "delete" ? 1 : 0.4,
                      cursor:
                        deleteWord === "delete" ? "pointer" : "not-allowed",
                    }}
                    onClick={scheduleDelete}
                    disabled={deleteWord !== "delete"}
                  >
                    Schedule deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// -- DASHBOARD -----------------------------------------------------------------
const AD_POOL = [
  // Bronze
  {
    id: "b1",
    bg: "linear-gradient(90deg,#1d4ed8,#3b82f6)",
    emoji: "🥉",
    title: "Need more ledgers?",
    sub: "Bronze — 5 ledgers, 5 members, 12mo history",
    cta: "2.99€/mo",
    plan: "light",
  },
  {
    id: "b2",
    bg: "linear-gradient(90deg,#1e40af,#2563eb)",
    emoji: "🥉",
    title: "30 expenses per ledger",
    sub: "Bronze — No ads included from 2.08€/mo",
    cta: "Upgrade",
    plan: "light",
  },
  // Silver
  {
    id: "s1",
    bg: "linear-gradient(90deg,#15803d,#22c55e)",
    emoji: "🥈",
    title: "Unlimited expenses",
    sub: "Silver — 10 ledgers, 10 members, full history",
    cta: "4.99€/mo",
    plan: "regular",
  },
  {
    id: "s2",
    bg: "linear-gradient(90deg,#14532d,#16a34a)",
    emoji: "🥈",
    title: "Full history. Always.",
    sub: "Silver — Unlimited history & expenses, no ads",
    cta: "From 3.33€/mo",
    plan: "regular",
  },
  // Gold
  {
    id: "g1",
    bg: "linear-gradient(90deg,#92400e,#f59e0b)",
    emoji: "🥇",
    title: "Go Gold. Go unlimited.",
    sub: "Unlimited ledgers · 20 members · No ads",
    cta: "6.99€/mo",
    plan: "gold",
  },
  {
    id: "g2",
    bg: "linear-gradient(135deg,#78350f,#d97706,#fbbf24)",
    emoji: "🥇",
    title: "Gold for everyone",
    sub: "Your plan elevates all members in your ledger",
    cta: "From 5.83€/mo",
    plan: "gold",
  },
  // No ads
  {
    id: "na1",
    bg: "linear-gradient(90deg,#be185d,#f43f5e)",
    emoji: "🚫",
    title: "Tired of this ad?",
    sub: "Remove all ads forever — one-time payment",
    cta: "4.99€",
    plan: null,
    noads: true,
  },
  {
    id: "na2",
    bg: "linear-gradient(90deg,#9d174d,#ec4899)",
    emoji: "✨",
    title: "Ad-free CosTrace",
    sub: "Pay once, never see ads again",
    cta: "4.99€",
    plan: null,
    noads: true,
  },
  // Your ad here
  {
    id: "y1",
    bg: "linear-gradient(90deg,#374151,#6b7280)",
    emoji: "📢",
    title: "Your ad could be here",
    sub: "Reach thousands of users tracking expenses",
    cta: "Contact us",
    plan: null,
    external: true,
  },
];

function AdBanner({ onShowUpgrade, onRemoveAds, style = {} }) {
  const [idx] = useState(() => Math.floor(Math.random() * AD_POOL.length));
  const [current, setCurrent] = useState(idx);
  const ad = AD_POOL[current];

  const handleClick = () => {
    if (ad.external) {
      window.open("mailto:ads@costrace.app?subject=Advertising", "_blank");
      return;
    }
    if (ad.noads && onRemoveAds) {
      onRemoveAds();
      return;
    }
    if (onShowUpgrade) onShowUpgrade();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: ad.bg,
        borderRadius: "var(--radius)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        marginBottom: "14px",
        position: "relative",
        ...style,
      }}
    >
      <span style={{ fontSize: "22px", flexShrink: 0 }}>{ad.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "white",
            lineHeight: 1.2,
          }}
        >
          {ad.title}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.75)",
            marginTop: "1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ad.sub}
        </div>
      </div>
      <button
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          borderRadius: "8px",
          padding: "5px 10px",
          fontSize: "10px",
          fontWeight: "800",
          color: "white",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        {ad.cta}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCurrent((p) => (p + 1) % AD_POOL.length);
        }}
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          background: "rgba(0,0,0,0.2)",
          border: "none",
          borderRadius: "50%",
          width: "16px",
          height: "16px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "9px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        ✕
      </button>
    </div>
  );
}

function LedgerStatsOverview({ ledgers, currentUser }) {
  const [pieMode, setPieMode] = useState("percent");
  const isDesktop = useIsDesktop();
  const curMk = mk(new Date());
  const activeLedgers = ledgers.filter((l) => !l.archived);
          const rows = activeLedgers.map((l) => {
            const currExp = l.expenses.filter((e) => mk(e.expense_date) === curMk);
            const bals = computeBalances(l, currExp);
            const mine = bals.find((b) => b.user_id === currentUser.id);
            const net = mine?.net || 0;
            const approvedExp = currExp.filter((e) => !e.is_settlement && e.approval_status === "approved");
            const total = approvedExp.reduce((s, e) => s + e.amount, 0);
            const debt = Math.max(0, -net);
            return {
              id: l.id,
              name: l.name,
              total,
              net,
              debt,
              color: ledgerSolidColor(l),
              approvedCount: approvedExp.length,
            };
          });
          const grandTotal = rows.reduce((s, r) => s + r.total, 0);
          const grandNet = rows.reduce((s, r) => s + r.net, 0);
          const approvedCount = rows.reduce((s, r) => s + r.approvedCount, 0);
          if (rows.length === 0) return null;

          const months = lastMonths(6);
          const monthlyData = months.map((mkey) => {
            const debt = activeLedgers.reduce((sum, l) => {
              const exp = l.expenses.filter((e) => mk(e.expense_date) === mkey);
              const bals = computeBalances(l, exp);
              const mine = bals.find((b) => b.user_id === currentUser.id);
              const net = mine?.net || 0;
              return sum + Math.max(0, -net);
            }, 0);
            return { key: mkey, label: mlbl(mkey), debt };
          });

          const pieSlices = rows.map((r) => ({ name: r.name, value: r.debt, color: r.color }));
          const grandDebt = rows.reduce((s, r) => s + r.debt, 0);

          // Latest changes across every active ledger — most recent dated expenses first.
          const feed = activeLedgers
            .flatMap((l) => l.expenses.map((e) => ({ ...e, ledgerName: l.name, ledgerColor: ledgerSolidColor(l) })))
            .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
            .slice(0, 7);

          const statusStyle = {
            approved: { bg: "rgba(46,125,86,0.18)", fg: "#6FDDA8" },
            pending: { bg: "rgba(183,119,13,0.18)", fg: "#F0B94D" },
            denied: { bg: "rgba(192,57,43,0.18)", fg: "#F08C82" },
          };

          return (
            <div
              style={{
                marginBottom: "22px",
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 26px",
                boxShadow: "var(--shadow)",
                overflowX: "hidden",
              }}
            >
              {/* Stat tiles */}
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "27fr 27fr 26fr 20fr" : "repeat(2,1fr)", gap: "12px", marginBottom: "22px" }}>
                {[
                  { label: "Total spent", value: fmtAmt(grandTotal), accent: "#42C3E6" },
                  {
                    label: "Your balance",
                    value: `${grandNet > 0.01 ? "+" : ""}${fmtAmt(grandNet)}`,
                    accent: grandNet > 0.01 ? "var(--success)" : grandNet < -0.01 ? "var(--danger)" : "var(--text2)",
                  },
                  { label: "Approved this month", value: String(approvedCount), accent: "#42C3E6" },
                  { label: "Active ledgers", value: String(rows.length), accent: "#42C3E6" },
                ].map((tile, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: isDesktop ? "14px 16px" : "10px 12px",
                      minWidth: 0,
                      overflow: "hidden",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
                      {tile.label}
                    </div>
                    <div
                      style={{
                        fontSize: isDesktop ? "21px" : "17px",
                        fontWeight: "800",
                        fontFamily: "var(--font)",
                        fontVariantNumeric: "tabular-nums",
                        color: tile.accent,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "center",
                      }}
                    >
                      {tile.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts row — desktop only; mobile keeps the stat tiles and Latest changes feed below */}
              {isDesktop && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "26px", alignItems: "stretch", marginBottom: "22px" }}>
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    Debt over time
                  </div>
                  <MonthlyDebtChart data={monthlyData} />
                </div>
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "stretch", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)" }}>
                      Debt by ledger
                    </div>
                    <button
                      onClick={() => setPieMode(pieMode === "percent" ? "amount" : "percent")}
                      className="btn btn-secondary"
                      style={{ fontSize: "10px", padding: "3px 9px" }}
                    >
                      {pieMode === "percent" ? "Show amount" : "Show %"}
                    </button>
                  </div>
                  <DebtPieChart slices={pieSlices} mode={pieMode} centerLabel={fmtAmt(grandDebt)} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    {rows
                      .filter((r) => r.debt > 0)
                      .map((r) => {
                        const pct = grandDebt > 0 ? (r.debt / grandDebt) * 100 : 0;
                        return (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--text3)" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: r.color, flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                            <span style={{ marginLeft: "auto", fontFamily: "var(--mono)" }}>
                              {pieMode === "percent" ? `${pct.toFixed(0)}%` : fmtAmt(r.debt)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              )}

              {/* Latest changes feed */}
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "10px" }}>
                  Latest changes
                </div>
                {feed.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--text3)", padding: "10px 0" }}>
                    Nothing yet — add an expense to see it here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {feed.map((e) => {
                      const st = statusStyle[e.approval_status] || statusStyle.approved;
                      return (
                        <div
                          key={e.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: isDesktop ? "10px 1fr auto auto auto" : "8px 1fr auto",
                            alignItems: "center",
                            gap: isDesktop ? "12px" : "8px",
                            padding: "8px 4px",
                            borderTop: "1px solid var(--border)",
                            minWidth: 0,
                          }}
                        >
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.ledgerColor, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "12.5px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.description || (e.is_settlement ? "Settlement" : "Expense")}
                            </div>
                            <div style={{ fontSize: "10.5px", color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.ledgerName} · {e.paid_by_name || "—"}
                              {!isDesktop && ` · ${timeAgo(e.expense_date)}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: isDesktop ? "center" : "flex-end", gap: isDesktop ? "12px" : "3px" }}>
                            <div style={{ fontSize: isDesktop ? "12px" : "11.5px", fontFamily: "var(--mono)", color: "var(--text2)", whiteSpace: "nowrap" }}>
                              {fmtAmt(e.amount)}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 9px",
                                borderRadius: "20px",
                                background: st.bg,
                                color: st.fg,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {e.approval_status}
                            </div>
                            {isDesktop && (
                              <div style={{ fontSize: "10.5px", color: "var(--text3)", whiteSpace: "nowrap" }}>
                                {timeAgo(e.expense_date)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
}

function StatsPage({ ledgers, currentUser }) {
  const hasActive = ledgers.some((l) => !l.archived);
  return (
    <div>
      <div className="page-header">
        <h1>Statistics</h1>
        <p>Spending and debt across your ledgers</p>
      </div>
      {hasActive ? (
        <LedgerStatsOverview ledgers={ledgers} currentUser={currentUser} />
      ) : (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h2>Nothing to show yet</h2>
          <p>Create a ledger and add some expenses to see your stats here.</p>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  ledgers,
  currentUser,
  onSelectLedger,
  onNewLedger,
  onOpenProfile,
  onCancelDelete,
  userPlan,
  noAds,
  onShowUpgrade,
  onUpdateLedger,
  getLedgerNewCount,
  onRemoveAds,
  overLedgerLimit,
  overParticipantLimit,
  overParticipantCount,
  participantLedgers,
}) {
  const plan = userPlan || PLANS.free;
  const curMk = mk(new Date());
  const [tab, setTab] = useState("active");
  const [filterCover, setFilterCover] = useState(null);
  const isDesktop = useIsDesktop();
  const activeLedgers = ledgers.filter((l) => !l.archived);
  const archivedLedgers = ledgers.filter((l) => l.archived);
  const shownBase =
    tab === "archived" && archivedLedgers.length > 0
      ? archivedLedgers
      : activeLedgers;
  const shown = filterCover
    ? shownBase.filter((l) => (l.cover || "house") === filterCover)
    : shownBase;
  const usedCovers = [...new Set(activeLedgers.map((l) => l.cover || "house"))];
  const showFilter = activeLedgers.length >= 5;

  // Over-limit: owned active ledgers exceed plan
  const ownedActive = activeLedgers.filter(
    (l) => l.members[0]?.user_id === currentUser.id && isCountingActive(l)
  );
  const _overLimit =
    plan.maxOwnLedgers && ownedActive.length > plan.maxOwnLedgers;
  const _overCount = _overLimit ? ownedActive.length - plan.maxOwnLedgers : 0;

  return (
    <div>
      {/* Owned ledger limit exceeded warning */}
      {(overLedgerLimit || _overLimit) && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #fca5a5",
            borderRadius: "var(--radius)",
            padding: "14px 18px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#dc2626",
                  marginBottom: "4px",
                }}
              >
                ⚠ Ledger limit exceeded
              </div>
              <div
                style={{ fontSize: "12px", color: "#b91c1c", lineHeight: 1.5 }}
              >
                You have <strong>{ownedActive.length} active ledgers</strong>{" "}
                but your <strong>{plan.name} plan</strong> allows{" "}
                <strong>{plan.maxOwnLedgers}</strong>. All your ledgers are
                locked for new entries until you archive {_overCount} or upgrade
                your plan.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "7px 14px",
                  color: "#dc2626",
                  borderColor: "#fca5a5",
                }}
                onClick={() => setTab("active")}
              >
                Archive ledgers
              </button>
              <button
                className="btn btn-primary"
                style={{ fontSize: "12px", padding: "7px 14px" }}
                onClick={onShowUpgrade}
              >
                Upgrade plan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deletion scheduled warning */}
      {currentUser.deleteScheduled &&
        Math.ceil(
          (new Date(currentUser.deleteScheduled) - new Date()) /
            (1000 * 60 * 60 * 24)
        ) > 0 && (
          <div
            style={{
              background: "#fff7ed",
              border: "2px solid #fed7aa",
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#c2410c",
                }}
              >
                This account is scheduled for deletion in{" "}
                {Math.ceil(
                  (new Date(currentUser.deleteScheduled) - new Date()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                days
              </div>
              <div
                style={{ fontSize: "12px", color: "#9a3412", marginTop: "2px" }}
              >
                All your data will be permanently deleted. You can cancel at any
                time before the deadline.
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{
                fontSize: "12px",
                padding: "7px 14px",
                whiteSpace: "nowrap",
                borderColor: "#fed7aa",
                color: "#c2410c",
              }}
              onClick={onCancelDelete}
            >
              Cancel deletion
            </button>
          </div>
        )}
      {overParticipantLimit && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #fca5a5",
            borderRadius: "var(--radius)",
            padding: "14px 18px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#dc2626",
                  marginBottom: "4px",
                }}
              >
                ⚠ Participation limit exceeded
              </div>
              <div
                style={{ fontSize: "12px", color: "#b91c1c", lineHeight: 1.5 }}
              >
                You're a member in{" "}
                <strong>{participantLedgers.length} ledgers</strong> but your{" "}
                <strong>{plan.name} plan</strong> allows{" "}
                <strong>{plan.maxParticipant}</strong>. You can't add expenses
                or see new entries in {overParticipantCount} ledger(s). Leave
                some ledgers or upgrade.
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: "12px", padding: "7px 14px", flexShrink: 0 }}
              onClick={onShowUpgrade}
            >
              Upgrade plan
            </button>
          </div>
        </div>
      )}
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            minWidth: 0,
          }}
        >
          <h1 style={{ whiteSpace: "nowrap" }}>My Ledgers</h1>
          {archivedLedgers.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg2)",
                borderRadius: "20px",
                padding: "3px",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setTab("active")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "18px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  background: tab === "active" ? "var(--white)" : "transparent",
                  color: tab === "active" ? "var(--accent)" : "var(--text3)",
                  boxShadow:
                    tab === "active" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                Active
              </button>
              <button
                onClick={() => setTab("archived")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "18px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  background:
                    tab === "archived" ? "var(--white)" : "transparent",
                  color: tab === "archived" ? "var(--locked)" : "var(--text3)",
                  boxShadow:
                    tab === "archived" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                Archive ({archivedLedgers.length})
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onOpenProfile}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid var(--border)",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            background: "linear-gradient(135deg,var(--accent),#7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "800",
            color: "white",
          }}
        >
          {currentUser.avatar &&
          AVATARS.find((a) => a.id === currentUser.avatar) ? (
            <img
              src={AVATARS.find((a) => a.id === currentUser.avatar).src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "white",
              }}
            />
          ) : (
            initials(currentUser.full_name)
          )}
        </button>
      </div>
      {shown.length === 0 && tab === "archived" && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text3)",
          }}
        >
          <p style={{ fontSize: "14px" }}>No archived ledgers yet.</p>
        </div>
      )}
      {tab === "archived" && archivedLedgers.length >= 5 && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            marginBottom: "12px",
            paddingBottom: "2px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            onClick={() => setFilterCover(null)}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: `1.5px solid ${
                !filterCover ? "var(--accent)" : "var(--border)"
              }`,
              background: !filterCover ? "var(--accent-light)" : "white",
              color: !filterCover ? "var(--accent)" : "var(--text3)",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            All
          </button>
          {[...new Set(archivedLedgers.map((l) => l.cover || "house"))].map(
            (covId) => {
              const cv = COVERS.find((c) => c.id === covId) || COVERS[0];
              const isActive = filterCover === covId;
              return (
                <button
                  key={covId}
                  onClick={() => setFilterCover(isActive ? null : covId)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: `1.5px solid ${isActive ? cv.bg : "var(--border)"}`,
                    background: isActive ? cv.bg : "white",
                    color: isActive ? "#374151" : "var(--text3)",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  {cv.label}
                </button>
              );
            }
          )}
        </div>
      )}
      {showFilter && tab === "active" && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            marginBottom: "12px",
            paddingBottom: "2px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            onClick={() => setFilterCover(null)}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: `1.5px solid ${
                !filterCover ? "var(--accent)" : "var(--border)"
              }`,
              background: !filterCover ? "var(--accent-light)" : "white",
              color: !filterCover ? "var(--accent)" : "var(--text3)",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            All
          </button>
          {usedCovers.map((covId) => {
            const cv = COVERS.find((c) => c.id === covId) || COVERS[0];
            const isActive = filterCover === covId;
            return (
              <button
                key={covId}
                onClick={() => setFilterCover(isActive ? null : covId)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: `1.5px solid ${isActive ? cv.bg : "var(--border)"}`,
                  background: isActive ? cv.bg : "white",
                  color: isActive ? "#374151" : "var(--text3)",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <NetworkIcon
                  name={cv.label}
                  color={isActive ? "#374151" : "#9ca3af"}
                  size={11}
                />
                {cv.label}
              </button>
            );
          })}
        </div>
      )}
      <div
        style={
          isDesktop
            ? { display: "grid", gridTemplateColumns: "1fr 560px", gap: "22px", alignItems: "start" }
            : undefined
        }
      >
      {isDesktop && (
        <div>
          <LedgerStatsOverview ledgers={ledgers} currentUser={currentUser} />
        </div>
      )}
      <div>
        <div className="ledger-grid" style={isDesktop ? { gridTemplateColumns: "repeat(2, 1fr)" } : undefined}>
        {shown.map((l) => {
          const cover =
            COVERS.find((c) => c.id === (l.cover || "house")) || COVERS[0];
          const currExp = l.expenses.filter(
            (e) => mk(e.expense_date) === curMk
          );
          const bals = computeBalances(l, currExp);
          const mine = bals.find((b) => b.user_id === currentUser.id);
          const net = mine?.net || 0;
          const total = currExp
            .filter((e) => !e.is_settlement && e.approval_status === "approved")
            .reduce((s, e) => s + e.amount, 0);
          const locked = l.lockedMonths?.[curMk];
          const pending = l.expenses.filter(
            (e) => e.approval_status === "pending"
          ).length;
          const allBals = computeBalances(
            l,
            l.expenses.filter((e) => e.approval_status !== "denied")
          );
          const unsettled = allBals.some((b) => Math.abs(b.net) > 0.01);
          const admin = l.members.find((m) => m.is_admin) || l.members[0];
          const isMyLedger = l.members.some(
            (m) => m.user_id === currentUser.id && m.is_admin
          );
          const adminPlan = isMyLedger
            ? userPlan?.id || "free"
            : admin?.plan || "free";
          const planColors = {
            free: "#6b7280",
            light: "#1d4ed8",
            regular: "#15803d",
            gold: "#b45309",
          };
          const planLabels = {
            free: "Free ledger",
            light: "Bronze ledger",
            regular: "Silver ledger",
            gold: "Gold ledger",
          };
          const newCount = getLedgerNewCount ? getLedgerNewCount(l) : 0;
          const isOwnedByUser = l.members[0]?.user_id === currentUser.id;
          const overLimitLocked = overLedgerLimit && isOwnedByUser;
          return (
            <div
              key={l.id}
              className="ledger-card"
              onClick={() => onSelectLedger(l)}
              style={
                l.archived
                  ? { filter: "grayscale(1)", opacity: 0.85 }
                  : overLimitLocked
                  ? { outline: "2px solid #fca5a5" }
                  : undefined
              }
            >
              <div className="ledger-cover">
                <CoverImg
                  cover={l.cover || "house"}
                  height={isDesktop ? 56 : 44}
                  coverColor={l.coverColor}
                  labelColor={l.labelColor}
                  customLabel={l.customLabel}
                >
                  {l.archived && (
                    <span
                      style={{
                        position: "absolute",
                        top: 7,
                        left: 8,
                        background: "rgba(55,65,81,0.9)",
                        color: "white",
                        borderRadius: "6px",
                        padding: "2px 7px",
                        fontSize: "10px",
                        fontWeight: "700",
                      }}
                    >
                      Archived
                    </span>
                  )}
                  {overLimitLocked && !l.archived && (
                    <span
                      style={{
                        position: "absolute",
                        top: 7,
                        left: 8,
                        background: "rgba(220,38,38,0.9)",
                        color: "white",
                        borderRadius: "6px",
                        padding: "2px 7px",
                        fontSize: "10px",
                        fontWeight: "700",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      🔒 Limit exceeded
                    </span>
                  )}
                  {!overLimitLocked && !l.archived && locked && (
                    <span className="ledger-cover-lock">
                      <Icon.Lock /> Locked
                    </span>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 8,
                      display: "flex",
                      gap: "4px",
                      alignItems: "center",
                    }}
                  >
                    {newCount > 0 && (
                      <span
                        style={{
                          background: "#3b82f6",
                          color: "white",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          fontSize: "10px",
                          fontWeight: "800",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        New: {newCount}
                      </span>
                    )}
                    {!l.archived && !locked && pending > 0 && (
                      <span
                        style={{
                          background: "rgba(245,158,11,0.9)",
                          color: "white",
                          borderRadius: "6px",
                          padding: "2px 7px",
                          fontSize: "10px",
                          fontWeight: "700",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        Pending: {pending}
                      </span>
                    )}
                    {l.archived && unsettled && (
                      <span
                        style={{
                          background: "rgba(220,38,38,0.9)",
                          color: "white",
                          borderRadius: "6px",
                          padding: "2px 7px",
                          fontSize: "10px",
                          fontWeight: "700",
                        }}
                      >
                        Unsettled
                      </span>
                    )}
                  </div>
                </CoverImg>
              </div>
              <div
                className="ledger-body"
                style={
                  isDesktop
                    ? { padding: "11px 14px 12px" }
                    : { padding: "7px 12px 9px" }
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "6px",
                    marginBottom: isDesktop ? "3px" : "2px",
                  }}
                >
                  <div>
                    <div
                      className="ledger-name"
                      style={{
                        fontSize: isDesktop ? "15px" : "13px",
                        marginBottom: isDesktop ? "2px" : "2px",
                        lineHeight: 1.2,
                      }}
                    >
                      {l.name}
                    </div>
                    <div
                      className="ledger-meta"
                      style={{
                        fontSize: isDesktop ? "11px" : "10px",
                        marginBottom: 0,
                      }}
                    >
                      {l.members.map((m) => m.display_name).join(" · ")}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "2px",
                      flexShrink: 0,
                    }}
                  >
                    {planLedgerBadge(adminPlan)}
                    <span
                      style={{
                        fontSize: isDesktop ? "10px" : "9px",
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                      }}
                    >
                      Admin: {admin?.display_name || ""}
                    </span>
                  </div>
                </div>
                <div
                  className="ledger-balance"
                  style={{
                    paddingTop: isDesktop ? "8px" : "5px",
                    borderTop: "1px solid var(--border)",
                    marginTop: isDesktop ? "7px" : "5px",
                  }}
                >
                  <div>
                    <div
                      className="bal-label"
                      style={{ fontSize: isDesktop ? "10px" : "9px" }}
                    >
                      This month
                    </div>
                    <div
                      style={{
                        fontSize: isDesktop ? "15px" : "13px",
                        fontFamily: "var(--mono)",
                        fontWeight: "800",
                        color: "var(--text2)",
                      }}
                    >
                      {fmtAmt(total)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className="bal-label"
                      style={{ fontSize: isDesktop ? "10px" : "9px" }}
                    >
                      Your balance
                    </div>
                    <div
                      className={`bal-val ${
                        net > 0.01
                          ? "bal-pos"
                          : net < -0.01
                          ? "bal-neg"
                          : "bal-zero"
                      }`}
                      style={{ fontSize: isDesktop ? "15px" : "13px" }}
                    >
                      {net > 0.01 ? "+" : ""}
                      {fmtAmt(net)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tab === "active" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* New Ledger button */}
            <div
              onClick={onNewLedger}
              style={{
                background: "var(--bg)",
                border: "2px dashed var(--border2)",
                borderRadius: "var(--radius-lg)",
                minHeight: "96px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                cursor: "pointer",
                color: "var(--text3)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.background = "var(--accent-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border2)";
                e.currentTarget.style.color = "var(--text3)";
                e.currentTarget.style.background = "var(--bg)";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--border2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              ></div>
              <span style={{ fontSize: "12px", fontWeight: "700" }}>
                New Ledger
              </span>
            </div>
            {/* Ad card — same size and shape */}
            {plan.ads && !noAds ? (
              <div
                style={{
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  minHeight: "96px",
                }}
              >
                <AdBanner
                  onShowUpgrade={onShowUpgrade}
                  onRemoveAds={onRemoveAds}
                  style={{
                    margin: 0,
                    borderRadius: 0,
                    height: "100%",
                    minHeight: "96px",
                    marginBottom: 0,
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg)",
                  border: "2px dashed var(--border2)",
                  borderRadius: "var(--radius-lg)",
                  minHeight: "96px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  ✓ No ads
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

// ── PLAN EXPIRY & DOWNGRADE HELPERS ──────────────────────────────────────────
function getEffectiveUserPlan(user) {
  if (!user) return PLANS.free;
  // Check if paid plan has expired
  if (user.plan && user.plan !== "free" && user.plan_expires_at) {
    if (new Date(user.plan_expires_at) < new Date()) return PLANS.free;
  }
  return PLANS[user?.plan || "free"] || PLANS.free;
}

function getDaysUntilExpiry(user) {
  if (!user?.plan_expires_at) return null;
  const diff = new Date(user.plan_expires_at) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Check downgrade conflicts for a ledger given a new (lower) plan
function getDowngradeConflicts(ledger, newPlan) {
  const conflicts = [];
  const activeMembers = ledger.members.filter((m) => !m.is_spectator);
  if (newPlan.maxMembers && activeMembers.length > newPlan.maxMembers)
    conflicts.push({
      type: "members",
      count: activeMembers.length,
      limit: newPlan.maxMembers,
    });
  return conflicts;
}

// Monthly expense count for current calendar month
function getMonthlyExpenseCount(ledger) {
  const curMk = mk(new Date());
  return ledger.expenses.filter(
    (e) =>
      !e.is_settlement && !e.is_carryover && mk(e.expense_date) === curMk
  ).length;
}

// ── PLANS ─────────────────────────────────────────────────────────────────────
const PLANS = {
  free: {
    id: "free",
    name: "Free",
    color: "#6b7280",
    bg: "#ffffff",
    border: "1.5px solid #d1d5db",
    monthly: 0,
    yearly: 0,
    maxOwnLedgers: 1,
    maxMembers: 2,
    maxExpensesPerLedger: 15,
    historyMonths: 1,
    maxParticipant: 3,
    ads: true,
  },
  light: {
    id: "light",
    name: "Bronze",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "2px solid #3b82f6",
    monthly: 2.99,
    yearly: 25,
    maxOwnLedgers: 5,
    maxMembers: 5,
    maxExpensesPerLedger: 30,
    historyMonths: 12,
    maxParticipant: 15,
    ads: false,
  },
  regular: {
    id: "regular",
    name: "Silver",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "2px solid #16a34a",
    monthly: 4.99,
    yearly: 40,
    maxOwnLedgers: 10,
    maxMembers: 10,
    maxExpensesPerLedger: null,
    historyMonths: null,
    maxParticipant: null,
    ads: false,
  },
  gold: {
    id: "gold",
    name: "Gold",
    color: "#d97706",
    bg: "#fffbeb",
    border: "2px solid #d97706",
    monthly: 7.99,
    yearly: 70,
    maxOwnLedgers: null,
    maxMembers: 20,
    maxExpensesPerLedger: null,
    historyMonths: null,
    maxParticipant: null,
    ads: false,
    gold: true,
  },
};

// Effective plan for a ledger = best plan among admin and (for Gold) all members
// For now admin plan drives limits; Gold elevates all participants

// Which months are visible given plan and available months
function visibleMonths(allMonths, plan) {
  if (!plan.historyMonths) return allMonths;
  const now = new Date();
  // Rolling window: from (current month - historyMonths + 1) to current month
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - plan.historyMonths + 1,
    1
  );
  const cutoffMk = `${cutoff.getFullYear()}-${String(
    cutoff.getMonth() + 1
  ).padStart(2, "0")}`;
  const curMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  return allMonths.filter((m) => m >= cutoffMk && m <= curMk);
}

// ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
function UpgradeModal({
  currentPlan,
  onClose,
  onUpgrade,
  noAds,
  onRemoveAds,
  payoutPass,
  onBuyPayoutPass,
  ledgers = [],
  currentUser,
}) {
  const [billing, setBilling] = useState("monthly");
  const [confirmDowngrade, setConfirmDowngrade] = useState(null);
  const plans = ["free", "light", "regular", "gold"];
  const planLevel = { free: 0, light: 1, regular: 2, gold: 3 };
  const features = {
    free: [
      "1 owned ledger",
      "Max 2 members",
      "15 expenses/mo/ledger",
      "1 month history",
      "Participant in 3 ledgers",
    ],
    light: [
      "5 owned ledgers",
      "Max 5 members",
      "30 expenses/mo/ledger",
      "12 months history",
      "Participant in 15 ledgers",
      "No ads",
    ],
    regular: [
      "10 owned ledgers",
      "Max 10 members",
      "Unlimited expenses",
      "Unlimited history",
      "Unlimited participation",
      "Custom header color & label",
      "No ads",
    ],
    gold: [
      "Unlimited ledgers",
      "Max 20 members",
      "Unlimited everything",
      "Custom header & label colors",
      "Rename categories",
      "Personal avatar (coming soon)",
      "No ads",
      "💸 Payout Pass included (19.99€ value)",
      "Gold perks for all members",
    ],
  };

  const downgradeSummary = (targetPlanId) => {
    const tp = PLANS[targetPlanId];
    if (!tp || !currentUser) return [];
    const issues = [];
    const ownedActive = ledgers.filter(
      (l) => isCountingActive(l) && l.members[0]?.user_id === currentUser.id
    );
    const participantL = ledgers.filter(
      (l) =>
        isCountingActive(l) &&
        l.members[0]?.user_id !== currentUser.id &&
        l.members.some((m) => m.user_id === currentUser.id)
    );
    if (tp.maxOwnLedgers && ownedActive.length > tp.maxOwnLedgers)
      issues.push(
        `Archive or delete ${ownedActive.length - tp.maxOwnLedgers} of your ${
          ownedActive.length
        } owned ledger(s)`
      );
    if (tp.maxParticipant && participantL.length > tp.maxParticipant)
      issues.push(
        `Leave ${participantL.length - tp.maxParticipant} of the ${
          participantL.length
        } ledger(s) you participate in`
      );
    ownedActive.forEach((l) => {
      const activeM = l.members.filter((m) => !m.is_spectator);
      if (tp.maxMembers && activeM.length > tp.maxMembers)
        issues.push(
          `Remove ${activeM.length - tp.maxMembers} member(s) from "${
            l.name
          }" (${activeM.length} → max ${tp.maxMembers})`
        );
    });
    return issues;
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "480px" }}>
        <div className="modal-header">
          <h2>
            {currentPlan === "gold" ? "📋 Plans & pricing" : "⚡ Upgrade plan"}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "var(--bg)",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "20px",
            }}
          >
            {["monthly", "yearly"].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: billing === b ? "white" : "transparent",
                  color: billing === b ? "var(--text)" : "var(--text3)",
                  boxShadow:
                    billing === b ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--settle)",
                      marginLeft: "4px",
                    }}
                  >
                    Save ~30%
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {plans.map((p) => {
              const pl = PLANS[p];
              const isCurrent = currentPlan === p;
              const isDowngrade =
                (planLevel[p] || 0) < (planLevel[currentPlan] || 0);
              const isUpgrade =
                (planLevel[p] || 0) > (planLevel[currentPlan] || 0);
              const isGold = p === "gold";
              const showingConfirm = confirmDowngrade === p;
              const summary = showingConfirm ? downgradeSummary(p) : [];
              return (
                <div
                  key={p}
                  style={{
                    background: isGold
                      ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
                      : pl.bg,
                    borderRadius: "var(--radius-sm)",
                    padding: isGold ? "3px" : "0",
                    outline: isGold ? "2px solid #f59e0b" : "none",
                    outlineOffset: isGold ? "3px" : "0",
                    border: pl.border,
                    boxShadow: isGold
                      ? "0 4px 20px rgba(245,158,11,0.25)"
                      : "none",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "calc(var(--radius-sm) - 2px)",
                      background: isGold
                        ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
                        : pl.bg,
                    }}
                  >
                    {isCurrent && (
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: "#111827",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        Current
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: "800",
                          color: isGold ? "#d97706" : pl.color,
                        }}
                      >
                        {pl.name}
                      </span>
                      {pl.monthly === 0 ? (
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "var(--text)",
                            marginRight: isCurrent ? "60px" : "0",
                          }}
                        >
                          Free
                        </span>
                      ) : (
                        <div
                          style={{
                            textAlign: "right",
                            marginRight: isCurrent ? "60px" : "0",
                          }}
                        >
                          {billing === "yearly" ? (
                            <>
                              <div
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "800",
                                  color: isGold ? "#d97706" : pl.color,
                                }}
                              >
                                {(pl.yearly / 12).toFixed(2)}€
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: isGold ? "#d97706" : pl.color,
                                  }}
                                >
                                  /mo
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text3)",
                                }}
                              >
                                {pl.yearly}€/yr · save{" "}
                                {Math.round(
                                  100 - (pl.yearly / (pl.monthly * 12)) * 100
                                )}
                                %
                              </div>
                            </>
                          ) : (
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: "800",
                                color: isGold ? "#d97706" : pl.color,
                              }}
                            >
                              {pl.monthly}€
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: isGold ? "#d97706" : pl.color,
                                }}
                              >
                                /mo
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        marginBottom: "10px",
                      }}
                    >
                      {features[p].map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            padding: "2px 7px",
                            borderRadius: "20px",
                            background: "rgba(0,0,0,0.06)",
                            color: isGold ? "#d97706" : pl.color,
                            border: `1px solid ${pl.color}44`,
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                    {!isCurrent && isUpgrade && (
                      <button
                        className="btn btn-primary"
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          padding: "10px",
                          background: isGold ? "#d97706" : pl.color,
                          borderColor: isGold ? "#d97706" : pl.color,
                          color: "white",
                        }}
                        onClick={() => onUpgrade(p, billing)}
                      >
                        Upgrade to {pl.name}
                      </button>
                    )}
                    {!isCurrent && isDowngrade && !showingConfirm && (
                      <button
                        className="btn btn-secondary"
                        style={{
                          width: "100%",
                          fontSize: "12px",
                          padding: "8px",
                          color: "#6b7280",
                        }}
                        onClick={() => setConfirmDowngrade(p)}
                      >
                        Downgrade to {pl.name}
                      </button>
                    )}
                    {showingConfirm && (
                      <div
                        style={{
                          background: "#fef2f2",
                          border: "1.5px solid #fca5a5",
                          borderRadius: "10px",
                          padding: "12px",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#dc2626",
                            marginBottom: "8px",
                          }}
                        >
                          ⚠ Downgrade to {pl.name}
                        </div>
                        {summary.length > 0 ? (
                          <>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#b91c1c",
                                marginBottom: "6px",
                              }}
                            >
                              To comply with {pl.name} limits, you'll need to:
                            </div>
                            <ul style={{ margin: "0 0 10px 16px", padding: 0 }}>
                              {summary.map((s, i) => (
                                <li
                                  key={i}
                                  style={{
                                    fontSize: "11px",
                                    color: "#b91c1c",
                                    marginBottom: "4px",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#b91c1c",
                              marginBottom: "10px",
                            }}
                          >
                            No immediate conflicts. Your current plan continues
                            until the billing period ends.
                          </div>
                        )}
                        {summary.length > 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#dc2626",
                              marginBottom: "10px",
                            }}
                          >
                            Your current plan continues until billing period
                            ends. Conflicts will be enforced after.
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: "12px" }}
                            onClick={() => setConfirmDowngrade(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn"
                            style={{
                              flex: 1,
                              fontSize: "12px",
                              background: "#dc2626",
                              color: "white",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                            onClick={() => {
                              onUpgrade(p, billing);
                              setConfirmDowngrade(null);
                            }}
                          >
                            Confirm downgrade
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Add-on cards — shown only for plans that benefit */}
          {(currentPlan === "free" ||
            currentPlan === "light" ||
            currentPlan === "regular") && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                One-time add-ons
              </div>

              {/* No Ads — Free only */}
              {!noAds && currentPlan === "free" && (
                <div
                  style={{
                    border: "1.5px solid #fda4af",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px",
                    background: "#fff1f2",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#be123c",
                      }}
                    >
                      Remove ads forever
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#e11d48",
                        marginTop: "2px",
                      }}
                    >
                      One-time · works forever · any device
                    </div>
                  </div>
                  <button
                    className="btn"
                    style={{
                      background: "#f43f5e",
                      color: "white",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "700",
                      padding: "8px 16px",
                      whiteSpace: "nowrap",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onClick={onRemoveAds}
                  >
                    4.49€
                  </button>
                </div>
              )}

              {/* Payout Pass — Free, Light, Regular */}
              {!payoutPass && (
                <div
                  style={{
                    border: "1.5px solid #fde68a",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px",
                    background: "#fffbeb",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#92400e",
                      }}
                    >
                      💸 Payout Pass
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#b45309",
                        marginTop: "2px",
                      }}
                    >
                      Unlock Payouts Module on all your ledgers · forever
                    </div>
                  </div>
                  <button
                    className="btn"
                    style={{
                      background: "#d97706",
                      color: "white",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "700",
                      padding: "8px 16px",
                      whiteSpace: "nowrap",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onClick={onBuyPayoutPass}
                  >
                    19.99€
                  </button>
                </div>
              )}
              {payoutPass && (
                <div
                  style={{
                    border: "1.5px solid #6ee7b7",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 14px",
                    background: "#ecfdf5",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>✅</span>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#065f46",
                    }}
                  >
                    Payout Pass active · all ledgers unlocked
                  </div>
                </div>
              )}
            </div>
          )}
          {currentPlan === "gold" && (
            <div
              style={{
                border: "1.5px solid #fde68a",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                background: "#fffbeb",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "18px" }}>💸</span>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#92400e",
                  }}
                >
                  Payout Pass included
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#b45309",
                    marginTop: "1px",
                  }}
                >
                  19.99€ value · active on all your ledgers
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── JOIN LEDGER MODAL ─────────────────────────────────────────────────────────
function JoinLedgerModal({ ledgerId, currentUser, onClose, onJoined }) {
  const [ledger, setLedger] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [claimTarget, setClaimTarget] = useState(null); // virtual member to claim
  const [selectedClaim, setSelectedClaim] = useState(null); // which virtual member user picks

  useEffect(() => {
    (async () => {
      const { data: l } = await sb
        .from("ledgers")
        .select("id,name,cover")
        .eq("id", ledgerId)
        .single();
      if (!l) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      // Load all members of this ledger
      const { data: mems } = await sb
        .from("ledger_members")
        .select("*")
        .eq("ledger_id", ledgerId);

      // Already a real member?
      const alreadyMember = (mems || []).find(
        (m) => m.user_id === currentUser.id
      );
      if (alreadyMember) {
        setDone(true);
        setLoading(false);
        onJoined();
        return;
      }

      // Find virtual members (no user_id) — candidates to claim
      const virtual = (mems || []).filter((m) => !m.user_id && !m.is_spectator);

      setLedger(l);
      setMembers(mems || []);
      setClaimTarget(virtual); // list of claimable virtual members
      // Pre-select if name matches
      const myName = (currentUser.full_name || "").toLowerCase().trim();
      const nameMatch = virtual.find(
        (m) => m.display_name.toLowerCase().trim() === myName
      );
      if (nameMatch) setSelectedClaim(nameMatch.id);
      setLoading(false);
    })();
  }, []);

  const join = async () => {
    setJoining(true);
    if (selectedClaim) {
      // CLAIM — just attach user_id to existing virtual member, preserving all history
      await sb
        .from("ledger_members")
        .update({
          user_id: currentUser.id,
          plan: currentUser.plan || "free",
        })
        .eq("id", selectedClaim);
    } else {
      // NEW member — no virtual match selected
      const activeCount = (members || []).filter((m) => !m.is_spectator).length;
      const newShare = parseFloat((100 / (activeCount + 1)).toFixed(2));
      // Redistribute existing active members
      const active = (members || []).filter((m) => !m.is_spectator);
      const updatedShare = parseFloat((100 - newShare).toFixed(2));
      for (const m of active) {
        const pct = parseFloat(
          ((m.share_percent / 100) * updatedShare).toFixed(2)
        );
        await sb
          .from("ledger_members")
          .update({ share_percent: pct })
          .eq("id", m.id);
      }
      await sb.from("ledger_members").insert({
        ledger_id: ledgerId,
        user_id: currentUser.id,
        display_name:
          currentUser.full_name || currentUser.email?.split("@")[0] || "Member",
        share_percent: newShare,
        is_spectator: false,
        plan: currentUser.plan || "free",
      });
    }
    setJoining(false);
    onJoined();
  };

  const hasClaims = claimTarget && claimTarget.length > 0;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "400px" }}>
        {loading ? (
          <div
            className="modal-body"
            style={{ padding: "40px", textAlign: "center" }}
          >
            <div style={{ fontSize: "13px", color: "var(--text3)" }}>
              Loading invite...
            </div>
          </div>
        ) : error ? (
          <>
            <div
              className="modal-body"
              style={{ padding: "32px 24px", textAlign: "center" }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Invalid invite
              </div>
              <div style={{ fontSize: "13px", color: "var(--text3)" }}>
                {error}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h2>Join ledger</h2>
              <button className="btn-icon" onClick={onClose}>
                <Icon.X />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text3)",
                    marginBottom: "4px",
                  }}
                >
                  You've been invited to
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    color: "var(--text)",
                  }}
                >
                  {ledger?.name}
                </div>
              </div>

              {hasClaims ? (
                <div>
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1.5px solid #bfdbfe",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                      marginBottom: "14px",
                      fontSize: "12px",
                      color: "#1e40af",
                      lineHeight: 1.5,
                    }}
                  >
                    We found existing members in this ledger. Select yourself to
                    keep your expense history, or join as a new member.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                      marginBottom: "14px",
                    }}
                  >
                    {claimTarget.map((m) => (
                      <label
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "11px 14px",
                          borderRadius: "10px",
                          border: `1.5px solid ${
                            selectedClaim === m.id
                              ? "var(--accent)"
                              : "var(--border)"
                          }`,
                          background:
                            selectedClaim === m.id
                              ? "var(--accent-light)"
                              : "white",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="claim"
                          value={m.id}
                          checked={selectedClaim === m.id}
                          onChange={() => setSelectedClaim(m.id)}
                          style={{
                            accentColor: "var(--accent)",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "var(--text)",
                            }}
                          >
                            {m.display_name}
                          </div>
                          <div
                            style={{ fontSize: "11px", color: "var(--text3)" }}
                          >
                            {parseFloat(m.share_percent || 0).toFixed(0)}% share
                            · existing history preserved
                          </div>
                        </div>
                        {selectedClaim === m.id && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "var(--accent)",
                            }}
                          >
                            That's me
                          </span>
                        )}
                      </label>
                    ))}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        border: `1.5px solid ${
                          selectedClaim === null
                            ? "var(--accent)"
                            : "var(--border)"
                        }`,
                        background:
                          selectedClaim === null
                            ? "var(--accent-light)"
                            : "white",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="claim"
                        value=""
                        checked={selectedClaim === null}
                        onChange={() => setSelectedClaim(null)}
                        style={{ accentColor: "var(--accent)", flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "var(--text)",
                          }}
                        >
                          Join as new member
                        </div>
                        <div
                          style={{ fontSize: "11px", color: "var(--text3)" }}
                        >
                          Start fresh, no existing history
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text3)",
                    background: "var(--bg)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "16px",
                    textAlign: "center",
                  }}
                >
                  You'll be added as a new member. Your share will be calculated
                  automatically.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ gap: "8px" }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Decline
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={join}
                disabled={joining}
              >
                {joining
                  ? "Joining..."
                  : selectedClaim
                  ? "Claim & join"
                  : "Join ledger"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

// ── FEEDBACK MODAL ────────────────────────────────────────────────────────────
function FeedbackModal({ currentUser, onClose }) {
  const [type, setType] = useState("idea");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    if (ENV === "production") {
      await sb.from("feedback").insert({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || null,
        user_name: currentUser?.full_name || null,
        type,
        title,
        body,
        status: "new",
      });
    }
    setSending(false);
    setSent(true);
  };

  const types = [
    { id: "idea", label: "Idea", desc: "Feature request or suggestion" },
    { id: "bug", label: "Bug", desc: "Something isn't working" },
    {
      id: "exploit",
      label: "Security",
      desc: "Vulnerability or security issue",
    },
  ];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "600px", width: "95vw" }}>
        <div className="modal-header">
          <h2>Send Feedback</h2>
          <button className="btn-icon" onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        {sent ? (
          <div
            className="modal-body"
            style={{ textAlign: "center", padding: "32px 24px" }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Thank you!
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text2)",
                lineHeight: 1.6,
              }}
            >
              We appreciate every submission — your time and effort mean a lot
              to us. We read everything carefully. If your feedback needs a
              follow-up, we'll reach out by email.
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: "20px" }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
              >
                {types.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: "10px",
                      border: `1.5px solid ${
                        type === t.id ? "var(--accent)" : "var(--border)"
                      }`,
                      background:
                        type === t.id ? "var(--accent-light)" : "white",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: type === t.id ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text3)",
                        marginTop: "2px",
                      }}
                    >
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  placeholder={
                    type === "bug"
                      ? "What went wrong?"
                      : type === "exploit"
                      ? "Describe the vulnerability..."
                      : "What's your idea?"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Details</label>
                <textarea
                  placeholder="Give us as much detail as possible..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{ resize: "none", height: "220px", width: "100%" }}
                />
              </div>
              {type === "exploit" && (
                <div
                  style={{
                    background: "#fef3c7",
                    border: "1.5px solid #fde68a",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#92400e",
                  }}
                >
                  Security reports are treated with priority and
                  confidentiality.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={!title.trim() || !body.trim() || sending}
              >
                {sending ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// -- MOCK USER (dev only) -----------------------------------------------------
const MOCK_USER = {
  id: "u1",
  email: "viktor@costrace.app",
  full_name: "Viktor",
  avatar: null,
  plan: "gold",
  plan_expires_at: null,
  noAds: true,
  date_of_birth: null,
  deleteScheduled: null,
};

export default function App() {
  const [user, setUser] = useState(ENV === "development" ? MOCK_USER : null);
  const [currency, setCurrency] = useState(
    ENV === "development" ? "RSD" : "RSD"
  );
  const [ledgers, setLedgers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pendingJoin, setPendingJoin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("join") || null;
  });
  const [activeLedgerId, setActiveLedgerId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [prefillMember, setPrefillMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [page, setPage] = useState("home");
  const [seenMap, setSeenMap] = useState(() => loadSeenFromStorage());
  const { toasts, push: notify, dismiss } = useNotifications();

  const userPlan = getEffectiveUserPlan(user);
  const noAds = user?.noAds || userPlan.id !== "free";
  const overLedgerLimit = !!(
    userPlan.maxOwnLedgers &&
    ledgers.filter(
      (l) => isCountingActive(l) && l.members[0]?.user_id === user?.id
    ).length > userPlan.maxOwnLedgers
  );
  // Ledgers where user is participant (not admin)
  const participantLedgers = ledgers.filter(
    (l) =>
      isCountingActive(l) &&
      l.members[0]?.user_id !== user?.id &&
      l.members.some((m) => m.user_id === user?.id)
  );
  const overParticipantLimit = !!(
    userPlan.maxParticipant &&
    participantLedgers.length > userPlan.maxParticipant
  );
  const overParticipantCount = overParticipantLimit
    ? participantLedgers.length - userPlan.maxParticipant
    : 0;

  const leaveledger = async (ledgerId) => {
    // In DB: set user_id to null (member becomes virtual, history intact)
    const ledger = ledgers.find((l) => l.id === ledgerId);
    const member = ledger?.members.find((m) => m.user_id === user.id);
    if (member) {
      await sb
        .from("ledger_members")
        .update({ user_id: null })
        .eq("id", member.id);
    }
    // Locally: remove ledger from this user's list entirely
    setLedgers((p) => p.filter((l) => l.id !== ledgerId));
    setActiveLedgerId(null);
    setPage("home");
  };

  // 7-day expiry warning
  const daysLeft = getDaysUntilExpiry(user);
  const showExpiryWarning =
    daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && user?.plan !== "free";

  const handleUpgrade = (planId, billing) => {
    const days = billing === "yearly" ? 365 : 30;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    // If downgrading, new plan starts after current period expires
    const currentExpiry = user?.plan_expires_at
      ? new Date(user.plan_expires_at)
      : null;
    const currentPlanLevel = { free: 0, light: 1, regular: 2, gold: 3 };
    const isDowngrade =
      (currentPlanLevel[planId] || 0) <
      (currentPlanLevel[user?.plan || "free"] || 0);
    const effectiveDate =
      isDowngrade && currentExpiry && currentExpiry > new Date()
        ? currentExpiry
        : new Date();
    const newExpiry = new Date(effectiveDate);
    newExpiry.setDate(newExpiry.getDate() + days);
    setUser((u) => ({
      ...u,
      plan: planId,
      billing,
      plan_expires_at: newExpiry.toISOString(),
      downgrade_pending: isDowngrade
        ? { plan: planId, from: u?.plan, at: newExpiry.toISOString() }
        : null,
    }));
    // If upgrading, clear downgrade markers on all ledgers
    if (!isDowngrade) {
      setLedgers((p) => p.map((l) => ({ ...l, downgraded_from: null })));
    }
    setShowUpgrade(false);
    if (isDowngrade)
      notify(
        "pending",
        "Downgrade scheduled",
        `Your current plan continues until ${currentExpiry?.toLocaleDateString()}. ${
          PLANS[planId].name
        } starts after.`,
        ""
      );
    else
      notify(
        "new-expense",
        "Plan upgraded",
        `You're now on ${PLANS[planId].name}!`,
        ""
      );
  };
  const handleRemoveAds = () => {
    setUser((u) => ({ ...u, noAds: true }));
    setShowUpgrade(false);
    notify(
      "new-expense",
      "Ads removed",
      "You'll never see ads again. Thank you!",
      ""
    );
  };

  const handleBuyPayoutPass = () => {
    setUser((u) => ({ ...u, payoutPass: true }));
    setShowUpgrade(false);
    notify(
      "new-expense",
      "💸 Payout Pass activated",
      "Payouts Module is now unlocked on all your ledgers.",
      ""
    );
  };

  const CURRENCIES = [
    "RSD",
    "EUR",
    "USD",
    "GBP",
    "CHF",
    "HUF",
    "BAM",
    "RON",
    "MKD",
    "ALL",
    "CZK",
    "PLN",
    "SEK",
    "NOK",
    "DKK",
    "JPY",
    "CNY",
    "YER",
    "AED",
    "SAR",
    "TRY",
    "INR",
    "AUD",
    "CAD",
    "BRL",
    "MXN",
    "ZAR",
    "NGN",
    "EGP",
    "PKR",
    "PHP",
    "IDR",
    "MYR",
    "THB",
    "KRW",
    "HKD",
    "SGD",
    "NZD",
    "ILS",
    "RUB",
    "UAH",
    "GEL",
    "IQD",
    "KWD",
    "QAR",
    "BHD",
    "OMR",
    "MDL",
    "BYN",
    "AZN",
    "AMD",
    "KZT",
  ];
  const IP_CURRENCY_MAP = {
    RS: "RSD",
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
    BE: "EUR",
    AT: "EUR",
    PT: "EUR",
    GR: "EUR",
    IE: "EUR",
    FI: "EUR",
    SK: "EUR",
    SI: "EUR",
    EE: "EUR",
    LV: "EUR",
    LT: "EUR",
    MT: "EUR",
    CY: "EUR",
    LU: "EUR",
    US: "USD",
    GB: "GBP",
    CH: "CHF",
    HU: "HUF",
    BA: "BAM",
    RO: "RON",
    HR: "EUR",
    MK: "MKD",
    AL: "ALL",
    CZ: "CZK",
    PL: "PLN",
    SE: "SEK",
    NO: "NOK",
    DK: "DKK",
    JP: "JPY",
    CN: "CNY",
    YE: "YER",
    AE: "AED",
    SA: "SAR",
    TR: "TRY",
    IN: "INR",
    AU: "AUD",
    CA: "CAD",
    BR: "BRL",
    MX: "MXN",
    ZA: "ZAR",
    NG: "NGN",
    EG: "EGP",
    PK: "PKR",
    BD: "BDT",
    PH: "PHP",
    ID: "IDR",
    MY: "MYR",
    TH: "THB",
    VN: "VND",
    KR: "KRW",
    TW: "TWD",
    HK: "HKD",
    SG: "SGD",
    NZ: "NZD",
    AR: "ARS",
    CL: "CLP",
    CO: "COP",
    PE: "PEN",
    IL: "ILS",
    RU: "RUB",
    UA: "UAH",
    KZ: "KZT",
    GE: "GEL",
    AM: "AMD",
    AZ: "AZN",
    ME: "EUR",
    XK: "EUR",
    MD: "MDL",
    BY: "BYN",
    IQ: "IQD",
    IR: "IRR",
    SY: "SYP",
    JO: "JOD",
    LB: "LBP",
    KW: "KWD",
    QA: "QAR",
    BH: "BHD",
    OM: "OMR",
  };

  // ── Supabase helpers ───────────────────────────────────────────────────────
  const loadProfile = async (uid) => {
    const { data } = await sb
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    return data;
  };

  // After loading ledgers, sync current user's display_name/avatar from profile
  const syncUserInLedgers = (profile) => {
    if (!profile) return;
    setLedgers((prev) =>
      prev.map((l) => ({
        ...l,
        members: l.members.map((m) =>
          m.user_id === profile.id
            ? { ...m, display_name: profile.full_name || m.display_name }
            : m
        ),
      }))
    );
  };

  const loadLedgers = async (uid) => {
    // 1. Get all ledger_ids where user is a member
    const { data: memberRows } = await sb
      .from("ledger_members")
      .select("ledger_id")
      .eq("user_id", uid);
    if (!memberRows || memberRows.length === 0) {
      setLedgers([]);
      setLoadingData(false);
      return;
    }
    const ids = memberRows.map((r) => r.ledger_id);

    // 2. Load ledgers
    const { data: lRows } = await sb.from("ledgers").select("*").in("id", ids);
    if (!lRows) {
      setLedgers([]);
      setLoadingData(false);
      return;
    }

    // 3. Load all members for these ledgers
    const { data: allMembers } = await sb
      .from("ledger_members")
      .select("*")
      .in("ledger_id", ids);

    // 4. Load all expenses + splits
    const { data: allExpenses } = await sb
      .from("expenses")
      .select("*")
      .in("ledger_id", ids);
    const expIds = (allExpenses || []).map((e) => e.id);
    const { data: allSplits } =
      expIds.length > 0
        ? await sb.from("expense_splits").select("*").in("expense_id", expIds)
        : { data: [] };

    // 5. Assemble into app structure
    const assembled = lRows.map((l) => {
      const members = (allMembers || [])
        .filter((m) => m.ledger_id === l.id)
        .sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          return new Date(a.joined_at || 0) - new Date(b.joined_at || 0);
        })
        .map((m) => ({
          id: m.id,
          display_name: m.display_name,
          share_percent: parseFloat(m.share_percent) || 0,
          user_id: m.user_id,
          is_spectator: m.is_spectator || false,
          is_admin: m.is_admin || false,
          share_history: m.share_history || [],
          plan: m.plan || "free",
          joined_date: m.joined_at,
          avatar: m.avatar || null,
        }));
      const expenses = (allExpenses || [])
        .filter((e) => e.ledger_id === l.id)
        .map((e) => ({
          id: e.id,
          description: e.description,
          amount: parseFloat(e.amount) || 0,
          paid_by_name: e.paid_by_name,
          paid_by_id: e.paid_by_id,
          expense_date: e.expense_date,
          approval_status: e.approval_status || "approved",
          is_settlement: e.is_settlement || false,
          is_carryover: e.is_carryover || false,
          is_payout: e.is_payout || false,
          payout_mode: e.payout_mode || null,
          splits: (allSplits || [])
            .filter((s) => s.expense_id === e.id)
            .map((s) => ({
              member_id: s.ledger_member_id,
              share_percent: parseFloat(s.share_percent) || 0,
              amount_owed: parseFloat(s.amount_owed) || 0,
            })),
        }));
      return {
        id: l.id,
        name: l.name,
        cover: l.cover || "house",
        require_approval: l.require_approval || false,
        notifications_enabled: l.notifications_enabled !== false,
        auto_lock: l.auto_lock !== false,
        carry_balance: l.carry_balance || false,
        labelColor: l.label_color || null,
        customLabel: l.custom_label || null,
        cardColor: l.card_color || null,
        lockedMonths: l.locked_months || {},
        archived: l.archived || false,
        archived_at: l.archived_at || null,
        deleteRequest: l.delete_request || null,
        deleteScheduledAt: l.delete_scheduled_at || null,
        payout_mode: l.payout_mode || "offset_ledger",
        payout_custom_splits: l.payout_custom_splits || null,
        members,
        expenses,
      };
    });

    // Fetch avatars + names from profiles for all members with user_id
    const userIds = [
      ...new Set(
        assembled.flatMap((l) =>
          l.members.map((m) => m.user_id).filter(Boolean)
        )
      ),
    ];
    if (userIds.length > 0) {
      const { data: profs } = await sb
        .from("profiles")
        .select("id,avatar,full_name")
        .in("id", userIds);
      const profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      const withProfiles = assembled.map((l) => ({
        ...l,
        members: l.members.map((m) => {
          if (!m.user_id) return m;
          const prof = profMap[m.user_id];
          if (!prof) return m;
          return {
            ...m,
            avatar: prof.avatar || null,
            display_name: prof.full_name || m.display_name,
          };
        }),
      }));
      setLedgers(withProfiles);
    } else {
      setLedgers(assembled);
    }
    setLoadingData(false);
  };

  const saveExpense = async (ledgerId, exp) => {
    const { data: eRow, error } = await sb
      .from("expenses")
      .insert({
        id: exp.id.startsWith("e") ? undefined : exp.id,
        ledger_id: ledgerId,
        description: exp.description,
        amount: exp.amount,
        paid_by_name: exp.paid_by_name,
        paid_by_id: exp.paid_by_id || null,
        expense_date: exp.expense_date,
        approval_status: exp.approval_status,
        is_settlement: exp.is_settlement || false,
        is_carryover: exp.is_carryover || false,
        is_payout: exp.is_payout || false,
        payout_mode: exp.payout_mode || null,
      })
      .select()
      .single();
    if (error) {
      console.error("saveExpense error:", error);
      return;
    }
    if (!eRow) {
      console.error("saveExpense: no row returned");
      return;
    }
    if (exp.splits && exp.splits.length > 0) {
      const { error: splitError } = await sb.from("expense_splits").insert(
        exp.splits.map((s) => ({
          expense_id: eRow.id,
          ledger_member_id: s.member_id,
          share_percent: s.share_percent,
          amount_owed: s.amount_owed || 0,
        }))
      );
      if (splitError) console.error("saveExpense splits error:", splitError);
    }
    setLedgers((p) =>
      p.map((l) =>
        l.id !== ledgerId
          ? l
          : {
              ...l,
              expenses: l.expenses.map((e) =>
                e.id === exp.id ? { ...e, id: eRow.id } : e
              ),
            }
      )
    );
    const target = ledgers.find((l) => l.id === ledgerId);
    if (target) {
      if (exp.approval_status === "pending") {
        const approverIds = target.members
          .filter((m) => m.user_id && m.user_id !== user.id && m.is_admin)
          .map((m) => m.user_id);
        sendPushTo(
          approverIds,
          "Needs approval",
          `"${exp.description}" (${exp.amount}) needs your approval in "${target.name}".`
        );
      } else {
        const otherIds = target.members
          .filter((m) => m.user_id && m.user_id !== user.id)
          .map((m) => m.user_id);
        sendPushTo(
          otherIds,
          "New expense",
          `"${exp.description}" (${exp.amount}) was added to "${target.name}".`
        );
      }
    }
  };

  const saveLedger = async (l) => {
    const { error } = await sb.from("ledgers").upsert({
      id: l.id,
      name: l.name,
      cover: l.cover || "house",
      require_approval: l.require_approval || false,
      notifications_enabled: l.notifications_enabled !== false,
      auto_lock: l.auto_lock !== false,
      carry_balance: l.carry_balance || false,
      cover_color: l.coverColor || null,
      label_color: l.labelColor || null,
      custom_label: l.customLabel || null,
      card_color: l.cardColor || null,
      locked_months: l.lockedMonths || {},
      archived: l.archived || false,
      archived_at: l.archived_at || null,
      delete_request: l.deleteRequest || null,
    });
    if (error) console.error("saveLedger error:", error);
  };

  const handleLogin = async (u) => {
    const profile = await loadProfile(u.id);
    const fullUser = {
      id: u.id,
      email: u.email || profile?.email || "",
      full_name:
        profile?.full_name ||
        (u.full_name && u.full_name.trim() ? u.full_name : null) ||
        null,
      avatar: profile?.avatar || null,
      plan: profile?.plan || "free",
      plan_expires_at: profile?.plan_expires_at || null,
      noAds: profile?.no_ads || false,
      payoutPass: profile?.payout_pass || false,
      date_of_birth: profile?.date_of_birth || null,
      deleteScheduled: profile?.delete_scheduled_at || null,
    };
    setUser(fullUser);
    await loadLedgers(u.id);
    syncUserInLedgers({ ...fullUser });
    // Sync plan in ledger_members to match current profile plan
    if (fullUser.plan) {
      await sb
        .from("ledger_members")
        .update({ plan: fullUser.plan })
        .eq("user_id", u.id)
        .neq("plan", fullUser.plan || "free");
    }
    try {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setCurrency(IP_CURRENCY_MAP[d.country_code] || d.currency || "RSD");
    } catch (e) {}
  };

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      if (!user?.id) return;
      const profile = await loadProfile(user.id);
      if (!profile) return;
      setUser((u) => ({
        ...u,
        plan: profile.plan || "free",
        full_name: profile.full_name || u.full_name,
        avatar: profile.avatar || u.avatar,
        noAds: profile.no_ads || false,
        payoutPass: profile.payout_pass || false,
      }));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id]);
  useEffect(() => {
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await handleLogin({ id: session.user.id, email: session.user.email });
        // Check for ?join= param after login
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get("join");
        if (joinId) setPendingJoin(joinId);
      } else {
        setLoadingData(false);
      }
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLedgers([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-execute deletion once the countdown reaches zero — no admin click required.
  useEffect(() => {
    const check = () => {
      ledgers.forEach(async (l) => {
        const deadline = l.deleteScheduledAt;
        if (!deadline) return;
        if (secondsUntil(deadline) > 0) return;
        const choices = l.deleteRequest?.copyChoices || {};
        const keepers = l.members.filter(
          (m) => m.user_id && choices[m.id] === "archive"
        );
        const keptCopies = keepers.map((m) => ({
          ...l,
          id: `l${Date.now()}_${m.id}`,
          archived: true,
          archived_at: now(),
          archived_from: l.id,
          owner_id: m.user_id,
          deleteRequest: null,
          deleteScheduledAt: null,
        }));
        setLedgers((p) => [...p.filter((x) => x.id !== l.id), ...keptCopies]);
        notify(
          "locked",
          "Ledger deleted",
          `"${l.name}" has been permanently deleted.`,
          l.name
        );
        if (activeLedgerId === l.id) {
          setActiveLedgerId(null);
          setPage("home");
        }
        if (ENV === "production") {
          // Create each requested copy in Supabase BEFORE removing the original, then remove it.
          for (const m of keepers) {
            await persistArchivedLedgerCopy(sb, l, m.user_id);
          }
          await deleteLedgerEverywhere(sb, l.id);
        }
      });
    };
    check();
    const interval = setInterval(check, 5000); // re-check every 5s — cheap, and needed for short test countdowns
    return () => clearInterval(interval);
  }, [ledgers, activeLedgerId]);

  if (!user && ENV !== "development") {
    if (loadingData)
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f4f6f9",
          }}
        >
          <div
            style={{ fontSize: "14px", color: "#9ca3af", fontWeight: "600" }}
          >
            Loading...
          </div>
        </div>
      );
    return <AuthScreen onLogin={handleLogin} />;
  }

  const createLedger = async (data) => {
    const networkPeople = data.networkPeople || [];
    const ownedActive = ledgers.filter(
      (l) => isCountingActive(l) && l.members[0]?.user_id === user.id
    );
    if (
      userPlan.maxOwnLedgers &&
      ownedActive.length >= userPlan.maxOwnLedgers
    ) {
      notify(
        "pending",
        "Limit reached",
        `Your ${userPlan.name} plan allows ${userPlan.maxOwnLedgers} active ledger(s). Upgrade to create more.`,
        ""
      );
      setShowUpgrade(true);
      return;
    }
    const count = data.members.length + 1;
    if (userPlan.maxMembers && count > userPlan.maxMembers) {
      notify(
        "pending",
        "Member limit",
        `Your plan allows max ${userPlan.maxMembers} members per ledger.`,
        ""
      );
      return;
    }
    const eq = parseFloat((100 / count).toFixed(2));
    const self = {
      id: `ms${Date.now()}`,
      display_name: user.full_name || user.email,
      share_percent: data.selfShare || eq,
      user_id: user.id,
      is_admin: true,
      avatar: user.avatar || null,
      joined_date: now(),
    };
    const all = [self, ...data.members];
    const total = all.reduce((s, m) => s + m.share_percent, 0);
    const final =
      Math.abs(total - 100) < 0.01
        ? all
        : all.map((m) => ({
            ...m,
            share_percent: parseFloat((100 / all.length).toFixed(2)),
          }));
    const newLedger = {
      id: `l${Date.now()}`,
      name: data.name,
      cover: data.cover || "house",
      require_approval: data.require_approval,
      members: final,
      expenses: [],
      lockedMonths: {},
      auto_lock: true,
      _syncing: ENV === "production",
    };
    setLedgers((p) => [...p, newLedger]);
    // Persist to Supabase
    if (ENV === "production") {
      const { data: lRow } = await sb
        .from("ledgers")
        .insert({
          name: data.name,
          cover: data.cover || "house",
          require_approval: data.require_approval,
          notifications_enabled: true,
          auto_lock: true,
          locked_months: {},
        })
        .select()
        .single();
      if (lRow) {
        // Insert members, capturing each real Supabase id so we can reconcile local temp ids
        const idMap = {};
        for (const m of final) {
          const { data: mRow } = await sb
            .from("ledger_members")
            .insert({
              ledger_id: lRow.id,
              user_id: m.user_id || null,
              display_name: m.display_name,
              share_percent: m.share_percent,
              is_spectator: false,
              is_admin: m.is_admin === true,
              invited_email: m.invited_email || null,
              avatar: m.avatar || null,
              plan: m.user_id === user.id ? user.plan || "free" : "free",
            })
            .select()
            .single();
          if (mRow) idMap[m.id] = mRow.id;
        }
        // Update local state with real Supabase ids (ledger + every member) and clear the sync flag —
        // until this runs, local ids wouldn't match real DB rows, so writes keyed by them (e.g. a
        // delete-request's consents, keyed by member id) would silently fail to persist or match.
        setLedgers((p) =>
          p.map((l) =>
            l.id !== newLedger.id
              ? l
              : {
                  ...l,
                  id: lRow.id,
                  _syncing: false,
                  members: l.members.map((mm) =>
                    idMap[mm.id] ? { ...mm, id: idMap[mm.id] } : mm
                  ),
                }
          )
        );
      }
    }
  };

  // New entries tracking per ledger
  const getLedgerNewCount = (l) => {
    const seen = seenMap[l.id] || new Set();
    return l.expenses.filter(
      (e) =>
        !e.is_settlement && e.approval_status === "approved" && !seen.has(e.id)
    ).length;
  };

  const onOpenLedger = (l) => {
    setActiveLedgerId(l.id);
    // Mark all current expenses as "seen" immediately on open — the NEW badge
    // should disappear the moment the ledger is opened, not only when the user
    // exits through the back button. This way it doesn't linger if they navigate
    // away via the sidebar, browser back, or just close the tab.
    const nextSeen = {
      ...seenMap,
      [l.id]: new Set(l.expenses.map((e) => e.id)),
    };
    setSeenMap(nextSeen);
    saveSeenToStorage(nextSeen);
    // Refresh profiles (avatars, names) for this ledger's members
    const userIds = [
      ...new Set(l.members.map((m) => m.user_id).filter(Boolean)),
    ];
    if (userIds.length > 0) {
      sb.from("profiles")
        .select("id,avatar,full_name")
        .in("id", userIds)
        .then(({ data: profs }) => {
          if (!profs || !profs.length) return;
          const profMap = Object.fromEntries(profs.map((p) => [p.id, p]));
          setLedgers((prev) =>
            prev.map((led) =>
              led.id !== l.id
                ? led
                : {
                    ...led,
                    members: led.members.map((m) => {
                      if (!m.user_id) return m;
                      const prof = profMap[m.user_id];
                      return prof
                        ? {
                            ...m,
                            avatar: prof.avatar || null,
                            display_name: prof.full_name || m.display_name,
                          }
                        : m;
                    }),
                  }
            )
          );
        });
    }
  };

  const onCloseLedger = () => {
    // Seen-tracking now happens on open (see onOpenLedger), so closing just navigates back.
    setActiveLedgerId(null);
    setPage("home");
  };

  const updateLedger = async (u) => {
    setLedgers((p) => p.map((l) => (l.id === u.id ? u : l)));
    if (ENV === "production") {
      saveLedger(u);
      const prev = ledgers.find((l) => l.id === u.id);
      if (prev) {
        // Save new expenses
        const newExps = u.expenses.filter(
          (e) => !prev.expenses.find((pe) => pe.id === e.id)
        );
        for (const exp of newExps) {
          await saveExpense(u.id, exp);
        }
        // Save approval status changes
        for (const exp of u.expenses) {
          const prevExp = prev.expenses.find((pe) => pe.id === exp.id);
          if (prevExp && prevExp.approval_status !== exp.approval_status) {
            await sb
              .from("expenses")
              .update({ approval_status: exp.approval_status })
              .eq("id", exp.id);
          }
        }
        // Delete removed members
        const removedIds = prev.members
          .filter((m) => !u.members.find((um) => um.id === m.id))
          .map((m) => m.id);
        for (const id of removedIds) {
          await sb.from("ledger_members").delete().eq("id", id);
        }
        // Insert brand-new members (added via Settings → Add member; not yet persisted)
        const newMembers = u.members.filter(
          (m) => !prev.members.find((pm) => pm.id === m.id)
        );
        for (const m of newMembers) {
          await sb.from("ledger_members").insert({
            ledger_id: u.id,
            user_id: m.user_id || null,
            display_name: m.display_name,
            share_percent: m.share_percent,
            is_spectator: m.is_spectator || false,
            is_admin: m.is_admin === true,
            invited_email: m.invited_email || null,
            avatar: m.avatar || null,
            plan: m.user_id ? m.plan || "free" : "free",
          });
        }
        // Sync updated shares (existing members only — new ones were just inserted above)
        for (const m of u.members) {
          if (newMembers.find((nm) => nm.id === m.id)) continue;
          await sb
            .from("ledger_members")
            .update({
              share_percent: m.share_percent,
              is_spectator: m.is_spectator || false,
              share_history: m.share_history || [],
              display_name: m.display_name,
            })
            .eq("id", m.id);
        }
      }
    }
  };
  // -- ACTIVE LEDGER DELETION
  const votingMembers = (l) =>
    l.members.filter((m) => !m.is_spectator && m.user_id);
  // A ledger is "solo-deletable" (no consent needed) when the admin is the only
  // voting member (solo table, or everyone else is a spectator).
  const isSoloDeletable = (l) => votingMembers(l).length <= 1;

  const requestDelete = async (id) => {
    const target = ledgers.find((l) => l.id === id);
    if (!target) return;
    if (target._syncing) {
      notify(
        "pending",
        "Still saving",
        "This ledger just finished being created — give it a second and try again.",
        ""
      );
      return;
    }
    const others = votingMembers(target).filter((m) => m.user_id !== user.id);
    const consents = {};
    const adminM = target.members.find((m) => m.user_id === user.id);
    if (adminM) consents[adminM.id] = "approved";
    others.forEach((m) => {
      consents[m.id] = "pending";
    });
    const newRequest = {
      initiated_at: now(),
      initiated_by: user.id,
      consents,
      copyChoices: {},
    };
    setLedgers((p) =>
      p.map((l) =>
        l.id === id
          ? { ...l, deleteRequest: newRequest, deleteScheduledAt: null }
          : l
      )
    );
    const { data, error } = await sb
      .from("ledgers")
      .update({ delete_request: newRequest, delete_scheduled_at: null })
      .eq("id", id)
      .select();
    if (error) console.error("requestDelete: update failed", error);
    else if (!data || data.length === 0)
      console.error(
        "requestDelete: update matched 0 rows — check RLS policy on ledgers UPDATE for id",
        id
      );
    else console.log("requestDelete: saved OK", data[0]);
    notify(
      "pending",
      "Deletion requested",
      `You've requested to delete "${target.name}". Members must approve.`,
      target.name
    );
    sendPushTo(
      others.map((m) => m.user_id),
      "Deletion requested",
      `Someone requested to delete "${target.name}". Your approval is needed.`,
      target.name
    );
  };
  // member responds: status = 'approved' | 'rejected'; copyChoice = 'archive' | 'none'.
  // A rejection isn't just "one no vote" — it cancels the whole request immediately,
  // back to as if deletion was never requested. Admin has to start over if they want to retry.
  // The deletion deadline itself lives in its own plain column (delete_scheduled_at) —
  // not nested in the delete_request JSON — so it's trivial to verify directly in the
  // Supabase table editor whether a write actually landed.
  // Everything is computed synchronously from `ledgers` (the current committed state) BEFORE
  // calling setLedgers/Supabase — not as a side effect inside the setLedgers updater, since
  // React doesn't guarantee that updater runs before the code right after it.
  const respondDelete = async (id, status, copyChoice) => {
    const target = ledgers.find((l) => l.id === id);
    if (!target || !target.deleteRequest) return;
    if (target._syncing) {
      notify(
        "pending",
        "Still saving",
        "This ledger just finished being created — give it a second and try again.",
        ""
      );
      return;
    }
    // Once the countdown has started, rejecting is no longer possible — only the
    // admin can cancel (cancelDeleteRequest). Members can still upgrade to "keep my copy".
    if (target.deleteScheduledAt && status === "rejected") return;
    const me = target.members.find((m) => m.user_id === user.id);
    if (!me) return;

    if (status === "rejected") {
      setLedgers((p) =>
        p.map((l) =>
          l.id === id
            ? { ...l, deleteRequest: null, deleteScheduledAt: null }
            : l
        )
      );
      notify(
        "denied",
        "Deletion cancelled",
        `A member rejected — "${target.name}" deletion request was cancelled.`,
        target.name
      );
      const { data, error } = await sb
        .from("ledgers")
        .update({ delete_request: null, delete_scheduled_at: null })
        .eq("id", id)
        .select();
      if (error) console.error("respondDelete (reject): update failed", error);
      else if (!data || data.length === 0)
        console.error(
          "respondDelete (reject): update matched 0 rows — check RLS policy on ledgers UPDATE for id",
          id
        );
      else console.log("respondDelete (reject): saved OK", data[0]);
      return;
    }

    const consents = { ...target.deleteRequest.consents, [me.id]: status };
    const copyChoices = { ...target.deleteRequest.copyChoices };
    if (copyChoice) copyChoices[me.id] = copyChoice;
    const allApproved = votingMembers(target).every(
      (m) => consents[m.id] === "approved"
    );
    let newScheduledAt = target.deleteScheduledAt;
    if (allApproved && !newScheduledAt)
      newScheduledAt = new Date(
        Date.now() + DELETE_COUNTDOWN_SECONDS * 1000
      ).toISOString();
    const newRequest = { ...target.deleteRequest, consents, copyChoices };

    setLedgers((p) =>
      p.map((l) =>
        l.id === id
          ? {
              ...l,
              deleteRequest: newRequest,
              deleteScheduledAt: newScheduledAt,
            }
          : l
      )
    );

    const { data, error } = await sb
      .from("ledgers")
      .update({
        delete_request: newRequest,
        delete_scheduled_at: newScheduledAt || null,
      })
      .eq("id", id)
      .select();
    if (error) {
      console.error("respondDelete: update failed", error);
      notify(
        "pending",
        "Couldn't save your response",
        "This didn't save to the server — please try again.",
        ""
      );
    } else if (!data || data.length === 0) {
      console.error(
        "respondDelete: update matched 0 rows — check RLS policy on ledgers UPDATE for id",
        id
      );
      notify(
        "pending",
        "Couldn't save your response",
        "Your account may not have permission to update this ledger.",
        ""
      );
    } else
      console.log(
        "respondDelete: saved OK — delete_scheduled_at in DB is now",
        data[0]?.delete_scheduled_at
      );
  };

  const cancelDeleteRequest = async (id) => {
    const target = ledgers.find((l) => l.id === id);
    if (target?._syncing) {
      notify(
        "pending",
        "Still saving",
        "This ledger just finished being created — give it a second and try again.",
        ""
      );
      return;
    }
    setLedgers((p) =>
      p.map((l) =>
        l.id === id ? { ...l, deleteRequest: null, deleteScheduledAt: null } : l
      )
    );
    const { data, error } = await sb
      .from("ledgers")
      .update({ delete_request: null, delete_scheduled_at: null })
      .eq("id", id)
      .select();
    if (error) console.error("cancelDeleteRequest: update failed", error);
    else if (!data || data.length === 0)
      console.error(
        "cancelDeleteRequest: update matched 0 rows — check RLS policy on ledgers UPDATE for id",
        id
      );
    else console.log("cancelDeleteRequest: saved OK", data[0]);
  };
  // perform the actual deletion: keep archive copies for members who chose 'archive'
  const executeDelete = async (id) => {
    const target = ledgers.find((l) => l.id === id);
    if (!target) return;
    const name = target.name || "Ledger";
    const choices = target.deleteRequest?.copyChoices || {};
    const keepers = target.members.filter(
      (m) => m.user_id && choices[m.id] === "archive"
    );
    const keptCopies = keepers.map((m) => ({
      ...target,
      id: `l${Date.now()}_${m.id}`,
      archived: true,
      archived_at: now(),
      archived_from: target.id,
      owner_id: m.user_id,
      deleteRequest: null,
      deleteScheduledAt: null,
    }));
    setLedgers((p) => [...p.filter((l) => l.id !== id), ...keptCopies]);
    notify(
      "locked",
      "Ledger deleted",
      `"${name}" has been permanently deleted.`,
      name
    );
    setActiveLedgerId(null);
    setPage("home");
    if (ENV === "production") {
      for (const m of keepers) {
        await persistArchivedLedgerCopy(sb, target, m.user_id);
      }
      await deleteLedgerEverywhere(sb, id);
    }
  };
  const archiveLedger = async (id) => {
    const target = ledgers.find((l) => l.id === id);
    if (!target) return;
    const realMembers = target.members.filter((m) => m.user_id);
    const localCopies = realMembers.map((m) => ({
      ...target,
      id: `l${Date.now()}_${m.id}`,
      archived: true,
      archived_at: now(),
      archived_from: target.id,
      owner_id: m.user_id,
      deleteRequest: null,
    }));
    setLedgers((p) => [...p.filter((l) => l.id !== id), ...localCopies]);
    setActiveLedgerId(null);
    setPage("home");
    notify(
      "locked",
      "Ledger archived",
      `"${target.name}" was archived. Every member got their own independent copy.`,
      target.name
    );
    if (ENV === "production") {
      for (const m of realMembers) {
        await persistArchivedLedgerCopy(sb, target, m.user_id);
      }
      await deleteLedgerEverywhere(sb, id);
    }
  };
  const deleteMyArchiveCopy = async (id) => {
    // Deletes ONLY the current user's copy. In the DB, each member has their own
    // row keyed by owner_id; this removes the row where owner_id === current user.
    // Other members' copies are untouched.
    setLedgers((p) =>
      p.filter((l) => !(l.id === id && l.owner_id === user.id))
    );
    setActiveLedgerId(null);
    setPage("home");
    if (ENV === "production") {
      await deleteLedgerEverywhere(sb, id);
    }
  };
  const startFreshLedger = (src) => {
    const fresh = {
      id: `l${Date.now()}`,
      name: src.name,
      cover: src.cover || "house",
      require_approval: src.require_approval,
      notifications_enabled: src.notifications_enabled,
      members: src.members.map((m) => ({
        ...m,
        joined_date: now(),
        share_history: [],
      })),
      expenses: [],
      lockedMonths: {},
      archived: false,
    };
    setLedgers((p) => [...p, fresh]);
    setActiveLedgerId(fresh.id);
    setPage("home");
  };
  const activeLedger = ledgers.find((l) => l.id === activeLedgerId) || null;
  const IconUsers = () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );

  return (
    <div className="app">
      <div className="layout">
        <aside className="sidebar">
          <div
            className="sidebar-logo"
            style={{
              padding: "4px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <img
              src={LOGO_SIDEBAR}
              alt="CosTrace"
              style={{ height: "56px", objectFit: "contain" }}
            />
            {ENV === "development" && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: "9px",
                  fontWeight: "800",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  background: "#f59e0b",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  alignSelf: "flex-start",
                }}
              >
                development
              </span>
            )}
          </div>
          <nav className="sidebar-nav">
            <button
              className={`nav-item${
                page === "home" && !activeLedger ? " active" : ""
              }`}
              onClick={() => {
                setActiveLedgerId(null);
                setPage("home");
              }}
            >
              <Icon.Home /> Dashboard
            </button>
            <button
              className="nav-item"
              onClick={() => setShowNew(true)}
              style={{ marginTop: "2px" }}
            >
              <Icon.Plus /> New ledger
            </button>
            <button
              className={`nav-item${page === "connections" ? " active" : ""}`}
              onClick={() => {
                setActiveLedgerId(null);
                setPage("connections");
              }}
            >
              <IconUsers /> Network
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div
              className="sidebar-user"
              style={{ cursor: "pointer" }}
              onClick={() => setShowProfile(true)}
            >
              {withPlanDot(
                user.avatar && AVATARS.find((a) => a.id === user.avatar) ? (
                  <img
                    src={AVATARS.find((a) => a.id === user.avatar).src}
                    alt=""
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      objectFit: "contain",
                      background: "white",
                    }}
                  />
                ) : (
                  <div className="user-avatar">{initials(user.full_name)}</div>
                ),
                user.plan
              )}
              <div className="user-info">
                <div className="user-name">{user.full_name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            <button className="nav-item" onClick={() => setShowFeedback(true)}>
              <Icon.MessageSquare /> Feedback
            </button>
            <button
              className="nav-item"
              onClick={async () => {
                await sb.auth.signOut();
                setUser(null);
                setLedgers([]);
              }}
              style={{ color: "rgba(255,120,100,0.8)" }}
            >
              <Icon.LogOut /> Sign out
            </button>
          </div>
        </aside>
        <main className="main-content">
          {activeLedger ? (
            <LedgerDetail
              ledger={activeLedger}
              currentUser={user}
              onBack={onCloseLedger}
              onUpdate={updateLedger}
              onNotify={notify}
              onArchive={archiveLedger}
              onStartFresh={startFreshLedger}
              onDeleteCopy={deleteMyArchiveCopy}
              onRequestDelete={requestDelete}
              onRespondDelete={respondDelete}
              onCancelDeleteRequest={cancelDeleteRequest}
              onExecuteDelete={executeDelete}
              isSoloDeletable={isSoloDeletable}
              currency={currency}
              userPlan={userPlan}
              onShowUpgrade={() => setShowUpgrade(true)}
              seenExpenses={seenMap[activeLedgerId] || new Set()}
              overLedgerLimit={overLedgerLimit}
              overParticipantLimit={overParticipantLimit}
              onLeave={leaveledger}
              allLedgers={ledgers}
            />
          ) : page === "connections" ? (
            <NetworkPage
              ledgers={ledgers}
              currentUser={user}
              onCreateLedgerWith={(person) => {
                setPrefillMember(
                  typeof person === "string" ? person : person.name
                );
                setShowNew(true);
                setPage("home");
              }}
            />
          ) : page === "stats" ? (
            <StatsPage ledgers={ledgers} currentUser={user} />
          ) : ledgers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h2>No ledgers yet</h2>
              <p>
                Create your first shared ledger to start tracking expenses
                fairly.
              </p>
              <button
                className="btn btn-primary"
                style={{ fontSize: "14px", padding: "12px 24px" }}
                onClick={() => setShowNew(true)}
              >
                <Icon.Plus /> Create first ledger
              </button>
            </div>
          ) : (
            <Dashboard
              ledgers={ledgers}
              currentUser={user}
              onSelectLedger={onOpenLedger}
              onNewLedger={() => setShowNew(true)}
              onOpenProfile={() => setShowProfile(true)}
              onCancelDelete={() =>
                setUser((u) => ({ ...u, deleteScheduled: null }))
              }
              userPlan={userPlan}
              noAds={noAds}
              onShowUpgrade={() => setShowUpgrade(true)}
              onUpdateLedger={updateLedger}
              getLedgerNewCount={getLedgerNewCount}
              onRemoveAds={handleRemoveAds}
              overLedgerLimit={overLedgerLimit}
              overParticipantLimit={overParticipantLimit}
              overParticipantCount={overParticipantCount}
              participantLedgers={participantLedgers}
            />
          )}
        </main>
      </div>
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-item${
            page === "home" && !activeLedger ? " active" : ""
          }`}
          onClick={() => {
            setActiveLedgerId(null);
            setPage("home");
          }}
        >
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <span>Home</span>
        </button>
        <button className="mobile-nav-item" onClick={() => setShowNew(true)}>
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <span>New</span>
        </button>
        <button
          className={`mobile-nav-item${
            page === "connections" ? " active" : ""
          }`}
          onClick={() => {
            setActiveLedgerId(null);
            setPage("connections");
          }}
        >
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
              <circle cx="18" cy="8" r="2.5" />
              <path d="M22 20c0-2.5-1.8-4.5-4-5" />
            </svg>
          </div>
          <span>Network</span>
        </button>
        <button
          className={`mobile-nav-item${
            page === "stats" ? " active" : ""
          }`}
          onClick={() => {
            setActiveLedgerId(null);
            setPage("stats");
          }}
        >
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="20" x2="5" y2="12" />
              <line x1="12" y1="20" x2="12" y2="6" />
              <line x1="19" y1="20" x2="19" y2="14" />
            </svg>
          </div>
          <span>Stats</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => setShowFeedback(true)}
        >
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <span>Feedback</span>
        </button>
        <button
          className="mobile-nav-item"
          onClick={() => setShowProfile(true)}
        >
          <div className="nav-icon">
            {withPlanDot(
              user.avatar && AVATARS.find((a) => a.id === user.avatar) ? (
                <img
                  src={AVATARS.find((a) => a.id === user.avatar).src}
                  alt=""
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#465A78,#5B6C8F)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: "800",
                  }}
                >
                  {initials(user.full_name)}
                </div>
              ),
              user.plan
            )}
          </div>
          <span>Me</span>
        </button>
      </nav>
      {showNew && (
        <NewLedgerModal
          onClose={() => {
            setShowNew(false);
            setPrefillMember(null);
          }}
          onCreate={createLedger}
          currentUser={user}
          prefillMember={prefillMember}
          networkPeople={(() => {
            const p = {};
            ledgers.forEach((l) =>
              l.members
                .filter((m) => m.user_id !== user.id)
                .forEach((m) => {
                  if (!p[m.display_name])
                    p[m.display_name] = {
                      name: m.display_name,
                      email: m.invited_email || null,
                      avatar: m.avatar || null,
                      user_id: m.user_id || null,
                      plan: m.plan || "free",
                    };
                })
            );
            return Object.values(p);
          })()}
        />
      )}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={(u) => {
            setUser(u);
            // Sync display_name + avatar in all ledgers where this user is a member
            setLedgers((prev) =>
              prev.map((l) => ({
                ...l,
                members: l.members.map((m) =>
                  m.user_id === u.id
                    ? {
                        ...m,
                        display_name: u.full_name || m.display_name,
                        avatar: u.avatar || null,
                      }
                    : m
                ),
              }))
            );
          }}
          onLogout={() => {
            sb.auth.signOut();
            setUser(null);
            setLedgers([]);
          }}
          onDelete={() => setUser(null)}
          currency={currency}
          onCurrencyChange={setCurrency}
          currencies={CURRENCIES}
          userPlan={userPlan}
          onShowUpgrade={() => setShowUpgrade(true)}
        />
      )}
      {showUpgrade && (
        <UpgradeModal
          currentPlan={userPlan.id}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={handleUpgrade}
          noAds={noAds}
          onRemoveAds={handleRemoveAds}
          payoutPass={user?.payoutPass || userPlan.id === "gold"}
          onBuyPayoutPass={handleBuyPayoutPass}
          ledgers={ledgers}
          currentUser={user}
        />
      )}
      {pendingJoin && user && (
        <JoinLedgerModal
          ledgerId={pendingJoin}
          currentUser={user}
          onClose={() => {
            setPendingJoin(null);
            window.history.replaceState({}, "", window.location.pathname);
          }}
          onJoined={async () => {
            setPendingJoin(null);
            window.history.replaceState({}, "", window.location.pathname);
            await loadLedgers(user.id);
          }}
        />
      )}
      {showFeedback && (
        <FeedbackModal
          currentUser={user}
          onClose={() => setShowFeedback(false)}
        />
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {showExpiryWarning && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            background: "#1e1b4b",
            color: "white",
            borderRadius: "12px",
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: "700",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            whiteSpace: "nowrap",
          }}
        >
          ⚠ Your {PLANS[user.plan]?.name} plan expires in {daysLeft} day
          {daysLeft !== 1 ? "s" : ""}
          <button
            onClick={() => setShowUpgrade(true)}
            style={{
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: "800",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Renew
          </button>
        </div>
      )}
    </div>
  );
}
