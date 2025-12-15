import { useEffect, useState, useRef, useCallback } from 'react';

interface FlightAnimationProps {
  map: google.maps.Map | null;
  startLocation: { lat: number; lng: number } | null;
  endLocation: { lat: number; lng: number } | null;
  isActive: boolean;
}

interface PixelPosition {
  x: number;
  y: number;
}

export function FlightAnimation({ map, startLocation, endLocation, isActive }: FlightAnimationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [startPixel, setStartPixel] = useState<PixelPosition | null>(null);
  const [endPixel, setEndPixel] = useState<PixelPosition | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pathId] = useState(() => `flight-path-${Math.random().toString(36).substr(2, 9)}`);

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = useCallback((latLng: { lat: number; lng: number }, mapInstance: google.maps.Map): PixelPosition | null => {
    if (!mapInstance || typeof google === 'undefined') return null;
    
    const projection = mapInstance.getProjection();
    if (!projection) return null;
    
    const bounds = mapInstance.getBounds();
    if (!bounds) return null;
    
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const point = projection.fromLatLngToPoint(new google.maps.LatLng(latLng.lat, latLng.lng));
    
    if (!topRight || !bottomLeft || !point) return null;
    
    const scale = Math.pow(2, mapInstance.getZoom() || 0);
    const worldCoordinateNW = projection.fromLatLngToPoint(
      new google.maps.LatLng(
        mapInstance.getBounds()?.getNorthEast().lat() || 0,
        mapInstance.getBounds()?.getSouthWest().lng() || 0
      )
    );
    
    if (!worldCoordinateNW) return null;
    
    return {
      x: (point.x - worldCoordinateNW.x) * scale,
      y: (point.y - worldCoordinateNW.y) * scale,
    };
  }, []);

  // Update pixel positions when map changes
  useEffect(() => {
    if (!map || !startLocation || !endLocation || !isActive) {
      setStartPixel(null);
      setEndPixel(null);
      return;
    }

    const updatePositions = () => {
      const container = map.getDiv();
      setDimensions({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });

      const start = latLngToPixel(startLocation, map);
      const end = latLngToPixel(endLocation, map);
      
      setStartPixel(start);
      setEndPixel(end);
    };

    // Initial update
    updatePositions();

    // Listen to map events
    const listeners = [
      map.addListener('zoom_changed', updatePositions),
      map.addListener('center_changed', updatePositions),
      map.addListener('bounds_changed', updatePositions),
      map.addListener('idle', updatePositions),
    ];

    return () => {
      listeners.forEach(listener => google.maps.event.removeListener(listener));
    };
  }, [map, startLocation, endLocation, isActive, latLngToPixel]);

  // Generate curved path between two points
  const generateArcPath = useCallback((start: PixelPosition, end: PixelPosition): string => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Control point for the arc (creates a curve)
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Perpendicular offset for the curve (arc height is proportional to distance)
    const arcHeight = Math.min(distance * 0.3, 100);
    const angle = Math.atan2(dy, dx);
    const controlX = midX - arcHeight * Math.sin(angle);
    const controlY = midY + arcHeight * Math.cos(angle);
    
    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  }, []);

  if (!isActive || !startPixel || !endPixel || dimensions.width === 0) {
    return null;
  }

  const pathD = generateArcPath(startPixel, endPixel);
  const distance = Math.sqrt(
    Math.pow(endPixel.x - startPixel.x, 2) + Math.pow(endPixel.y - startPixel.y, 2)
  );
  const animationDuration = Math.max(2, Math.min(distance / 100, 6)); // 2-6 seconds based on distance

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      width={dimensions.width}
      height={dimensions.height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gradient for the flight path */}
        <linearGradient id={`${pathId}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`${pathId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Background arc (static) */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(59, 130, 246, 0.2)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Animated dashed line (marching ants effect) */}
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${pathId}-gradient)`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 8"
        filter={`url(#${pathId}-glow)`}
        className="flight-path-animated"
        style={{
          animation: `marchingAnts 1s linear infinite`,
        }}
      />
      
      {/* Airplane icon that follows the path */}
      <g
        className="flight-airplane"
        style={{
          offsetPath: `path('${pathD}')`,
          offsetRotate: 'auto 90deg',
          animation: `flyAlongPath ${animationDuration}s ease-in-out infinite`,
        }}
      >
        {/* Airplane glow */}
        <circle r="12" fill="rgba(59, 130, 246, 0.3)" />
        
        {/* Airplane icon */}
        <g transform="translate(-12, -12) scale(1)">
          <path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />
        </g>
      </g>
      
      {/* Start point indicator */}
      <g transform={`translate(${startPixel.x}, ${startPixel.y})`}>
        <circle r="8" fill="#3b82f6" opacity="0.3">
          <animate
            attributeName="r"
            values="8;16;8"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.1;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
      </g>
      
      {/* End point indicator */}
      <g transform={`translate(${endPixel.x}, ${endPixel.y})`}>
        <circle r="8" fill="#22c55e" opacity="0.3">
          <animate
            attributeName="r"
            values="8;16;8"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.1;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
      </g>
    </svg>
  );
}

