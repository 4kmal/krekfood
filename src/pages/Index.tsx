import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '@/types/kedai';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { LocationPermissionDialog } from '@/components/LocationPermissionDialog';
import { LocationFallbackDialog } from '@/components/LocationFallbackDialog';
import { TrendingKedaiCard } from '@/components/TrendingKedaiCard';
import { InteractiveMap } from '@/components/InteractiveMap';
import { MapFilters } from '@/components/MapFilters';
import { KedaiDetailPanel } from '@/components/KedaiDetailPanel';
import { ApiDiagnosticsIndicator } from '@/components/ApiDiagnosticsIndicator';
import { ChatAiModeBar } from '@/components/ChatAiModeBar';
import { useAuth } from '@/hooks/useAuth';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/components/ThemeProvider';
import { useMap } from '@/contexts/MapContext';
import { Loader2, Moon, Sun, Filter, X, MapPin, Navigation, User, LogOut, Bookmark, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ApiDiagnosticError, invokeEdgeFunction } from '@/lib/edge-functions';
import { getConciseDiagnosticMessage, type ApiDiagnosticPayload } from '@/types/api-diagnostics';
import {
  DEFAULT_CHAT_AI_MODE,
  DEFAULT_NINE_ROUTER_MODEL,
  type ChatAiMode,
  type ChatModelOption,
  type ModelsResponse,
} from '@/types/chat-ai';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Salam Krackers! 👨🏻‍💻 I am your certified krekfood AI.\n\nBoleh tekan auto-suggestion atau taip sendiri!\n\nNak Makan Mana?",
  timestamp: new Date(),
};

const BUDGET_OPTIONS = [
  { value: '', label: 'Any Budget' },
  { value: 'cheap', label: '💵 Cheap (< RM15)' },
  { value: 'moderate', label: '💵💵 Moderate (RM15-40)' },
  { value: 'expensive', label: '💵💵💵 Expensive (RM40+)' },
];

const CUISINE_OPTIONS = [
  { value: '', label: 'Any Cuisine' },
  { value: 'malay', label: '🍛 Malay' },
  { value: 'chinese', label: '🥢 Chinese' },
  { value: 'indian', label: '🍚 Indian' },
  { value: 'mamak', label: '🍜 Mamak' },
  { value: 'japanese', label: '🍣 Japanese' },
  { value: 'korean', label: '🍖 Korean' },
  { value: 'western', label: '🍔 Western' },
  { value: 'thai', label: '🌶️ Thai' },
  { value: 'seafood', label: '🦐 Seafood' },
  { value: 'vegetarian', label: '🥗 Vegetarian' },
];

const CHAT_AI_MODE_STORAGE_KEY = 'krekfood-chat-ai-mode';
const CHAT_AI_MODEL_STORAGE_KEY = 'krekfood-chat-ai-model';

function getStoredAiMode(): ChatAiMode {
  const stored = localStorage.getItem(CHAT_AI_MODE_STORAGE_KEY);
  return stored === 'gemini' || stored === 'nine_router' ? stored : DEFAULT_CHAT_AI_MODE;
}

function getStoredAiModel(): string {
  return localStorage.getItem(CHAT_AI_MODEL_STORAGE_KEY) || DEFAULT_NINE_ROUTER_MODEL;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, session, loading: authLoading } = useAuth();
  const { reportDiagnostic } = useApiDiagnostics();
  const { bookmarks } = useBookmarks();
  const { resolvedTheme, setTheme } = useTheme();
  const { 
    selectedKedai, 
    setSelectedKedai, 
    setAllKedai, 
    setFilteredKedai,
    setUserLocation: setMapUserLocation,
    setMapCenter,
  } = useMap();
  
  // Redirect to landing page if user logs out
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<ChatAiMode>(getStoredAiMode);
  const [selectedAiModel, setSelectedAiModel] = useState(getStoredAiModel);
  const [aiModels, setAiModels] = useState<ChatModelOption[]>([]);
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [aiModelsError, setAiModelsError] = useState<string | null>(null);
  const [staleAiModel, setStaleAiModel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [budget, setBudget] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showLocationFallback, setShowLocationFallback] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get Google Maps API key from env
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!googleMapsApiKey) {
      reportDiagnostic({
        provider: 'google_maps',
        service: 'maps-javascript',
        code: 'GOOGLE_MAPS_KEY_MISSING',
        category: 'configuration',
        severity: 'error',
        message: 'The Google Maps browser API key is missing.',
        retryable: false,
        source: 'Map',
      });
    }
  }, [googleMapsApiKey, reportDiagnostic]);

  const loadAiModels = useCallback(async (refresh = false) => {
    if (!session?.access_token) return;

    setAiModelsLoading(true);
    setAiModelsError(null);
    try {
      const { data, diagnostics } = await invokeEdgeFunction<ModelsResponse>('ai-models', {
        body: { refresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      diagnostics.forEach((diagnostic) => {
        reportDiagnostic({ ...diagnostic, source: 'Model selector' });
      });

      setAiModels(data.models);
      if (data.models.some((availableModel) => availableModel.id === selectedAiModel)) {
        setStaleAiModel(null);
      } else {
        const fallbackModel = data.models.some((availableModel) => availableModel.id === data.defaultModel)
          ? data.defaultModel
          : data.models[0]?.id || DEFAULT_NINE_ROUTER_MODEL;
        setStaleAiModel(selectedAiModel);
        setSelectedAiModel(fallbackModel);
        reportDiagnostic({
          provider: 'nine_router',
          service: 'model-selection',
          code: 'NINE_ROUTER_MODEL_FALLBACK',
          category: 'not_found',
          severity: 'warning',
          message: 'The saved 9Router model is no longer available; the configured fallback was selected.',
          retryable: false,
          source: 'Model selector',
        });
      }
    } catch (error) {
      const diagnostic: ApiDiagnosticPayload = error instanceof ApiDiagnosticError
        ? error.diagnostic
        : {
            provider: 'nine_router',
            service: 'model-discovery',
            code: 'NINE_ROUTER_MODELS_UNEXPECTED',
            category: 'unknown',
            severity: 'error',
            message: 'The 9Router model catalog could not be loaded.',
            retryable: true,
          };
      reportDiagnostic({ ...diagnostic, source: 'Model selector' });
      setAiModelsError(getConciseDiagnosticMessage(diagnostic));
    } finally {
      setAiModelsLoading(false);
    }
  }, [reportDiagnostic, selectedAiModel, session?.access_token]);

  useEffect(() => {
    localStorage.setItem(CHAT_AI_MODE_STORAGE_KEY, aiMode);
  }, [aiMode]);

  useEffect(() => {
    localStorage.setItem(CHAT_AI_MODEL_STORAGE_KEY, selectedAiModel);
  }, [selectedAiModel]);

  useEffect(() => {
    if (
      aiMode === 'nine_router'
      && session?.access_token
      && aiModels.length === 0
      && !aiModelsLoading
      && !aiModelsError
    ) {
      void loadAiModels();
    }
  }, [aiMode, aiModels.length, aiModelsError, aiModelsLoading, loadAiModels, session?.access_token]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeFiltersCount = (budget ? 1 : 0) + (cuisine ? 1 : 0) + (userLocation ? 1 : 0);

  const handleLocationRequest = () => {
    // Check if permission was already granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          // Already granted, get location directly
          getCurrentLocation();
        } else {
          // Show our custom dialog first
          setShowLocationDialog(true);
        }
      }).catch(() => {
        // Fallback: show dialog
        setShowLocationDialog(true);
      });
    } else {
      // Fallback for browsers without permissions API
      setShowLocationDialog(true);
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    setShowLocationDialog(false);
    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lon: longitude };
        setUserLocation(newLocation);
        
        // Update map context
        setMapUserLocation({ lat: latitude, lng: longitude });
        setMapCenter({ lat: latitude, lng: longitude });
        
        // Reverse geocode to get location name
        let area = 'Your Location';
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`
          );
          const data = await response.json();
          area = data.address?.suburb || data.address?.city || data.address?.town || 'Your Location';
          setLocationName(area);
          toast.success(`📍 Location set: ${area}`);
        } catch {
          setLocationName('Your Location');
          toast.success('📍 Location detected!');
        }
        
        setLocationLoading(false);

        // If there's a pending message, send it now with location
        if (pendingMessage) {
          const msg = pendingMessage;
          setPendingMessage(null);
          // Small delay to ensure state is updated
          setTimeout(() => {
            processSendMessage(msg, newLocation);
          }, 100);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);
        
        // Show friendly fallback dialog instead of just toast
        if (error.code === error.PERMISSION_DENIED) {
          setShowLocationFallback(true);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('Location unavailable. Try selecting an area instead.');
          setShowLocationFallback(true);
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out. Try selecting an area instead.');
          setShowLocationFallback(true);
        } else {
          toast.error('Failed to get location.');
          setShowLocationFallback(true);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationName(null);
    setMapUserLocation(null);
    toast.info('Location cleared');
  };

  // Store pending message when waiting for location
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Check if message contains "near me" keywords
  const containsNearMe = (text: string) => {
    const keywords = ['near me', 'nearby', 'dekat sini', 'sekitar sini', 'near here', 'around here', 'berdekatan'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  // Core message processing function
  const processSendMessage = async (content: string, locationOverride?: { lat: number; lon: number } | null) => {
    // Check if user is logged in (function requires auth)
    if (!user || !session) {
      toast.error('Please login first to use chat!');
      navigate('/auth');
      return;
    }
    
    const currentLocation = locationOverride !== undefined ? locationOverride : userLocation;
    
    // Append filter context to message
    let enhancedContent = content;
    const filterParts = [];
    if (budget) filterParts.push(`budget: ${budget}`);
    if (cuisine) filterParts.push(`cuisine: ${cuisine}`);
    if (currentLocation) filterParts.push(`near me / nearby`);
    if (filterParts.length > 0) {
      enhancedContent = `${content} [Filters: ${filterParts.join(', ')}]`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      console.log('Calling chat function with:', {
        message: enhancedContent,
        historyLength: history.length,
        filters: { budget, cuisine },
        hasLocation: !!currentLocation
      });

      // Get auth token for function call (functions require JWT)
      const authToken = session?.access_token;
      
      const { data, diagnostics } = await invokeEdgeFunction<{
        message?: string;
        kedai?: unknown[];
        aiMode?: ChatAiMode;
        model?: string;
        diagnostics?: ApiDiagnosticPayload[];
      }>('chat', {
        body: {
          message: enhancedContent,
          history,
          filters: { budget, cuisine },
          location: currentLocation,
          aiMode,
          model: aiMode === 'nine_router' ? selectedAiModel : undefined,
        },
        headers: authToken
          ? { Authorization: `Bearer ${authToken}` }
          : { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '' },
      });

      diagnostics.forEach((diagnostic) => {
        reportDiagnostic({ ...diagnostic, source: 'Chat' });
      });
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || "Maaf, ada masalah sikit. Cuba lagi ya!",
        kedaiResults: (data.kedai || []) as ChatMessage['kedaiResults'],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If there are kedai results, show map and update map context
      if (assistantMessage.kedaiResults && assistantMessage.kedaiResults.length > 0) {
        setShowMapView(true);
        setAllKedai(assistantMessage.kedaiResults);
        setFilteredKedai(assistantMessage.kedaiResults);
        
        // Center map on first result if available
        const firstKedai = assistantMessage.kedaiResults[0];
        if (firstKedai.lat && firstKedai.lon) {
          setMapCenter({ lat: firstKedai.lat, lng: firstKedai.lon });
        }
      }
    } catch (err) {
      console.error('Chat error details:', err);

      const diagnostic: ApiDiagnosticPayload = err instanceof ApiDiagnosticError
        ? err.diagnostic
        : {
            provider: 'supabase',
            service: 'chat',
            code: 'CHAT_UNEXPECTED_ERROR',
            category: err instanceof TypeError ? 'network' : 'unknown',
            severity: 'error',
            message: 'The chat request failed unexpectedly.',
            retryable: true,
          };

      reportDiagnostic({ ...diagnostic, source: 'Chat' });
      const errorContent = getConciseDiagnosticMessage(diagnostic);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(errorContent);
    } finally {
      setLoading(false);
    }
  };

  // Main send function that checks for "near me" first
  const sendMessage = async (content: string) => {
    // Check if user is asking for "near me" but location not set
    if (containsNearMe(content) && !userLocation) {
      setPendingMessage(content); // Store message to send after location granted
      handleLocationRequest();
      return;
    }

    processSendMessage(content);
  };

  const clearFilters = () => {
    setBudget('');
    setCuisine('');
    setUserLocation(null);
    setLocationName(null);
    setMapUserLocation(null);
  };

  // Handle kedai selection - center map on selected kedai
  useEffect(() => {
    if (selectedKedai) {
      // Only auto-show map on first selection, don't override user's hide preference
      setMapCenter({ lat: selectedKedai.lat, lng: selectedKedai.lon });
    }
  }, [selectedKedai, setMapCenter]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👨🏻‍💻</span>
            <div>
              <h1 className="font-bold text-lg text-foreground">Kracked Food</h1>
              <p className="text-xs text-muted-foreground">for hungry kracked devs</p>
            </div>
            {/* Map Filters next to title when map is visible */}
            {showMapView && (
              <div className="ml-4 flex items-center gap-2">
                <MapFilters />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <svg width="16" height="16" viewBox="0 0 99 118" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M93.0212 55.1319L92.3811 54.8119C89.9811 53.7419 87.1311 54.1619 83.8411 56.0619C82.7311 56.7119 81.6611 57.4819 80.6411 58.3919C79.6211 59.3019 78.6512 60.3019 77.7212 61.4119L75.7112 60.2819L69.3311 56.6919L64.7812 54.1219L63.4412 53.3719V41.6619C66.1612 39.1719 68.3811 36.1319 70.1111 32.5419C71.8411 28.9519 72.7112 25.4519 72.7112 22.0519C72.7112 17.9319 71.4411 15.1519 68.9111 13.7019L68.2712 13.3819C65.8612 12.3219 63.0112 12.7419 59.7312 14.6419C56.1412 16.7119 53.081 19.9319 50.541 24.3119C48.011 28.6819 46.7412 32.9219 46.7412 37.0419C46.7412 40.4519 47.6111 42.9419 49.3411 44.5319C49.7511 44.9119 50.1911 45.2219 50.6611 45.4619L51.0112 45.6419C52.4312 46.3019 54.1012 46.4019 56.0212 45.9519V57.6519L53.9712 61.1919L50.9812 66.3319L41.821 82.1319C40.901 82.1019 39.9111 82.2319 38.8611 82.5119C37.8111 82.8019 36.7211 83.2719 35.6111 83.9119C32.0211 85.9819 28.9612 89.2019 26.4312 93.5719C23.8912 97.9519 22.6211 102.192 22.6211 106.312C22.6211 110.432 23.8912 113.202 26.4312 114.652C28.9612 116.092 32.0211 115.782 35.6111 113.712C39.2011 111.642 42.261 108.422 44.791 104.052C47.331 99.6719 48.6011 95.4319 48.6011 91.3119C48.6011 90.0419 48.4612 88.8719 48.1812 87.8319C47.9012 86.7819 47.5112 85.8719 47.0212 85.0919L52.7612 75.1919L58.4011 65.4719L59.3311 63.8719L59.7312 63.1719L65.2612 66.3319L70.8311 69.5119L72.4312 70.4219C71.9412 71.7719 71.5512 73.1319 71.2712 74.4919C70.9912 75.8619 70.8611 77.1819 70.8611 78.4619C70.8611 82.5819 72.1211 85.3619 74.6611 86.8019C77.1911 88.2519 80.2511 87.9319 83.8411 85.8619C87.4311 83.7919 90.4912 80.5719 93.0212 76.2019C95.5612 71.8319 96.8311 67.5819 96.8311 63.4719C96.8311 59.3619 95.5612 56.5719 93.0212 55.1319Z" stroke="currentColor" strokeLinejoin="round"/>
                <path d="M41.1812 95.6019C41.1812 97.3719 40.631 99.1919 39.551 101.062C38.471 102.922 37.1611 104.302 35.6111 105.202C34.0611 106.092 32.7511 106.232 31.6711 105.612C30.5911 104.992 30.041 103.802 30.041 102.022C30.041 100.242 30.5911 98.4319 31.6711 96.5619C32.7511 94.7019 34.0611 93.3219 35.6111 92.4219C37.1611 91.5319 38.471 91.3919 39.551 92.0119C40.631 92.6319 41.1812 93.8219 41.1812 95.6019Z" stroke="currentColor" strokeLinejoin="round"/>
                <path d="M89.4111 67.7521C89.4111 69.5221 88.8613 71.3421 87.7812 73.2121C86.7012 75.0821 85.3911 76.4621 83.8411 77.3521C82.2911 78.2421 80.9811 78.3821 79.9011 77.7621C78.8211 77.1521 78.2812 75.9521 78.2812 74.1821C78.2812 72.4121 78.8211 70.5821 79.9011 68.7221C80.9811 66.8521 82.2911 65.4721 83.8411 64.5821C85.3911 63.6921 86.7012 63.5521 87.7812 64.1621C88.8613 64.7821 89.4111 65.9821 89.4111 67.7521Z" stroke="currentColor" strokeLinejoin="round"/>
                <path d="M65.291 26.3317C65.291 28.1017 64.7511 29.9217 63.6711 31.7917C62.5911 33.6617 61.2712 35.0418 59.7312 35.9318C58.1812 36.8218 56.8713 36.9618 55.7812 36.3418C54.7012 35.7218 54.1611 34.5317 54.1611 32.7617C54.1611 30.9917 54.7012 29.1617 55.7812 27.3017C56.8713 25.4317 58.1812 24.0518 59.7312 23.1618C61.2712 22.2618 62.5911 22.1317 63.6711 22.7417C64.7511 23.3617 65.291 24.5617 65.291 26.3317Z" stroke="currentColor" strokeLinejoin="round"/>
              </svg>
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            <Button
              variant={showMapView ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowMapView(!showMapView)}
              className="gap-1"
            >
              <Map className="w-4 h-4" />
              {showMapView ? 'Hide' : 'View'} Map
            </Button>
            <ApiDiagnosticsIndicator />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:bg-muted"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="w-5 h-5" />
                    {bookmarks.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary text-secondary-foreground text-[10px] rounded-full flex items-center justify-center">
                        {bookmarks.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onClick={() => navigate('/bookmarks')}>
                    <Bookmark className="w-4 h-4" />
                    Saved ({bookmarks.length})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={async () => {
                      await signOut();
                      toast.success('Logged out');
                      navigate('/');
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-1.5"
              >
                <User className="w-4 h-4" />
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gradient-to-br from-card via-card to-muted/30 rounded-xl border border-border/50 shadow-lg backdrop-blur-sm animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Filter className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Search Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary bg-primary/20 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters} 
                  className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
            
            {/* GPS Location Button */}
            <div className="mb-4">
              <label htmlFor="location" className="text-xs font-medium text-foreground mb-2 block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Location
              </label>
              {userLocation ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/30 rounded-lg px-3 py-2.5 shadow-sm">
                  <div className="p-1 bg-primary/20 rounded-md">
                    <Navigation className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{locationName || 'Your Location'}</span>
                  <button 
                    type="button"
                    onClick={clearLocation} 
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLocationRequest}
                  disabled={locationLoading}
                  className="w-full justify-start h-10 bg-background/50 hover:bg-background border-border/50 hover:border-primary/30 transition-all hover:shadow-md"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                  )}
                  <span className="font-medium">
                    {locationLoading ? 'Getting location...' : 'Use My Location (Near Me)'}
                  </span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Budget Filter */}
              <div>
                <label htmlFor="budget" className="text-xs font-medium text-foreground mb-2 block flex items-center gap-1.5">
                  💵 Budget
                </label>
                <div className="relative">
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-background/80 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer hover:bg-background hover:border-border"
                  >
                    {BUDGET_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg aria-hidden="true" className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Cuisine Filter */}
              <div>
                <label htmlFor="cuisine" className="text-xs font-medium text-foreground mb-2 block flex items-center gap-1.5">
                  🍛 Cuisine
                </label>
                <div className="relative">
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="w-full bg-background/80 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer hover:bg-background hover:border-border"
                  >
                    {CUISINE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg aria-hidden="true" className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-border/50 flex-wrap">
                {userLocation && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full border border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                    <Navigation className="w-3.5 h-3.5" />
                    {locationName || 'Near Me'}
                    <button 
                      type="button"
                      onClick={clearLocation} 
                      className="hover:text-primary/70 transition-colors ml-0.5 p-0.5 rounded-full hover:bg-primary/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {budget && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-accent/20 to-accent/10 text-accent-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-accent/20 shadow-sm hover:shadow-md transition-shadow">
                    {BUDGET_OPTIONS.find(b => b.value === budget)?.label}
                    <button 
                      type="button"
                      onClick={() => setBudget('')} 
                      className="hover:opacity-70 transition-opacity ml-0.5 p-0.5 rounded-full hover:bg-accent/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {cuisine && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-secondary/20 shadow-sm hover:shadow-md transition-shadow">
                    {CUISINE_OPTIONS.find(c => c.value === cuisine)?.label}
                    <button 
                      type="button"
                      onClick={() => setCuisine('')} 
                      className="hover:text-secondary/70 transition-colors ml-0.5 p-0.5 rounded-full hover:bg-secondary/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Chat */}
        <div className={`flex flex-col ${showMapView && !selectedKedai ? 'w-1/3' : showMapView && selectedKedai ? 'w-1/4' : 'w-full'} border-r border-border transition-all duration-300`}>
          {/* Chat Messages */}
          <main className="flex-1 overflow-y-auto px-4 py-4">
            <ChatAiModeBar
              mode={aiMode}
              models={aiModels}
              selectedModel={selectedAiModel}
              staleModel={staleAiModel}
              loadingModels={aiModelsLoading}
              modelsError={aiModelsError}
              disabled={loading}
              onModeChange={setAiMode}
              onModelChange={(model) => {
                setStaleAiModel(null);
                setSelectedAiModel(model);
              }}
              onRefresh={() => void loadAiModels(true)}
            />
            <div className="space-y-4">
              {/* Trending Kedai Card at top when chat is fresh */}
              {messages.length === 1 && !loading && (
                <TrendingKedaiCard onKedaiClick={(kedai) => {
                  setShowMapView(true);
                  setSelectedKedai(kedai);
                }} />
              )}
              
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              
              {loading && (
                <div className="flex gap-3 animate-fade-up">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center animate-pulse-glow">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                    <p className="text-sm text-muted-foreground">
                      {aiMode === 'nine_router' ? 'Routing through 9Router' : 'Asking Gemini'}
                      {userLocation ? ' near you' : ''}...
                    </p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </main>

          {/* Input */}
          <footer className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
            <ChatInput onSend={sendMessage} loading={loading} />
            <p className="text-xs text-center text-muted-foreground mt-2">
              KrackedFood {userLocation && '📍'}
            </p>
          </footer>
        </div>

        {/* Middle Column - Map */}
        {showMapView && (
          <div className={`${selectedKedai ? 'w-1/2' : 'w-2/3'} flex flex-col transition-all duration-300`}>
            <div className="flex-1 relative">
              {googleMapsApiKey ? (
                <InteractiveMap googleMapsApiKey={googleMapsApiKey} />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="text-center p-6">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground mb-1">Map Unavailable</p>
                    <p className="text-xs text-muted-foreground">
                      Please set VITE_GOOGLE_MAPS_API_KEY in your .env file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column - Detail Panel (fixed third column) */}
        {showMapView && selectedKedai && (
          <div className="w-1/4 flex-shrink-0">
            <KedaiDetailPanel
              kedai={selectedKedai}
              foodImage={selectedKedai.thumbnail || null}
              onClose={() => setSelectedKedai(null)}
            />
          </div>
        )}
      </div>

      {/* Location Permission Dialog */}
      <LocationPermissionDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onAllow={getCurrentLocation}
        loading={locationLoading}
      />

      {/* Location Fallback Dialog - when GPS denied */}
      <LocationFallbackDialog
        open={showLocationFallback}
        onClose={() => {
          setShowLocationFallback(false);
          setPendingMessage(null);
        }}
        pendingMessage={pendingMessage}
        onAreaSelect={(area) => {
          if (area && pendingMessage) {
            // Modify the pending message to include the selected area
            const modifiedMessage = pendingMessage.replace(
              /near me|nearby|dekat sini|sekitar sini|near here|around here|berdekatan/gi,
              `kat ${area}`
            );
            processSendMessage(modifiedMessage);
          } else if (pendingMessage) {
            // User skipped - just send without location context
            processSendMessage(pendingMessage);
          }
          setPendingMessage(null);
          setShowLocationFallback(false);
        }}
      />
    </div>
  );
};

export default Index;
