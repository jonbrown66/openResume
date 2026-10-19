import { memo, useRef, useState, useCallback, useId } from 'react';
import { Upload, Trash2 } from 'lucide-react';

interface AvatarUploadProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  lang: 'zh' | 'en';
}

export const AvatarUpload = memo(function AvatarUpload({ value, onChange, lang }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
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

  const handleRemove = useCallback(() => {
    onChange(undefined);
    uploadButtonRef.current?.focus();
  }, [onChange]);

  return (
    <div className="block">
      <span className="block text-xs font-medium text-[var(--ui-text-secondary)] mb-2">
        {lang === 'zh' ? '证件照' : 'ID photo'}
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          ref={uploadButtonRef}
          type="button"
          aria-label={lang === 'zh' ? '上传头像' : 'Upload avatar'}
          aria-describedby={hintId}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          data-has-photo={Boolean(value) || undefined}
          className="ui-photo-upload"
        >
          {value ? (
            <img
              src={value}
              alt={lang === 'zh' ? '证件照预览' : 'ID photo preview'}
              className="block h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--ui-text-secondary)]">
              <Upload size={20} aria-hidden="true" />
              <span className="text-xs">{lang === 'zh' ? '点击上传' : 'Upload'}</span>
            </span>
          )}
        </button>

        <div className="min-w-0 space-y-2">
          <p id={hintId} className="text-xs leading-relaxed text-[var(--ui-text-secondary)]">
            {lang === 'zh' ? '一寸证件照比例 25:35' : 'ID photo ratio 25:35'}
            <br />
            {lang === 'zh' ? '支持 JPG、PNG，最大 5MB' : 'JPG, PNG, max 5MB'}
          </p>
          {value && (
            <>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                {lang === 'zh' ? '点击照片可更换' : 'Click the photo to replace it'}
              </p>
              <button
                type="button"
                onClick={handleRemove}
                className="ui-destructive-control inline-flex items-center justify-center gap-1.5 px-3"
              >
                <Trash2 size={14} aria-hidden="true" />
                {lang === 'zh' ? '删除照片' : 'Remove photo'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
