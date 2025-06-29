// Telegram Emergency Notification Edge Function
// This function sends emergency alerts to Telegram using user's stored bot token

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

    // Get user's Telegram bot token from the database
    const { data: apiKeys, error: apiKeysError } = await supabaseClient
      .from('user_api_keys')
      .select('telegram_bot_token')
      .eq('user_id', userId)
      .single();

    if (apiKeysError || !apiKeys?.telegram_bot_token) {
      console.error('No Telegram bot token found for user:', userId);
      return new Response(
        JSON.stringify({ 
          error: 'Telegram bot not configured',
          details: 'Please configure your Telegram bot token in Settings to enable emergency notifications'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const telegramBotToken = apiKeys.telegram_bot_token;

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
    let telegramSuccess = false;
    
    try {
      // First, try to get bot info to validate the token
      const botInfoUrl = `https://api.telegram.org/bot${telegramBotToken}/getMe`;
      const botInfoResponse = await fetch(botInfoUrl);
      
      if (!botInfoResponse.ok) {
        const botInfoError = await botInfoResponse.json();
        throw new Error(`Invalid Telegram bot token: ${JSON.stringify(botInfoError)}`);
      }
      
      const botInfo = await botInfoResponse.json();
      console.log('Bot info:', botInfo);
      
      // Get chat updates to find available chats
      const updatesUrl = `https://api.telegram.org/bot${telegramBotToken}/getUpdates`;
      const updatesResponse = await fetch(updatesUrl);
      
      if (updatesResponse.ok) {
        const updates = await updatesResponse.json();
        console.log('Recent updates:', updates);
        
        // Try to find the most recent chat ID
        let chatId = null;
        if (updates.result && updates.result.length > 0) {
          // Get the most recent message's chat ID
          const recentUpdate = updates.result[updates.result.length - 1];
          if (recentUpdate.message && recentUpdate.message.chat) {
            chatId = recentUpdate.message.chat.id;
          }
        }
        
        if (chatId) {
          // Send message to the found chat
          console.log(`✅ Found chat ID: ${chatId}`)
          const sendMessageUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
          telegramResponse = await fetch(sendMessageUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramMessage,
              parse_mode: 'HTML'
            })
          });
          
          if (telegramResponse.ok) {
            telegramSuccess = true;
            console.log('Emergency message sent to Telegram successfully');
          } else {
            const errorData = await telegramResponse.json();
            console.error('Error sending Telegram message:', errorData);
          }
        } else {
          console.log('No chat ID found - user needs to start a conversation with the bot first');
        }
      }
      
    } catch (telegramError) {
      console.error('Error sending Telegram message:', telegramError);
      // Don't fail the request - we'll still log the emergency
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
          emergency_contacts_notified: telegramSuccess ? 1 : 0,
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
        message: 'Emergency alert processed successfully',
        telegramSent: telegramSuccess,
        details: telegramSuccess 
          ? 'Emergency alert sent via Telegram' 
          : 'Emergency logged but Telegram notification failed - ensure you have started a conversation with your bot'
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