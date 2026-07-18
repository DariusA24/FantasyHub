'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';
import UserIcon from './UserIcon';
import { SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton } from '@clerk/nextjs';

function LinkDropDown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label="Open profile menu"
                    className="inline-flex items-center justify-center rounded-full p-1 border border-zinc-200 dark:border-amber-100/10 bg-white/80 dark:bg-neutral-800/60 hover:bg-amber-500/10 hover:border-amber-500/30 dark:hover:border-amber-500/40 transition-all duration-150 outline-none"
                >
                    <UserIcon />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end" sideOffset={10}>
                <SignedOut>
                    <SignInButton mode="modal">
                        <DropdownMenuItem className="cursor-pointer">
                            Login
                        </DropdownMenuItem>
                    </SignInButton>
                    <DropdownMenuSeparator />
                    <SignUpButton mode="modal">
                        <DropdownMenuItem className="cursor-pointer">
                            Register
                        </DropdownMenuItem>
                    </SignUpButton>
                </SignedOut>
                <SignedIn>
                    <Link href="/profile" className="no-underline">
                        <DropdownMenuItem className="cursor-pointer">
                            Profile
                        </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <Link href="/manager" className="no-underline">
                        <DropdownMenuItem className="cursor-pointer">
                            My Manager Page
                        </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <Link href="/feedback" className="no-underline">
                        <DropdownMenuItem className="cursor-pointer">
                            Feedback
                        </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <SignOutButton>
                        <DropdownMenuItem className="cursor-pointer">
                            Sign Out
                        </DropdownMenuItem>
                    </SignOutButton>
                </SignedIn>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default LinkDropDown;
