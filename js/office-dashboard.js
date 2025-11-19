// js/office-dashboard.js

function showMessage(type, text) {
  const el = document.getElementById("msg");
  el.innerHTML = `<div class="alert ${
    type === "error" ? "error" : "success"
  }">${text}</div>`;
  setTimeout(() => {
    el.innerHTML = "";
  }, 4000);
}

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
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        // token invalid -> redirect
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

function renderDashboard(data) {
 const pending = data.pending_verification || [];
const students = data.students || [];

const pendingArea = document.getElementById("pendingArea");

if (!pending.length) {
  pendingArea.innerHTML = '<div class="small">No pending verifications</div>';
} else {
  pendingArea.innerHTML = `<ul style="list-style: none; padding: 0;">${pending
    .map(
      (p) => `
      <li style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span>${p.student_name} — ${p.et_number} — ${p.student_phone_number}</span>
        <button class="btn success approveBtn" data-id="${p.id}">Approve</button>
      </li>`
    )
    .join("")}</ul>`;

  // Attach event listeners for all approve buttons
  document.querySelectorAll(".approveBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      approve(btn.dataset.id);
    });
  });
}

const studentsArea = document.getElementById("studentsArea");

// Filter verified students and sort by id ascending
const verifiedStudents = (students || [])
  .filter(s => s.is_verified)
  .sort((a, b) => a.id - b.id);

if (!verifiedStudents.length) {
  studentsArea.innerHTML = '<div class="small">No students found</div>';
} else {
  studentsArea.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>ET No</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Verified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${verifiedStudents
          .map(
            (s, index) => `
          <tr>
            <td>${index + 1}</td> <!-- serial number -->
            <td>${s.student_name}</td>
            <td>${s.et_number}</td>
            <td>${s.student_email}</td>
            <td>${s.student_phone_number}</td>
            <td>Yes</td>
            <td>
              <button class="editBtn" data-id="${s.id}" title="Edit" style="
                background-color:#4CAF50; border:none; color:white; padding:5px 8px; border-radius:5px; cursor:pointer;font-size:14px;
              ">✏️</button>

              <button class="deleteBtn" data-id="${s.id}" title="Delete" style="
                background-color:#f44336; border:none; color:white; padding:5px 8px; border-radius:5px; cursor:pointer;font-size:14px;
              ">🗑️</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  // Attach event listeners for edit buttons
  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      editStudent(btn.dataset.id, students);
    });
  });

  // Attach event listeners for delete buttons
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteStudent(btn.dataset.id);
    });
  });
}



} 

//approve student funtion
async function approve(id, studentName) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const url = `https://hostel-erp-bef5.onrender.com/api/office/student/approve/${id}/`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
      },
    });

    const data = await res.json();
    console.log("Backend Response:", data);

    // Refresh table
    fetchDashboard();

    // Show success modal with student name
    const modal = document.getElementById("approveSuccessModal");
    document.getElementById("approvedStudentName").textContent = `✅ ${studentName} approved successfully!`;
    modal.style.display = "flex";

    // Close modal
    document.getElementById("closeApproveSuccessBtn").onclick = () => {
      modal.style.display = "none";
    };
  } catch (error) {
    console.error("Approve Error:", error);
  }
}


//editstudentfunction
function editStudent(id, students) {
  const student = students.find(s => s.id == id);
  if (!student) return; // or alert if needed

  const modal = document.getElementById("editFormModal");
  const successModal = document.getElementById("successEditModal");

  modal.style.display = "flex"; // show edit modal

  // Populate form fields
  document.getElementById("editName").value = student.student_name || "";
  document.getElementById("editET").value = student.et_number || "";
  document.getElementById("editEmail").value = student.student_email || "";
  document.getElementById("editPhone").value = student.student_phone_number || "";

  // Remove previous listeners to avoid duplicates
  const submitBtn = document.getElementById("submitEdit");
  const cancelBtn = document.getElementById("cancelEdit");

  submitBtn.replaceWith(submitBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newSubmitBtn = document.getElementById("submitEdit");
  const newCancelBtn = document.getElementById("cancelEdit");

  // Submit edited data
  newSubmitBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const updatedData = {
      student_name: document.getElementById("editName").value,
      et_number: document.getElementById("editET").value,
      student_email: document.getElementById("editEmail").value,
      student_phone_number: document.getElementById("editPhone").value,
    };

    try {
      const putRes = await fetch(
        `https://hostel-erp-bef5.onrender.com/api/office/student/edit/${id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (putRes.ok) {
        modal.style.display = "none"; // hide edit modal
        fetchDashboard(); // refresh table

        successModal.style.display = "flex"; // show success modal
      } else {
        console.error("Error updating student:", await putRes.json());
      }
    } catch (error) {
      console.error("Edit Error:", error);
    }
  });

  // Cancel button
  newCancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close success modal
  document.getElementById("closeEditSuccessBtn").onclick = () => {
    successModal.style.display = "none";
  };
}



//deletestudentfunction
function deleteStudent(id) {
  const confirmModal = document.getElementById("confirmDeleteModal");
  const successModal = document.getElementById("successDeleteModal");

  // Show confirmation modal
  confirmModal.style.display = "flex";

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const cancelBtn = document.getElementById("cancelDeleteBtn");

  // Remove previous listeners to avoid duplicates
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newConfirmBtn = document.getElementById("confirmDeleteBtn");
  const newCancelBtn = document.getElementById("cancelDeleteBtn");

  // On confirm
  newConfirmBtn.addEventListener("click", async () => {
    confirmModal.style.display = "none"; // hide confirmation modal

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`https://hostel-erp-bef5.onrender.com/api/office/student/delete/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": token.startsWith("Bearer") ? token : `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        fetchDashboard(); // refresh table
        successModal.style.display = "flex"; // show success modal
      } else {
        console.error("Error deleting student:", await res.json());
      }
    } catch (error) {
      console.error("Delete Error:", error);
    }
  });

  // On cancel
  newCancelBtn.addEventListener("click", () => {
    confirmModal.style.display = "none"; // hide confirmation modal
  });

  // Close success modal
  document.getElementById("closeSuccessBtn").onclick = () => {
    successModal.style.display = "none";
  };
}







document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    window.location.href = "office-login.html";
  });

  fetchDashboard();
});
