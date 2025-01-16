'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <nav className="bg-white shadow-md w-full">
      <div className="px-4">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-gray-800">Stock Point</h1>
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-md ${
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
              className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

