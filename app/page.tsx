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

export default function MainPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedTab, setSelectedTab] = useState('Home')

  const handleLogin = () => {
    setIsAuthenticated(true)
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
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <main className="flex-grow">
        {renderContent()}
      </main>
    </div>
  )
}

