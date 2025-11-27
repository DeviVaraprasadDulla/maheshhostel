const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resultBox = document.getElementById("resultBox");

let html5Qrcode;
let scanning = false;

// API URLs
const SCAN_API = "https://hostel-erp-bef5.onrender.com/api/scan/qr/";
const MEAL_API = "https://hostel-erp-bef5.onrender.com/api/meal/action/";

// Token
const ACCESS_TOKEN = localStorage.getItem("access_token");

// Start scanner
startBtn.onclick = async () => {
  if (scanning) return;

  resultBox.innerHTML = "Waiting for QR scan...";
  scanning = true;

  html5Qrcode = new Html5Qrcode("reader");

  try {
    await html5Qrcode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (qrMessage) => {
        await html5Qrcode.stop();
        scanning = false;
        handleScan(qrMessage);
      }
    );
  } catch (error) {
    resultBox.innerHTML = `
      <div class="error-box">
        Unable to start scanner: ${error}
      </div>`;
    scanning = false;
  }
};

// Stop scanner
stopBtn.onclick = async () => {
  if (!scanning) return;

  await html5Qrcode.stop();
  scanning = false;

  resultBox.innerHTML = "Scanner stopped.";
};

// Handle scan result
async function handleScan(message) {
  let qrToken = message;

  try {
    const parsed = JSON.parse(message);
    qrToken = parsed.qr_token;
  } catch {}

  // Call scan API
  resultBox.innerHTML = "<b>Fetching student info...</b>";

  const res = await fetch(SCAN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ qr_token: qrToken }),
  });

  const data = await res.json();

  if (data.detail) {
    resultBox.innerHTML = `<p style="color:red;">${data.detail}</p>`;
    return;
  }

  displayStudent(data, qrToken);
}

// Display UI
function displayStudent(data, qrToken) {
  resultBox.innerHTML = `
    <div class="student-card">
      <img class="student-img" src="${data.student_image || ""}">
      <div>
        <p><b>${data.student_name}</b></p>
        <p>ET: ${data.et_number}</p>

        <div class="meal-buttons">
          ${mealButton("BREAKFAST", data.breakfast, qrToken)}
          ${mealButton("LUNCH", data.lunch, qrToken)}
          ${mealButton("DINNER", data.dinner, qrToken)}
        </div>
      </div>
    </div>
  `;

  attachMealEvents(qrToken);
}

// Create meal button based on backend state
function mealButton(label, state, qrToken) {
  const colors = {
    null: "#2563eb", // Not taken → Blue
    true: "#1abc9c", // Taken → Green
    false: "#e74c3c", // Blocked → Red
  };
  return `<button class="meal-btn" 
      style="background:${colors[state]}">
      ${label}
    </button>`;
}

// Attach actions
function attachMealEvents(qrToken) {
  document.querySelectorAll(".meal-btn").forEach((btn) => {
    btn.onclick = () => mealAction(btn.innerText.toLowerCase(), qrToken);
  });
}

// Perform meal update
async function mealAction(mealType, qrToken) {
  resultBox.innerHTML += `<p>Updating ${mealType}...</p>`;

  const res = await fetch(MEAL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qr_token: qrToken,
      action: mealType,
    }),
  });

  const data = await res.json();
  console.log(data);
  handleScan(qrToken);
} 

// Logout
function logout() {
  localStorage.clear();
  window.location.href = "./office-dashboard.html";
} 
document.getElementById("viewBtn").addEventListener("click", loadStats);
document.getElementById("closeModal").addEventListener("click", closeStatsModal);

async function loadStats() {
  

  try {
    const response = await fetch(
      "https://hostel-erp-bef5.onrender.com/api/warden/meal-stats/",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      alert("Failed to load stats!");
      return;
    }

    const data = await response.json();
    displayStats(data);
  } catch (error) {
    console.error(error);
    alert("Error loading stats");
  }
}

function displayStats(data) {
  const tbody = document.getElementById("statsBody");
  tbody.innerHTML = ""; // clear old data

  const rows = [
    data.today,
    data.yesterday
  ];

  rows.forEach(item => {
    const row = `
      <tr>
        <td>${item.date}</td>
        <td>${item.breakfast_count}</td>
        <td>${item.lunch_count}</td>
        <td>${item.dinner_count}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  openStatsModal();
}

function openStatsModal() {
  document.getElementById("statsModal").style.display = "flex";
}

function closeStatsModal() {
  document.getElementById("statsModal").style.display = "none";
} 
document.getElementById("attendenceBtn").addEventListener("click", () => {
  window.location.href = "attendence.html";
});


