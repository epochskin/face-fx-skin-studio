import Image from "next/image";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

// Renders the real photo when the slot in lib/photos.ts has a file, and a themed
// placeholder until then. Pages never reference image files directly.
export default function Photo({
  slot,
  sizes,
  priority = false,
  className = "",
}: {
  slot: PhotoKey;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const p = PHOTOS[slot] as (typeof PHOTOS)[PhotoKey];
  if (p.src) {
    return (
      <Image
        className={className || undefined}
        src={p.src}
        alt={p.alt}
        width={p.width}
        height={p.height}
        sizes={sizes}
        quality={90}
        priority={priority}
      />
    );
  }
  return (
    <div className={`ph ${className}`.trim()} style={{ aspectRatio: p.ratio }} role="img" aria-label={`${p.alt} (photo coming soon)`}>
      <span className="ph-mark" aria-hidden="true">
        <Image src="/images/logo.png" alt="" width={96} height={96} />
      </span>
      <span className="ph-label" aria-hidden="true">{p.label}</span>
      <span className="ph-soon" aria-hidden="true">Photo coming soon</span>
    </div>
  );
}
