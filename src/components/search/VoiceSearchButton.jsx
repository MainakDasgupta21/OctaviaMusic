import { Mic, Square } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/use-voice-search';
import { cn } from '@/lib/utils';

// Drop-in mic button. Renders nothing when the browser lacks Web Speech.
export const VoiceSearchButton = ({ onTranscript, className, size = 'md' }) => {
  const { start, stop, isListening, isSupported, error } = useVoiceSearch({
    onTranscript,
  });

  if (!isSupported) return null;

  const Icon = isListening ? Square : Mic;
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={isListening ? stop : start}
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
      title={
        error
          ? `Voice search error: ${error}`
          : isListening
            ? 'Listening… click to stop'
            : 'Search by voice'
      }
      className={cn(
        'relative inline-flex items-center justify-center rounded-sharp transition-colors focus-ring',
        size === 'sm' ? 'p-1.5' : 'p-2',
        isListening
          ? 'bg-track/20 text-accent border border-track/50'
          : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:bg-white/[0.04] hover:border-white/[0.22]',
        className,
      )}
    >
      <Icon className={dim} strokeWidth={1.75} />
      {isListening ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-sharp ring-2 ring-track/40 animate-pulse"
        />
      ) : null}
    </button>
  );
};

export default VoiceSearchButton;
