#!/bin/bash

echo "🍅🎵 Setting up Pomodoro Spotify Timer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to 18+"
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your Spotify Client ID"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. 🔑 Get your Spotify Client ID:"
echo "   → Go to https://developer.spotify.com/dashboard"
echo "   → Create a new app"
echo "   → Copy the Client ID"
echo ""
echo "2. ⚙️  Configure your app:"
echo "   → Edit .env file"
echo "   → Add: VITE_SPOTIFY_CLIENT_ID=your_client_id_here"
echo "   → Set redirect URI in Spotify app to: https://localhost:3000"
echo ""
echo "3. 🚀 Start the development server:"
echo "   → npm run dev"
echo ""
echo "4. 🎵 Sign in with Spotify and start focusing!"
echo ""
echo "📚 For detailed setup instructions, see README.md"