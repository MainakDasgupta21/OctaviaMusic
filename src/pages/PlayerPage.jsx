import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1,
  Heart,
  ListMusic
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Slider } from '@/components/ui/slider';

// Mock similar artists and recommendations
const similarArtists = [
  { id: '1', name: 'Shawn Mendes', followers: '36.4M Followers', image: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg' },
  { id: '2', name: 'James Arthur', followers: '9.3M Followers', image: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg' },
  { id: '3', name: 'James TW', followers: '1.0M Followers', image: 'https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg' },
];

const madeForYou = [
  { id: '1', title: 'New Music Friday', songs: 96, image: 'https://i.ytimg.com/vi/IeyJ7MPb7MQ/maxresdefault.jpg' },
  { id: '2', title: 'just hits', songs: 94, image: 'https://i.ytimg.com/vi/ZRtdQ81jPUQ/maxresdefault.jpg' },
  { id: '3', title: 'Wake Up Happy', songs: 150, image: 'https://i.ytimg.com/vi/DkeiKbqa02g/maxresdefault.jpg' },
];

const newReleases = [
  { id: '1', title: 'Dharma', artist: 'Sebastian Yatra', image: 'https://i.ytimg.com/vi/4iGU6PctOBg/maxresdefault.jpg' },
  { id: '2', title: 'Me vs. Me', artist: 'NLE Choppa', image: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg' },
  { id: '3', title: "the lifeboat's empty!", artist: 'Chelsea Cutler', image: 'https://i.ytimg.com/vi/8OkpRK2_gVs/maxresdefault.jpg' },
];

const PlayerPage = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    queue,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    playTrack,
  } = usePlayer();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Default track for display when nothing is playing
  const displayTrack = currentTrack || {
    title: 'Select a song to play',
    artist: 'Browse your library',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  };

  return (
    <div className="min-h-screen p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Player Area */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 mb-8"
          >
            {/* Song Title */}
            <motion.h1 
              key={displayTrack.title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-center mb-2 gradient-text"
            >
              {displayTrack.title}
            </motion.h1>
            <p className="text-center text-muted-foreground mb-8">{displayTrack.artist}</p>

            {/* Vinyl Record and Controls */}
            <div className="flex items-center justify-center gap-8 mb-8">
              {/* Vinyl Record */}
              <div className="relative w-64 h-64">
                {/* Outer ring glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-xl" />
                
                {/* Vinyl disc */}
                <motion.div 
                  className={`relative w-full h-full rounded-full overflow-hidden ${isPlaying ? 'vinyl-spinning' : ''}`}
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, hsl(222 47% 15%) 0%, hsl(222 47% 8%) 100%)',
                    boxShadow: '0 0 60px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Vinyl grooves */}
                  <div 
                    className="absolute inset-4 rounded-full border border-white/5"
                    style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }}
                  />
                  <div className="absolute inset-8 rounded-full border border-white/5" />
                  <div className="absolute inset-12 rounded-full border border-white/5" />
                  <div className="absolute inset-16 rounded-full border border-white/5" />
                  
                  {/* Center album art */}
                  <div className="absolute inset-[25%] rounded-full overflow-hidden ring-2 ring-white/10">
                    <img
                      src={displayTrack.thumbnail}
                      alt={displayTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20" />
                </motion.div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-4 mb-6 max-w-lg mx-auto">
              <span className="text-sm text-muted-foreground w-12 text-right">{formatTime(progress)}</span>
              <div className="flex-1 relative">
                {/* Waveform visualization placeholder */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-30">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 rounded-full bg-primary"
                      style={{ 
                        height: `${Math.random() * 20 + 10}px`,
                        opacity: i / 40 < progress / duration ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={1}
                  onValueChange={(value) => seekTo(value[0])}
                  className="relative z-10"
                />
              </div>
              <span className="text-sm text-muted-foreground w-12">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-full transition-colors ${shuffle ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button
                onClick={playPrevious}
                className="p-3 text-foreground hover:text-primary transition-colors"
              >
                <SkipBack className="w-7 h-7" />
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/40 pulse-glow"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Play className="w-7 h-7 text-primary-foreground ml-1" />
                )}
              </motion.button>
              <button
                onClick={playNext}
                className="p-3 text-foreground hover:text-primary transition-colors"
              >
                <SkipForward className="w-7 h-7" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-3 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Similar Artists */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="font-semibold mb-4">Similar Artists</h3>
              <div className="space-y-3">
                {similarArtists.map((artist) => (
                  <div key={artist.id} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors">
                    <img src={artist.image} alt={artist.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium">{artist.name}</p>
                      <p className="text-xs text-muted-foreground">{artist.followers}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Made for You */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="font-semibold mb-4">Made for You</h3>
              <div className="space-y-3">
                {madeForYou.map((playlist) => (
                  <div key={playlist.id} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors">
                    <img src={playlist.image} alt={playlist.title} className="w-10 h-10 rounded object-cover" />
                    <div>
                      <p className="text-sm font-medium">{playlist.title}</p>
                      <p className="text-xs text-muted-foreground">{playlist.songs} Songs</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* New Releases */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="font-semibold mb-4">New Releases</h3>
              <div className="space-y-3">
                {newReleases.map((release) => (
                  <div key={release.id} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg cursor-pointer transition-colors">
                    <img src={release.image} alt={release.title} className="w-10 h-10 rounded object-cover" />
                    <div>
                      <p className="text-sm font-medium">{release.title}</p>
                      <p className="text-xs text-muted-foreground">{release.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Sidebar - Album & Queue */}
        <div className="space-y-6">
          {/* Current Album */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-5"
          >
            <img
              src={displayTrack.thumbnail}
              alt={displayTrack.title}
              className="w-full aspect-square rounded-xl object-cover mb-4"
            />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{displayTrack.title}</h3>
                <p className="text-sm text-muted-foreground">{displayTrack.artist}</p>
              </div>
              <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Up Next Queue */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Up Next</h3>
              <ListMusic className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {queue.length > 0 ? (
                queue.slice(0, 6).map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <p className="text-sm truncate flex-1">{track.title}</p>
                    <span className="text-xs text-muted-foreground">{track.duration || '3:30'}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;