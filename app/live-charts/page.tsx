'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import LiveCharts from "../../components/LiveCharts";
import Navbar from '../../components/Navbar';
import { handleNavigation } from '../helpers/navigation';

export default function LiveChartsPage() {
  const router = useRouter();
  
  const handleTabChange = (tab: string) => {
    handleNavigation(tab, router);
  };
  
  const handleLogout = () => {
    // Handle logout functionality
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        selectedTab="Live Charts" 
        setSelectedTab={handleTabChange}
        onLogout={handleLogout}
      />
      <main className="flex-grow p-0 md:p-4 mt-4">
        <Suspense fallback={<div className="p-4 text-center">Loading charts...</div>}>
          <LiveCharts />
        </Suspense>
      </main>
    </div>
  );
} 