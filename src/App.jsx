import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Music, Volume2, VolumeX } from 'lucide-react';
import SpotifyAPI from './services/spotify.js';

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes in seconds
const LONG_BREAK = 15 * 60; // 15 minutes in seconds

function App() {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [sessionCount, setSessionCount] = useState(0);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [workTime, setWorkTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  
  // Spotify state
  const [spotify] = useState(new SpotifyAPI());
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackState, setPlaybackState] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  
  const intervalRef = useRef(null);

  // Initialize app
  useEffect(() => {
    // Check Spotify authentication
    const checkSpotifyAuth = async () => {
      if (spotify.isAuthenticated()) {
        setIsSpotifyConnected(true);
        await loadSpotifyData();
      }

      // Handle OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('code')) {
        const success = await spotify.handleCallback();
        if (success) {
          setIsSpotifyConnected(true);
          await loadSpotifyData();
        }
      }
    };

    checkSpotifyAuth();
  }, []);

  // Load Spotify data
  const loadSpotifyData = async () => {
    try {
      const [currentPlayback, userPlaylists] = await Promise.all([
        spotify.getCurrentPlayback(),
        spotify.getUserPlaylists()
      ]);

      if (currentPlayback) {
        setCurrentTrack(currentPlayback.item);
        setPlaybackState(currentPlayback);
      }

      setPlaylists(userPlaylists.items || []);
    } catch (error) {
      console.error('Error loading Spotify data:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  // Handle session completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSessionComplete();
    }
  }, [timeLeft, isRunning]);

  const handleSessionComplete = () => {
    if (currentSession === 'work') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      if (newSessionCount % 4 === 0) {
        setCurrentSession('longBreak');
        setTimeLeft(longBreakTime * 60);
      } else {
        setCurrentSession('shortBreak');
        setTimeLeft(shortBreakTime * 60);
      }
    } else {
      setCurrentSession('work');
      setTimeLeft(workTime * 60);
    }

    // Play notification sound or handle break music
    if (isSpotifyConnected && currentSession === 'work') {
      // Pause music for break
      spotify.pause().catch(console.error);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    if (isSpotifyConnected && currentSession === 'work' && selectedPlaylist) {
      // Start playlist for work session
      spotify.play(null, selectedPlaylist.uri).catch(console.error);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (isSpotifyConnected) {
      spotify.pause().catch(console.error);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (currentSession === 'work') {
      setTimeLeft(workTime * 60);
    } else if (currentSession === 'shortBreak') {
      setTimeLeft(shortBreakTime * 60);
    } else {
      setTimeLeft(longBreakTime * 60);
    }
  };

  const skipSession = () => {
    setTimeLeft(0);
  };

  const connectSpotify = () => {
    spotify.authorize();
  };

  const disconnectSpotify = () => {
    spotify.logout();
    setIsSpotifyConnected(false);
    setCurrentTrack(null);
    setPlaybackState(null);
    setPlaylists([]);
    setSelectedPlaylist(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionColor = () => {
    switch (currentSession) {
      case 'work': return 'text-red-400';
      case 'shortBreak': return 'text-green-400';
      case 'longBreak': return 'text-blue-400';
      default: return 'text-white';
    }
  };

  const getSessionTitle = () => {
    switch (currentSession) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Pomodoro Timer';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold">Pomodoro Timer</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings size={24} />
          </button>
          {isSpotifyConnected ? (
            <button
              onClick={disconnectSpotify}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-green-400"
            >
              <Music size={24} />
            </button>
          ) : (
            <button
              onClick={connectSpotify}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Music size={24} />
            </button>
          )}
        </div>
      </header>

      {/* Main Timer */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8">
          <h2 className={`text-3xl font-semibold mb-4 ${getSessionColor()}`}>
            {getSessionTitle()}
          </h2>
          <div className="text-8xl font-mono font-bold mb-8">
            {formatTime(timeLeft)}
          </div>
          <div className="text-gray-400 mb-6">
            Session {sessionCount + 1}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={isRunning ? pauseTimer : startTimer}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={resetTimer}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={20} />
            Reset
          </button>
          <button
            onClick={skipSession}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-4 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Spotify Status */}
        {isSpotifyConnected && currentTrack && (
          <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                {currentTrack.album?.images?.[0] ? (
                  <img 
                    src={currentTrack.album.images[0].url} 
                    alt="Album art" 
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  <Music size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {currentTrack.artists?.map(a => a.name).join(', ')}
                </p>
              </div>
              <div className="text-green-400">
                {playbackState?.is_playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-6">Settings</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Work Time (minutes)</label>
                <input
                  type="number"
                  value={workTime}
                  onChange={(e) => setWorkTime(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  min="1"
                  max="60"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Short Break (minutes)</label>
                <input
                  type="number"
                  value={shortBreakTime}
                  onChange={(e) => setShortBreakTime(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  min="1"
                  max="30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Long Break (minutes)</label>
                <input
                  type="number"
                  value={longBreakTime}
                  onChange={(e) => setLongBreakTime(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  min="1"
                  max="60"
                />
              </div>

              {isSpotifyConnected && playlists.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Work Playlist</label>
                  <select
                    value={selectedPlaylist?.id || ''}
                    onChange={(e) => {
                      const playlist = playlists.find(p => p.id === e.target.value);
                      setSelectedPlaylist(playlist);
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="">No playlist</option>
                    {playlists.map(playlist => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Apply settings
                  if (currentSession === 'work') setTimeLeft(workTime * 60);
                  else if (currentSession === 'shortBreak') setTimeLeft(shortBreakTime * 60);
                  else setTimeLeft(longBreakTime * 60);
                  setShowSettings(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 