import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Music, Clock, Coffee, LogIn, LogOut, Volume2, SkipForward } from 'lucide-react';
import SpotifyAPI from './services/spotify';

const App = () => {
  // Timer state
  const [workDuration, setWorkDuration] = useState(() => {
    const saved = localStorage.getItem('pomodoro-work-duration');
    return saved ? parseInt(saved) : 25;
  });
  const [breakDuration, setBreakDuration] = useState(() => {
    const saved = localStorage.getItem('pomodoro-break-duration');
    return saved ? parseInt(saved) : 5;
  });
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Spotify state
  const [spotify] = useState(new SpotifyAPI());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [volume, setVolume] = useState(50);

  // Playlist state
  const [workPlaylistUrl, setWorkPlaylistUrl] = useState(() => {
    return localStorage.getItem('pomodoro-work-playlist') || '';
  });
  const [breakPlaylistUrl, setBreakPlaylistUrl] = useState(() => {
    return localStorage.getItem('pomodoro-break-playlist') || '';
  });
  const [workPlaylistId, setWorkPlaylistId] = useState('');
  const [breakPlaylistId, setBreakPlaylistId] = useState('');
  const [userPlaylists, setUserPlaylists] = useState([]);

  const intervalRef = useRef(null);
  const playbackCheckRef = useRef(null);

  // Check for Spotify callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code')) {
      spotify.handleCallback().then(success => {
        if (success) {
          setIsAuthenticated(true);
          initializeSpotify();
        }
      });
    } else if (spotify.isAuthenticated()) {
      setIsAuthenticated(true);
      initializeSpotify();
    }
  }, []);

  // Initialize Spotify data
  const initializeSpotify = async () => {
    try {
      const [profile, deviceList, playlists] = await Promise.all([
        spotify.getUserProfile(),
        spotify.getDevices(),
        spotify.getUserPlaylists(50)
      ]);
      
      setUserProfile(profile);
      setDevices(deviceList);
      setUserPlaylists(playlists.items);
      
      // Select the first available device
      const activeDevice = deviceList.find(d => d.is_active) || deviceList[0];
      if (activeDevice) {
        setSelectedDevice(activeDevice.id);
      }

      // Start checking playback state
      startPlaybackCheck();
    } catch (error) {
      console.error('Error initializing Spotify:', error);
    }
  };

  // Check playback state periodically
  const startPlaybackCheck = () => {
    playbackCheckRef.current = setInterval(async () => {
      try {
        const playback = await spotify.getCurrentPlayback();
        if (playback) {
          setCurrentTrack(playback.item);
          setIsPlaying(playback.is_playing);
          setVolume(playback.device.volume_percent);
        }
      } catch (error) {
        console.error('Error checking playback:', error);
      }
    }, 5000);
  };

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playbackCheckRef.current) clearInterval(playbackCheckRef.current);
    };
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro-work-duration', workDuration.toString());
  }, [workDuration]);

  useEffect(() => {
    localStorage.setItem('pomodoro-break-duration', breakDuration.toString());
  }, [breakDuration]);

  useEffect(() => {
    localStorage.setItem('pomodoro-work-playlist', workPlaylistUrl);
  }, [workPlaylistUrl]);

  useEffect(() => {
    localStorage.setItem('pomodoro-break-playlist', breakPlaylistUrl);
  }, [breakPlaylistUrl]);

  // Update timeLeft when durations change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(isWorkSession ? workDuration * 60 : breakDuration * 60);
    }
  }, [workDuration, breakDuration, isWorkSession, isRunning]);

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
    } else if (timeLeft === 0) {
      // Session completed
      if (isWorkSession) {
        setCompletedSessions(prev => prev + 1);
        setIsWorkSession(false);
        setTimeLeft(breakDuration * 60);
        // Switch to break playlist
        if (isAuthenticated && breakPlaylistId) {
          switchPlaylist(breakPlaylistId);
        }
      } else {
        setIsWorkSession(true);
        setTimeLeft(workDuration * 60);
        // Switch to work playlist
        if (isAuthenticated && workPlaylistId) {
          switchPlaylist(workPlaylistId);
        }
      }
      
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceAjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceAjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceAjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceA==');
      audio.play().catch(() => {});
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, isWorkSession, workDuration, breakDuration, workPlaylistId, breakPlaylistId, isAuthenticated]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = async () => {
    setIsRunning(!isRunning);
    
    if (!isRunning && isAuthenticated) {
      // Starting timer - play appropriate playlist
      const playlistId = isWorkSession ? workPlaylistId : breakPlaylistId;
      if (playlistId) {
        await switchPlaylist(playlistId);
      }
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isWorkSession ? workDuration * 60 : breakDuration * 60);
  };

  const skipSession = () => {
    setIsRunning(false);
    if (isWorkSession) {
      setCompletedSessions(prev => prev + 1);
      setIsWorkSession(false);
      setTimeLeft(breakDuration * 60);
    } else {
      setIsWorkSession(true);
      setTimeLeft(workDuration * 60);
    }
  };

  const switchPlaylist = async (playlistId) => {
    try {
      if (selectedDevice) {
        await spotify.play(selectedDevice, `spotify:playlist:${playlistId}`);
      } else {
        await spotify.play(null, `spotify:playlist:${playlistId}`);
      }
    } catch (error) {
      console.error('Error switching playlist:', error);
    }
  };

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await spotify.pause();
      } else {
        await spotify.play(selectedDevice);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    try {
      await spotify.setVolume(newVolume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const handleLogin = () => {
    spotify.authorize();
  };

  const handleLogout = () => {
    spotify.logout();
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setIsPlaying(false);
    setUserProfile(null);
    setDevices([]);
    setSelectedDevice(null);
    if (playbackCheckRef.current) {
      clearInterval(playbackCheckRef.current);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await spotify.pause();
        setIsPlaying(false);
      } else {
        await spotify.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
    }
  };

  const updatePlaybackState = async () => {
    try {
      const playback = await spotify.getCurrentPlayback();
      if (playback) {
        setIsPlaying(playback.is_playing);
        setCurrentTrack(playback.item);
      } else {
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    } catch (error) {
      console.error('Error getting playback state:', error);
    }
  };


  const progress = isWorkSession 
    ? ((workDuration * 60 - timeLeft) / (workDuration * 60)) * 100
    : ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isWorkSession ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
                {isWorkSession ? (
                  <Clock className={`${isWorkSession ? 'text-emerald-400' : 'text-orange-400'}`} size={20} />
                ) : (
                  <Coffee className={`${isWorkSession ? 'text-emerald-400' : 'text-orange-400'}`} size={20} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isWorkSession ? 'Focus Time' : 'Break Time'}
                </h1>
                <p className="text-white/60 text-sm">Session {completedSessions + 1}</p>
                {isAuthenticated && userProfile && (
                  <div className="flex flex-col items-center mt-2">
                    <p className="text-emerald-400 text-xs font-medium mb-2">
                      Hello, {userProfile.display_name || userProfile.id}!
                    </p>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 text-xs text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-full border border-white/20"
                    >
                      Logout from Spotify
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Spotify Auth */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {userProfile && (
                    <img 
                      src={userProfile.images?.[0]?.url || '/default-avatar.png'} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-full text-white text-sm transition-all hover:scale-105"
                >
                  <LogIn size={16} />
                  Spotify
                </button>
              )}
            </div>
          </div>
          
          {/* Timer next to profile */}
          <div className="flex items-center justify-between">
            {/* Compact Timer Display */}
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={isWorkSession ? "#10b981" : "#f97316"}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-mono font-bold text-white">
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-white/80 text-sm font-medium">
                  {isWorkSession ? `${workDuration} min work` : `${breakDuration} min break`}
                </div>
                <div className={`text-xs font-medium mt-1 ${isWorkSession ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Controls */}
        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={toggleTimer}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            } shadow-lg`}
          >
            {isRunning ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 transition-all duration-200 shadow-lg"
          >
            <RotateCcw size={20} className="text-white" />
          </button>
          <button
            onClick={skipSession}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-all duration-200 shadow-lg"
            title="Skip to next session"
          >
            <SkipForward size={20} className="text-white" />
          </button>
          {isAuthenticated && (
            <button
              onClick={handlePlayPause}
              className={`p-3 rounded-full transition-all duration-200 shadow-lg ${
                isPlaying 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              title={isPlaying ? 'Pause music' : 'Play music'}
            >
              {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white" />}
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 transition-all duration-200 shadow-lg"
          >
            <Settings size={20} className="text-white" />
          </button>
        </div>

        {/* Spotify Playback Controls */}
        {isAuthenticated && (
          <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-green-400" />
                <span className="text-white/80 text-sm font-medium">Spotify</span>
              </div>
              <button
                onClick={togglePlayback}
                className="p-2 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
              >
                {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
              </button>
            </div>
            
            {currentTrack && (
              <div className="mb-3">
                <div className="text-white text-sm font-medium truncate">
                  {currentTrack.name}
                </div>
                <div className="text-white/60 text-xs truncate">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </div>
              </div>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-white/60" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white/60 text-xs w-8">{volume}</span>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <div 
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/20 max-h-[80vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Custom Durations */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-lg mb-2">Work (min)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={workDuration}
                      onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)}
                      className="w-full p-4 text-lg bg-white/10 border border-white/20 rounded text-white placeholder-white/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-lg mb-2">Break (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(parseInt(e.target.value) || 5)}
                      className="w-full p-4 text-lg bg-white/10 border border-white/20 rounded text-white placeholder-white/50"
                    />
                  </div>
                </div>

                {/* Spotify Device Selection */}
                {isAuthenticated && devices.length > 0 && (
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Playback Device</label>
                    <select
                      value={selectedDevice || ''}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                    >
                      <option value="">Select device...</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id} className="bg-gray-800">
                          {device.name} {device.is_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Spotify Playlists */}
                <div className="space-y-3">
                  <h4 className="text-white/80 text-sm font-medium">Spotify Playlists</h4>
                  
                  {/* Work Playlist */}
                  <div>
                    <label className="block text-white/70 text-xs mb-1">Work Session Playlist</label>
                    {isAuthenticated && (
                      <select
                        value={workPlaylistId}
                        onChange={(e) => {
                          const playlistId = e.target.value;
                          setWorkPlaylistId(playlistId);
                          if (playlistId) {
                            setWorkPlaylistUrl(`https://open.spotify.com/playlist/${playlistId}`);
                          }
                        }}
                        className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded text-white"
                      >
                        <option value="" className="bg-gray-800">Choose from your playlists...</option>
                        {userPlaylists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id} className="bg-gray-800">
                            {playlist.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Break Playlist */}
                  <div>
                    <label className="block text-white/70 text-xs mb-1">Break Playlist</label>
                    {isAuthenticated && (
                      <select
                        value={breakPlaylistId}
                        onChange={(e) => {
                          const playlistId = e.target.value;
                          setBreakPlaylistId(playlistId);
                          if (playlistId) {
                            setBreakPlaylistUrl(`https://open.spotify.com/playlist/${playlistId}`);
                          }
                        }}
                        className="w-full p-2 text-sm bg-white/10 border border-white/20 rounded text-white"
                      >
                        <option value="" className="bg-gray-800">Choose from your Spotify playlists...</option>
                        {userPlaylists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id} className="bg-gray-800">
                            {playlist.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {!isAuthenticated && (
                    <p className="text-white/50 text-xs">
                      Sign in with Spotify to see your playlists and control playback directly.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;