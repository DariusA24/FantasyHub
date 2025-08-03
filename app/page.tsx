'use client'; 
import { useUser } from '@clerk/nextjs';
import React from 'react';
import Guest from '../components/Guest';

function HomePage() {
  const {user, isLoaded, isSignedIn} = useUser(); 
  if (!isLoaded) {
    return (
      <div className='flex flex-col items-center justify-centermin-h-screen'>
        <div className="text-lg mb-4">Loading...</div>
        <div className='text-sm text-gray-500'>
          If this takes too long, there might be an issue authentication.
        </div>
        <button 
          className='mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    ); 
  }

  if (!isSignedIn || !user) {
    return <Guest />
  }

  return (
    <>
      <h1 className="text-3xl">HomePage</h1>
      <button>Click me</button>
    </>
  );
}


export default HomePage;