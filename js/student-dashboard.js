// js/student-dashboard.js
// Student dashboard script (profile + server-backed QR token).
// Requires: apiFetch (js/api.js) and auth helpers (js/auth.js).
// Optional: QRCode lib for client-side QR generation (https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js)

import { apiFetch } from "./api.js";
import { clearAuth, getRole } from "./auth.js";

/* ----------------- Helpers ----------------- */
const $ = (id) => document.getElementById(id);
const safeText = (v) =>
  v === null || typeof v === "undefined" ? "" : String(v);

/* UI elements (must match student-dashboard.html) */
const loadingEl = $("loading");
const errorEl = $("error");
const dashboardEl = $("dashboard");

const photoWrap = $("photoWrap");
const studentPhoto = $("studentPhoto");
const studentName = $("studentName");
const studentEt = $("studentEt");
const verifiedBadge = $("verifiedBadge");

const studentEmail = $("studentEmail");
const studentPhone = $("studentPhone");
const fatherName = $("fatherName");
const fatherPhone = $("fatherPhone");
const roomType = $("roomType");
const utrNumber = $("utrNumber");
const feesPaid = $("feesPaid");
const pendingFee = $("pendingFee");
const noticesEl = $("notices");

const qrTokenEl = $("qrToken");
const qrDateEl = $("qrDate");
const copyQrBtn = $("copyQrBtn");
const viewQrBtn = $("viewQrBtn");

const qrModal = $("qrModal");
const qrImage = $("qrImage");
const qrModalToken = $("qrModalToken");
const qrClose = $("qrClose");
const qrCopy2 = $("qrCopy2");
let qrDownload = $("qrDownload");

const refreshBtn = $("refreshBtn");
const logoutBtn = $("logoutBtn");

/* ----------------- Small UI utilities ----------------- */
function showToast(text, { type = "info", duration = 3000 } = {}) {
  const t = document.createElement("div");
  t.className = "toast";
  if (type === "success") t.classList.add("success");
  if (type === "error") t.classList.add("error");
  t.textContent = text;

  // entry animation
  t.style.opacity = "0";
  t.style.transform = "translateY(8px)";
  document.body.appendChild(t);
  // force reflow
  // eslint-disable-next-line no-unused-expressions
  t.offsetHeight;
  t.style.transition = "opacity 260ms ease, transform 260ms ease";
  t.style.opacity = "1";
  t.style.transform = "translateY(0)";

  const timeout = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => {
      if (t && t.parentNode) t.parentNode.removeChild(t);
    }, 260);
  }, Math.max(1000, duration));

  t.addEventListener("click", () => {
    clearTimeout(timeout);
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => {
      if (t && t.parentNode) t.parentNode.removeChild(t);
    }, 260);
  });
}

function showLoading() {
  if (loadingEl) loadingEl.style.display = "block";
  if (errorEl) errorEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "none";
}
function showError(msg) {
  if (errorEl) {
    errorEl.style.display = "block";
    errorEl.textContent = safeText(msg);
  }
  if (loadingEl) loadingEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "none";
}
function showDashboard() {
  if (loadingEl) loadingEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "block";
}

/* ----------------- Renderers ----------------- */
function renderProfile(data = {}) {
  const name = safeText(data.student_name || data.name || "");
  const et = safeText(data.et_number || "");
  const email = safeText(data.student_email || "");
  const phone = safeText(data.student_phone_number || "");
  const father = safeText(data.father_name || "");
  const father_phone = safeText(data.father_phone_number || "");
  const room = safeText(data.room_type || "");
  const utr = safeText(data.utr_number || "");
  const fees = data.fees_paid ?? data.fees ?? "0.00";
  const pending = data.pending_fee ?? data.pending ?? "0.00";
  const verified =
    typeof data.is_verified !== "undefined" ? !!data.is_verified : null;
  const imageUrl = data.student_image || data.photo || data.image || null;

  if (studentName) studentName.textContent = name || "Student";
  if (studentEt) studentEt.textContent = et ? `ET: ${et}` : "";
  if (studentEmail) studentEmail.textContent = email || "—";
  if (studentPhone) studentPhone.textContent = phone || "—";
  if (fatherName) fatherName.textContent = father || "—";
  if (fatherPhone) fatherPhone.textContent = father_phone || "—";
  if (roomType) roomType.textContent = room || "—";
  if (utrNumber) utrNumber.textContent = utr || "—";
  if (feesPaid)
    feesPaid.textContent =
      typeof fees === "number" ? fees.toFixed(2) : String(fees);
  if (pendingFee)
    pendingFee.textContent =
      typeof pending === "number" ? pending.toFixed(2) : String(pending);

  if (verifiedBadge) {
    if (verified === true) {
      verifiedBadge.textContent = "Verified";
      verifiedBadge.style.display = "inline-block";
      verifiedBadge.style.background = "#ecfdf5";
      verifiedBadge.style.color = "#059669";
      verifiedBadge.style.border = "1px solid rgba(16,185,129,0.07)";
    } else if (verified === false) {
      verifiedBadge.textContent = "Pending";
      verifiedBadge.style.display = "inline-block";
      verifiedBadge.style.background = "#fff7ed";
      verifiedBadge.style.color = "#92400e";
      verifiedBadge.style.border = "1px solid rgba(245,158,11,0.06)";
    } else {
      verifiedBadge.style.display = "none";
    }
  }

  // photo fallback to initials
  if (photoWrap && studentPhoto) {
    const existingInitials = photoWrap.querySelector(".initials");
    if (imageUrl) {
      if (existingInitials) existingInitials.remove();
      studentPhoto.style.display = "block";
      studentPhoto.src = imageUrl; 
      console.log(imageUrl);
      studentPhoto.alt = `${name}'s photo`;
    } else {
      studentPhoto.style.display = "none";
      let initialsDiv = photoWrap.querySelector(".initials");
      if (!initialsDiv) {
        initialsDiv = document.createElement("div");
        initialsDiv.className = "initials";
        initialsDiv.style.cssText =
          "width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted);background:#f3f4f6;";
        photoWrap.appendChild(initialsDiv);
      }
      const initials = (name || "S")
        .split(" ")
        .map((p) => (p ? p[0] : ""))
        .slice(0, 2)
        .join("")
        .toUpperCase();
      initialsDiv.textContent = initials;
    }
  }
}

function renderNotices(notices) {
  if (!noticesEl) return;
  noticesEl.innerHTML = "";
  if (!notices || (Array.isArray(notices) && notices.length === 0)) {
    const li = document.createElement("li");
    li.textContent = "No notices available.";
    noticesEl.appendChild(li);
    return;
  }
  if (Array.isArray(notices)) {
    notices.forEach((n) => {
      const li = document.createElement("li");
      li.textContent =
        typeof n === "string" ? n : n.message || JSON.stringify(n);
      noticesEl.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent =
      typeof notices === "string" ? notices : JSON.stringify(notices);
    noticesEl.appendChild(li);
  }
}

/* ----------------- QR helpers (server-backed token -> client QR) ----------------- */

/**
 * Render QR using QRCode lib if available, otherwise fallback to qrserver API.
 * token: string; date: string (YYYY-MM-DD)
 */
async function renderQrInModal(token, date) {
  if (!qrImage) return;

  if (!token) {
    qrImage.src = "";
    qrImage.alt = "No QR available";
    return;
  }

  // choose size: responsive but constrained
  const size = Math.min(
    640,
    Math.max(300, Math.round(window.innerWidth * 0.45))
  );

  try {
    // prefer in-browser QR generation (no external network)
    if (typeof QRCode !== "undefined" && QRCode.toDataURL) {
      const dataUrl = await QRCode.toDataURL(token, {
        width: size,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      qrImage.src = dataUrl;
      qrImage.alt = `QR code (${date || "today"})`;

      // download link: use the same data URL
      if (qrDownload) {
        const newLink = qrDownload.cloneNode(true);
        qrDownload.parentNode.replaceChild(newLink, qrDownload);
        qrDownload = newLink;
        qrDownload.addEventListener(
          "click",
          (ev) => {
            ev.preventDefault();
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `qr-${
              date || new Date().toISOString().slice(0, 10)
            }.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          },
          { once: true }
        );
      }
      return;
    }

    // fallback: use external service (qrserver) if no QR lib available
    const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      token
    )}`;
    qrImage.src = fallback;
    qrImage.alt = `QR code (${date || "today"})`;

    if (qrDownload) {
      const newLink = qrDownload.cloneNode(true);
      qrDownload.parentNode.replaceChild(newLink, qrDownload);
      qrDownload = newLink;
      qrDownload.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          window.open(fallback, "_blank");
        },
        { once: true }
      );
    }
  } catch (e) {
    console.error("QR generation failed:", e);
    showToast("Could not generate QR (client). Using fallback.", {
      type: "error",
      duration: 3000,
    });
    const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      token
    )}`;
    qrImage.src = fallback;
    qrImage.alt = `QR code (${date || "today"})`;
  }
}

async function copyToClipboard(text) {
  try {
    if (!text) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  } catch (e) {
    console.warn("copy failed:", e);
    return false;
  }
}

/* ----------------- API calls ----------------- */
async function safeFetchJson(path, opts = {}) {
  try {
    return await apiFetch(path, opts);
  } catch (e) {
    throw e;
  }
}

/* Fetch profile (dashboard) */
async function fetchProfile() {
  showLoading();
  try {
    const data = await safeFetchJson("/dashboard/", { method: "GET" });
    if (!data) throw new Error("No dashboard data returned");
    renderProfile(data);
    renderNotices(data.notices || data.messages || []);
    showDashboard();
    return data;
  } catch (err) {
    if (err && err.status === 401) {
      try {
        clearAuth();
      } catch (e) {}
      window.location.href = "student-login.html";
      return;
    }
    const message =
      err?.data?.message || err?.message || "Failed to load dashboard";
    console.error("Profile fetch error:", err);
    showError(message);
    showToast(message, { type: "error", duration: 3500 });  
  }
}

/* Fetch server QR token and render QR (production: prefer server-issued token) */
async function fetchQrFromServerAndRender(profileData = null) {
  showToast("Fetching your QR token...", { type: "info", duration: 1200 });
  try {
    // server endpoint returns { qr_token, date }
    const data = await safeFetchJson("/student/qr", { method: "GET" });
    if (!data || !data.qr_token) {
      // server didn't give a token -> show error (in production we should not fallback silently)
      showToast("QR token not provided by server.", {
        type: "error",
        duration: 4000,
      });
      if (qrTokenEl) qrTokenEl.textContent = "—";
      if (qrDateEl) qrDateEl.textContent = "Date: —";
      if (qrImage) qrImage.src = "";
      if (qrModalToken) qrModalToken.textContent = "";
      return;
    }

    const token = data.qr_token;
    const date = data.date || new Date().toISOString().slice(0, 10);

    if (qrTokenEl) qrTokenEl.textContent = token;
    if (qrDateEl) qrDateEl.textContent = `Date: ${date}`;
    if (qrModalToken) qrModalToken.textContent = token;

    // generate client-side QR image from server token
    await renderQrInModal(token, date);
    showToast("QR token loaded.", { type: "success", duration: 1200 });
  } catch (err) {
    if (err && err.status === 401) {
      // unauthorized: clear and redirect to login
      try {
        clearAuth();
      } catch (e) {}
      window.location.href = "student-login.html";
      return;
    }
    console.error("fetchQrAndRender error:", err);
    showToast("Failed to fetch QR token from server.", {
      type: "error",
      duration: 3500,
    });
  }
}

/* ----------------- Events ----------------- */
if (copyQrBtn) {
  copyQrBtn.addEventListener("click", async () => {
    const token = qrTokenEl ? qrTokenEl.textContent : "";
    if (!token || token === "—") {
      showToast("QR token not available yet.", {
        type: "error",
        duration: 2200,
      });
      return;
    }
    const ok = await copyToClipboard(token);
    if (ok)
      showToast("QR token copied to clipboard.", {
        type: "success",
        duration: 1800,
      });
    else
      showToast("Copy failed — please select and copy manually.", {
        type: "error",
        duration: 2600,
      });
  });
}

if (viewQrBtn) {
  viewQrBtn.addEventListener("click", () => {
    const token = qrTokenEl ? qrTokenEl.textContent : "";
    if (!token || token === "—") {
      showToast("QR token not available yet.", {
        type: "error",
        duration: 2000,
      });
      return;
    }
    if (qrModal) qrModal.hidden = false;
    if (qrClose) qrClose.focus();
  });
}

if (qrClose)
  qrClose.addEventListener("click", () => {
    if (qrModal) qrModal.hidden = true;
  });

if (qrCopy2)
  qrCopy2.addEventListener("click", async () => {
    const token = qrModalToken ? qrModalToken.textContent : "";
    if (!token) return;
    const ok = await copyToClipboard(token);
    if (ok) showToast("QR token copied.", { type: "success", duration: 1500 });
    else showToast("Copy failed.", { type: "error", duration: 1800 });
  });

if (qrModal) {
  qrModal.addEventListener("click", (ev) => {
    if (ev.target === qrModal) qrModal.hidden = true;
  });
}

if (refreshBtn)
  refreshBtn.addEventListener("click", async () => {
    const profile = await fetchProfile();
    await fetchQrFromServerAndRender(profile);
  });

if (logoutBtn)
  logoutBtn.addEventListener("click", () => {
    try {
      clearAuth();
    } catch (e) {}
    window.location.href = "student-login.html";
  });

/* ----------------- Init ----------------- */
(async function init() {
  try {
    // optional guard by role
    try {
      const role = getRole ? getRole() : null;
      if (role && role !== "student") {
        clearAuth();
        window.location.href = "student-login.html";
        return;
      }
    } catch (e) {
      /* ignore */
    }

    const profile = await fetchProfile();
    // fetch server-issued QR token and render
    await fetchQrFromServerAndRender(profile);
  } catch (e) {
    console.error("Dashboard init error:", e);
    showToast("Dashboard initialization failed.", {
      type: "error",
      duration: 3000,
    });
  }
})();
