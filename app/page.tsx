'use client'

import { useState, useEffect } from 'react'
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

export default function MainPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [selectedTab, setSelectedTab] = useState('Home')
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAuthenticated(true)
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
    switch (selectedTab) {
      case 'Home':
        return <Home />
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
      default:
        return <Home />
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
      <Navbar selectedTab={selectedTab} setSelectedTab={setSelectedTab} onLogout={handleLogout} />
      <main className="flex-grow p-0 md:p-4 mt-4">
        {renderContent()}
      </main>
    </div>
  )
}

