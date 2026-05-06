import axios from "axios";
import * as fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";

export async function fetchUrl(url = "") {
  if (!url || typeof url !== "string") return "Missing url";
  try {
    const resp = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) WebsiteClonerAgent/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      timeout: 20000
    });
    return resp.data;
  } catch (e) {
    return `Fetch failed: ${e?.message ?? String(e)}`;
  }
}

export async function ensureDir(dirPath = "") {
  if (!dirPath || typeof dirPath !== "string") return "Missing dirPath";
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return `Created/ensured directory: ${dirPath}`;
  } catch (e) {
    return `mkdir failed: ${e?.message ?? String(e)}`;
  }
}

export async function writeFile(filePath = "", contents = "") {
  if (!filePath || typeof filePath !== "string") return "Missing filePath";
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, "utf-8");
    return `Wrote file: ${filePath} (${Buffer.byteLength(contents, "utf-8")} bytes)`;
  } catch (e) {
    return `writeFile failed: ${e?.message ?? String(e)}`;
  }
}

export async function readFile(filePath = "") {
  if (!filePath || typeof filePath !== "string") return "Missing filePath";
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return data;
  } catch (e) {
    return `readFile failed: ${e?.message ?? String(e)}`;
  }
}

export async function executeCommand(cmd = "") {
  if (!cmd || typeof cmd !== "string") return "Missing cmd";
  return new Promise((res) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        res(`Command failed: ${error.message}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`);
        return;
      }
      res(`--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`);
    });
  });
}
