import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationTrackerProps {
  isActive: boolean;
  onLocationUpdate: (location: LocationData) => void;
}

export function LocationTracker({ isActive, onLocationUpdate }: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (isActive && navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      };

      const handleSuccess = (position: GeolocationPosition) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        setCurrentLocation(locationData);
        setLocationError(null);
        onLocationUpdate(locationData);
      };

      const handleError = (error: GeolocationPositionError) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setLocationError(errorMessage);
      };

      // Start watching position
      const id = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        options
      );
      
      setWatchId(id);

      return () => {
        if (id) {
          navigator.geolocation.clearWatch(id);
        }
      };
    } else if (!isActive && watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [isActive, onLocationUpdate]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
      <div className="flex items-center space-x-3 mb-3">
        <MapPin className="h-5 w-5 text-green-400" />
        <h3 className="text-white font-medium">Live Location</h3>
        {currentLocation && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300">Tracking</span>
          </div>
        )}
      </div>

      {locationError ? (
        <div className="flex items-center space-x-2 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{locationError}</span>
        </div>
      ) : currentLocation ? (
        <div className="space-y-2 text-sm text-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Latitude:</span>
              <p className="font-mono">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-400">Longitude:</span>
              <p className="font-mono">{currentLocation.longitude.toFixed(6)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Accuracy: ±{Math.round(currentLocation.accuracy)}m</span>
            <span>Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-gray-300">
          <Navigation className="h-4 w-4 animate-spin" />
          <span className="text-sm">Getting location...</span>
        </div>
      )}
    </div>
  );
}