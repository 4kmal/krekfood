import { useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useMap } from '@/contexts/MapContext';
import type { Kedai } from '@/types/kedai';
import { MapPin, Navigation, Star, Clock, Plane, Car } from 'lucide-react';
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
  if (typeof google === 'undefined' || !google.maps) {
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
}

export function InteractiveMap({ googleMapsApiKey }: InteractiveMapProps) {
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
    filteredKedai,
  } = useMap();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindowKedai, setInfoWindowKedai] = useState<Kedai | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isPlacingCustomPin, setIsPlacingCustomPin] = useState(false);
  const [showFlightAnimation, setShowFlightAnimation] = useState(true);
  const [playRouteMode, setPlayRouteMode] = useState(false);

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
    [isPlacingCustomPin, setCustomStartLocation]
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
          toast.error('Failed to calculate directions');
        }
      }
    );
  }, [showDirections, selectedKedai, userLocation, customStartLocation]);

  // Zoom to selected kedai and show directions
  useEffect(() => {
    if (selectedKedai && map) {
      // Smooth pan and zoom to selected kedai
      map.panTo({ lat: selectedKedai.lat, lng: selectedKedai.lon });
      map.setZoom(16);
      
      // Show info window for selected kedai
      setInfoWindowKedai(selectedKedai);
      
      // Auto-enable directions if user location or custom location is set
      if (userLocation || customStartLocation) {
        setShowDirections(true);
      }
    }
  }, [selectedKedai, map, userLocation, customStartLocation, setShowDirections]);

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
      
      map.fitBounds(bounds);
    }
  }, [filteredKedai, map, userLocation, customStartLocation]);

  // Marker click handler
  const handleMarkerClick = useCallback(
    (kedai: Kedai) => {
      setSelectedKedai(kedai);
      setInfoWindowKedai(kedai);
    },
    [setSelectedKedai]
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
    if (typeof google === 'undefined' || !google.maps) {
      return {};
    }
    return {
      pixelOffset: new google.maps.Size(0, -40),
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true,
          }}
        >
          {/* User Location Marker */}
          {userLocation && typeof google !== 'undefined' && google.maps && (
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
          {customStartLocation && typeof google !== 'undefined' && google.maps && (
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
                onMouseOver={() => {
                  setHoveredKedai(kedai);
                  setInfoWindowKedai(kedai); // Show info window on hover
                }}
                onMouseOut={() => {
                  setHoveredKedai(null);
                  // Only close info window if not selected
                  if (!selectedKedai || selectedKedai.id !== kedai.id) {
                    setInfoWindowKedai(null);
                  }
                }}
                title={kedai.name}
              />
            );
          })}

          {/* Info Window for selected/hovered marker */}
          {infoWindowKedai && (
            <InfoWindow
              position={{ lat: infoWindowKedai.lat, lng: infoWindowKedai.lon }}
              onCloseClick={handleInfoWindowClose}
              options={infoWindowOptions}
            >
              <div className="p-4 max-w-xs min-w-[220px]" style={{ color: '#f5f5f5', margin: '-12px' }}>
                <h3 className="font-bold text-base mb-2" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{infoWindowKedai.name}</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <MapPin className="w-3 h-3" />
                    <span>{infoWindowKedai.area}</span>
                  </div>
                  {infoWindowKedai.rating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium" style={{ color: '#ffffff' }}>{infoWindowKedai.rating}</span>
                      {infoWindowKedai.totalReviews && (
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>({infoWindowKedai.totalReviews})</span>
                      )}
                    </div>
                  )}
                  {infoWindowKedai.signature && (
                    <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.8)' }}>🍽️ {infoWindowKedai.signature}</p>
                  )}
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{infoWindowKedai.price_level}</p>
                  {infoWindowKedai.distanceFormatted && (
                    <div className="flex items-center gap-1.5" style={{ color: '#93c5fd' }}>
                      <Navigation className="w-3 h-3" />
                      <span className="text-xs font-medium">{infoWindowKedai.distanceFormatted} away</span>
                    </div>
                  )}
                </div>
                <button
                  className="w-full mt-3 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(4px)'
                  }}
                  onClick={() => {
                    setSelectedKedai(infoWindowKedai);
                    setShowDirections(true);
                  }}
                >
                  <Navigation className="w-3 h-3" />
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
      <div className="absolute left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2" style={{ bottom: '160px', minWidth: '140px', width: '150px' }}>
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

      {/* Map Legend */}
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
    </div>
  );
}
