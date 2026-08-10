import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const path = ".env";
let env = readFileSync(path, "utf8");

function fill(key) {
  const re = new RegExp(`^${key}="?.*?"?$`, "m");
  const current = env.match(re)?.[0] ?? "";
  const value = current.split("=")[1]?.replace(/"/g, "").trim();
  if (value && !value.startsWith("dev-only-secret")) {
    console.log(`${key}: already set, leaving alone`);
    return;
  }
  env = env.replace(re, `${key}="${randomBytes(32).toString("base64")}"`);
  console.log(`${key}: generated`);
}

fill("AUTH_SECRET");
fill("CREDENTIAL_ENCRYPTION_KEY");

writeFileSync(path, env);
