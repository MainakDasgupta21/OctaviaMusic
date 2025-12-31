import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Music, Video, Disc, User, Play, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { searchMusic } from '@/lib/api';
import { usePlayer } from '@/contexts/PlayerContext';
import { Skeleton } from '@/components/ui/skeleton';

const filterIcons = {
  song: Music,
  video: Video,
  album: Disc,
  artist: User,
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('song');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { playTrack } = usePlayer();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const searchResults = await searchMusic(query, filter);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, filter]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePlayTrack = (result) => {
    const track = {
      id: result.id,
      videoId: result.videoId,
      title: result.title,
      artist: result.artist,
      thumbnail: result.thumbnail,
      duration: result.duration,
    };
    playTrack(track);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">Search</h1>
        <p className="text-muted-foreground">Find your favorite music</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-8"
      >
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-12 h-14 bg-card/50 border-white/10 text-lg rounded-xl focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <Select value={filter} onValueChange={(value) => setFilter(value)}>
          <SelectTrigger className="w-40 h-14 bg-card/50 border-white/10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {Object.entries(filterIcons).map(([key, Icon]) => (
              <SelectItem key={key} value={key} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="capitalize">{key}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSearch}
          className="px-8 h-14 rounded-xl bg-gradient-to-r from-primary to-orange-400 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
        >
          Search
        </motion.button>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SearchResultSkeleton key={i} />
            ))}
          </motion.div>
        ) : hasSearched && results.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">Try searching for something else</p>
          </motion.div>
        ) : results.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl overflow-hidden"
          >
            {results.map((result, index) => (
              <SearchResultRow
                key={result.id}
                result={result}
                index={index}
                onPlay={() => handlePlayTrack(result)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Music className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start searching</h3>
            <p className="text-muted-foreground">Type something to find songs, videos, albums, or artists</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SearchResultRow = ({ result, index, onPlay }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currentTrack, isPlaying } = usePlayer();
  const isCurrentTrack = currentTrack?.videoId === result.videoId;
  const FilterIcon = filterIcons[result.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-white/5 border-b border-white/5 last:border-0 ${
        isCurrentTrack ? 'bg-primary/10' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={result.thumbnail}
          alt={result.title}
          className="w-full h-full object-cover"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
        >
          <Play className="w-6 h-6 text-white fill-current" />
        </motion.div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
          {result.title}
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FilterIcon className="w-3 h-3" />
          <span className="capitalize">{result.type}</span>
          <span>•</span>
          <span className="truncate">{result.artist}</span>
        </div>
      </div>

      {/* Duration */}
      {result.duration && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{result.duration}</span>
        </div>
      )}

      {/* Playing indicator */}
      {isCurrentTrack && isPlaying && (
        <div className="flex gap-0.5">
          <span className="w-0.5 h-4 bg-primary animate-pulse rounded-full" />
          <span className="w-0.5 h-5 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.1s' }} />
          <span className="w-0.5 h-3 bg-primary animate-pulse rounded-full" style={{ animationDelay: '0.2s' }} />
        </div>
      )}
    </motion.div>
  );
};

const SearchResultSkeleton = () => (
  <div className="flex items-center gap-4 p-4 glass rounded-xl">
    <Skeleton className="w-14 h-14 rounded-lg" />
    <div className="flex-1">
      <Skeleton className="h-4 w-2/3 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="w-12 h-4" />
  </div>
);

export default SearchPage;