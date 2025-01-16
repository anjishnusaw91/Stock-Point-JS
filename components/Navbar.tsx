'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const tabs = [
  "Home",
  "Performance Comparator",
  "Market Profile",
  "NIFTY predictor",
  "Technical Analysis",
  "General Forecaster",
  "Live Charts",
  "Contact"
];

interface NavbarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ selectedTab, setSelectedTab, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <nav className="bg-white shadow-md w-full">
      <div className="px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Stock Point</h1>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-2 rounded-md text-sm ${
                  selectedTab === tab 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedTab(tab)}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm bg-red-500 text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} py-2`}>
          <div className="flex flex-col space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-2 rounded-md text-sm ${
                  selectedTab === tab 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedTab(tab);
                  setIsMenuOpen(false);
                }}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm bg-red-500 text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

