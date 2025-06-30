import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthModal } from './components/auth/AuthModal';
import { SettingsPage } from './components/settings/SettingsPage';
import { SafeWalkMode } from './components/safewalk/SafeWalkMode';
import { HeartMateMode } from './components/heartmate/HeartMateMode';
import { EnhancedDashboard } from './components/dashboard/EnhancedDashboard';
import { InsightsPage } from './components/insights/InsightsPage';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { GamificationDashboard } from './components/gamification/GamificationDashboard';
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

  // Check URL parameters for signin flag
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldSignIn = urlParams.get('signin') === 'true';
    
    if (shouldSignIn) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

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
  const [safeWalkActive, setSafeWalkActive] = useState(false);
  const [heartMateActive, setHeartMateActive] = useState(false);

  if (safeWalkActive) {
    return <SafeWalkMode onClose={() => setSafeWalkActive(false)} />;
  }

  if (heartMateActive) {
    return <HeartMateMode onClose={() => setHeartMateActive(false)} />;
  }

  return (
    <EnhancedDashboard
      onSafeWalkStart={() => setSafeWalkActive(true)}
      onHeartMateStart={() => setHeartMateActive(true)}
    />
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

            {/* Protected insights page - requires authentication and onboarding */}
            <Route 
              path="/insights" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <InsightsPage />
                </ProtectedRoute>
              } 
            />

            {/* Protected analytics page - requires authentication and onboarding */}
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Protected gamification page - requires authentication and onboarding */}
            <Route 
              path="/gamification" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <GamificationDashboard />
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