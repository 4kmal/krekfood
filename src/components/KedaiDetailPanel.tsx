import { useNavigate } from 'react-router-dom';
import { MapPin, Star, ExternalLink, Share2, Navigation, Bookmark, BookmarkCheck, Copy, MessageCircle, Send, X, Flame, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Kedai } from '@/types/kedai';
import { Button } from '@/components/ui/button';
import { useMap } from '@/contexts/MapContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useBookmarks } from '@/hooks/useBookmarks';
import { KedaiVibeCheck } from './KedaiVibeCheck';
import { ScrollArea } from './ui/scroll-area';
import { generateMenu } from '@/utils/menuGenerator';

interface KedaiDetailPanelProps {
  kedai: Kedai;
  foodImage: string | null;
  onClose: () => void;
  mobile?: boolean;
}

export function KedaiDetailPanel({ kedai, foodImage, onClose, mobile = false }: KedaiDetailPanelProps) {
  const { user } = useAuth();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { setShowDirections, userLocation, customStartLocation } = useMap();
  const navigate = useNavigate();
  
  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(kedai.name + ' ' + kedai.area + ' Malaysia')}`;
  const reviews = kedai.reviews || [];
  const bookmarked = isBookmarked(kedai.id);

  const shareMessage = `👨🏻‍💻 Check out ${kedai.name}!\n\n📍 ${kedai.area}\n🍽️ ${kedai.signature || 'Great food!'}\n⭐ ${kedai.rating ? `${kedai.rating}/5` : 'Highly rated'}\n💵 ${kedai.price_level || '$$'}\n\n🗺️ ${googleMapsUrl}\n\nFound via KrekFood 🇲🇾`;

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const shareToTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(googleMapsUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(telegramUrl, '_blank');
    toast.success('Opening Telegram...');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: kedai.name,
          text: `Check out ${kedai.name} - ${kedai.signature || 'Great food!'}`,
          url: googleMapsUrl,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.info('Login to save bookmarks');
      onClose();
      navigate('/auth');
      return;
    }

    if (bookmarked) {
      await removeBookmark(kedai.id);
    } else {
      await addBookmark(kedai, foodImage);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col bg-background border-l border-border ${mobile ? '[&_button]:min-h-11' : ''}`}>
      {/* Header with close button */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground">Restaurant Details</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close restaurant details"
          className={mobile ? 'h-11 w-11' : 'h-8 w-8'}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* Header Image */}
          <div className="relative w-full h-48 bg-muted flex-shrink-0">
            {foodImage ? (
              <img 
                src={foodImage} 
                alt={kedai.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-accent/20 to-primary/20">
                🍽️
              </div>
            )}
            
            {/* Top Actions */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Button
                type="button"
                onClick={handleBookmark}
                size="sm"
                className={`rounded-full transition-colors ${
                  bookmarked 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background/80 backdrop-blur-sm hover:bg-background'
                }`}
              >
                {bookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4 text-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">
                {kedai.name}
              </h1>
              <div className="flex items-center gap-2 text-sm">
                {kedai.rating && (
                  <>
                    <span className="font-medium text-foreground">{kedai.rating}</span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <Star 
                          key={`${kedai.id}-rating-star-${starIdx}`} 
                          className={`w-3.5 h-3.5 ${starIdx < Math.floor(kedai.rating || 0) ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    {kedai.totalReviews && (
                      <span className="text-muted-foreground">({kedai.totalReviews})</span>
                    )}
                    <span className="text-muted-foreground">·</span>
                  </>
                )}
                <span className="text-muted-foreground">{kedai.price_level || '$$'}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Restaurant</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1.5 press-effect"
                onClick={() => {
                  if (!userLocation && !customStartLocation) {
                    toast.info('Please set your location first to get directions');
                  } else {
                    setShowDirections(true);
                    toast.success('Showing directions on map');
                  }
                }}
              >
                <Navigation className="w-4 h-4" />
                Directions
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5 press-effect"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={nativeShare} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share via...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={shareToWhatsApp} className="gap-2">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareToTelegram} className="gap-2">
                    <Send className="w-4 h-4 text-blue-500" />
                    Telegram
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={copyToClipboard} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Copy to clipboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant={bookmarked ? "secondary" : "outline"}
                size="sm" 
                className="gap-1.5 press-effect"
                onClick={handleBookmark}
              >
                {bookmarked ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 press-effect relative group"
                onClick={() => window.open(googleMapsUrl, '_blank')}
                title="Open in Google Maps"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 1.64.47 3.17 1.27 4.47l6.73 10.53 6.73-10.53c.8-1.3 1.27-2.83 1.27-4.47C20.5 3.81 16.69 0 12 0zm0 11.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="#4285F4"/>
                  <path d="M12 2c-3.31 0-6 2.69-6 6.5 0 1.19.34 2.3.92 3.25L12 20.25l5.08-8.5c.58-.95.92-2.06.92-3.25C18 4.69 15.31 2 12 2zm0 9.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="#EA4335"/>
                  <path d="M12 5.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#FBBC04"/>
                </svg>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-3 mt-3">
                {/* Distance (if available) */}
                {kedai.distanceFormatted && (
                  <div className="flex items-start gap-3 py-2">
                    <Navigation className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Distance</p>
                      <p className="text-sm font-medium text-foreground">{kedai.distanceFormatted} away</p>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className={`flex items-start gap-3 py-2 ${kedai.distanceFormatted ? 'border-t border-border' : ''}`}>
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                    <p className="text-sm text-foreground">{kedai.area}, Malaysia</p>
                  </div>
                </div>

                {/* Signature Dish */}
                {kedai.signature && (
                  <div className="flex items-start gap-3 py-2 border-t border-border">
                    <span className="text-lg">🍽️</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Signature Dish</p>
                      <p className="text-sm font-medium text-foreground">{kedai.signature}</p>
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-start gap-3 py-2 border-t border-border">
                  <span className="text-lg">💵</span>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Price Range</p>
                    <p className="text-sm font-medium text-foreground">{kedai.price_level || '$$'}</p>
                  </div>
                </div>

                {/* Tags */}
                {kedai.tags && kedai.tags.length > 0 && (
                  <div className="flex items-start gap-3 py-2 border-t border-border">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {kedai.tags.slice(0, 5).map((tag) => (
                          <span 
                            key={tag}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Food Menu Tab */}
              <TabsContent value="menu" className="space-y-3 mt-3">
                <div className="space-y-3">
                  {generateMenu(kedai.name, kedai.signature).map((item) => (
                    <div 
                      key={item.id}
                      className="flex gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted/70 transition-colors"
                    >
                      {/* Food Image */}
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {item.isPopular && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Hot
                          </div>
                        )}
                      </div>
                      
                      {/* Food Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-foreground leading-tight">
                            {item.name}
                            {item.isSpicy && (
                              <Flame className="w-3.5 h-3.5 text-red-500 inline ml-1" />
                            )}
                          </h4>
                          <span className="text-sm font-bold text-primary flex-shrink-0">
                            {item.price}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <span className="inline-block text-[10px] text-muted-foreground/70 mt-1.5 px-2 py-0.5 bg-background rounded-full capitalize">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  * Prices and availability may vary
                </p>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-3 mt-3">
                {reviews.length > 0 ? (
                  reviews.map((review, idx) => {
                    // Create unique key from review properties
                    const reviewKey = `${review.name}-${review.text.slice(0, 50).replace(/\s+/g, '-')}-${review.date || review.rating || 'no-date'}`;
                    return (
                    <div 
                      key={reviewKey} 
                      className="p-3 bg-muted/50 rounded-lg animate-stagger-fade"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {review.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{review.name}</p>
                            {review.date && (
                              <p className="text-xs text-muted-foreground">{review.date}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(review.rating, 5) }, (_, starIdx) => {
                            const starKey = `${reviewKey}-star-${review.rating}-pos-${starIdx}`;
                            return (
                              <Star key={starKey} className="w-3.5 h-3.5 fill-accent text-accent" />
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{review.text}</p>
                    </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No reviews available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom VibeCheck */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <KedaiVibeCheck kedai={kedai} />
      </div>
    </div>
  );
}
