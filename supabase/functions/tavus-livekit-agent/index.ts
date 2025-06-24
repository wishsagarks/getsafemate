/*
  # Tavus LiveKit Agent Integration with Personal Persona

  1. Purpose
    - Create new Tavus conversations with p5d11710002a persona
    - Integrate with LiveKit for real-time communication
    - Handle session management and error recovery
    - Support both audio and video modes
    - Enhanced API key validation and error reporting
    - Proper JWT token generation for LiveKit

  2. Features
    - Dynamic conversation creation with specified persona
    - Generate proper LiveKit JWT tokens for room access
    - Session logging and management
    - Robust error handling and API key validation
    - Detailed error messages for troubleshooting

  3. Integration
    - Persona ID: p5d11710002a (your personal persona)
    - Creates new conversations for each session
    - Returns conversation details for client connection
    - Generates cryptographically signed JWT tokens
*/

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT } from 'npm:jose@5.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Your personal persona configuration
const TAVUS_PERSONA_ID = 'p5d11710002a';

interface CreateSessionRequest {
  userId: string;
  sessionType: 'safewalk' | 'heartmate';
  mode?: 'audio' | 'video';
  emergencyContacts?: Array<{name: string, phone: string}>;
}

interface SessionResponse {
  roomToken: string;
  roomName: string;
  avatarId: string;
  sessionId: string;
  wsUrl: string;
  mode: 'audio' | 'video';
  conversationId: string;
  conversationUrl: string;
  personaId: string;
  status: string;
}

interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status: string;
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

    // Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required environment variables');
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

    // Extract token from authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify the user's authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestData: CreateSessionRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userId, sessionType, mode = 'audio', emergencyContacts } = requestData;

    // Validate required fields
    if (!userId || !sessionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and sessionType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate user can only create sessions for themselves
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only create sessions for yourself' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's API keys
    const { data: apiKeys, error: apiError } = await supabaseClient
      .from('user_api_keys')
      .select('livekit_api_key, livekit_api_secret, livekit_ws_url, tavus_api_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (apiError) {
      console.error('Database error fetching API keys:', apiError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error occurred while fetching API keys',
          details: 'Please try again later'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKeys || !apiKeys.livekit_api_key || !apiKeys.livekit_api_secret || !apiKeys.livekit_ws_url) {
      return new Response(
        JSON.stringify({ 
          error: 'LiveKit API keys not configured',
          details: 'Please configure your LiveKit API keys in Settings to enable real-time communication'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced Tavus API key validation
    if (!apiKeys.tavus_api_key?.trim()) {
      return new Response(
        JSON.stringify({ 
          error: 'Tavus API key not configured',
          details: 'Please configure your Tavus API key in Settings. Get your API key from https://tavus.io/dashboard/api-keys'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate Tavus API key format
    const tavusApiKey = apiKeys.tavus_api_key.trim();
    if (tavusApiKey.length < 20) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Tavus API key format',
          details: 'Tavus API key appears to be too short. Please verify your API key from https://tavus.io/dashboard/api-keys'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test Tavus API key before proceeding
    try {
      await validateTavusApiKey(tavusApiKey);
    } catch (validationError) {
      console.error('Tavus API key validation failed:', validationError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Tavus API key',
          details: validationError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique session ID and room name
    const sessionId = crypto.randomUUID();
    const roomName = `safemate-${sessionType}-${mode}-${userId}-${Date.now()}`;

    // Create new Tavus conversation with enhanced error handling
    let tavusConversation: TavusConversation;
    try {
      tavusConversation = await createTavusConversation(tavusApiKey, sessionType, mode);
      console.log('Created new Tavus conversation:', tavusConversation.conversation_id);
    } catch (tavusError) {
      console.error('Error creating Tavus conversation:', tavusError);
      
      // Provide more specific error messages based on the error
      let errorDetails = `Tavus API error: ${tavusError.message}`;
      
      if (tavusError.message.includes('401') || tavusError.message.includes('Invalid access token')) {
        errorDetails = 'Invalid Tavus API key. Please verify your API key at https://tavus.io/dashboard/api-keys and ensure it has conversation creation permissions.';
      } else if (tavusError.message.includes('403')) {
        errorDetails = 'Tavus API key does not have permission to create conversations. Please check your API key permissions at https://tavus.io/dashboard/api-keys';
      } else if (tavusError.message.includes('429')) {
        errorDetails = 'Tavus API rate limit exceeded. Please try again in a few minutes.';
      } else if (tavusError.message.includes('500')) {
        errorDetails = 'Tavus API server error. Please try again later.';
      } else if (tavusError.message.includes('persona_id')) {
        errorDetails = `Persona ${TAVUS_PERSONA_ID} not found or not accessible with your API key. Please check your Tavus account permissions.`;
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Tavus conversation',
          details: errorDetails
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate LiveKit token for the room
    let roomToken;
    try {
      roomToken = await generateLiveKitToken(
        apiKeys.livekit_api_key,
        apiKeys.livekit_api_secret,
        roomName,
        userId,
        mode
      );
    } catch (tokenError) {
      console.error('Error generating LiveKit token:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate room token',
          details: 'Please check your LiveKit API credentials in Settings'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log session creation
    try {
      await logSession(supabaseClient, {
        id: sessionId,
        user_id: userId,
        session_type: sessionType,
        room_name: roomName,
        avatar_id: tavusConversation.conversation_id,
        emergency_contacts: emergencyContacts,
        status: 'active',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging session:', logError);
      // Don't fail the request if logging fails
    }

    // Return session details with new Tavus conversation
    const response: SessionResponse = {
      roomToken,
      roomName,
      avatarId: tavusConversation.conversation_id,
      sessionId,
      wsUrl: apiKeys.livekit_ws_url,
      mode,
      conversationId: tavusConversation.conversation_id,
      conversationUrl: tavusConversation.conversation_url,
      personaId: TAVUS_PERSONA_ID,
      status: tavusConversation.status
    };

    console.log('Session created successfully:', {
      sessionId,
      roomName,
      conversationId: tavusConversation.conversation_id,
      personaId: TAVUS_PERSONA_ID
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in tavus-livekit-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: 'An unexpected error occurred while creating the AI session'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function validateTavusApiKey(tavusApiKey: string): Promise<void> {
  try {
    console.log('Validating Tavus API key...');
    
    // Test the API key by making a simple request to list personas
    const response = await fetch('https://tavusapi.com/v2/personas', {
      method: 'GET',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus API key validation failed:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please verify your API key at https://tavus.io/dashboard/api-keys');
      } else if (response.status === 403) {
        throw new Error('Tavus API key does not have sufficient permissions. Please check your API key permissions.');
      } else {
        throw new Error(`Tavus API validation failed with status ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Tavus API key validation successful, found', data.data?.length || 0, 'personas');
    
    // Check if our required persona is accessible
    if (data.data && Array.isArray(data.data)) {
      const hasRequiredPersona = data.data.some((persona: any) => persona.persona_id === TAVUS_PERSONA_ID);
      if (!hasRequiredPersona) {
        console.warn(`Persona ${TAVUS_PERSONA_ID} not found in accessible personas`);
        // Don't fail validation here as the persona might still be accessible for conversation creation
      } else {
        console.log(`✅ Persona ${TAVUS_PERSONA_ID} found and accessible`);
      }
    }
    
  } catch (error) {
    console.error('Error validating Tavus API key:', error);
    throw error;
  }
}

async function createTavusConversation(
  tavusApiKey: string, 
  sessionType: string, 
  mode: 'audio' | 'video'
): Promise<TavusConversation> {
  try {
    console.log('Creating new Tavus conversation with persona:', TAVUS_PERSONA_ID);
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: TAVUS_PERSONA_ID,
        conversation_name: `SafeMate ${sessionType} Session ${new Date().toISOString()}`,
        callback_url: null,
        properties: {
          max_call_duration: 3600, // 1 hour
          participant_left_timeout: 300, // 5 minutes
          participant_absent_timeout: 60, // 1 minute
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: `You are SafeMate, an AI safety companion with the ${TAVUS_PERSONA_ID} persona. You're in a ${mode} call with a user who needs safety monitoring and emotional support during their ${sessionType} session. Be caring, protective, and supportive. Watch for any signs of distress or danger. You can see the user through video and should acknowledge their visual state when appropriate.`,
        custom_greeting: sessionType === 'safewalk' 
          ? "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe during your walk. How are you feeling right now?"
          : "Hello! I'm your SafeMate AI companion here to provide emotional support. I can see you through our video connection. How can I help you today?"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus conversation creation failed:', response.status, errorData);
      
      // Create more specific error messages
      let errorMessage = `Tavus API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Invalid access token. Please check your Tavus API key at https://tavus.io/dashboard/api-keys';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden. Your API key does not have permission to create conversations.';
      } else if (response.status === 404) {
        errorMessage = `Persona ${TAVUS_PERSONA_ID} not found. Please verify the persona exists in your Tavus account.`;
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
      } else if (response.status === 422) {
        errorMessage = `Invalid request data: ${errorData.message || 'Please check your request parameters'}`;
      } else if (errorData.message) {
        errorMessage = `${errorData.message}`;
      } else {
        errorMessage = 'Failed to create conversation. Please try again.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('New Tavus conversation created:', data);
    
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      status: data.status
    };
    
  } catch (error) {
    console.error('Error creating Tavus conversation:', error);
    throw error;
  }
}

async function generateLiveKitToken(
  apiKey: string, 
  apiSecret: string, 
  roomName: string, 
  userId: string,
  mode: 'audio' | 'video'
): Promise<string> {
  try {
    console.log('Generating LiveKit JWT token for:', {
      roomName,
      userId,
      mode,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });
    
    // Create the JWT payload
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry
    
    const payload = {
      iss: apiKey,
      sub: userId,
      iat: now,
      exp: exp,
      nbf: now,
      jti: crypto.randomUUID(),
      room: roomName,
      grants: {
        roomJoin: true,
        roomList: true,
        roomRecord: false,
        roomAdmin: false,
        roomCreate: false,
        ingressAdmin: false,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true
      },
      metadata: JSON.stringify({
        mode,
        sessionType: 'safewalk',
        userId,
        personaId: TAVUS_PERSONA_ID
      })
    };
    
    // Convert API secret to Uint8Array for signing
    const secretKey = new TextEncoder().encode(apiSecret);
    
    // Create and sign the JWT
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setNotBefore(now)
      .setIssuer(apiKey)
      .setSubject(userId)
      .setJti(crypto.randomUUID())
      .sign(secretKey);
    
    console.log('LiveKit JWT token generated successfully');
    return jwt;
    
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    throw new Error(`Failed to generate LiveKit token: ${error.message}`);
  }
}

async function logSession(supabaseClient: any, sessionData: any) {
  try {
    const { error } = await supabaseClient
      .from('ai_sessions')
      .insert(sessionData);

    if (error) {
      console.error('Error logging session:', error);
      throw error;
    }
    
    console.log('Session logged successfully:', sessionData.id);
  } catch (error) {
    console.error('Error logging session:', error);
    throw error;
  }
}