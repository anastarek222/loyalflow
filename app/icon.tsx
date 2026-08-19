import { ImageResponse } from "next/og";
import { platformBrand } from "@/lib/platform-brand";

export const size = {
  width: 512,
  height: 512,
};

export const contentType =
  "image/png";

export default function Icon() {
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
          fontSize: 170,
          fontWeight: 900,
          letterSpacing: -18,
          borderRadius: 100,
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
