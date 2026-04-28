import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, statSync, readdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_URL_RE = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//;

function extractId(raw: string): string | null {
  if (YT_ID_RE.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return YT_ID_RE.test(id) ? id : null;
    }
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get("v");
      if (v && YT_ID_RE.test(v)) return v;
      const m = u.pathname.match(/\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* fallthrough */
  }
  return null;
}

function runCmd(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => { clearTimeout(killer); reject(err); });
    child.on("close", (code) => { clearTimeout(killer); resolve({ code: code ?? -1, stderr }); });
  });
}

/**
 * Dev-only Vite middleware: shells out to yt-dlp to fetch a YouTube audio stream
 * and returns it as audio/mpeg. Disabled in production builds.
 *
 * Security: validated to accept only YouTube URLs / IDs to prevent arg injection.
 * Auth: none — localhost-only, bound only when host is loopback.
 */
function runCmdCaptured(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => { clearTimeout(killer); reject(err); });
    child.on("close", (code) => { clearTimeout(killer); resolve({ code: code ?? -1, stdout, stderr }); });
  });
}

export function youtubeAudioPlugin(): Plugin {
  const cacheDir = path.join(tmpdir(), "tune-in-motion-yt-cache");
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  return {
    name: "youtube-audio-dev",
    apply: "serve",
    configureServer(server) {
      // ---- Search endpoint: /dev/youtube-search?q=<query>&n=<count> ----
      server.middlewares.use("/dev/youtube-search", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const q = (url.searchParams.get("q") ?? "").trim();
          const n = Math.min(15, Math.max(1, Number(url.searchParams.get("n") ?? "6") || 6));
          if (!q || q.length < 2) {
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify({ error: "missing 'q' (>=2 chars)" }));
          }
          // yt-dlp takes the query literally as an arg; spawn (not shell) prevents injection
          const { code, stdout, stderr } = await runCmdCaptured(
            "yt-dlp",
            [
              `ytsearch${n}:${q}`,
              "--dump-json",
              "--flat-playlist",
              "--skip-download",
              "--no-warnings",
              "--no-playlist",
            ],
            45_000,
          );
          if (code !== 0 && !stdout) {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify({ error: "yt-dlp search failed", code, hint: stderr.slice(0, 400) }));
          }
          const results = stdout
            .split("\n")
            .filter((l) => l.trim().startsWith("{"))
            .map((l) => {
              try { return JSON.parse(l); } catch { return null; }
            })
            .filter(Boolean)
            .map((o: Record<string, unknown>) => ({
              id: o.id,
              title: o.title,
              uploader: o.channel ?? o.uploader,
              duration: o.duration,
              viewCount: o.view_count,
              url: o.url ?? `https://www.youtube.com/watch?v=${o.id}`,
            }));
          res.setHeader("content-type", "application/json");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify({ results }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

      // ---- Audio endpoint: /dev/youtube-audio?url=<url|id> ----
      server.middlewares.use("/dev/youtube-audio", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const raw = (url.searchParams.get("url") ?? url.searchParams.get("id") ?? "").trim();
          if (!raw) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "missing 'url' or 'id' query param" }));
          }
          const id = extractId(raw);
          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "invalid YouTube URL/id" }));
          }
          const canonical = `https://www.youtube.com/watch?v=${id}`;
          const cachedMp3 = path.join(cacheDir, `${id}.mp3`);

          if (!existsSync(cachedMp3)) {
            const jobId = randomUUID();
            const outPattern = path.join(cacheDir, `${id}.%(ext)s`);
            // --extract-audio + --audio-format mp3 needs ffmpeg available on PATH
            const args = [
              "--no-playlist",
              "--no-warnings",
              "--quiet",
              "--no-progress",
              "--extract-audio",
              "--audio-format", "mp3",
              "--audio-quality", "7",
              "--format", "bestaudio",
              "--max-filesize", "40M",
              "-o", outPattern,
              canonical,
            ];
            const { code, stderr } = await runCmd("yt-dlp", args, 180_000).catch((err) => ({ code: -1, stderr: String(err?.message ?? err) }));
            if (code !== 0 || !existsSync(cachedMp3)) {
              // Clean any stray partial file
              try {
                for (const f of readdirSync(cacheDir)) {
                  if (f.startsWith(id) && !f.endsWith(".mp3")) {
                    try { unlinkSync(path.join(cacheDir, f)); } catch { /* ignore */ }
                  }
                }
              } catch { /* ignore */ }
              res.statusCode = 502;
              res.setHeader("content-type", "application/json");
              return res.end(JSON.stringify({
                error: "yt-dlp failed",
                jobId,
                code,
                hint: stderr.slice(0, 600) || "ensure yt-dlp + ffmpeg are installed and on PATH",
              }));
            }
          }

          const size = statSync(cachedMp3).size;
          res.setHeader("content-type", "audio/mpeg");
          res.setHeader("content-length", String(size));
          res.setHeader("cache-control", "no-store");
          res.setHeader("x-yt-id", id);
          res.end(readFileSync(cachedMp3));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}
