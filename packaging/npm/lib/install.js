#!/usr/bin/env node
// Downloads the prebuilt mgimind binary for this platform from the GitHub
// release matching the package version, checks its SHA-256 and unpacks it
// into vendor/. Runs as postinstall, and again lazily from bin/mgimind.js
// when install scripts were skipped.

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const VERSION = require("../package.json").version;
const VENDOR = path.join(__dirname, "..", "vendor");
const EXE = process.platform === "win32" ? "mgimind.exe" : "mgimind";

const TARGETS = {
  "linux-x64": "x86_64-unknown-linux-gnu",
  "darwin-arm64": "aarch64-apple-darwin",
  "darwin-x64": "x86_64-apple-darwin",
  "win32-x64": "x86_64-pc-windows-msvc",
};

function binaryPath() {
  return path.join(VENDOR, EXE);
}

function assetName() {
  const key = `${process.platform}-${process.arch}`;
  const target = TARGETS[key];
  if (!target) {
    throw new Error(
      `mgi-mind has no prebuilt binary for ${key}. ` +
        "Build from source: https://github.com/madgodinc/mgi-mind#install"
    );
  }
  return `mgimind-${target}${process.platform === "win32" ? ".zip" : ".tar.gz"}`;
}

function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "mgi-mind-npm" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirects === 0) return reject(new Error(`too many redirects: ${url}`));
          return resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function install() {
  if (fs.existsSync(binaryPath())) return binaryPath();

  const asset = assetName();
  const base = `https://github.com/madgodinc/mgi-mind/releases/download/v${VERSION}/${asset}`;
  process.stderr.write(`mgi-mind: downloading ${asset} (v${VERSION})\n`);

  const [archive, shaFile] = await Promise.all([get(base), get(`${base}.sha256`)]);
  const expected = shaFile.toString("utf8").trim().split(/\s+/)[0].toLowerCase();
  const actual = crypto.createHash("sha256").update(archive).digest("hex");
  if (expected !== actual) {
    throw new Error(`checksum mismatch for ${asset}: expected ${expected}, got ${actual}`);
  }

  fs.mkdirSync(VENDOR, { recursive: true });
  const tmp = path.join(os.tmpdir(), `mgimind-${process.pid}-${asset}`);
  fs.writeFileSync(tmp, archive);
  try {
    // bsdtar on Windows 10+ and macOS reads both .zip and .tar.gz; GNU tar on Linux gets .tar.gz.
    // On Windows call System32's bsdtar by path: a GNU tar from Git or MSYS earlier on PATH
    // reads "C:\..." as a remote host and fails.
    const tar =
      process.platform === "win32"
        ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
        : "tar";
    execFileSync(tar, ["-xf", tmp, "-C", VENDOR], { stdio: "inherit" });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  if (!fs.existsSync(binaryPath())) {
    throw new Error(`${asset} did not contain ${EXE}`);
  }
  if (process.platform !== "win32") fs.chmodSync(binaryPath(), 0o755);
  return binaryPath();
}

module.exports = { install, binaryPath };

if (require.main === module) {
  install().catch((err) => {
    // Do not fail `npm install`: bin/mgimind.js retries on first run.
    process.stderr.write(`mgi-mind: ${err.message}\n`);
  });
}
