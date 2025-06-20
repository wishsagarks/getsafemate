import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthModal } from './components/auth/AuthModal';
import { Navbar } from './components/ui/navbar';
import { Hero } from './components/Hero';
import { AppModes } from './components/AppModes';
import { HowItWorks } from './components/HowItWorks';
import { Benefits } from './components/Benefits';
import { Gamification } from './components/Gamification';
import { SocialProof } from './components/SocialProof';
import { Footer } from './components/Footer';
import { Home, Shield, Heart, Star, Users, Mail } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <Shield className="h-16 w-16 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to SafeMate Dashboard
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Your safety companion is ready to protect you
        </p>
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
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <LandingPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
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