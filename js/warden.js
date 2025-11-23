const scanBtn = document.getElementById("scanBtn");
const scannerDiv = document.getElementById("scanner");
const resultDiv = document.getElementById("result");

let html5QrcodeScanner;

// APIs
const SCAN_API = "https://hostel-erp-bef5.onrender.com/api/scan/qr/";
const MEAL_API = "https://hostel-erp-bef5.onrender.com/api/meal/action/";

// Token
const ACCESS_TOKEN = localStorage.getItem("access_token");
console.log("ACCESS TOKEN:", ACCESS_TOKEN);

scanBtn.addEventListener("click", startScanner);

function startScanner() {
    resultDiv.innerHTML = "";
    scannerDiv.style.display = "block";

    html5QrcodeScanner = new Html5Qrcode("scanner");

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async qrCodeMessage => {

            await html5QrcodeScanner.stop();
            scannerDiv.style.display = "none";

            let qrToken = "";

            try {
                const parsed = JSON.parse(qrCodeMessage);
                qrToken = parsed.qr_token;
            } catch {
                qrToken = qrCodeMessage;
            }

            console.log("Scanned Token:", qrToken);

            refreshStudent(qrToken);
        },
        () => {}
    ).catch(err => console.error("Camera error:", err));
}

/** 🔄 Refresh UI using scan API */
async function refreshStudent(qrToken) {
    if (!ACCESS_TOKEN) {
        resultDiv.innerHTML = `<p style="color:red;">Token expired. Login again.</p>`;
        return;
    }

    resultDiv.innerHTML = "<p><b>Loading student info...</b></p>";

    try {
        const res = await fetch(SCAN_API, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ qr_token: qrToken })
        });

        const data = await res.json();
        console.log("Scan API Response:", data);

        if (data.detail) {
            resultDiv.innerHTML = `<p style="color:red;">${data.detail}</p>`;
            return;
        }

        displayStudent(data, qrToken);

    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<p style="color:red;">Server error</p>`;
    }
}

/** 🔥 Meal Update Handler */
async function updateMeal(mealType, qrToken) {
    setLoading(mealType, true);

    try {
        const res = await fetch(MEAL_API, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                qr_token: qrToken,
                action: mealType
            })
        });

        const result = await res.json();
        console.log("Meal API Response:", result);

        // After meal update → fetch fresh data from scan API
        await refreshStudent(qrToken);

    } catch (err) {
        console.error("Meal API Error:", err);
        alert("Something went wrong!");
    }

    setLoading(mealType, false);
}

/** ⏳ Loading text */
function setLoading(mealType, isLoading) {
    const btn = document.getElementById(mealType + "Btn");
    if (!btn) return;

    btn.innerText = isLoading ? "Updating..." : mealType.toUpperCase();
    btn.disabled = isLoading;
}

/** 🎨 Final UI Rendering */
function displayStudent(data, qrToken) {
    resultDiv.innerHTML = `
        <div class="student-card">
            <img id="studentImage" class="student-img" />

            <p><b>Name:</b> <span id="studentName"></span></p>
            <p><b>ET No:</b> <span id="studentEt"></span></p>

            <div class="meal-buttons">
                <button id="breakfastBtn">BREAKFAST</button>
                <button id="lunchBtn">LUNCH</button>
                <button id="dinnerBtn">DINNER</button>
            </div>
        </div>
    `;

    // Fill details
    document.getElementById("studentName").innerText = data.student_name;
    document.getElementById("studentEt").innerText = data.et_number;

    const img = document.getElementById("studentImage");
    if (data.student_image) {
        img.src = data.student_image;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }

    // Colors ONLY from backend
    setMealColor("breakfast", data.breakfast);
    setMealColor("lunch", data.lunch);
    setMealColor("dinner", data.dinner);

    // Assign click handlers
    document.getElementById("breakfastBtn").onclick = () => updateMeal("breakfast", qrToken);
    document.getElementById("lunchBtn").onclick = () => updateMeal("lunch", qrToken);
    document.getElementById("dinnerBtn").onclick = () => updateMeal("dinner", qrToken);
}

/** 🎨 Meal Button Color */
function setMealColor(mealType, scanned) {
    const btn = document.getElementById(mealType + "Btn");

    // null → BLUE → ENABLED
    if (scanned === null) {
        btn.style.background = "#3498db"; // blue
        btn.style.color = "white";
        btn.disabled = false;
        return;
    }

    // true → GREEN → DISABLED
    if (scanned === true) {
        btn.style.background = "#28a745"; // green
        btn.style.color = "white";
        btn.disabled = true;
        return;
    }

    // false → RED → DISABLED
    if (scanned === false) {
        btn.style.background = "#e74c3c"; // red
        btn.style.color = "white";
        btn.disabled = true;  // <-- disable here
        return;
    }
}


