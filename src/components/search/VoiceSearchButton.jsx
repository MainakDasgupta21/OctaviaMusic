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
  const dim = size === 'sm' ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]';
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

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
        'relative inline-flex items-center justify-center rounded-full transition-colors focus-ring',
        box,
        isListening
          ? 'bg-track/15 text-accent'
          : 'text-ink-3 hover:text-ink hover:bg-white/[0.06]',
        className,
      )}
    >
      <Icon className={dim} strokeWidth={1.75} />
      {isListening ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-track/45 animate-pulse"
        />
      ) : null}
    </button>
  );
};

export default VoiceSearchButton;
