'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { getQueue, isSimulatedOffline, processQueue, setSimulatedOffline } from '../lib/offlineQueue';

export function OfflineControls() {
  const [offline, setOffline] = useState(isSimulatedOffline());
  const [queueLen, setQueueLen] = useState(getQueue().length);

  useEffect(() => {
    const id = setInterval(() => {
      setOffline(isSimulatedOffline());
      setQueueLen(getQueue().length);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const triggerOffline = () => {
    setSimulatedOffline(10);
    setOffline(true);
  };

  const trySync = () => {
    processQueue();
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button variant="secondary" onClick={triggerOffline}>Simulate 10s Offline</Button>
      <Button variant="secondary" onClick={trySync}>Sync Now</Button>
      <span className={`px-2 py-1 rounded ${offline ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
        {offline ? 'Offline (simulated)' : 'Online'}
      </span>
      <span className="text-gray-600">Queued: {queueLen}</span>
    </div>
  );
}


