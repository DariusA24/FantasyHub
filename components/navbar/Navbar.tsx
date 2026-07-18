'use client';
import Link from 'next/link';
// import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { DarkMode } from './DarkMode';
import LinkDropDown from './LinkDropDown';
import { FiHome, FiLogIn, FiGrid, FiPlay } from 'react-icons/fi';
import ToolsDropdown from './ToolsDropdown';
import CommunityDropdown from './CommunityDropdown';
import NavSearch from './NavSearch';
import MobileMenu from './MobileMenu';

function NavBar() {
  // const { isSignedIn } = useUser();
  const { isSignedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 text-sm font-medium">
        <div className="flex items-center justify-between h-14 sm:h-16 rounded-2xl border border-zinc-200 dark:border-amber-100/10 bg-white dark:bg-neutral-900 md:bg-white/95 md:dark:bg-neutral-900/80 md:backdrop-blur-xl shadow-sm dark:shadow-lg dark:shadow-black/20 px-3 sm:px-4 md:px-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <span className="text-md sm:text-2xl font-extrabold tracking-tight font-[var(--font-display)] bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 dark:from-amber-400 dark:via-amber-100 dark:to-yellow-50 bg-clip-text text-transparent">
                LeagueShelf
              </span>
            </Link>
          </div>

          {/* Right: Conditional Layout */}
          {isSignedIn ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Full link row — desktop only; collapses into MobileMenu below md */}
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
                >
                  <FiHome className="h-3.5 w-3.5" />
                  <span className="tracking-[0.18em]">HOME</span>
                </Link>
                <Link
                  href="/manager" // go directly to your gm route
                  className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
                >
                  <FiGrid className="h-3.5 w-3.5" />
                  <span className="tracking-[0.18em]">MANAGER</span>
                </Link>
                <CommunityDropdown />
                <NavSearch />
                <ToolsDropdown />
              </div>
              {/* Dark mode + profile */}
              <div className="flex items-center gap-2 sm:gap-3 md:pl-3 md:border-l border-zinc-200 dark:border-amber-100/10">
                <LinkDropDown />
                <DarkMode />
              </div>
              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
              >
                <FiHome className="h-3.5 w-3.5" />
                <span className="tracking-[0.18em]">HOME</span>
              </Link>
              <Link
                href="/hub-league/demo"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-amber-50/80 hover:text-zinc-900 dark:hover:text-amber-50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150"
              >
                <FiPlay className="h-3.5 w-3.5" />
                <span className="tracking-[0.18em]">DEMO</span>
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-neutral-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 shadow-md shadow-amber-500/30 transition-all duration-150"
              >
                <FiLogIn className="h-3.5 w-3.5" />
                <span>LOG IN</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;