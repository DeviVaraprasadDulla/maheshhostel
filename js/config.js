// config.js

export const ENV = "production"; // "development" | "production"

const CONFIG = {
  development: {
    API_BASE: "http://localhost:8000/api",
  },
  production: {
    API_BASE: "https://hostel-erp-bef5.onrender.com/api",
  },
};

export const API_BASE = CONFIG[ENV].API_BASE;
