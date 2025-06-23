# SafeMate - AI-Powered Safety & Emotional Support Companion

SafeMate is a comprehensive web application that provides AI-powered safety protection and emotional support through advanced avatar technology.

## 🚀 Live Demo

**Production URL**: [Coming Soon - Deploy to Netlify]

## Features

### 🛡️ Safe Walk Mode
- Real-time GPS tracking and location sharing
- AI companion with voice and video chat powered by **Tavus p5d11710002a persona**
- Emergency SOS system with automatic alerts
- Live recording and video streaming via **LiveKit**
- Route optimization and safety scoring

### ❤️ HeartMate Mode
- Emotional support AI companion using **Gemini 2.5 Flash**
- Mood tracking and wellness guidance
- Personalized conversations and comfort
- Mental health resources and support

### 🤖 AI Avatar Technology
- **Tavus AI Avatars**: Realistic AI companions with natural conversation (p5d11710002a persona)
- **LiveKit Integration**: Real-time video and audio communication
- **ElevenLabs Voice**: High-quality voice synthesis
- **Deepgram Speech Recognition**: Accurate speech-to-text processing
- **Gemini 2.5 Flash**: Advanced LLM for natural conversations

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
- **Tavus API** for AI avatar creation and management (p5d11710002a persona)
- **LiveKit** for real-time video/audio communication
- **ElevenLabs API** for voice synthesis
- **Deepgram API** for speech recognition
- **Gemini 2.5 Flash** for LLM conversations

## 🚀 Deployment

### Quick Deploy to Netlify

1. **Fork this repository** to your GitHub account

2. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub account
   - Select the forked SafeMate repository

3. **Configure Environment Variables** in Netlify:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy**: Netlify will automatically build and deploy your site

### Manual Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd safemate-web-app

# Install dependencies
npm install

# Build for production
npm run build

# Deploy the dist/ folder to your hosting provider
```

## 🔧 Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- API keys for:
  - Tavus (for p5d11710002a persona)
  - LiveKit
  - ElevenLabs (optional)
  - Deepgram (optional)
  - Gemini 2.5 Flash

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
- Add your Tavus, LiveKit, ElevenLabs, Deepgram, and Gemini API keys in the app settings

6. Start the development server:
```bash
npm run dev
```

## 📊 Database Schema

### Profiles Table
- User profile information
- Emergency contacts
- Safety preferences
- Onboarding status

### AI Sessions Table
- Session tracking for AI avatar interactions
- Room management for LiveKit
- Emergency contact integration

### User API Keys Table
- Secure storage of user's API keys
- Encrypted storage for Tavus, LiveKit, ElevenLabs, Deepgram, Gemini

## 🔐 Security Features

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Secure API key management
- Privacy-first data handling
- Encrypted API key storage

## 🌐 API Integration

### Tavus AI Avatar Setup (p5d11710002a)

1. Get your Tavus API key from [Tavus Dashboard](https://tavus.io)
2. The app uses the specific `p5d11710002a` persona
3. Configure the API key in the app settings
4. The app automatically creates AI avatars for each session

### LiveKit Configuration

1. Set up a LiveKit server or use LiveKit Cloud
2. Configure your LiveKit API key and secret
3. Update the WebSocket URL in the app settings

### Gemini 2.5 Flash Integration

1. Get API key from [Google AI Studio](https://ai.google.dev)
2. Configure in app settings
3. Powers all LLM conversations and safety monitoring

### Voice Services (Optional)

- **ElevenLabs**: For enhanced voice synthesis
- **Deepgram**: For improved speech recognition

## 🚀 Deployment Checklist

- [ ] Fork repository to your GitHub
- [ ] Set up Supabase project and run migrations
- [ ] Configure environment variables in Netlify
- [ ] Deploy to Netlify
- [ ] Test all features in production
- [ ] Configure custom domain (optional)

## 📱 Features in Production

✅ **User Authentication & Onboarding**
✅ **Safe Walk Mode with GPS Tracking**
✅ **AI Companion with Tavus p5d11710002a Persona**
✅ **LiveKit Video/Audio Integration**
✅ **Gemini 2.5 Flash Conversations**
✅ **Emergency SOS System**
✅ **API Key Management**
✅ **Responsive Design**
✅ **Dark/Light Mode**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Email: hello@safemate.app
- Documentation: [GitHub Wiki]
- Issues: GitHub Issues

## 🙏 Acknowledgments

- **Tavus** for AI avatar technology (p5d11710002a persona)
- **LiveKit** for real-time communication
- **ElevenLabs** for voice synthesis
- **Deepgram** for speech recognition
- **Google** for Gemini 2.5 Flash LLM
- **Supabase** for backend infrastructure

---

**Built with ❤️ for your safety and well-being**