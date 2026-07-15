import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Kedai } from '@/types/kedai';

interface MobileKedaiCarouselProps {
  kedai: Kedai[];
  onSelect: (kedai: Kedai) => void;
}

export function MobileKedaiCarousel({ kedai, onSelect }: MobileKedaiCarouselProps) {
  const [viewportRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const updateSelection = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setSnapCount(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateSelection();
    emblaApi.on('select', updateSelection);
    emblaApi.on('reInit', updateSelection);
    return () => {
      emblaApi.off('select', updateSelection);
      emblaApi.off('reInit', updateSelection);
    };
  }, [emblaApi, updateSelection]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, kedai]);

  if (kedai.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No restaurants match these filters.</p>;
  }

  return (
    <div className="pb-3">
      <div className="overflow-hidden" ref={viewportRef}>
        <div className="flex touch-pan-y gap-3 px-4">
          {kedai.map((item) => (
            <div key={item.id} className="min-w-0 flex-[0_0_86%] sm:flex-[0_0_64%]">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="h-full w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <div className="relative h-28 overflow-hidden bg-muted">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                      <MapPin className="h-9 w-9 text-primary/70" />
                    </div>
                  )}
                  {item.rating && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{item.area || 'Malaysia'}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className="line-clamp-1 text-muted-foreground">{item.signature || item.tags?.[0] || 'Restaurant'}</span>
                    <span className="flex-shrink-0 font-medium text-foreground">{item.price_level || '$$'}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous restaurant"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1.5" aria-label={`Restaurant ${selectedIndex + 1} of ${snapCount}`}>
          {Array.from({ length: snapCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`h-1.5 rounded-full transition-all ${index === selectedIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to restaurant ${index + 1}`}
            />
          ))}
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next restaurant"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
