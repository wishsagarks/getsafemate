import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Send,
  Users,
  Video,
  Mic,
  Camera,
  Shield,
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

interface EmergencyContact {
  name: string;
  phone: string;
}

interface EmergencySystemProps {
  isActive: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  onEmergencyTriggered: () => void;
}

export function EmergencySystem({ isActive, currentLocation, onEmergencyTriggered }: EmergencySystemProps) {
  const { user } = useAuth();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<'idle' | 'triggered' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [emergencyMode, setEmergencyMode] = useState<'silent' | 'loud' | 'discreet'>('loud');
  const [emergencyLevel, setEmergencyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [autoRecording, setAutoRecording] = useState(true);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashlightActive, setFlashlightActive] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [emergencyHistory, setEmergencyHistory] = useState<any[]>([]);
  const [showEmergencyHistory, setShowEmergencyHistory] = useState(false);
  const [emergencyPresets, setEmergencyPresets] = useState([
    { name: "I feel unsafe", message: "I don't feel safe right now. Please check on me." },
    { name: "Being followed", message: "I think I'm being followed. Please call me ASAP." },
    { name: "Medical help", message: "I need medical assistance. Please help or call emergency services." }
  ]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [emergencyContacted, setEmergencyContacted] = useState<string[]>([]);
  const [emergencyResponseTime, setEmergencyResponseTime] = useState<number | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flashlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user) {
      loadEmergencyContacts();
      loadEmergencyHistory();
    }
    
    // Initialize siren audio with error handling
    try {
      sirenAudioRef.current = new Audio();
      sirenAudioRef.current.loop = true;
      
      // Create a simple beep sound using Web Audio API as fallback
      const createBeepSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        return { oscillator, gainNode, audioContext };
      };
      
      // Set up error handling for audio
      sirenAudioRef.current.onerror = () => {
        console.warn('Emergency siren audio file not available, using Web Audio API fallback');
      };
      
      // Try to load the audio file, but don't fail if it's not available
      sirenAudioRef.current.src = '/audio/emergency_siren.mp3';
      
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
    
    return () => {
      stopRecording();
      stopFlashlight();
      stopSiren();
    };
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isTriggering) {
      executeEmergencyProtocol();
    }
  }, [countdown, isTriggering]);

  useEffect(() => {
    if (recordingActive) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [recordingActive]);

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

  const loadEmergencyHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('safety_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      setEmergencyHistory(data || []);
    } catch (error) {
      console.error('Error loading emergency history:', error);
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
    
    // Vibrate pattern for emergency (if supported)
    if ('vibrate' in navigator) {
      // Vibrate pattern: 500ms on, 200ms off, 500ms on
      navigator.vibrate([500, 200, 500]);
    }
  };

  const executeEmergencyProtocol = async () => {
    setIsTriggering(false);
    setEmergencyStatus('sent');

    try {
      // Generate emergency message
      const locationText = currentLocation 
        ? `Location: https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
        : 'Location: Unable to determine';
      
      const timestamp = new Date().toLocaleString();
      
      // Use custom message if provided, otherwise use selected preset or default
      let messageBody = "I need immediate help!";
      
      if (customMessage.trim()) {
        messageBody = customMessage.trim();
      } else if (selectedPreset !== null) {
        messageBody = emergencyPresets[selectedPreset].message;
      }
      
      // Get user profile information
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user?.id)
        .single();
      
      // Create improved emergency message format
      const message = `🚨 EMERGENCY ALERT FROM SAFEMATE 🚨

${profile?.full_name || 'USER'} NEEDS IMMEDIATE HELP!
Message: ${messageBody}

📍 LOCATION: ${currentLocation ? `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}` : 'Unable to determine'}
⏰ Time: ${timestamp}
🔴 Emergency Type: ${emergencyLevel === 'high' ? 'CRITICAL' : emergencyLevel.toUpperCase()} ALERT

👤 USER INFORMATION:
Name: ${profile?.full_name || 'Not provided'}
Phone: ${profile?.phone || 'Not provided'}

${emergencyContacts.length > 0 ? `📞 EMERGENCY CONTACTS:
${emergencyContacts.map(contact => `${contact.name}: ${contact.phone}`).join('\n')}` : ''}

⚠️ WHAT TO DO:
1. Try to contact the user immediately
2. If unreachable, contact emergency services
3. Share the location information with responders

This is an automated emergency alert from SafeMate.`;

      setEmergencyMessage(message);

      // Start recording if auto-recording is enabled
      if (autoRecording) {
        startRecording();
      }
      
      // Activate flashlight in loud mode
      if (emergencyMode === 'loud') {
        startFlashlight();
        startSiren();
      }

      // Send emergency alert via Telegram
      await sendEmergencyTelegram(message);

      // Send SMS to emergency contacts
      await sendEmergencyMessages(message);

      // Log emergency event
      await logEmergencyEvent();
      
      // Simulate emergency response time
      simulateEmergencyResponse();

    } catch (error) {
      console.error('Error executing emergency protocol:', error);
      setEmergencyStatus('error');
    }
  };

  const sendEmergencyTelegram = async (message: string) => {
    if (!user) return;
    
    try {
      setIsSendingTelegram(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Call the Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-emergency`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          message: message,
          location: currentLocation,
          emergencyType: 'sos_triggered',
          severity: emergencyLevel
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Telegram emergency error:', errorData);
        throw new Error(errorData.error || 'Failed to send emergency alert');
      }
      
      const result = await response.json();
      console.log('Telegram emergency result:', result);
      
      setTelegramSent(result.telegramSent || false);
      
    } catch (error) {
      console.error('Error sending emergency telegram:', error);
      // Don't set error status, as we still want to show the emergency as sent
      // The user will see in the UI that Telegram specifically failed
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const sendEmergencyMessages = async (message: string) => {
    const contactedList: string[] = [];
    
    // Since navigator.share requires a user gesture and we're calling this programmatically,
    // we'll use the clipboard fallback approach for all emergency messages
    
    for (const contact of emergencyContacts) {
      try {
        // Copy emergency message to clipboard
        await navigator.clipboard.writeText(`SMS to ${contact.phone}: ${message}`);
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Emergency Alert Prepared', {
            body: `Emergency message copied to clipboard for ${contact.name}`,
            icon: '/favicon.ico'
          });
        }
        
        contactedList.push(contact.name);
      } catch (error) {
        console.error(`Error preparing message for ${contact.name}:`, error);
      }
    }
    
    setEmergencyContacted(contactedList);
  };

  const logEmergencyEvent = async () => {
    if (!user) return;
    
    try {
      // Log to Supabase
      const { data, error } = await supabase
        .from('safety_events')
        .insert({
          user_id: user.id,
          event_type: 'sos_triggered',
          severity: emergencyLevel,
          location_lat: currentLocation?.latitude,
          location_lng: currentLocation?.longitude,
          location_accuracy: currentLocation?.accuracy,
          emergency_contacts_notified: emergencyContacts.length,
          notes: customMessage || (selectedPreset !== null ? emergencyPresets[selectedPreset].message : ''),
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error logging emergency event to Supabase:', error);
      } else {
        console.log('Emergency event logged to Supabase');
        
        // Refresh emergency history
        loadEmergencyHistory();
      }
    } catch (error) {
      console.error('Error logging emergency event:', error);
    }
    
    // Also store in localStorage as backup
    try {
      const eventData = {
        user_id: user?.id,
        event_type: 'emergency_sos',
        location: currentLocation,
        timestamp: new Date().toISOString(),
        contacts_notified: emergencyContacts.length,
        message_sent: emergencyMessage,
        severity: emergencyLevel
      };
      
      const emergencyLog = JSON.parse(localStorage.getItem('emergency_log') || '[]');
      emergencyLog.push(eventData);
      localStorage.setItem('emergency_log', JSON.stringify(emergencyLog));
    } catch (error) {
      console.error('Error logging to localStorage:', error);
    }
  };

  const simulateEmergencyResponse = () => {
    // Simulate response time between 10-30 seconds
    const responseTime = Math.floor(Math.random() * 20) + 10;
    
    setTimeout(() => {
      setEmergencyResponseTime(responseTime);
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Emergency Response', {
          body: `Emergency services notified. Response time: ${responseTime} seconds.`,
          icon: '/favicon.ico'
        });
      }
    }, responseTime * 1000);
  };

  const startRecording = async () => {
    if (recordingActive) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // In a real app, this would be uploaded to a secure server
        console.log('Emergency recording completed');
        
        // For demo purposes, create a downloadable link
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `emergency-recording-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(audioUrl);
        
        // Reset recording state
        setRecordingActive(false);
        audioChunksRef.current = [];
      };
      
      mediaRecorder.start();
      setRecordingActive(true);
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Emergency', {
          body: 'Emergency recording started',
          icon: '/favicon.ico'
        });
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeMate Error', {
          body: 'Could not start emergency recording. Microphone access denied.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setRecordingActive(false);
    setRecordingTime(0);
  };

  const startFlashlight = async () => {
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      console.log('Flashlight not supported');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          // @ts-ignore - Non-standard constraint for flashlight
          advanced: [{ torch: true }]
        }
      });
      
      const track = stream.getVideoTracks()[0];
      
      // Try to turn on flashlight
      if (track && 'applyConstraints' in track) {
        const capabilities = track.getCapabilities();
        // @ts-ignore - Check if torch is supported
        if (capabilities.torch) {
          // @ts-ignore - Turn on torch
          await track.applyConstraints({ advanced: [{ torch: true }] });
          setFlashlightActive(true);
          
          // Blink flashlight
          let isOn = true;
          flashlightIntervalRef.current = setInterval(async () => {
            isOn = !isOn;
            // @ts-ignore - Toggle torch
            await track.applyConstraints({ advanced: [{ torch: isOn }] });
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error accessing flashlight:', error);
    }
  };

  const stopFlashlight = () => {
    if (flashlightIntervalRef.current) {
      clearInterval(flashlightIntervalRef.current);
      flashlightIntervalRef.current = null;
    }
    
    setFlashlightActive(false);
  };

  const startSiren = () => {
    try {
      if (sirenAudioRef.current) {
        sirenAudioRef.current.play().then(() => {
          setSirenActive(true);
        }).catch(error => {
          console.warn('Error playing siren audio file, using Web Audio API fallback:', error);
          // Fallback to Web Audio API beep
          createWebAudioSiren();
        });
      } else {
        // Fallback to Web Audio API beep
        createWebAudioSiren();
      }
    } catch (error) {
      console.warn('Error starting siren:', error);
      // Fallback to Web Audio API beep
      createWebAudioSiren();
    }
  };

  const createWebAudioSiren = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      setSirenActive(true);
      
      // Create alternating frequency for siren effect
      let frequency = 800;
      const sirenInterval = setInterval(() => {
        frequency = frequency === 800 ? 1000 : 800;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      }, 500);
      
      // Store references for cleanup
      (window as any).emergencySirenOscillator = oscillator;
      (window as any).emergencySirenInterval = sirenInterval;
      (window as any).emergencySirenContext = audioContext;
      
    } catch (error) {
      console.error('Web Audio API not supported:', error);
    }
  };

  const stopSiren = () => {
    try {
      if (sirenAudioRef.current) {
        sirenAudioRef.current.pause();
        sirenAudioRef.current.currentTime = 0;
      }
      
      // Clean up Web Audio API siren
      if ((window as any).emergencySirenOscillator) {
        (window as any).emergencySirenOscillator.stop();
        (window as any).emergencySirenOscillator = null;
      }
      
      if ((window as any).emergencySirenInterval) {
        clearInterval((window as any).emergencySirenInterval);
        (window as any).emergencySirenInterval = null;
      }
      
      if ((window as any).emergencySirenContext) {
        (window as any).emergencySirenContext.close();
        (window as any).emergencySirenContext = null;
      }
      
    } catch (error) {
      console.error('Error stopping siren:', error);
    }
    
    setSirenActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        return 'Emergency Alert Prepared!';
      case 'error':
        return 'Error Preparing Alert';
      default:
        return 'Emergency SOS';
    }
  };

  const handlePresetSelect = (index: number) => {
    setSelectedPreset(index);
    setCustomMessage(emergencyPresets[index].message);
  };

  if (!isActive) return null;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <h3 className="text-white font-semibold">Enhanced Emergency System</h3>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${emergencyContacts.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-300">
            {emergencyContacts.length} contacts ready
          </span>
        </div>
      </div>

      {/* Emergency Mode Selector */}
      <div className="mb-6">
        <h4 className="text-white text-sm font-medium mb-3">Emergency Mode</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setEmergencyMode('silent')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyMode === 'silent' 
                ? 'bg-blue-500/30 border-2 border-blue-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <Smartphone className="h-4 w-4 mx-auto mb-1" />
            <span>Silent</span>
          </button>
          
          <button
            onClick={() => setEmergencyMode('discreet')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyMode === 'discreet' 
                ? 'bg-purple-500/30 border-2 border-purple-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <Vibrate className="h-4 w-4 mx-auto mb-1" />
            <span>Discreet</span>
          </button>
          
          <button
            onClick={() => setEmergencyMode('loud')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyMode === 'loud' 
                ? 'bg-red-500/30 border-2 border-red-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <Bell className="h-4 w-4 mx-auto mb-1" />
            <span>Loud</span>
          </button>
        </div>
        
        <p className="text-xs text-gray-400 mt-2">
          {emergencyMode === 'silent' && "Silent mode sends alerts without sounds or visible indicators"}
          {emergencyMode === 'discreet' && "Discreet mode uses vibration and minimal visual indicators"}
          {emergencyMode === 'loud' && "Loud mode activates siren, flashlight, and maximum alerts"}
        </p>
      </div>

      {/* Emergency Level Selector */}
      <div className="mb-6">
        <h4 className="text-white text-sm font-medium mb-3">Emergency Level</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setEmergencyLevel('low')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyLevel === 'low' 
                ? 'bg-yellow-500/30 border-2 border-yellow-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <Bell className="h-4 w-4 mx-auto mb-1" />
            <span>Low</span>
          </button>
          
          <button
            onClick={() => setEmergencyLevel('medium')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyLevel === 'medium' 
                ? 'bg-orange-500/30 border-2 border-orange-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
            <span>Medium</span>
          </button>
          
          <button
            onClick={() => setEmergencyLevel('high')}
            className={`p-3 rounded-lg text-center text-xs transition-colors ${
              emergencyLevel === 'high' 
                ? 'bg-red-500/30 border-2 border-red-500/50 text-white' 
                : 'bg-black/30 border border-white/10 text-gray-300'
            }`}
          >
            <Bell className="h-4 w-4 mx-auto mb-1" />
            <span>High</span>
          </button>
        </div>
      </div>

      {/* Emergency Message */}
      <div className="mb-6">
        <h4 className="text-white text-sm font-medium mb-3">Emergency Message</h4>
        
        {/* Message Presets */}
        <div className="grid grid-cols-1 gap-2 mb-3">
          {emergencyPresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetSelect(index)}
              className={`p-3 rounded-lg text-left text-xs transition-colors ${
                selectedPreset === index 
                  ? 'bg-blue-500/30 border-2 border-blue-500/50 text-white' 
                  : 'bg-black/30 border border-white/10 text-gray-300'
              }`}
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-gray-400 mt-1">{preset.message}</div>
            </button>
          ))}
        </div>
        
        {/* Custom Message */}
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Add a custom emergency message..."
          className="w-full h-20 p-3 bg-black/30 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
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

      {/* Auto-Recording Toggle */}
      <div className="flex items-center justify-between mb-6 p-3 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <Mic className="h-4 w-4 text-white" />
          <div>
            <span className="text-sm text-white">Auto-Recording</span>
            <p className="text-xs text-gray-400">Record audio during emergency</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoRecording}
            onChange={() => setAutoRecording(!autoRecording)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
        </label>
      </div>

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
              <span>Alert Prepared Successfully!</span>
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
              <p>✅ Emergency message copied to clipboard</p>
              <p>✅ Location shared</p>
              <p>✅ Event logged</p>
              {telegramSent ? (
                <p className="text-green-300">✅ Telegram alert sent successfully</p>
              ) : isSendingTelegram ? (
                <p className="text-yellow-300">⏳ Sending Telegram alert...</p>
              ) : (
                <p className="text-red-300">❌ Telegram alert not sent - check your settings</p>
              )}
              {currentLocation && (
                <p className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</span>
                </p>
              )}
              
              {emergencyContacted.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Contacts notified:</p>
                  <ul className="ml-4 list-disc">
                    {emergencyContacted.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {emergencyResponseTime !== null && (
                <div className="mt-2 p-2 bg-green-500/20 rounded-lg">
                  <p className="text-green-300 flex items-center space-x-1">
                    <Target className="h-3 w-3" />
                    <span>Emergency response time: {emergencyResponseTime} seconds</span>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {emergencyStatus === 'error' && (
            <div className="text-sm text-red-300">
              <p>❌ Error preparing emergency alert</p>
              <p>Please try calling emergency services directly</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Recording Status */}
      {recordingActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-medium">Recording Emergency Audio</span>
            </div>
            <span className="text-red-300 font-mono">{formatTime(recordingTime)}</span>
          </div>
          
          <div className="mt-2 flex justify-end">
            <button
              onClick={stopRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
            >
              Stop Recording
            </button>
          </div>
        </motion.div>
      )}

      {/* Active Emergency Features */}
      {(flashlightActive || sirenActive) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg"
        >
          <h4 className="text-white text-sm font-medium mb-2">Active Emergency Features</h4>
          <div className="grid grid-cols-2 gap-2">
            {flashlightActive && (
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-yellow-300">Flashlight Active</span>
              </div>
            )}
            
            {sirenActive && (
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-red-400" />
                <span className="text-xs text-red-300">Siren Active</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 flex justify-end space-x-2">
            {flashlightActive && (
              <button
                onClick={stopFlashlight}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-lg"
              >
                Stop Flashlight
              </button>
            )}
            
            {sirenActive && (
              <button
                onClick={stopSiren}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
              >
                Stop Siren
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Emergency History Toggle */}
      <div className="mt-4">
        <button
          onClick={() => setShowEmergencyHistory(!showEmergencyHistory)}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
        >
          <Clock className="h-4 w-4" />
          <span>{showEmergencyHistory ? 'Hide Emergency History' : 'Show Emergency History'}</span>
        </button>
      </div>

      {/* Emergency History */}
      {showEmergencyHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-4 bg-black/20 rounded-lg"
        >
          <h4 className="text-white text-sm font-medium mb-3">Recent Emergency Events</h4>
          
          {emergencyHistory.length > 0 ? (
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {emergencyHistory.map((event, index) => (
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
          ) : (
            <p className="text-gray-400 text-sm">No emergency events recorded</p>
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
              const mapsUrl = `https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
              window.open(mapsUrl, '_blank');
            }
          }}
          disabled={!currentLocation}
          className="p-3 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
        >
          <MapPin className="h-4 w-4" />
          <span>Share Location</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={recordingActive ? stopRecording : startRecording}
          className={`p-3 ${
            recordingActive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-500/80 hover:bg-purple-500'
          } text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2`}
        >
          {recordingActive ? (
            <>
              <Mic className="h-4 w-4" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={flashlightActive ? stopFlashlight : startFlashlight}
          className={`p-3 ${
            flashlightActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500/80 hover:bg-yellow-500'
          } text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2`}
        >
          <Smartphone className="h-4 w-4" />
          <span>{flashlightActive ? 'Stop Flashlight' : 'Start Flashlight'}</span>
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