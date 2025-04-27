'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../components/Navbar'
import Home from '../components/Home'
import PerformanceComparator from '../components/PerformanceComparator'
import MarketProfile from '../components/MarketProfile'
import NiftyPredictor from '../components/NiftyPredictor'
import TechnicalAnalysis from '../components/TechnicalAnalysis'
import GeneralForecaster from '../components/GeneralForecaster'
import LiveCharts from '../components/LiveCharts'
import Contact from '../components/Contact'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'
import PortfolioManager from '../components/PortfolioManager'
import WatchlistManager from '../components/WatchlistManager'
import UserProfile from '../components/UserProfile'
import { supabase } from '../lib/supabaseClient'

// Create a wrapper component that uses searchParams
function PageContent() {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [selectedTab, setSelectedTab] = useState('Home')
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false)

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    console.log(`Tab changed to: ${tab}`);
    setSelectedTab(tab);
  };

  useEffect(() => {
    // Check if there's a tab parameter in the URL
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      console.log(`Setting selected tab to: ${tabParam}`);
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    }
    checkUser()
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleSignup = () => {
    setShowConfirmationMessage(true)
    setIsSignup(false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  const renderContent = () => {
    try {
      switch (selectedTab) {
        case 'Home':
          return <Home setParentTab={handleTabChange} />
        case 'Performance Comparator':
          return <PerformanceComparator />
        case 'Market Profile':
          return <MarketProfile />
        case 'NIFTY predictor':
          return <NiftyPredictor />
        case 'Technical Analysis':
          return <TechnicalAnalysis />
        case 'General Forecaster':
          return <GeneralForecaster />
        case 'Live Charts':
          return <LiveCharts />
        case 'Portfolio Manager':
          return <PortfolioManager />
        case 'Watchlist Manager':
          return <WatchlistManager />
        case 'Contact':
          return <Contact />
        case 'User Profile':
          return <UserProfile />
        case 'Market News':
          // Fallback to Home if Market News component doesn't exist
          return <Home setParentTab={handleTabChange} />
        case 'User Activity':
          // Fallback to Home if User Activity component doesn't exist
          return <Home setParentTab={handleTabChange} />
        default:
          console.log(`Unknown tab: ${selectedTab}, defaulting to Home`);
          return <Home setParentTab={handleTabChange} />
      }
    } catch (error) {
      console.error(`Error rendering content for tab ${selectedTab}:`, error);
      return <div className="p-4 bg-red-100 text-red-800 rounded-lg">Error loading content</div>;
    }
  }

  if (!isAuthenticated) {
    if (showConfirmationMessage) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center">
            <p className="text-xl text-gray-700 mb-4">Please confirm your email address.</p>
            <button
              onClick={() => setShowConfirmationMessage(false)}
              className="bg-blue-500 text-white p-2 rounded"
            >
              Login
            </button>
          </div>
        </div>
      )
    }

    return isSignup ? (
      <SignupForm 
        onSignup={handleSignup} 
        onSwitchToLogin={() => setIsSignup(false)} 
      />
    ) : (
      <LoginForm 
        onLogin={handleLogin} 
        onSwitchToSignup={() => setIsSignup(true)} 
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar selectedTab={selectedTab} setSelectedTab={handleTabChange} onLogout={handleLogout} />
      <main className="flex-grow p-0 md:p-4 mt-4">
        {renderContent()}
      </main>
    </div>
  )
}

// Main component with Suspense boundary
export default function MainPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PageContent />
    </Suspense>
  )
}

