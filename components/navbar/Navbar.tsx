'use client';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { DarkMode } from './DarkMode';
import LinkDropDown from './LinkDropDown';

function NavBar() {
  const { isSignedIn } = useUser();

  return (
    <nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm font-medium">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <span className="text-md sm:text-2xl font-bold bg-gradient-to-r from-amber-500 via-amber-100 to-yellow-50 bg-clip-text text-transparent">
                FantasyHub
              </span>
            </Link>
          </div>

          {/* Right: Conditional Layout */}
          {isSignedIn ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-purple-600 px-2 py-1 rounded-md text-sm sm:px-3 sm:py-2 sm:text-base font-medium hidden sm:block"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-purple-600 px-2 py-1 rounded-md text-sm sm:px-3 sm:py-2 sm:text-base font-medium"
              >
                About
              </Link>
              <div className="flex gap-4 items-center">
                <DarkMode />
                <LinkDropDown />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-amber-100 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium"
              >
                HOME
              </Link>
              <Link
                href="/featured"
                className="text-amber-100 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium"
              >
                FEATURED
              </Link>
              <Link
                href="/works"
                className="text-amber-100 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium"
              >
                HOW IT WORKS
              </Link>
              <Link
                href="/login"
                className="text-amber-100 hover:text-amber-500 px-3 py-2 rounded-md text-sm font-medium"
              >
                LOG IN
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;