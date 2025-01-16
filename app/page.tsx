'use client'

import { useState } from 'react'
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

export default function MainPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [selectedTab, setSelectedTab] = useState('Home')

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleSignup = () => {
    setIsAuthenticated(true)
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
      case 'Contact':
        return <Contact />
      default:
        return <Home />
    }
  }

  if (!isAuthenticated) {
    return isSignup ? (
      <SignupForm onSignup={handleSignup} />
    ) : (
      <LoginForm onLogin={handleLogin} onSwitchToSignup={() => setIsSignup(true)} />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar selectedTab={selectedTab} setSelectedTab={setSelectedTab} onLogout={handleLogout} />
      <main className="flex-grow">
        {renderContent()}
      </main>
    </div>
  )
}

