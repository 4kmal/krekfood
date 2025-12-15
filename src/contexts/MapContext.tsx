import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Kedai } from '@/types/kedai';

export interface MapLocation {
  lat: number;
  lng: number;
}

interface MapContextType {
  selectedKedai: Kedai | null;
  setSelectedKedai: (kedai: Kedai | null) => void;
  hoveredKedai: Kedai | null;
  setHoveredKedai: (kedai: Kedai | null) => void;
  customStartLocation: MapLocation | null;
  setCustomStartLocation: (location: MapLocation | null) => void;
  userLocation: MapLocation | null;
  setUserLocation: (location: MapLocation | null) => void;
  mapCenter: MapLocation;
  setMapCenter: (location: MapLocation) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  showDirections: boolean;
  setShowDirections: (show: boolean) => void;
  allKedai: Kedai[];
  setAllKedai: (kedai: Kedai[]) => void;
  filteredKedai: Kedai[];
  setFilteredKedai: (kedai: Kedai[]) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

// Default to Malaysia center (Kuala Lumpur area)
const DEFAULT_CENTER: MapLocation = { lat: 3.139, lng: 101.6869 };

// Petronas Twin Towers coordinates
const PETRONAS_TOWERS: MapLocation = { lat: 3.1578, lng: 101.7118 };

export function MapProvider({ children }: { children: ReactNode }) {
  const [selectedKedai, setSelectedKedai] = useState<Kedai | null>(null);
  const [hoveredKedai, setHoveredKedai] = useState<Kedai | null>(null);
  const [customStartLocation, setCustomStartLocation] = useState<MapLocation>(PETRONAS_TOWERS);
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<MapLocation>(PETRONAS_TOWERS);
  const [mapZoom, setMapZoom] = useState(13);
  const [showDirections, setShowDirections] = useState(false);
  const [allKedai, setAllKedai] = useState<Kedai[]>([]);
  const [filteredKedai, setFilteredKedai] = useState<Kedai[]>([]);

  return (
    <MapContext.Provider
      value={{
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
        allKedai,
        setAllKedai,
        filteredKedai,
        setFilteredKedai,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
}
