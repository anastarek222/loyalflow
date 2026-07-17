import QRCode from "qrcode";

export const generateQRCode = (
  text: string,
  options?: {
    size?: number;
    color?: string;
    background?: string;
  }
): Promise<string> => {
  return QRCode.toDataURL(text, {
    margin: 1,
    scale: Math.floor((options?.size || 200) / 50),
    color: {
      dark: options?.color || "#000000",
      light: options?.background || "#ffffff",
    },
  });
};
