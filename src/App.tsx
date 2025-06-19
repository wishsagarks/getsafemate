import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';
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

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="safemate-theme">
      <div className="min-h-screen bg-white dark:bg-black">
        {/* Enhanced Navbar that transitions to floating on scroll */}
        <Navbar navItems={navItems} />

        {/* Main Content with proper spacing to avoid navbar overlap */}
        <main className="pt-16">
          <section id="home">
            <Hero />
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
      </div>
    </ThemeProvider>
  );
}

export default App;