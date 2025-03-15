import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Upload } from 'lucide-react';

interface AvatarEditorProps {
  initialImage: string;
  onSave: (imageData: string) => void;
  onCancel: () => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ initialImage, onSave, onCancel }) => {
  const [image, setImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Initialize with the provided image
    setImage(initialImage);
  }, [initialImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const img = new Image();
          img.onload = () => {
            // Center image initially
            const containerSize = containerRef.current?.clientWidth || 256;
            // Find the best fit scale that fills the container
            const scaleX = containerSize / img.width;
            const scaleY = containerSize / img.height;
            const newScale = Math.max(scaleX, scaleY);
            setScale(newScale);
            
            // Calculate center position
            const x = (containerSize - img.width * newScale) / 2;
            const y = (containerSize - img.height * newScale) / 2;
            setPosition({ x, y });
            
            setImage(event.target.result as string);
          };
          img.src = event.target.result as string;
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle mouse and touch events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    e.preventDefault(); // Prevent default behavior
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent default behavior
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageRef.current || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent default behavior
    
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent default behavior
    
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  // Completely rewritten save function for accurate cropping
  const handleSave = () => {
    if (!containerRef.current || !imageRef.current || !image) return;

    // Get the size and position of the container
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = containerRect.width;
    
    // Create a temporary canvas for the first step - exact same size as the container
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = containerSize;
    tempCanvas.height = containerSize;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // First, draw exactly what's visible in the editor
    tempCtx.clearRect(0, 0, containerSize, containerSize);
    
    // Draw the image with the same transformations as in the preview
    const img = imageRef.current;
    tempCtx.save();
    tempCtx.drawImage(
      img,
      position.x,
      position.y,
      img.naturalWidth * scale,
      img.naturalHeight * scale
    );
    tempCtx.restore();
    
    // Now create a second canvas for the circular crop, with 2x resolution for quality
    const finalCanvas = document.createElement('canvas');
    const finalSize = containerSize * 2;
    finalCanvas.width = finalSize;
    finalCanvas.height = finalSize;
    const finalCtx = finalCanvas.getContext('2d');
    
    if (!finalCtx) return;
    
    // Set up the circular clipping path
    finalCtx.beginPath();
    finalCtx.arc(finalSize / 2, finalSize / 2, finalSize / 2, 0, Math.PI * 2);
    finalCtx.closePath();
    finalCtx.clip();
    
    // Draw white background to handle transparent images
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalSize, finalSize);
    
    // Scale up the temp canvas to the final size
    finalCtx.drawImage(tempCanvas, 0, 0, finalSize, finalSize);
    
    // Get the final image data
    const imageData = finalCanvas.toDataURL('image/png', 1.0);
    
    // Log the process for debugging
    console.log('Avatar capture completed:', {
      containerSize,
      finalSize,
      imagePosition: position,
      scale
    });
    
    onSave(imageData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Изменить аватар</h3>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="avatar-upload" 
            className="btn btn-outline btn-primary w-full flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Выбрать изображение
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        
        {/* Preview container */}
        <div 
          ref={containerRef}
          className="relative w-64 h-64 mx-auto mb-6 overflow-hidden rounded-full bg-gray-100 border-4 border-primary shadow-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {image ? (
            <>
              <img
                ref={imageRef}
                src={image}
                alt="Avatar Preview"
                className="absolute select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none'
                }}
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
              />
              
              {/* Circle outline indicating crop area */}
              <div className="absolute inset-0 pointer-events-none border-2 border-white border-dashed rounded-full"></div>
              
              {/* What you see is what you get indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-70 text-black text-xs px-3 py-1 rounded-full font-medium">
                Это будет ваш аватар
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Upload size={40} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Выберите изображение</p>
            </div>
          )}
        </div>
        
        {/* Improved zoom controls */}
        {image && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Увеличение: {(scale * 100).toFixed(0)}%</span>
              <div className="flex space-x-1">
                <button 
                  onClick={handleZoomOut}
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                  disabled={scale <= 0.5}
                >
                  <ZoomOut size={18} className={scale <= 0.5 ? "text-gray-300" : "text-gray-700"} />
                </button>
                <button 
                  onClick={handleZoomIn}
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                  disabled={scale >= 3}
                >
                  <ZoomIn size={18} className={scale >= 3 ? "text-gray-300" : "text-gray-700"} />
                </button>
              </div>
            </div>
            
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="range range-sm range-primary w-full"
            />
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="btn btn-outline"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!image}
          >
            Сохранить
          </button>
        </div>
        
        {/* Helpful instructions */}
        {image && (
          <div className="mt-4 p-2 bg-blue-50 text-blue-700 rounded text-xs">
            <p>• Перемещайте изображение мышью или пальцем</p>
            <p>• Используйте ползунок для изменения размера</p>
            <p>• Круглая область показывает итоговый результат</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarEditor;
