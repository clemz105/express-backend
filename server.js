require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
// const { updateWalletBalance } = require('./wallet'); // Adjust path if necessary


const app = express();
const PORT = process.env.PORT || 5000;

// Validate required environment variables
if (!process.env.VTPASS_API_KEY || !process.env.VTPASS_SECRET_KEY) {
  console.error("❌ Missing VTPASS API credentials in .env file");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// 🔹 Global Axios Interceptor to Log Errorsa
axios.interceptors.request.use(
  (config) => config,
  (error) => {
    console.error("❌ Axios Request Error:", error.message);
    return Promise.reject(error);
  }
);

// 🔹 Generate Unique Request ID
const generateRequestId = () => `REQ-${crypto.randomUUID()}`;

// 🔹 Simulated Wallet Update Function (Replace with actual logic)
const updateWalletBalance = async (amount, rollback = false) => {
  console.log(rollback ? `🔄 Rolling back ₦${amount}...` : `💰 Deducting ₦${amount}...`);
};

// 🔹 VTpass API Transaction Handler
const processTransaction = async (serviceID, amount, phone, variation_code, billersCode) => {
  const request_id = generateRequestId();

  try {
    const response = await axios.post(
      "https://vtpass.com/api/pay",
      { request_id, serviceID, amount, phone, variation_code, billersCode },
      {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    // console.log(`✅ Transaction processed successfully:`, JSON.stringify(response.data, null, 2));


    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.error || error.response.data?.message || "Transaction failed"
      );
    }
    throw new Error("Network error or VTpass API unreachable");
  }
};

// 📌 Airtime Purchase Route
app.post("/api/airtime", async (req, res) => {
  const { serviceID, amount, phone } = req.body;

  if (!serviceID || !phone || !amount) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const result = await processTransaction(serviceID, amount, phone);

    if (result?.content?.transactions?.status === "delivered") {
      return res.json({
        success: true,
        message: "Airtime purchase successful!",
        data: result,
      });
    }

    return res.status(400).json({
      success: false,
      error: "Transaction failed",
      details: result.content?.transactions?.response_message || "Unknown error",
    });
  } catch (error) {
    console.error("❌ Airtime Purchase Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/data", async (req, res) => {
  const { serviceID, amount, phone, variation_code } = req.body;

  if (!serviceID || !phone || !amount || !variation_code) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // console.log("📡 Incoming Data Purchase Request:", { serviceID, amount, phone, variation_code });

  try {
    await updateWalletBalance(amount);

    const result = await processTransaction(serviceID, amount, phone, variation_code);
    // console.log("✅ VTpass API Response:", result);

    if (result.content?.transactions?.status === "delivered") {
      return res.json({
        success: true,
        message: `Data purchase successful! ${amount} MB sent to ${phone}`,
        data: result,
      });
    } else {
      await updateWalletBalance(amount, true);
      return res.status(400).json({
        success: false,
        error: "Transaction failed",
        details: result.content?.transactions?.response_message || "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Data Purchase Error:", error.message);
    await updateWalletBalance(amount, true);

    return res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
});


// 📌 DSTV Subscription Payment Route (Fixed)
app.post("/api/dstv", async (req, res) => {
  const { serviceID, amount, phone, variation_code, billersCode, smartCard } = req.body;
  const validBillersCode = billersCode || smartCard;
  if (!serviceID || !phone || !amount || !variation_code || !validBillersCode) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }
  try {
    await updateWalletBalance(amount);
    const result = await processTransaction(serviceID, amount, phone, variation_code, validBillersCode);
    if (result?.content?.transactions?.status === "delivered") {
      return res.json({ success: true, message: `DSTV subscription successful for smartcard ${validBillersCode}`, data: result });
    } else {
      await updateWalletBalance(amount, true);
      return res.status(400).json({ success: false, error: "Transaction failed", details: result?.content?.transactions?.response_message || "Unknown error" });
    }
  } catch (error) {
    console.error("❌ DSTV Payment Error:", error.message);
    await updateWalletBalance(amount, true);
    return res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
});


app.post("/api/gotv", async (req, res) => {
  const { serviceID, amount, phone, variation_code, billersCode, smartCard } = req.body;
  const validBillersCode = billersCode || smartCard;

  if (!serviceID || !phone || !amount || !variation_code || !validBillersCode) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    await updateWalletBalance(amount);
    const result = await processTransaction(serviceID, amount, phone, variation_code, validBillersCode);

    if (result?.content?.transactions?.status === "delivered") {
      return res.json({
        success: true,
        message: `GoTV subscription successful for smartcard ${validBillersCode}`,
        data: result,
      });
    } else {
      await updateWalletBalance(amount, true);
      return res.status(400).json({
        success: false,
        error: "Transaction failed",
        details: result?.content?.transactions?.response_message || "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ GoTV Payment Error:", error.message);
    await updateWalletBalance(amount, true);
    return res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
});



// 📌 StarTimes Subscription Payment Route
app.post("/api/startimes", async (req, res) => {
  const { serviceID, amount, phone, variation_code, billersCode, smartCard } = req.body;
  const validBillersCode = billersCode || smartCard;

  // Validate required fields
  if (!serviceID || !phone || !amount || !variation_code || !validBillersCode) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    // Deduct wallet balance before processing transaction
    await updateWalletBalance(amount);

    // Process StarTimes subscription
    const result = await processTransaction(serviceID, amount, phone, variation_code, validBillersCode);

    if (result?.content?.transactions?.status === "delivered") {
      return res.json({
        success: true,
        message: `StarTimes subscription successful for smartcard ${validBillersCode}`,
        data: result,
      });
    } else {
      // Refund wallet balance if the transaction fails
      await updateWalletBalance(amount, true);
      return res.status(400).json({
        success: false,
        error: "Transaction failed",
        details: result?.content?.transactions?.response_message || "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ StarTimes Payment Error:", error.message);
    
    // Refund wallet balance on error
    await updateWalletBalance(amount, true);
    
    return res.status(500).json({ 
      success: false, 
      error: "Server Error", 
      message: error.message 
    });
  }
});


app.post("/api/showmax", async (req, res) => {
  const { serviceID, amount, phone, variation_code } = req.body;

  if (!serviceID || !phone || !amount || !variation_code) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    await updateWalletBalance(amount);

    const result = await processTransaction(serviceID, amount, phone, variation_code);

    if (result?.content?.transactions?.status === "delivered") {
      return res.json({ success: true, message: `Showmax subscription successful!`, data: result });
    } else {
      await updateWalletBalance(amount, true);
      return res.status(400).json({ success: false, error: "Transaction failed", details: result });
    }
  } catch (error) {
    await updateWalletBalance(amount, true);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
