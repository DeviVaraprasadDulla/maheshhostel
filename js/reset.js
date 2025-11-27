// js/reset.js
// Uses existing apiFetch implementation. Public endpoint => auth: false
import { apiFetch } from "./api.js";

const form = document.getElementById("resetForm");
const usernameInput = document.getElementById("username");
const otpInput = document.getElementById("otp");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm_password");

const usernameError = document.getElementById("usernameError");
const otpError = document.getElementById("otpError");
const passwordError = document.getElementById("passwordError");
const confirmError = document.getElementById("confirmError");

const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

const formMsg = document.getElementById("formMsg");

const successModal = document.getElementById("successModal");
const closeModal = document.getElementById("closeModal");
const goLogin = document.getElementById("goLogin");

const toastWrap = document.getElementById("toastWrap");

// small toast helper (same pattern used elsewhere)
function showToast(text, { type = "success", duration = 3000 } = {}) {
  const t = document.createElement("div");
  t.className = "toast";
  if (type === "error") t.classList.add("error");
  t.textContent = text;
  toastWrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity 220ms";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 260);
  }, duration);
}

// spinner
function setLoading(loading = true) {
  submitBtn.disabled = loading;
  btnSpinner.hidden = !loading;
  btnText.textContent = loading ? "Resetting..." : "Reset Password";
}

// validation helpers
function clearErrors() {
  usernameError.textContent = "";
  otpError.textContent = "";
  passwordError.textContent = "";
  confirmError.textContent = "";
  formMsg.hidden = true;
  formMsg.textContent = "";
}

// basic password strength check (0..3)
function passwordStrength(pw) {
  let score = 0;
  if (!pw || pw.length < 8) return 0;
  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3);
}

// update UI strength bars
function renderPwStrength(pw) {
  const s = passwordStrength(pw);
  const bars = [
    document.getElementById("pwBar1"),
    document.getElementById("pwBar2"),
    document.getElementById("pwBar3"),
  ];
  bars.forEach((b, i) => {
    if (!b) return;
    if (i < s) b.classList.add("active");
    else b.classList.remove("active");
  });
}

passwordInput.addEventListener("input", (e) => {
  renderPwStrength(e.target.value);
  passwordError.textContent = "";
  confirmError.textContent = "";
});

// prefill username if query param ?u= exists
(function prefillFromQuery() {
  try {
    const q = new URLSearchParams(location.search);
    const u = q.get("u");
    if (u && usernameInput) usernameInput.value = decodeURIComponent(u);
  } catch (e) {}
})();

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  clearErrors();

  const username = (usernameInput.value || "").trim();
  const otp = (otpInput.value || "").trim();
  const pw = passwordInput.value || "";
  const cpw = confirmInput.value || "";

  // basic validation
  if (!username) {
    usernameError.textContent =
      "Please enter your username or registered email.";
    return;
  }
  if (!otp) {
    otpError.textContent = "Please enter the OTP sent to your email.";
    return;
  }
  if (!pw || pw.length < 8) {
    passwordError.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (pw !== cpw) {
    confirmError.textContent = "Passwords do not match.";
    return;
  }

  setLoading(true);

  try {
    // call backend reset endpoint (public)
    const res = await apiFetch("/reset-password/", {
      method: "POST",
      body: { username, otp, password: pw },
      auth: false,
    });

    // success expected
    const successMessage = res?.message || "Password updated successfully.";
    document.getElementById("successText").textContent = successMessage;
    successModal.hidden = false;
    showToast("Password reset successful. Please login.", {
      type: "success",
      duration: 3000,
    });
    form.reset();
    renderPwStrength("");
  } catch (err) {
    console.error("Reset error:", err);
    const text = err?.data?.message || err?.message || "Reset failed.";
    formMsg.hidden = false;
    formMsg.className = "alert";
    formMsg.textContent = text;
    showToast(text, { type: "error", duration: 4000 });
  } finally {
    setLoading(false);
  }
});

if (closeModal)
  closeModal.addEventListener("click", () => (successModal.hidden = true));
if (successModal)
  successModal.addEventListener("click", (ev) => {
    if (ev.target === successModal) successModal.hidden = true;
  });

// UX: clear errors when user types
[usernameInput, otpInput, passwordInput, confirmInput].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => {
    clearErrors();
  });
});
