import { spawnSync } from "node:child_process";
import process from "node:process";

type Step = {
  name: string;
  command: string[];
};

function run(step: Step) {
  console.log(`\n===== ${step.name} =====`);
  const [command, ...args] = step.command;
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${step.name} failed`);
  }

  console.log(`✅ ${step.name} PASS`);
}

function main() {
  const includeBrowser =
    process.argv.includes("--browser") ||
    process.env.LOYALFLOW_FINAL_GATE_BROWSER === "1";

  const steps: Step[] = [
    {
      name: "RELEASE CHECKPOINT",
      command: ["pnpm", "run", "verify:release-checkpoint"],
    },
    {
      name: "READ-ONLY CODE RELEASE GATE",
      command: ["pnpm", "run", "release:check"],
    },
  ];

  if (includeBrowser) {
    steps.push({
      name: "FINAL BROWSER UAT",
      command: ["pnpm", "run", "test:browser-uat"],
    });
  }

  for (const step of steps) run(step);

  console.log("\n========================================");
  console.log("✅ LoyalFlow final local release gate passed");
  console.log("========================================");
  console.log(
    includeBrowser
      ? "Browser UAT was included."
      : "Browser UAT was not included. Run release:final:browser before production approval.",
  );
}

try {
  main();
} catch {
  console.error("\n❌ LoyalFlow final local release gate failed.");
  process.exitCode = 1;
}
