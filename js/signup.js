// js/signup.js
// Mobile-first signup logic with your compressor preserved
import { apiFetch } from "./api.js";

/* Elements */
const form = document.getElementById("signupForm");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const previewContainer = document.getElementById("previewContainer");
const previewImage = document.getElementById("previewImage");
const msg = document.getElementById("msg");
const successModal = document.getElementById("successModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalLoginBtn = document.getElementById("modalLoginBtn");

const MAX_FILE_BYTES = 10_485_760; // 10 MB
let currentPreviewUrl = null;

/* helpers */
const $ = (id) => document.getElementById(id);
const sanitize = (s) => String(s || "").trim();
const showToast = (text, ms = 4000, type = "error") => {
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  toast.classList.remove("success", "error");
  toast.classList.add(type === "success" ? "success" : "error");
  setTimeout(() => {
    toast.hidden = true;
    toast.classList.remove("success", "error");
  }, ms);
};
const setError = (id, text) => {
  const el = $(`err_${id}`);
  const input = $(id);
  if (el) el.textContent = text || "";
  if (input) {
    if (text) input.classList.add("invalid");
    else input.classList.remove("invalid");
  }
};
const clearInlineMsg = () => {
  if (msg) msg.innerHTML = "";
};

/* --- your compressor (kept exactly, with small guard) --- */
function compressImage(file, quality = 0.7, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = maxWidth / img.width;
          canvas.width = img.width > maxWidth ? maxWidth : img.width;
          canvas.height =
            img.width > maxWidth ? img.height * scale : img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Compression failed (no blob)"));
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    } catch (e) {
      reject(e);
    }
  });
}

/* --- validation --- */
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}
function isValidPhone(phone) {
  return /^\d{7,15}$/.test(phone);
}
function isValidET(et) {
  return /^ET\d{4,8}$/i.test(et);
}
function isStrongPassword(pw) {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(pw);
}
function isValidMoney(v) {
  return /^\d+(\.\d{1,2})?$/.test(String(v));
}

function validateFirstName() {
  const v = sanitize($("first_name").value);
  setError("first_name", v ? "" : "First name required.");
  return !!v;
}
function validateLastName() {
  const v = sanitize($("last_name").value);
  setError("last_name", v ? "" : "Last name required.");
  return !!v;
}
function validateEmail() {
  const v = sanitize($("student_email").value);
  if (!v) setError("student_email", "Email required.");
  else if (!isValidEmail(v)) setError("student_email", "Enter valid email.");
  else setError("student_email", "");
  return isValidEmail(v);
}
function validateStudentPhone() {
  const v = sanitize($("student_phone_number").value);
  if (!v) setError("student_phone_number", "Phone required.");
  else if (!isValidPhone(v))
    setError("student_phone_number", "Digits only (7-15).");
  else setError("student_phone_number", "");
  return isValidPhone(v);
}
function validateET() {
  const v = sanitize($("et_number").value);
  if (!v) setError("et_number", "ET required.");
  else if (!isValidET(v)) setError("et_number", "ET format like ET20250067.");
  else setError("et_number", "");
  return isValidET(v);
}
function validateFatherFirst() {
  const v = sanitize($("father_first_name").value);
  setError("father_first_name", v ? "" : "Father first name required.");
  return !!v;
}
function validateFatherLast() {
  const v = sanitize($("father_last_name").value);
  setError("father_last_name", v ? "" : "Father last name required.");
  return !!v;
}
function validateFatherPhone() {
  const v = sanitize($("father_phone_number").value);
  if (!v) setError("father_phone_number", "Phone required.");
  else if (!isValidPhone(v))
    setError("father_phone_number", "Digits only (7-15).");
  else setError("father_phone_number", "");
  return isValidPhone(v);
}
function validatePassword() {
  const v = $("password").value || "";
  if (!v) setError("password", "Password required.");
  else if (!isStrongPassword(v)) setError("password", "Password too weak.");
  else setError("password", "");
  const bars = document.querySelectorAll("#pwStrength .bar");
  if (bars) {
    const score =
      (v.length >= 8) + /[A-Z]/.test(v) + /[a-z]/.test(v) + /\d/.test(v);
    bars.forEach((b, i) => b.classList.toggle("active", i < score));
  }
  return isStrongPassword(v);
}
function validateConfirmPassword() {
  const v = $("confirm_password").value || "";
  const ok = v && v === $("password").value;
  setError("confirm_password", ok ? "" : "Passwords do not match.");
  return ok;
}
function validateRoomType() {
  const v = sanitize($("room_type").value);
  setError("room_type", v ? "" : "Room type required.");
  return !!v;
}
function validateFees() {
  const v = sanitize($("fees_paid").value);
  if (!v) setError("fees_paid", "Fees required.");
  else if (!isValidMoney(v))
    setError("fees_paid", "Invalid number (max 2 decimals).");
  else setError("fees_paid", "");
  return isValidMoney(v);
}
function validatePending() {
  const v = sanitize($("pending_fee").value);
  if (!v) setError("pending_fee", "Pending required.");
  else if (!isValidMoney(v))
    setError("pending_fee", "Invalid number (max 2 decimals).");
  else setError("pending_fee", "");
  return isValidMoney(v);
}
function validateUTR() {
  const v = sanitize($("utr_number").value);
  setError("utr_number", v ? "" : "UTR required.");
  return !!v;
}
function validateImage() {
  const f = $("student_image").files[0];
  if (!f) {
    setError("student_image", "Please select an image.");
    return false;
  }
  if (!f.type.startsWith("image/")) {
    setError("student_image", "Select a valid image file.");
    return false;
  }
  setError("student_image", "");
  return true;
}

/* wire inputs */
[
  "first_name",
  "last_name",
  "student_email",
  "student_phone_number",
  "et_number",
  "father_first_name",
  "father_last_name",
  "father_phone_number",
  "password",
  "confirm_password",
  "room_type",
  "fees_paid",
  "pending_fee",
  "utr_number",
].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", () => {
    switch (id) {
      case "first_name":
        validateFirstName();
        break;
      case "last_name":
        validateLastName();
        break;
      case "student_email":
        validateEmail();
        break;
      case "student_phone_number":
        validateStudentPhone();
        break;
      case "et_number":
        validateET();
        break;
      case "father_first_name":
        validateFatherFirst();
        break;
      case "father_last_name":
        validateFatherLast();
        break;
      case "father_phone_number":
        validateFatherPhone();
        break;
      case "password":
        validatePassword();
        validateConfirmPassword();
        break;
      case "confirm_password":
        validateConfirmPassword();
        break;
      case "room_type":
        validateRoomType();
        break;
      case "fees_paid":
        validateFees();
        break;
      case "pending_fee":
        validatePending();
        break;
      case "utr_number":
        validateUTR();
        break;
    }
    updateSubmitState();
  });
});

/* preview + file change */
$("student_image").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) {
    previewContainer.style.display = "none";
    updateSubmitState();
    return;
  }
  if (!f.type.startsWith("image/")) {
    setError("student_image", "Select an image file.");
    showToast("Select an image file.");
    e.target.value = "";
    previewContainer.style.display = "none";
    updateSubmitState();
    return;
  }
  if (f.size > MAX_FILE_BYTES) {
    showToast("Image is large — we'll try to compress before upload.", 4500);
  }
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  currentPreviewUrl = URL.createObjectURL(f);
  previewImage.src = currentPreviewUrl;
  previewContainer.style.display = "block";
  previewImage.onload = () => {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }
  };
  setError("student_image", "");
  updateSubmitState();
});

/* enable submit when valid */
function updateSubmitState() {
  const ok =
    validateFirstName() &&
    validateLastName() &&
    validateEmail() &&
    validateStudentPhone() &&
    validateET() &&
    validateFatherFirst() &&
    validateFatherLast() &&
    validateFatherPhone() &&
    validatePassword() &&
    validateConfirmPassword() &&
    validateRoomType() &&
    validateFees() &&
    validatePending() &&
    validateUTR() &&
    validateImage();
  submitBtn.disabled = !ok;
}

/* modal helpers */
function openSuccessModal(title, bodyText, username) {
  if (!successModal) return;
  modalTitle.textContent = title || "Signup Submitted";
  modalBody.innerHTML =
    bodyText + (username ? `<br><strong>Username:</strong> ${username}` : "");
  successModal.hidden = false;
  // trap focus (simple)
  modalCloseBtn.focus();
}
function closeSuccessModal() {
  if (!successModal) return;
  successModal.hidden = true;
}

/* overlay click closes modal */
successModal?.addEventListener("click", (ev) => {
  if (ev.target === successModal) closeSuccessModal();
});
/* ESC to close modal */
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && successModal && !successModal.hidden)
    closeSuccessModal();
});
modalCloseBtn?.addEventListener("click", closeSuccessModal);
modalLoginBtn?.addEventListener("click", () => {
  window.location.href = "office-login.html";
});

/* submit handler (same API behaviour) */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearInlineMsg();
  updateSubmitState();
  if (submitBtn.disabled) {
    showToast("Please fix validation errors before submitting.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const fname = sanitize($("first_name").value);
  const mname = sanitize($("middle_name")?.value);
  const lname = sanitize($("last_name").value);
  const studentName = mname
    ? `${fname} ${mname} ${lname}`
    : `${fname} ${lname}`;
  const et = sanitize($("et_number").value);
  const username = et;
  const fatherName = `${sanitize($("father_first_name").value)} ${sanitize(
    $("father_last_name").value
  )}`;

  const fd = new FormData();
  fd.append("username", username);
  fd.append("password", $("password").value);
  fd.append("student_name", studentName);
  fd.append("student_email", sanitize($("student_email").value));
  fd.append("student_phone_number", sanitize($("student_phone_number").value));
  fd.append("et_number", et);
  fd.append("father_name", fatherName);
  fd.append("father_phone_number", sanitize($("father_phone_number").value));
  fd.append("fees_paid", sanitize($("fees_paid").value));
  fd.append("utr_number", sanitize($("utr_number").value));
  fd.append("pending_fee", sanitize($("pending_fee").value));
  fd.append("room_type", sanitize($("room_type").value));
  fd.append("is_verified", "false");

  const originalFile = $("student_image").files[0];
  if (!originalFile) {
    showToast("Please select a student photo.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign Up";
    return;
  }

  // compress if > 1MB using the user's compressor
  try {
    if (originalFile.size > 1_000_000) {
      try {
        const compressed = await compressImage(originalFile, 0.7, 900);
        if (
          compressed &&
          compressed.size &&
          compressed.size < originalFile.size
        ) {
          const origName = originalFile.name || "upload.jpg";
          const nameNoExt = origName.replace(/\.[^/.]+$/, "");
          fd.append("student_image", compressed, `${nameNoExt}.jpg`);
          console.log(
            "Image compressed:",
            originalFile.size,
            "->",
            compressed.size
          );
        } else {
          fd.append("student_image", originalFile, originalFile.name);
          console.log(
            "Compression not beneficial, sending original:",
            originalFile.size
          );
        }
      } catch (compErr) {
        console.warn("Compression failed, sending original. Err:", compErr);
        fd.append("student_image", originalFile, originalFile.name);
      }
    } else {
      fd.append("student_image", originalFile, originalFile.name);
    }
  } catch (err) {
    fd.append("student_image", originalFile, originalFile.name);
  }

  try {
    const data = await apiFetch("/signup/", {
      method: "POST",
      body: fd,
      auth: false,
    });
    const msgText = (data && data.message) || "";
    const ok =
      typeof msgText === "string" &&
      (msgText.toLowerCase().includes("signup successful") ||
        msgText.toLowerCase().includes("success"));

    if (ok) {
      showToast(
        "Signup successful! Waiting for admin approval.",
        5000,
        "success"
      );
      openSuccessModal(
        "Signup Successful",
        "Your registration is submitted. Please wait for admin approval.",
        username
      );
      if (msg)
        msg.innerHTML = `<div class="alert success">Signup submitted — check the popup for details.</div>`;
      form.reset();
      previewContainer.style.display = "none";
      document
        .querySelectorAll(".field-error")
        .forEach((el) => (el.textContent = ""));
      submitBtn.disabled = true;
      submitBtn.textContent = "Sign Up";
    } else {
      const info = msgText || JSON.stringify(data);
      showToast(info || "Signup did not succeed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  } catch (err) {
    const text = err?.data?.message || err?.data || err.message || "";
    if (typeof text === "string" && text.includes("already exists")) {
      showToast("Email or Username already exists.");
      setError("student_email", "Email already exists.");
    } else if (
      typeof text === "string" &&
      text.includes("File size too large")
    ) {
      showToast("Uploaded image too large. Try a smaller photo.");
      setError("student_image", "File too large.");
    } else {
      showToast(text || "Signup failed. Try again.");
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign Up";
  }
});

/* initial state */
updateSubmitState();
