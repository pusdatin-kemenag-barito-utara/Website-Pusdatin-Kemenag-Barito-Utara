import fs from "node:fs";
import cp from "node:child_process";
import path from "node:path";

function getUniversalAuthToken() {
  try {
    const home = process.env.USERPROFILE || process.env.HOME || "";
    const mcpPath = path.join(home, ".gemini", "config", "mcp_config.json");
    if (!fs.existsSync(mcpPath)) return null;
    let raw = fs.readFileSync(mcpPath, "utf8").replace(/^\uFEFF/, "");
    const mcp = JSON.parse(raw);
    const clientId = mcp.mcpServers?.infisical?.env?.INFISICAL_CLIENT_ID;
    const clientSecret = mcp.mcpServers?.infisical?.env?.INFISICAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const login = cp.spawnSync("infisical", [
      "login",
      "--method=universal-auth",
      `--client-id=${clientId}`,
      `--client-secret=${clientSecret}`,
      "--plain",
    ], { encoding: "utf8" });

    return login.stdout ? login.stdout.trim() : null;
  } catch {
    return null;
  }
}

const token = getUniversalAuthToken();
const tokenFlag = token ? `--token=${token} ` : "";
const cmd = `infisical ${tokenFlag}run --path=/pusdatin-kemenag --env=dev -- npx -y concurrently -k -p "[{name}]" -c "cyan,magenta" -n "backend,frontend" "cd backend && air" "cd frontend && npm run dev"`;

console.log("🚀 Menjalankan Pusdatin Dev Server dengan Infisical Cloud...");
const child = cp.spawn(cmd, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code || 0));
