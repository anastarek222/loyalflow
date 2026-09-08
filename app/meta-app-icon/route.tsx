import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wordmarkUrl = new URL("/brand/tanee-wordmark-en.svg", request.url);
  const wordmarkResponse = await fetch(wordmarkUrl, { cache: "no-store" });

  if (!wordmarkResponse.ok) {
    return new Response("Unable to read the locked Tanee wordmark.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const svgSource = await wordmarkResponse.text();
  const paths = Array.from(
    svgSource.matchAll(
      /<path\b[^>]*\bfill="([^"]+)"[^>]*\bfill-rule="([^"]+)"[^>]*\bd="([^"]+)"[^>]*\/>/g,
    ),
    (match) => ({
      fill: match[1],
      fillRule: match[2],
      d: match[3],
    }),
  );

  if (paths.length !== 4) {
    return new Response("Locked Tanee wordmark geometry did not match the expected four paths.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="896" height="230" viewBox="0 0 1500 384">
          {paths.map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={path.fill}
              fillRule={path.fillRule as "evenodd" | "nonzero"}
            />
          ))}
        </svg>
      </div>
    ),
    {
      width: 1024,
      height: 1024,
      headers: {
        "Content-Disposition": 'inline; filename="tanee-meta-app-icon-1024.png"',
        "Cache-Control": "no-store",
      },
    },
  );

  if (url.searchParams.get("base64") === "1") {
    const bytes = Buffer.from(await image.arrayBuffer());
    return new Response(bytes.toString("base64"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Image-Bytes": String(bytes.length),
      },
    });
  }

  return image;
}
