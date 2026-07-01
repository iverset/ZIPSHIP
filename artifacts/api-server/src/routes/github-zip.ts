import { Router } from "express";
import multer from "multer";
import AdmZip from "adm-zip";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const GH_API = "https://api.github.com";

async function ghFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

function requireToken(req: any, res: any): string | null {
  const token = req.session?.githubToken;
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }
  return token;
}

router.post("/repos/:owner/:repo/push-zip", upload.single("file"), async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const { owner, repo } = req.params;
  const message: string = req.body.message || "Upload files via GitPush";
  const branch: string | undefined = req.body.branch || undefined;
  const stripRoot: boolean = req.body.strip_root === "true";

  if (!req.file) {
    return res.status(400).json({ error: "No ZIP file provided" });
  }

  if (!req.file.originalname.toLowerCase().endsWith(".zip") &&
      req.file.mimetype !== "application/zip" &&
      req.file.mimetype !== "application/x-zip-compressed") {
    return res.status(400).json({ error: "File must be a ZIP archive" });
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(req.file.buffer);
  } catch {
    return res.status(400).json({ error: "Invalid or corrupt ZIP file" });
  }

  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  if (entries.length === 0) {
    return res.status(400).json({ error: "ZIP file contains no files" });
  }

  if (entries.length > 200) {
    return res.status(400).json({ error: "ZIP file contains too many files (max 200)" });
  }

  const repoRes = await ghFetch(token, `/repos/${owner}/${repo}`);
  if (!repoRes.ok) {
    return res.status(repoRes.status).json({ error: "Repository not found" });
  }
  const repoData = await repoRes.json() as any;
  const defaultBranch = branch || repoData.default_branch;

  const pushed: string[] = [];
  const skipped: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const entry of entries) {
    const entryName = entry.entryName;

    if (entryName.startsWith("__MACOSX") || entryName.startsWith(".DS_Store")) {
      skipped.push(entryName);
      continue;
    }

    let filePath = entryName;
    if (stripRoot) {
      const parts = filePath.split("/");
      if (parts.length > 1) {
        filePath = parts.slice(1).join("/");
      }
    }

    if (!filePath) {
      skipped.push(entryName);
      continue;
    }

    const fileData = entry.getData();
    if (fileData.length > 100 * 1024 * 1024) {
      skipped.push(`${entryName} (too large, >100MB)`);
      continue;
    }

    const base64Content = fileData.toString("base64");

    const existingRes = await ghFetch(token, `/repos/${owner}/${repo}/contents/${filePath}?ref=${defaultBranch}`);
    let existingSha: string | undefined;
    if (existingRes.ok) {
      const existing = await existingRes.json() as any;
      existingSha = existing.sha;
    }

    const payload: any = {
      message: `${message} — ${filePath}`,
      content: base64Content,
      branch: defaultBranch,
    };
    if (existingSha) payload.sha = existingSha;

    const pushRes = await ghFetch(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (pushRes.ok) {
      pushed.push(filePath);
    } else {
      const err = await pushRes.json() as any;
      failed.push({ path: filePath, error: err.message ?? "Unknown error" });
    }
  }

  return res.json({
    pushed_count: pushed.length,
    skipped_count: skipped.length,
    failed_count: failed.length,
    pushed,
    skipped,
    failed,
    branch: defaultBranch,
  });
});

export default router;
