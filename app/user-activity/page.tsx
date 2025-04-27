'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { handleNavigation } from '../helpers/navigation'

export default function UserActivityPage() {
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
        selectedTab="User Activity" 
        setSelectedTab={handleTabChange}
        onLogout={handleLogout}
      />
      <main className="flex-grow p-0 md:p-4 mt-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Recent Activity</h1>
          
          <div className="space-y-4">
            <ActivityItem 
              type="portfolio"
              action="Added RELIANCE to portfolio"
              date="Today, 10:35 AM"
            />
            
            <ActivityItem 
              type="watchlist"
              action="Created new watchlist: Tech Stocks"
              date="Today, 09:22 AM"
            />
            
            <ActivityItem 
              type="analysis"
              action="Ran technical analysis on HDFC Bank"
              date="Yesterday, 3:45 PM"
            />
            
            <ActivityItem 
              type="prediction"
              action="Generated NIFTY prediction for next week"
              date="Yesterday, 2:15 PM"
            />
            
            <ActivityItem 
              type="portfolio"
              action="Updated TCS holding quantity to 15 shares"
              date="2 days ago"
            />
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Activity Summary</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Portfolio Changes" 
                value="12"
                icon="📈"
                bgColor="bg-blue-50"
                textColor="text-blue-700"
              />
              
              <StatCard 
                title="Watchlist Updates" 
                value="8"
                icon="👁️"
                bgColor="bg-purple-50"
                textColor="text-purple-700"
              />
              
              <StatCard 
                title="Analysis Run" 
                value="5"
                icon="🔍"
                bgColor="bg-amber-50"
                textColor="text-amber-700"
              />
              
              <StatCard 
                title="Predictions Generated" 
                value="3"
                icon="🤖"
                bgColor="bg-green-50"
                textColor="text-green-700"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ActivityItem({ type, action, date }: {
  type: 'portfolio' | 'watchlist' | 'analysis' | 'prediction';
  action: string;
  date: string;
}) {
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'portfolio':
        return { bgColor: 'bg-blue-100', textColor: 'text-blue-700', icon: '💼' };
      case 'watchlist':
        return { bgColor: 'bg-purple-100', textColor: 'text-purple-700', icon: '👁️' };
      case 'analysis':
        return { bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: '📊' };
      case 'prediction':
        return { bgColor: 'bg-green-100', textColor: 'text-green-700', icon: '🤖' };
      default:
        return { bgColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '📝' };
    }
  };
  
  const { bgColor, textColor, icon } = getTypeInfo(type);
  
  return (
    <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`${bgColor} ${textColor} w-10 h-10 rounded-full flex items-center justify-center text-xl mr-4`}>
        {icon}
      </div>
      <div className="flex-grow">
        <p className="text-gray-800 font-medium">{action}</p>
        <p className="text-gray-500 text-sm">{date}</p>
      </div>
      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
        View
      </button>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, textColor }: {
  title: string;
  value: string;
  icon: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className={`${bgColor} ${textColor} w-10 h-10 rounded-lg flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">{value}</p>
          <p className="text-gray-500 text-sm">{title}</p>
        </div>
      </div>
    </div>
  );
} 