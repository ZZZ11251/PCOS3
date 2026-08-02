import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// 本地轻量高性能持久化存储引擎 (摆脱 Google Cloud 外部账号风控与网络超时)
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]), "utf-8");
}

const readSubmissions = (): any[] => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("读取本地数据失败:", e);
    return [];
  }
};

const writeSubmissions = (data: any[]) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("写入本地数据失败:", e);
  }
};

// 跨域支持 (开启 CORS 支持 Cloudflare 中转代理)
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

app.use(express.json({ limit: "10mb" }));

// 健康检查接口
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", gateway: "PCOS Independent API Gateway via Cloudflare" });
});

// API: POST /api/submissions - 创建患者档案
app.post("/api/submissions", (req, res) => {
  try {
    const payload = req.body;
    const submissions = readSubmissions();
    const newDoc = {
      id: "doc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      ...payload
    };
    submissions.unshift(newDoc);
    writeSubmissions(submissions);
    console.log(`[自测档案提交成功] 编号: ${newDoc.id}`);
    res.status(201).json({ id: newDoc.id, success: true });
  } catch (err: any) {
    console.error("提交档案失败:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// API: GET /api/submissions - 获取全量患者档案
app.get("/api/submissions", (req, res) => {
  try {
    const submissions = readSubmissions();
    // 确保按创建时间倒序排列
    submissions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.status(200).json(submissions);
  } catch (err: any) {
    console.error("读取档案列表失败:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// API: PATCH /api/submissions/:id - 更新患者档案 (例如医生评语或随访反馈)
app.patch("/api/submissions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;
    const submissions = readSubmissions();
    const index = submissions.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "档案未找到", success: false });
    }
    submissions[index] = { ...submissions[index], ...updatePayload };
    writeSubmissions(submissions);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("更新档案失败:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// API: DELETE /api/submissions/:id - 删除患者档案
app.delete("/api/submissions/:id", (req, res) => {
  try {
    const { id } = req.params;
    let submissions = readSubmissions();
    submissions = submissions.filter((s) => s.id !== id);
    writeSubmissions(submissions);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("删除档案失败:", err);
    res.status(500).json({ error: err.message || String(err), success: false });
  }
});

// 托管前端页面 (Vite Dev 或 生产静态资源)
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PCOS Independent Server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("服务器启动失败:", err);
});
