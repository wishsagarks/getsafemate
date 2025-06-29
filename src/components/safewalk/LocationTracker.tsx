import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, AlertCircle, Share, Eye, EyeOff, Compass, Zap, Route, Shield, Bell, History, Smartphone } from 'lucide-react';
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

interface LocationTrackerProps {
  isActive: boolean;
  onLocationUpdate: (location: LocationData) => void;
  onLocationError?: (error: string) => void;
  onSafetyScoreUpdate?: (score: number) => void;
}

export function LocationTracker({ isActive, onLocationUpdate, onLocationError, onSafetyScoreUpdate }: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [safetyScore, setSafetyScore] = useState<number>(8.5);
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [isHighAccuracyMode, setIsHighAccuracyMode] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean | null>(null);
  const [lastSafetyCheck, setLastSafetyCheck] = useState<Date | null>(null);
  const [geofenceActive, setGeofenceActive] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(100); // meters
  const [geofenceCenter, setGeofenceCenter] = useState<LocationData | null>(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(true);
  const [routeDeviation, setRouteDeviation] = useState(false);
  const [expectedRoute, setExpectedRoute] = useState<LocationData[]>([]);
  const [safetyCheckInterval, setSafetyCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const locationHistoryRef = useRef<LocationData[]>([]);
  const lastLocationRef = useRef<LocationData | null>(null);
  const safetyScoreRef = useRef<number>(8.5);

  useEffect(() => {
    if (isActive) {
      requestLocationPermission();
      checkBatteryStatus();
      startSafetyChecks();
    } else {
      stopTracking();
      stopSafetyChecks();
    }

    return () => {
      stopTracking();
      stopSafetyChecks();
    };
  }, [isActive]);

  // Update safety score when location changes
  useEffect(() => {
    if (currentLocation) {
      calculateSafetyScore();
    }
  }, [currentLocation, locationHistory]);

  const requestLocationPermission = async () => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser';
        setLocationError(error);
        onLocationError?.(error);
        return;
      }

      // Check permission status
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionStatus(permission.state as any);
        
        permission.addEventListener('change', () => {
          setPermissionStatus(permission.state as any);
        });
      } catch (error) {
        console.log('Permission API not supported');
      }

      startTracking();
    } catch (error) {
      const errorMessage = 'Failed to request location permission';
      setLocationError(errorMessage);
      onLocationError?.(errorMessage);
    }
  };

  const startTracking = () => {
    const options: PositionOptions = {
      enableHighAccuracy: isHighAccuracyMode,
      timeout: 15000,
      maximumAge: 5000
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined
      };
      
      setCurrentLocation(locationData);
      setLocationError(null);
      setPermissionStatus('granted');
      onLocationUpdate(locationData);
      lastLocationRef.current = locationData;

      // Add to history (keep last 100 locations)
      const updatedHistory = [...locationHistoryRef.current, locationData].slice(-100);
      locationHistoryRef.current = updatedHistory;
      setLocationHistory(updatedHistory);

      // Check for geofence if active
      if (geofenceActive && geofenceCenter) {
        checkGeofence(locationData, geofenceCenter, geofenceRadius);
      }

      // Check for route deviation if expected route exists
      if (expectedRoute.length > 0) {
        checkRouteDeviation(locationData, expectedRoute);
      }

      // Simulate finding nearby safe places
      if (locationHistoryRef.current.length % 5 === 0) {
        findNearbySafePlaces(locationData);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Unknown location error';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
          setPermissionStatus('denied');
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Please check your GPS settings.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again.';
          break;
      }
      
      setLocationError(errorMessage);
      onLocationError?.(errorMessage);
    };

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
    
    setWatchId(id);

    // Also get immediate position
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      options
    );
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const shareLocation = async () => {
    if (!currentLocation) return;

    setIsSharing(true);
    try {
      const locationUrl = `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      const shareData = {
        title: 'My Current Location - SafeMate',
        text: `I'm sharing my location with you for safety. Current position: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        url: locationUrl
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Location Copied', {
            body: 'Location link copied to clipboard',
            icon: '/favicon.ico'
          });
        }
      }
    } catch (error) {
      console.error('Error sharing location:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const checkBatteryStatus = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        
        const updateBatteryStatus = () => {
          setBatteryLevel(battery.level * 100);
          setIsBatteryCharging(battery.charging);
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

  const calculateSafetyScore = () => {
    if (!currentLocation || locationHistory.length < 2) return;
    
    // Factors that affect safety score:
    // 1. Location accuracy
    // 2. Speed of movement
    // 3. Time of day
    // 4. Battery level
    // 5. Area safety (simulated)
    // 6. Route deviation
    // 7. Geofence status
    
    let score = 8.5; // Base score
    
    // Accuracy factor (lower is better)
    if (currentLocation.accuracy < 10) {
      score += 0.5;
    } else if (currentLocation.accuracy > 50) {
      score -= 0.5;
    }
    
    // Speed factor (very high or very low speeds might be concerning)
    if (currentLocation.speed !== undefined) {
      const speedKmh = (currentLocation.speed * 3.6) || 0; // m/s to km/h
      if (speedKmh > 20) {
        score -= 0.3; // Moving too fast on foot
      } else if (speedKmh < 0.5 && speedKmh > 0) {
        score -= 0.2; // Almost stationary but not quite
      }
    }
    
    // Time of day factor
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      score -= 0.5; // Night time
    }
    
    // Battery factor
    if (batteryLevel !== null) {
      if (batteryLevel < 20 && !isBatteryCharging) {
        score -= 0.5;
      } else if (batteryLevel < 10 && !isBatteryCharging) {
        score -= 1.0;
      }
    }
    
    // Route deviation factor
    if (routeDeviation) {
      score -= 1.0;
    }
    
    // Geofence factor
    if (geofenceActive && !isInsideGeofence) {
      score -= 1.0;
    }
    
    // Clamp score between 1 and 10
    score = Math.max(1, Math.min(10, score));
    
    // Update safety score
    safetyScoreRef.current = score;
    setSafetyScore(score);
    onSafetyScoreUpdate?.(score);
    
    // Generate safety tips based on score and factors
    generateSafetyTips(score);
  };

  const generateSafetyTips = (score: number) => {
    const tips: string[] = [];
    
    // General tips
    tips.push("Stay in well-lit, populated areas when possible");
    
    // Score-based tips
    if (score < 5) {
      tips.push("Consider sharing your location with a trusted contact");
      tips.push("Stay alert and aware of your surroundings");
      tips.push("Consider calling a friend or using the emergency SOS feature");
    } else if (score < 7) {
      tips.push("Keep your phone charged and accessible");
      tips.push("Stick to your planned route when possible");
    }
    
    // Factor-specific tips
    if (batteryLevel !== null && batteryLevel < 20 && !isBatteryCharging) {
      tips.push("Your battery is low. Consider activating battery saver mode");
    }
    
    if (currentLocation?.accuracy && currentLocation.accuracy > 50) {
      tips.push("Your location accuracy is low. Try moving to an open area");
    }
    
    if (routeDeviation) {
      tips.push("You've deviated from your expected route. Stay vigilant");
    }
    
    if (geofenceActive && !isInsideGeofence) {
      tips.push("You've left your safe zone. Consider returning or updating your safe zone");
    }
    
    // Set random 3 tips
    const randomTips = tips.sort(() => 0.5 - Math.random()).slice(0, 3);
    setSafetyTips(randomTips);
  };

  const findNearbySafePlaces = (location: LocationData) => {
    // Simulate finding nearby safe places
    // In a real app, this would call a places API like Google Places
    
    const simulatedPlaces = [
      { name: "Central Police Station", type: "police", distance: "0.3 miles" },
      { name: "City Hospital", type: "hospital", distance: "0.7 miles" },
      { name: "24/7 Convenience Store", type: "store", distance: "0.2 miles" },
      { name: "Main Street Cafe", type: "cafe", distance: "0.4 miles" },
      { name: "Downtown Hotel", type: "hotel", distance: "0.5 miles" },
      { name: "Public Library", type: "public", distance: "0.6 miles" },
      { name: "Metro Station", type: "transit", distance: "0.3 miles" },
      { name: "University Campus", type: "education", distance: "0.8 miles" }
    ];
    
    // Randomly select 2-3 places
    const numPlaces = Math.floor(Math.random() * 2) + 2;
    const selectedPlaces = simulatedPlaces
      .sort(() => 0.5 - Math.random())
      .slice(0, numPlaces);
    
    setNearbyPlaces(selectedPlaces);
  };

  const checkGeofence = (currentLoc: LocationData, center: LocationData, radius: number) => {
    // Calculate distance between current location and geofence center
    const distance = calculateDistance(
      currentLoc.latitude, 
      currentLoc.longitude, 
      center.latitude, 
      center.longitude
    );
    
    const wasInside = isInsideGeofence;
    const nowInside = distance <= radius;
    
    setIsInsideGeofence(nowInside);
    
    // Alert if leaving geofence
    if (wasInside && !nowInside) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Geofence Alert', {
          body: `You've left your safe zone (${radius}m radius)`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const checkRouteDeviation = (currentLoc: LocationData, route: LocationData[]) => {
    // Find closest point on route
    let minDistance = Infinity;
    
    for (const point of route) {
      const distance = calculateDistance(
        currentLoc.latitude,
        currentLoc.longitude,
        point.latitude,
        point.longitude
      );
      
      minDistance = Math.min(minDistance, distance);
    }
    
    // If more than 100m from route, consider it a deviation
    const wasDeviated = routeDeviation;
    const nowDeviated = minDistance > 100;
    
    setRouteDeviation(nowDeviated);
    
    // Alert if newly deviating
    if (!wasDeviated && nowDeviated) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Route Alert', {
          body: "You've deviated from your expected route",
          icon: '/favicon.ico'
        });
      }
    }
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

  const startSafetyChecks = () => {
    // Perform safety checks every 30 seconds
    const interval = setInterval(() => {
      performSafetyCheck();
    }, 30000);
    
    setSafetyCheckInterval(interval);
    
    // Initial safety check
    performSafetyCheck();
  };

  const stopSafetyChecks = () => {
    if (safetyCheckInterval) {
      clearInterval(safetyCheckInterval);
      setSafetyCheckInterval(null);
    }
  };

  const performSafetyCheck = () => {
    setLastSafetyCheck(new Date());
    
    // Check if location is stale (no updates in 2 minutes)
    if (currentLocation) {
      const now = Date.now();
      const locationAge = now - currentLocation.timestamp;
      
      if (locationAge > 120000) { // 2 minutes
        // Location is stale
        setSafetyScore(prev => Math.max(1, prev - 1));
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SafeMate Location Alert', {
            body: "We haven't received a location update in a while. Please check your GPS.",
            icon: '/favicon.ico'
          });
        }
      }
    }
    
    // Check battery level
    if (batteryLevel !== null && batteryLevel < 15 && !isBatteryCharging) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Battery Alert', {
          body: `Battery level critical (${batteryLevel.toFixed(0)}%). Please charge your device soon.`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const setGeofenceHere = () => {
    if (currentLocation) {
      setGeofenceCenter(currentLocation);
      setGeofenceActive(true);
      setIsInsideGeofence(true);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Geofence Set', {
          body: `Safe zone set to ${geofenceRadius}m around your current location`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const clearGeofence = () => {
    setGeofenceActive(false);
    setGeofenceCenter(null);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return 'text-green-400';
    if (accuracy <= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyText = (accuracy: number) => {
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 50) return 'Good';
    return 'Poor';
  };

  const formatSpeed = (speed?: number) => {
    if (!speed) return 'Stationary';
    const kmh = speed * 3.6; // Convert m/s to km/h
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatHeading = (heading?: number) => {
    if (!heading) return 'Unknown';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return `${directions[index]} (${heading.toFixed(0)}°)`;
  };

  const getBatteryColor = (level: number | null, charging: boolean | null) => {
    if (level === null) return 'text-gray-400';
    if (charging) return 'text-green-400';
    if (level < 15) return 'text-red-400';
    if (level < 30) return 'text-yellow-400';
    return 'text-green-400';
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-green-400" />
          <h3 className="text-white font-semibold">Enhanced Location</h3>
          {currentLocation && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-300">Active</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {showDetails ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
          </button>
          
          {currentLocation && (
            <motion.button
              onClick={shareLocation}
              disabled={isSharing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSharing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Share className="h-4 w-4 text-white" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Safety Score Card */}
      {currentLocation && (
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
            
            {/* Safety Tips */}
            <div className="mt-3 space-y-1">
              {safetyTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Zap className="h-3 w-3 text-yellow-400 mt-1" />
                  <p className="text-xs text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {locationError ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start space-x-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
        >
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div>
            <p className="text-red-200 font-medium">Location Error</p>
            <p className="text-red-300 text-sm mt-1">{locationError}</p>
            {permissionStatus === 'denied' && (
              <button
                onClick={requestLocationPermission}
                className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
              >
                Retry Permission
              </button>
            )}
          </div>
        </motion.div>
      ) : currentLocation ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Basic Location Info */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-200">
            <div>
              <span className="text-gray-400">Latitude:</span>
              <p className="font-mono text-white">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-400">Longitude:</span>
              <p className="font-mono text-white">{currentLocation.longitude.toFixed(6)}</p>
            </div>
          </div>

          {/* Accuracy and Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Accuracy:</span>
              <span className={`font-medium ${getAccuracyColor(currentLocation.accuracy)}`}>
                ±{Math.round(currentLocation.accuracy)}m ({getAccuracyText(currentLocation.accuracy)})
              </span>
            </div>
            <span className="text-gray-400">
              Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Battery Status */}
          {batteryLevel !== null && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Battery:</span>
                <span className={`font-medium ${getBatteryColor(batteryLevel, isBatteryCharging)}`}>
                  {batteryLevel.toFixed(0)}% {isBatteryCharging ? '(Charging)' : ''}
                </span>
              </div>
              {lastSafetyCheck && (
                <span className="text-gray-400">
                  Safety Check: {lastSafetyCheck.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          {/* Geofence Status */}
          {geofenceActive && (
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Route className="h-4 w-4 text-blue-400" />
                  <span className="text-white text-sm font-medium">Safe Zone Active</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isInsideGeofence ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {isInsideGeofence ? 'Inside Zone' : 'Outside Zone'}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {geofenceRadius}m radius around set location
              </p>
              <button
                onClick={clearGeofence}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Clear Safe Zone
              </button>
            </div>
          )}

          {/* Detailed Information */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t border-white/20"
            >
              {/* Speed and Direction */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Speed:</span>
                  <p className="text-white">{formatSpeed(currentLocation.speed)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Direction:</span>
                  <p className="text-white">{formatHeading(currentLocation.heading)}</p>
                </div>
              </div>

              {/* Nearby Safe Places */}
              {nearbyPlaces.length > 0 && (
                <div>
                  <span className="text-gray-400 text-sm">Nearby Safe Places:</span>
                  <div className="mt-2 space-y-2">
                    {nearbyPlaces.map((place, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-blue-500/20 rounded-full">
                            <MapPin className="h-3 w-3 text-blue-400" />
                          </div>
                          <span className="text-xs text-white">{place.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{place.distance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location History */}
              {locationHistory.length > 1 && (
                <div>
                  <span className="text-gray-400 text-sm">Recent Locations:</span>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {locationHistory.slice(-5).reverse().map((loc, index) => (
                      <div key={loc.timestamp} className="text-xs text-gray-300 font-mono">
                        {new Date(loc.timestamp).toLocaleTimeString()}: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Location Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const mapsUrl = `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="p-2 bg-green-500/80 hover:bg-green-500 text-white text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <MapPin className="h-3 w-3" />
                  <span>Open in Maps</span>
                </button>
                
                <button
                  onClick={() => {
                    const coords = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                    navigator.clipboard.writeText(coords);
                    
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('Coordinates Copied', {
                        body: 'Location coordinates copied to clipboard',
                        icon: '/favicon.ico'
                      });
                    }
                  }}
                  className="p-2 bg-blue-500/80 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <Compass className="h-3 w-3" />
                  <span>Copy Coordinates</span>
                </button>
                
                <button
                  onClick={() => setIsHighAccuracyMode(!isHighAccuracyMode)}
                  className={`p-2 ${
                    isHighAccuracyMode 
                      ? 'bg-purple-500/80 hover:bg-purple-500' 
                      : 'bg-gray-500/80 hover:bg-gray-500'
                  } text-white text-xs rounded-lg transition-colors flex items-center justify-center space-x-1`}
                >
                  <Zap className="h-3 w-3" />
                  <span>{isHighAccuracyMode ? 'High Accuracy On' : 'Standard Accuracy'}</span>
                </button>
                
                <button
                  onClick={geofenceActive ? clearGeofence : setGeofenceHere}
                  className={`p-2 ${
                    geofenceActive 
                      ? 'bg-red-500/80 hover:bg-red-500' 
                      : 'bg-yellow-500/80 hover:bg-yellow-500'
                  } text-white text-xs rounded-lg transition-colors flex items-center justify-center space-x-1`}
                >
                  <Route className="h-3 w-3" />
                  <span>{geofenceActive ? 'Clear Safe Zone' : 'Set Safe Zone Here'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 text-gray-300"
        >
          <Navigation className="h-4 w-4 animate-spin" />
          <span className="text-sm">Getting precise location...</span>
        </motion.div>
      )}

      {/* Permission Status Indicator */}
      <div className="mt-4 pt-3 border-t border-white/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Permission Status:</span>
          <span className={`font-medium ${
            permissionStatus === 'granted' ? 'text-green-400' : 
            permissionStatus === 'denied' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {permissionStatus === 'granted' ? 'Granted' : 
             permissionStatus === 'denied' ? 'Denied' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}