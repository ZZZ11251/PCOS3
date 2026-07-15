import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, deleteDoc } from "firebase/firestore";

// Read firebase config from the root directory
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase App
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore specifying custom database ID and forcing long-polling for stability
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

const app = express();
const PORT = 3000;

app.use(express.json());

// API: POST /api/submissions - Create a new submission
app.post("/api/submissions", async (req, res) => {
  try {
    const payload = req.body;
    const docRef = await addDoc(collection(db, "submissions"), payload);
    res.status(201).json({ id: docRef.id, success: true });
  } catch (err: any) {
    console.error("Backend failed to save to Firestore:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// API: GET /api/submissions - Retrieve all submissions
app.get("/api/submissions", async (req, res) => {
  try {
    const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const fetched: any[] = [];
    querySnapshot.forEach((doc) => {
      fetched.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(fetched);
  } catch (err: any) {
    console.error("Backend failed to fetch from Firestore:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// API: PATCH /api/submissions/:id - Update submission (e.g. feedback)
app.patch("/api/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;
    const docRef = doc(db, "submissions", id);
    await updateDoc(docRef, updatePayload);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Backend failed to update Firestore doc:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// API: DELETE /api/submissions/:id - Delete submission
app.delete("/api/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = doc(db, "submissions", id);
    await deleteDoc(docRef);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Backend failed to delete Firestore doc:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// Serve frontend with Vite dev middleware or static dist
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support single page application routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Server startup error:", err);
});
