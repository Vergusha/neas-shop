import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react';

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
            const scale = Math.max(containerSize / img.width, containerSize / img.height);
            setScale(scale);
            
            // Calculate center position
            const x = (containerSize - img.width * scale) / 2;
            const y = (containerSize - img.height * scale) / 2;
            setPosition({ x, y });
            
            setImage(event.target.result as string);
          };
          img.src = event.target.result as string;
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = () => {
    if (!containerRef.current || !imageRef.current || !image) return;

    const canvas = document.createElement('canvas');
    const containerSize = containerRef.current.clientWidth;
    canvas.width = containerSize;
    canvas.height = containerSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(containerSize / 2, containerSize / 2, containerSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Calculate centered drawing position
    const img = imageRef.current;
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;
    const drawX = (containerSize - scaledWidth) / 2 + position.x;
    const drawY = (containerSize - scaledHeight) / 2 + position.y;

    // Draw the image with transformations
    ctx.drawImage(
      img,
      drawX,
      drawY,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();
    
    // Get the data URL and compress the image
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onSave(imageData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit Avatar</h3>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X />
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4 w-full"
          />
        </div>
        
        <div 
          ref={containerRef}
          className="relative w-64 h-64 mx-auto mb-4 overflow-hidden rounded-full border-2 border-primary"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {image && (
            <img
              ref={imageRef}
              src={image}
              alt="Avatar Preview"
              className="absolute"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
            <Move className="h-8 w-8" />
          </div>
        </div>
        
        <div className="flex justify-center items-center gap-4 mb-6">
          <button 
            onClick={handleZoomOut}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <ZoomOut size={20} />
          </button>
          
          <div className="w-32 bg-gray-200 h-2 rounded-full">
            <div 
              className="bg-primary h-full rounded-full"
              style={{ width: `${((scale - 0.5) / 2.5) * 100}%` }}
            ></div>
          </div>
          
          <button 
            onClick={handleZoomIn}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <ZoomIn size={20} />
          </button>
        </div>
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onCancel}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;
