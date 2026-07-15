import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from './ui/button';
import { Filter, TrendingUp, Clock, DollarSign, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from './ui/badge';

type SortOption = 'trending' | 'rating' | 'distance' | 'price';

const CATEGORY_OPTIONS = [
  { value: 'Restaurant', label: '🍽️ Restaurant' },
  { value: 'Cafe', label: '☕️ Cafe' },
  { value: 'Street Food', label: '🍡 Street Food' },
  { value: 'Fast Food', label: '🍔 Fast Food' },
  { value: 'Hawker', label: '🍜 Hawker' },
  { value: 'Fine Dining', label: '🥂 Fine Dining' },
  { value: 'Bakery', label: '🍞 Bakery' },
  { value: 'Dessert', label: '🍰 Dessert' },
];

interface MapFiltersProps {
  variant?: 'desktop' | 'mobile';
}

export function MapFilters({ variant = 'desktop' }: MapFiltersProps) {
  const { allKedai, setFilteredKedai } = useMap();
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('trending');

  // Apply filters whenever dependencies change
  useEffect(() => {
    if (allKedai.length === 0) {
      setFilteredKedai([]);
      return;
    }

    let filtered = [...allKedai];

    // Filter by open now (mock - we don't have hours data yet)
    // Operating-hours data is not available yet, so the Open Now control is
    // retained for UI continuity without removing otherwise valid results.

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((kedai) =>
        kedai.tags.some((tag) =>
          selectedCategories.some((cat) => {
            const catValue = typeof cat === 'string' ? cat : cat;
            return tag.toLowerCase().includes(catValue.toLowerCase());
          })
        )
      );
    }

    // Sort
    switch (sortBy) {
      case 'trending':
        // Simple trending algorithm: rating * log(reviews)
        filtered.sort((a, b) => {
          const scoreA = (a.rating || 0) * Math.log((a.totalReviews || 1) + 1);
          const scoreB = (b.rating || 0) * Math.log((b.totalReviews || 1) + 1);
          return scoreB - scoreA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'distance':
        filtered.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        break;
      case 'price': {
        const priceValue = (priceLevel: string) => {
          return (priceLevel || '$$').length;
        };
        filtered.sort((a, b) => priceValue(a.price_level) - priceValue(b.price_level));
        break;
      }
    }

    setFilteredKedai(filtered);
  }, [allKedai, openNowOnly, selectedCategories, sortBy, setFilteredKedai]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setOpenNowOnly(false);
    setSelectedCategories([]);
    setSortBy('trending');
  };

  const activeFiltersCount = (openNowOnly ? 1 : 0) + selectedCategories.length;
  const isMobile = variant === 'mobile';

  return (
    <div className={`flex items-center gap-2 ${isMobile ? 'w-full min-w-0' : ''}`}>
      <div className={`flex items-center gap-2 overflow-x-auto ${isMobile ? 'w-full pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}`}>
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`flex-shrink-0 ${isMobile ? 'h-9 rounded-full bg-card/95 px-3 shadow-md backdrop-blur' : ''}`}>
              {sortBy === 'trending' && <TrendingUp className="w-4 h-4 mr-2" />}
              {sortBy === 'rating' && <Star className="w-4 h-4 mr-2" />}
              {sortBy === 'distance' && <span className="mr-2">📍</span>}
              {sortBy === 'price' && <DollarSign className="w-4 h-4 mr-2" />}
              {isMobile ? sortBy.charAt(0).toUpperCase() + sortBy.slice(1) : `Sort: ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy('trending')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('rating')}>
              <Star className="w-4 h-4 mr-2" />
              Rating
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('distance')}>
              📍 Distance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('price')}>
              <DollarSign className="w-4 h-4 mr-2" />
              Price
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Open Now Toggle */}
        <Button
          variant={openNowOnly ? 'default' : 'outline'}
          size="sm"
          className={`flex-shrink-0 ${isMobile ? 'h-9 rounded-full bg-card/95 px-3 shadow-md backdrop-blur' : ''}`}
          onClick={() => setOpenNowOnly(!openNowOnly)}
        >
          <Clock className="w-4 h-4 mr-2" />
          Open Now
        </Button>

        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`flex-shrink-0 relative ${isMobile ? 'h-9 rounded-full bg-card/95 px-3 shadow-md backdrop-blur' : ''}`}>
              <Filter className="w-4 h-4 mr-2" />
              Categories
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {CATEGORY_OPTIONS.map((category) => (
              <DropdownMenuCheckboxItem
                key={category.value}
                checked={selectedCategories.includes(category.value)}
                onCheckedChange={() => toggleCategory(category.value)}
              >
                {category.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results Count */}
      {allKedai.length > 0 && !isMobile && (
        <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
          {allKedai.length} result{allKedai.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
