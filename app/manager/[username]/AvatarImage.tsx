'use client';

import Image from 'next/image';

export default function AvatarImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={72}
      height={72}
      className="relative h-16 w-16 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shadow-sm dark:shadow-xl"
      onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
    />
  );
}
