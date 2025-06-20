import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthModal } from './components/auth/AuthModal';
import { SettingsPage } from './components/settings/SettingsPage';
import { Navbar } from './components/ui/navbar';
import { Hero } from './components/Hero';
import { AppModes } from './components/AppModes';
import { HowItWorks } from './components/HowItWorks';
import { Benefits } from './components/Benefits';
import { Gamification } from './components/Gamification';
import { SocialProof } from './components/SocialProof';
import { Footer } from './components/Footer';
import { Home, Shield, Heart, Star, Users, Mail, MapPin, Zap, Settings } from 'lucide-react';

const navItems = [
  { name: "Home", link: "#home", icon: <Home className="h-4 w-4" /> },
  { name: "Features", link: "#features", icon: <Shield className="h-4 w-4" /> },
  { name: "How It Works", link: "#how-it-works", icon: <Heart className="h-4 w-4" /> },
  { name: "Reviews", link: "#reviews", icon: <Star className="h-4 w-4" /> },
  { name: "Contact", link: "#contact", icon: <Mail className="h-4 w-4" /> },
];

function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Enhanced Navbar that transitions to floating on scroll */}
      <Navbar 
        navItems={navItems} 
        onAuthClick={openAuthModal}
      />

      {/* Main Content with proper spacing to avoid navbar overlap */}
      <main className="pt-16">
        <section id="home">
          <Hero onGetStarted={() => openAuthModal('signup')} />
        </section>
        
        <section id="features">
          <AppModes />
        </section>
        
        <section id="how-it-works">
          <HowItWorks />
        </section>
        
        <section id="benefits">
          <Benefits />
        </section>
        
        <section id="gamification">
          <Gamification />
        </section>
        
        <section id="reviews">
          <SocialProof />
        </section>
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">SafeMate Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Your safety companion</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/settings'}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Safe Walk Mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Safe Walk</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Real-time protection</p>
              </div>
            </div>
            <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all">
              Start Safe Walk
            </button>
          </div>

          {/* HeartMate Mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Heart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">HeartMate</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Emotional support</p>
              </div>
            </div>
            <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium transition-all">
              Chat with AI
            </button>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Emergency</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Quick access</p>
              </div>
            </div>
            <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all">
              SOS Alert
            </button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                <MapPin className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Safe journey completed</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                <Heart className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">HeartMate conversation</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Yesterday</p>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Safety Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Safe Journeys</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">47</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">AI Chats</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Streak Days</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="safemate-theme">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Landing page - accessible to everyone */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Protected dashboard - requires authentication and onboarding */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Protected settings page - requires authentication and onboarding */}
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <SettingsPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;