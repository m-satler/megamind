import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { getWatchlist, getToken } from '../lib/api';

export function Layout() {
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Pull the count from the server (scoped by JWT) rather than a shared
  // browser-wide localStorage key. Refreshes whenever any page dispatches
  // `watchlist-updated` after adding/removing a ticker.
  useEffect(() => {
    const refresh = async () => {
      if (!getToken()) {
        setWatchlistCount(0);
        return;
      }
      try {
        const { watchlist } = await getWatchlist();
        setWatchlistCount(watchlist.length);
      } catch {
        setWatchlistCount(0);
      }
    };

    refresh();
    window.addEventListener('watchlist-updated', refresh);
    return () => {
      window.removeEventListener('watchlist-updated', refresh);
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
