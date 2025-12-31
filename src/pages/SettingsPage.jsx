import { motion } from 'framer-motion';
import { Settings, Moon, Sun, Volume2, Bell, User, Shield, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const SettingsPage = () => {
  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/20">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        </div>
        <p className="text-muted-foreground">Customize your music experience</p>
      </motion.div>

      <div className="space-y-6">
        {/* Playback Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Playback
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">High Quality Audio</p>
                <p className="text-sm text-muted-foreground">Stream music at the highest quality</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Crossfade</p>
                <p className="text-sm text-muted-foreground">Smooth transition between songs</p>
              </div>
              <div className="w-32">
                <Slider defaultValue={[5]} max={12} step={1} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autoplay</p>
                <p className="text-sm text-muted-foreground">Play similar songs when queue ends</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Releases</p>
                <p className="text-sm text-muted-foreground">Get notified about new music from artists you follow</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Playlist Updates</p>
                <p className="text-sm text-muted-foreground">Notifications when playlists are updated</p>
              </div>
              <Switch />
            </div>
          </div>
        </motion.section>

        {/* Account */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Display Name</p>
                <p className="text-sm text-muted-foreground">Music Lover</p>
              </div>
              <button className="text-sm text-primary hover:underline">Edit</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">user@example.com</p>
              </div>
              <button className="text-sm text-primary hover:underline">Change</button>
            </div>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Music Player v1.0.0</p>
            <p>Built with React, Tailwind CSS, and react-player</p>
            <p className="text-xs mt-4">
              This is a demo music player. Connect to your backend at localhost:5000 for full functionality.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default SettingsPage;