# SafeMate - AI-Powered Safety & Emotional Support Companion

SafeMate is a comprehensive web application that provides AI-powered safety protection and emotional support through advanced avatar technology.

## Features

### 🛡️ Safe Walk Mode
- Real-time GPS tracking and location sharing
- AI companion with voice and video chat
- Emergency SOS system with automatic alerts
- Live recording and video streaming
- Route optimization and safety scoring

### ❤️ HeartMate Mode
- Emotional support AI companion
- Mood tracking and wellness guidance
- Personalized conversations and comfort
- Mental health resources and support

### 🤖 AI Avatar Technology
- **Tavus AI Avatars**: Realistic AI companions with natural conversation
- **LiveKit Integration**: Real-time video and audio communication
- **ElevenLabs Voice**: High-quality voice synthesis
- **Deepgram Speech Recognition**: Accurate speech-to-text processing

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **Vite** for development and building

### Backend
- **Supabase** for database and authentication
- **Supabase Edge Functions** for serverless API endpoints
- **PostgreSQL** with Row Level Security (RLS)

### AI & Communication
- **Tavus API** for AI avatar creation and management
- **LiveKit** for real-time video/audio communication
- **ElevenLabs API** for voice synthesis
- **Deepgram API** for speech recognition

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- API keys for:
  - Tavus
  - LiveKit
  - ElevenLabs (optional)
  - Deepgram (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd safemate-web-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
- Create a new Supabase project
- Run the migrations in `supabase/migrations/`
- Configure authentication settings

5. Configure API keys:
- Add your Tavus, LiveKit, ElevenLabs, and Deepgram API keys to Supabase Edge Functions environment variables

6. Start the development server:
```bash
npm run dev
```

## API Integration

### Tavus AI Avatar Setup

1. Get your Tavus API key from [Tavus Dashboard](https://tavus.io)
2. Configure the API key in the Supabase Edge Function environment
3. The app will automatically create AI avatars for each session

### LiveKit Configuration

1. Set up a LiveKit server or use LiveKit Cloud
2. Configure your LiveKit API key and secret
3. Update the WebSocket URL in the environment variables

### Voice Services (Optional)

- **ElevenLabs**: For enhanced voice synthesis
- **Deepgram**: For improved speech recognition

## Database Schema

### Profiles Table
- User profile information
- Emergency contacts
- Safety preferences
- Onboarding status

### AI Sessions Table
- Session tracking for AI avatar interactions
- Room management for LiveKit
- Emergency contact integration

## Security Features

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Secure API key management
- Privacy-first data handling

## Deployment

### Netlify Deployment
The app is configured for easy deployment to Netlify:

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy with automatic builds

### Supabase Edge Functions
Deploy the edge functions to Supabase:

```bash
supabase functions deploy tavus-livekit-agent
supabase functions deploy delete-user
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: hello@safemate.app
- Documentation: [Coming Soon]
- Issues: GitHub Issues

## Acknowledgments

- **Tavus** for AI avatar technology
- **LiveKit** for real-time communication
- **ElevenLabs** for voice synthesis
- **Deepgram** for speech recognition
- **Supabase** for backend infrastructure