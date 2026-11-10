import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-md">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span>Mode Offline — Data tersimpan di perangkat lokal.</span>
    </div>
  );
};
