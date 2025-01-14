'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
}

export default function Navbar({ selectedTab, setSelectedTab }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
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
          </div>
        </div>
      </div>
    </nav>
  );
}

