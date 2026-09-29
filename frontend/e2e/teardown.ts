import { execSync } from "node:child_process";

export default function teardown() {
  execSync("docker rm -f hive-e2e", { stdio: "ignore" });
}
