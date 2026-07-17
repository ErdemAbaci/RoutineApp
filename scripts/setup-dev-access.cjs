const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const localConfigPath = path.join(
  root,
  "ios",
  "RoutineApp",
  "Config",
  "Local.xcconfig",
);

function getPublicIp() {
  return new Promise((resolve, reject) => {
    const request = https.get(
      "https://checkip.amazonaws.com",
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const ip = body.trim();

          if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
            reject(new Error("Public IP could not be detected"));
            return;
          }

          resolve(ip);
        });
      },
    );

    request.setTimeout(10_000, () => {
      request.destroy(new Error("Public IP request timed out"));
    });
    request.on("error", reject);
  });
}

function upsertSetting(content, key, value, separator) {
  const line = `${key}${separator}${value}`;
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  return `${content.trimEnd()}${content.trim() ? "\n" : ""}${line}\n`;
}

async function main() {
  const token = crypto.randomBytes(32).toString("hex");
  const sourceIp = await getPublicIp();
  const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const currentConfig = fs.existsSync(localConfigPath)
    ? fs.readFileSync(localConfigPath, "utf8")
    : "";
  const nextEnv = upsertSetting(
    upsertSetting(currentEnv, "ROUTINE_APP_DEV_API_TOKEN", token, "="),
    "ROUTINE_APP_DEV_ALLOWED_SOURCE_IP",
    sourceIp,
    "=",
  );
  const nextConfig = upsertSetting(
    currentConfig,
    "DEV_API_TOKEN",
    token,
    " = ",
  );

  fs.writeFileSync(envPath, nextEnv, { mode: 0o600 });
  fs.writeFileSync(localConfigPath, nextConfig, { mode: 0o600 });

  console.log("Dev API access configured in ignored local files.");
  console.log("Run this script again if your public IP changes.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Setup failed");
  process.exitCode = 1;
});
