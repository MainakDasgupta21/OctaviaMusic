# Backend Setup Guide

This music player frontend expects a Node/Express backend running on `http://localhost:5000`.

## Required Endpoints

### 1. Search - `GET /api/search`
**Query Params:** `q` (search query), `filter` (song|video|album|artist)

**Response:**
```json
[
  {
    "id": "string",
    "videoId": "youtube_video_id",
    "title": "Song Title",
    "artist": "Artist Name",
    "thumbnail": "https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg",
    "type": "song",
    "duration": "3:45"
  }
]
```

### 2. Get Album - `GET /api/album/:id`
**Response:**
```json
{
  "id": "string",
  "title": "Album Title",
  "artist": "Artist Name",
  "thumbnail": "url",
  "releaseDate": "2023-01-01",
  "tracks": [/* array of track objects */]
}
```

### 3. Get Artist - `GET /api/artist/:id`
**Response:**
```json
{
  "id": "string",
  "name": "Artist Name",
  "thumbnail": "url",
  "subscribers": "10M",
  "albums": [/* array of album objects */]
}
```

## Backend Stack

```bash
npm init -y
npm install express mongoose cors axios dotenv
```

## Example Server (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/musicplayer');

// Mongoose Schemas
const FavoriteSchema = new mongoose.Schema({
  userId: String,
  videoId: String,
  title: String,
  artist: String,
  thumbnail: String,
  addedAt: { type: Date, default: Date.now }
});

const PlaylistSchema = new mongoose.Schema({
  userId: String,
  name: String,
  tracks: [{
    videoId: String,
    title: String,
    artist: String,
    thumbnail: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const Favorite = mongoose.model('Favorite', FavoriteSchema);
const Playlist = mongoose.model('Playlist', PlaylistSchema);

// Routes
app.get('/api/search', async (req, res) => {
  const { q, filter = 'song' } = req.query;
  // Proxy to YouTube Music API or use ytmusic-api package
  // Return formatted results
  res.json([]);
});

app.get('/api/album/:id', async (req, res) => {
  // Fetch album details
  res.json({});
});

app.get('/api/artist/:id', async (req, res) => {
  // Fetch artist details
  res.json({});
});

app.listen(5000, () => console.log('Backend running on port 5000'));
```

## Image Quality Utility

The frontend includes a utility to upgrade low-res YouTube thumbnails:
```javascript
// Converts =w60-h60 to =w544-h544 for high-res images
upgradeImageQuality(url)
```

## Playback Note

The app uses `react-player` with YouTube video IDs. When a user clicks a song, pass the `videoId` to the player - it handles YouTube's stream internally without needing direct MP3 URLs.
