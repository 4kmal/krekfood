import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

export type MobileTraySnap = 'peek' | 'half' | 'expanded';

const SNAP_ORDER: MobileTraySnap[] = ['peek', 'half', 'expanded'];
const DRAG_THRESHOLD = 8;
const FLING_VELOCITY = 0.5;

function getViewportHeight() {
  if (typeof window === 'undefined') return 800;
  return window.visualViewport?.height || window.innerHeight;
}

function calculateSnapHeights(viewportHeight: number) {
  const maximumHeight = Math.max(320, viewportHeight - 72);
  const peek = Math.min(maximumHeight, Math.max(168, Math.round(viewportHeight * 0.22)));
  const half = Math.min(maximumHeight, Math.max(peek, Math.round(viewportHeight * 0.55)));
  const expanded = Math.min(maximumHeight, Math.max(half, Math.round(viewportHeight * 0.88)));

  return { peek, half, expanded } satisfies Record<MobileTraySnap, number>;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startHeight: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  active: boolean;
  cancelled: boolean;
}

interface UseMobileTrayOptions {
  initialSnap?: MobileTraySnap;
  onDownwardFlingFromPeek?: () => void;
}

export function useMobileTray({
  initialSnap = 'peek',
  onDownwardFlingFromPeek,
}: UseMobileTrayOptions = {}) {
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const snapHeights = useMemo(() => calculateSnapHeights(viewportHeight), [viewportHeight]);
  const [snap, setSnapState] = useState<MobileTraySnap>(initialSnap);
  const [height, setHeightState] = useState(() => calculateSnapHeights(getViewportHeight())[initialSnap]);
  const [isDragging, setIsDragging] = useState(false);
  const heightRef = useRef(height);
  const snapRef = useRef(snap);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);

  const setHeight = useCallback((nextHeight: number) => {
    heightRef.current = nextHeight;
    setHeightState(nextHeight);
  }, []);

  const setSnap = useCallback((nextSnap: MobileTraySnap) => {
    snapRef.current = nextSnap;
    setSnapState(nextSnap);
    setHeight(snapHeights[nextSnap]);
  }, [setHeight, snapHeights]);

  useEffect(() => {
    const updateViewport = () => setViewportHeight(getViewportHeight());
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    setHeight(snapHeights[snapRef.current]);
  }, [setHeight, snapHeights]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const queueHeight = useCallback((nextHeight: number) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const clampedHeight = Math.min(snapHeights.expanded, Math.max(snapHeights.peek, nextHeight));
      setHeight(clampedHeight);
      frameRef.current = null;
    });
  }, [setHeight, snapHeights]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: heightRef.current,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocityY: 0,
      active: false,
      cancelled: false,
    };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.cancelled) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(deltaX) > DRAG_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        drag.cancelled = true;
        return;
      }
      if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
      drag.active = true;
      setIsDragging(true);
    }

    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
    drag.velocityY = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    queueHeight(drag.startHeight - deltaY);
  }, [queueHeight]);

  const finishPointerGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    setIsDragging(false);

    if (!drag.active || drag.cancelled) return;

    if (snapRef.current === 'peek' && drag.velocityY > FLING_VELOCITY) {
      onDownwardFlingFromPeek?.();
      setSnap('peek');
      return;
    }

    const currentIndex = SNAP_ORDER.indexOf(snapRef.current);
    if (Math.abs(drag.velocityY) > FLING_VELOCITY) {
      const direction = drag.velocityY < 0 ? 1 : -1;
      const nextIndex = Math.min(SNAP_ORDER.length - 1, Math.max(0, currentIndex + direction));
      setSnap(SNAP_ORDER[nextIndex]);
      return;
    }

    const nearest = SNAP_ORDER.reduce((closest, candidate) => (
      Math.abs(snapHeights[candidate] - heightRef.current)
        < Math.abs(snapHeights[closest] - heightRef.current)
        ? candidate
        : closest
    ), SNAP_ORDER[0]);
    setSnap(nearest);
  }, [onDownwardFlingFromPeek, setSnap, snapHeights]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const currentIndex = SNAP_ORDER.indexOf(snapRef.current);
    let nextSnap: MobileTraySnap | null = null;

    if (event.key === 'ArrowUp') nextSnap = SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, currentIndex + 1)];
    if (event.key === 'ArrowDown') nextSnap = SNAP_ORDER[Math.max(0, currentIndex - 1)];
    if (event.key === 'Home') nextSnap = 'peek';
    if (event.key === 'End') nextSnap = 'expanded';

    if (nextSnap) {
      event.preventDefault();
      setSnap(nextSnap);
    }
  }, [setSnap]);

  return {
    height,
    isDragging,
    onKeyDown,
    onPointerCancel: finishPointerGesture,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointerGesture,
    setSnap,
    snap,
    snapHeights,
    viewportHeight,
  };
}
