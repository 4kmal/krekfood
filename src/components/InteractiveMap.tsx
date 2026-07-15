import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useMap } from '@/contexts/MapContext';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import type { Kedai } from '@/types/kedai';
import { AlertTriangle, MapPin, Navigation, Star, Clock, Plane, Car } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { FlightAnimation } from './FlightAnimation';
import { RoadAnimation } from './RoadAnimation';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const MALAYSIA_CENTER = { lat: 3.139, lng: 101.6869 };

// Create custom 3D pin SVG marker
const createPinSvg = (color: string, isHovered: boolean, isSelected: boolean) => {
  const scale = isSelected ? 1.3 : isHovered ? 1.15 : 1;
  const width = Math.round(30 * scale);
  const height = Math.round(70 * scale);
  
  // Color variations based on base color
  const colors: Record<string, { light: string; main: string; dark: string; border: string }> = {
    red: { light: '#FAA', main: '#F00', dark: '#600', border: '#900' },
    green: { light: '#AFA', main: '#22c55e', dark: '#065', border: '#090' },
    orange: { light: '#FCA', main: '#f59e0b', dark: '#964', border: '#a60' },
    blue: { light: '#AAF', main: '#3b82f6', dark: '#236', border: '#06a' },
    purple: { light: '#CAF', main: '#8b5cf6', dark: '#426', border: '#60a' },
  };
  
  const c = colors[color] || colors.red;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 30 70">
      <!-- Shadow ellipse -->
      <ellipse cx="15" cy="67" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
      
      <!-- Pin stick -->
      <rect x="13" y="22" width="4" height="45" fill="#737373" rx="1"/>
      
      <!-- Pin head with 3D gradient effect -->
      <defs>
        <radialGradient id="pinGradient_${color}" cx="40%" cy="30%" r="60%" fx="35%" fy="25%">
          <stop offset="0%" stop-color="${c.light}"/>
          <stop offset="45%" stop-color="${c.main}"/>
          <stop offset="100%" stop-color="${c.dark}"/>
        </radialGradient>
        <filter id="pinShadow_${color}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Pin head circle -->
      <circle cx="15" cy="13" r="12" 
        fill="url(#pinGradient_${color})" 
        stroke="${c.border}" 
        stroke-width="1.5"
        filter="url(#pinShadow_${color})"/>
      
      <!-- Highlight reflection -->
      <ellipse cx="11" cy="9" rx="4" ry="3" fill="rgba(255,255,255,0.4)"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Custom marker icons
const createMarkerIcon = (isSelected: boolean, isHovered: boolean) => {
  // Check if google maps is loaded
  if (
    typeof google === 'undefined' ||
    !google.maps ||
    typeof google.maps.Size !== 'function' ||
    typeof google.maps.Point !== 'function'
  ) {
    return undefined;
  }
  
  const color = isSelected ? 'green' : isHovered ? 'orange' : 'red';
  const scale = isSelected ? 1.3 : isHovered ? 1.15 : 1;
  const width = Math.round(30 * scale);
  const height = Math.round(70 * scale);
  
  return {
    url: createPinSvg(color, isHovered, isSelected),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height - 3),
  };
};

interface InteractiveMapProps {
  googleMapsApiKey: string;
  mobileMode?: boolean;
  mobileBottomInset?: number;
}

export function InteractiveMap({
  googleMapsApiKey,
  mobileMode = false,
  mobileBottomInset = 0,
}: InteractiveMapProps) {
  const { reportDiagnostic } = useApiDiagnostics();
  const {
    selectedKedai,
    setSelectedKedai,
    hoveredKedai,
    setHoveredKedai,
    customStartLocation,
    setCustomStartLocation,
    userLocation,
    setUserLocation,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    showDirections,
    setShowDirections,
    isPlacingCustomPin,
    setIsPlacingCustomPin,
    showFlightAnimation,
    setShowFlightAnimation,
    playRouteMode,
    setPlayRouteMode,
    filteredKedai,
  } = useMap();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindowKedai, setInfoWindowKedai] = useState<Kedai | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapFailure, setMapFailure] = useState<string | null>(null);
  
  // Ref to track timeout for closing info window (prevents blinking on hover)
  const infoWindowCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reportMapFailure = useCallback(({
    service,
    code,
    category,
    message,
    status,
    retryable,
  }: {
    service: string;
    code: string;
    category: 'credentials' | 'permission' | 'quota' | 'network' | 'upstream' | 'unknown';
    message: string;
    status?: number;
    retryable: boolean;
  }) => {
    reportDiagnostic({
      provider: 'google_maps',
      service,
      code,
      category,
      severity: 'error',
      message,
      status,
      retryable,
      source: 'Map',
    });
  }, [reportDiagnostic]);

  useEffect(() => {
    const mapsWindow = window as typeof window & { gm_authFailure?: () => void };
    const previousHandler = mapsWindow.gm_authFailure;

    mapsWindow.gm_authFailure = () => {
      setMapFailure('Google Maps could not authenticate this website.');
      reportMapFailure({
        service: 'maps-javascript',
        code: 'GOOGLE_MAPS_AUTH_FAILURE',
        category: 'credentials',
        message: 'Google Maps authentication failed. Check the key, billing, enabled API, and referrer restrictions.',
        retryable: false,
      });
      previousHandler?.();
    };

    return () => {
      if (previousHandler) {
        mapsWindow.gm_authFailure = previousHandler;
      } else {
        delete mapsWindow.gm_authFailure;
      }
    };
  }, [reportMapFailure]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (infoWindowCloseTimeoutRef.current) {
        clearTimeout(infoWindowCloseTimeoutRef.current);
      }
    };
  }, []);

  // Load Google Maps Script
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle map click for custom pin placement
  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (isPlacingCustomPin && e.latLng) {
        const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setCustomStartLocation(location);
        setIsPlacingCustomPin(false);
        toast.success('Custom starting point set!');
      }
    },
    [isPlacingCustomPin, setCustomStartLocation, setIsPlacingCustomPin]
  );

  // Calculate and show directions
  useEffect(() => {
    if (!showDirections || !selectedKedai || (!userLocation && !customStartLocation)) {
      setDirections(null);
      return;
    }

    const startLocation = customStartLocation || userLocation;
    if (!startLocation) return;

    // Check if google maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded yet');
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new google.maps.LatLng(startLocation.lat, startLocation.lng),
        destination: new google.maps.LatLng(selectedKedai.lat, selectedKedai.lon),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
          if (status === google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
            reportMapFailure({
              service: 'directions',
              code: 'GOOGLE_DIRECTIONS_QUOTA',
              category: 'quota',
              message: 'Google Maps Directions quota was exceeded.',
              retryable: true,
            });
          } else if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
            reportMapFailure({
              service: 'directions',
              code: 'GOOGLE_DIRECTIONS_REQUEST_DENIED',
              category: 'permission',
              message: 'Google Maps denied the Directions request. Check API enablement and key restrictions.',
              retryable: false,
            });
          } else if (status === google.maps.DirectionsStatus.UNKNOWN_ERROR) {
            reportMapFailure({
              service: 'directions',
              code: 'GOOGLE_DIRECTIONS_UNAVAILABLE',
              category: 'upstream',
              message: 'Google Maps Directions is temporarily unavailable.',
              retryable: true,
            });
          }
          toast.error('Failed to calculate directions');
        }
      }
    );
  }, [showDirections, selectedKedai, userLocation, customStartLocation, reportMapFailure]);

  // Zoom to selected kedai and show directions
  useEffect(() => {
    if (selectedKedai && map) {
      // Smooth pan and zoom to selected kedai
      map.panTo({ lat: selectedKedai.lat, lng: selectedKedai.lon });
      map.setZoom(16);
      
      if (mobileMode) {
        requestAnimationFrame(() => {
          map.panBy(0, Math.round(mobileBottomInset * 0.35));
        });
      } else {
        // Show info window for selected kedai on desktop.
        setInfoWindowKedai(selectedKedai);
      }
      
      // Auto-enable directions if user location or custom location is set
      if (userLocation || customStartLocation) {
        setShowDirections(true);
      }
    }
  }, [selectedKedai, map, userLocation, customStartLocation, setShowDirections, mobileMode, mobileBottomInset]);

  // Fit bounds when filtered kedai changes
  useEffect(() => {
    if (filteredKedai.length > 0 && map && typeof google !== 'undefined' && google.maps) {
      const bounds = new google.maps.LatLngBounds();
      filteredKedai.forEach((kedai) => {
        bounds.extend({ lat: kedai.lat, lng: kedai.lon });
      });
      
      // Include user location in bounds
      if (userLocation) {
        bounds.extend(userLocation);
      }
      if (customStartLocation) {
        bounds.extend(customStartLocation);
      }
      
      map.fitBounds(bounds, mobileMode ? {
        top: 112,
        right: 24,
        bottom: mobileBottomInset + 24,
        left: 24,
      } : undefined);
    }
  }, [filteredKedai, map, userLocation, customStartLocation, mobileMode, mobileBottomInset]);

  // Marker click handler
  const handleMarkerClick = useCallback(
    (kedai: Kedai) => {
      setSelectedKedai(kedai);
      if (!mobileMode) setInfoWindowKedai(kedai);
    },
    [mobileMode, setSelectedKedai]
  );

  // Info window close handler
  const handleInfoWindowClose = useCallback(() => {
    setInfoWindowKedai(null);
    // Also clear selection when info window is explicitly closed
    if (selectedKedai && infoWindowKedai && selectedKedai.id === infoWindowKedai.id) {
      setSelectedKedai(null);
    }
  }, [selectedKedai, infoWindowKedai, setSelectedKedai]);

  const directionsOptions = useMemo(
    () => ({
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 5,
      },
      suppressMarkers: false,
    }),
    []
  );

  // Info window offset to position it above the marker
  const infoWindowOptions = useMemo(() => {
    if (
      typeof google === 'undefined' ||
      !google.maps ||
      typeof google.maps.Size !== 'function'
    ) {
      return {};
    }
    return {
      pixelOffset: new google.maps.Size(0, -40),
    };
  }, []);

  if (mapFailure) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Google Maps unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{mapFailure}</p>
          <p className="mt-2 text-xs text-muted-foreground">Open API diagnostics for the recommended checks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <LoadScript
        id="krekfood-google-maps-script"
        googleMapsApiKey={googleMapsApiKey}
        onError={() => {
          setMapFailure('The Google Maps script could not be loaded.');
          reportMapFailure({
            service: 'maps-javascript',
            code: 'GOOGLE_MAPS_SCRIPT_LOAD_FAILED',
            category: 'network',
            message: 'The Google Maps JavaScript API failed to load.',
            retryable: true,
          });
        }}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: !mobileMode,
            fullscreenControl: !mobileMode,
            zoomControl: !mobileMode,
            gestureHandling: mobileMode ? 'greedy' : 'auto',
          }}
        >
          {/* User Location Marker */}
          {userLocation &&
            typeof google !== 'undefined' &&
            google.maps &&
            typeof google.maps.Size === 'function' &&
            typeof google.maps.Point === 'function' && (
            <Marker
              position={userLocation}
              icon={{
                url: createPinSvg('blue', false, false),
                scaledSize: new google.maps.Size(30, 70),
                anchor: new google.maps.Point(15, 67),
              }}
              title="Your Location"
            />
          )}

          {/* Custom Start Location Marker */}
          {customStartLocation &&
            typeof google !== 'undefined' &&
            google.maps &&
            typeof google.maps.Size === 'function' &&
            typeof google.maps.Point === 'function' && (
            <Marker
              position={customStartLocation}
              icon={{
                url: createPinSvg('purple', false, false),
                scaledSize: new google.maps.Size(30, 70),
                anchor: new google.maps.Point(15, 67),
              }}
              title="Custom Start Point"
            />
          )}

          {/* Kedai Markers */}
          {filteredKedai.map((kedai) => {
            const isSelected = selectedKedai?.id === kedai.id;
            const isHovered = hoveredKedai?.id === kedai.id;

            return (
              <Marker
                key={kedai.id}
                position={{ lat: kedai.lat, lng: kedai.lon }}
                icon={createMarkerIcon(isSelected, isHovered)}
                onClick={() => handleMarkerClick(kedai)}
                onMouseOver={mobileMode ? undefined : () => {
                  // Clear any pending close timeout
                  if (infoWindowCloseTimeoutRef.current) {
                    clearTimeout(infoWindowCloseTimeoutRef.current);
                    infoWindowCloseTimeoutRef.current = null;
                  }
                  setHoveredKedai(kedai);
                  setInfoWindowKedai(kedai); // Show info window on hover
                }}
                onMouseOut={mobileMode ? undefined : () => {
                  setHoveredKedai(null);
                  // Only close info window if not selected, with a delay to prevent blinking
                  if (!selectedKedai || selectedKedai.id !== kedai.id) {
                    infoWindowCloseTimeoutRef.current = setTimeout(() => {
                      setInfoWindowKedai((current) => {
                        // Only close if still showing this kedai's info window
                        if (current?.id === kedai.id) {
                          return null;
                        }
                        return current;
                      });
                    }, 150);
                  }
                }}
                title={kedai.name}
              />
            );
          })}

          {/* Info Window for selected/hovered marker */}
          {!mobileMode && infoWindowKedai && (
            <InfoWindow
              position={{ lat: infoWindowKedai.lat, lng: infoWindowKedai.lon }}
              onCloseClick={handleInfoWindowClose}
              options={infoWindowOptions}
            >
              <div className="krekfood-map-tooltip box-border w-[280px] max-w-[calc(100vw-48px)] bg-white p-5 pr-10 text-slate-900 sm:w-[300px]">
                {/* Restaurant Name */}
                <h3 className="mb-4 break-words text-lg font-bold leading-snug text-slate-900">
                  {infoWindowKedai.name}
                </h3>
                
                {/* Info Grid */}
                <div className="space-y-3">
                  {/* Location */}
                  {infoWindowKedai.area && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                        <MapPin className="h-4 w-4 text-indigo-700" />
                      </div>
                      <span className="min-w-0 break-words text-sm font-medium text-slate-700">
                        {infoWindowKedai.area}
                      </span>
                    </div>
                  )}
                  
                  {/* Rating */}
                  {infoWindowKedai.rating && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-600" />
                      </div>
                      <span className="text-sm font-bold text-amber-700">{infoWindowKedai.rating}</span>
                      {infoWindowKedai.totalReviews && (
                        <span className="text-xs font-medium text-slate-500">
                          ({infoWindowKedai.totalReviews} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Signature Dish */}
                  {infoWindowKedai.signature && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100">
                        <span className="text-xs">🍽️</span>
                      </div>
                      <span className="break-words text-sm italic leading-5 text-slate-700">
                        {infoWindowKedai.signature}
                      </span>
                    </div>
                  )}
                  
                  {/* Price Level */}
                  {infoWindowKedai.price_level && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-xs font-bold text-emerald-700">$</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">
                        {infoWindowKedai.price_level}
                      </span>
                    </div>
                  )}
                  
                  {/* Distance */}
                  {infoWindowKedai.distanceFormatted && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Navigation className="h-4 w-4 text-blue-700" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {infoWindowKedai.distanceFormatted} away
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action Button */}
                <button
                  type="button"
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-[0.98]"
                  style={{ 
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    border: 'none'
                  }}
                  onClick={() => {
                    setSelectedKedai(infoWindowKedai);
                    setShowDirections(true);
                  }}
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </InfoWindow>
          )}

          {/* Directions Polyline */}
          {directions && <DirectionsRenderer directions={directions} options={directionsOptions} />}
        </GoogleMap>
      </LoadScript>

      {/* Flight Animation Overlay (Plane Arc) */}
      <FlightAnimation
        map={map}
        startLocation={customStartLocation || userLocation}
        endLocation={selectedKedai ? { lat: selectedKedai.lat, lng: selectedKedai.lon } : null}
        isActive={showDirections && showFlightAnimation && !!selectedKedai}
      />

      {/* Road Animation Overlay (Car following actual road) */}
      <RoadAnimation
        map={map}
        directions={directions}
        isActive={showDirections && !!selectedKedai}
        isPlaying={playRouteMode}
        onPlayComplete={() => setPlayRouteMode(false)}
      />

      {/* Map Controls Overlay */}
      {!mobileMode && (
      <div className="absolute left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2" style={{ bottom: '200px', minWidth: '140px', width: '150px' }}>
        <Button
          size="sm"
          variant={isPlacingCustomPin ? 'default' : 'outline'}
          className="w-full justify-start whitespace-nowrap"
          style={!isPlacingCustomPin ? { backgroundColor: 'rgba(106, 122, 154, 0.9)', color: '#fffafa', borderColor: 'transparent' } : {}}
          onClick={() => setIsPlacingCustomPin(!isPlacingCustomPin)}
        >
          <svg width="16" height="24" viewBox="0 0 30 70" className="mr-2 flex-shrink-0">
            <rect x="13" y="22" width="4" height="35" fill="#737373" rx="1"/>
            <circle cx="15" cy="13" r="10" fill="#ef4444" stroke="#900" strokeWidth="1.5"/>
            <ellipse cx="12" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.4)"/>
          </svg>
          {isPlacingCustomPin ? 'Tap Map' : 'Set Pin'}
        </Button>

        {customStartLocation && (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start whitespace-nowrap"
            onClick={() => {
              setCustomStartLocation(null);
              setShowDirections(false);
              toast.info('Custom pin removed');
            }}
          >
            Clear Pin
          </Button>
        )}

        {showDirections && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start whitespace-nowrap"
              onClick={() => setShowDirections(false)}
            >
              Hide Route
            </Button>
            <Button
              size="sm"
              variant={showFlightAnimation ? 'default' : 'outline'}
              className="w-full justify-start whitespace-nowrap"
              onClick={() => setShowFlightAnimation(!showFlightAnimation)}
            >
              <Plane className="w-4 h-4 mr-2" />
              {showFlightAnimation ? 'Flight On' : 'Flight Off'}
            </Button>
            <Button
              size="sm"
              variant={playRouteMode ? 'default' : 'outline'}
              className="w-full justify-start whitespace-nowrap"
              style={!playRouteMode ? { backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', borderColor: 'transparent' } : {}}
              onClick={() => setPlayRouteMode(!playRouteMode)}
            >
              <Car className="w-4 h-4 mr-2" />
              {playRouteMode ? 'Driving...' : 'Play Road'}
            </Button>
          </>
        )}
      </div>
      )}

      {/* Map Legend */}
      {!mobileMode && (
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <h4 className="text-xs font-semibold mb-2">Map Legend</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <svg width="12" height="20" viewBox="0 0 30 70" className="flex-shrink-0">
              <rect x="13" y="22" width="4" height="35" fill="#737373" rx="1"/>
              <circle cx="15" cy="13" r="10" fill="#3b82f6" stroke="#06a" strokeWidth="1.5"/>
              <ellipse cx="12" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.4)"/>
            </svg>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="20" viewBox="0 0 30 70" className="flex-shrink-0">
              <rect x="13" y="22" width="4" height="35" fill="#737373" rx="1"/>
              <circle cx="15" cy="13" r="10" fill="#8b5cf6" stroke="#60a" strokeWidth="1.5"/>
              <ellipse cx="12" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.4)"/>
            </svg>
            <span>Custom Start</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="20" viewBox="0 0 30 70" className="flex-shrink-0">
              <rect x="13" y="22" width="4" height="35" fill="#737373" rx="1"/>
              <circle cx="15" cy="13" r="10" fill="#ef4444" stroke="#900" strokeWidth="1.5"/>
              <ellipse cx="12" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.4)"/>
            </svg>
            <span>Restaurant</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="20" viewBox="0 0 30 70" className="flex-shrink-0">
              <rect x="13" y="22" width="4" height="35" fill="#737373" rx="1"/>
              <circle cx="15" cy="13" r="10" fill="#22c55e" stroke="#090" strokeWidth="1.5"/>
              <ellipse cx="12" cy="10" rx="3" ry="2" fill="rgba(255,255,255,0.4)"/>
            </svg>
            <span>Selected</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
