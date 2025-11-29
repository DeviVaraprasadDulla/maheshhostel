// js/admin.js (FULL — optimized, fixed, and complete)
// Admin Dashboard — optimized for large lists (500+): abortable fetches, debounced search,
// chunked rendering, lazy avatar loading (IntersectionObserver), Chart.js reuse,
// single authorized meal-stats fetch and rendering, robust role guard.

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
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transition = "opacity 260ms";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
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

/* ------------------ State & endpoints ------------------ */
let page = 1;
let perPage = Number(perPageSelect?.value) || 10;
let total = 0;
let students = [];
let lastQuery = "";
let selectedAction = null;
let currentStudent = null;

const DASHBOARD_PATH = "/office/dashboard/";
const APPROVE_PATH = (id) => `/office/student/approve/${id}/`;
const DELETE_PATH = (id) => `/office/student/delete/${id}/`;
const EDIT_PATH = (id) => `/office/student/edit/${id}/`;

/* ------------------ role guard ------------------ */
(function roleGuard() {
  try {
    const role = typeof getRole === "function" ? getRole() : null;
    if (role && role !== "owner" && role !== "office") {
      try { clearAuth(); } catch (e) {}
      window.location.href = "student-login.html";
    }
  } catch (e) {
    console.error("Role guard error:", e);
    try { clearAuth(); } catch (er) {}
    window.location.href = "student-login.html";
  }
})();

/* ------------------ UI helpers ------------------ */
function showLoader() {
  if (!loader) return;
  loader.innerHTML = `
    <div class="skeleton-row" style="width:36%"></div>
    <div style="height:10px"></div>
    <div class="skeleton-card"></div>
  `;
  loader.style.display = "block";
  if (tableWrap) tableWrap.hidden = true;
  if (emptyState) emptyState.hidden = true;
}
function hideLoader() {
  if (!loader) return;
  loader.style.display = "none";
}

function updatePagerInfo() {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  if (pagerInfo) pagerInfo.textContent = `Showing ${start} — ${end} of ${total}`;
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

/* ------------------ rendering (chunked + lazy imgs) ------------------ */

// IntersectionObserver for lazy-loading avatars
let imgObserver = null;
function ensureImgObserver() {
  if (imgObserver) return imgObserver;
  // if tableWrap is undefined (page layout), root: null still works (viewport)
  const rootEl = tableWrap || null;
  imgObserver = new IntersectionObserver((entries) => {
    for (const ent of entries) {
      if (ent.isIntersecting) {
        const img = ent.target;
        const src = img.datasetSrc || img.getAttribute("data-src");
        if (src) {
          img.src = src;
          img.removeAttribute("data-src");
          img.datasetSrc = "";
        }
        img.loading = "lazy";
        img.decoding = "async";
        try {
          imgObserver.unobserve(img);
        } catch (e) {}
      }
    }
  }, {
    root: rootEl,
    rootMargin: "300px",
    threshold: 0.01
  });
  return imgObserver;
}

// buildRow returns { tr, img } so caller can observe img directly (avoid querySelectorAll)
function buildRow(s) {
  const tr = document.createElement("tr");

  const photoTd = document.createElement("td");
  const img = document.createElement("img");
  img.className = "photo";
  img.alt = s.student_name || "photo";
  const avatarSrc =
    s.student_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      s.student_name || "S"
    )}&background=efefef&color=333`;
  img.setAttribute("data-src", avatarSrc);
  img.datasetSrc = avatarSrc;
  img.style.width = "40px";
  img.style.height = "40px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "4px";
  img.loading = "lazy";
  img.decoding = "async";
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

  return { tr, img };
}

// chunked render to avoid blocking main thread
function renderTableRows(items = []) {
  if (!studentsBody) return;
  studentsBody.innerHTML = "";
  if (!items || items.length === 0) {
    if (tableWrap) tableWrap.hidden = true;
    if (emptyState) emptyState.hidden = false;
    return;
  }
  if (tableWrap) tableWrap.hidden = false;
  if (emptyState) emptyState.hidden = true;

  const batchSize = 30; // tuned for 500+; reduce if mobile is slow
  let i = 0;
  const observer = ensureImgObserver();

  function renderBatch() {
    const frag = document.createDocumentFragment();
    const end = Math.min(i + batchSize, items.length);
    for (; i < end; i++) {
      const { tr, img } = buildRow(items[i]);
      frag.appendChild(tr);
      // observe img directly
      if (img && img.datasetSrc) {
        try {
          observer.observe(img);
        } catch (e) {
          // ignore observation errors
        }
      }
    }
    studentsBody.appendChild(frag);

    if (i < items.length) {
      requestAnimationFrame(renderBatch);
    } else {
      requestAnimationFrame(() => updatePagerInfo());
    }
  }

  requestAnimationFrame(renderBatch);
}

/* ------------------ API calls (abortable + safe) ------------------ */

// separate controllers for list vs other operations
let currentFetchController = null;

async function fetchWithAbort(url, options = {}, controllerRef = "list") {
  // controllerRef can be "list" or any other key to allow multiple controllers if needed.
  if (controllerRef === "list") {
    if (currentFetchController) {
      try { currentFetchController.abort(); } catch (e) {}
    }
    currentFetchController = new AbortController();
    const opts = { ...options, signal: currentFetchController.signal };
    return apiFetch(url, opts);
  } else {
    const c = new AbortController();
    const opts = { ...options, signal: c.signal };
    return apiFetch(url, opts);
  }
}

function normalizeId(s) {
  return s?.id ?? s?.student_id ?? s?.pk ?? s?.user_id ?? null;
}

let mealsChart = null;

function renderMealChartFromData(data) {
  if (!mealsChartEl) return;

  const last7 = data?.meal_stats_last_7_days || [];
  const labels = last7.map(d => d.date || "—");
  const breakfast = last7.map(d => d.breakfast || 0);
  const lunch = last7.map(d => d.lunch || 0);
  const dinner = last7.map(d => d.dinner || 0);

  const chartData = {
    labels,
    datasets: [
      { label: "Breakfast", data: breakfast, backgroundColor: "#10b981" },
      { label: "Lunch", data: lunch, backgroundColor: "#3b82f6" },
      { label: "Dinner", data: dinner, backgroundColor: "#f59e0b" },
    ],
  };

  const config = {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Meals Last 7 Days" },
      },
    },
  };

  if (mealsChart) {
    mealsChart.destroy();
  }
  mealsChart = new Chart(mealsChartEl, config);
}



async function fetchStudents() {
  showLoader();
  try {
    const query = lastQuery
      ? `?q=${encodeURIComponent(lastQuery)}&page=${page}&per_page=${perPage}`
      : `?page=${page}&per_page=${perPage}`;
    const data = await fetchWithAbort(DASHBOARD_PATH + query, { method: "GET" });

    // backend may return { students: [...], count: N, ... } or { results: [...] }
    const results = data?.results || data?.students || data?.data || data || [];
    total =
      data?.count ??
      data?.total ??
      (Array.isArray(results) ? results.length : 0);
    students = Array.isArray(results) ? results : [];

    // non-blocking chunked render
    renderTableRows(students);

    // compute summary counts in single pass (O(n))
    let pendingCount = 0, verifiedCount = 0;
    for (const s of students) {
      if (s?.is_verified) verifiedCount++;
      else pendingCount++;
    }
    summaryTotal.textContent = total ?? "—";
    summaryPending.textContent = pendingCount;
    summaryVerified.textContent = verifiedCount;

    // update chart (prefer meal_stats_last_7_days if present)
    renderMealChartFromData(data);
   
    hideLoader();
  } catch (err) {
    hideLoader();
    if (err && err.name === "AbortError") {
      // request aborted due to newer fetch - ignore
      return;
    }
    console.error("Dashboard load error:", err);
    createToast(err?.message || "Failed to load students", { type: "error" });
    if (tableWrap) tableWrap.hidden = true;
    if (emptyState) emptyState.hidden = false;
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
  if (confirmTitle) confirmTitle.textContent = "Confirm";
  if (confirmMsg) confirmMsg.textContent =
    action === "delete"
      ? `Delete ${student.student_name}? This is irreversible.`
      : `Change approval for ${student.student_name}?`;
  if (confirmModal) confirmModal.hidden = false;
  if (confirmOk) confirmOk.focus();
}
if (confirmCancel) confirmCancel.onclick = () => {
  if (confirmModal) confirmModal.hidden = true;
  selectedAction = null;
};
if (confirmOk) confirmOk.onclick = async () => {
  if (confirmModal) confirmModal.hidden = true;
  if (!selectedAction) return;
  const { action, student } = selectedAction;
  selectedAction = null;
  const id = normalizeId(student);
  if (!id) return;
  if (action === "delete") await doDelete(id);
  else if (action === "approve") await doApprove(id);
};

/* ------------------ Student details panel ------------------ */
function openStudent(s) {
  currentStudent = s;
  if (detailName) detailName.textContent = s.student_name || "—";
  if (detailEt) detailEt.textContent = s.et_number ? `ET: ${s.et_number}` : "ET: —";
  if (detailEmail) detailEmail.textContent = s.student_email || "—";
  if (detailPhone) detailPhone.textContent = s.student_phone_number || "—";
  if (detailFather) detailFather.textContent = s.father_name || "—";
  if (detailUtr) detailUtr.textContent = s.utr_number || "—";
  if (detailRoom) detailRoom.textContent = s.room_type || "—";

  if (detailStatus) {
    detailStatus.innerHTML = s.is_verified
      ? `<span class="pill verified">Verified</span>`
      : `<span class="pill pending">Pending</span>`;
  }

  if (detailPhoto) {
    detailPhoto.src = s.student_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.student_name || "S")}&background=efefef&color=333`;
    detailPhoto.style.display = "block";
  }

  if (detailPanel) {
    detailPanel.classList.add("open");
    detailPanel.setAttribute("aria-hidden", "false");
  }

  if (openEditBtn) openEditBtn.onclick = () => openEditModal(s);
  if (approveBtn) approveBtn.onclick = () => confirmAction("approve", s);
  if (deleteBtn) deleteBtn.onclick = () => confirmAction("delete", s);
}
if (detailClose) detailClose.onclick = () => {
  if (detailPanel) {
    detailPanel.classList.remove("open");
    detailPanel.setAttribute("aria-hidden", "true");
  }
};

/* ------------------ Edit modal (image upload + preview) ------------------ */
function openEditModal(student) {
  editStatus && (editStatus.textContent = "");
  editForm && editForm.reset();
  editPreview && (editPreview.innerHTML = "");
  if (editModal) editModal.hidden = false;

  const nameParts = (student.student_name || "").split(" ");
  const first = nameParts[0] || "";
  const last = nameParts.slice(1).join(" ") || "";
  const email = student.student_email || "";
  const phone = student.student_phone_number || "";
  const et = student.et_number || "";

  const elFirst = $("edit_first_name");
  const elLast = $("edit_last_name");
  const elEmail = $("edit_email");
  const elPhone = $("edit_phone");
  const elEt = $("edit_et");

  if (elFirst) elFirst.value = first;
  if (elLast) elLast.value = last;
  if (elEmail) elEmail.value = email;
  if (elPhone) elPhone.value = phone;
  if (elEt) elEt.value = et;

  if (student.student_image && editPreview) {
    const img = document.createElement("img");
    img.src = student.student_image;
    img.style.maxWidth = "120px";
    img.style.borderRadius = "8px";
    editPreview.appendChild(img);
  }

  // attach save handler
  if (editForm) editForm.onsubmit = (ev) => saveEdit(ev, student);
}
if (cancelEditBtn) cancelEditBtn.onclick = () => {
  if (editModal) editModal.hidden = true;
};

/* image preview */
if (editImageInput?.addEventListener) {
  editImageInput.addEventListener("change", (ev) => {
    const f = ev.target.files[0];
    if (!editPreview) return;
    editPreview.innerHTML = "";
    if (!f) return;
    const img = document.createElement("img");
    img.style.maxWidth = "120px";
    img.style.borderRadius = "8px";
    img.src = URL.createObjectURL(f);
    editPreview.appendChild(img);
  });
}

/* save edit */
async function saveEdit(ev, student) {
  ev.preventDefault();
  if (!student) return;

  const firstEl = $("edit_first_name");
  const lastEl = $("edit_last_name");
  const emailEl = $("edit_email");
  const phoneEl = $("edit_phone");
  const etEl = $("edit_et");

  const first = firstEl?.value.trim() || "";
  const last = lastEl?.value.trim() || "";
  const email = emailEl?.value.trim() || "";
  const phone = phoneEl?.value.trim() || "";
  const et = etEl?.value.trim() || "";
  const file = editImageInput?.files?.[0];

  if (!first || !last || !email) {
    if (editStatus) editStatus.textContent = "Please fill required fields.";
    return;
  }

  const formData = new FormData();
  formData.append("first_name", first);
  formData.append("last_name", last);
  formData.append("student_email", email);
  formData.append("student_phone_number", phone);
  formData.append("et_number", et);
  if (file) formData.append("student_image", file, file.name);

  if (saveEditBtn) {
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Saving...";
  }

  try {
    const id = normalizeId(student);
    if (!id) throw new Error("Invalid student id");
    await apiFetch(EDIT_PATH(id), { method: "POST", body: formData });
    createToast("Student updated.", { type: "success" });
    if (editModal) editModal.hidden = true;
    await fetchStudents();
    if (detailPanel) detailPanel.classList.remove("open");
  } catch (err) {
    console.error("Edit failed:", err);
    if (editStatus) editStatus.textContent = err?.data?.message || err?.message || "Update failed";
    createToast(editStatus?.textContent || "Update failed", { type: "error" });
  } finally {
    if (saveEditBtn) {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = "Save";
    }
  }
}

/* ------------------ Chart rendering (last 7 days bar chart) ------------------ */
const mealStatsBody = $("mealStatsBody");

async function loadMealStats() {
  if (!mealStatsBody) return;

  mealStatsBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>"; // show loading

  const TOKEN = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
  if (!TOKEN) {
    mealStatsBody.innerHTML = "<tr><td colspan='4'>No token found</td></tr>";
    return;
  }

  try {
    const res = await fetch("https://hostel-erp-bef5.onrender.com/api/owner/dashboard/", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + TOKEN
      }
    });

    if (!res.ok) {
      mealStatsBody.innerHTML = `<tr><td colspan='4'>Failed to load meal stats</td></tr>`;
      return;
    }

    const data = await res.json();
    const last7 = data?.meal_stats_last_7_days;

    if (!Array.isArray(last7) || !last7.length) {
      mealStatsBody.innerHTML = "<tr><td colspan='4'>No meal stats available</td></tr>";
      return;
    }

    // --- Render table ---
    mealStatsBody.innerHTML = ""; // clear previous
    for (const day of last7) {
  const tr = document.createElement("tr");

  const dateTd = document.createElement("td");
  dateTd.textContent = day.date || "—";
  dateTd.setAttribute("data-label", "Date");

  const breakfastTd = document.createElement("td");
  breakfastTd.textContent = day.breakfast ?? 0;
  breakfastTd.setAttribute("data-label", "Breakfast");

  const lunchTd = document.createElement("td");
  lunchTd.textContent = day.lunch ?? 0;
  lunchTd.setAttribute("data-label", "Lunch");

  const dinnerTd = document.createElement("td");
  dinnerTd.textContent = day.dinner ?? 0;
  dinnerTd.setAttribute("data-label", "Dinner");

  tr.appendChild(dateTd);
  tr.appendChild(breakfastTd);
  tr.appendChild(lunchTd);
  tr.appendChild(dinnerTd);

  mealStatsBody.appendChild(tr);
}


    // --- Optionally render chart ---
    if (typeof renderMealChartFromData === "function") {
      renderMealChartFromData(data);
    }

  } catch (err) {
    console.error("Meal stats fetch error:", err);
    mealStatsBody.innerHTML = "<tr><td colspan='4'>Error loading meal stats</td></tr>";
  }
}

// Call this once when page loads
loadMealStats();







/* ------------------ events & init ------------------ */
if (prevBtn) prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    fetchStudents();
  }
};
if (nextBtn) nextBtn.onclick = () => {
  page++;
  fetchStudents();
};
if (perPageSelect) perPageSelect.onchange = (e) => {
  perPage = Number(e.target.value) || 10;
  page = 1;
  fetchStudents();
};

// use debounced search
if (searchBox) {
  searchBox.addEventListener(
    "input",
    debounce((ev) => {
      lastQuery = ev.target.value.trim();
      page = 1;
      fetchStudents();
    }, 450)
  );
}
if (refreshBtn) refreshBtn.onclick = () => fetchStudents();
if (exportCsvBtn) exportCsvBtn.onclick = () =>
  exportToCsv(`students-${new Date().toISOString().slice(0, 10)}.csv`, students);

if (openAddStaffBtn) openAddStaffBtn.onclick = () => {
  addStaffForm && addStaffForm.reset();
  if (addStaffModal) addStaffModal.hidden = false;
  if (addStaffStatus) addStaffStatus.textContent = "";
};
if (addStaffCancel) addStaffCancel.onclick = () => {
  if (addStaffModal) addStaffModal.hidden = true;
};
if (addStaffForm) addStaffForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!addStaffSubmit) return;
  addStaffSubmit.disabled = true;
  addStaffSubmit.textContent = "Adding...";
  if (addStaffStatus) addStaffStatus.textContent = "";
  const fd = new FormData(addStaffForm);
  try {
    await apiFetch("/office/staff/", { method: "POST", body: fd });
    createToast("Staff added.", { type: "success" });
    if (addStaffModal) addStaffModal.hidden = true;
  } catch (err) {
    console.error(err);
    if (addStaffStatus) addStaffStatus.textContent = err?.data?.message || err?.message || "Failed to add staff";
    createToast(addStaffStatus?.textContent || "Failed to add staff", { type: "error" });
  } finally {
    addStaffSubmit.disabled = false;
    addStaffSubmit.textContent = "Add Staff";
  }
});

if (approveAllBtn) approveAllBtn.onclick = async () => {
  const pending = students.filter((s) => !s.is_verified);
  if (!pending.length) return createToast("No pending students", { type: "info" });
  if (!confirm(`Approve ${pending.length} students?`)) return;
  for (const s of pending) {
    const id = normalizeId(s);
    if (!id) continue;
    try {
      await apiFetch(APPROVE_PATH(id), { method: "POST" });
    } catch (e) {
      console.warn("approve failed for", s, e);
    }
  }
  createToast("Bulk approve finished", { type: "success" });
  fetchStudents();
};

if (logoutBtn) logoutBtn.onclick = () => {
  try { clearAuth(); } catch (e) {}
  window.location.href = "student-login.html";
};

/* ------------------ Init ------------------ */
(async function init() {
  showLoader();
  try {
    // fetch list (which will also call renderMealChartFromData if backend returned it)
    await fetchStudents();
    // ensure meal stats are loaded separately (authorized call)
    await loadMealStats();
  } catch (e) {
    console.error(e);
    createToast("Failed to initialize", { type: "error" });
  } finally {
    hideLoader();
  }
})();
