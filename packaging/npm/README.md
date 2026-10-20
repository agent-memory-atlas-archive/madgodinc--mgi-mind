# mgi-mind (npm)

This package installs the prebuilt `mgimind` binary from the
[GitHub release](https://github.com/madgodinc/mgi-mind/releases) that matches
its version, checked against the release's SHA-256. It adds no JavaScript
logic of its own; the binary is the whole server.

Supported: Linux x86_64, macOS (Apple Silicon and Intel), Windows x86_64.

## First run

```sh
npx -y mgi-mind init          # creates ~/mgimind
npx -y mgi-mind doctor --fix  # downloads Qdrant and the embedding models
```

## MCP client config

```json
{
  "mcpServers": {
    "mgimind": {
      "command": "npx",
      "args": ["-y", "mgi-mind", "mcp"]
    }
  }
}
```

Everything else, including what the tools do and how an agent should use
them, is in the main [README](https://github.com/madgodinc/mgi-mind#readme)
and [AI_INSTRUCTIONS.md](https://github.com/madgodinc/mgi-mind/blob/main/AI_INSTRUCTIONS.md).
