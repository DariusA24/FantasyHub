'use client';

import { useState } from 'react';
import { FiShare2, FiCheck } from 'react-icons/fi';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-[#F4D06F] transition-colors"
    >
      {copied ? <FiCheck className="h-3 w-3" /> : <FiShare2 className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
