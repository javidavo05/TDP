"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Video } from "lucide-react";

interface AdvertisingItem {
  id: string;
  type: "image" | "video";
  url: string;
  duration?: number; // seconds, only for images
}

interface AdvertisingDisplayProps {
  items?: AdvertisingItem[];
  defaultInterval?: number; // seconds for images
  className?: string;
  defaultImageUrl?: string; // URL for default image when no items
}

export function AdvertisingDisplay({
  items = [],
  defaultInterval = 10,
  className = "",
  defaultImageUrl,
}: AdvertisingDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);

  // Filter items by type
  const images = items.filter((item) => item.type === "image");
  const videos = items.filter((item) => item.type === "video");
  const allItems = [...videos, ...images]; // Videos first, then images

  useEffect(() => {
    if (allItems.length <= 1) return;

    const currentItem = allItems[currentIndex];
    
    // If current item is a video, wait for it to end
    if (currentItem?.type === "video") {
      setVideoEnded(false);
      return; // Video will handle its own next transition
    }

    // For images, use interval or custom duration
    const duration = currentItem?.duration || defaultInterval;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allItems.length);
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [currentIndex, allItems.length, defaultInterval]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    // Move to next item after video ends
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % allItems.length);
    }, 500);
  };

  // Default image or placeholder if no items
  if (allItems.length === 0) {
    if (defaultImageUrl) {
      return (
        <div className={`relative overflow-hidden rounded-xl h-full ${className}`}>
          <img
            src={defaultImageUrl}
            alt="Publicidad por defecto"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl h-full ${className}`}>
        <div className="text-center p-8">
          <ImageIcon className="w-24 h-24 mx-auto mb-4 text-primary/30" />
          <p className="text-lg font-semibold text-muted-foreground">Publicidad</p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure imágenes y videos de publicidad desde el panel de administración
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl h-full ${className}`}>
      <div className="relative w-full h-full">
        {allItems.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                autoPlay
                muted
                loop={false}
                playsInline
                onEnded={handleVideoEnd}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.url}
                alt={`Publicidad ${index + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Indicators */}
      {allItems.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {allItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary w-8"
                  : "bg-primary/30 hover:bg-primary/50"
              }`}
              aria-label={`Ir a ${allItems[index].type === "video" ? "video" : "imagen"} ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
