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
var app = (0, import_express.default)();
var PORT = 3e3;
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DATA_FILE = import_path.default.join(DATA_DIR, "submissions.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
if (!import_fs.default.existsSync(DATA_FILE)) {
  import_fs.default.writeFileSync(DATA_FILE, JSON.stringify([]), "utf-8");
}
var readSubmissions = () => {
  try {
    const raw = import_fs.default.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("\u8BFB\u53D6\u672C\u5730\u6570\u636E\u5931\u8D25:", e);
    return [];
  }
};
var writeSubmissions = (data) => {
  try {
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("\u5199\u5165\u672C\u5730\u6570\u636E\u5931\u8D25:", e);
  }
};
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
app.use(import_express.default.json({ limit: "10mb" }));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", gateway: "PCOS Independent API Gateway via Cloudflare" });
});
app.post("/api/submissions", (req, res) => {
  try {
    const payload = req.body;
    const submissions = readSubmissions();
    const newDoc = {
      id: "doc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...payload
    };
    submissions.unshift(newDoc);
    writeSubmissions(submissions);
    console.log(`[\u81EA\u6D4B\u6863\u6848\u63D0\u4EA4\u6210\u529F] \u7F16\u53F7: ${newDoc.id}`);
    res.status(201).json({ id: newDoc.id, success: true });
  } catch (err) {
    console.error("\u63D0\u4EA4\u6863\u6848\u5931\u8D25:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});
app.get("/api/submissions", (req, res) => {
  try {
    const submissions = readSubmissions();
    submissions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.status(200).json(submissions);
  } catch (err) {
    console.error("\u8BFB\u53D6\u6863\u6848\u5217\u8868\u5931\u8D25:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});
app.patch("/api/submissions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;
    const submissions = readSubmissions();
    const index = submissions.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "\u6863\u6848\u672A\u627E\u5230", success: false });
    }
    submissions[index] = { ...submissions[index], ...updatePayload };
    writeSubmissions(submissions);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("\u66F4\u65B0\u6863\u6848\u5931\u8D25:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});
app.delete("/api/submissions/:id", (req, res) => {
  try {
    const { id } = req.params;
    let submissions = readSubmissions();
    submissions = submissions.filter((s) => s.id !== id);
    writeSubmissions(submissions);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("\u5220\u9664\u6863\u6848\u5931\u8D25:", err);
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
    console.log(`PCOS Independent Server listening on http://0.0.0.0:${PORT}`);
  });
}
main().catch((err) => {
  console.error("\u670D\u52A1\u5668\u542F\u52A8\u5931\u8D25:", err);
});
//# sourceMappingURL=server.cjs.map
