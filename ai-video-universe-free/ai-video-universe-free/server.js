require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const COMFYUI_URL = (process.env.COMFYUI_URL || "").replace(/\/$/, "");
const WORKFLOW_PATH = process.env.COMFYUI_WORKFLOW || "";
const OUTPUT_DIR = path.join(__dirname, "public", "generated");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 100 * 1024 * 1024 }
});
fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
app.use(express.static(path.join(__dirname, "public")));
app.use("/generated", express.static(OUTPUT_DIR));

const jobs = new Map();

function replacePlaceholders(value, fields) {
  if (Array.isArray(value)) return value.map(v => replacePlaceholders(v, fields));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = replacePlaceholders(value[key], fields);
    return value;
  }
  if (typeof value === "string") {
    if (value === "__PROMPT__") return fields.prompt;
    if (value === "__NEGATIVE_PROMPT__") return fields.negativePrompt;
    if (value === "__SEED__") return fields.seed ? Number(fields.seed) : Math.floor(Math.random() * 1e9);
  }
  return value;
}

async function comfyRequest(endpoint, options = {}) {
  const response = await fetch(`${COMFYUI_URL}${endpoint}`, options);
  if (!response.ok) throw new Error(`ComfyUI returned HTTP ${response.status}`);
  return response;
}

app.get("/api/status", async (_req, res) => {
  if (!COMFYUI_URL) return res.json({ comfyui: false });
  try {
    const r = await fetch(`${COMFYUI_URL}/system_stats`);
    res.json({ comfyui: r.ok, comfyuiUrl: COMFYUI_URL });
  } catch {
    res.json({ comfyui: false, comfyuiUrl: COMFYUI_URL });
  }
});

app.post("/api/generate", upload.single("source"), async (req, res) => {
  let sourcePath = req.file?.path;
  try {
    if (!COMFYUI_URL || !WORKFLOW_PATH) {
      return res.status(503).json({
        error: "Free local generation is not configured. Set COMFYUI_URL and COMFYUI_WORKFLOW in .env, then restart the server."
      });
    }
    const { model, mode, prompt, negativePrompt = "", seed = "", advanced = "{}" } = req.body;
    if (!model || !prompt) return res.status(400).json({ error: "Model and prompt are required." });
    if (mode !== "text") {
      return res.status(400).json({
        error: "This generic starter only submits text workflows. Add the correct image/video upload nodes to your ComfyUI workflow before enabling image-to-video or video-to-video."
      });
    }
    let extra;
    try { extra = JSON.parse(advanced || "{}"); } catch { return res.status(400).json({ error: "Advanced parameters must be valid JSON." }); }
    if (!fs.existsSync(WORKFLOW_PATH)) return res.status(500).json({ error: `Workflow file not found: ${WORKFLOW_PATH}` });
    const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"));
    const fields = { prompt, negativePrompt, seed };
    const graph = replacePlaceholders(workflow, fields);
    const clientId = crypto.randomUUID();
    const response = await comfyRequest("/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: graph, client_id: clientId })
    });
    const data = await response.json();
    if (!data.prompt_id) throw new Error("ComfyUI did not return a prompt_id. Check your workflow API JSON.");
    jobs.set(data.prompt_id, { id: data.prompt_id, status: "queued", createdAt: new Date().toISOString(), model, prompt });
    res.json({ id: data.prompt_id, status: "queued", message: "Queued on your local ComfyUI server. Keep the local server running." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not submit the local generation." });
  } finally {
    if (sourcePath && fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await comfyRequest(`/history/${encodeURIComponent(id)}`);
    const history = await r.json();
    const entry = history[id];
    if (!entry) return res.json({ id, status: "processing" });
    const outputs = entry.outputs || {};
    for (const node of Object.values(outputs)) {
      for (const file of (node.videos || node.gifs || node.images || [])) {
        const params = new URLSearchParams({ filename: file.filename, subfolder: file.subfolder || "", type: file.type || "output" });
        const view = await comfyRequest(`/view?${params.toString()}`);
        const ext = path.extname(file.filename) || ".mp4";
        const outName = `${id}${ext}`;
        const outPath = path.join(OUTPUT_DIR, outName);
        fs.writeFileSync(outPath, Buffer.from(await view.arrayBuffer()));
        return res.json({ id, status: "completed", videoUrl: `/generated/${encodeURIComponent(outName)}` });
      }
    }
    return res.json({ id, status: entry.status?.status_str === "error" ? "failed" : "processing" });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`AI Video Universe running at http://localhost:${PORT}`));
