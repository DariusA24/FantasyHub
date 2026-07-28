import Link from 'next/link';
import { FiLock } from 'react-icons/fi';

export function EspnPrivateNotice() {
  return (
    <div className="hub-page flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <FiLock className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Private League</h1>
        <p className="text-sm text-zinc-500">
          Go to your <Link href="/profile" className="text-red-500 hover:underline">profile settings</Link> and add your ESPN cookies under &ldquo;Private League Access&rdquo; to view this league.
        </p>
      </div>
    </div>
  );
}
