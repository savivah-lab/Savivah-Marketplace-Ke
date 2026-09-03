import { useState, useCallback, useEffect } from "react";

const API_BASE = "https://savivah-backend-py.onrender.com/api";
const PAGE_SIZE = 24;

/**
 * The backend deliberately only returns a bounded page per request (see
 * ProductPage in the Python backend's schemas/product.py) — this hook is
 * the frontend half of that contract. Calling loadMore() again appends the
 * next page using the cursor the backend handed back; changing the search
 * term resets to a fresh first page.
 */
export function useProductPagination(search) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (afterCursor) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (afterCursor) params.set("cursor", afterCursor);

      const res = await fetch(`${API_BASE}/products?${params}`);
      if (!res.ok) throw new Error("Could not load products");
      const page = await res.json();

      // Defensive: if the response isn't the paginated { items, next_cursor }
      // shape we expect (e.g. an old/mismatched backend), fall back to an
      // empty page rather than setting state to `undefined` — that would
      // otherwise crash the product grid's .map() a render later.
      const newItems = Array.isArray(page?.items) ? page.items : Array.isArray(page) ? page : [];
      const nextCursor = page?.next_cursor ?? null;

      setItems((prev) => (afterCursor ? [...prev, ...newItems] : newItems));
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Reset and fetch page one whenever the search term changes.
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchPage(cursor);
  }, [loading, hasMore, cursor, fetchPage]);

  return { items, loading, error, hasMore, loadMore };
}
