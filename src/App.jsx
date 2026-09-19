import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, Store, Package, Plus, Trash2, X, User, Heart, Settings, Home, ShieldCheck, CreditCard, KeyRound, Check,
  CheckCircle2, Clock, Truck, RotateCcw, TrendingUp, LayoutGrid,
  Wallet, Search, LogIn, LogOut, UserPlus, Loader2, AlertTriangle, ChevronDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, BadgeCheck
} from "lucide-react";
import { useProductPagination } from "./hooks/useProductPagination";

const GOLD = "#C9971C";
const GOLD_DARK = "#9C740F";
const INK = "#161513";
const API_BASE = "https://savivah-backend-firestore.onrender.com/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function money(n) {
  return "KES " + Math.round(Number(n) || 0).toLocaleString();
}

const STATUS_META = {
  pending_payment: { label: "Awaiting payment", color: "#8a8471", bg: "#F1EEE3", icon: Clock },
  escrow_held: { label: "In escrow", color: "#9C740F", bg: "#FBF1DA", icon: Clock },
  shipped: { label: "Shipped", color: "#1D4E89", bg: "#E7EFF9", icon: Truck },
  delivered: { label: "Delivered", color: "#2E7D32", bg: "#E9F5EA", icon: CheckCircle2 },
  refunded: { label: "Refunded", color: "#B3261E", bg: "#FBEAE9", icon: RotateCcw },
  disputed: { label: "Disputed", color: "#B3261E", bg: "#FBEAE9", icon: AlertTriangle },
};

export default function SavivahApp() {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("savivah_auth");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }); // { token, user } — customer/seller only; admin lives in a separate app entirely

  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem("savivah_role") || "customer";
    } catch {
      return "customer";
    }
  });
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", minPrice: "", maxPrice: "", inStock: false, verifiedSeller: false, sort: "relevance" });
  const [toast, setToast] = useState(null);
  const [customerTab, setCustomerTab] = useState("shop");
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("savivah_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showSellerApplication, setShowSellerApplication] = useState(false);

  const { items: products, loading: loadingProducts, error: productsError, hasMore, loadMore } = useProductPagination(search, filters);
  const apiDown = Boolean(productsError);

  useEffect(() => {
    if (auth) {
      localStorage.setItem("savivah_auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("savivah_auth");
    }
  }, [auth]);

  useEffect(() => {
    localStorage.setItem("savivah_role", role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem("savivah_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (auth?.user?.role === "seller") setRole("seller");
    else if (role === "seller") setRole("customer");
  }, [auth, role]);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const apiFetch = useCallback(async (path, opts = {}) => {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || data?.detail || `Request failed (${res.status})`);
    return data;
  }, [auth]);

  const toggleWishlist = (product) => {
    setWishlist((items) => {
      const exists = items.some((item) => item.id === product.id);
      notify(exists ? `Removed "${product.name}" from wishlist` : `Saved "${product.name}" to wishlist`);
      return exists ? items.filter((item) => item.id !== product.id) : [...items, product];
    });
  };

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) return c.map((i) => (i.id === product.id ? { ...i, qty: Math.min(i.qty + 1, product.stock) } : i));
      return [...c, { ...product, qty: 1 }];
    });
    notify(`Added "${product.name}" to cart`);
  };
  const updateQty = (id, qty) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const logout = () => {
    localStorage.removeItem("savivah_auth");
    localStorage.removeItem("savivah_role");
    setAuth(null);
    setRole("customer");
    notify("Logged out");
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#FAF9F5", minHeight: "100vh", color: INK }}>
      <TopBar role={role} setRole={setRole} cartCount={cartCount} onCartClick={() => setShowCart(true)}
        auth={auth} onLoginClick={() => setShowAuth(true)} onLogout={logout} customerTab={customerTab} setCustomerTab={setCustomerTab} />

      {toast && <Toast msg={toast} />}
      {apiDown && (
        <div style={{ background: "#FBEAE9", color: "#B3261E", padding: "10px 20px", fontSize: 13, textAlign: "center" }}>
          Can't reach the Savivah API right now. If it's been idle, Render's free tier can take up to a minute to wake up — try refreshing shortly.
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 60px" }}>
        {role === "customer" && (
          <CustomerView products={products} loading={loadingProducts} search={search} setSearch={setSearch}
            filters={filters} setFilters={setFilters} addToCart={addToCart} hasMore={hasMore} loadMore={loadMore}
            auth={auth} apiFetch={apiFetch} notify={notify} customerTab={customerTab} setCustomerTab={setCustomerTab}
            wishlist={wishlist} toggleWishlist={toggleWishlist} cartCount={cartCount}
            onBecomeSeller={() => setShowSellerApplication(true)} />
        )}
        {role === "seller" && (
          <SellerView auth={auth} apiFetch={apiFetch} notify={notify} requireLogin={() => setShowAuth(true)} />
        )}
      </div>

      <Footer />

      {showCart && (
        <CartDrawer cart={cart} onClose={() => setShowCart(false)} updateQty={updateQty} removeFromCart={removeFromCart}
          total={cartTotal} auth={auth} apiFetch={apiFetch} notify={notify}
          requireLogin={() => { setShowCart(false); setShowAuth(true); }}
          onOrderPlaced={() => { setCart([]); setShowCart(false); setShowThankYou(true); }} />
      )}

      {showThankYou && <ThankYouModal onClose={() => setShowThankYou(false)} />}

      {showSellerApplication && (
        <SellerApplicationModal
          auth={auth}
          apiFetch={apiFetch}
          notify={notify}
          onClose={() => setShowSellerApplication(false)}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthed={(a) => {
            setAuth(a);
            setRole(a.user.role === "seller" ? "seller" : "customer");
            setShowAuth(false);
            notify(`Welcome, ${a.user.fullName || a.user.email}`);
          }}
        />
      )}
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff",
      padding: "10px 20px", borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}>
      {msg}
    </div>
  );
}

function ThankYouModal({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,12,0.45)" }} />
      <div style={{ position: "relative", width: 380, maxWidth: "90vw", background: "#fff", borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E9F5EA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle2 size={28} color="#2E7D32" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 8 }}>Thank you for shopping with us!</div>
        <p style={{ fontSize: 13.5, color: "#77715f", lineHeight: 1.5, margin: "0 0 8px" }}>
          Your order has been placed. We opened Pesapal in a new tab to complete payment — once that's done, your payment is held safely in escrow until delivery is confirmed.
        </p>
        <p style={{ fontSize: 13.5, color: "#77715f", lineHeight: 1.5, margin: "0 0 24px" }}>
          <b>Expected delivery: within 2 days.</b>
        </p>
        <button onClick={onClose} style={{ padding: "11px 28px", borderRadius: 8, border: "none", background: GOLD,
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Continue shopping
        </button>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img src="/savivah-mark-square.png" alt="" width="34" height="34" style={{ display: "block" }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.5,
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          SAVIVAH
        </span>
        <span style={{ fontSize: 11, color: "#7A7669", fontWeight: 600, marginLeft: 4 }}>marketplace</span>
      </div>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: INK, color: "#D8D3C6", marginTop: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 28px", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <img src="/savivah-mark-square.png" alt="" width="28" height="28" />
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>SAVIVAH</span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#A8A399", margin: 0, maxWidth: 260 }}>
            A multi-vendor marketplace based in Kenya. Every payment is held in escrow until delivery is confirmed.
          </p>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Marketplace</div>
          <FooterLink label="Browse products" />
          <FooterLink label="Become a seller" />
          <FooterLink label="How escrow works" />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Support</div>
          <FooterLink label="Contact us" />
          <FooterLink label="Delivery with Fargo" />
          <FooterLink label="Payments via Pesapal" />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Company</div>
          <div style={{ fontSize: 12.5, color: "#A8A399", lineHeight: 1.8 }}>
            Savivah Technologies Limited<br />Nairobi, Kenya
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #2E2A22", padding: "16px 20px", textAlign: "center", fontSize: 11.5, color: "#8A8577" }}>
        © {year} Savivah Technologies Limited. All rights reserved.
      </div>
    </footer>
  );
}

function FooterLink({ label }) {
  return (
    <div style={{ fontSize: 12.5, color: "#A8A399", marginBottom: 8, cursor: "default" }}>{label}</div>
  );
}

function TopBar({ role, setRole, cartCount, onCartClick, auth, onLoginClick, onLogout, customerTab, setCustomerTab }) {
  const tabs = [
    { key: "customer", label: "Marketplace", icon: LayoutGrid },
    ...(auth?.user?.role === "seller" ? [{ key: "seller", label: "Seller dashboard", icon: Store }] : []),
  ];
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #ECE8DD", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Logo />
        <div style={{ display: "flex", gap: 4, background: "#F4F1E8", borderRadius: 10, padding: 4 }}>
          {tabs.map((t) => {
            const Icon = t.icon; const active = role === t.key;
            return (
              <button key={t.key} onClick={() => { setRole(t.key); if (t.key === "customer" && setCustomerTab) setCustomerTab("shop"); }} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none",
                cursor: "pointer", fontSize: 13.5, fontWeight: 600, background: active ? INK : "transparent",
                color: active ? "#fff" : "#5B564A" }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {role === "customer" && (
            <>
              <button onClick={() => setCustomerTab && setCustomerTab("dashboard")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px",
                borderRadius: 8, border: "1px solid #E4DFD0", background: "#fff", cursor: "pointer", fontWeight: 600,
                fontSize: 13, color: INK }}>
                <User size={15} color={GOLD_DARK} /> Account
              </button>
              <button onClick={onCartClick} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
                borderRadius: 8, border: `1px solid ${GOLD}`, background: "#fff", cursor: "pointer", fontWeight: 600,
                fontSize: 14, color: INK, position: "relative" }}>
                <ShoppingCart size={17} color={GOLD_DARK} /> Cart
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: -8, right: -8, background: GOLD, color: "#fff", borderRadius: "50%",
                  width: 20, height: 20, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
              )}
              </button>
            </>
          )}
          {auth ? (
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
              borderRadius: 8, border: "1px solid #E4DFD0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <LogOut size={14} /> {auth.user.fullName || auth.user.email}
            </button>
          ) : (
            <button onClick={onLoginClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
              borderRadius: 8, border: "none", background: INK, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <LogIn size={14} /> Log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onAuthed }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", password: "" });
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email: form.email, password: form.password } : { ...form, role: "customer" };
      const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (mode === "login" && res.status === 403 && /verify/i.test(data?.detail || "")) {
          setStep("verify");
        }
        throw new Error(data?.error || data?.detail || "Something went wrong");
      }
      if (mode === "register" && data?.user && data.user.emailVerified === false) {
        setStep("verify");
        return;
      }
      onAuthed(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || "Invalid verification code");
      onAuthed(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const resend = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || "Could not resend code");
      setError("");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleGoogleCredential = useCallback(async (response) => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: response.credential, role: "customer" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.detail || "Google sign-in failed");
      onAuthed(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [onAuthed]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== "form") return;
    const renderButton = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 332 });
    };
    if (window.google) renderButton();
    else { const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = renderButton; document.body.appendChild(script); }
  }, [handleGoogleCredential, step]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,12,0.4)" }} />
      <div style={{ position: "relative", width: 380, maxWidth: "90vw", background: "#fff", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{step === "verify" ? "Verify your email" : mode === "login" ? "Log in" : "Create an account"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        {step === "verify" ? (
          <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#FBF1DA", borderRadius: 8, padding: 12, fontSize: 12.5, color: "#6E5A1A" }}>We sent a 6-digit verification code to <b>{form.email}</b>.</div>
            <input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ ...inputStyle, textAlign: "center", letterSpacing: 6, fontSize: 20 }} required />
            {error && <div style={{ fontSize: 12.5, color: "#B3261E" }}>{error}</div>}
            <button disabled={loading || code.length !== 6} style={{ padding: "11px 0", borderRadius: 8, border: "none", background: GOLD, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{loading ? "Verifying..." : "Verify email"}</button>
            <button type="button" onClick={resend} disabled={loading} style={{ padding: "9px 0", borderRadius: 8, border: "1px solid #E4DFD0", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Resend code</button>
          </form>
        ) : (
          <>
            {GOOGLE_CLIENT_ID && <><div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", marginBottom: 14 }} /><div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 16px", color: "#9a9484", fontSize: 12 }}><div style={{ flex: 1, height: 1, background: "#ECE8DD" }} />or continue with email<div style={{ flex: 1, height: 1, background: "#ECE8DD" }} /></div></>}
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "register" && <><input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inputStyle} required /><input placeholder="Phone number (07...)" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} style={inputStyle} required /></>}
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} required />
              <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} required />
              {error && <div style={{ fontSize: 12.5, color: "#B3261E" }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ padding: "11px 0", borderRadius: 8, border: "none", background: GOLD, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{loading ? <Loader2 size={15} className="spin" /> : mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}{mode === "login" ? "Log in" : "Create account"}</button>
            </form>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#77715f" }}>{mode === "login" ? "New to Savivah? " : "Already have an account? "}<button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ background: "none", border: "none", color: GOLD_DARK, fontWeight: 700, cursor: "pointer" }}>{mode === "login" ? "Create one" : "Log in"}</button></div>
          </>
        )}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 16, padding: "36px 28px",
      background: `linear-gradient(135deg, ${INK} 0%, #2A2620 100%)`, marginBottom: 24,
    }}>
      <div className="hero-blob" style={{
        position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%",
        background: `radial-gradient(circle, ${GOLD}55 0%, transparent 70%)`, pointerEvents: "none",
      }} />
      <div className="hero-blob-2" style={{
        position: "absolute", bottom: -50, left: 60, width: 140, height: 140, borderRadius: "50%",
        background: `radial-gradient(circle, ${GOLD}33 0%, transparent 70%)`, pointerEvents: "none",
      }} />
      <div style={{ position: "relative" }}>
        <h1 className="hero-shimmer-text" style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>
          Shop Kenya's trusted marketplace
        </h1>
        <p style={{ color: "#D8D3C6", fontSize: 14, margin: 0, maxWidth: 480, lineHeight: 1.5 }}>
          Every store here is independently owned. Your payment is held safely in escrow until delivery is confirmed — so you shop with confidence.
        </p>
      </div>
    </div>
  );
}

function getProductImages(product) {
  const urls = Array.isArray(product?.image_urls) ? product.image_urls.filter(Boolean) : [];
  if (urls.length) return urls;
  return product?.image_url ? [product.image_url] : [];
}

function ProductImage({ src, name, onClick, count = 0 }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);

  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", aspectRatio: "4 / 3", background: "#F4F1E8", border: "none", padding: 0,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
      cursor: onClick ? "zoom-in" : "default",
    }} aria-label={onClick ? `View photos of ${name || "product"}` : undefined}>
      {failed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, color: "#B8B09D" }}>
          <Package size={42} strokeWidth={1.4} />
          <span style={{ fontSize: 11.5, fontWeight: 600 }}>Image coming soon</span>
        </div>
      ) : (
        <img src={src} alt={name || "Product"} onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center" }} />
      )}
      {count > 1 && !failed && (
        <span style={{ position: "absolute", right: 8, bottom: 8, background: "rgba(22,21,19,.82)", color: "#fff",
          borderRadius: 999, padding: "4px 8px", fontSize: 10.5, fontWeight: 700 }}>
          {count} photos
        </span>
      )}
    </button>
  );
}

function ProductGalleryModal({ product, onClose, addToCart }) {
  const images = getProductImages(product);
  const [index, setIndex] = useState(0);

  useEffect(() => { setIndex(0); }, [product?.id]);
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, images.length, onClose]);

  if (!product) return null;
  const current = images[index];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(12,11,9,.72)" }} />
      <div style={{ position: "relative", width: 900, maxWidth: "96vw", maxHeight: "94vh", background: "#fff", borderRadius: 16,
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", right: 12, top: 12, zIndex: 2, width: 36, height: 36,
          borderRadius: "50%", border: "none", background: "rgba(255,255,255,.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={19} />
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22, padding: 22 }}>
          <div>
            <div style={{ position: "relative", background: "#F4F1E8", borderRadius: 12, overflow: "hidden", aspectRatio: "1 / 1" }}>
              {current ? <img src={current} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> :
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#B8B09D" }}><Package size={58} /></div>}
              {images.length > 1 && <>
                <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38,
                  borderRadius: "50%", border: "none", background: "rgba(255,255,255,.9)", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? .4 : 1 }}><ChevronLeft size={20} /></button>
                <button disabled={index === images.length - 1} onClick={() => setIndex((i) => i + 1)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38,
                  borderRadius: "50%", border: "none", background: "rgba(255,255,255,.9)", cursor: index === images.length - 1 ? "default" : "pointer", opacity: index === images.length - 1 ? .4 : 1 }}><ChevronRight size={20} /></button>
              </>}
            </div>
            {images.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
              {images.map((url, i) => <button key={`${url}-${i}`} onClick={() => setIndex(i)} style={{ width: 66, height: 66, flex: "0 0 auto", padding: 2,
                borderRadius: 8, border: `2px solid ${i === index ? GOLD : "#E4DFD0"}`, background: "#fff", cursor: "pointer", overflow: "hidden" }}>
                <img src={url} alt={`${product.name} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 5 }} />
              </button>)}
            </div>}
            {images.length > 1 && <div style={{ textAlign: "center", fontSize: 11.5, color: "#8A8471", marginTop: 7 }}>{index + 1} / {images.length}</div>}
          </div>

          <div style={{ padding: "8px 2px" }}>
            <div style={{ fontSize: 10.5, color: GOLD_DARK, fontWeight: 700, marginBottom: 8 }}>{product.store_name || "Savivah seller"}</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 23, lineHeight: 1.25 }}>{product.name}</h2>
            {product.category && <div style={{ fontSize: 11.5, color: "#77715F", textTransform: "capitalize", marginBottom: 12 }}>{product.category}</div>}
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>{money(product.price)}</div>
            <div style={{ fontSize: 12.5, color: "#5F5A50", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16 }}>
              {product.description || "No description provided."}
            </div>
            <div style={{ fontSize: 12, color: Number(product.stock) > 0 ? "#2E7D32" : "#B3261E", fontWeight: 700, marginBottom: 16 }}>
              {Number(product.stock) > 0 ? `${product.stock} in stock` : "Out of stock"}
            </div>
            <button onClick={() => { addToCart(product); onClose(); }} disabled={Number(product.stock) <= 0} style={{ width: "100%", padding: 12,
              borderRadius: 8, border: "none", background: Number(product.stock) > 0 ? INK : "#D9D4C4", color: "#fff", fontWeight: 700, cursor: Number(product.stock) > 0 ? "pointer" : "not-allowed" }}>
              <Plus size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} /> Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const MARKET_CATEGORIES = [
  "Electronics", "Phones & Accessories", "Computers & Accessories", "Fashion", "Shoes & Bags",
  "Beauty & Personal Care", "Home & Kitchen", "Appliances", "Sports & Outdoors", "Baby & Kids",
  "Books & Stationery", "Health & Wellness", "Automotive", "Tools & Hardware", "Garden & Agriculture",
  "Pet Supplies", "Arts & Crafts", "Groceries & Household",
];

function CustomerView({ products, loading, search, setSearch, filters, setFilters, addToCart, hasMore, loadMore, auth, apiFetch, notify, customerTab, setCustomerTab, wishlist, toggleWishlist, cartCount, onBecomeSeller }) {
  const [galleryProduct, setGalleryProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  if (customerTab !== "shop") {
    return (
      <CustomerDashboard
        auth={auth}
        tab={customerTab}
        setTab={setCustomerTab}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
        cartCount={cartCount}
        onBecomeSeller={onBecomeSeller}
        apiFetch={apiFetch}
        notify={notify}
      />
    );
  }

  const visibleProducts = products.filter((p) => {
    const price = Number(p.price) || 0;
    if (filters.minPrice !== "" && price < Number(filters.minPrice)) return false;
    if (filters.maxPrice !== "" && price > Number(filters.maxPrice)) return false;
    if (filters.inStock && Number(p.stock) <= 0) return false;
    if (filters.verifiedSeller && !p.store_verified) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === "price_asc") return Number(a.price) - Number(b.price);
    if (filters.sort === "price_desc") return Number(b.price) - Number(a.price);
    if (filters.sort === "newest") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    return 0;
  });

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters({ category: "", minPrice: "", maxPrice: "", inStock: false, verifiedSeller: false, sort: "relevance" });
  const activeFilterCount = [filters.category, filters.minPrice, filters.maxPrice, filters.inStock, filters.verifiedSeller].filter(Boolean).length;

  return (
    <div>
      <Hero />
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 360px", maxWidth: 620 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#9a9484" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8, border: "1px solid #E4DFD0", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 8,
          border: `1px solid ${activeFilterCount ? GOLD : "#E4DFD0"}`, background: activeFilterCount ? "#FBF1DA" : "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          <SlidersHorizontal size={15} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>
        <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E4DFD0", background: "#fff", fontSize: 13 }}>
          <option value="relevance">Sort: Relevance</option><option value="newest">Newest</option><option value="price_asc">Price: Low to high</option><option value="price_desc">Price: High to low</option>
        </select>
      </div>

      {showFilters && <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label style={{ fontSize: 11.5, color: "#77715F", fontWeight: 700 }}>Department
            <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)} style={{ width: "100%", marginTop: 5, padding: "9px 10px", borderRadius: 7, border: "1px solid #E4DFD0", background: "#fff" }}>
              <option value="">All departments</option>{MARKET_CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11.5, color: "#77715F", fontWeight: 700 }}>Minimum price
            <input type="number" min="0" placeholder="KES 0" value={filters.minPrice} onChange={(e) => updateFilter("minPrice", e.target.value)} style={{ width: "100%", marginTop: 5, padding: "9px 10px", borderRadius: 7, border: "1px solid #E4DFD0", boxSizing: "border-box" }} />
          </label>
          <label style={{ fontSize: 11.5, color: "#77715F", fontWeight: 700 }}>Maximum price
            <input type="number" min="0" placeholder="No limit" value={filters.maxPrice} onChange={(e) => updateFilter("maxPrice", e.target.value)} style={{ width: "100%", marginTop: 5, padding: "9px 10px", borderRadius: 7, border: "1px solid #E4DFD0", boxSizing: "border-box" }} />
          </label>
          <label style={{ fontSize: 11.5, color: "#77715F", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={filters.inStock} onChange={(e) => updateFilter("inStock", e.target.checked)} /> In stock only
          </label>
          <label style={{ fontSize: 11.5, color: "#77715F", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={filters.verifiedSeller} onChange={(e) => updateFilter("verifiedSeller", e.target.checked)} /> Verified sellers
          </label>
          <button onClick={clearFilters} style={{ alignSelf: "end", padding: "9px 12px", borderRadius: 7, border: "1px solid #E4DFD0", background: "#fff", cursor: "pointer", fontWeight: 700 }}>Clear filters</button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9A9484" }}>Quick price ranges: under KES 1,000 · KES 1,000–5,000 · KES 5,000–10,000 · KES 10,000–25,000 · KES 25,000+</div>
      </div>}

      {loading && products.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9a9484", fontSize: 14, padding: 40, justifyContent: "center" }}><Loader2 size={16} className="spin" /> Loading products...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
            {visibleProducts.map((p, i) => {
              const images = getProductImages(p);
              return <div key={p.id} className="product-card fade-in-up" style={{ position: "relative", animationDelay: `${Math.min(i, 8) * 0.05}s`, background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
                <button type="button" aria-label="Toggle wishlist" onClick={() => toggleWishlist(p)} style={{ position: "absolute", top: 9, right: 9, zIndex: 2, width: 34, height: 34, borderRadius: "50%", border: "1px solid #E4DFD0", background: "rgba(255,255,255,.94)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Heart size={16} fill={wishlist.some((w) => w.id === p.id) ? GOLD : "none"} color={wishlist.some((w) => w.id === p.id) ? GOLD_DARK : "#77715f"} />
                </button>
                <ProductImage src={images[0]} name={p.name} count={images.length} onClick={() => setGalleryProduct(p)} />
                <div style={{ padding: "12px 13px 13px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, minHeight: 30 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F4F1E8", border: "1px solid #E8E1D1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Store size={13} color={GOLD_DARK} /></div>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 9.5, color: "#9a9484", lineHeight: 1.1 }}>Sold by</div><div style={{ fontSize: 11.5, color: GOLD_DARK, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.store_name || "Savivah seller"}</div></div>
                    {p.store_verified && <BadgeCheck size={14} color={GOLD_DARK} title="Verified seller" />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35, minHeight: 38, marginBottom: 5 }}>{p.name || "Product name"}</div>
                  {p.category && <div style={{ fontSize: 10.5, color: "#77715f", marginBottom: 5, textTransform: "capitalize" }}>{p.category}</div>}
                  <div style={{ marginBottom: 10, padding: "8px 9px", background: "#FAF9F5", borderRadius: 7, border: "1px solid #F0ECE2" }}>
                    <div style={{ fontSize: 9.5, color: "#9A9484", fontWeight: 700, textTransform: "uppercase", letterSpacing: .35, marginBottom: 3 }}>Description</div>
                    <div style={{ fontSize: 11.5, color: "#5F5A50", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description ? String(p.description) : "No description provided."}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: Number(p.stock) > 0 ? "#8a8471" : "#B3261E", marginBottom: 10 }}>{Number(p.stock) > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
                    <span style={{ fontWeight: 800, fontSize: 15.5 }}>{money(p.price)}</span>
                    <button onClick={() => addToCart(p)} disabled={Number(p.stock) <= 0} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 11px", borderRadius: 7, border: "none", cursor: Number(p.stock) > 0 ? "pointer" : "not-allowed", background: Number(p.stock) > 0 ? INK : "#D9D4C4", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}><Plus size={13} /> Add</button>
                  </div>
                </div>
              </div>;
            })}
            {visibleProducts.length === 0 && <div style={{ color: "#9a9484", fontSize: 14, gridColumn: "1/-1", padding: 40, textAlign: "center" }}>No products match these filters.</div>}
          </div>
          {hasMore && <div style={{ textAlign: "center", marginTop: 24 }}><button onClick={loadMore} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: `1px solid ${GOLD}`, background: "#fff", color: INK, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>{loading ? <Loader2 size={14} className="spin" /> : <ChevronDown size={14} />} Load more</button></div>}
        </>
      )}
      {galleryProduct && <ProductGalleryModal product={galleryProduct} onClose={() => setGalleryProduct(null)} addToCart={addToCart} />}
    </div>
  );
}

function CartDrawer({ cart, onClose, updateQty, removeFromCart, total, auth, apiFetch, notify, requireLogin, onOrderPlaced }) {
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const commission = total * 0.10;

  const checkout = async () => {
    if (!auth) return requireLogin();
    if (!address.trim()) return notify("Add a delivery address first");
    setPlacing(true);
    try {
      const byStore = {};
      cart.forEach((item) => {
        if (!byStore[item.store_id]) byStore[item.store_id] = [];
        byStore[item.store_id].push(item);
      });
      let lastRedirect = null;
      for (const [storeId, items] of Object.entries(byStore)) {
        const result = await apiFetch("/checkout", {
          method: "POST",
          body: JSON.stringify({
            storeId,
            items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
            deliveryAddress: address,
          }),
        });
        lastRedirect = result.redirectUrl;
      }
      notify("Order created — redirecting to Pesapal to pay");
      onOrderPlaced();
      if (lastRedirect) window.open(lastRedirect, "_blank");
    } catch (e) {
      notify(e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,12,0.35)" }} />
      <div style={{ position: "relative", width: 380, maxWidth: "92vw", background: "#fff", height: "100%", boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #ECE8DD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Your cart</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {cart.length === 0 && <div style={{ color: "#9a9484", fontSize: 14, padding: "30px 0", textAlign: "center" }}>Your cart is empty.</div>}
          {cart.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid #F1EEE3" }}>
              <div style={{ width: 48, height: 48, borderRadius: 6, background: "#F4F1E8", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={20} color="#C9C2AB" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.name}</div>
                <div style={{ fontSize: 11.5, color: "#8a8471", marginBottom: 6 }}>{item.store_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="number" min={1} max={item.stock} value={item.qty} onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                    style={{ width: 46, padding: "4px 6px", border: "1px solid #E4DFD0", borderRadius: 5, fontSize: 12.5 }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{money(item.price * item.qty)}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#B3261E", alignSelf: "flex-start" }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: "1px solid #ECE8DD" }}>
            {!auth && (
              <div style={{ fontSize: 12, color: "#9C740F", background: "#FBF1DA", padding: "8px 10px", borderRadius: 7, marginBottom: 10 }}>
                Log in to check out — click "Log in" up top.
              </div>
            )}
            <input placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid #E4DFD0", fontSize: 13, marginBottom: 12, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#77715f", marginBottom: 4 }}><span>Subtotal</span><span>{money(total)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#9a9484", marginBottom: 10 }}><span>Includes Savivah service fee</span><span>{money(commission)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginBottom: 14 }}><span>Total</span><span>{money(total)}</span></div>
            <button onClick={checkout} disabled={placing} style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", background: GOLD,
              color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {placing ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />} Pay via Pesapal
            </button>
            <div style={{ fontSize: 11, color: "#9a9484", marginTop: 8, textAlign: "center" }}>Opens Pesapal's checkout in a new tab. Funds are held in escrow until delivery is confirmed.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SellerView({ auth, apiFetch, notify, requireLogin }) {
  const [myStores, setMyStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storeForm, setStoreForm] = useState({ name: "", businessRegNumber: "", payoutMethod: "mpesa", payoutAccount: "" });
  const [productForm, setProductForm] = useState({ name: "", price: "", stock: "", category: "", description: "", imageUrl: "", imageUrls: [""] });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [storesLoaded, setStoresLoaded] = useState(false);

  const loadMyStores = useCallback(async () => {
    try {
      const stores = await apiFetch("/my/stores");
      setMyStores(stores);
      if (stores.length > 0) setActiveStoreId((current) => current || stores[0].id);
    } catch (e) { notify(e.message); } finally { setStoresLoaded(true); }
  }, [apiFetch, notify]);

  const loadStoreProducts = useCallback(async (storeId) => {
    try { setProducts(await apiFetch(`/stores/${storeId}/products`)); } catch (e) { notify(e.message); }
  }, [apiFetch, notify]);

  const loadStoreOrders = useCallback(async (storeId) => {
    try { setOrders(await apiFetch(`/stores/${storeId}/orders`)); } catch (e) { notify(e.message); }
  }, [apiFetch, notify]);

  useEffect(() => { if (auth?.user.role === "seller") loadMyStores(); }, [auth, loadMyStores]);
  useEffect(() => {
    if (activeStoreId) { loadStoreProducts(activeStoreId); loadStoreOrders(activeStoreId); }
  }, [activeStoreId, loadStoreProducts, loadStoreOrders]);

  if (!auth || auth.user.role !== "seller") {
    return (
      <EmptyState icon={Store} title="Seller access required"
        message="Log in with a seller account to manage your store, list products, and view orders."
        actionLabel="Log in as a seller" onAction={requireLogin} />
    );
  }

  const createStore = async (e) => {
    e.preventDefault();
    if (!storeForm.name) return;
    setLoading(true);
    try {
      const store = await apiFetch("/stores", { method: "POST", body: JSON.stringify(storeForm) });
      setMyStores((s) => [store, ...s]);
      setActiveStoreId(store.id);
      setStoreForm({ name: "", businessRegNumber: "", payoutMethod: "mpesa", payoutAccount: "" });
      notify(`"${store.name}" created`);
    } catch (e) { notify(e.message); } finally { setLoading(false); }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!activeStoreId || !productForm.name || !productForm.price || !productForm.stock) return;
    try {
      const p = await apiFetch(`/stores/${activeStoreId}/products`, {
        method: "POST",
        body: JSON.stringify({ ...productForm, imageUrls: productForm.imageUrls.filter(Boolean), price: parseFloat(productForm.price), stock: parseInt(productForm.stock) }),
      });
      setProducts((ps) => [p, ...ps]);
      setProductForm({ name: "", price: "", stock: "", category: "", description: "", imageUrl: "", imageUrls: [""] });
      notify(`"${p.name}" listed`);
    } catch (e) { notify(e.message); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description || "", category: p.category || "", price: p.price, stock: p.stock, imageUrl: p.image_url || "", imageUrls: (Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls : (p.image_url ? [p.image_url] : [""])) });
  };

  const saveEdit = async (id) => {
    try {
      const updated = await apiFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editForm, imageUrls: (editForm.imageUrls || []).filter(Boolean), price: parseFloat(editForm.price), stock: parseInt(editForm.stock) }),
      });
      setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
      notify(`"${updated.name}" updated`);
    } catch (e) { notify(e.message); }
  };

  const pendingEarnings = orders.filter((o) => ["escrow_held", "shipped"].includes(o.status)).reduce((s, o) => s + Number(o.payout_amount), 0);
  const releasedEarnings = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.payout_amount), 0);
  const activeStore = myStores.find((s) => s.id === activeStoreId);

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Seller dashboard</h1>
          <p style={{ color: "#77715f", fontSize: 14, margin: 0 }}>Logged in as {auth.user.email}</p>
        </div>
        {myStores.length > 0 && (
          <select value={activeStoreId || ""} onChange={(e) => setActiveStoreId(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E4DFD0", fontSize: 13.5, fontWeight: 600 }}>
            {myStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {!storesLoaded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9a9484", fontSize: 14, padding: 40, justifyContent: "center" }}>
          <Loader2 size={16} className="spin" /> Loading your stores...
        </div>
      ) : (
        <>
          <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18, maxWidth: 420, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{myStores.length > 0 ? "Create another store" : "Create your store"}</div>
            <div style={{ fontSize: 12.5, color: "#8a8471", marginBottom: 12 }}>
              {myStores.length > 0 ? "You can run more than one store on this account." : "You don't have a store yet — create one to start listing products."}
            </div>
            <form onSubmit={createStore} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Store name" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} style={inputStyle} required />
              <input placeholder="Business reg. number (optional)" value={storeForm.businessRegNumber} onChange={(e) => setStoreForm({ ...storeForm, businessRegNumber: e.target.value })} style={inputStyle} />
              <input placeholder="M-Pesa number for payouts" value={storeForm.payoutAccount} onChange={(e) => setStoreForm({ ...storeForm, payoutAccount: e.target.value })} style={inputStyle} />
              <button type="submit" disabled={loading} style={{ padding: "10px 0", borderRadius: 8, border: "none", background: INK, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                {loading ? "Creating..." : "Create store"}
              </button>
            </form>
          </div>

          {myStores.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
                <StatCard label="Active store" value={activeStore?.name} sub={activeStore?.verified ? "Verified" : "Unverified"} icon={Store} />
                <StatCard label="Pending in escrow" value={money(pendingEarnings)} sub="Released after delivery" icon={Clock} />
                <StatCard label="Paid out" value={money(releasedEarnings)} sub="After 10% commission" icon={TrendingUp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 20, alignItems: "flex-start" }}>
                <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>List a new product</div>
                  <form onSubmit={addProduct} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={inputStyle} />
                    <input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={inputStyle} />
                    <textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
                    <div style={{ border: "1px solid #E4DFD0", borderRadius: 8, padding: 10, background: "#FAF9F5" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Product photos</div><div style={{ fontSize: 10.5, color: "#9A9484" }}>Add up to 6 photos — front, back, side, details, packaging.</div></div>
                        {productForm.imageUrls.length < 6 && <button type="button" onClick={() => setProductForm({ ...productForm, imageUrls: [...productForm.imageUrls, ""] })} style={{ border: `1px solid ${GOLD}`, background: "#fff", color: GOLD_DARK, borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><Plus size={12} style={{ verticalAlign: "-2px" }} /> Add photo</button>}
                      </div>
                      {productForm.imageUrls.map((url, i) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input placeholder={`Photo ${i + 1} ${i === 0 ? "(front/main)" : i === 1 ? "(back)" : i === 2 ? "(side)" : "(detail/other)"}`} value={url} onChange={(e) => { const a = [...productForm.imageUrls]; a[i] = e.target.value; setProductForm({ ...productForm, imageUrls: a, imageUrl: a[0] || "" }); }} style={{ ...inputStyle, flex: 1 }} />
                        {productForm.imageUrls.length > 1 && <button type="button" onClick={() => { const a = productForm.imageUrls.filter((_, n) => n !== i); setProductForm({ ...productForm, imageUrls: a, imageUrl: a[0] || "" }); }} style={{ width: 34, border: "1px solid #E4DFD0", background: "#fff", borderRadius: 6, cursor: "pointer", color: "#B3261E" }}><Trash2 size={14} /></button>}
                      </div>)}
                      {productForm.imageUrls.some(Boolean) && <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{productForm.imageUrls.filter(Boolean).map((url, i) => <img key={url + i} src={url} alt={`Preview ${i + 1}`} style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid #E4DFD0" }} onError={(e) => { e.currentTarget.style.opacity = .35; }} />)}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="Price (KES)" type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={inputStyle} />
                      <input placeholder="Stock qty" type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} style={inputStyle} />
                    </div>
                    <button type="submit" style={{ padding: "10px 0", borderRadius: 8, border: "none", background: INK, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Plus size={15} /> Add to my store
                    </button>
                  </form>
                  <div style={{ fontWeight: 700, fontSize: 15, margin: "22px 0 10px" }}>Your listings ({products.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                    {products.map((p) => (
                      editingId === p.id ? (
                        <div key={p.id} style={{ padding: 10, background: "#FAF9F5", borderRadius: 7, display: "flex", flexDirection: "column", gap: 6 }}>
                          <input placeholder="Product name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyle, fontSize: 12.5 }} />
                          <input placeholder="Category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={{ ...inputStyle, fontSize: 12.5 }} />
                          <textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            style={{ ...inputStyle, fontSize: 12.5, minHeight: 48, resize: "vertical", fontFamily: "inherit" }} />
                          <div style={{ border: "1px solid #E4DFD0", borderRadius: 8, padding: 9, background: "#fff" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}><b style={{ fontSize: 11.5 }}>Product photos</b>{(editForm.imageUrls || []).length < 6 && <button type="button" onClick={() => setEditForm({ ...editForm, imageUrls: [...(editForm.imageUrls || []), ""] })} style={{ border: `1px solid ${GOLD}`, background: "#fff", color: GOLD_DARK, borderRadius: 6, padding: "4px 7px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}><Plus size={11} style={{ verticalAlign: "-2px" }} /> Add</button>}</div>
                            {(editForm.imageUrls || [""]).map((url, i) => <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}><input placeholder={`Photo ${i + 1}`} value={url} onChange={(e) => { const a = [...(editForm.imageUrls || [])]; a[i] = e.target.value; setEditForm({ ...editForm, imageUrls: a, imageUrl: a[0] || "" }); }} style={{ ...inputStyle, fontSize: 12.5, flex: 1 }} />{(editForm.imageUrls || []).length > 1 && <button type="button" onClick={() => { const a = editForm.imageUrls.filter((_, n) => n !== i); setEditForm({ ...editForm, imageUrls: a, imageUrl: a[0] || "" }); }} style={{ width: 30, border: "1px solid #E4DFD0", background: "#fff", borderRadius: 5, color: "#B3261E", cursor: "pointer" }}><Trash2 size={12} /></button>}</div>)}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input type="number" placeholder="Price" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={{ ...inputStyle, fontSize: 12.5 }} />
                            <input type="number" placeholder="Stock" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} style={{ ...inputStyle, fontSize: 12.5 }} />
                          </div>
                          {editForm.imageUrl && (
                            <img src={editForm.imageUrl} alt="Preview" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }}
                              onError={(e) => { e.target.style.display = "none"; }} />
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => saveEdit(p.id)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: GOLD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #E4DFD0", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div key={p.id} style={{ padding: "8px 10px", background: "#FAF9F5", borderRadius: 7, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div>
                            <b>{p.name}</b> — {money(p.price)} · {p.stock} in stock
                            {p.status !== "active" && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#9C740F", background: "#FBF1DA", padding: "2px 6px", borderRadius: 10 }}>{p.status}</span>}
                          </div>
                          <button onClick={() => startEdit(p)} style={{ background: "none", border: "none", color: GOLD_DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Edit</button>
                        </div>
                      )
                    ))}
                    {products.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No products listed yet in this store.</div>}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Orders for your store</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {orders.map((o) => <OrderRow key={o.id} order={o} />)}
                    {orders.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No orders yet for this store.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}



function CustomerDashboard({ auth, tab, setTab, wishlist, toggleWishlist, addToCart, cartCount, onBecomeSeller, apiFetch, notify }) {
  const user = auth?.user;
  if (!user) {
    return <EmptyState icon={User} title="Your customer dashboard" message="Log in to view your account, wishlist and settings." actionLabel="Log in" onAction={() => {}} />;
  }

  const sellerStatus = user.sellerStatus || "none";
  const tabButton = (key, label, Icon) => (
    <button onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", border: "none", borderRadius: 8, background: tab === key ? "#F4F1E8" : "transparent", color: tab === key ? INK : "#77715F", fontWeight: tab === key ? 700 : 600, cursor: "pointer", textAlign: "left" }}><Icon size={15} />{label}</button>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 14, padding: 12 }}>
          <div style={{ padding: "12px 10px 16px", borderBottom: "1px solid #F0ECE2", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F4F1E8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><User size={20} color={GOLD_DARK} /></div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{user.fullName || "Customer"}</div>
            <div style={{ fontSize: 11.5, color: "#8A8471", wordBreak: "break-word" }}>{user.email}</div>
          </div>
          {tabButton("dashboard", "Overview", Home)}
          {tabButton("wishlist", `Wishlist (${wishlist.length})`, Heart)}
          {tabButton("cart", `Cart (${cartCount})`, ShoppingCart)}
          {tabButton("settings", "Settings", Settings)}
        </div>

        <div>
          {tab === "dashboard" && <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>My account</h1>
            <p style={{ margin: "0 0 18px", color: "#77715F", fontSize: 13.5 }}>Manage your Savivah customer account.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <StatCard label="Account" value="Customer" sub={user.emailVerified ? "Email verified" : "Email not verified"} icon={ShieldCheck} />
              <StatCard label="Wishlist" value={wishlist.length} sub="Saved products" icon={Heart} />
              <StatCard label="Cart" value={cartCount} sub="Items ready to checkout" icon={ShoppingCart} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18, marginTop: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Quick checks</div>
              <div style={{ display: "grid", gap: 9, fontSize: 13 }}>
                <div>✓ Email: {user.emailVerified ? "Verified" : "Verification required"}</div>
                <div>✓ Seller access: {sellerStatus === "none" ? "Not applied" : sellerStatus.replaceAll("_", " ")}</div>
                <div>✓ Wishlist: {wishlist.length} saved item{wishlist.length === 1 ? "" : "s"}</div>
              </div>
            </div>
          </div>}

          {tab === "wishlist" && <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Wishlist</h1>
            <p style={{ margin: "0 0 18px", color: "#77715F", fontSize: 13.5 }}>Products you saved for later.</p>
            {wishlist.length === 0 ? <EmptyState icon={Heart} title="Your wishlist is empty" message="Tap the heart on any product to save it here." actionLabel="Browse marketplace" onAction={() => setTab("dashboard")} /> :
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>{wishlist.map((p) => <div key={p.id} style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 10, padding: 12 }}><div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{p.name}</div><div style={{ color: GOLD_DARK, fontWeight: 800, marginBottom: 10 }}>{money(p.price)}</div><div style={{ display: "flex", gap: 6 }}><button onClick={() => addToCart(p)} style={{ flex: 1, padding: "8px 6px", border: "none", borderRadius: 7, background: INK, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add to cart</button><button onClick={() => toggleWishlist(p)} style={{ width: 38, border: "1px solid #E4DFD0", background: "#fff", borderRadius: 7, cursor: "pointer" }}><Trash2 size={14} color="#B3261E" /></button></div></div>)}</div>}
          </div>}

          {tab === "cart" && <div><h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Your cart</h1><p style={{ color: "#77715F", fontSize: 13.5 }}>Use the cart button at the top to review and checkout.</p><button onClick={() => setTab("dashboard")} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: GOLD, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Continue shopping</button></div>}

          {tab === "settings" && <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Settings</h1>
            <p style={{ margin: "0 0 18px", color: "#77715F", fontSize: 13.5 }}>Account details and seller access.</p>
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Customer details</div>
              <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}><div><b>Name:</b> {user.fullName}</div><div><b>Email:</b> {user.email}</div><div><b>Email status:</b> {user.emailVerified ? "Verified" : "Not verified"}</div></div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}><Store size={17} color={GOLD_DARK} /><div style={{ fontWeight: 800 }}>Become a seller</div></div>
              <div style={{ fontSize: 12.5, color: "#77715F", lineHeight: 1.5, marginBottom: 12 }}>Seller access requires an application, identification and permit details, verification, and the seller registration fee. Your customer account remains unchanged until approval.</div>
              <div style={{ background: "#F4F1E8", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>Current status: <b>{sellerStatus.replaceAll("_", " ")}</b></div>
              {sellerStatus === "none" || sellerStatus === "rejected" ? <button onClick={onBecomeSeller} style={{ padding: "10px 16px", border: "none", borderRadius: 8, background: INK, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Start seller application</button> : <div style={{ fontSize: 12.5, color: GOLD_DARK }}>Your seller application is already in progress.</div>}
            </div>
          </div>}
        </div>
      </div>
      <style>{`@media (max-width: 760px){.savivah-dashboard-grid{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

function SellerApplicationModal({ auth, apiFetch, notify, onClose }) {
  const [form, setForm] = useState({ fullName: auth?.user?.fullName || "", email: auth?.user?.email || "", phoneNumber: "", identificationType: "national_id", identificationNumber: "", businessName: "", businessRegistrationNumber: "", productPermit: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const result = await apiFetch("/seller/applications", { method: "POST", body: JSON.stringify(form) });
      notify(result?.message || "Seller application submitted");
      if (result?.redirectUrl) window.open(result.redirectUrl, "_blank");
      onClose();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}><div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,12,.55)" }} /><div style={{ position: "relative", width: 520, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 15, padding: 22 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ fontSize: 19, fontWeight: 800 }}>Become a seller</div><button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={20} /></button></div>
    <p style={{ fontSize: 12.5, color: "#77715F", lineHeight: 1.5, marginTop: 0 }}>Complete your details. The seller registration fee is paid through Pesapal after the application is created.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <input placeholder="Full name" value={form.fullName} onChange={e => setForm({...form,fullName:e.target.value})} style={inputStyle} required />
      <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} style={inputStyle} required />
      <input placeholder="Phone number" value={form.phoneNumber} onChange={e => setForm({...form,phoneNumber:e.target.value})} style={inputStyle} required />
      <select value={form.identificationType} onChange={e => setForm({...form,identificationType:e.target.value})} style={inputStyle}><option value="national_id">National ID</option><option value="passport">Passport</option></select>
      <input placeholder="Identification number" value={form.identificationNumber} onChange={e => setForm({...form,identificationNumber:e.target.value})} style={inputStyle} required />
      <input placeholder="Business name" value={form.businessName} onChange={e => setForm({...form,businessName:e.target.value})} style={inputStyle} required />
      <input placeholder="Business registration number (if applicable)" value={form.businessRegistrationNumber} onChange={e => setForm({...form,businessRegistrationNumber:e.target.value})} style={inputStyle} />
      <input placeholder="Product permit / licence reference" value={form.productPermit} onChange={e => setForm({...form,productPermit:e.target.value})} style={inputStyle} required />
      <div style={{ background: "#FBF1DA", borderRadius: 8, padding: 11, fontSize: 12, color: "#6E5A1A" }}><CreditCard size={14} style={{verticalAlign:"-2px",marginRight:5}} />Seller registration fee: amount will be confirmed by Savivah before Pesapal checkout.</div>
      {error && <div style={{ color: "#B3261E", fontSize: 12.5 }}>{error}</div>}
      <button disabled={loading} type="submit" style={{ padding: "11px 0", border: "none", borderRadius: 8, background: GOLD, color: "#fff", fontWeight: 800, cursor: "pointer" }}>{loading ? "Submitting..." : "Continue to seller payment"}</button>
    </form>
  </div></div>;
}

function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F4F1E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon size={24} color={GOLD_DARK} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "#77715f", marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
      <button onClick={onAction} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: INK, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
        {actionLabel}
      </button>
    </div>
  );
}

function OrderRow({ order, storeName }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending_payment;
  const Icon = meta.icon;
  return (
    <div style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B564A" }}>
            {storeName ? `${storeName} · ` : ""}Order #{String(order.id).slice(-6)}
          </div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg, padding: "4px 10px", borderRadius: 20 }}>
          <Icon size={12} /> {meta.label}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "#5B564A", marginTop: 10 }}>
        Total <b>{money(order.subtotal)}</b> &nbsp;·&nbsp; Payout <b>{money(order.payout_amount)}</b>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9a9484", fontSize: 12, fontWeight: 600, marginBottom: 8 }}><Icon size={14} /> {label}</div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#9a9484", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const inputStyle = { flex: 1, padding: "9px 11px", borderRadius: 7, border: "1px solid #E4DFD0", fontSize: 13, boxSizing: "border-box" };
