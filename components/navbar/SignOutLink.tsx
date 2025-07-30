'use client'

import React from "react"

import { SignOutButton } from '@clerk/nextjs'; 
import { toast } from 'sonner'

function SignOutLink() {
    const handleLogout = () => {
        toast('You have been signed out.');
    };

    return (
        <SignOutButton redirectUrl="/">
            <button className="w-full text-left" onClick={handleLogout}>
                Logout
            </button>
        </SignOutButton>
    )
}

export default SignOutLink