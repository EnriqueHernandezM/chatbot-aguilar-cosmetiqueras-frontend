import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImagePreview({ src, alt, className }: ImagePreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onClick={() => setExpanded(true)}
        className={cn('rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity', className)}
      />
      {expanded && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4 animate-fade-in" onClick={() => setExpanded(false)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-background/20 text-primary-foreground" onClick={() => setExpanded(false)}>
            <X className="w-6 h-6" />
          </button>
          <img src={src} alt={alt} referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
