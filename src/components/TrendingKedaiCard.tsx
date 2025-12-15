import { useState } from 'react';
import { Star, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useMap } from '@/contexts/MapContext';
import type { Kedai } from '@/types/kedai';

// Pre-curated trending kedai (saves SerpAPI credits)
const TRENDING_KEDAI: Kedai[] = [
  {
    id: 'trending-1',
    name: 'De Wan 1958 by Chef Wan',
    area: 'Bangi',
    lat: 2.9278,
    lon: 101.7797,
    price_level: '$$',
    tags: ['🍽️ Restaurant', '🥂 Fine Dining', 'Malaysian'],
    signature: 'Nasi Kerabu, Rendang Tok',
    reviews: [],
    rating: 4.8,
    totalReviews: 2463,
    thumbnail: '',
  },
  {
    id: 'trending-2',
    name: "Zetty's",
    area: 'Bangi',
    lat: 2.9254,
    lon: 101.7801,
    price_level: '$$',
    tags: ['🍞 Bakery', '☕️ Cafe', '🍰 Dessert'],
    signature: 'Bakery',
    reviews: [],
    rating: 4.9,
    totalReviews: 1041,
    thumbnail: '',
  },
  {
    id: 'trending-3',
    name: 'Red Card Cafe',
    area: 'Bangi',
    lat: 2.9245,
    lon: 101.7812,
    price_level: '$$',
    tags: ['☕️ Cafe', '🍽️ Restaurant', 'Western'],
    signature: 'Western Fusion',
    reviews: [],
    rating: 4.4,
    totalReviews: 1821,
    thumbnail: '',
  },
  {
    id: 'trending-4',
    name: 'Little Italy Pizza',
    area: 'KL Sentral',
    lat: 3.1335,
    lon: 101.6869,
    price_level: '$',
    tags: ['🍔 Fast Food', '🍽️ Restaurant', 'Italian'],
    signature: 'New York Style Pizza',
    reviews: [],
    rating: 4.2,
    totalReviews: 3634,
    thumbnail: '',
  },
  {
    id: 'trending-5',
    name: "Joe's Pizza Broadway",
    area: 'Times Square KL',
    lat: 3.1426,
    lon: 101.7099,
    price_level: '$',
    tags: ['🍔 Fast Food', '🍽️ Restaurant', 'American'],
    signature: 'Classic NYC Slices',
    reviews: [],
    rating: 4.5,
    totalReviews: 17266,
    thumbnail: '',
  },
];

interface TrendingKedaiCardProps {
  onKedaiClick?: (kedai: Kedai) => void;
}

export function TrendingKedaiCard({ onKedaiClick }: TrendingKedaiCardProps) {
  const { setSelectedKedai, setAllKedai, setFilteredKedai } = useMap();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleViewAll = () => {
    // Set all trending kedai on map
    setAllKedai(TRENDING_KEDAI);
    setFilteredKedai(TRENDING_KEDAI);
    
    // Trigger the chat to show these as recommendations
    if (onKedaiClick) {
      onKedaiClick(TRENDING_KEDAI[0]);
    }
  };

  const handleKedaiClick = (kedai: Kedai) => {
    setSelectedKedai(kedai);
    setAllKedai(TRENDING_KEDAI);
    setFilteredKedai(TRENDING_KEDAI);
    
    if (onKedaiClick) {
      onKedaiClick(kedai);
    }
  };

  const nextKedai = () => {
    setCurrentIndex((prev) => (prev + 1) % TRENDING_KEDAI.length);
  };

  const prevKedai = () => {
    setCurrentIndex((prev) => (prev - 1 + TRENDING_KEDAI.length) % TRENDING_KEDAI.length);
  };

  const currentKedai = TRENDING_KEDAI[currentIndex];

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-0 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Top Trending This Week</h3>
            <p className="text-xs text-muted-foreground">Save time, explore popular spots</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAll}
          className="text-xs h-7 gap-1 hover:bg-primary/10"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Swipeable Kedai Card */}
      <div className="relative">
        <button
          onClick={() => handleKedaiClick(currentKedai)}
          className="w-full text-left group"
        >
          <div className="relative bg-card rounded-lg p-3 hover:shadow-md transition-all duration-200 group-hover:scale-[1.02] before:absolute before:inset-0 before:rounded-lg before:p-[2px] before:bg-gradient-to-r before:from-red-500 before:via-yellow-500 before:to-green-500 before:bg-[length:200%_100%] before:animate-[rainbow_3s_linear_infinite] before:-z-10 after:absolute after:inset-[2px] after:rounded-[6px] after:bg-card after:-z-10">
            <style>{`
              @keyframes rainbow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}</style>
            {/* Kedai Info */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {currentKedai.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>{currentKedai.area}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">{currentKedai.rating}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({currentKedai.totalReviews?.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {currentKedai.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center">
                {Array.from({ length: (currentKedai.price_level || '$$').length }).map((_, idx) => (
                  <span key={idx}>💵</span>
                ))}
              </span>
            </div>
          </div>
        </button>

        {/* Navigation Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <button
            onClick={prevKedai}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {TRENDING_KEDAI.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to kedai ${idx + 1}`}
            />
          ))}

          <button
            onClick={nextKedai}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
