import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 3199;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const buckets = new Map();

if (!token) {
  throw new Error("UPSTASH_REDIS_REST_TOKEN is required.");
}

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, { status: "ok" });
    return;
  }

  if (
    request.method !== "POST" ||
    request.headers.authorization !== `Bearer ${token}`
  ) {
    json(response, 401, { error: "unauthorized" });
    return;
  }

  if (request.url === "/reset") {
    buckets.clear();
    json(response, 200, { status: "reset" });
    return;
  }

  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    try {
      const command = JSON.parse(body);
      const key = command[3];
      const windowMs = Math.max(1, Number(command[4]));
      if (command[0] !== "EVAL" || typeof key !== "string") {
        json(response, 400, { error: "unsupported_command" });
        return;
      }

      const now = Date.now();
      const previous = buckets.get(key);
      const bucket = previous?.resetAt > now
        ? previous
        : { count: 0, resetAt: now + windowMs };
      bucket.count += 1;
      buckets.set(key, bucket);
      json(response, 200, {
        result: [bucket.count, Math.max(1, bucket.resetAt - now)],
      });
    } catch {
      json(response, 400, { error: "invalid_request" });
    }
  });
});

server.listen(port, host, () => {
  process.stdout.write(`Disposable rate-limit server ready on ${host}:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
