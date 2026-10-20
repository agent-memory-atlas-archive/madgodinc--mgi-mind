#!/usr/bin/env node
// Thin launcher: makes sure the binary is present, then hands it the
// arguments and the stdio untouched, so `npx mgi-mind mcp` is the MCP server.

"use strict";

const { spawn } = require("child_process");
const { install } = require("../lib/install.js");

install()
  .then((bin) => {
    const child = spawn(bin, process.argv.slice(2), { stdio: "inherit" });
    for (const sig of ["SIGINT", "SIGTERM"]) {
      process.on(sig, () => child.kill(sig));
    }
    child.on("exit", (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      else process.exit(code === null ? 1 : code);
    });
  })
  .catch((err) => {
    process.stderr.write(`mgi-mind: ${err.message}\n`);
    process.exit(1);
  });
