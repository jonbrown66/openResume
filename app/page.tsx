"use client";

import { useEffect, useState } from 'react';

import App from '@/App';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-full bg-[#e8e6e1] dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 animate-spin"></div>
      </div>
    );
  }

  return <App />;
}
