import { memo, useRef, useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface AvatarUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  lang: 'zh' | 'en';
}

export const AvatarUpload = memo(function AvatarUpload({ value, onChange, lang }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'zh' ? '图片大小不能超过 5MB' : 'Image size cannot exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawBase64 = e.target?.result as string;

      const img = new Image();
      img.onload = () => {
        const maxDimension = 300;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          onChange(compressedBase64);
        } else {
          onChange(rawBase64);
        }
      };
      img.onerror = () => {
        onChange(rawBase64);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  }, [lang, onChange]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="block">
      <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">
        {lang === 'zh' ? '头像' : 'Avatar'}
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-24 h-24 rounded-full cursor-pointer
          border-2 border-dashed transition-all
          ${isDragging
            ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
            : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
          }
          ${value ? 'border-solid' : ''}
        `}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              title={lang === 'zh' ? '删除' : 'Remove'}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="w-full h-full rounded-full bg-[var(--app-surface-muted)] flex flex-col items-center justify-center gap-1">
            <Upload size={20} className="text-[var(--muted-foreground)]" />
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {lang === 'zh' ? '点击上传' : 'Upload'}
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        {lang === 'zh' ? '支持 JPG、PNG，最大 5MB' : 'JPG, PNG, max 5MB'}
      </p>
    </div>
  );
});
