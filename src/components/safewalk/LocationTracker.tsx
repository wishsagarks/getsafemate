import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, AlertCircle, Share, Eye, EyeOff } from 'lucide-react';

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
}

export function LocationTracker({ isActive, onLocationUpdate, onLocationError }: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const locationHistoryRef = useRef<LocationData[]>([]);

  useEffect(() => {
    if (isActive) {
      requestLocationPermission();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive]);

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
      enableHighAccuracy: true,
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

      // Add to history (keep last 100 locations)
      locationHistoryRef.current = [...locationHistoryRef.current, locationData].slice(-100);
      setLocationHistory([...locationHistoryRef.current]);
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

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-green-400" />
          <h3 className="text-white font-semibold">Live Location</h3>
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

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const mapsUrl = `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="p-2 bg-green-500/80 hover:bg-green-500 text-white text-xs rounded-lg transition-colors"
                >
                  Open in Maps
                </button>
                <button
                  onClick={() => {
                    const coords = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
                    navigator.clipboard.writeText(coords);
                  }}
                  className="p-2 bg-blue-500/80 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                >
                  Copy Coordinates
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