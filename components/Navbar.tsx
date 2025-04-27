'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, User as UserIcon, LogOut, ChevronDown, BarChart, Activity, LineChart, PieChart, Briefcase, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { StockPointLogo } from './StockPointLogo';

// Group related tabs for better organization
const tabGroups = [
  { 
    name: "Home", 
    id: "Home",
    icon: null
  },
  { 
    name: "Analysis",
    id: "analysis-group",
    icon: <Activity className="h-4 w-4 mr-1" />,
    items: [
      { name: "Performance", id: "Performance Comparator" },
      { name: "Market Profile", id: "Market Profile" },
      { name: "Technical Analysis", id: "Technical Analysis" },
      { name: "Live Charts", id: "Live Charts" }
    ]
  },
  { 
    name: "Prediction",
    id: "prediction-group",
    icon: <LineChart className="h-4 w-4 mr-1" />,
    items: [
      { name: "Stat Predictor", id: "NIFTY predictor" },
      { name: "Forecaster", id: "General Forecaster" }
    ]
  },
  { 
    name: "Portfolio",
    id: "Portfolio Manager",
    icon: <Briefcase className="h-4 w-4 mr-1" />
  },
  { 
    name: "Watchlist",
    id: "Watchlist Manager",
    icon: <BookOpen className="h-4 w-4 mr-1" />
  }
];

interface NavbarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ selectedTab, setSelectedTab, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const getUserEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if ((user as unknown as User)?.email) {
          setUserEmail((user as unknown as User).email || null);
        }
      } catch (error) {
        console.error('Error getting user email:', error);
      }
    };

    getUserEmail();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedTab('Market Profile');
      // You can add additional logic here to handle the search
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
      onLogout(); // Still call onLogout to maintain app state
    }
  };

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Check if the current selected tab belongs to a group
  const isInGroup = (groupId: string) => {
    const group = tabGroups.find(g => g.id === groupId && g.items);
    if (!group || !group.items) return false;
    return group.items.some(item => item.id === selectedTab);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 bg-gray-100">
      <nav className={`w-full max-w-7xl transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-sm shadow-lg' 
          : 'bg-white'
      } rounded-full px-4 py-2`}>
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center flex-1">
            <Link href="/" className="flex-shrink-0 flex items-center" onClick={() => setSelectedTab('Home')}>
              <StockPointLogo className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">Stock Point</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block ml-6">
              <div className="flex items-baseline space-x-1">
                {tabGroups.map((group) => (
                  <div key={group.id} className="relative">
                    {group.items ? (
                      <div>
                        <button
                          onClick={() => toggleDropdown(group.id)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center ${
                            isInGroup(group.id)
                              ? 'bg-blue-500 text-white transform -translate-y-1 shadow-lg'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {group.icon}
                          {group.name}
                          <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${
                            openDropdown === group.id ? 'rotate-180' : ''
                          }`} />
                        </button>
                        {openDropdown === group.id && (
                          <div className="absolute left-0 mt-2 w-48 py-1 bg-white rounded-lg shadow-xl z-20">
                            {group.items.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setSelectedTab(item.id);
                                  setOpenDropdown(null);
                                }}
                                className={`block px-4 py-2 text-sm w-full text-left ${
                                  selectedTab === item.id
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedTab(group.id)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center ${
                          selectedTab === group.id
                            ? 'bg-blue-500 text-white transform -translate-y-1 shadow-lg'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {group.icon}
                        {group.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Contact Button */}
            <button
              onClick={() => setSelectedTab('Contact')}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedTab === 'Contact'
                  ? 'bg-blue-500 text-white transform -translate-y-1 shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Contact
            </button>

            <div className="flex items-center space-x-3">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-40 pl-9 pr-3 py-1 border border-gray-200 rounded-full bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500"
                />
              </form>
              
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-gray-700 hover:bg-gray-100"
                  onClick={() => setSelectedTab('User Profile')}
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
                {userEmail && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="px-4 py-2 text-sm text-gray-700">{userEmail}</p>
                    <button
                      onClick={() => setSelectedTab('User Profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View Profile
                    </button>
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="rounded-full text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-full text-gray-700"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden mt-4`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Home */}
            <button
              onClick={() => {
                setSelectedTab('Home');
                setIsMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 rounded-md text-base font-medium text-left ${
                selectedTab === 'Home'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Home
            </button>
            
            {/* Analysis Group */}
            <div className="space-y-1 pl-3 border-l border-gray-200">
              <div className="text-xs font-semibold text-gray-500 px-3 pb-1 pt-2">ANALYSIS</div>
              {tabGroups[1].items?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-2 rounded-md text-sm font-medium text-left ${
                    selectedTab === item.id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {/* Prediction Group */}
            <div className="space-y-1 pl-3 border-l border-gray-200">
              <div className="text-xs font-semibold text-gray-500 px-3 pb-1 pt-2">PREDICTION</div>
              {tabGroups[2].items?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-2 rounded-md text-sm font-medium text-left ${
                    selectedTab === item.id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {/* Portfolio & Watchlist */}
            <div className="space-y-1 pl-3 border-l border-gray-200">
              <div className="text-xs font-semibold text-gray-500 px-3 pb-1 pt-2">MANAGEMENT</div>
              <button
                onClick={() => {
                  setSelectedTab('Portfolio Manager');
                  setIsMenuOpen(false);
                }}
                className={`block w-full px-3 py-2 rounded-md text-sm font-medium text-left ${
                  selectedTab === 'Portfolio Manager'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => {
                  setSelectedTab('Watchlist Manager');
                  setIsMenuOpen(false);
                }}
                className={`block w-full px-3 py-2 rounded-md text-sm font-medium text-left ${
                  selectedTab === 'Watchlist Manager'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Watchlist
              </button>
            </div>
            
            {/* Contact */}
            <button
              onClick={() => {
                setSelectedTab('Contact');
                setIsMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 rounded-md text-base font-medium text-left ${
                selectedTab === 'Contact'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Contact
            </button>
          </div>

          {/* Mobile Search */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <form onSubmit={handleSearch} className="px-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
            </form>
          </div>

          {/* Mobile User Section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">User Profile</div>
                <div className="text-sm font-medium text-gray-500">{userEmail}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedTab('User Profile');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                View Profile
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

