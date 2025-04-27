'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import TechnicalAnalysis from '../../components/TechnicalAnalysis'
import Navbar from '../../components/Navbar'
import { handleNavigation } from '../helpers/navigation'

export default function TechnicalAnalysisPage() {
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
        selectedTab="Technical Analysis" 
        setSelectedTab={handleTabChange}
        onLogout={handleLogout}
      />
      <main className="flex-grow p-0 md:p-4 mt-4">
        <Suspense fallback={<div className="p-4 text-center">Loading technical analysis...</div>}>
          <TechnicalAnalysis />
        </Suspense>
      </main>
    </div>
  )
} 