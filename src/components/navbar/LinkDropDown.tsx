import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { LuAlignLeft } from 'react-icons/lu';
import Link from 'next/link';
import { Button } from '../ui/button';
import UserIcon from './UserIcon';
import { SignedOut, SignIn, SignInButton, SignUpButton } from '@clerk/nextjs';

function LinkDropDown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant='outline' className='flex gap-4 max-w-[100px]'>
                    <LuAlignLeft className='w-6 h-6' />
                    <UserIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-52' align='start' sideOffset={10}>
                <SignedOut>
                    <DropdownMenuItem>
                        <SignInButton>
                            <button className='w-full text-left'>Login</button>
                        </SignInButton>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <SignUpButton>
                            <button className="w-full text-left">Register</button>
                        </SignUpButton>
                    </DropdownMenuItem>
                </SignedOut>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default LinkDropDown; 