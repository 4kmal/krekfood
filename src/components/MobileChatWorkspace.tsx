import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  Bot,
  Car,
  ChevronUp,
  Compass,
  Filter,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Navigation,
  Plane,
  RefreshCw,
  Router,
  Search,
  SlidersHorizontal,
  Sun,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { InteractiveMap } from '@/components/InteractiveMap';
import { MapFilters } from '@/components/MapFilters';
import { MobileKedaiCarousel } from '@/components/MobileKedaiCarousel';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { ChatAiModeBar } from '@/components/ChatAiModeBar';
import { KedaiDetailPanel } from '@/components/KedaiDetailPanel';
import { SavedPlacesList } from '@/components/SavedPlacesList';
import { ApiDiagnosticsPanel } from '@/components/ApiDiagnosticsPanel';
import { Button } from '@/components/ui/button';
import { useMobileTray, type MobileTraySnap } from '@/hooks/useMobileTray';
import { useMap } from '@/contexts/MapContext';
import { useTheme } from '@/components/ThemeProvider';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { TRENDING_KEDAI } from '@/data/trendingKedai';
import type { Bookmark as SavedBookmark } from '@/hooks/useBookmarks';
import type { ChatMessage, Kedai } from '@/types/kedai';
import type { ChatAiMode, ChatModelOption } from '@/types/chat-ai';

export type MobileChatView = 'explore' | 'ask' | 'saved' | 'more';

interface FilterOption {
  value: string;
  label: string;
}

interface MobileChatWorkspaceProps {
  googleMapsApiKey: string;
  messages: ChatMessage[];
  loading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  onSend: (message: string) => void;
  aiMode: ChatAiMode;
  models: ChatModelOption[];
  selectedModel: string;
  staleModel: string | null;
  loadingModels: boolean;
  modelsError: string | null;
  onModeChange: (mode: ChatAiMode) => void;
  onModelChange: (model: string) => void;
  onRefreshModels: () => void;
  budget: string;
  cuisine: string;
  budgetOptions: FilterOption[];
  cuisineOptions: FilterOption[];
  onBudgetChange: (budget: string) => void;
  onCuisineChange: (cuisine: string) => void;
  userLocation: { lat: number; lon: number } | null;
  locationName: string | null;
  locationLoading: boolean;
  onRequestLocation: () => void;
  onClearLocation: () => void;
  onClearSearchFilters: () => void;
  bookmarks: SavedBookmark[];
  bookmarksLoading: boolean;
  onRemoveBookmark: (placeId: string) => void | Promise<unknown>;
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

const VALID_VIEWS: MobileChatView[] = ['explore', 'ask', 'saved', 'more'];

const DOCK_ITEMS: Array<{
  id: MobileChatView;
  label: string;
  icon: typeof Compass;
}> = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'ask', label: 'Ask AI', icon: MessageCircle },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'more', label: 'More', icon: Menu },
];

function getMobileView(value: string | null): MobileChatView {
  return VALID_VIEWS.includes(value as MobileChatView) ? value as MobileChatView : 'explore';
}

function bookmarkToKedai(bookmark: SavedBookmark): Kedai | null {
  if (bookmark.kedai_lat === null || bookmark.kedai_lon === null) return null;
  return {
    id: bookmark.kedai_place_id || bookmark.id,
    name: bookmark.kedai_name,
    area: bookmark.kedai_address || 'Malaysia',
    lat: Number(bookmark.kedai_lat),
    lon: Number(bookmark.kedai_lon),
    price_level: bookmark.kedai_price_level || '$$',
    rating: bookmark.kedai_rating || undefined,
    thumbnail: bookmark.kedai_image || undefined,
    signature: 'Saved place',
    tags: ['Saved'],
    reviews: [],
  };
}

export function MobileChatWorkspace({
  googleMapsApiKey,
  messages,
  loading,
  messagesEndRef,
  onSend,
  aiMode,
  models,
  selectedModel,
  staleModel,
  loadingModels,
  modelsError,
  onModeChange,
  onModelChange,
  onRefreshModels,
  budget,
  cuisine,
  budgetOptions,
  cuisineOptions,
  onBudgetChange,
  onCuisineChange,
  userLocation,
  locationName,
  locationLoading,
  onRequestLocation,
  onClearLocation,
  onClearSearchFilters,
  bookmarks,
  bookmarksLoading,
  onRemoveBookmark,
  userEmail,
  onSignOut,
}: MobileChatWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = getMobileView(searchParams.get('view'));
  const [showAiControls, setShowAiControls] = useState(false);
  const [showAskFilters, setShowAskFilters] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { diagnostics } = useApiDiagnostics();
  const {
    selectedKedai,
    setSelectedKedai,
    allKedai,
    setAllKedai,
    filteredKedai,
    setFilteredKedai,
    setMapCenter,
    customStartLocation,
    setCustomStartLocation,
    showDirections,
    setShowDirections,
    isPlacingCustomPin,
    setIsPlacingCustomPin,
    showFlightAnimation,
    setShowFlightAnimation,
    playRouteMode,
    setPlayRouteMode,
  } = useMap();

  const closeSelectedKedai = useCallback(() => setSelectedKedai(null), [setSelectedKedai]);
  const tray = useMobileTray({
    onDownwardFlingFromPeek: selectedKedai ? closeSelectedKedai : undefined,
  });
  const setTraySnap = tray.setSnap;

  const changeView = useCallback((nextView: MobileChatView, replace = false) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', nextView);
    setSearchParams(nextParams, { replace });
    if (nextView !== 'explore') setSelectedKedai(null);
  }, [searchParams, setSearchParams, setSelectedKedai]);

  useEffect(() => {
    if (allKedai.length === 0) {
      setAllKedai(TRENDING_KEDAI);
      setFilteredKedai(TRENDING_KEDAI);
    }
  }, [allKedai.length, setAllKedai, setFilteredKedai]);

  useEffect(() => {
    let nextSnap: MobileTraySnap = 'peek';
    if (selectedKedai || view === 'saved' || view === 'more') nextSnap = 'half';
    if (view === 'ask') nextSnap = 'expanded';
    setTraySnap(nextSnap);
  }, [selectedKedai, setTraySnap, view]);

  useEffect(() => {
    if (selectedKedai && view !== 'explore') changeView('explore', true);
  }, [changeView, selectedKedai, view]);

  const resultKedai = useMemo(() => {
    if (filteredKedai.length > 0) return filteredKedai;
    if (allKedai.length > 0) return allKedai;
    return TRENDING_KEDAI;
  }, [allKedai, filteredKedai]);

  const selectKedai = (kedai: Kedai) => {
    setSelectedKedai(kedai);
    setMapCenter({ lat: kedai.lat, lng: kedai.lon });
    setTraySnap('half');
  };

  const selectBookmark = (bookmark: SavedBookmark) => {
    const kedai = bookmarkToKedai(bookmark);
    if (!kedai) return;
    changeView('explore');
    selectKedai(kedai);
  };

  const handleRecenter = () => {
    if (!userLocation) {
      onRequestLocation();
      return;
    }
    setMapCenter({ lat: userLocation.lat, lng: userLocation.lon });
    toast.success(`Map centered on ${locationName || 'your location'}`);
  };

  const beginCustomPin = () => {
    setIsPlacingCustomPin(true);
    changeView('explore');
    setTraySnap('peek');
    toast.info('Tap the map to set a custom starting point');
  };

  const activeSearchFilters = Number(Boolean(budget)) + Number(Boolean(cuisine)) + Number(Boolean(userLocation));
  const recenterBottom = Math.min(tray.height + 16, tray.viewportHeight - 116);

  const renderExplore = () => {
    if (selectedKedai && tray.snap === 'peek') {
      return (
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 pb-4 text-left"
          onClick={() => tray.setSnap('half')}
        >
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            {selectedKedai.thumbnail ? (
              <img src={selectedKedai.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><MapPin className="h-6 w-6 text-primary" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-semibold text-foreground">{selectedKedai.name}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {selectedKedai.rating ? `★ ${selectedKedai.rating} · ` : ''}{selectedKedai.area}
            </p>
          </div>
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        </button>
      );
    }

    if (selectedKedai) {
      return (
        <div className="h-full overflow-hidden">
          <KedaiDetailPanel
            kedai={selectedKedai}
            foodImage={selectedKedai.thumbnail || null}
            onClose={closeSelectedKedai}
            mobile
          />
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-end justify-between gap-3 px-4 pb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Explore nearby</p>
            <h2 className="text-lg font-semibold text-foreground">Places worth a bite</h2>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{resultKedai.length} results</span>
        </div>
        <MobileKedaiCarousel kedai={resultKedai} onSelect={selectKedai} />
      </div>
    );
  };

  const renderAsk = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-border px-3 pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 min-w-0 flex-1 justify-start gap-2 rounded-full"
            onClick={() => setShowAiControls((current) => !current)}
            aria-expanded={showAiControls}
          >
            {aiMode === 'nine_router' ? <Router className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
            <span className="truncate">{aiMode === 'nine_router' ? selectedModel : 'Gemini Legacy'}</span>
          </Button>
          <Button
            type="button"
            variant={showAskFilters ? 'secondary' : 'outline'}
            size="icon"
            className="relative h-11 w-11 flex-shrink-0 rounded-full"
            onClick={() => setShowAskFilters((current) => !current)}
            aria-label="Search preferences"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeSearchFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeSearchFilters}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {showAiControls && (
          <ChatAiModeBar
            mode={aiMode}
            models={models}
            selectedModel={selectedModel}
            staleModel={staleModel}
            loadingModels={loadingModels}
            modelsError={modelsError}
            disabled={loading}
            onModeChange={onModeChange}
            onModelChange={onModelChange}
            onRefresh={onRefreshModels}
          />
        )}

        {showAskFilters && (
          <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                Search preferences
              </div>
              {activeSearchFilters > 0 && (
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onClearSearchFilters}>Clear</Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={budget}
                onChange={(event) => onBudgetChange(event.target.value)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                aria-label="Budget"
              >
                {budgetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select
                value={cuisine}
                onChange={(event) => onCuisineChange(event.target.value)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                aria-label="Cuisine"
              >
                {cuisineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <div className="sm:col-span-2">
                {userLocation ? (
                  <div className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3">
                    <Navigation className="h-4 w-4 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm">{locationName || 'Your location'}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClearLocation} aria-label="Clear location">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="min-h-11 w-full gap-2" onClick={onRequestLocation} disabled={locationLoading}>
                    {locationLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    Use my location
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                {aiMode === 'nine_router' ? 'Routing through 9Router' : 'Asking Gemini'}...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="flex-shrink-0 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
        <ChatInput onSend={onSend} loading={loading} mobile />
      </footer>
    </div>
  );

  const renderSaved = () => (
    <div>
      <div className="px-4 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Your collection</p>
        <div className="mt-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Saved places</h2>
          <span className="text-xs text-muted-foreground">{bookmarks.length} saved</span>
        </div>
      </div>
      <SavedPlacesList
        bookmarks={bookmarks}
        loading={bookmarksLoading}
        onRemove={onRemoveBookmark}
        onSelect={selectBookmark}
        onExplore={() => changeView('explore')}
        mobile
      />
    </div>
  );

  const renderMore = () => (
    <div className="space-y-4 px-4 pb-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">KrekFood controls</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">More</h2>
      </div>

      <section className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Map tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={isPlacingCustomPin ? 'default' : 'outline'} className="min-h-11 gap-2" onClick={beginCustomPin}>
            <MapPin className="h-4 w-4" />
            Set start pin
          </Button>
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            disabled={!customStartLocation}
            onClick={() => {
              setCustomStartLocation(null);
              setShowDirections(false);
              toast.info('Custom pin removed');
            }}
          >
            <X className="h-4 w-4" />
            Clear pin
          </Button>
          <Button variant={showFlightAnimation ? 'secondary' : 'outline'} className="min-h-11 gap-2" onClick={() => setShowFlightAnimation(!showFlightAnimation)}>
            <Plane className="h-4 w-4" />
            Flight {showFlightAnimation ? 'on' : 'off'}
          </Button>
          <Button variant={playRouteMode ? 'default' : 'outline'} className="min-h-11 gap-2" disabled={!showDirections} onClick={() => setPlayRouteMode(!playRouteMode)}>
            <Car className="h-4 w-4" />
            {playRouteMode ? 'Driving' : 'Play route'}
          </Button>
          {showDirections && (
            <Button variant="outline" className="col-span-2 min-h-11" onClick={() => setShowDirections(false)}>Hide directions</Button>
          )}
        </div>
        <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Map legend</p>
          <div className="grid grid-cols-2 gap-2">
            <span><span className="text-blue-500">●</span> Your location</span>
            <span><span className="text-violet-500">●</span> Custom start</span>
            <span><span className="text-red-500">●</span> Restaurant</span>
            <span><span className="text-green-500">●</span> Selected</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Appearance and account</h3>
        <Button
          variant="ghost"
          className="min-h-11 w-full justify-start gap-3"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {resolvedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
        </Button>
        <div className="flex min-h-11 items-center gap-3 px-4 text-sm text-muted-foreground">
          <User className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">{userEmail || 'Signed-in user'}</span>
        </div>
        <Button
          variant="ghost"
          className="min-h-11 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={async () => {
            await onSignOut();
            toast.success('Logged out');
            navigate('/');
          }}
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </Button>
      </section>

      <section>
        <ApiDiagnosticsPanel />
      </section>
    </div>
  );

  return (
    <div
      className="relative overflow-hidden bg-background lg:hidden"
      style={{ height: `${tray.viewportHeight}px` }}
      data-testid="mobile-chat-workspace"
    >
      <div className="absolute inset-0">
        {googleMapsApiKey ? (
          <InteractiveMap
            googleMapsApiKey={googleMapsApiKey}
            mobileMode
            mobileBottomInset={tray.snapHeights[tray.snap]}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted px-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-destructive" />
              <p className="font-semibold text-foreground">Map unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">Open More for API diagnostics while chat remains available.</p>
            </div>
          </div>
        )}
      </div>

      {view === 'explore' && !selectedKedai && (
        <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-3 rounded-full border border-border bg-card/95 px-4 text-left shadow-xl backdrop-blur"
            onClick={() => changeView('ask')}
          >
            <Search className="h-5 w-5 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Search food or ask KrekFood</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm">🍜</span>
          </button>
          <div className="mt-2">
            <MapFilters variant="mobile" />
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon"
        className="absolute right-4 z-20 h-12 w-12 rounded-full shadow-xl transition-[bottom]"
        style={{ bottom: `${recenterBottom}px` }}
        onClick={handleRecenter}
        aria-label={userLocation ? 'Recenter on my location' : 'Set my location'}
      >
        <LocateFixed className="h-5 w-5" />
      </Button>

      <section
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-background/98 shadow-[0_-18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
          tray.isDragging ? '' : 'transition-[height] duration-300 ease-out motion-reduce:transition-none'
        }`}
        style={{ height: `${tray.height}px` }}
        aria-label={`${view} mobile tray`}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Resize content tray"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={['peek', 'half', 'expanded'].indexOf(tray.snap)}
          className="flex h-8 flex-shrink-0 cursor-ns-resize touch-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          onPointerDown={tray.onPointerDown}
          onPointerMove={tray.onPointerMove}
          onPointerUp={tray.onPointerUp}
          onPointerCancel={tray.onPointerCancel}
          onKeyDown={tray.onKeyDown}
        >
          <span className="h-1.5 w-11 rounded-full bg-muted-foreground/35" />
        </div>

        <div className={`min-h-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${view === 'ask' || (view === 'explore' && selectedKedai && tray.snap !== 'peek') ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'}`}>
          {view === 'explore' && renderExplore()}
          {view === 'ask' && renderAsk()}
          {view === 'saved' && renderSaved()}
          {view === 'more' && renderMore()}
        </div>

        <nav
          className="grid flex-shrink-0 grid-cols-4 gap-1 border-t border-border bg-card/95 px-2 pt-1.5 backdrop-blur"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
          aria-label="Mobile workspace"
        >
          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`relative flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-medium transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => changeView(item.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {active && <span>{item.label}</span>}
                {item.id === 'saved' && bookmarks.length > 0 && !active && (
                  <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {bookmarks.length > 99 ? '99+' : bookmarks.length}
                  </span>
                )}
                {item.id === 'more' && diagnostics.length > 0 && (
                  <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {diagnostics.length > 99 ? '99+' : diagnostics.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </section>
    </div>
  );
}
