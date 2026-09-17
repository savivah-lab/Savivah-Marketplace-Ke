import { useState, useCallback, useEffect } from "react";

const API_BASE = "https://savivah-backend-firestore.onrender.com/api";
const PAGE_SIZE = 24;

export function useProductPagination(search = "", filters = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    category = "",
    minPrice = "",
    maxPrice = "",
    inStock = false,
    verifiedSeller = false,
    sort = "relevance",
  } = filters;

  const fetchPage = useCallback(
    async (afterCursor = null) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        params.set("limit", String(PAGE_SIZE));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (category) {
          params.set("category", category);
        }

        if (minPrice !== "" && minPrice != null) {
          params.set("min_price", String(minPrice));
        }

        if (maxPrice !== "" && maxPrice != null) {
          params.set("max_price", String(maxPrice));
        }

        if (inStock) {
          params.set("in_stock", "true");
        }

        if (verifiedSeller) {
          params.set("verified_seller", "true");
        }

        if (sort && sort !== "relevance") {
          params.set("sort", sort);
        }

        if (afterCursor) {
          params.set("cursor", afterCursor);
        }

        const response = await fetch(
          `${API_BASE}/products?${params.toString()}`
        );

        if (!response.ok) {
          let message = "Could not load products";

          try {
            const data = await response.json();
            message = data?.detail || data?.error || message;
          } catch {
            // Keep default message.
          }

          throw new Error(message);
        }

        const page = await response.json();

        const newItems = Array.isArray(page?.items)
          ? page.items
          : Array.isArray(page)
            ? page
            : [];

        const nextCursor = page?.next_cursor ?? null;

        setItems((previous) =>
          afterCursor
            ? [...previous, ...newItems]
            : newItems
        );

        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load products"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      verifiedSeller,
      sort,
    ]
  );

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);

    fetchPage(null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && cursor) {
      fetchPage(cursor);
    }
  }, [loading, hasMore, cursor, fetchPage]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
  };
}
