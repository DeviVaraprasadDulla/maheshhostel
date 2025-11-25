

import { viewStudent, approve, editStudent, deleteStudent, setupModals } from "./office-functions.js";



let dashboardData = null; // store dashboard data globally

// Show message
function showMessage(type, text) {
  const el = document.getElementById("msg");
  el.innerHTML = `<div class="alert ${type === "error" ? "error" : "success"}">${text}</div>`;
  setTimeout(() => { el.innerHTML = ""; }, 4000);
}

// Fetch dashboard data
async function fetchDashboard() {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showMessage("error", "Not logged in. Redirecting to login...");
      setTimeout(() => (window.location.href = "office-login.html"), 800);
      return;
    }

    const res = await fetch(
      "https://hostel-erp-bef5.onrender.com/api/office/dashboard",
      {
        method: "GET",
        headers: {
          Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
        },
      }
    );

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } 
    catch { data = { message: text }; }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        showMessage("error", "Unauthorized. Please login again.");
        setTimeout(() => (window.location.href = "office-login.html"), 800);
        return;
      }
      throw new Error(data?.message || "Failed to load dashboard");
    }

    renderDashboard(data);
  } catch (err) {
    showMessage("error", err.message || "Network error");
  }
}

// Render dashboard
function renderDashboard(data) {
  dashboardData = data;

  const pending = data.pending_verification || [];
  const students = data.students || [];

  const pendingArea = document.getElementById("pendingArea");

  if (!pending.length) {
    pendingArea.innerHTML = `<div class="small" style="text-align:center;">No pending verifications</div>`;
  } else {
    pendingArea.innerHTML = `
      <ul class="pending-list">
        ${pending.map(p => `
          <li class="pending-item">
            <div class="student-name">NAME: ${p.student_name}</div>
            <div class="pending-row">
              <div class="pending-info">
                <span>ET-N: ${p.et_number}</span>
                <span>PH: ${p.student_phone_number}</span> 
                <img 
                src=${p.student_image}
                
      alt="Student Photo" 
      class="pending-student-img"
    />
                <button class="btn viewBtn" data-id="${p.id}">View</button>
              </div>
              <div class="pending-buttons">
                <button class="btn approveBtn" data-id="${p.id}">Approve</button>
                <button class="btn rejecteBtn" data-id="${p.id}">Reject</button>
              </div>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Event delegation for pending buttons (once)
  if (!pendingArea.hasListener) {
    pendingArea.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("viewBtn")) viewStudent(id, dashboardData);
      if (e.target.classList.contains("approveBtn")) approve(id);
      if (e.target.classList.contains("rejecteBtn")) reject(id);
    });
    pendingArea.hasListener = true;
  }

  renderVerifiedStudents(students);
}

// Render verified students table
function renderVerifiedStudents(students) {
  const studentsArea = document.getElementById("studentsArea");
  const verifiedStudents = (students || []).filter(s => s.is_verified).sort((a, b) => a.id - b.id);

  if (!verifiedStudents.length) {
    studentsArea.innerHTML = '<div class="small">No students found</div>';
    return;
  }

  studentsArea.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>ET No</th><th>Email</th><th>Phone</th><th>Verified</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${verifiedStudents.map((s, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${s.student_name}</td>
            <td>${s.et_number}</td>
            <td>${s.student_email}</td>
            <td>${s.student_phone_number}</td>
            <td>Yes</td>
            <td>
              <button class="editBtn" data-id="${s.id}">✏️</button>
              <button class="deleteBtn" data-id="${s.id}">🗑️</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Event delegation for edit/delete (once)
  if (!studentsArea.hasListener) {
    studentsArea.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("editBtn")) editStudent(id, dashboardData.students);
      if (e.target.classList.contains("deleteBtn")) deleteStudent(id);
    });
    studentsArea.hasListener = true;
  }
}

// Logout & setup
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    window.location.href = "office-login.html";
  });

  setupModals();
  fetchDashboard();
});
