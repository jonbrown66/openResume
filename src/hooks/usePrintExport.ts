import { useState } from 'react';

export function usePrintExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPdf = async () => {
    setIsExporting(true);

    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToPdf,
    isExporting,
  };
}
