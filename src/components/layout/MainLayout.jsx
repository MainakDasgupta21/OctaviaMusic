import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import FooterPlayer from './FooterPlayer';
import { usePlayer } from '@/contexts/PlayerContext';

const MainLayout = () => {
  const { currentTrack } = usePlayer();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main 
        className={`ml-20 overflow-y-auto custom-scrollbar ${currentTrack ? 'pb-28' : 'pb-6'}`}
        style={{ minHeight: '100vh' }}
      >
        <Outlet />
      </main>
      <FooterPlayer />
    </div>
  );
};

export default MainLayout;