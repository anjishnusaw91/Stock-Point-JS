'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { handleNavigation } from '../helpers/navigation'

export default function MarketNewsPage() {
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
        selectedTab="Market News" 
        setSelectedTab={handleTabChange}
        onLogout={handleLogout}
      />
      <main className="flex-grow p-0 md:p-4 mt-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Market News</h1>
          
          <div className="space-y-6">
            <NewsItem 
              title="RBI releases new monetary policy" 
              description="The Reserve Bank of India announced changes to its monetary policy, keeping interest rates unchanged at 6.5% amid inflationary pressures."
              date="Today"
              source="Economic Times"
            />
            
            <NewsItem 
              title="Tech stocks rally on positive earnings" 
              description="Major technology companies reported better-than-expected quarterly earnings, leading to a significant rally in tech stocks across global markets."
              date="Today"
              source="Reuters"
            />
            
            <NewsItem 
              title="Global markets react to international tensions" 
              description="Increasing geopolitical tensions have caused volatility in global markets, with crude oil prices surging and defensive stocks gaining momentum."
              date="Yesterday"
              source="Bloomberg"
            />
            
            <NewsItem 
              title="Banking sector shows strong growth" 
              description="Indian banking sector reported robust growth in the last quarter, with private banks leading the charge on improved asset quality and credit growth."
              date="Yesterday"
              source="Financial Express"
            />
            
            <NewsItem 
              title="Foreign investors increase holdings in Indian markets" 
              description="Foreign Portfolio Investors (FPIs) have shown renewed interest in Indian equities, with net inflows reaching a six-month high in April."
              date="2 days ago"
              source="Business Standard"
            />
            
            <NewsItem 
              title="New regulations for commodity trading announced" 
              description="SEBI has introduced new regulations for commodity derivatives trading aimed at improving market integrity and investor protection."
              date="3 days ago"
              source="Mint"
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function NewsItem({ title, description, date, source }: {
  title: string;
  description: string;
  date: string;
  source: string;
}) {
  return (
    <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-600 mt-2">{description}</p>
      <div className="flex justify-between mt-3 text-sm text-gray-500">
        <span>{date}</span>
        <span>Source: {source}</span>
      </div>
    </div>
  );
} 