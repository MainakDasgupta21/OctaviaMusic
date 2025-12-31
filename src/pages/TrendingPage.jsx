import { motion } from 'framer-motion';
import { TrendingUp, Play, Clock } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

const trendingSongs = [
  { id: 't1', videoId: 'IeyJ7MPb7MQ', title: 'Idol', artist: 'YOASOBI', thumbnail: 'https://i.ytimg.com/vi/IeyJ7MPb7MQ/maxresdefault.jpg', duration: '3:35' },
  { id: 't2', videoId: 'ZRtdQ81jPUQ', title: 'Kick Back', artist: 'Kenshi Yonezu', thumbnail: 'https://i.ytimg.com/vi/ZRtdQ81jPUQ/maxresdefault.jpg', duration: '3:18' },
  { id: 't3', videoId: 'DkeiKbqa02g', title: 'Levitating', artist: 'Dua Lipa', thumbnail: 'https://i.ytimg.com/vi/DkeiKbqa02g/maxresdefault.jpg', duration: '3:23' },
  { id: 't4', videoId: '8OkpRK2_gVs', title: 'Shinzou wo Sasageyo', artist: 'Linked Horizon', thumbnail: 'https://i.ytimg.com/vi/8OkpRK2_gVs/maxresdefault.jpg', duration: '5:12' },
  { id: 't5', videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg', duration: '3:53' },
  { id: 't6', videoId: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg', duration: '4:42' },
  { id: 't7', videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg', duration: '5:55' },
  { id: 't8', videoId: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg', duration: '4:17' },
];

const TrendingPage = () => {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();

  const handlePlayAll = () => {
    if (trendingSongs.length > 0) {
      playTrack(trendingSongs[0]);
      trendingSongs.slice(1).forEach(track => addToQueue(track));
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
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Trending Now</h1>
          </div>
          <p className="text-muted-foreground">The hottest tracks right now</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-orange-400 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Play className="w-5 h-5 fill-current" />
          Play All
        </motion.button>
      </motion.div>

      {/* Trending List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 border-b border-white/5 text-sm text-muted-foreground">
          <span className="w-10 text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block w-32">Album</span>
          <span className="w-16 text-right">
            <Clock className="w-4 h-4 inline" />
          </span>
        </div>
        
        {trendingSongs.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => playTrack(track)}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 items-center cursor-pointer transition-all hover:bg-white/5 ${
                isCurrentTrack ? 'bg-primary/10' : ''
              }`}
            >
              <span className="w-10 text-center text-muted-foreground">
                {isCurrentTrack && isPlaying ? (
                  <div className="flex gap-0.5 justify-center">
                    <span className="w-0.5 h-3 bg-primary animate-pulse rounded-full" />
                    <span className="w-0.5 h-4 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
                    <span className="w-0.5 h-2 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
                  </div>
                ) : (
                  <span className={isCurrentTrack ? 'text-primary font-bold' : ''}>{index + 1}</span>
                )}
              </span>
              
              <div className="flex items-center gap-4 min-w-0">
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
                <div className="min-w-0">
                  <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                    {track.title}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>
              </div>
              
              <span className="hidden md:block w-32 text-sm text-muted-foreground truncate">
                {track.title}
              </span>
              
              <span className="w-16 text-right text-sm text-muted-foreground">
                {track.duration}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default TrendingPage;