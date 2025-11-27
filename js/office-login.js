document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("officeLoginForm");
  const msg = document.getElementById("msg");
  const submit = document.getElementById("submitBtn");

  function showMessage(type, text) {
    const icon = type === "error" ? "❌" : "✅";
    msg.innerHTML = `<div class="alert ${type}">${icon} ${text}</div>`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerHTML = "";
    submit.disabled = true;
    submit.textContent = "Signing...";

    const payload = {
      username: form.username.value.trim(),
      password: form.password.value.trim(),
    };

    if (!payload.username || !payload.password) {
      showMessage("error", "Username and password required.");
      submit.disabled = false;
      submit.textContent = "Sign in";
      return;
    }

    try {
      const res = await fetch(
        "https://hostel-erp-bef5.onrender.com/api/login/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      
      let data;
      try { data = text ? JSON.parse(text) : null; }
      catch { data = { message: text }; }
      console.log("Backend Response:", data);


      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Invalid credentials. Please try again.");
        } else {
          throw new Error(data?.message || "Login failed");
        }
      }

      // Save tokens
      localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
      if (data.role) localStorage.setItem("role", data.role);

      // Show success message
      showMessage("success", data.message || "Login successful");

      // -----------------------------------------
      // 🔥 ROLE-BASED REDIRECTION
      // -----------------------------------------
     setTimeout(() => {
  if (data.role === "officer") {
    window.location.href = "office-dashboard.html";
  } else if (data.role === "warden") {
    window.location.href = "warden-dashboard.html";
  } else if (data.role === "owner") {
    window.location.href = "admin.html"; // ✔ owner → admin page
  } else {
    // fallback
    window.location.href = "office-dashboard.html";
  }
}, 600);

    } catch (err) {
      showMessage("error", err.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Sign in";
    }
  });
});
