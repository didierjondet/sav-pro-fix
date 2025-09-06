import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCarouselItems, getEffectiveMediaUrl } from '@/hooks/useCarouselItems';
import { Play } from 'lucide-react';
import Autoplay from "embla-carousel-autoplay";

export function LandingCarousel() {
  const { items, loading } = useCarouselItems();
  
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

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
                    <div className="grid md:grid-cols-2 gap-0 min-h-[450px]">
                      {/* Media Section */}
                      <div className="relative overflow-hidden group">
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
                      
                      {/* Enhanced Content Section */}
                      <div className="flex flex-col justify-center p-8 lg:p-12 bg-gradient-to-br from-background to-muted/20 relative">
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
    </section>
  );
}