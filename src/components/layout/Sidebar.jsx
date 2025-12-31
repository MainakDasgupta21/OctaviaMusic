import { Home, Search, Library, Play, Heart, Settings, TrendingUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { icon: Home, label: 'Feed', path: '/' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Play, label: 'Player', path: '/player' },
  { icon: Heart, label: 'Favorites', path: '/favorites' },
  { icon: Library, label: 'Library', path: '/library' },
];

const Sidebar = () => {
  return (
    <motion.aside 
      initial={{ x: -80 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-6 z-50"
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo/Avatar */}
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-8 cursor-pointer shadow-lg shadow-primary/30"
      >
        <Play className="w-6 h-6 text-primary-foreground fill-current" />
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : 'text-muted-foreground'}`
            }
          >
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col items-center gap-1"
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/20' : ''}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `sidebar-item ${isActive ? 'sidebar-item-active' : 'text-muted-foreground'}`
        }
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] font-medium">Settings</span>
      </NavLink>
    </motion.aside>
  );
};

export default Sidebar;