'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import Home from '../components/Home'
import PerformanceComparator from '../components/PerformanceComparator'
import MarketProfile from '../components/MarketProfile'
import NiftyPredictor from '../components/NiftyPredictor'
import TechnicalAnalysis from '../components/TechnicalAnalysis'
import GeneralForecaster from '../components/GeneralForecaster'
import LiveCharts from '../components/LiveCharts'
import Contact from '../components/Contact'

export default function MainPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [selectedTab, setSelectedTab] = useState('Home')
  const router = useRouter()

  useEffect(() => {
    setIsAuthenticated(true)
  }, [])

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <main className="container mx-auto mt-8 px-4">
        {renderContent()}
      </main>
    </div>
  )
}

