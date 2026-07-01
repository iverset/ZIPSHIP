import { Router } from "express";
import {
  LoginWithTokenBody,
  GetRepoParams,
  DeleteRepoParams,
  ListContentsParams,
  PushFileParams,
  PushFileBody,
  ListBranchesParams,
  ListCommitsParams,
  ListReposQueryParams,
  CreateRepoBody,
} from "@workspace/api-zod";

const router = Router();

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
    res.status(401).json({ error: "Not authenticated. Please connect a GitHub token." });
    return null;
  }
  return token;
}

router.post("/auth", async (req: any, res: any) => {
  const parsed = LoginWithTokenBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { token } = parsed.data;

  const ghRes = await ghFetch(token, "/user");
  if (!ghRes.ok) {
    return res.status(401).json({ error: "Invalid GitHub token" });
  }
  const user = await ghRes.json() as any;
  req.session.githubToken = token;

  return res.json({
    login: user.login,
    id: user.id,
    name: user.name ?? null,
    avatar_url: user.avatar_url,
    public_repos: user.public_repos,
    followers: user.followers,
    following: user.following,
    bio: user.bio ?? null,
    location: user.location ?? null,
    blog: user.blog ?? null,
    company: user.company ?? null,
    email: user.email ?? null,
    html_url: user.html_url,
  });
});

router.delete("/auth", (req: any, res: any) => {
  req.session.destroy(() => {
    res.status(204).end();
  });
});

router.get("/me", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const ghRes = await ghFetch(token, "/user");
  if (!ghRes.ok) {
    req.session.githubToken = undefined;
    return res.status(401).json({ error: "Token invalid or expired" });
  }
  const user = await ghRes.json() as any;
  return res.json({
    login: user.login,
    id: user.id,
    name: user.name ?? null,
    avatar_url: user.avatar_url,
    public_repos: user.public_repos,
    followers: user.followers,
    following: user.following,
    bio: user.bio ?? null,
    location: user.location ?? null,
    blog: user.blog ?? null,
    company: user.company ?? null,
    email: user.email ?? null,
    html_url: user.html_url,
  });
});

router.get("/repos", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const qParsed = ListReposQueryParams.safeParse(req.query);
  const sort = qParsed.success ? (qParsed.data.sort ?? "updated") : "updated";
  const per_page = qParsed.success ? (qParsed.data.per_page ?? 30) : 30;

  const ghRes = await ghFetch(token, `/user/repos?sort=${sort}&per_page=${per_page}&affiliation=owner,collaborator`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "GitHub API error" });
  }
  const repos = await ghRes.json() as any[];
  return res.json(repos.map(mapRepo));
});

router.post("/repos", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = CreateRepoBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
  }
  const { name, description, private: isPrivate, auto_init } = parsed.data;

  const ghRes = await ghFetch(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, description, private: isPrivate, auto_init }),
  });
  if (!ghRes.ok) {
    const err = await ghRes.json() as any;
    return res.status(ghRes.status).json({ error: err.message ?? "GitHub API error" });
  }
  const repo = await ghRes.json() as any;
  return res.status(201).json(mapRepo(repo));
});

router.get("/repos/:owner/:repo", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = GetRepoParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = parsed.data;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Repository not found" });
  }
  const data = await ghRes.json() as any;
  return res.json(mapRepo(data));
});

router.delete("/repos/:owner/:repo", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = DeleteRepoParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = parsed.data;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}`, { method: "DELETE" });
  if (!ghRes.ok && ghRes.status !== 204) {
    return res.status(ghRes.status).json({ error: "Failed to delete repository" });
  }
  return res.status(204).end();
});

router.get("/repos/:owner/:repo/contents", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = ListContentsParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = parsed.data;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}/contents/`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch contents" });
  }
  const data = await ghRes.json() as any;
  const items = Array.isArray(data) ? data : [data];
  return res.json(
    items.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size ?? 0,
      sha: item.sha,
      html_url: item.html_url ?? null,
      download_url: item.download_url ?? null,
    }))
  );
});

router.post("/repos/:owner/:repo/push", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const paramsParsed = PushFileParams.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = paramsParsed.data;

  const bodyParsed = PushFileBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: bodyParsed.error.issues });
  }
  const { path, content, message, branch, sha } = bodyParsed.data;

  const base64Content = Buffer.from(content, "utf-8").toString("base64");

  const payload: any = { message, content: base64Content };
  if (branch) payload.branch = branch;
  if (sha) payload.sha = sha;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!ghRes.ok) {
    const err = await ghRes.json() as any;
    return res.status(ghRes.status).json({ error: err.message ?? "Failed to push file" });
  }
  const data = await ghRes.json() as any;
  return res.json({
    commit_sha: data.commit.sha,
    commit_url: data.commit.html_url,
    content_path: data.content.path,
  });
});

router.get("/repos/:owner/:repo/branches", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = ListBranchesParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = parsed.data;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}/branches`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch branches" });
  }
  const data = await ghRes.json() as any[];
  return res.json(
    data.map((b: any) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected ?? false,
    }))
  );
});

router.get("/repos/:owner/:repo/commits", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const parsed = ListCommitsParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid params" });
  }
  const { owner, repo } = parsed.data;

  const ghRes = await ghFetch(token, `/repos/${owner}/${repo}/commits?per_page=20`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch commits" });
  }
  const data = await ghRes.json() as any[];
  return res.json(
    data.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author_name: c.commit.author?.name ?? c.author?.login ?? "Unknown",
      author_date: c.commit.author?.date ?? "",
      html_url: c.html_url,
      author_avatar: c.author?.avatar_url ?? null,
    }))
  );
});

router.get("/stats", async (req: any, res: any) => {
  const token = requireToken(req, res);
  if (!token) return;

  const ghRes = await ghFetch(token, `/user/repos?per_page=100&affiliation=owner`);
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: "Failed to fetch stats" });
  }
  const repos = await ghRes.json() as any[];

  const total_stars = repos.reduce((sum: number, r: any) => sum + (r.stargazers_count ?? 0), 0);
  const total_forks = repos.reduce((sum: number, r: any) => sum + (r.forks_count ?? 0), 0);
  const public_repos = repos.filter((r: any) => !r.private).length;
  const private_repos = repos.filter((r: any) => r.private).length;

  const langMap: Record<string, number> = {};
  for (const r of repos) {
    if (r.language) {
      langMap[r.language] = (langMap[r.language] ?? 0) + 1;
    }
  }
  const languages = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([language, count]) => ({ language, count }));

  return res.json({
    total_repos: repos.length,
    total_stars,
    total_forks,
    public_repos,
    private_repos,
    languages,
  });
});

function mapRepo(r: any) {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: r.private ?? false,
    html_url: r.html_url,
    description: r.description ?? null,
    fork: r.fork ?? false,
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
    pushed_at: r.pushed_at ?? null,
    default_branch: r.default_branch ?? "main",
    stargazers_count: r.stargazers_count ?? 0,
    forks_count: r.forks_count ?? 0,
    open_issues_count: r.open_issues_count ?? 0,
    language: r.language ?? null,
    owner: {
      login: r.owner?.login ?? "",
      avatar_url: r.owner?.avatar_url ?? "",
    },
    clone_url: r.clone_url ?? null,
    size: r.size ?? 0,
  };
}

export default router;
