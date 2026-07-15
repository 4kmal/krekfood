import { ExternalLink, Loader2, MapPin, Navigation, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Bookmark } from '@/hooks/useBookmarks';

interface SavedPlacesListProps {
  bookmarks: Bookmark[];
  loading: boolean;
  onRemove: (placeId: string) => void | Promise<unknown>;
  onSelect?: (bookmark: Bookmark) => void;
  onExplore?: () => void;
  mobile?: boolean;
}

function openInMaps(bookmark: Bookmark) {
  const query = `${bookmark.kedai_name} ${bookmark.kedai_address || ''} Malaysia`;
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
}

export function SavedPlacesList({
  bookmarks,
  loading,
  onRemove,
  onSelect,
  onExplore,
  mobile = false,
}: SavedPlacesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-primary/70" />
        <h2 className="text-lg font-semibold text-foreground">No saved places yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Save a restaurant while exploring and it will appear here.
        </p>
        {onExplore && (
          <Button className="mt-5 min-h-11" onClick={onExplore}>Start exploring</Button>
        )}
      </div>
    );
  }

  return (
    <div className={mobile ? 'space-y-3 px-4 pb-5' : 'space-y-3'}>
      {bookmarks.map((bookmark) => {
        const canShowOnMap = bookmark.kedai_lat !== null && bookmark.kedai_lon !== null;
        return (
          <article key={bookmark.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex gap-3 p-3">
              <div className={`${mobile ? 'h-20 w-20' : 'h-24 w-24'} flex-shrink-0 overflow-hidden rounded-xl bg-muted`}>
                {bookmark.kedai_image ? (
                  <img
                    src={bookmark.kedai_image}
                    alt={bookmark.kedai_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <MapPin className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-semibold text-foreground">{bookmark.kedai_name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {bookmark.kedai_rating && (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      {bookmark.kedai_rating}
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </span>
                  )}
                  {bookmark.kedai_price_level && <span>{bookmark.kedai_price_level}</span>}
                </div>
                {bookmark.kedai_address && (
                  <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{bookmark.kedai_address}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:flex">
              {onSelect && canShowOnMap && (
                <Button variant="default" size="sm" className="min-h-11 gap-1.5" onClick={() => onSelect(bookmark)}>
                  <Navigation className="h-4 w-4" />
                  Show on map
                </Button>
              )}
              <Button variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={() => openInMaps(bookmark)}>
                <ExternalLink className="h-4 w-4" />
                Directions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void onRemove(bookmark.kedai_place_id || '')}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
