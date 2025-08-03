import { SignUpButton } from "@clerk/nextjs";
import React from "react";

function Guest() {
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen bg-black text-zinc-100 max-w-7xl mx-auto px-6 md:px-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center p-6 md:p-16 max-w-7xl w-full">
        <div className="flex-1 mb-8 md:mb-0 md:ml-8">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 text-left text-stone-100">
            YOUR FANTASY FOOTBALL COMPANION
          </h1>
          <SignUpButton>
            <button className="bg-amber-300 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-md shadow-lg transition duration-300">
              JOIN FANTASYHUB
            </button>
          </SignUpButton>
        </div>
      </div>
      {/* Divider */}
      <div className="h-1 bg-gray-300"></div>
      {/* Features Section */}
      <div className="w-full bg-black text-zinc-100">
        <div className="max-w-7xl mx-auto px-6 items-start">
          <h2 className="text-1xl md:text-1xl font-bold mb-8 text-amber-300 pl-16">
            FEATURED LEAGUES
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* League Card 1 */}
      <div className="bg-zinc-900 p-6 rounded-xl shadow hover:shadow-lg transition">
        <p className="text-xl font-bold mb-1">GRIDIRON GREATS</p>
        <p className="text-sm text-zinc-400">12 Teams</p>
      </div>

      {/* League Card 2 (Trophy) */}
      <div className="bg-zinc-900 p-6 rounded-xl shadow hover:shadow-lg transition flex items-center">
        <img src="/browne-trophey.png" alt="Browne Trophy" className="h-24 mr-4" />
        <p className="text-xl font-bold">BROWNE TROPHY</p>
      </div>
    </div>
      </div>
      {/* Divider */}
      <div className="h-1 bg-gray-300"></div>
      {/* How it works*/}
      <div className="py-12 bg-black text-zinc-100">
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <h2 className="text-center text-lg md:text-xl font-bold tracking-wider text-amber-400 mb-4">
            HOW IT WORKS
          </h2>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-10">
            {/* Step 1 */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-stone-200">1</span>
              <span className="text-sm md:text-base font-semibold text-zinc-100 uppercase">
                Create a League
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-stone-200">2</span>
              <span className="text-sm md:text-base font-semibold text-zinc-100 uppercase">
                Bet on Matchups
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-stone-200">3</span>
              <span className="text-sm md:text-base font-semibold text-zinc-100 uppercase">
                Track Your Results
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Guest;
