import Link from "next/link";

type Props = {
  href: string;
  className?: string;
};

/**
 * Plain `img` loads `/graphics/storm-logo.png` from `public/` with no `/_next/image` pipeline.
 * That avoids optimizer issues (e.g. large PNGs on Windows) that showed a broken icon + alt text.
 */
export function StormLogoLink({ href, className }: Props) {
  return (
    <Link
      href={href}
      className={`relative flex h-11 shrink-0 items-center ${className ?? ""}`}
      aria-label="Storm FC home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; bypasses Image optimizer */}
      <img
        src="/graphics/storm-logo.png"
        alt=""
        width={220}
        height={60}
        className="h-11 w-auto max-w-[220px] object-contain object-left"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
