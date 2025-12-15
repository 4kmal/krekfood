import { useEffect, useState, useRef, useCallback } from 'react';

interface RoadAnimationProps {
  map: google.maps.Map | null;
  directions: google.maps.DirectionsResult | null;
  isActive: boolean;
  isPlaying: boolean;
  onPlayComplete?: () => void;
}

interface PixelPosition {
  x: number;
  y: number;
}

export function RoadAnimation({ map, directions, isActive, isPlaying, onPlayComplete }: RoadAnimationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pathPoints, setPathPoints] = useState<PixelPosition[]>([]);
  const [routeProgress, setRouteProgress] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const animationRef = useRef<number | null>(null);
  const [pathId] = useState(() => `road-path-${Math.random().toString(36).substr(2, 9)}`);

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = useCallback((latLng: google.maps.LatLng, mapInstance: google.maps.Map): PixelPosition | null => {
    if (!mapInstance || typeof google === 'undefined') return null;
    
    const projection = mapInstance.getProjection();
    if (!projection) return null;
    
    const bounds = mapInstance.getBounds();
    if (!bounds) return null;
    
    const point = projection.fromLatLngToPoint(latLng);
    if (!point) return null;
    
    const scale = Math.pow(2, mapInstance.getZoom() || 0);
    const worldCoordinateNW = projection.fromLatLngToPoint(
      new google.maps.LatLng(
        bounds.getNorthEast().lat(),
        bounds.getSouthWest().lng()
      )
    );
    
    if (!worldCoordinateNW) return null;
    
    return {
      x: (point.x - worldCoordinateNW.x) * scale,
      y: (point.y - worldCoordinateNW.y) * scale,
    };
  }, []);

  // Extract path points from directions
  useEffect(() => {
    if (!map || !directions || !isActive) {
      setPathPoints([]);
      return;
    }

    const updatePath = () => {
      const container = map.getDiv();
      setDimensions({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });

      // Extract all points from the route
      const route = directions.routes[0];
      if (!route || !route.overview_path) return;

      const points: PixelPosition[] = [];
      route.overview_path.forEach((latLng) => {
        const pixel = latLngToPixel(latLng, map);
        if (pixel) {
          points.push(pixel);
        }
      });

      setPathPoints(points);
    };

    updatePath();

    // Listen to map events
    const listeners = [
      map.addListener('zoom_changed', updatePath),
      map.addListener('center_changed', updatePath),
      map.addListener('bounds_changed', updatePath),
      map.addListener('idle', updatePath),
    ];

    return () => {
      listeners.forEach(listener => google.maps.event.removeListener(listener));
    };
  }, [map, directions, isActive, latLngToPixel]);

  // Get path length when path is rendered
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [pathPoints]);

  // Play animation
  useEffect(() => {
    if (!isPlaying || !isActive || pathLength === 0) {
      if (!isPlaying) {
        setRouteProgress(0);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const duration = 6000; // 6 seconds for full road animation
    const startTime = performance.now();
    const startProgress = routeProgress;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutCubic = rawProgress < 0.5
        ? 4 * rawProgress * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
      
      const newProgress = startProgress + (1 - startProgress) * easeInOutCubic;
      setRouteProgress(newProgress);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setRouteProgress(1);
        onPlayComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isActive, pathLength, onPlayComplete]);

  // Generate SVG path from points
  const generatePathD = useCallback((points: PixelPosition[]): string => {
    if (points.length < 2) return '';
    
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, []);

  // Get point and angle at progress along the path
  const getPointAtProgress = useCallback((progress: number): { x: number; y: number; angle: number } | null => {
    if (!pathRef.current || pathLength === 0) return null;
    
    const length = pathLength * progress;
    const point = pathRef.current.getPointAtLength(length);
    
    // Calculate angle from nearby points
    const delta = 5;
    const point1 = pathRef.current.getPointAtLength(Math.max(0, length - delta));
    const point2 = pathRef.current.getPointAtLength(Math.min(pathLength, length + delta));
    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * (180 / Math.PI);
    
    return { x: point.x, y: point.y, angle };
  }, [pathLength]);

  if (!isActive || pathPoints.length < 2 || dimensions.width === 0) {
    return null;
  }

  const pathD = generatePathD(pathPoints);
  const drawnLength = pathLength * routeProgress;
  const currentPoint = getPointAtProgress(routeProgress);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      width={dimensions.width}
      height={dimensions.height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gradient for the road path */}
        <linearGradient id={`${pathId}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`${pathId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feFlood floodColor="#ef4444" floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="coloredBlur" operator="in" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Car shadow filter */}
        <filter id={`${pathId}-car-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.4" />
        </filter>
      </defs>
      
      {/* Background path (faded road outline) */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(239, 68, 68, 0.15)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Progressive drawn path */}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={`url(#${pathId}-gradient)`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${pathId}-glow)`}
        strokeDasharray={pathLength || 1000}
        strokeDashoffset={(pathLength || 1000) - drawnLength}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
      />
      
      {/* Moving car indicator */}
      {currentPoint && (
        <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
          {/* Outer pulse */}
          <circle r="20" fill="rgba(239, 68, 68, 0.15)">
            <animate
              attributeName="r"
              values="15;30;15"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.1;0.3"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Car icon */}
          <g transform={`rotate(${currentPoint.angle})`} filter={`url(#${pathId}-car-shadow)`}>
            {/* Car body */}
            <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            {/* Car roof */}
            <rect x="-6" y="-8" width="10" height="6" rx="2" fill="#dc2626" />
            {/* Windshield */}
            <rect x="-5" y="-7" width="8" height="4" rx="1" fill="rgba(255,255,255,0.6)" />
            {/* Headlights */}
            <circle cx="10" cy="-3" r="2" fill="#fbbf24" />
            <circle cx="10" cy="3" r="2" fill="#fbbf24" />
            {/* Tail lights */}
            <circle cx="-10" cy="-3" r="1.5" fill="#991b1b" />
            <circle cx="-10" cy="3" r="1.5" fill="#991b1b" />
            {/* Wheels */}
            <circle cx="-6" cy="6" r="3" fill="#1f2937" stroke="#111827" strokeWidth="1" />
            <circle cx="6" cy="6" r="3" fill="#1f2937" stroke="#111827" strokeWidth="1" />
            <circle cx="-6" cy="-6" r="3" fill="#1f2937" stroke="#111827" strokeWidth="1" />
            <circle cx="6" cy="-6" r="3" fill="#1f2937" stroke="#111827" strokeWidth="1" />
          </g>
        </g>
      )}
      
      {/* Start marker */}
      {pathPoints.length > 0 && (
        <g transform={`translate(${pathPoints[0].x}, ${pathPoints[0].y})`}>
          <circle r="10" fill="rgba(239, 68, 68, 0.3)">
            <animate
              attributeName="r"
              values="8;14;8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="6" fill="#ef4444" stroke="white" strokeWidth="2" />
          <text y="1" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A</text>
        </g>
      )}
      
      {/* End marker */}
      {pathPoints.length > 0 && (
        <g transform={`translate(${pathPoints[pathPoints.length - 1].x}, ${pathPoints[pathPoints.length - 1].y})`}>
          <circle r="10" fill="rgba(34, 197, 94, 0.3)">
            <animate
              attributeName="r"
              values="8;14;8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="6" fill="#22c55e" stroke="white" strokeWidth="2" />
          <text y="1" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">B</text>
        </g>
      )}
    </svg>
  );
}

