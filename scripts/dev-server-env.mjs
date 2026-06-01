import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["next", "dev", "-p", "3001"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_BACKEND_API_URL: "https://iplvr.it.ntnu.no/backend",
    NEXT_PUBLIC_BASE_PATH: "",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
