import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  compact?: boolean;
  className?: string;
}

export function Logo({ href = '/', compact = false, className = '' }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="Jotek home"
      className={`inline-flex items-center rounded-md bg-black px-2 py-1 ${className}`}
    >
      <Image
        src="/jotek-logo.jpeg"
        alt="Jotek"
        width={compact ? 104 : 132}
        height={compact ? 36 : 46}
        priority
        className="h-auto w-auto"
      />
    </Link>
  );
}
