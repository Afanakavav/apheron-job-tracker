import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { Box, Skeleton } from '@mui/material';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
}

/**
 * Lazy loading image component with placeholder and error handling
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback = '/icon-192.png',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      if (fallback) {
        setImageSrc(fallback);
      }
    };
    
    img.src = src;
  }, [src, fallback]);

  if (isLoading) {
    return (
      <Skeleton
        variant="rectangular"
        width={props.width || '100%'}
        height={props.height || 200}
        sx={{ borderRadius: 1 }}
      />
    );
  }

  if (hasError && !fallback) {
    return (
      <Box
        sx={{
          width: props.width || '100%',
          height: props.height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.200',
          borderRadius: 1,
        }}
      >
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {alt || 'Image'}
        </Box>
      </Box>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      {...props}
      style={{
        ...props.style,
        objectFit: props.style?.objectFit || 'cover',
      }}
    />
  );
};

export default LazyImage;

