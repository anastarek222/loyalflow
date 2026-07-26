import process from "node:process";

type SmokeResult = {
  name: string;
  ok: boolean;
  detail: string;
};

function requiredHttpsOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    throw new Error("NEXT_PUBLIC_APP_URL is required.");
  }

  const url = new URL(raw);
  if (url.protocol !== "https:" || url.origin !== raw) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an exact HTTPS origin without a trailing slash."
    );
  }

  return url.origin;
}

async function checkJson(
  name: string,
  url: string,
  expectedStatus: string,
): Promise<SmokeResult> {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json()) as {
      ok?: boolean;
      service?: string;
      status?: string;
    };

    const ok =
      response.ok &&
      body.ok === true &&
      body.service === "loyalflow" &&
      body.status === expectedStatus;

    return {
      name,
      ok,
      detail: ok ? `HTTP ${response.status}` : "unexpected health response",
    };
  } catch {
    return {
      name,
      ok: false,
      detail: "request failed",
    };
  }
}

async function main() {
  const origin = requiredHttpsOrigin();
  const results = await Promise.all([
    checkJson("liveness", `${origin}/api/health/live`, "live"),
    checkJson("readiness", `${origin}/api/health`, "ready"),
  ]);

  console.log("LoyalFlow production smoke check");
  console.log("==============================");

  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}: ${result.detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
    return;
  }

  console.log("\nProduction smoke check passed.");
}

main().catch(() => {
  console.error("Production smoke check failed.");
  process.exitCode = 1;
});
