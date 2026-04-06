import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { useState, useEffect } from 'react';

export function Layout() {
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Listen for watchlist changes from localStorage or state management
  useEffect(() => {
    const updateWatchlistCount = () => {
      const watchlist = localStorage.getItem('watchlist');
      if (watchlist) {
        setWatchlistCount(JSON.parse(watchlist).length);
      }
    };

    updateWatchlistCount();
    window.addEventListener('watchlist-updated', updateWatchlistCount);

    return () => {
      window.removeEventListener('watchlist-updated', updateWatchlistCount);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <Sidebar watchlistCount={watchlistCount} />
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
}
