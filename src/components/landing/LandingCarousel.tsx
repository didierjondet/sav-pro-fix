import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCarouselItems } from '@/hooks/useCarouselItems';
import { Play } from 'lucide-react';

export function LandingCarousel() {
  const { items, loading } = useCarouselItems();

  if (loading) {
    return (
      <div className="w-full py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Carousel className="w-full">
          <CarouselContent>
            {items.map((item) => (
              <CarouselItem key={item.id}>
                <Card className="overflow-hidden border-0 shadow-lg">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0 min-h-[400px]">
                      {/* Media Section */}
                      <div className="relative overflow-hidden">
                        {item.media_type === 'video' ? (
                          <div className="relative h-full min-h-[300px] bg-black flex items-center justify-center">
                            <video 
                              src={item.media_url} 
                              className="w-full h-full object-cover"
                              controls
                              poster=""
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative h-full min-h-[300px]">
                            <img 
                              src={item.media_url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        <Badge 
                          variant="secondary" 
                          className="absolute top-4 right-4 bg-white/90 text-gray-700"
                        >
                          {item.media_type === 'video' ? 'Vidéo' : 'Image'}
                        </Badge>
                      </div>
                      
                      {/* Content Section */}
                      <div className="flex flex-col justify-center p-8 bg-white">
                        <div className="space-y-4">
                          <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                            {item.title}
                          </h3>
                          
                          {item.description && (
                            <p className="text-lg text-gray-600 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {items.length > 1 && (
            <>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
}