// js/office-login.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("officeLoginForm");
  const msg = document.getElementById("msg");
  const submit = document.getElementById("submitBtn");

  function showMessage(type, text) {
    msg.innerHTML = `<div class="alert ${
      type === "error" ? "error" : "success"
    }">${text}</div>`;
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
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      } 
      console.group(res);

      // backend returns { message, role, access, refresh }
      const access = data.access;
      const refresh = data.refresh;
      const role = data.role;

      if (!access) {
        throw new Error("No access token received from server.");
      }

      // Save tokens (simple)
      localStorage.setItem("access_token", access);
      if (refresh) localStorage.setItem("refresh_token", refresh);
      if (role) localStorage.setItem("role", role);

      showMessage("success", data.message || "Login successful");
      setTimeout(() => (window.location.href = "office-dashboard.html"), 600);
    } catch (err) {
      showMessage("error", err.message || "Login error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Sign in";
    }
  });
});
