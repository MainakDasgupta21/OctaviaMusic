import { Link2, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui-v2/Button';
import notify from '@/lib/notify';
import { shareJourneyArtifact } from '@/lib/explore-social';

const ExploreShareModal = ({
  open = false,
  onOpenChange,
  payload = null,
}) => {
  if (!payload) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(payload.url || '');
      notify.copied('Explore link');
    } catch {
      notify.error('Could not copy link.');
    }
  };

  const handleNativeShare = async () => {
    const result = await shareJourneyArtifact(payload);
    if (result === 'shared') {
      notify.success('Shared');
      return;
    }
    if (result === 'copied') {
      notify.copied('Explore link');
      return;
    }
    if (result !== 'cancelled') {
      notify.error('Sharing is unavailable right now.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-surface-1 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-ink">Share this discovery</DialogTitle>
          <DialogDescription>
            Invite a friend into your current Explore vibe.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-sharp border border-white/[0.1] bg-surface-2/55 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.17em] text-ink-4 mb-2">
            Preview
          </p>
          <h3 className="font-display text-2xl text-ink leading-tight">{payload.title}</h3>
          <p className="font-editorial text-[13px] text-ink-3 mt-2">{payload.text}</p>
          <p className="mt-3 text-[12px] text-ink-4 break-all">{payload.url}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Copy link
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleNativeShare}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share to...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExploreShareModal;
