// office-function.js

// View student modal
export function viewStudent(id, data) {
  const student = data.students.find(s => s.id == id);
  if (!student) return;

  const studentImage = document.getElementById("studentImage");

  // SIMPLE & WORKING IMAGE HANDLING
  if (student.student_image) {
    studentImage.src = student.student_image; 
    console.log(student.student_image);
    studentImage.style.display = "block";
  } else {
    studentImage.src = "/maheshhostel/images/default-student.png";
    studentImage.style.display = "block";
  }

  studentImage.alt = student.student_name || "Student Photo";

  document.getElementById("studentName").innerText = student.student_name || "";
  document.getElementById("studentET").innerText = student.et_number || "";
  document.getElementById("studentPhone").innerText = student.student_phone_number || "";
  document.getElementById("fatherName").innerText = student.father_name || "";
  document.getElementById("fatherPhone").innerText = student.father_phone_number || "";
  document.getElementById("studentEmail").innerText = student.student_email || "";
  document.getElementById("roomType").innerText = student.room_type || "";

  document.getElementById("studentModal").style.display = "flex";
}



// Approve student
export async function approve(id) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const res = await fetch(`https://hostel-erp-bef5.onrender.com/api/office/student/approve/${id}/`, {
      method: "POST",
      headers: { Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Backend Response:", data);

    // Refresh dashboard
    window.fetchDashboard?.(); // optional: call global dashboard function if available

    const modal = document.getElementById("approveSuccessModal");
    document.getElementById("approvedStudentName").textContent = `✅ Student approved successfully!`;
    modal.style.display = "flex";
    document.getElementById("closeApproveSuccessBtn").onclick = () => modal.style.display = "none";

  } catch (error) {
    console.error("Approve Error:", error);
  }
}

// Edit student
export function editStudent(id, students) {
  const student = students.find(s => s.id == id);
  if (!student) return;

  const modal = document.getElementById("editFormModal");
  const successModal = document.getElementById("successEditModal");
  modal.style.display = "flex";

  document.getElementById("editName").value = student.student_name || "";
  document.getElementById("editET").value = student.et_number || "";
  document.getElementById("editEmail").value = student.student_email || "";
  document.getElementById("editPhone").value = student.student_phone_number || "";

  const submitBtn = document.getElementById("submitEdit");
  const cancelBtn = document.getElementById("cancelEdit");
  submitBtn.replaceWith(submitBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newSubmitBtn = document.getElementById("submitEdit");
  const newCancelBtn = document.getElementById("cancelEdit");

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
      const putRes = await fetch(`https://hostel-erp-bef5.onrender.com/api/office/student/edit/${id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (putRes.ok) {
        modal.style.display = "none";
        window.fetchDashboard?.(); // optional: refresh dashboard
        successModal.style.display = "flex";
      } else {
        console.error("Error updating student:", await putRes.json());
      }
    } catch (error) { console.error("Edit Error:", error); }
  });

  newCancelBtn.addEventListener("click", () => { modal.style.display = "none"; });
  document.getElementById("closeEditSuccessBtn").onclick = () => { successModal.style.display = "none"; };
}

// Delete student
export function deleteStudent(id) {
  const confirmModal = document.getElementById("confirmDeleteModal");
  const successModal = document.getElementById("successDeleteModal");

  confirmModal.style.display = "flex";

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const cancelBtn = document.getElementById("cancelDeleteBtn");

  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newConfirmBtn = document.getElementById("confirmDeleteBtn");
  const newCancelBtn = document.getElementById("cancelDeleteBtn");

  newConfirmBtn.addEventListener("click", async () => {
    confirmModal.style.display = "none";
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`https://hostel-erp-bef5.onrender.com/api/office/student/delete/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        window.fetchDashboard?.(); // refresh dashboard
        successModal.style.display = "flex";
      } else {
        console.error("Error deleting student:", await res.json());
      }
    } catch (error) { console.error("Delete Error:", error); }
  });

  newCancelBtn.addEventListener("click", () => { confirmModal.style.display = "none"; });
  document.getElementById("closeSuccessBtn").onclick = () => { successModal.style.display = "none"; };
}

// Setup modals to prevent blinking
export function setupModals() {
  const studentModal = document.getElementById("studentModal");
  const modalContent = studentModal.querySelector(".modal-content");

  // Close modal when clicking outside content
  studentModal.addEventListener("click", () => {
    studentModal.style.display = "none";
  });

  // Prevent closing when clicking inside content
  modalContent.addEventListener("click", (e) => e.stopPropagation());

  // Close button
  const closeBtn = studentModal.querySelector(".closeBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => {
    studentModal.style.display = "none";
  });
}
