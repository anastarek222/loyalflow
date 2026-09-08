import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

function readAttribute(tag: string, name: string) {
  return new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1] ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wordmarkPath = path.join(
    process.cwd(),
    "public",
    "brand",
    "tanee-wordmark-en.svg",
  );

  let svgSource: string;
  try {
    svgSource = await readFile(wordmarkPath, "utf8");
  } catch {
    return new Response("Unable to read the locked Tanee wordmark.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (url.searchParams.get("svgbase64") === "1") {
    const bytes = Buffer.from(svgSource, "utf8");
    return new Response(bytes.toString("base64"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Svg-Bytes": String(bytes.length),
      },
    });
  }

  const pathTags = svgSource.match(/<path\b[^>]*\/>/g) ?? [];
  const paths = pathTags.map((tag) => ({
    fill: readAttribute(tag, "fill"),
    fillRule: readAttribute(tag, "fill-rule"),
    d: readAttribute(tag, "d"),
  }));

  if (url.searchParams.get("debug") === "1") {
    return Response.json(
      {
        source: "filesystem",
        sourceLength: svgSource.length,
        literalPathCount: (svgSource.match(/<path/g) ?? []).length,
        parsedPathCount: pathTags.length,
        attributes: paths.map((path) => ({
          hasFill: Boolean(path.fill),
          fillRule: path.fillRule,
          dLength: path.d?.length ?? 0,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    paths.length !== 4 ||
    paths.some((path) => !path.fill || !path.fillRule || !path.d)
  ) {
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
              d={path.d!}
              fill={path.fill!}
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
