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
  
  // Playlist state for work and break
  const [workPlaylistUrl, setWorkPlaylistUrl] = useState(() => {
    return localStorage.getItem('pomodoro-work-playlist') || '';
  });
  const [breakPlaylistUrl, setBreakPlaylistUrl] = useState(() => {
    return localStorage.getItem('pomodoro-break-playlist') || '';
  });
  const [workPlaylistId, setWorkPlaylistId] = useState('');
  const [breakPlaylistId, setBreakPlaylistId] = useState('');
  
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

  // Save playlist URLs to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro-work-playlist', workPlaylistUrl);
  }, [workPlaylistUrl]);

  useEffect(() => {
    localStorage.setItem('pomodoro-break-playlist', breakPlaylistUrl);
  }, [breakPlaylistUrl]);

  // Extract playlist IDs from URLs
  useEffect(() => {
    setWorkPlaylistId(spotify.extractPlaylistId(workPlaylistUrl) || '');
  }, [workPlaylistUrl]);

  useEffect(() => {
    setBreakPlaylistId(spotify.extractPlaylistId(breakPlaylistUrl) || '');
  }, [breakPlaylistUrl]);

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
        // Switch to break playlist
        if (isSpotifyConnected && breakPlaylistId) {
          switchPlaylist(breakPlaylistId);
        }
      } else {
        setCurrentSession('shortBreak');
        setTimeLeft(shortBreakTime * 60);
        // Switch to break playlist
        if (isSpotifyConnected && breakPlaylistId) {
          switchPlaylist(breakPlaylistId);
        }
      }
    } else {
      setCurrentSession('work');
      setTimeLeft(workTime * 60);
      // Switch to work playlist
      if (isSpotifyConnected && workPlaylistId) {
        switchPlaylist(workPlaylistId);
      }
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    if (isSpotifyConnected && currentSession === 'work' && workPlaylistId) {
      // Start work playlist for work session
      switchPlaylist(workPlaylistId);
    } else if (isSpotifyConnected && currentSession !== 'work' && breakPlaylistId) {
      // Start break playlist for break session
      switchPlaylist(breakPlaylistId);
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

  const switchPlaylist = async (playlistId) => {
    try {
      await spotify.play(null, `spotify:playlist:${playlistId}`);
    } catch (error) {
      console.error('Error switching playlist:', error);
    }
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

  const presets = [
    { name: 'Classic', work: 25, break: 5 },
    { name: 'Extended', work: 45, break: 15 },
    { name: 'Power Hour', work: 50, break: 10 },
    { name: 'Quick Sprint', work: 15, break: 3 }
  ];

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
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/20 max-h-[80vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-xl">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Quick Presets Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white/80 text-sm font-medium mb-3">Quick Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setWorkTime(preset.work);
                        setShortBreakTime(preset.break);
                        setLongBreakTime(preset.break * 3);
                      }}
                      className="p-3 text-xs bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all duration-200"
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-white/60 mt-1">{preset.work}/{preset.break}min</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Duration Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white/80 text-sm font-medium mb-3">Timer Durations</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-white/70 text-xs mb-2">Work (min)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={workTime}
                      onChange={(e) => setWorkTime(Number(e.target.value))}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-xs mb-2">Short Break</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={shortBreakTime}
                      onChange={(e) => setShortBreakTime(Number(e.target.value))}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-xs mb-2">Long Break</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={longBreakTime}
                      onChange={(e) => setLongBreakTime(Number(e.target.value))}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Spotify Playlists Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Music size={16} className="text-green-400" />
                  <h4 className="text-white/80 text-sm font-medium">Spotify Playlists</h4>
                </div>
                
                {!isSpotifyConnected ? (
                  <div className="text-center py-4">
                    <p className="text-white/50 text-sm mb-3">
                      Connect to Spotify to select playlists
                    </p>
                    <button
                      onClick={connectSpotify}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-colors"
                    >
                      Connect Spotify
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Work Playlist */}
                    <div>
                      <label className="block text-white/70 text-xs mb-2">Study Session Playlist</label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="https://open.spotify.com/playlist/..."
                          value={workPlaylistUrl}
                          onChange={(e) => setWorkPlaylistUrl(e.target.value)}
                          className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setWorkPlaylistUrl(`https://open.spotify.com/playlist/${e.target.value}`);
                            }
                          }}
                          className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white"
                          value=""
                        >
                          <option value="" className="bg-gray-800">Choose from your playlists...</option>
                          {playlists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id} className="bg-gray-800">
                              {playlist.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Break Playlist */}
                    <div>
                      <label className="block text-white/70 text-xs mb-2">Break Time Playlist</label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="https://open.spotify.com/playlist/..."
                          value={breakPlaylistUrl}
                          onChange={(e) => setBreakPlaylistUrl(e.target.value)}
                          className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setBreakPlaylistUrl(`https://open.spotify.com/playlist/${e.target.value}`);
                            }
                          }}
                          className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white"
                          value=""
                        >
                          <option value="" className="bg-gray-800">Choose from your playlists...</option>
                          {playlists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id} className="bg-gray-800">
                              {playlist.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apply/Cancel Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  // Apply settings
                  if (currentSession === 'work') setTimeLeft(workTime * 60);
                  else if (currentSession === 'shortBreak') setTimeLeft(shortBreakTime * 60);
                  else setTimeLeft(longBreakTime * 60);
                  setShowSettings(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-colors font-medium"
              >
                Apply Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg transition-colors font-medium"
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