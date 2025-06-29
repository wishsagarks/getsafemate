// Telegram Emergency Notification Edge Function
// This function sends emergency alerts to Telegram

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmergencyRequest {
  userId: string;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  emergencyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the Telegram bot token from environment variables
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!telegramBotToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Telegram bot not configured',
          details: 'Please configure TELEGRAM_BOT_TOKEN in your Supabase Edge Function settings'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify the user's authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestData: EmergencyRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userId, message, location, emergencyType, severity } = requestData;

    // Validate required fields
    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate user can only send emergency for themselves
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only send emergency alerts for yourself' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user profile for additional information
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, phone, emergency_contact_1_name, emergency_contact_1_phone, emergency_contact_2_name, emergency_contact_2_phone')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Prepare Telegram message
    let telegramMessage = `🚨 EMERGENCY ALERT 🚨\n\n`;
    telegramMessage += `${message}\n\n`;
    
    if (profile) {
      telegramMessage += `User: ${profile.full_name || 'Unknown'}\n`;
      telegramMessage += `Phone: ${profile.phone || 'Not provided'}\n\n`;
      
      if (profile.emergency_contact_1_name && profile.emergency_contact_1_phone) {
        telegramMessage += `Primary Emergency Contact:\n`;
        telegramMessage += `${profile.emergency_contact_1_name}: ${profile.emergency_contact_1_phone}\n\n`;
      }
      
      if (profile.emergency_contact_2_name && profile.emergency_contact_2_phone) {
        telegramMessage += `Secondary Emergency Contact:\n`;
        telegramMessage += `${profile.emergency_contact_2_name}: ${profile.emergency_contact_2_phone}\n\n`;
      }
    }
    
    if (location) {
      telegramMessage += `📍 Location: https://maps.google.com/maps?q=${location.latitude},${location.longitude}\n\n`;
    }
    
    if (emergencyType) {
      telegramMessage += `Emergency Type: ${emergencyType}\n`;
    }
    
    if (severity) {
      telegramMessage += `Severity: ${severity}\n`;
    }
    
    telegramMessage += `Time: ${new Date().toISOString()}\n\n`;
    telegramMessage += `This is an automated emergency alert from SafeMate.`;

    // Send message to Telegram
    let telegramResponse;
    try {
      // If chat ID is provided, send to that specific chat
      const chatId = telegramChatId || ''; // Default to empty if not provided
      
      // Prepare the API URL - if chatId is provided, use it, otherwise let Telegram decide
      const apiUrl = chatId 
        ? `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(telegramMessage)}`
        : `https://api.telegram.org/bot${telegramBotToken}/sendMessage?text=${encodeURIComponent(telegramMessage)}`;
      
      telegramResponse = await fetch(apiUrl);
      
      if (!telegramResponse.ok) {
        const errorData = await telegramResponse.json();
        throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
      }
    } catch (telegramError) {
      console.error('Error sending Telegram message:', telegramError);
      
      // Log the error but don't fail the request - we'll still log the emergency
      // This allows the emergency to be recorded even if Telegram notification fails
    }

    // Log emergency event to database
    try {
      const { error: logError } = await supabaseClient
        .from('safety_events')
        .insert({
          user_id: userId,
          event_type: emergencyType || 'sos_triggered',
          severity: severity || 'high',
          location_lat: location?.latitude,
          location_lng: location?.longitude,
          emergency_contacts_notified: 1, // Assuming we notified at least the Telegram bot
          notes: message,
          resolution_status: 'ongoing',
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging emergency event:', logError);
      }
    } catch (logError) {
      console.error('Error logging emergency event:', logError);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emergency alert sent successfully',
        telegramSent: !!telegramResponse?.ok
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in telegram-emergency:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred while sending the emergency alert'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});