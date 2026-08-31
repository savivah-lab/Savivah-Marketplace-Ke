import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, Store, ShieldCheck, Package, Plus, Trash2, X,
  CheckCircle2, Clock, Truck, RotateCcw, TrendingUp, LayoutGrid,
  Wallet, Search, LogIn, LogOut, UserPlus, Loader2, AlertTriangle, ChevronDown
} from "lucide-react";
import { useProductPagination } from "./hooks/useProductPagination";
import { adminLogin, createAdminApiClient } from "./api/adminAuth";

const GOLD = "#C9971C";
const GOLD_DARK = "#9C740F";
const INK = "#161513";
const API_BASE = "https://savivah-backend.onrender.com/api";
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
  const [auth, setAuth] = useState(null); // { token, user } — customer/seller only, never admin
  const [adminAuth, setAdminAuth] = useState(null); // { accessToken, refreshToken, admin } — entirely separate from `auth`
  const [role, setRole] = useState("customer");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const { items: products, loading: loadingProducts, error: productsError, hasMore, loadMore } = useProductPagination(search);
  const apiDown = Boolean(productsError);

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

  // Admin calls go through a dedicated client that knows how to refresh a
  // short-lived admin access token automatically — see api/adminAuth.js.
  const adminApiFetch = useCallback(
    createAdminApiClient(
      () => adminAuth,
      (refreshed) => setAdminAuth((prev) => ({ ...prev, ...refreshed })),
      () => { setAdminAuth(null); notify("Admin session expired — please log in again"); }
    ),
    [adminAuth]
  );

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

  const logout = () => { setAuth(null); notify("Logged out"); };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#FAF9F5", minHeight: "100vh", color: INK }}>
      <TopBar role={role} setRole={setRole} cartCount={cartCount} onCartClick={() => setShowCart(true)}
        auth={auth} onLoginClick={() => setShowAuth(true)} onLogout={logout} />

      {toast && <Toast msg={toast} />}
      {apiDown && (
        <div style={{ background: "#FBEAE9", color: "#B3261E", padding: "10px 20px", fontSize: 13, textAlign: "center" }}>
          Can't reach the Savivah API right now. If it's been idle, Render's free tier can take up to a minute to wake up — try refreshing shortly.
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 60px" }}>
        {role === "customer" && (
          <CustomerView products={products} loading={loadingProducts} search={search} setSearch={setSearch}
            addToCart={addToCart} hasMore={hasMore} loadMore={loadMore} />
        )}
        {role === "seller" && (
          <SellerView auth={auth} apiFetch={apiFetch} notify={notify} requireLogin={() => setShowAuth(true)} />
        )}
        {role === "admin" && (
          <AdminView adminAuth={adminAuth} setAdminAuth={setAdminAuth} adminApiFetch={adminApiFetch} notify={notify} />
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

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onAuthed={(a) => { setAuth(a); setShowAuth(false); notify(`Welcome, ${a.user.fullName || a.user.email}`); }} />
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

function TopBar({ role, setRole, cartCount, onCartClick, auth, onLoginClick, onLogout }) {
  const tabs = [
    { key: "customer", label: "Marketplace", icon: LayoutGrid },
    { key: "seller", label: "Seller dashboard", icon: Store },
    { key: "admin", label: "Admin", icon: ShieldCheck },
  ];
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #ECE8DD", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Logo />
        <div style={{ display: "flex", gap: 4, background: "#F4F1E8", borderRadius: 10, padding: 4 }}>
          {tabs.map((t) => {
            const Icon = t.icon; const active = role === t.key;
            return (
              <button key={t.key} onClick={() => setRole(t.key)} style={{
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
            <button onClick={onCartClick} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
              borderRadius: 8, border: `1px solid ${GOLD}`, background: "#fff", cursor: "pointer", fontWeight: 600,
              fontSize: 14, color: INK, position: "relative" }}>
              <ShoppingCart size={17} color={GOLD_DARK} /> Cart
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: -8, right: -8, background: GOLD, color: "#fff", borderRadius: "50%",
                  width: 20, height: 20, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
              )}
            </button>
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
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", password: "", role: "customer" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef(null);

  const handleGoogleCredential = useCallback(async (response) => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");
      onAuthed(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [form.role, onAuthed]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return; // no Client ID configured — button just won't render
    const renderButton = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 332 });
    };
    if (window.google) {
      renderButton();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = renderButton;
      document.body.appendChild(script);
    }
  }, [handleGoogleCredential]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      onAuthed(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,12,0.4)" }} />
      <div style={{ position: "relative", width: 380, maxWidth: "90vw", background: "#fff", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{mode === "login" ? "Log in" : "Create an account"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        {mode === "register" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13, border: "1px solid #E4DFD0", borderRadius: 7, padding: "9px 11px", cursor: "pointer" }}>
              <input type="radio" checked={form.role === "customer"} onChange={() => setForm({ ...form, role: "customer" })} /> Customer
            </label>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13, border: "1px solid #E4DFD0", borderRadius: 7, padding: "9px 11px", cursor: "pointer" }}>
              <input type="radio" checked={form.role === "seller"} onChange={() => setForm({ ...form, role: "seller" })} /> Seller
            </label>
          </div>
        )}

        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", marginBottom: 14 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 16px", color: "#9a9484", fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#ECE8DD" }} />
              or continue with email
              <div style={{ flex: 1, height: 1, background: "#ECE8DD" }} />
            </div>
          </>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <>
              <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inputStyle} required />
              <input placeholder="Phone number (07...)" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} style={inputStyle} required />
            </>
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} required />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} required />
          {error && <div style={{ fontSize: 12.5, color: "#B3261E" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "11px 0", borderRadius: 8, border: "none", background: GOLD,
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading ? <Loader2 size={15} className="spin" /> : mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#77715f" }}>
          {mode === "login" ? "New to Savivah? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ background: "none", border: "none", color: GOLD_DARK, fontWeight: 700, cursor: "pointer" }}>
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </div>
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

function CustomerView({ products, loading, search, setSearch, addToCart, hasMore, loadMore }) {
  return (
    <div>
      <Hero />
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#9a9484" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8, border: "1px solid #E4DFD0", fontSize: 14, boxSizing: "border-box" }} />
      </div>
      {loading && products.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9a9484", fontSize: 14, padding: 40, justifyContent: "center" }}>
          <Loader2 size={16} className="spin" /> Loading products...
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
            {products.map((p, i) => (
              <div key={p.id} className="product-card fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s`, background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 110, borderRadius: 8, background: "#F4F1E8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <Package size={34} color="#C9C2AB" />
                  )}
                </div>
                <div style={{ fontSize: 11, color: GOLD_DARK, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Store size={11} /> {p.store_name}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#8a8471" }}>{p.stock} in stock</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{money(p.price)}</span>
                  <button onClick={() => addToCart(p)} disabled={p.stock === 0} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 7, border: "none",
                    cursor: p.stock ? "pointer" : "not-allowed", background: p.stock ? INK : "#D9D4C4", color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ color: "#9a9484", fontSize: 14, gridColumn: "1/-1", padding: 40, textAlign: "center" }}>
                No products yet — list one from the Seller dashboard tab.
              </div>
            )}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button onClick={loadMore} disabled={loading} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8,
                border: `1px solid ${GOLD}`, background: "#fff", color: INK, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                {loading ? <Loader2 size={14} className="spin" /> : <ChevronDown size={14} />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
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
  const [productForm, setProductForm] = useState({ name: "", price: "", stock: "", category: "", description: "", imageUrl: "" });
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
        body: JSON.stringify({ ...productForm, price: parseFloat(productForm.price), stock: parseInt(productForm.stock) }),
      });
      setProducts((ps) => [p, ...ps]);
      setProductForm({ name: "", price: "", stock: "", category: "", description: "", imageUrl: "" });
      notify(`"${p.name}" listed`);
    } catch (e) { notify(e.message); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, description: p.description || "", category: p.category || "", price: p.price, stock: p.stock, imageUrl: p.image_url || "" });
  };

  const saveEdit = async (id) => {
    try {
      const updated = await apiFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editForm, price: parseFloat(editForm.price), stock: parseInt(editForm.stock) }),
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
                    <input placeholder="Image URL" value={productForm.imageUrl} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} style={inputStyle} />
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
                          <input placeholder="Image URL" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} style={{ ...inputStyle, fontSize: 12.5 }} />
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

function AdminLoginForm({ onAuthed }) {
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [needsTotp, setNeedsTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await adminLogin(form.email, form.password, form.totpCode || undefined);
      onAuthed(data);
    } catch (e) {
      if (e.message.toLowerCase().includes("2fa")) setNeedsTotp(true);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "40px auto", background: "#fff", border: "1px solid #ECE8DD", borderRadius: 14, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F4F1E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={19} color={GOLD_DARK} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Admin sign-in</div>
      </div>
      <p style={{ fontSize: 12.5, color: "#8a8471", marginBottom: 18 }}>
        This is a separate login from the customer/seller account — admin accounts are created directly by the team, not through public registration.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} required />
        {needsTotp && (
          <input placeholder="6-digit authenticator code" value={form.totpCode} onChange={(e) => setForm({ ...form, totpCode: e.target.value })} style={inputStyle} />
        )}
        {error && <div style={{ fontSize: 12.5, color: "#B3261E" }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: "11px 0", borderRadius: 8, border: "none", background: INK,
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loading ? <Loader2 size={15} className="spin" /> : <LogIn size={15} />} Sign in
        </button>
      </form>
    </div>
  );
}

function AdminView({ adminAuth, setAdminAuth, adminApiFetch, notify }) {
  const [tab, setTab] = useState("orders"); // orders | sellers | payouts
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, s, sellerList, payoutList] = await Promise.all([
        adminApiFetch("/admin/orders"), adminApiFetch("/admin/stats"),
        adminApiFetch("/admin/sellers"), adminApiFetch("/admin/payouts"),
      ]);
      setOrders(o); setStats(s); setSellers(sellerList); setPayouts(payoutList);
    } catch (e) { notify(e.message); } finally { setLoading(false); }
  }, [adminApiFetch, notify]);

  useEffect(() => { if (adminAuth) load(); }, [adminAuth, load]);

  const dispatchPayout = async (payoutId) => {
    try {
      await adminApiFetch(`/admin/payouts/${payoutId}/mark-sent`, { method: "POST" });
      notify("Payout marked as sent");
      load();
    } catch (e) { notify(e.message); }
  };

  if (!adminAuth) {
    return <AdminLoginForm onAuthed={(data) => { setAdminAuth(data); notify(`Welcome, ${data.admin.fullName}`); }} />;
  }

  const tabs = [
    { key: "orders", label: "Orders" },
    { key: "sellers", label: "Sellers" },
    { key: "payouts", label: "Payouts" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Admin panel</h1>
          <p style={{ color: "#77715f", fontSize: 14, margin: 0 }}>Signed in as {adminAuth.admin.email}</p>
        </div>
        <button onClick={() => { setAdminAuth(null); notify("Logged out of admin"); }} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
          border: "1px solid #E4DFD0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9a9484", fontSize: 14, padding: 40, justifyContent: "center" }}>
          <Loader2 size={16} className="spin" /> Loading...
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard label="Commission earned" value={money(stats?.commission_earned)} sub="From delivered orders" icon={TrendingUp} />
            <StatCard label="Funds in escrow" value={money(stats?.in_escrow)} sub="Awaiting delivery" icon={Wallet} />
            <StatCard label="Total orders" value={stats?.total_orders ?? 0} sub="All time" icon={Package} />
          </div>

          <div style={{ display: "flex", gap: 4, background: "#F4F1E8", borderRadius: 10, padding: 4, marginBottom: 16, width: "fit-content" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === t.key ? INK : "transparent", color: tab === t.key ? "#fff" : "#5B564A" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "orders" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>All orders</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map((o) => <OrderRow key={o.id} order={o} storeName={o.store_name} />)}
                {orders.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No orders placed on the platform yet.</div>}
              </div>
            </div>
          )}

          {tab === "sellers" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Sellers — earnings per store</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sellers.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name} {s.verified && <span style={{ fontSize: 10.5, color: "#2E7D32", background: "#E9F5EA", padding: "2px 7px", borderRadius: 10, marginLeft: 6 }}>Verified</span>}</div>
                      <div style={{ fontSize: 12, color: "#8a8471" }}>{s.owner_name} · {s.owner_email} · {s.total_orders} orders</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12.5 }}>
                      <div>Pending escrow: <b>{money(s.pending_escrow)}</b></div>
                      <div>Total earned: <b>{money(s.total_earned)}</b></div>
                    </div>
                  </div>
                ))}
                {sellers.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No stores registered yet.</div>}
              </div>
            </div>
          )}

          {tab === "payouts" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Payouts to dispatch</div>
              <div style={{ fontSize: 12, color: "#8a8471", marginBottom: 12 }}>Send the money via M-Pesa/bank yourself, then mark it sent here.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {payouts.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.store_name}</div>
                      <div style={{ fontSize: 12, color: "#8a8471" }}>{money(p.amount)} via {p.payout_method || "—"} · {p.payout_account || "no payout account on file"}</div>
                    </div>
                    {p.status === "pending" ? (
                      <button onClick={() => dispatchPayout(p.id)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: GOLD, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                        Mark sent
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#2E7D32", background: "#E9F5EA", padding: "4px 10px", borderRadius: 20 }}>Sent</span>
                    )}
                  </div>
                ))}
                {payouts.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No payouts yet — these appear once an order is delivered.</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
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
