import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Camera, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Settings
} from 'lucide-react';

interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'checking';
  camera: 'granted' | 'denied' | 'prompt' | 'checking';
  location: 'granted' | 'denied' | 'prompt' | 'checking';
}

interface PermissionManagerProps {
  onPermissionsGranted: () => void;
  onClose: () => void;
}

export function PermissionManager({ onPermissionsGranted, onClose }: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    microphone: 'prompt',
    camera: 'prompt',
    location: 'prompt'
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const permissionSteps = [
    {
      key: 'microphone' as keyof PermissionStatus,
      title: 'Microphone Access',
      description: 'Required for voice commands, AI companion chat, and emergency recording',
      icon: Mic,
      color: 'blue',
      critical: true
    },
    {
      key: 'camera' as keyof PermissionStatus,
      title: 'Camera Access',
      description: 'Optional for video calls with AI companion and emergency contacts',
      icon: Camera,
      color: 'purple',
      critical: false
    },
    {
      key: 'location' as keyof PermissionStatus,
      title: 'Location Access',
      description: 'Essential for GPS tracking, route optimization, and emergency location sharing',
      icon: MapPin,
      color: 'green',
      critical: true
    }
  ];

  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    const newPermissions = { ...permissions };

    // Check microphone permission
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      newPermissions.microphone = micPermission.state as any;
    } catch (error) {
      console.log('Microphone permission check not supported');
    }

    // Check camera permission
    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      newPermissions.camera = cameraPermission.state as any;
    } catch (error) {
      console.log('Camera permission check not supported');
    }

    // Check location permission
    try {
      const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      newPermissions.location = locationPermission.state as any;
    } catch (error) {
      console.log('Location permission check not supported');
    }

    setPermissions(newPermissions);

    // If all critical permissions are granted, auto-proceed
    if (newPermissions.microphone === 'granted' && newPermissions.location === 'granted') {
      onPermissionsGranted();
    }
  };

  const requestPermission = async (type: keyof PermissionStatus) => {
    setIsRequesting(true);
    setPermissions(prev => ({ ...prev, [type]: 'checking' }));

    try {
      switch (type) {
        case 'microphone':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setPermissions(prev => ({ ...prev, microphone: 'granted' }));
          } catch (error) {
            setPermissions(prev => ({ ...prev, microphone: 'denied' }));
          }
          break;

        case 'camera':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            setPermissions(prev => ({ ...prev, camera: 'granted' }));
          } catch (error) {
            setPermissions(prev => ({ ...prev, camera: 'denied' }));
          }
          break;

        case 'location':
          try {
            await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                () => {
                  setPermissions(prev => ({ ...prev, location: 'granted' }));
                  resolve(true);
                },
                () => {
                  setPermissions(prev => ({ ...prev, location: 'denied' }));
                  reject();
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            });
          } catch (error) {
            setPermissions(prev => ({ ...prev, location: 'denied' }));
          }
          break;
      }
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      setPermissions(prev => ({ ...prev, [type]: 'denied' }));
    } finally {
      setIsRequesting(false);
    }
  };

  const requestAllPermissions = async () => {
    for (const step of permissionSteps) {
      if (permissions[step.key] !== 'granted') {
        await requestPermission(step.key);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
      }
    }
  };

  const canProceed = () => {
    const criticalPermissions = permissionSteps.filter(step => step.critical);
    return criticalPermissions.every(step => permissions[step.key] === 'granted');
  };

  const getPermissionIcon = (status: string) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'denied':
        return <X className="h-6 w-6 text-red-500" />;
      case 'checking':
        return <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'checking':
        return 'Requesting...';
      default:
        return 'Required';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return 'text-green-600 dark:text-green-400';
      case 'denied':
        return 'text-red-600 dark:text-red-400';
      case 'checking':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="relative p-8 pb-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Safety Permissions
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Grant permissions to enable SafeMate's protection features
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 bg-white dark:bg-gray-900">
          <div className="space-y-6">
            {/* Permission Cards */}
            {permissionSteps.map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  permissions[step.key] === 'granted'
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : permissions[step.key] === 'denied'
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl bg-${step.color}-100 dark:bg-${step.color}-900/30`}>
                      <step.icon className={`h-6 w-6 text-${step.color}-600 dark:text-${step.color}-400`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {step.title}
                        </h3>
                        {step.critical && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(permissions[step.key])}
                      <span className={`text-sm font-medium ${getStatusColor(permissions[step.key])}`}>
                        {getStatusText(permissions[step.key])}
                      </span>
                    </div>
                    
                    {permissions[step.key] !== 'granted' && permissions[step.key] !== 'checking' && (
                      <motion.button
                        onClick={() => requestPermission(step.key)}
                        disabled={isRequesting}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg font-medium text-white transition-all ${
                          step.critical
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } disabled:opacity-50`}
                      >
                        Grant
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Permission denied help */}
                {permissions[step.key] === 'denied' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="flex items-start space-x-2">
                      <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                          Permission Denied
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Please enable {step.title.toLowerCase()} in your browser settings and refresh the page.
                          Look for the camera/microphone icon in your address bar.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <motion.button
                onClick={requestAllPermissions}
                disabled={isRequesting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center space-x-2"
              >
                {isRequesting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Requesting Permissions...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Grant All Permissions</span>
                  </>
                )}
              </motion.button>

              <div className="flex items-center space-x-3">
                {canProceed() && (
                  <motion.button
                    onClick={onPermissionsGranted}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Continue to SafeWalk</span>
                  </motion.button>
                )}
                
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Skip for Now
                </motion.button>
              </div>
            </div>

            {/* Warning for critical permissions */}
            {!canProceed() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      Critical Permissions Required
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Microphone and Location access are essential for SafeWalk's core safety features.
                      Without these permissions, emergency features may not work properly.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}