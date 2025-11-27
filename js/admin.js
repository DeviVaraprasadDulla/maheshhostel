// js/admin.js
// Admin Dashboard — enhanced: slide-in detail panel, edit student inline (image upload), Chart.js meal stats
import { apiFetch } from "./api.js";
import { clearAuth, getRole } from "./auth.js";

/* ------------------ small helpers ------------------ */
const $ = (id) => document.getElementById(id);
function createToast(text, { type = "info", duration = 3500 } = {}) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  t.style.opacity = "0";
  if (type === "success")
    t.style.background = "linear-gradient(180deg,#10b981,#059669)";
  else if (type === "error")
    t.style.background = "linear-gradient(180deg,#ef4444,#b91c1c)";
  else t.style.background = "linear-gradient(180deg,#2563eb,#1e4ecf)";
  document.body.appendChild(t);
  // animate in
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transition = "opacity 260ms";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, duration);
}

/* ------------------ DOM refs ------------------ */
const loader = $("loader");
const tableWrap = $("tableWrap");
const studentsBody = $("studentsBody");
const emptyState = $("emptyState");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const pagerInfo = $("pagerInfo");
const perPageSelect = $("perPage");
const searchBox = $("searchBox");
const refreshBtn = $("refreshBtn");
const exportCsvBtn = $("exportCsv");
const openAddStaffBtn = $("openAddStaff");
const logoutBtn = $("logoutBtn");
const approveAllBtn = $("approveAllBtn");

const addStaffModal = $("addStaffModal");
const addStaffForm = $("addStaffForm");
const addStaffCancel = $("addStaffCancel");
const addStaffSubmit = $("addStaffSubmit");
const addStaffStatus = $("addStaffStatus");

const confirmModal = $("confirmModal");
const confirmTitle = $("confirmTitle");
const confirmMsg = $("confirmMsg");
const confirmOk = $("confirmOk");
const confirmCancel = $("confirmCancel");

const summaryTotal = $("summaryTotal");
const summaryPending = $("summaryPending");
const summaryVerified = $("summaryVerified");

const detailPanel = $("detailPanel");
const detailClose = $("detailClose");
const detailName = $("detailName");
const detailEt = $("detailEt");
const detailStatus = $("detailStatus");
const detailPhoto = $("detailPhoto");
const detailEmail = $("detailEmail");
const detailPhone = $("detailPhone");
const detailFather = $("detailFather");
const detailUtr = $("detailUtr");
const detailRoom = $("detailRoom");
const openEditBtn = $("openEditBtn");
const approveBtn = $("approveBtn");
const deleteBtn = $("deleteBtn");

const editModal = $("editModal");
const editForm = $("editForm");
const cancelEditBtn = $("cancelEditBtn");
const saveEditBtn = $("saveEditBtn");
const editStatus = $("editStatus");
const editImageInput = $("edit_image");
const editPreview = $("editPreview");

const mealsChartEl = $("mealsChart");

let mealsChart = null;

/* ------------------ State & endpoints ------------------ */
let page = 1;
let perPage = Number(perPageSelect.value) || 10;
let total = 0;
let students = [];
let lastQuery = "";
let selectedAction = null;
let currentStudent = null;

const DASHBOARD_PATH = "/office/dashboard/";
const APPROVE_PATH = (id) => `/office/student/approve/${id}/`;
const DELETE_PATH = (id) => `/office/student/delete/${id}/`;
const EDIT_PATH = (id) => `/office/student/edit/${id}/`;

/* ------------------ auth guard ------------------ */
(function roleGuard() {
  try {
    const role = getRole ? getRole() : null;
    if (role && role !== "owner" && role !== "office") {
      clearAuth();
      window.location.href = "student-login.html";
    }
  } catch (e) {}
})();

/* ------------------ UI helpers ------------------ */
function showLoader() {
  loader.innerHTML = `
    <div class="skeleton-row" style="width:36%"></div>
    <div style="height:10px"></div>
    <div class="skeleton-card"></div>
  `;
  loader.style.display = "block";
  tableWrap.hidden = true;
  emptyState.hidden = true;
}
function hideLoader() {
  loader.style.display = "none";
}

function updatePagerInfo() {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  pagerInfo.textContent = `Showing ${start} — ${end} of ${total}`;
}

function exportToCsv(filename, rows) {
  if (!rows?.length) {
    createToast("No data to export", { type: "error" });
    return;
  }
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------ rendering ------------------ */
function renderTableRows(items = []) {
  studentsBody.innerHTML = "";
  if (!items || items.length === 0) {
    tableWrap.hidden = true;
    emptyState.hidden = false;
    return;
  }
  tableWrap.hidden = false;
  emptyState.hidden = true;

  items.forEach((s) => {
    const tr = document.createElement("tr");

    const photoTd = document.createElement("td");
    const img = document.createElement("img");
    img.className = "photo";
    img.alt = s.student_name || "photo";
    img.src =
      s.student_image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        s.student_name || "S"
      )}&background=efefef&color=333`;
    photoTd.appendChild(img);

    const nameTd = document.createElement("td");
    nameTd.textContent = s.student_name || "—";
    const etTd = document.createElement("td");
    etTd.textContent = s.et_number || "—";
    const emailTd = document.createElement("td");
    emailTd.textContent = s.student_email || "—";
    const phoneTd = document.createElement("td");
    phoneTd.textContent = s.student_phone_number || "—";
    const feesTd = document.createElement("td");
    const feesVal = s.fees_paid ?? s.fees ?? 0;
    feesTd.textContent =
      typeof feesVal === "number" ? feesVal.toFixed(2) : String(feesVal);

    const statusTd = document.createElement("td");
    const span = document.createElement("span");
    span.className = "pill " + (s.is_verified ? "verified" : "pending");
    span.textContent = s.is_verified ? "Verified" : "Pending";
    statusTd.appendChild(span);

    const actionsTd = document.createElement("td");
    actionsTd.style.display = "flex";
    actionsTd.style.gap = "8px";
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn small";
    viewBtn.textContent = "View";
    viewBtn.onclick = () => openStudent(s);
    const approveBtn = document.createElement("button");
    approveBtn.className = "btn small";
    approveBtn.textContent = s.is_verified ? "Unverify" : "Approve";
    approveBtn.onclick = () => confirmAction("approve", s);
    const delBtn = document.createElement("button");
    delBtn.className = "btn small secondary";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => confirmAction("delete", s);
    actionsTd.appendChild(viewBtn);
    actionsTd.appendChild(approveBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(photoTd);
    tr.appendChild(nameTd);
    tr.appendChild(etTd);
    tr.appendChild(emailTd);
    tr.appendChild(phoneTd);
    tr.appendChild(feesTd);
    tr.appendChild(statusTd);
    tr.appendChild(actionsTd);

    studentsBody.appendChild(tr);
  });
}

/* ------------------ API calls ------------------ */
async function fetchStudents() {
  showLoader();
  try {
    const query = lastQuery
      ? `?q=${encodeURIComponent(lastQuery)}&page=${page}&per_page=${perPage}`
      : `?page=${page}&per_page=${perPage}`;
    const data = await apiFetch(DASHBOARD_PATH + query, { method: "GET" });
    const results = data?.results || data?.students || data?.data || data || [];
    total =
      data?.count ??
      data?.total ??
      (Array.isArray(results) ? results.length : 0);
    students = Array.isArray(results) ? results : [];
    renderTableRows(students);
    updatePagerInfo();
    hideLoader();

    const pending = students.filter((s) => !s.is_verified).length;
    const verified = students.filter((s) => !!s.is_verified).length;
    summaryTotal.textContent = total ?? "—";
    summaryPending.textContent = pending;
    summaryVerified.textContent = verified;

    // update meal chart from aggregate fields if available (backend may include summary)
    renderMealChartFromData(data);
  } catch (err) {
    hideLoader();
    console.error("Dashboard load error:", err);
    createToast(err?.message || "Failed to load students", { type: "error" });
    tableWrap.hidden = true;
    emptyState.hidden = false;
  }
}

async function doApprove(studentId) {
  try {
    await apiFetch(APPROVE_PATH(studentId), { method: "POST" });
    createToast("Student approval toggled.", { type: "success" });
    await fetchStudents();
  } catch (err) {
    console.error(err);
    createToast(err?.data?.message || "Approve failed", { type: "error" });
  }
}

async function doDelete(studentId) {
  try {
    await apiFetch(DELETE_PATH(studentId), { method: "DELETE" });
    createToast("Student deleted.", { type: "success" });
    await fetchStudents();
  } catch (err) {
    console.error(err);
    createToast(err?.data?.message || "Delete failed", { type: "error" });
  }
}

/* ------------------ Confirm modal ------------------ */
function confirmAction(action, student) {
  selectedAction = { action, student };
  confirmTitle.textContent = "Confirm";
  confirmMsg.textContent =
    action === "delete"
      ? `Delete ${student.student_name}? This is irreversible.`
      : `Change approval for ${student.student_name}?`;
  confirmModal.hidden = false;
  confirmOk.focus();
}
confirmCancel.onclick = () => {
  confirmModal.hidden = true;
  selectedAction = null;
};
confirmOk.onclick = async () => {
  confirmModal.hidden = true;
  if (!selectedAction) return;
  const { action, student } = selectedAction;
  selectedAction = null;
  if (action === "delete")
    await doDelete(student.id || student.student_id || student.pk);
  else if (action === "approve")
    await doApprove(student.id || student.student_id || student.pk);
};

/* ------------------ Student details panel ------------------ */
function openStudent(s) {
  currentStudent = s;
  detailName.textContent = s.student_name || "—";
  detailEt.textContent = s.et_number ? `ET: ${s.et_number}` : "ET: —";
  detailEmail.textContent = s.student_email || "—";
  detailPhone.textContent = s.student_phone_number || "—";
  detailFather.textContent = s.father_name || "—";
  detailUtr.textContent = s.utr_number || "—";
  detailRoom.textContent = s.room_type || "—";

  if (s.is_verified) {
    detailStatus.innerHTML = `<span class="pill verified">Verified</span>`;
  } else {
    detailStatus.innerHTML = `<span class="pill pending">Pending</span>`;
  }

  if (s.student_image) {
    detailPhoto.src = s.student_image;
    detailPhoto.style.display = "block";
  } else {
    detailPhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      s.student_name || "S"
    )}&background=efefef&color=333`;
    detailPhoto.style.display = "block";
  }

  detailPanel.classList.add("open");
  detailPanel.setAttribute("aria-hidden", "false");
  // set actions
  openEditBtn.onclick = () => openEditModal(s);
  approveBtn.onclick = () => confirmAction("approve", s);
  deleteBtn.onclick = () => confirmAction("delete", s);
}
detailClose.onclick = () => {
  detailPanel.classList.remove("open");
  detailPanel.setAttribute("aria-hidden", "true");
};

/* ------------------ Edit modal (image upload + preview) ------------------ */
function openEditModal(student) {
  editStatus.textContent = "";
  editForm.reset();
  editPreview.innerHTML = "";
  editModal.hidden = false;

  // prefill fields. Backend shape may differ — adapt as needed
  const nameParts = (student.student_name || "").split(" ");
  $("edit_first_name").value = nameParts[0] || "";
  $("edit_last_name").value = nameParts.slice(1).join(" ") || "";
  $("edit_email").value = student.student_email || "";
  $("edit_phone").value = student.student_phone_number || "";
  $("edit_et").value = student.et_number || "";

  if (student.student_image) {
    const img = document.createElement("img");
    img.src = student.student_image;
    img.style.maxWidth = "120px";
    img.style.borderRadius = "8px";
    editPreview.appendChild(img);
  }
  // attach save handler
  editForm.onsubmit = (ev) => saveEdit(ev, student);
}
cancelEditBtn.onclick = () => {
  editModal.hidden = true;
};

/* image preview */
editImageInput?.addEventListener?.("change", (ev) => {
  const f = ev.target.files[0];
  editPreview.innerHTML = "";
  if (!f) return;
  const img = document.createElement("img");
  img.style.maxWidth = "120px";
  img.style.borderRadius = "8px";
  img.src = URL.createObjectURL(f);
  editPreview.appendChild(img);
});

/* save edit */
async function saveEdit(ev, student) {
  ev.preventDefault();
  if (!student) return;

  const formData = new FormData();
  const first = $("edit_first_name").value.trim();
  const last = $("edit_last_name").value.trim();
  const email = $("edit_email").value.trim();
  const phone = $("edit_phone").value.trim();
  const et = $("edit_et").value.trim();
  const file = editImageInput.files[0];

  if (!first || !last || !email) {
    editStatus.textContent = "Please fill required fields.";
    return;
  }
  formData.append("first_name", first);
  formData.append("last_name", last);
  formData.append("student_email", email);
  formData.append("student_phone_number", phone);
  formData.append("et_number", et);
  if (file) formData.append("student_image", file, file.name);

  saveEditBtn.disabled = true;
  saveEditBtn.textContent = "Saving...";

  try {
    // Use existing office/student/edit/<id>/ endpoint (FormData)
    const id = student.id || student.student_id || student.pk;
    await apiFetch(EDIT_PATH(id), { method: "POST", body: formData });
    createToast("Student updated.", { type: "success" });
    editModal.hidden = true;
    await fetchStudents();
    detailPanel.classList.remove("open");
  } catch (err) {
    console.error("Edit failed:", err);
    editStatus.textContent =
      err?.data?.message || err?.message || "Update failed";
    createToast(editStatus.textContent, { type: "error" });
  } finally {
    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Save";
  }
}

/* ------------------ Chart rendering ------------------ */
function renderMealChart(
  pendingCount = 0,
  breakfast = 0,
  lunch = 0,
  dinner = 0
) {
  const ctx = mealsChartEl.getContext("2d");
  const labels = ["Pending", "Breakfast taken", "Lunch taken", "Dinner taken"];
  const data = [pendingCount, breakfast, lunch, dinner];
  if (mealsChart) {
    mealsChart.data.datasets[0].data = data;
    mealsChart.update();
    return;
  }
  mealsChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ["#f97316", "#10b981", "#2563eb", "#8b5cf6"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      maintainAspectRatio: false,
    },
  });
}

/* try to create chart data from backend response if available */
function renderMealChartFromData(data) {
  // backend may return aggregates; attempt common keys
  const pending = data?.pending_count ?? data?.pending ?? 0;
  const breakfast = data?.breakfast_count ?? data?.breakfast_taken ?? 0;
  const lunch = data?.lunch_count ?? data?.lunch_taken ?? 0;
  const dinner = data?.dinner_count ?? data?.dinner_taken ?? 0;

  // fallback: compute from students list if present
  if (!breakfast && Array.isArray(students)) {
    const b = students.filter((s) => s.breakfast_scanned === true).length;
    const l = students.filter((s) => s.lunch_scanned === true).length;
    const d = students.filter((s) => s.dinner_scanned === true).length;
    renderMealChart(pending || students.length - (b + l + d), b, l, d);
    return;
  }
  renderMealChart(pending, breakfast, lunch, dinner);
}

/* ------------------ events & init ------------------ */
prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    fetchStudents();
  }
};
nextBtn.onclick = () => {
  page++;
  fetchStudents();
};
perPageSelect.onchange = (e) => {
  perPage = Number(e.target.value) || 10;
  page = 1;
  fetchStudents();
};
searchBox.addEventListener("input", (ev) => {
  lastQuery = ev.target.value.trim();
  page = 1;
  if (window._searchTimer) clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => fetchStudents(), 450);
});
refreshBtn.onclick = () => fetchStudents();
exportCsvBtn.onclick = () =>
  exportToCsv(
    `students-${new Date().toISOString().slice(0, 10)}.csv`,
    students
  );

openAddStaffBtn.onclick = () => {
  addStaffForm.reset();
  addStaffModal.hidden = false;
  addStaffStatus.textContent = "";
};
addStaffCancel.onclick = () => {
  addStaffModal.hidden = true;
};
addStaffForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  addStaffSubmit.disabled = true;
  addStaffSubmit.textContent = "Adding...";
  addStaffStatus.textContent = "";
  const fd = new FormData(addStaffForm);
  try {
    // adapt endpoint if needed
    await apiFetch("/office/staff/", { method: "POST", body: fd });
    createToast("Staff added.", { type: "success" });
    addStaffModal.hidden = true;
  } catch (err) {
    console.error(err);
    addStaffStatus.textContent =
      err?.data?.message || err?.message || "Failed to add staff";
    createToast(addStaffStatus.textContent, { type: "error" });
  } finally {
    addStaffSubmit.disabled = false;
    addStaffSubmit.textContent = "Add Staff";
  }
});

approveAllBtn.onclick = async () => {
  const pending = students.filter((s) => !s.is_verified);
  if (!pending.length)
    return createToast("No pending students", { type: "info" });
  if (!confirm(`Approve ${pending.length} students?`)) return;
  for (const s of pending) {
    try {
      await apiFetch(APPROVE_PATH(s.id || s.student_id || s.pk), {
        method: "POST",
      });
    } catch (e) {
      console.warn("approve failed for", s, e);
    }
  }
  createToast("Bulk approve finished", { type: "success" });
  fetchStudents();
};

logoutBtn.onclick = () => {
  try {
    clearAuth();
  } catch (e) {}
  window.location.href = "student-login.html";
};

/* ------------------ Init ------------------ */
(async function init() {
  showLoader();
  try {
    await fetchStudents();
  } catch (e) {
    console.error(e);
    createToast("Failed to initialize", { type: "error" });
  } finally {
    hideLoader();
  }
})();
