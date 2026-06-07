import { useMemo } from 'react';
import { Image, Link2, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui-v2/Button';
import notify from '@/lib/notify';
import { buildChartsUrl, formatDateForShare, getRegionMeta, getWindowMeta } from '@/lib/chartsUtils';

const escapeXml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const buildShareSvg = ({ headline, detail, rankLine, dateLine }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="0 0 1200 628">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0d0d0d" />
      <stop offset="100%" stop-color="#171717" />
    </linearGradient>
  </defs>
  <rect width="1200" height="628" fill="url(#g)" />
  <circle cx="1030" cy="70" r="120" fill="#22c55e" fill-opacity="0.14" />
  <text x="70" y="116" fill="#22c55e" font-size="34" font-family="Arial, sans-serif" font-weight="600">OCTAVIA CHARTS</text>
  <text x="70" y="226" fill="#ffffff" font-size="80" font-family="Arial, sans-serif" font-weight="700">${escapeXml(headline)}</text>
  <text x="70" y="286" fill="#22c55e" font-size="38" font-family="Arial, sans-serif" font-weight="500">${escapeXml(detail)}</text>
  <text x="70" y="402" fill="#e5e7eb" font-size="42" font-family="Arial, sans-serif" font-weight="600">${escapeXml(rankLine)}</text>
  <text x="70" y="468" fill="#9ca3af" font-size="32" font-family="Arial, sans-serif">${escapeXml(dateLine)}</text>
</svg>
`;

const copySvgToClipboard = async (svgText) => {
  if (!navigator?.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard image API unavailable');
  }
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const item = new ClipboardItem({ 'image/svg+xml': blob });
  await navigator.clipboard.write([item]);
};

const ChartShareModal = ({ open, onOpenChange, entry, mode, filters }) => {
  const regionMeta = getRegionMeta(filters.region);
  const windowMeta = getWindowMeta(filters.window);
  const dateLabel = formatDateForShare(new Date());

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return buildChartsUrl(filters);
    const url = new URL(buildChartsUrl(filters), window.location.origin);
    url.searchParams.set('focus', entry?.id || '');
    return url.toString();
  }, [entry?.id, filters]);

  if (!entry) return null;

  const headline = mode === 'songs' ? entry.title : entry.name;
  const detail = mode === 'songs' ? entry.artist : `${entry.topSong} \u2022 ${entry.nationality}`;
  const rankLine = `#${entry.rank} ${regionMeta.label} \u00b7 ${windowMeta.label} \u00b7 Octavia Charts`;
  const dateLine = dateLabel;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      notify.copied('Chart link');
    } catch {
      notify.error('Could not copy the share link.');
    }
  };

  const handleCopyImage = async () => {
    try {
      const svg = buildShareSvg({ headline, detail, rankLine, dateLine });
      await copySvgToClipboard(svg);
      notify.copied('Share card image');
    } catch {
      notify.error('Image copy is not available in this browser. Try Copy link.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Octavia Charts',
          text: `${rankLine} \u00b7 ${headline}`,
          url: shareLink,
        });
        return;
      } catch {
        // User canceled or share failed. Fall back silently to clipboard.
      }
    }
    await handleCopyLink();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-1 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-ink">Share chart position</DialogTitle>
          <DialogDescription>
            Create a share card for this chart snapshot and copy the link.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-soft border border-white/10 bg-gradient-to-br from-[#0d0d0d] to-[#1b1b1b] p-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-400">Octavia Charts</p>
          <h3 className="mt-3 text-3xl font-display text-ink leading-tight">{headline}</h3>
          <p className="text-sm text-emerald-400 mt-1">{detail}</p>
          <p className="mt-8 text-lg font-medium text-ink-2">{rankLine}</p>
          <p className="text-sm text-ink-4 mt-1">{dateLine}</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="secondary" size="sm" leftIcon={<Image className="w-4 h-4" />} onClick={handleCopyImage}>
            Copy image
          </Button>
          <Button type="button" variant="secondary" size="sm" leftIcon={<Link2 className="w-4 h-4" />} onClick={handleCopyLink}>
            Copy link
          </Button>
          <Button type="button" size="sm" leftIcon={<Share2 className="w-4 h-4" />} onClick={handleShare}>
            Share to...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartShareModal;
