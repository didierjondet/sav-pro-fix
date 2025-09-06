import React, { useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCarouselItems, getEffectiveMediaUrl } from '@/hooks/useCarouselItems';
import { Play, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay";

export function LandingCarousel() {
  const { items, loading } = useCarouselItems();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [autoSlide, setAutoSlide] = useState(true);
  
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  // Auto slide in popup
  React.useEffect(() => {
    if (selectedImage !== null && autoSlide && items.length > 1) {
      const interval = setInterval(() => {
        setSelectedImage((prev) => prev !== null ? (prev + 1) % items.length : null);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedImage, autoSlide, items.length]);

  const openImagePopup = (index: number) => {
    setSelectedImage(index);
    setAutoSlide(true);
  };

  const closeImagePopup = () => {
    setSelectedImage(null);
    setAutoSlide(false);
  };

  const nextImage = () => {
    setSelectedImage((prev) => prev !== null ? (prev + 1) % items.length : null);
  };

  const prevImage = () => {
    setSelectedImage((prev) => prev !== null ? (prev - 1 + items.length) % items.length : null);
  };

  if (loading) {
    return (
      <div className="w-full py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse bg-muted/20 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Carousel 
          className="w-full"
          plugins={[plugin.current]}
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {items.map((item) => (
              <CarouselItem key={item.id}>
                <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-card to-card/95">
                  <CardContent className="p-0">
                     <div className="grid md:grid-cols-3 gap-0 min-h-[450px]">
                       {/* Media Section - Takes 2/3 of the width */}
                       <div className="md:col-span-2 relative overflow-hidden group cursor-pointer" onClick={() => openImagePopup(items.findIndex(i => i.id === item.id))}>
                        {item.media_type === 'video' ? (
                          <div className="relative h-full min-h-[300px] bg-black flex items-center justify-center">
                            <video 
                              src={getEffectiveMediaUrl(item)}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              controls
                              poster=""
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gradient-to-t from-black/30 to-transparent">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 animate-pulse">
                                <Play className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative h-full min-h-[300px] overflow-hidden">
                            <img 
                              src={getEffectiveMediaUrl(item)}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                console.error('Error loading image:', getEffectiveMediaUrl(item));
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                        )}
                        
                        {/* Enhanced Media Type Badge */}
                        <Badge 
                          variant="secondary" 
                          className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-foreground shadow-lg border-0 font-medium"
                        >
                          {item.media_type === 'video' ? '🎥 Vidéo' : '🖼️ Image'}
                        </Badge>
                        
                        {/* Decorative overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                       
                       {/* Enhanced Content Section - Takes 1/3 of the width */}
                       <div className="md:col-span-1 flex flex-col justify-center p-6 lg:p-8 bg-gradient-to-br from-background to-muted/20 relative">
                        <div className="space-y-6 relative z-10">
                          <div className="space-y-3">
                            <h3 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight">
                              {item.title}
                            </h3>
                            <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
                          </div>
                          
                          {item.description && (
                            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed font-light">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-xl" />
                        <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {items.length > 1 && (
            <>
              <CarouselPrevious className="left-4 bg-white/90 hover:bg-white border-2 hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-xl" />
              <CarouselNext className="right-4 bg-white/90 hover:bg-white border-2 hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-xl" />
            </>
          )}
          
          {/* Indicator dots */}
          {items.length > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              {items.map((_, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full bg-primary/30 transition-all duration-300 hover:bg-primary/60"
                />
              ))}
            </div>
          )}
        </Carousel>
      </div>

      {/* Image Popup */}
      <Dialog open={selectedImage !== null} onOpenChange={closeImagePopup}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0 bg-black/95 border-0">
          {selectedImage !== null && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={closeImagePopup}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Auto-slide toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 z-50 text-white hover:bg-white/20"
                onClick={() => setAutoSlide(!autoSlide)}
              >
                {autoSlide ? "⏸️ Pause" : "▶️ Play"}
              </Button>

              {/* Navigation Buttons */}
              {items.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 bg-black/30"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 bg-black/30"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Image Display */}
              <div className="w-full h-full flex items-center justify-center p-8">
                {items[selectedImage]?.media_type === 'video' ? (
                  <video 
                    src={getEffectiveMediaUrl(items[selectedImage])}
                    className="max-w-full max-h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  <img 
                    src={getEffectiveMediaUrl(items[selectedImage])}
                    alt={items[selectedImage]?.title}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>

              {/* Image Info */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
                <h3 className="text-xl font-bold mb-2">{items[selectedImage]?.title}</h3>
                {items[selectedImage]?.description && (
                  <p className="text-sm opacity-90">{items[selectedImage]?.description}</p>
                )}
                <div className="mt-2 flex justify-center space-x-2">
                  {items.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        index === selectedImage ? 'bg-white' : 'bg-white/30'
                      }`}
                      onClick={() => setSelectedImage(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}