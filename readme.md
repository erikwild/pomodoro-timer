# 🍅🎵 Pomodoro Spotify Timer

A beautiful, customizable Pomodoro timer with full Spotify Web API integration. Control your music directly from the timer, automatically switch playlists between work and break sessions, and boost your productivity with the perfect soundtrack.

## ✨ Features

### 🎵 **Full Spotify Integration**
- **Spotify Premium Authentication** - Sign in with your Spotify account
- **Direct Playback Control** - Play, pause, and control volume without leaving the app
- **Automatic Playlist Switching** - Different playlists for work vs break sessions
- **Device Selection** - Choose which device to play music on
- **Real-time Track Display** - See what's currently playing

### ⏱️ **Customizable Timer**
- **Flexible Durations** - Set custom work (5-60 min) and break (1-30 min) times
- **Quick Presets** - Classic (25/5), Extended (45/15), Power Hour (50/10), Quick Sprint (15/3)
- **Session Tracking** - Count completed Pomodoro sessions
- **Skip Sessions** - Jump to break or back to work when needed

### 🎨 **Beautiful Interface**
- **Modern Design** - Glassmorphism with gradient backgrounds
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Visual Progress** - Circular progress ring shows session progress
- **Smart Indicators** - Different colors and icons for work vs break
- **Smooth Animations** - Polished transitions and hover effects

### 🔔 **Smart Features**
- **Audio Notifications** - Sound alerts when sessions complete
- **Automatic Transitions** - Seamlessly switch between work and break
- **Local Storage** - Remembers your settings and Spotify tokens
- **PKCE Security** - Secure Spotify authentication flow

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Spotify Premium account
- Spotify Developer account (free)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd pomodoro-spotify-timer
npm install
```

### 2. Set Up Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create app"**
3. Fill in the details:
   - **App name**: Pomodoro Timer (or whatever you prefer)
   - **App description**: Personal Pomodoro timer with Spotify integration
   - **Redirect URI**: `https://localhost:3000`
   - **API/SDKs**: Web API
4. Save your app and copy the **Client ID**

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Spotify Client ID:
```bash
VITE_SPOTIFY_CLIENT_ID=your_client_id_from_step_2
VITE_SPOTIFY_REDIRECT_URI=https://localhost:3000
```

### 4. Run the App
```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

### 5. Connect Spotify
1. Click the "Spotify" login button in the top-right
2. Authorize the app in the Spotify popup
3. You'll be redirected back and can now control Spotify directly!

## 🎯 How to Use

### Basic Usage
1. **Set Your Timing** - Use presets or customize work/break durations
2. **Connect Spotify** - Sign in to control music directly
3. **Choose Playlists** - Set different playlists for work and break sessions
4. **Start Focusing** - Hit play and let the timer manage your music automatically

### Pro Tips
- **Focus Playlists**: Use instrumental, lo-fi, or classical music for work sessions
- **Break Playlists**: Choose upbeat or relaxing music for breaks
- **Device Control**: Select your preferred playback device (computer, phone, speakers)
- **Volume Management**: Adjust volume directly from the timer
- **Session Skipping**: Use the skip button if you need to end a session early

## 🛠️ Development

### Project Structure
```
src/
├── App.jsx              # Main timer component
├── main.jsx            # React entry point
├── index.css           # Global styles with Tailwind
└── services/
    └── spotify.js      # Spotify Web API integration
```

### Key Technologies
- **React 18** - Modern React with hooks
- **Vite** - Fast development and build tool
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **Spotify Web API** - Music control and authentication

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🔧 Customization

### Adding New Presets
Edit the `presets` array in `App.jsx`:
```javascript
const presets = [
  { name: 'Your Preset', work: 30, break: 10 },
  // ... existing presets
];
```

### Styling Changes
The app uses Tailwind CSS. Modify classes in the JSX or extend the theme in `tailwind.config.js`.

### Additional Spotify Features
The `SpotifyAPI` class in `src/services/spotify.js` provides methods for:
- Getting user's playlists
- Searching tracks/playlists
- Managing playback queue
- And much more!

## 🔒 Privacy & Security

- **Local Storage Only** - All data stays on your device
- **No Backend Required** - Direct communication with Spotify
- **PKCE Flow** - Secure authentication without exposing secrets
- **Minimal Permissions** - Only requests necessary Spotify scopes

## 🚨 Troubleshooting

### "Authentication Required" Error
- Make sure your `.env` file has the correct `VITE_SPOTIFY_CLIENT_ID`
- Verify the redirect URI in your Spotify app matches `https://localhost:3000`
- Try logging out and back in

### "No Available Device" Error
- Make sure Spotify is open on at least one device
- Try playing a song on Spotify first, then refresh the timer
- Check that your Spotify Premium subscription is active

### Playlists Not Loading
- Ensure you're signed in to Spotify
- Check that your playlists aren't private (or the app has permission)
- Try refreshing the page

### Music Not Switching Automatically
- Verify your playlist URLs are correct
- Make sure you have an active Spotify device selected
- Check that the playlists aren't empty

## 📦 Deployment

### Deploy to Vercel
```bash
npm run build
npx vercel --prod
```

Don't forget to:
1. Add your environment variables in Vercel dashboard
2. Update your Spotify app's redirect URI to your production URL

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify or connect your git repo
```

Update environment variables in Netlify dashboard and Spotify redirect URI.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for music integration
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for styling system
- [Vite](https://vitejs.dev/) for development experience

## 📧 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information

---

**Happy Focusing! 🍅✨**