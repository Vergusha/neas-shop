import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageCarouselProps {
  images: string[];
  productName: string;
  onClick?: () => void;
}

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({ 
  images, 
  productName,
  onClick 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset to first image when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  // Filter out empty image URLs
  const validImages = images.filter(img => img && img.trim() !== '');

  // If no valid images, show placeholder
  if (validImages.length === 0) {
    return (
      <div 
        className="h-48 w-full flex items-center justify-center bg-gray-100 rounded-xl"
        onClick={onClick}
      >
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  // If only one image, show it without carousel controls
  if (validImages.length === 1) {
    return (
      <img 
        src={validImages[0]} 
        alt={productName} 
        className="rounded-xl h-48 w-full object-contain"
        onClick={onClick}
      />
    );
  }

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div 
      className="relative h-48 w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {/* Main image */}
      <div className="carousel w-full h-full">
        {validImages.map((image, idx) => (
          <div 
            key={idx} 
            className={`carousel-item w-full h-full ${idx === currentIndex ? 'block' : 'hidden'}`}
          >
            <img 
              src={image} 
              alt={`${productName} - Image ${idx + 1}`} 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <button 
        onClick={prevImage}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full shadow-md"
      >
        <ChevronLeft size={16} />
      </button>
      <button 
        onClick={nextImage}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-1 rounded-full shadow-md"
      >
        <ChevronRight size={16} />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
        {validImages.map((_, idx) => (
          <button
            key={idx}
            className={`w-2 h-2 rounded-full ${
              idx === currentIndex ? 'bg-primary' : 'bg-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductImageCarousel;
