import React from 'react';
import NavSearch from './NavSearch'
import LinkDropDown from './LinkDropDown'
import { DarkMode } from './DarkMode'
import Logo from './Logo'

function NavBar() {
    return (
        <nav className='border-b'>
            <div className='container flex flex-col sm:flex-row sm:justify-between sm:items-center flex-wrap gap-4 py-8'>
                <Logo />
                <NavSearch />
                <div className='flex gap-4 items-center'>
                    <DarkMode />
                    <LinkDropDown />
                </div>
            </div>
        </nav>
    )
}