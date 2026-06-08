import Link from 'next/link';

const Footer = () => {
    return (
        <footer className='fixed bottom-0 w-full h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center'>
            <div className='container py-4 text-center'>
                <p className='text-sm text-gray-600'>
                    &copy; {new Date().getFullYear()} FantasyHub. All rights reserved.
                </p>
                <div className='mb-2'>
                    <Link href="/privacy-policy" className='text-blue-600 hover:underline'>Privacy Policy</Link> | 
                    <Link href="/terms-of-service" className='text-blue-600 hover:underline ml-2'>Terms of Service</Link>
                </div>
            </div>
        </footer>
    )
}

export default Footer; 