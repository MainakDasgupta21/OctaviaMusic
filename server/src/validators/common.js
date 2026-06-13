const { z } = require('zod');

const idString = z.string().trim().min(1).max(160);

// Clients enrich tracks with display-only fields (e.g. `addedAt`, `playable`)
// before sending them. Strip unknown keys rather than rejecting the request so
// those extras are ignored; the service layer reads only the fields below.
const trackSchema = z
  .object({
    id: idString,
    videoId: z.string().trim().min(1).max(120).optional().nullable(),
    title: z.string().trim().min(1).max(240),
    artist: z.string().trim().max(240).optional().default(''),
    artistId: z.string().trim().max(160).optional().nullable(),
    artistSlug: z.string().trim().max(200).optional().nullable(),
    albumId: z.string().trim().max(160).optional().nullable(),
    thumbnail: z.string().trim().max(500).optional().nullable(),
    duration: z.string().trim().max(40).optional().nullable(),
  })
  .strip();

const playlistInputSchema = z
  .object({
    id: idString.optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional().default(''),
    pinned: z.boolean().optional().default(false),
    tracks: z.array(trackSchema).optional().default([]),
  })
  .strict();

const settingsSchema = z
  .object({
    highQualityAudio: z.boolean().optional(),
    crossfadeSeconds: z.number().int().min(0).max(12).optional(),
    autoplay: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    notifyNewReleases: z.boolean().optional(),
    notifyPlaylistUpdates: z.boolean().optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().optional(),
    sidebarExpanded: z.boolean().optional(),
    theme: z
      .enum(['dark', 'oled', 'light', 'hicontrast', 'midnight', 'sepia', 'forest', 'slate'])
      .optional(),
    accentColor: z
      .enum([
        'dynamic',
        'ember',
        'rose',
        'amber',
        'lime',
        'emerald',
        'teal',
        'azure',
        'indigo',
        'violet',
        'magenta',
      ])
      .optional(),
    textSize: z.enum(['sm', 'md', 'lg']).optional(),
    vimNavigation: z.boolean().optional(),
    soundEffects: z.boolean().optional(),
  })
  .strict();

module.exports = {
  z,
  idString,
  trackSchema,
  playlistInputSchema,
  settingsSchema,
};
