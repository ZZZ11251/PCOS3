var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
var firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
var db = (0, import_firestore.initializeFirestore)(firebaseApp, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(import_express.default.json());
app.post("/api/submissions", async (req, res) => {
  try {
    const payload = req.body;
    const docRef = await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "submissions"), payload);
    res.status(201).json({ id: docRef.id, success: true });
  } catch (err) {
    console.error("Backend failed to save to Firestore:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});
app.get("/api/submissions", async (req, res) => {
  try {
    const q = (0, import_firestore.query)((0, import_firestore.collection)(db, "submissions"), (0, import_firestore.orderBy)("createdAt", "desc"));
    const querySnapshot = await (0, import_firestore.getDocs)(q);
    const fetched = [];
    querySnapshot.forEach((doc2) => {
      fetched.push({ id: doc2.id, ...doc2.data() });
    });
    res.status(200).json(fetched);
  } catch (err) {
    console.error("Backend failed to fetch from Firestore:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});
app.patch("/api/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;
    const docRef = (0, import_firestore.doc)(db, "submissions", id);
    await (0, import_firestore.updateDoc)(docRef, updatePayload);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Backend failed to update Firestore doc:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});
app.delete("/api/submissions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = (0, import_firestore.doc)(db, "submissions", id);
    await (0, import_firestore.deleteDoc)(docRef);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Backend failed to delete Firestore doc:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}
main().catch((err) => {
  console.error("Server startup error:", err);
});
//# sourceMappingURL=server.cjs.map
