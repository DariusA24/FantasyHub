import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LuAlignLeft } from 'react-icons/lu';
import Link from 'next/link';
import { Button } from '../ui/button';
import UserIcon from './UserIcon';
import { SignedIn, SignedOut, SignIn, SignInButton, SignOutButton, SignUpButton } from '@clerk/nextjs';

function LinkDropDown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant="outline" className="flex gap-2 items-center max-w-[50px]">
                    <LuAlignLeft className="w-6 h-6" />
                 
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="start" sideOffset={10}>
                <SignedOut>
                    <SignInButton mode="modal">
                        <DropdownMenuItem className="cursor-pointer hover:bg-gray-100">
                            Login
                        </DropdownMenuItem>
                    </SignInButton>
                    <DropdownMenuSeparator />
                    <SignUpButton mode="modal">
                        <DropdownMenuItem className="cursor-pointer hover:bg-gray-100">
                            Register
                        </DropdownMenuItem>
                    </SignUpButton>
                </SignedOut>
                <SignedIn>
                    <SignOutButton>
                        <DropdownMenuItem className="cursor-pointer hover:bg-gray-100">
                            Sign Out
                        </DropdownMenuItem>
                    </SignOutButton>
                </SignedIn>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default LinkDropDown;

