const { z } = require('zod');

const idString = z.string().trim().min(1).max(160);

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
  .strict();

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
    theme: z.enum(['dark', 'oled', 'light', 'hicontrast']).optional(),
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
