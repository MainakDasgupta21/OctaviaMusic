import { motion } from 'framer-motion';
import { Heart, Play, Clock } from 'lucide-react';
import { usePlayer, Track } from '@/contexts/PlayerContext';

// Mock favorites data
const favoritesTracks: Track[] = [
  { id: 'f1', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: '3:33' },
  { id: 'f2', videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg', duration: '3:53' },
  { id: 'f3', videoId: 'IeyJ7MPb7MQ', title: 'Idol', artist: 'YOASOBI', thumbnail: 'https://i.ytimg.com/vi/IeyJ7MPb7MQ/maxresdefault.jpg', duration: '3:35' },
];

const FavoritesPage = () => {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();

  const handlePlayAll = () => {
    if (favoritesTracks.length > 0) {
      playTrack(favoritesTracks[0]);
      favoritesTracks.slice(1).forEach(track => addToQueue(track));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Heart className="w-6 h-6 text-primary fill-current" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Favorites</h1>
          </div>
          <p className="text-muted-foreground">{favoritesTracks.length} songs you love</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePlayAll}
          disabled={favoritesTracks.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-orange-400 font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-50"
        >
          <Play className="w-5 h-5 fill-current" />
          Play All
        </motion.button>
      </motion.div>

      {/* Favorites List */}
      {favoritesTracks.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {favoritesTracks.map((track, index) => {
            const isCurrentTrack = currentTrack?.id === track.id;
            
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => playTrack(track)}
                className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-white/5 border-b border-white/5 last:border-0 ${
                  isCurrentTrack ? 'bg-primary/10' : ''
                }`}
              >
                <span className="w-8 text-center text-muted-foreground">
                  {isCurrentTrack && isPlaying ? (
                    <div className="flex gap-0.5 justify-center">
                      <span className="w-0.5 h-3 bg-primary animate-pulse rounded-full" />
                      <span className="w-0.5 h-4 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
                      <span className="w-0.5 h-2 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
                    </div>
                  ) : (
                    index + 1
                  )}
                </span>
                
                <div className="relative group">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                    <Play className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                    {track.title}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>
                
                <Heart className="w-5 h-5 text-primary fill-current" />
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{track.duration}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">Songs you like will appear here</p>
        </motion.div>
      )}
    </div>
  );
};

export default FavoritesPage;
