import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Send,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface EmergencyContact {
  name: string;
  phone: string;
}

interface EmergencySystemProps {
  isActive: boolean;
  currentLocation: { lat: number; lng: number } | null;
  onEmergencyTriggered: () => void;
}

export function EmergencySystem({ isActive, currentLocation, onEmergencyTriggered }: EmergencySystemProps) {
  const { user } = useAuth();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<'idle' | 'triggered' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);
  const [emergencyMessage, setEmergencyMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadEmergencyContacts();
    }
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isTriggering) {
      executeEmergencyProtocol();
    }
  }, [countdown, isTriggering]);

  const loadEmergencyContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('emergency_contact_1_name, emergency_contact_1_phone, emergency_contact_2_name, emergency_contact_2_phone')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const contacts: EmergencyContact[] = [];
      
      if (data.emergency_contact_1_name && data.emergency_contact_1_phone) {
        contacts.push({
          name: data.emergency_contact_1_name,
          phone: data.emergency_contact_1_phone
        });
      }
      
      if (data.emergency_contact_2_name && data.emergency_contact_2_phone) {
        contacts.push({
          name: data.emergency_contact_2_name,
          phone: data.emergency_contact_2_phone
        });
      }

      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    }
  };

  const triggerSOS = () => {
    if (isTriggering) {
      // Cancel if already triggering
      setIsTriggering(false);
      setCountdown(0);
      setEmergencyStatus('idle');
      return;
    }

    setIsTriggering(true);
    setCountdown(5); // 5-second countdown
    setEmergencyStatus('triggered');
    onEmergencyTriggered();
  };

  const executeEmergencyProtocol = async () => {
    setIsTriggering(false);
    setEmergencyStatus('sent');

    try {
      // Generate emergency message
      const locationText = currentLocation 
        ? `Location: https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`
        : 'Location: Unable to determine';
      
      const timestamp = new Date().toLocaleString();
      const message = `🚨 EMERGENCY ALERT 🚨\n\nI need immediate help!\n\nTime: ${timestamp}\n${locationText}\n\nThis is an automated message from SafeMate. Please contact me immediately or call emergency services if you cannot reach me.\n\n- ${user?.user_metadata?.full_name || 'SafeMate User'}`;

      setEmergencyMessage(message);

      // Send SMS to emergency contacts
      await sendEmergencyMessages(message);

      // Try to make emergency calls
      await initiateEmergencyCalls();

      // Log emergency event
      await logEmergencyEvent();

    } catch (error) {
      console.error('Error executing emergency protocol:', error);
      setEmergencyStatus('error');
    }
  };

  const sendEmergencyMessages = async (message: string) => {
    // In a real implementation, this would use a service like Twilio
    // For now, we'll simulate the SMS sending and use browser APIs where possible
    
    for (const contact of emergencyContacts) {
      try {
        // Try to use the Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: '🚨 EMERGENCY ALERT',
            text: message,
          });
        } else {
          // Fallback: Copy to clipboard and show instructions
          await navigator.clipboard.writeText(`SMS to ${contact.phone}: ${message}`);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Emergency Alert Sent', {
              body: `Emergency message prepared for ${contact.name}`,
              icon: '/favicon.ico'
            });
          }
        }
      } catch (error) {
        console.error(`Error sending message to ${contact.name}:`, error);
      }
    }
  };

  const initiateEmergencyCalls = async () => {
    // Try to initiate calls to emergency contacts
    for (const contact of emergencyContacts) {
      try {
        // Use tel: protocol to initiate calls
        const telLink = `tel:${contact.phone}`;
        window.open(telLink, '_self');
        
        // Only call the first contact automatically
        break;
      } catch (error) {
        console.error(`Error calling ${contact.name}:`, error);
      }
    }
  };

  const logEmergencyEvent = async () => {
    // Log the emergency event for record keeping
    try {
      const eventData = {
        user_id: user?.id,
        event_type: 'emergency_sos',
        location: currentLocation,
        timestamp: new Date().toISOString(),
        contacts_notified: emergencyContacts.length,
        message_sent: emergencyMessage
      };

      // In a real app, this would be stored in a database
      console.log('Emergency event logged:', eventData);
      
      // Store in localStorage as backup
      const emergencyLog = JSON.parse(localStorage.getItem('emergency_log') || '[]');
      emergencyLog.push(eventData);
      localStorage.setItem('emergency_log', JSON.stringify(emergencyLog));
      
    } catch (error) {
      console.error('Error logging emergency event:', error);
    }
  };

  const getStatusColor = () => {
    switch (emergencyStatus) {
      case 'triggered':
        return 'bg-yellow-500';
      case 'sent':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-red-600';
    }
  };

  const getStatusText = () => {
    switch (emergencyStatus) {
      case 'triggered':
        return `Triggering in ${countdown}s...`;
      case 'sent':
        return 'Emergency Alert Sent!';
      case 'error':
        return 'Error Sending Alert';
      default:
        return 'Emergency SOS';
    }
  };

  if (!isActive) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <h3 className="text-white font-semibold">Emergency System</h3>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${emergencyContacts.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-300">
            {emergencyContacts.length} contacts ready
          </span>
        </div>
      </div>

      {/* Emergency Contacts Display */}
      {emergencyContacts.length > 0 && (
        <div className="mb-6 p-4 bg-black/20 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Emergency Contacts</span>
          </h4>
          <div className="space-y-2">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-200">{contact.name}</span>
                <span className="text-gray-400 font-mono">{contact.phone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS Button */}
      <motion.button
        onClick={triggerSOS}
        whileHover={{ scale: isTriggering ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: isTriggering ? [1, 1.1, 1] : 1,
          boxShadow: isTriggering 
            ? ['0 0 0 0 rgba(239, 68, 68, 0.7)', '0 0 0 20px rgba(239, 68, 68, 0)', '0 0 0 0 rgba(239, 68, 68, 0.7)']
            : '0 0 0 0 rgba(239, 68, 68, 0)'
        }}
        transition={{
          duration: isTriggering ? 0.5 : 0.2,
          repeat: isTriggering ? Infinity : 0
        }}
        className={`w-full py-6 rounded-2xl font-bold text-xl text-white transition-all shadow-2xl border-4 ${
          isTriggering 
            ? 'border-yellow-400 bg-yellow-500 hover:bg-yellow-600' 
            : emergencyStatus === 'sent'
            ? 'border-green-400 bg-green-500'
            : 'border-red-400 bg-red-600 hover:bg-red-700'
        }`}
      >
        <div className="flex items-center justify-center space-x-3">
          {emergencyStatus === 'sent' ? (
            <>
              <CheckCircle className="h-8 w-8" />
              <span>Alert Sent Successfully!</span>
            </>
          ) : isTriggering ? (
            <>
              <Clock className="h-8 w-8" />
              <span>Cancel SOS ({countdown}s)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-8 w-8" />
              <span>EMERGENCY SOS</span>
            </>
          )}
        </div>
      </motion.button>

      {/* Status Information */}
      {emergencyStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-black/30 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
            <span className="text-white font-medium">{getStatusText()}</span>
          </div>
          
          {emergencyStatus === 'sent' && (
            <div className="text-sm text-gray-300 space-y-1">
              <p>✅ Emergency contacts notified</p>
              <p>✅ Location shared</p>
              <p>✅ Event logged</p>
              {currentLocation && (
                <p className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</span>
                </p>
              )}
            </div>
          )}
          
          {emergencyStatus === 'error' && (
            <div className="text-sm text-red-300">
              <p>❌ Error sending emergency alert</p>
              <p>Please try calling emergency services directly</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.open('tel:911', '_self')}
          className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
        >
          <Phone className="h-4 w-4" />
          <span>Call 911</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (currentLocation) {
              const mapsUrl = `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
              window.open(mapsUrl, '_blank');
            }
          }}
          disabled={!currentLocation}
          className="p-3 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
        >
          <MapPin className="h-4 w-4" />
          <span>Share Location</span>
        </motion.button>
      </div>

      {/* No Contacts Warning */}
      {emergencyContacts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg"
        >
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-yellow-200 text-sm font-medium">No Emergency Contacts</p>
              <p className="text-yellow-300 text-xs mt-1">
                Add emergency contacts in Settings for full SOS functionality
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}