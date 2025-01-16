'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { StockPointLogo } from './StockPointLogo';

const tabs = [
  { name: "Home", id: "Home" },
  { name: "Performance", id: "Performance Comparator" },
  { name: "Market Profile", id: "Market Profile" },
  { name: "Technical Analysis", id: "Technical Analysis" },
  { name: "NIFTY Predictor", id: "NIFTY predictor" },
  { name: "Forecaster", id: "General Forecaster" },
  { name: "Contact", id: "Contact" }
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
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
    await supabase.auth.signOut();
    onLogout();
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
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-2">
                {tabs.slice(0, -1).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedTab === tab.id
                        ? 'bg-blue-500 text-white transform -translate-y-1 shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center space-x-6">
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

            <div className="flex items-center space-x-4">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks..."
                  className="w-48 pl-9 pr-3 py-1 border border-gray-200 rounded-full bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500"
                />
              </form>
              
              <div className="relative group">
                <Button variant="ghost" size="icon" className="rounded-full text-gray-700 hover:bg-gray-100">
                  <User className="h-5 w-5" />
                </Button>
                {userEmail && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="px-4 py-2 text-sm text-gray-700">{userEmail}</p>
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTab(tab.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full px-3 py-2 rounded-full text-base font-medium ${
                  selectedTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Mobile User Section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">User Profile</div>
                <div className="text-sm font-medium text-gray-500">{userEmail}</div>
              </div>
            </div>
            <div className="mt-3 px-2">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-full text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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

