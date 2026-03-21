import { memo, useEffect, useState, type PropsWithChildren, type RefObject } from 'react';

interface ResumeCanvasProps extends PropsWithChildren {
  canvasRef?: RefObject<HTMLDivElement | null>;
  scale: number;
}

export const ResumeCanvas = memo(function ResumeCanvas({ canvasRef, children, scale }: ResumeCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="resume-paper bg-[#ffffff] text-[#111827] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] shrink-0 rounded-sm hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] origin-top"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: 'auto',
        transform: `scale(${scale})`,
        marginBottom: `calc(297mm * ${scale - 1})`,
        transition: mounted ? 'transform 200ms ease-out, box-shadow 300ms' : 'none',
      }}
    >
      {children}
    </div>
  );
});
