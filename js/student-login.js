// js/student-login.js
import { apiFetch } from "./api.js";
import { saveTokens } from "./auth.js";

const form = document.getElementById("loginForm");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const rememberEl = document.getElementById("remember");
const submitBtn = document.getElementById("submitBtn");
const btnLabel = document.getElementById("btnLabel");
const btnSpinner = document.getElementById("btnSpinner");
const toast = document.getElementById("toast");
const msg = document.getElementById("msg");

// unified modal
const resultModal = document.getElementById("resultModal");
const modalCard = resultModal?.querySelector(".modal-card");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalOk = document.getElementById("modalOk");

const pwToggle = document.getElementById("pwToggle");

const $ = (id) => document.getElementById(id);
const sanitize = (s) => String(s || "").trim();

function showToast(text, ms = 3500, type = "error") {
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  toast.classList.remove("success", "error");
  toast.classList.add(type === "success" ? "success" : "error");
  setTimeout(() => {
    toast.hidden = true;
    toast.classList.remove("success", "error");
  }, ms);
}

function setError(id, text) {
  const el = $(`err_${id}`);
  const input = $(id);
  if (el) el.textContent = text || "";
  if (input) {
    if (text) input.classList.add("invalid");
    else input.classList.remove("invalid");
  }
}

function validateUsername() {
  const v = sanitize(usernameEl.value);
  setError("username", v ? "" : "Username required.");
  return !!v;
}
function validatePassword() {
  const v = passwordEl.value || "";
  setError("password", v ? "" : "Password required.");
  return !!v;
}

usernameEl.addEventListener("input", validateUsername);
passwordEl.addEventListener("input", validatePassword);

function showButtonLoading(on) {
  submitBtn.disabled = on;
  usernameEl.disabled = on;
  passwordEl.disabled = on;
  rememberEl.disabled = on;
  if (on) {
    // show spinner element inside button
    btnSpinner.hidden = false;
    // ensure spinner DOM has inner span for three-dot animation
    if (!btnSpinner.querySelector("span")) {
      btnSpinner.appendChild(document.createElement("span"));
    }
    btnLabel.textContent = "Signing in...";
  } else {
    btnSpinner.hidden = true;
    btnLabel.textContent = "Sign In";
  }
}

/* password toggle */
pwToggle?.addEventListener("click", () => {
  if (!passwordEl) return;
  const type =
    passwordEl.getAttribute("type") === "password" ? "text" : "password";
  passwordEl.setAttribute("type", type);
  pwToggle.textContent = type === "password" ? "👁" : "🙈";
});

/* modal helpers */
function openModal({ title = "", body = "", type = "error" }) {
  if (!resultModal) return;
  modalTitle.textContent = title;
  modalBody.textContent = body;
  // set classes for card
  modalCard.classList.remove("error", "success");
  modalCard.classList.add(type === "success" ? "success" : "error");
  // set icon text (simple)
  modalIcon.textContent = type === "success" ? "✓" : "!";
  resultModal.hidden = false;
  // focus OK for accessibility
  modalOk.focus();
}
function closeModal() {
  if (!resultModal) return;
  resultModal.hidden = true;
}
modalOk?.addEventListener("click", closeModal);
resultModal?.addEventListener("click", (ev) => {
  if (ev.target === resultModal) closeModal();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && resultModal && !resultModal.hidden) closeModal();
});

/* inline message helper */
function showInlineMessage(text, type = "error") {
  if (!msg) return;
  msg.innerHTML = "";
  const div = document.createElement("div");
  div.className = `alert ${type === "success" ? "success" : "error"}`;
  div.textContent = text;
  msg.appendChild(div);
}

/* submit */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showInlineMessage("", "error");
  if (!validateUsername() || !validatePassword()) {
    showToast("Fix validation errors and try again.");
    return;
  }
  showButtonLoading(true);

  const payload = {
    username: sanitize(usernameEl.value),
    password: passwordEl.value,
  };

  try {
    const data = await apiFetch("/login/", {
      method: "POST",
      body: payload,
      auth: false,
    });

    // expected: { message, role, access, refresh }
    const message = (data && (data.message || data.msg)) || "Login successful";
    const role = (data && data.role) || "";
    const access = (data && (data.access || data.token)) || null;
    const refresh = (data && data.refresh) || null;

    if (!access) {
      // show modal error
      openModal({
        title: "Login Error",
        body: "Server did not return access token.",
        type: "error",
      });
      showButtonLoading(false);
      return;
    }

    const persistent = !!rememberEl?.checked;
    saveTokens({ access, refresh, role, persistent });

    // show success modal (same style as signup success)
    openModal({
      title: "Login Successful",
      body: message || "Welcome — redirecting to dashboard.",
      type: "success",
    });
    showInlineMessage(message || "Login successful", "success");
    showToast("Login successful", 1400, "success");

    // redirect after short delay
    setTimeout(() => {
      if (role === "student") window.location.href = "student-dashboard.html";
      else window.location.href = "index.html";
    }, 900);
  } catch (err) {
    const text =
      err?.data?.message ||
      err?.data ||
      err.message ||
      "Invalid username or password";
    // show modal error with server message
    openModal({
      title: "Login Failed",
      body: typeof text === "string" ? text : "Invalid username or password",
      type: "error",
    });
    showInlineMessage(
      typeof text === "string" ? text : "Invalid username or password",
      "error"
    );
    showToast(typeof text === "string" ? text : "Login failed", 3500, "error");
    showButtonLoading(false);
  }
});
