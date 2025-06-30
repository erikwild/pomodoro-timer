// Spotify Web API Service

class SpotifyAPI {
  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    this.redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;
    this.scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    this.tokenExpiry = localStorage.getItem('spotify_token_expiry');
  }

  // Generate random string for state parameter
  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  }

  // Generate code verifier for PKCE
  generateCodeVerifier() {
    return this.generateRandomString(64);
  }

  // Generate code challenge from verifier
  async generateCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Start the authorization flow
  async authorize() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomString(16);

    // Store code verifier for later use
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    localStorage.setItem('spotify_state', state);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('scope', this.scope);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('state', state);

    window.location = authUrl.toString();
  }

  // Handle the authorization callback
  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('spotify_state');
    const codeVerifier = localStorage.getItem('spotify_code_verifier');

    if (!code || !state || state !== storedState) {
      throw new Error('Invalid authorization callback');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      // Store tokens
      localStorage.setItem('spotify_access_token', this.accessToken);
      localStorage.setItem('spotify_refresh_token', this.refreshToken);
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());

      // Clean up
      localStorage.removeItem('spotify_code_verifier');
      localStorage.removeItem('spotify_state');

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return true;
    } catch (error) {
      console.error('Error handling callback:', error);
      return false;
    }
  }

  // Refresh the access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      localStorage.setItem('spotify_access_token', this.accessToken);
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());

      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
        localStorage.setItem('spotify_refresh_token', this.refreshToken);
      }

      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      return false;
    }
  }

  // Check if token is valid and refresh if needed
  async ensureValidToken() {
    if (!this.accessToken) {
      return false;
    }

    if (Date.now() >= this.tokenExpiry - 60000) { // Refresh 1 minute before expiry
      return await this.refreshAccessToken();
    }

    return true;
  }

  // Make authenticated API request
  async apiRequest(endpoint, options = {}) {
    const isValid = await this.ensureValidToken();
    if (!isValid) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token might be invalid, try to refresh
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request
        return this.apiRequest(endpoint, options);
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  // Get current playback state
  async getCurrentPlayback() {
    try {
      return await this.apiRequest('/me/player');
    } catch (error) {
      if (error.message.includes('404')) {
        return null; // No active device
      }
      throw error;
    }
  }

  // Get user's devices
  async getDevices() {
    const data = await this.apiRequest('/me/player/devices');
    return data.devices;
  }

  // Start/Resume playback
  async play(deviceId = null, contextUri = null, uris = null) {
    const body = {};
    if (contextUri) body.context_uri = contextUri;
    if (uris) body.uris = uris;

    const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
    
    await this.apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // Pause playback
  async pause() {
    await this.apiRequest('/me/player/pause', {
      method: 'PUT',
    });
  }

  // Set volume (0-100)
  async setVolume(volume) {
    await this.apiRequest(`/me/player/volume?volume_percent=${volume}`, {
      method: 'PUT',
    });
  }

  // Get playlist details
  async getPlaylist(playlistId) {
    return await this.apiRequest(`/playlists/${playlistId}`);
  }

  // Get user's playlists
  async getUserPlaylists(limit = 20, offset = 0) {
    return await this.apiRequest(`/me/playlists?limit=${limit}&offset=${offset}`);
  }

  // Extract playlist ID from Spotify URL
  extractPlaylistId(url) {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  // Logout
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
  }

  // Get user profile
  async getUserProfile() {
    return await this.apiRequest('/me');
  }
}

export default SpotifyAPI;