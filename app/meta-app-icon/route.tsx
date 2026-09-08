import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const wordmarkUrl = new URL("/brand/tanee-wordmark-en.svg", request.url);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
        }}
      >
        <img
          src={wordmarkUrl.toString()}
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
}
