// js/signup.js
// Module version — uses apiFetch from js/api.js
import { apiFetch } from "./api.js";

const form = document.getElementById("signupForm");
const msg = document.getElementById("msg");
const previewImage = document.getElementById("previewImage");
const previewContainer = document.getElementById("previewContainer");

// ------------- image preview -------------
document.getElementById("student_image").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) {
    previewContainer.style.display = "block";
    previewImage.src = URL.createObjectURL(f);
  }
});

// ------------- image compression -------------
function compressImage(file, quality = 0.7, maxWidth = 900) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = maxWidth / img.width;
        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scale : img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
    };
  });
}

// ------------- helper show message -------------
function showMsg(type, text) {
  msg.innerHTML = `<div class="alert ${
    type === "error" ? "error" : "success"
  }">${text}</div>`;
}

// ------------- submit handler -------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.innerHTML = "";

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  // password validation
  const pass = document.getElementById("password").value;
  const cpass = document.getElementById("confirm_password").value;
  if (pass !== cpass) {
    showMsg("error", "Passwords do not match.");
    btn.disabled = false;
    btn.textContent = "Sign Up";
    return;
  }

  // combine student name
  const fname = document.getElementById("first_name").value.trim();
  const mname = document.getElementById("middle_name").value.trim();
  const lname = document.getElementById("last_name").value.trim();
  let studentName = fname + " " + lname;
  if (mname.length) studentName = `${fname} ${mname} ${lname}`;

  // combine father name
  const fatherFirst = document.getElementById("father_first_name").value.trim();
  const fatherLast = document.getElementById("father_last_name").value.trim();
  const fatherFullName = `${fatherFirst} ${fatherLast}`;

  // username = et number (hidden to user)
  const et = document.getElementById("et_number").value.trim();
  const username = et;

  // build FormData
  const fd = new FormData();
  const dataMap = {
    username: username,
    password: pass,
    student_name: studentName,
    student_email: document.getElementById("student_email").value.trim(),
    student_phone_number: document
      .getElementById("student_phone_number")
      .value.trim(),
    et_number: et,
    father_name: fatherFullName,
    father_phone_number: document
      .getElementById("father_phone_number")
      .value.trim(),
    fees_paid: document.getElementById("fees_paid").value.trim(),
    utr_number: document.getElementById("utr_number").value.trim(),
    pending_fee: document.getElementById("pending_fee").value.trim(),
    room_type: document.getElementById("room_type").value.trim(),
    is_verified: false,
  };

  for (const k in dataMap) {
    fd.append(k, dataMap[k]);
  }

  // handle image compression
  const originalFile = document.getElementById("student_image").files[0];
  if (!originalFile) {
    showMsg("error", "Please select a photo.");
    btn.disabled = false;
    btn.textContent = "Sign Up";
    return;
  }

  let finalImage = originalFile;
  // compress if larger than 1MB
  if (originalFile.size > 1000000) {
    try {
      const compressed = await compressImage(originalFile, 0.7);
      if (compressed && compressed.size) finalImage = compressed;
    } catch (err) {
      // if compression fails, continue with original (server will reject if too big)
      console.warn("Compression failed, using original file", err);
    }
  }

  fd.append("student_image", finalImage, originalFile.name);

  // ---- call API via apiFetch (api.js) ----
  try {
    // signup is public — auth: false
    const data = await apiFetch("/signup/", {
      method: "POST",
      body: fd,
      auth: false,
    });

    // success
    msg.innerHTML = `
      <div class="alert success">
        Signup Successful!<br><br>
        <b>Your Username:</b> ${username}<br><br>
        Please wait for admin approval.<br><br>
        <a href="office-login.html" style="font-weight:bold;color:#2563eb">Click here to Login</a>
      </div>
    `;
    form.reset();
    previewContainer.style.display = "none";
  } catch (err) {
    // err.data may be object, string, etc.
    const text = err?.data?.message || err?.data || err.message || "";
    if (typeof text === "string" && text.includes("already exists")) {
      showMsg("error", "Email or Username already exists.");
    } else if (
      typeof text === "string" &&
      text.includes("File size too large")
    ) {
      showMsg("error", "Uploaded image is too large. Try a smaller image.");
    } else {
      showMsg("error", text || "Signup failed.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign Up";
  }
});
