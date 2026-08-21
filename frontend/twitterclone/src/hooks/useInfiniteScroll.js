import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for infinite scrolling using IntersectionObserver.
 * Triggers onLoadMore when sentinel ref enters the viewport.
 */
export const useInfiniteScroll = ({
  hasNextPage,
  isLoading,
  onLoadMore,
  rootMargin = "250px",
  threshold = 0.1,
}) => {
  const sentinelRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const [target] = entries;
      if (target && target.isIntersecting && hasNextPage && !isLoading) {
        onLoadMore();
      }
    },
    [hasNextPage, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null, // viewport
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver, rootMargin, threshold]);

  return { sentinelRef };
};
