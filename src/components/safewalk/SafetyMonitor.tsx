import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Zap, 
  Users, 
  Bell,
  Smartphone,
  Route,
  Compass,
  Eye,
  EyeOff,
  Calendar,
  History,
  Target,
  Vibrate
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle } from '../ui/aceternity-card';
import { Button } from '../ui/aceternity-button';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface SafetyMonitorProps {
  isActive: boolean;
  currentLocation: LocationData | null;
  safetyScore?: number;
  sessionDuration: number;
  onSafetyAlert?: (alertType: string, message: string) => void;
}

export function SafetyMonitor({ 
  isActive, 
  currentLocation, 
  safetyScore = 8.5, 
  sessionDuration,
  onSafetyAlert
}: SafetyMonitorProps) {
  const { user } = useAuth();
  const [checkInInterval, setCheckInInterval] = useState<number>(120); // seconds
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [nextCheckIn, setNextCheckIn] = useState<Date | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [safeAreas, setSafeAreas] = useState<any[]>([]);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState<Date | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [destinationName, setDestinationName] = useState<string>('Home');
  const [safetyStatus, setSafetyStatus] = useState<'safe' | 'caution' | 'warning'>('safe');
  const [autoCheckIn, setAutoCheckIn] = useState<boolean>(true);
  const [manualCheckInCount, setManualCheckInCount] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [averageSpeed, setAverageSpeed] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [safetyEvents, setSafetyEvents] = useState<any[]>([]);
  const [showSafetyEvents, setShowSafetyEvents] = useState<boolean>(false);

  const checkInTimerRef = useRef<NodeJS.Timeout | null>(null);
  const locationHistoryRef = useRef<LocationData[]>([]);
  const lastSpeedUpdateRef = useRef<number>(Date.now());
  const speedReadingsRef = useRef<number[]>([]);

  useEffect(() => {
    if (isActive) {
      startSafetyMonitoring();
      loadSafetyData();
      checkBatteryStatus();
      generateSafetyTips();
      simulateDestination();
    } else {
      stopSafetyMonitoring();
    }

    return () => {
      stopSafetyMonitoring();
    };
  }, [isActive]);

  useEffect(() => {
    if (currentLocation) {
      // Add to location history
      locationHistoryRef.current = [...locationHistoryRef.current, currentLocation].slice(-100);
      
      // Update movement status and calculate speed
      updateMovementStatus(currentLocation);
      
      // Update total distance
      if (locationHistoryRef.current.length > 1) {
        const prevLocation = locationHistoryRef.current[locationHistoryRef.current.length - 2];
        const distance = calculateDistance(
          prevLocation.latitude,
          prevLocation.longitude,
          currentLocation.latitude,
          currentLocation.longitude
        );
        setTotalDistance(prev => prev + distance);
      }
      
      // Update estimated time remaining
      updateEstimatedTimeRemaining();
    }
  }, [currentLocation]);

  const startSafetyMonitoring = () => {
    // Schedule first check-in
    scheduleNextCheckIn();
    
    // Generate initial safety tips
    generateSafetyTips();
    
    // Simulate finding safe areas
    findSafeAreas();
  };

  const stopSafetyMonitoring = () => {
    if (checkInTimerRef.current) {
      clearTimeout(checkInTimerRef.current);
      checkInTimerRef.current = null;
    }
  };

  const loadSafetyData = async () => {
    if (!user) return;
    
    try {
      // Load check-in history
      const { data: checkIns, error: checkInsError } = await supabase
        .from('safety_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'safe_arrival')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!checkInsError && checkIns) {
        setCheckInHistory(checkIns);
      }
      
      // Load safety events
      const { data: events, error: eventsError } = await supabase
        .from('safety_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (!eventsError && events) {
        setSafetyEvents(events);
      }
      
      // Load user preferences
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('safety_preferences')
        .eq('id', user.id)
        .single();
        
      if (!profileError && profile?.safety_preferences) {
        if (profile.safety_preferences.autoCheckIn !== undefined) {
          setAutoCheckIn(profile.safety_preferences.autoCheckIn);
        }
      }
    } catch (error) {
      console.error('Error loading safety data:', error);
    }
  };

  const checkBatteryStatus = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        
        const updateBatteryStatus = () => {
          setBatteryLevel(battery.level * 100);
          setIsBatteryCharging(battery.charging);
          
          // Generate safety alert for low battery
          if (battery.level < 0.15 && !battery.charging) {
            addSafetyAlert('battery', 'Low battery level. Consider charging your device soon.');
          }
        };
        
        // Initial status
        updateBatteryStatus();
        
        // Listen for changes
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
        
        return () => {
          battery.removeEventListener('levelchange', updateBatteryStatus);
          battery.removeEventListener('chargingchange', updateBatteryStatus);
        };
      } catch (error) {
        console.error('Battery status API error:', error);
      }
    }
  };

  const scheduleNextCheckIn = () => {
    // Clear any existing timer
    if (checkInTimerRef.current) {
      clearTimeout(checkInTimerRef.current);
    }
    
    // Schedule next check-in
    const nextTime = new Date();
    nextTime.setSeconds(nextTime.getSeconds() + checkInInterval);
    setNextCheckIn(nextTime);
    
    checkInTimerRef.current = setTimeout(() => {
      if (autoCheckIn) {
        performCheckIn();
      } else {
        // Remind user to check in
        addSafetyAlert('check-in', 'Time for a safety check-in. Please confirm you are safe.');
        
        // Vibrate to notify (if supported)
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SafeMate Check-In', {
            body: 'Time for your safety check-in. Please confirm you are safe.',
            icon: '/favicon.ico'
          });
        }
      }
    }, checkInInterval * 1000);
  };

  const performCheckIn = async () => {
    const now = new Date();
    setLastCheckIn(now);
    
    // Add to check-in history
    const newCheckIn = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      location: currentLocation,
      status: 'safe'
    };
    
    setCheckInHistory(prev => [newCheckIn, ...prev].slice(0, 10));
    setManualCheckInCount(prev => prev + 1);
    
    // Log check-in to database
    if (user && currentLocation) {
      try {
        await supabase
          .from('safety_events')
          .insert({
            user_id: user.id,
            event_type: 'safe_arrival',
            severity: 'low',
            location_lat: currentLocation.latitude,
            location_lng: currentLocation.longitude,
            location_accuracy: currentLocation.accuracy,
            notes: 'User checked in safely',
            created_at: now.toISOString()
          });
      } catch (error) {
        console.error('Error logging check-in:', error);
      }
    }
    
    // Schedule next check-in
    scheduleNextCheckIn();
    
    // Show confirmation
    addSafetyAlert('success', 'Check-in successful! Your location has been logged securely.');
    
    // Notify safety alert handler
    onSafetyAlert?.('check-in', 'User checked in safely');
    
    return newCheckIn;
  };

  const addSafetyAlert = (type: string, message: string) => {
    const newAlert = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    setSafetyAlerts(prev => [newAlert, ...prev].slice(0, 5));
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SafeMate Alert', {
        body: message,
        icon: '/favicon.ico'
      });
    }
    
    // Vibrate pattern (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const generateSafetyTips = () => {
    const allTips = [
      "Stay in well-lit, populated areas when possible",
      "Keep your phone charged and accessible",
      "Share your route with trusted contacts",
      "Be aware of your surroundings at all times",
      "Trust your instincts - if something feels wrong, seek help",
      "Avoid wearing headphones in unfamiliar areas",
      "Walk confidently and with purpose",
      "Have your keys ready before reaching your destination",
      "Vary your routine to avoid predictability",
      "Consider using SafeMate's video companion for added security"
    ];
    
    // Select 3 random tips
    const selectedTips = allTips.sort(() => 0.5 - Math.random()).slice(0, 3);
    setSafetyTips(selectedTips);
  };

  const findSafeAreas = () => {
    // Simulate finding safe areas
    // In a real app, this would call a places API
    
    const simulatedAreas = [
      { name: "Central Police Station", type: "police", distance: "0.3 miles" },
      { name: "City Hospital", type: "hospital", distance: "0.7 miles" },
      { name: "24/7 Convenience Store", type: "store", distance: "0.2 miles" },
      { name: "Main Street Cafe", type: "cafe", distance: "0.4 miles" },
      { name: "Downtown Hotel", type: "hotel", distance: "0.5 miles" }
    ];
    
    // Randomly select 2-3 areas
    const numAreas = Math.floor(Math.random() * 2) + 2;
    const selectedAreas = simulatedAreas
      .sort(() => 0.5 - Math.random())
      .slice(0, numAreas);
    
    setSafeAreas(selectedAreas);
  };

  const simulateDestination = () => {
    // Simulate a destination with estimated arrival time
    const now = new Date();
    const minutesToAdd = Math.floor(Math.random() * 20) + 10; // 10-30 minutes
    const arrival = new Date(now.getTime() + minutesToAdd * 60000);
    
    setExpectedArrivalTime(arrival);
    setEstimatedTimeRemaining(minutesToAdd * 60); // in seconds
    
    // Randomly select a destination name
    const destinations = ["Home", "Work", "Gym", "Friend's Place", "School", "Library"];
    const selected = destinations[Math.floor(Math.random() * destinations.length)];
    setDestinationName(selected);
  };

  const updateEstimatedTimeRemaining = () => {
    if (!expectedArrivalTime) return;
    
    const now = new Date();
    const diffMs = expectedArrivalTime.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec > 0) {
      setEstimatedTimeRemaining(diffSec);
    } else {
      // Arrived at destination
      setEstimatedTimeRemaining(0);
      
      // Generate arrival alert if we just arrived
      if (estimatedTimeRemaining !== 0) {
        addSafetyAlert('arrival', `You've arrived at your destination: ${destinationName}`);
        
        // Log safe arrival
        if (user && currentLocation) {
          try {
            supabase
              .from('safety_events')
              .insert({
                user_id: user.id,
                event_type: 'safe_arrival',
                severity: 'low',
                location_lat: currentLocation.latitude,
                location_lng: currentLocation.longitude,
                location_accuracy: currentLocation.accuracy,
                notes: `Arrived at destination: ${destinationName}`,
                created_at: new Date().toISOString()
              });
          } catch (error) {
            console.error('Error logging safe arrival:', error);
          }
        }
      }
    }
  };

  const updateMovementStatus = (location: LocationData) => {
    const now = Date.now();
    
    // Update speed readings (if available)
    if (location.speed !== undefined && location.speed !== null) {
      speedReadingsRef.current.push(location.speed);
      
      // Keep only last 5 readings
      if (speedReadingsRef.current.length > 5) {
        speedReadingsRef.current.shift();
      }
      
      // Calculate average speed (in km/h)
      const avgSpeed = speedReadingsRef.current.reduce((sum, speed) => sum + speed, 0) / 
                      speedReadingsRef.current.length * 3.6; // Convert m/s to km/h
      
      setAverageSpeed(avgSpeed);
      
      // Determine if moving
      setIsMoving(avgSpeed > 0.5); // Moving if speed > 0.5 km/h
    } else if (locationHistoryRef.current.length > 1) {
      // If speed not available, calculate from position changes
      const prevLocation = locationHistoryRef.current[locationHistoryRef.current.length - 2];
      const timeDiff = (now - prevLocation.timestamp) / 1000; // seconds
      
      if (timeDiff > 0) {
        const distance = calculateDistance(
          prevLocation.latitude,
          prevLocation.longitude,
          location.latitude,
          location.longitude
        );
        
        const speed = distance / timeDiff; // m/s
        const speedKmh = speed * 3.6; // km/h
        
        // Update speed readings
        speedReadingsRef.current.push(speed);
        
        // Keep only last 5 readings
        if (speedReadingsRef.current.length > 5) {
          speedReadingsRef.current.shift();
        }
        
        // Calculate average speed
        const avgSpeed = speedReadingsRef.current.reduce((sum, speed) => sum + speed, 0) / 
                        speedReadingsRef.current.length * 3.6; // Convert m/s to km/h
        
        setAverageSpeed(avgSpeed);
        
        // Determine if moving
        setIsMoving(avgSpeed > 0.5); // Moving if speed > 0.5 km/h
      }
    }
    
    // Update last speed update time
    lastSpeedUpdateRef.current = now;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // Distance in meters
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'Unknown';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    
    return `${mins}m ${secs}s`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    } else {
      return `${(meters / 1000).toFixed(2)}km`;
    }
  };

  const getSafetyStatusColor = (status: 'safe' | 'caution' | 'warning') => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'caution': return 'text-yellow-400';
      case 'warning': return 'text-red-400';
      default: return 'text-green-400';
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-400" />
          <h3 className="text-white font-semibold">Safety Monitor</h3>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              safetyStatus === 'safe' ? 'bg-green-400 animate-pulse' : 
              safetyStatus === 'caution' ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400 animate-pulse'
            }`} />
            <span className={`text-xs ${getSafetyStatusColor(safetyStatus)}`}>
              {safetyStatus === 'safe' ? 'Safe' : 
               safetyStatus === 'caution' ? 'Caution' : 'Warning'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {showDetails ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Safety Score */}
      <Card className="bg-black/30 border-white/10 mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Safety Score</span>
            </div>
            <span className={`text-xl font-bold ${getSafetyScoreColor(safetyScore)}`}>
              {safetyScore.toFixed(1)}/10
            </span>
          </div>
          
          <div className="w-full bg-black/50 rounded-full h-2 mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(safetyScore / 10) * 100}%` }}
              transition={{ duration: 0.5 }}
              className={`h-2 rounded-full ${
                safetyScore >= 8 ? 'bg-green-500' : 
                safetyScore >= 6 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
            />
          </div>
          
          {/* Safety Factors */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-gray-300">Location Tracking</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-green-400" />
              <span className="text-xs text-gray-300">Regular Check-ins</span>
            </div>
            <div className="flex items-center space-x-2">
              <Route className="h-3 w-3 text-purple-400" />
              <span className="text-xs text-gray-300">Route Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className="h-3 w-3 text-yellow-400" />
              <span className="text-xs text-gray-300">Alert System</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Check-in Status */}
      <div className="mb-4 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-400" />
            <span className="text-white font-medium">Safety Check-ins</span>
          </div>
          <Button
            onClick={performCheckIn}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-xs"
          >
            Check In Now
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <span className="text-xs text-gray-400">Last Check-in:</span>
            <p className="text-sm text-white">
              {lastCheckIn ? lastCheckIn.toLocaleTimeString() : 'None yet'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Next Check-in:</span>
            <p className="text-sm text-white">
              {nextCheckIn ? nextCheckIn.toLocaleTimeString() : 'Not scheduled'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-white">Auto Check-in</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheckIn}
              onChange={() => setAutoCheckIn(!autoCheckIn)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Journey Information */}
      <div className="mb-4 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Route className="h-5 w-5 text-purple-400" />
          <span className="text-white font-medium">Journey Information</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <span className="text-xs text-gray-400">Destination:</span>
            <p className="text-sm text-white">{destinationName}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">ETA:</span>
            <p className="text-sm text-white">
              {expectedArrivalTime ? expectedArrivalTime.toLocaleTimeString() : 'Unknown'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Time Remaining:</span>
            <p className="text-sm text-white">
              {estimatedTimeRemaining !== null ? formatTime(estimatedTimeRemaining) : 'Unknown'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Distance Traveled:</span>
            <p className="text-sm text-white">{formatDistance(totalDistance)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Compass className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-white">
            {isMoving ? 'Currently Moving' : 'Currently Stationary'}
            {averageSpeed !== null && ` (${averageSpeed.toFixed(1)} km/h)`}
          </span>
        </div>
      </div>

      {/* Safety Alerts */}
      {safetyAlerts.length > 0 && (
        <div className="mb-4 p-4 bg-black/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-medium">Safety Alerts</span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {safetyAlerts.map((alert, index) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-lg ${
                  alert.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                  alert.type === 'battery' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  alert.type === 'check-in' ? 'bg-blue-500/20 border border-blue-500/30' :
                  alert.type === 'arrival' ? 'bg-purple-500/20 border border-purple-500/30' :
                  'bg-red-500/20 border border-red-500/30'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {alert.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                  ) : alert.type === 'battery' ? (
                    <Smartphone className="h-4 w-4 text-yellow-400 mt-0.5" />
                  ) : alert.type === 'check-in' ? (
                    <Bell className="h-4 w-4 text-blue-400 mt-0.5" />
                  ) : alert.type === 'arrival' ? (
                    <Target className="h-4 w-4 text-purple-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-white">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Tips */}
      <div className="mb-4 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="h-5 w-5 text-blue-400" />
          <span className="text-white font-medium">Safety Tips</span>
        </div>
        
        <div className="space-y-2">
          {safetyTips.map((tip, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5" />
              <p className="text-sm text-gray-300">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 space-y-4"
        >
          {/* Safe Areas */}
          {safeAreas.length > 0 && (
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">Nearby Safe Places</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {safeAreas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-green-500/20 rounded-full">
                        <MapPin className="h-3 w-3 text-green-400" />
                      </div>
                      <span className="text-sm text-white">{area.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{area.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Events Toggle */}
          <div>
            <button
              onClick={() => setShowSafetyEvents(!showSafetyEvents)}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              <History className="h-4 w-4" />
              <span>{showSafetyEvents ? 'Hide Safety Events' : 'Show Safety Events'}</span>
            </button>
          </div>

          {/* Safety Events History */}
          {showSafetyEvents && safetyEvents.length > 0 && (
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="h-5 w-5 text-purple-400" />
                <span className="text-white font-medium">Safety Event History</span>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {safetyEvents.map((event, index) => (
                  <div key={index} className="p-3 bg-black/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          event.severity === 'high' ? 'bg-red-500' :
                          event.severity === 'medium' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`} />
                        <span className="text-white text-xs font-medium">{event.event_type.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(event.created_at).toLocaleDateString()} {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {event.notes && (
                      <p className="text-gray-300 text-xs mt-1">{event.notes}</p>
                    )}
                    
                    {event.location_lat && event.location_lng && (
                      <button
                        onClick={() => {
                          const mapsUrl = `https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Location
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Check-in Interval Adjustment */}
          <div className="p-4 bg-black/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">Check-in Interval</span>
              </div>
              <span className="text-sm text-white">{formatTime(checkInInterval)}</span>
            </div>
            
            <input
              type="range"
              min="60"
              max="300"
              step="30"
              value={checkInInterval}
              onChange={(e) => {
                setCheckInInterval(parseInt(e.target.value));
                scheduleNextCheckIn(); // Reschedule with new interval
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 min</span>
              <span>3 min</span>
              <span>5 min</span>
            </div>
          </div>

          {/* Emergency Vibration Test */}
          <div className="p-4 bg-black/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Vibrate className="h-5 w-5 text-purple-400" />
                <div>
                  <span className="text-white font-medium">Test Emergency Alerts</span>
                  <p className="text-xs text-gray-400">Test vibration and notification</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Test vibration
                  if ('vibrate' in navigator) {
                    navigator.vibrate([300, 100, 300, 100, 300]);
                  }
                  
                  // Test notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('SafeMate Test Alert', {
                      body: 'This is a test emergency alert. Your notifications are working correctly.',
                      icon: '/favicon.ico'
                    });
                  }
                  
                  addSafetyAlert('success', 'Test alert sent successfully!');
                }}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-xs"
              >
                Test Alerts
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}