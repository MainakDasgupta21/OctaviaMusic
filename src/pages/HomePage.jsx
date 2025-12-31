import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Skeleton } from '@/components/ui/skeleton';

// Mock featured albums for demo
const featuredAlbums = [
  {
    id: '1',
    title: 'Attack on Titan - Complete Soundtrack',
    artist: 'Various Artists',
    songCount: 92,
    thumbnail: 'https://i.ytimg.com/vi/8OkpRK2_gVs/maxresdefault.jpg',
    tracks: [
      { id: '1-1', videoId: '8OkpRK2_gVs', title: 'Shinzou wo Sasageyo', artist: 'Linked Horizon', thumbnail: 'https://i.ytimg.com/vi/8OkpRK2_gVs/maxresdefault.jpg', duration: '5:12' },
      { id: '1-2', videoId: 'CID-sYQNCew', title: 'Guren no Yumiya', artist: 'Linked Horizon', thumbnail: 'https://i.ytimg.com/vi/CID-sYQNCew/maxresdefault.jpg', duration: '5:24' },
    ]
  },
  {
    id: '2',
    title: 'Top Anime Openings 2024',
    artist: 'Various Artists',
    songCount: 428,
    thumbnail: 'https://i.ytimg.com/vi/IeyJ7MPb7MQ/maxresdefault.jpg',
    tracks: [
      { id: '2-1', videoId: 'IeyJ7MPb7MQ', title: 'Idol', artist: 'YOASOBI', thumbnail: 'https://i.ytimg.com/vi/IeyJ7MPb7MQ/maxresdefault.jpg', duration: '3:35' },
      { id: '2-2', videoId: 'ZRtdQ81jPUQ', title: 'Kick Back', artist: 'Kenshi Yonezu', thumbnail: 'https://i.ytimg.com/vi/ZRtdQ81jPUQ/maxresdefault.jpg', duration: '3:18' },
    ]
  },
  {
    id: '3',
    title: 'Mega Hit Mix',
    artist: 'Various Artists',
    songCount: 75,
    thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
    tracks: [
      { id: '3-1', videoId: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg', duration: '3:53' },
    ]
  },
  {
    id: '4',
    title: 'VALORANT | Game Music',
    artist: 'Riot Games',
    songCount: 35,
    thumbnail: 'https://i.ytimg.com/vi/4iGU6PctOBg/maxresdefault.jpg',
    tracks: [
      { id: '4-1', videoId: '4iGU6PctOBg', title: 'Valorant Main Theme', artist: 'Riot Games', thumbnail: 'https://i.ytimg.com/vi/4iGU6PctOBg/maxresdefault.jpg', duration: '3:01' },
    ]
  },
  {
    id: '5',
    title: 'Pop Mix',
    artist: 'Various Artists',
    songCount: 50,
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
    tracks: [
      { id: '5-1', videoId: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg', duration: '4:42' },
    ]
  },
  {
    id: '6',
    title: 'This Is Dua Lipa',
    artist: 'Dua Lipa',
    songCount: 44,
    thumbnail: 'https://i.ytimg.com/vi/DkeiKbqa02g/maxresdefault.jpg',
    tracks: [
      { id: '6-1', videoId: 'DkeiKbqa02g', title: 'Levitating', artist: 'Dua Lipa', thumbnail: 'https://i.ytimg.com/vi/DkeiKbqa02g/maxresdefault.jpg', duration: '3:23' },
    ]
  },
  {
    id: '7',
    title: 'On My Mind',
    artist: 'Various Artists',
    songCount: 6,
    thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg',
    tracks: [
      { id: '7-1', videoId: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg', duration: '4:17' },
    ]
  },
  {
    id: '8',
    title: 'Good One Kid',
    artist: 'Various Artists',
    songCount: 12,
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
    tracks: [
      { id: '8-1', videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg', duration: '5:55' },
    ]
  },
];

const AlbumCard = ({ album, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { playTrack, addToQueue } = usePlayer();

  const handlePlay = (e) => {
    e.stopPropagation();
    if (album.tracks.length > 0) {
      playTrack(album.tracks[0]);
      album.tracks.slice(1).forEach(track => addToQueue(track));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative rounded-xl overflow-hidden cursor-pointer card-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(180deg, hsl(280 60% 25% / 0.3), hsl(222 47% 12%))',
      }}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={album.thumbnail}
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Play button overlay */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          onClick={handlePlay}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/40"
        >
          <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
        </motion.button>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate">{album.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{album.songCount} Songs</p>
      </div>
    </motion.div>
  );
};

const AlbumCardSkeleton = () => (
  <div className="rounded-xl overflow-hidden bg-card/50">
    <Skeleton className="aspect-square w-full" />
    <div className="p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">Your Library</h1>
        <p className="text-muted-foreground">Your personalized music collection</p>
      </motion.div>

      {/* Album Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <AlbumCardSkeleton key={i} />)
          : featuredAlbums.map((album, index) => (
              <AlbumCard key={album.id} album={album} index={index} />
            ))}
      </div>

      {/* Quick Picks Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12"
      >
        <h2 className="text-xl font-semibold mb-6">Your Top Songs</h2>
        <div className="glass rounded-xl p-1">
          {featuredAlbums.slice(0, 4).flatMap(album => album.tracks).slice(0, 5).map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} />
          ))}
        </div>
      </motion.section>
    </div>
  );
};

const TrackRow = ({ track, index }) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => playTrack(track)}
      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 ${
        isCurrentTrack ? 'bg-primary/10' : ''
      }`}
    >
      <span className="w-6 text-center text-sm text-muted-foreground">
        {isCurrentTrack && isPlaying ? (
          <div className="flex gap-0.5 justify-center">
            <span className="w-0.5 h-3 bg-primary animate-pulse" />
            <span className="w-0.5 h-4 bg-primary animate-pulse" style={{ animationDelay: '0.1s' }} />
            <span className="w-0.5 h-2 bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
        ) : (
          index + 1
        )}
      </span>
      <img
        src={track.thumbnail}
        alt={track.title}
        className="w-10 h-10 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
          {track.title}
        </h4>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="text-xs">{track.duration}</span>
      </div>
    </motion.div>
  );
};

export default HomePage;