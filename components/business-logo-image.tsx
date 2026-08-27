/* eslint-disable @next/next/no-img-element -- Business logos may be bounded data URLs. */

type BusinessLogoImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Canonical Business logo presentation: show the full uploaded logo without cropping. */
export function BusinessLogoImage({
  src,
  alt,
  className = "",
}: BusinessLogoImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`size-full object-contain object-center ${className}`}
    />
  );
}
