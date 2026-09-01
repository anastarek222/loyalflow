/* eslint-disable @next/next/no-img-element -- Business logos may be bounded data URLs. */

type BusinessLogoImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Canonical full-frame square presentation for uploaded Business logos. */
export function BusinessLogoImage({
  src,
  alt,
  className = "",
}: BusinessLogoImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`size-full object-cover object-center ${className}`}
    />
  );
}
