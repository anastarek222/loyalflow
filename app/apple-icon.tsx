import { ImageResponse } from "next/og";
import { platformBrand } from "@/lib/platform-brand";

export const size = {
  width: 180,
  height: 180,
};

export const contentType =
  "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            `linear-gradient(145deg, ${platformBrand.iconGradientStart}, ${platformBrand.iconGradientEnd})`,
          color: "white",
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: -7,
          borderRadius: 38,
        }}
      >
        {platformBrand.iconMark}
      </div>
    ),
    {
      ...size,
    }
  );
}
