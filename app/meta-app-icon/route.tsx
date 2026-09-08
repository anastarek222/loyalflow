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

  const svg = await wordmarkResponse.text();
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

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
        <img
          src={dataUri}
          width="896"
          height="230"
          alt="Tanee"
          style={{ objectFit: "contain" }}
        />
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
