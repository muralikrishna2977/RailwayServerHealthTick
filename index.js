import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Setup
let serviceAccount;

if (process.env.PRIVATE_KEY) {
  serviceAccount = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
  };
} else {
  const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Express App
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("HealthTick API is running");
});

app.get("/api/getUsers", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/addBooking", async (req, res) => {
  try {
    const { date, time, recurring, clientName, phone, callType } = req.body;
    if (!date || !time || !clientName || !phone || !callType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const docRef = await db.collection("bookings").add({
      date,
      time,
      recurring,
      clientName,
      phone,
      callType,
    });

    res.status(200).json({ message: "Booking added", id: docRef.id });
  } catch (error) {
    console.error("Error adding booking:", error);
    res.status(500).json({ message: "Failed to add booking" });
  }
});

app.get("/api/getBookings", async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").get();
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

app.delete("/api/deleteBookings/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection("bookings").doc(id).delete();
    res.status(200).json({ message: "Booking deleted", id });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Failed to delete booking" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
