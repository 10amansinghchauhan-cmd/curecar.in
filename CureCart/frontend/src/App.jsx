import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "https://curecar-in.onrender.com/api";
const INSTAGRAM_URL  = "https://www.instagram.com/amansingh84538/";

// ─── API LAYER ────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("curecart_token");

const api = async (endpoint, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
  };
  const body = (!isFormData && options.body && typeof options.body === "object")
    ? JSON.stringify(options.body) : options.body;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET", headers, credentials: "include",
    ...(body !== undefined ? { body } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

const Auth = {
  register:       (name,email,pwd) => api("/auth/register", { method:"POST", body:{ name, email, password:pwd } }),
  login:          (email,password) => api("/auth/login",    { method:"POST", body:{ email, password } }),
  me:             ()               => api("/auth/me"),
  changePassword: (cur,nw)         => api("/auth/change-password", { method:"PUT", body:{ currentPassword:cur, newPassword:nw } }),
};

const Products = {
  list:      (p={}) => api(`/products?${new URLSearchParams(p)}`),
  get:       (id)   => api(`/products/${id}`),
  addReview: (id,rating,comment) => api(`/products/${id}/reviews`, { method:"POST", body:{ rating,comment } }),
};

const CartAPI = {
  get:    ()             => api("/cart"),
  add:    (productId,qty)=> api("/cart", { method:"POST", body:{ productId, qty } }),
  update: (pid,qty)      => api(`/cart/${pid}`, { method:"PUT", body:{ qty } }),
  remove: (pid)          => api(`/cart/${pid}`, { method:"DELETE" }),
  clear:  ()             => api("/cart/clear", { method:"DELETE" }),
};

const Orders = {
  place:  (payload) => api("/orders",       { method:"POST", body:payload }),
  mine:   ()        => api("/orders/my"),
  cancel: (id)      => api(`/orders/${id}/cancel`, { method:"PUT" }),
};

const Payment = {
  getKey:      ()              => api("/payment/key"),
  createOrder: (amount,ordId) => api("/payment/create-order", { method:"POST", body:{ amount, orderId:ordId } }),
  verify:      (p)            => api("/payment/verify",       { method:"POST", body:p }),
};

const Admin = {
  stats:         ()          => api("/admin/stats"),
  users:         (p={})      => api(`/admin/users?${new URLSearchParams(p)}`),
  updateUser:    (id,d)      => api(`/admin/users/${id}`, { method:"PUT", body:d }),
  products:      (p={})      => api(`/admin/products?${new URLSearchParams(p)}`),
  createProduct: (fd)        => api("/admin/products", { method:"POST", body:fd }),
  updateProduct: (id,fd)     => api(`/admin/products/${id}`, { method:"PUT", body:fd }),
  deleteProduct: (id)        => api(`/admin/products/${id}`, { method:"DELETE" }),
  orders:        (p={})      => api(`/admin/orders?${new URLSearchParams(p)}`),
  updateOrder:   (id,d)      => api(`/admin/orders/${id}/status`, { method:"PUT", body:d }),
};

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"all",         label:"All Sarees",       icon:"🪷" },
  { id:"silk",        label:"Silk Sarees",       icon:"✨" },
  { id:"cotton",      label:"Cotton Sarees",     icon:"🌿" },
  { id:"banarasi",    label:"Banarasi",          icon:"👑" },
  { id:"kanjivaram",  label:"Kanjivaram",        icon:"🔱" },
  { id:"chanderi",    label:"Chanderi",          icon:"🌸" },
  { id:"designer",    label:"Designer",          icon:"💎" },
  { id:"georgette",   label:"Georgette",         icon:"🌺" },
  { id:"fashion",     label:"Blouse & More",     icon:"🧵" },
];

const BANNERS = [
  { id:1, title:"Royal Banarasi Collection", subtitle:"Handwoven silk sarees from Varanasi — timeless elegance", bg:"linear-gradient(135deg,#4a0010,#8B0000,#5c0012)", accent:"#C8960C", img:"🪷" },
  { id:2, title:"Kanjivaram Heritage", subtitle:"Pure silk sarees with 24-carat zari work", bg:"linear-gradient(135deg,#1a0a3e,#3b1060,#5c1a8a)", accent:"#FFD700", img:"👑" },
  { id:3, title:"New Festive Arrivals", subtitle:"Celebrate every occasion with our premium collection", bg:"linear-gradient(135deg,#0d3320,#1a5c35,#0d4a28)", accent:"#F4C430", img:"✨" },
];

const STATUS_COLORS = { placed:"#C8960C", confirmed:"#1d6fa4", shipped:"#7c3aed", out_for_delivery:"#c2410c", delivered:"#16a34a", cancelled:"#dc2626" };

// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const C = {
  maroon:    "#8B0000",
  maroonDk:  "#5c0012",
  maroonLt:  "#b5001a",
  gold:      "#C8960C",
  goldLt:    "#F0C040",
  ivory:     "#FFF8F0",
  ivoryDk:   "#F5E6D8",
  cream:     "#FAF0E6",
  text:      "#2C0A0A",
  textMid:   "#5c3333",
  textLight: "#9b7070",
  border:    "#E8D5C4",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (p) => `₹${Number(p||0).toLocaleString("en-IN")}`;

const Spinner = ({ size=32, color=C.gold }) => (
  <div style={{ width:size, height:size, border:`3px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
);

const StarRating = ({ rating, interactive=false, onRate }) => (
  <div style={{ display:"flex", alignItems:"center", gap:2 }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={() => interactive && onRate?.(s)}
        style={{ color: s<=Math.round(rating) ? C.gold : "#ddc8b4", fontSize: interactive?22:13, cursor: interactive?"pointer":"default" }}>★</span>
    ))}
    {!interactive && <span style={{ fontSize:12, color:C.textLight, marginLeft:4 }}>{rating}</span>}
  </div>
);

// ─── AUTH COMPONENTS ──────────────────────────────────────────────────────────
const AuthBG = () => (
  <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none" }}>
    {[{top:"5%",left:"10%",s:400,c:"#8B000025"},{top:"55%",right:"5%",s:350,c:"#C8960C20"},{bottom:"5%",left:"35%",s:280,c:"#8B000018"}].map((o,i)=>(
      <div key={i} style={{ position:"absolute", borderRadius:"50%", width:o.s, height:o.s, background:`radial-gradient(circle,${o.c},transparent)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:"blur(50px)", animation:`pulse ${3+i}s ease-in-out infinite alternate` }}/>
    ))}
    {/* Decorative motif */}
    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:300, opacity:0.03, pointerEvents:"none" }}>🪷</div>
  </div>
);

const AuthCard = ({ children, title, subtitle, err }) => (
  <div style={{ background:"#fff", borderRadius:20, padding:"40px", width:"100%", maxWidth:440, boxShadow:"0 30px 80px rgba(90,0,0,0.35)", animation:"slideUp 0.4s ease", position:"relative", border:`1px solid ${C.border}` }}>
    <div style={{ textAlign:"center", marginBottom:28 }}>
      <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:4, marginBottom:10 }}>
        <div style={{ background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, borderRadius:14, padding:"10px 20px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{fontSize:22}}>🪷</span>
          <span style={{ fontWeight:800, fontSize:20, color:"#fff", fontFamily:"Georgia, serif", letterSpacing:"0.5px" }}>Tanishka Saree</span>
        </div>
        <span style={{ fontSize:10, color:C.gold, fontWeight:700, letterSpacing:"3px", textTransform:"uppercase" }}>Pvt. Ltd.</span>
      </div>
      {title    && <h2 style={{ margin:"8px 0 4px", fontSize:19, fontWeight:700, color:C.text, fontFamily:"Georgia, serif" }}>{title}</h2>}
      {subtitle && <p  style={{ margin:0, fontSize:13, color:C.textMid }}>{subtitle}</p>}
    </div>
    {err && <div style={{ background:"#fff0f0", border:"1px solid #ffcccc", borderRadius:8, padding:"10px 14px", marginBottom:14, color:"#c0392b", fontSize:13, fontWeight:600 }}>⚠️ {err}</div>}
    {children}
  </div>
);

const AuthBtn = ({ onClick, children, secondary=false, disabled=false, loading=false }) => (
  <button onClick={onClick} disabled={disabled||loading} style={{ width:"100%", padding:"13px", border: secondary?`1.5px solid ${C.border}`:"none", borderRadius:10, cursor:(disabled||loading)?"not-allowed":"pointer", background: secondary?"#fff":`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, color: secondary?C.textMid:"#fff", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:(disabled||loading)?0.7:1, marginBottom:10, fontFamily:"inherit" }}>
    {loading && !secondary && <Spinner size={16} color="#fff"/>} {children}
  </button>
);

const authInputStyle = {
  width:"100%", padding:"12px 14px", border:`1.5px solid ${C.border}`,
  borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  background:C.ivory, color:C.text,
};

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode]           = useState("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [name, setName]           = useState("");
  const [regEmail, setRegEmail]   = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(false);

  const loginEmail = async () => {
    if (!/\S+@\S+\.\S+/.test(email))  { setErr("Valid email required"); return; }
    if (!password)                     { setErr("Password required"); return; }
    setLoading(true); setErr("");
    try {
      const d = await Auth.login(email, password);
      localStorage.setItem("curecart_token", d.token);
      onAuth(d.user);
    } catch(e){ setErr(e.message); } finally { setLoading(false); }
  };

  const register = async () => {
    if (!name.trim())                        { setErr("Name required"); return; }
    if (!/\S+@\S+\.\S+/.test(regEmail))   { setErr("Valid email required"); return; }
    if (regPassword.length < 6)              { setErr("Password must be 6+ characters"); return; }
    setLoading(true); setErr("");
    try {
      const d = await Auth.register(name, regEmail, regPassword);
      localStorage.setItem("curecart_token", d.token);
      onAuth(d.user);
    } catch(e){ setErr(e.message); } finally { setLoading(false); }
  };

  const authWrap = {
    minHeight:"100vh", background:`linear-gradient(135deg,${C.maroonDk},#2d0008,${C.maroonDk})`,
    display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    fontFamily:"'Segoe UI',Georgia,system-ui,sans-serif",
  };

  if (mode === "login") return (
    <div style={authWrap}>
      <AuthBG/>
      <AuthCard title="Namaste! Welcome Back" subtitle="Sign in to explore our premium collection" err={err}>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Email</label>
          <input style={authInputStyle} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Password</label>
          <input style={authInputStyle} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&loginEmail()} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <AuthBtn onClick={loginEmail} loading={loading}>Sign In</AuthBtn>
        <AuthBtn secondary onClick={()=>{setMode("register");setErr("");}}>Create New Account</AuthBtn>
        <p style={{ textAlign:"center", fontSize:12, color:C.textLight, margin:"10px 0 0" }}>
          🔒 Your data is safe with us
        </p>
      </AuthCard>
    </div>
  );

  return (
    <div style={authWrap}>
      <AuthBG/>
      <AuthCard title="Join Tanishka" subtitle="Create your account to start shopping" err={err}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Full Name</label>
          <input style={authInputStyle} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Email</label>
          <input style={authInputStyle} type="email" placeholder="your@email.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Password</label>
          <input style={authInputStyle} type="password" placeholder="Min 6 characters" value={regPassword} onChange={e=>setRegPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&register()} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <AuthBtn onClick={register} loading={loading}>Create Account</AuthBtn>
        <AuthBtn secondary onClick={()=>{setMode("login");setErr("");}}>← Back to Sign In</AuthBtn>
      </AuthCard>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, cartCount, onCartOpen, onSearch, onLogout, onLogoClick, onCategoryClick, onOrdersOpen, onAdminOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch]     = useState("");
  const deb = useRef();
  const handle = v => { setSearch(v); clearTimeout(deb.current); deb.current = setTimeout(()=>onSearch(v),400); };

  return (
    <nav style={{ background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, position:"sticky", top:0, zIndex:1000, boxShadow:`0 2px 20px rgba(90,0,0,0.4)` }}>
      {/* Top strip */}
      <div style={{ background:C.maroonDk, padding:"5px 20px", borderBottom:`1px solid rgba(200,150,12,0.3)` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:`${C.gold}cc`, letterSpacing:"1px" }}>🚚 FREE SHIPPING ON ORDERS ABOVE ₹999 | HANDWOVEN WITH LOVE</span>
          <span style={{ fontSize:11, color:`${C.gold}cc` }}>📞 Customer Care: 1800-XXX-XXXX</span>
        </div>
      </div>
      {/* Main navbar */}
      <div style={{ padding:"0 20px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", gap:16, height:68 }}>
          <button onClick={onLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:0, padding:"4px 8px", borderRadius:8, flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{fontSize:22}}>🪷</span>
              <span style={{ fontWeight:800, fontSize:20, color:"#fff", fontFamily:"Georgia, serif", letterSpacing:"0.5px" }}>Tanishka Saree</span>
            </div>
            <span style={{ fontSize:9, color:C.gold, letterSpacing:"3px", fontWeight:700, marginLeft:30, textTransform:"uppercase" }}>Pvt. Ltd.</span>
          </button>

          <div style={{ flex:1, display:"flex", maxWidth:580 }}>
            <input value={search} onChange={e=>handle(e.target.value)} placeholder="Search sarees, fabric, occasion…"
              style={{ flex:1, padding:"10px 16px", border:"none", borderRadius:"8px 0 0 8px", fontSize:13.5, outline:"none", background:C.ivory, color:C.text, fontFamily:"inherit" }}/>
            <button style={{ padding:"10px 18px", background:C.gold, border:"none", borderRadius:"0 8px 8px 0", cursor:"pointer", fontSize:16, color:"#fff" }}>🔍</button>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
            <div style={{ position:"relative" }}>
              <button onClick={()=>setMenuOpen(!menuOpen)} style={{ background:"none", border:"none", cursor:"pointer", color:"#e8d5c4", padding:"6px 12px", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <span style={{fontSize:18}}>👤</span>
                <span style={{ fontSize:11, color:`${C.gold}cc` }}>Hi, {user.name.split(" ")[0]}</span>
              </button>
              {menuOpen&&(
                <div style={{ position:"absolute", top:"100%", right:0, background:"#fff", borderRadius:12, boxShadow:"0 12px 50px rgba(90,0,0,0.25)", padding:10, minWidth:210, zIndex:100, animation:"slideDown 0.15s ease", border:`1px solid ${C.border}` }}>
                  <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.ivoryDk}`, marginBottom:6 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text, fontFamily:"Georgia,serif" }}>{user.name}</p>
                    <p style={{ margin:0, fontSize:11, color:C.textLight }}>{user.email}</p>
                    {user.role==="admin"&&<span style={{ fontSize:10, background:C.maroon, color:"#fff", padding:"2px 8px", borderRadius:4, fontWeight:700, display:"inline-block", marginTop:4 }}>ADMIN</span>}
                  </div>
                  {user.role==="admin"&&(
                    <button onClick={()=>{setMenuOpen(false);onAdminOpen();}} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px", border:"none", background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, cursor:"pointer", fontSize:13, color:"#fff", borderRadius:7, marginBottom:5, fontWeight:700 }}>
                      ⚙️ Admin Panel
                    </button>
                  )}
                  <button onClick={()=>{setMenuOpen(false);onOrdersOpen();}} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:13, color:C.textMid, borderRadius:7 }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.ivory} onMouseLeave={e=>e.currentTarget.style.background="none"}>📦 My Orders</button>
                  <button onClick={()=>{setMenuOpen(false);onLogout();}} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:13, color:"#dc2626", borderRadius:7, marginTop:4, borderTop:`1px solid ${C.ivoryDk}` }}
                    onMouseEnter={e=>e.currentTarget.style.background="#fff5f5"} onMouseLeave={e=>e.currentTarget.style.background="none"}>🚪 Sign Out</button>
                </div>
              )}
            </div>
            <button onClick={onCartOpen} style={{ background:"none", border:"none", cursor:"pointer", color:"#e8d5c4", padding:"6px 12px", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{fontSize:20}}>🛍️</span>
              {cartCount>0&&<span style={{ position:"absolute", top:2, right:6, background:C.gold, color:C.maroonDk, borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
              <span style={{ fontSize:11, color:`${C.gold}cc` }}>Bag</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category bar */}
      <div style={{ background:`rgba(0,0,0,0.25)`, borderTop:`1px solid rgba(200,150,12,0.25)`, overflowX:"auto", scrollbarWidth:"none" }}>
        <div style={{ display:"flex", maxWidth:1280, margin:"0 auto", padding:"0 20px" }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>onCategoryClick(c.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"9px 16px", color:"#e8d5c4cc", fontSize:12.5, fontWeight:500, display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(200,150,12,0.15)";e.currentTarget.style.color=C.gold;}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#e8d5c4cc";}}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ─── HERO BANNER ──────────────────────────────────────────────────────────────
function HeroBanner() {
  const [active,setActive]=useState(0);
  const t=useRef();
  useEffect(()=>{ t.current=setInterval(()=>setActive(a=>(a+1)%BANNERS.length),4500); return()=>clearInterval(t.current); },[]);
  const b=BANNERS[active];
  return(
    <div style={{ background:b.bg, borderRadius:16, padding:"48px 56px", marginBottom:36, position:"relative", overflow:"hidden", minHeight:220, display:"flex", alignItems:"center", boxShadow:"0 8px 40px rgba(90,0,0,0.25)", border:`1px solid rgba(200,150,12,0.3)` }}>
      {/* Decorative gold border pattern */}
      <div style={{ position:"absolute", inset:0, background:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8960C' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", opacity:0.5 }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 6px", fontSize:12, color:b.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:"3px" }}>✦ Exclusive Collection ✦</p>
        <h2 style={{ margin:"0 0 10px", fontSize:38, fontWeight:900, color:"#fff", lineHeight:1.15, fontFamily:"Georgia, serif" }}>{b.title}</h2>
        <p style={{ margin:"0 0 24px", fontSize:15, color:"rgba(255,255,255,0.75)" }}>{b.subtitle}</p>
        <button style={{ padding:"11px 28px", background:b.accent, border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontSize:14, color:"#2C0A0A", letterSpacing:"0.5px" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
          Shop Now →
        </button>
      </div>
      <div style={{ position:"absolute", right:60, fontSize:110, opacity:0.12 }}>{b.img}</div>
      <div style={{ position:"absolute", bottom:18, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6 }}>
        {BANNERS.map((_,i)=><button key={i} onClick={()=>setActive(i)} style={{ width:active===i?28:8, height:8, borderRadius:4, border:"none", background:active===i?b.accent:"rgba(255,255,255,0.3)", cursor:"pointer", transition:"all 0.3s" }}/>)}
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, onView }) {
  const [added,setAdded]=useState(false);
  const [hov,setHov]=useState(false);
  const img=product.images?.[0]?.url||"";
  const disc=product.discount||Math.round(((product.originalPrice-product.price)/product.originalPrice)*100)||0;
  const handleAdd=async e=>{ e.stopPropagation(); setAdded(true); await onAdd(product); setTimeout(()=>setAdded(false),1500); };
  return(
    <div onClick={()=>onView(product)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", border:`1px solid ${hov?C.gold:C.border}`, boxShadow:hov?"0 14px 45px rgba(90,0,0,0.18)":"0 2px 12px rgba(90,0,0,0.06)", transform:hov?"translateY(-5px)":"translateY(0)", transition:"all 0.25s" }}>
      <div style={{ position:"relative", paddingTop:"75%", background:C.ivory }}>
        {img?<img src={img} alt={product.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.3s", transform:hov?"scale(1.06)":"scale(1)" }}/>
            :<div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, color:C.textLight }}>🪷</div>}
        {product.tag&&<span style={{ position:"absolute", top:10, left:10, background:C.maroon, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:4 }}>{product.tag}</span>}
        {disc>0&&<span style={{ position:"absolute", top:10, right:10, background:"#16a34a", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:4 }}>{disc}% OFF</span>}
      </div>
      <div style={{ padding:"12px 14px 15px" }}>
        <h3 style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:C.text, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.45, fontFamily:"Georgia, serif" }}>{product.title}</h3>
        <StarRating rating={product.rating||0}/>
        <p style={{ margin:"2px 0 8px", fontSize:11, color:C.textLight }}>{(product.numReviews||0).toLocaleString()} reviews</p>
        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:11 }}>
          <span style={{ fontSize:16, fontWeight:800, color:C.maroon }}>{fmt(product.price)}</span>
          {product.originalPrice>product.price&&<span style={{ fontSize:12, color:C.textLight, textDecoration:"line-through" }}>{fmt(product.originalPrice)}</span>}
        </div>
        <button onClick={handleAdd} style={{ width:"100%", padding:"9px 0", border:"none", borderRadius:8, cursor:"pointer", background:added?`linear-gradient(135deg,#16a34a,#15803d)`:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, color:"#fff", fontWeight:700, fontSize:12.5, transition:"all 0.2s" }}>
          {added?"✓ Added to Bag!":"Add to Bag"}
        </button>
      </div>
    </div>
  );
}

function ProductSection({ title, icon, products, onAdd, onView }) {
  if(!products.length) return null;
  return(
    <div style={{ marginBottom:44 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <h2 style={{ margin:0, fontSize:21, fontWeight:800, color:C.text, fontFamily:"Georgia, serif" }}>{title}</h2>
        <div style={{ flex:1, height:1, background:`linear-gradient(to right,${C.gold}60,transparent)`, marginLeft:8 }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))", gap:18 }}>
        {products.map(p=><ProductCard key={p._id} product={p} onAdd={onAdd} onView={onView}/>)}
      </div>
    </div>
  );
}

// ─── CART SIDEBAR ─────────────────────────────────────────────────────────────
function CartSidebar({ cart, onClose, onRemove, onUpdateQty, loading, onCheckout }) {
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=total>=999?0:99;
  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.5)", zIndex:900 }}/>
      <div style={{ position:"fixed", top:0, right:0, height:"100%", width:390, background:"#fff", zIndex:1000, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(90,0,0,0.2)", animation:"slideInRight 0.3s ease" }}>
        <div style={{ padding:"18px 22px", background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ margin:0, color:"#fff", fontSize:17, fontFamily:"Georgia,serif" }}>🛍️ Shopping Bag</h3>
            <p style={{ margin:0, fontSize:12, color:`${C.gold}cc`, marginTop:2 }}>{cart.length} item{cart.length!==1?"s":""}</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {loading?<div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner/></div>
          :cart.length===0?(
            <div style={{ textAlign:"center", padding:"60px 20px", color:C.textLight }}>
              <div style={{ fontSize:60, marginBottom:14 }}>🛍️</div>
              <p style={{ fontWeight:600, color:C.textMid, fontFamily:"Georgia,serif" }}>Your bag is empty</p>
              <p style={{ fontSize:13 }}>Discover our beautiful sarees!</p>
            </div>
          ):cart.map(item=>(
            <div key={item.product?._id||item._id} style={{ display:"flex", gap:12, padding:"14px 0", borderBottom:`1px solid ${C.ivoryDk}` }}>
              <div style={{ width:72, height:80, borderRadius:10, overflow:"hidden", flexShrink:0, background:C.ivory, border:`1px solid ${C.border}` }}>
                {item.image?<img src={item.image} alt={item.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🪷</div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:600, color:C.text, fontFamily:"Georgia,serif" }}>{item.title?.slice(0,36)}{item.title?.length>36?"…":""}</p>
                <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:800, color:C.maroon }}>{fmt(item.price)}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", border:`1px solid ${C.border}`, borderRadius:7, overflow:"hidden" }}>
                    <button onClick={()=>onUpdateQty(item.product?._id||item.product,item.qty-1)} style={{ width:32, height:32, border:"none", background:C.ivory, cursor:"pointer", fontSize:16, fontWeight:700, color:C.maroon }}>−</button>
                    <span style={{ width:32, textAlign:"center", fontWeight:700, fontSize:13 }}>{item.qty}</span>
                    <button onClick={()=>onUpdateQty(item.product?._id||item.product,item.qty+1)} style={{ width:32, height:32, border:"none", background:C.ivory, cursor:"pointer", fontSize:16, fontWeight:700, color:C.maroon }}>+</button>
                  </div>
                  <button onClick={()=>onRemove(item.product?._id||item.product)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#dc2626", fontWeight:600 }}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length>0&&(
          <div style={{ padding:"18px 22px", borderTop:`1px solid ${C.border}`, background:C.ivory }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, color:C.textMid }}>Subtotal</span><span style={{ fontWeight:600 }}>{fmt(total)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:13, color:C.textMid }}>Shipping</span>
              <span style={{ color:ship===0?"#16a34a":C.text, fontWeight:600 }}>{ship===0?"FREE ✦":fmt(ship)}</span>
            </div>
            {ship===0&&<p style={{ fontSize:11, color:"#16a34a", margin:"-10px 0 10px", fontWeight:600 }}>✦ You qualify for free shipping!</p>}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderTop:`1px solid ${C.border}`, marginBottom:14 }}>
              <span style={{ fontWeight:800, fontSize:15, color:C.text }}>Total</span>
              <span style={{ fontSize:18, fontWeight:900, color:C.maroon }}>{fmt(total+ship)}</span>
            </div>
            <button onClick={onCheckout} style={{ width:"100%", padding:"13px", border:"none", borderRadius:10, cursor:"pointer", background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, color:"#fff", fontWeight:700, fontSize:15, letterSpacing:"0.5px" }}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────
function CheckoutModal({ cart, onClose, onPlaced, showToast }) {
  const [form,setForm]=useState({name:"",street:"",city:"",state:"",pincode:"",phone:""});
  const [payMethod,setPay]=useState("RAZORPAY");
  const [loading,setLoading]=useState(false);
  const [errors,setErrors]=useState({});

  const validate=()=>{ const e={}; if(!form.name)e.name="Required"; if(!form.street)e.street="Required"; if(!form.city)e.city="Required"; if(!form.state)e.state="Required"; if(!/^\d{6}$/.test(form.pincode))e.pincode="6-digit required"; if(!/^\d{10}$/.test(form.phone))e.phone="10-digit required"; return e; };

  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=total>=999?0:99;
  const grand=total+ship;

  const loadRzp=()=>new Promise(resolve=>{ if(window.Razorpay)return resolve(true); const s=document.createElement("script"); s.src="https://checkout.razorpay.com/v1/checkout.js"; s.onload=()=>resolve(true); s.onerror=()=>resolve(false); document.body.appendChild(s); });

  const submit=async()=>{
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    setLoading(true);
    try{
      const orderItems=cart.map(i=>({product:i.product?._id||i.product,qty:i.qty}));
      const orderData=await Orders.place({items:orderItems,shippingAddress:form,paymentMethod:payMethod});
      const createdOrder=orderData.order;
      if(payMethod==="RAZORPAY"){
        const loaded=await loadRzp(); if(!loaded){showToast("❌ Razorpay load failed");setLoading(false);return;}
        const rzp=await Payment.createOrder(grand,createdOrder._id);
        new window.Razorpay({
          key:rzp.keyId, amount:rzp.amount, currency:rzp.currency, name:"Tanishka Saree Pvt Ltd",
          description:"Saree Purchase", order_id:rzp.razorpayOrderId,
          handler:async r=>{ try{ await Payment.verify({razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature,orderId:createdOrder._id}); showToast("🎉 Payment successful!"); onPlaced(); }catch{ showToast("❌ Payment verification failed"); }},
          prefill:{name:form.name,contact:form.phone}, theme:{color:C.maroon},
          modal:{ondismiss:()=>{setLoading(false);showToast("Payment cancelled");}},
        }).open(); setLoading(false);
      }else{ showToast("🎉 Order placed! Pay on delivery."); onPlaced(); }
    }catch(err){showToast("❌ "+err.message);setLoading(false);}
  };

  const inputSt=(field)=>({ value:form[field], onChange:e=>{ setForm({...form,[field]:e.target.value}); setErrors({...errors,[field]:""}); }, style:{ width:"100%", padding:"10px 14px", border:`1.5px solid ${errors[field]?"#dc2626":C.border}`, borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", background:C.ivory, fontFamily:"inherit", color:C.text } });

  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.6)", zIndex:1300 }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:520, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 80px rgba(90,0,0,0.35)", animation:"scaleIn 0.25s", border:`1px solid ${C.border}` }}>
          <div style={{ padding:"18px 24px", background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, color:"#fff", fontSize:17, fontFamily:"Georgia,serif" }}>📦 Checkout</h3>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:30, height:30, borderRadius:"50%", cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>
            <h4 style={{ margin:"0 0 12px", fontSize:14, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", fontWeight:700 }}>Shipping Address</h4>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
              <div style={{ gridColumn:"1/-1" }}><input {...inputSt("name")} placeholder="Full Name"/>{errors.name&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.name}</p>}</div>
              <div style={{ gridColumn:"1/-1" }}><input {...inputSt("street")} placeholder="Street Address"/>{errors.street&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.street}</p>}</div>
              <div><input {...inputSt("city")} placeholder="City"/>{errors.city&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.city}</p>}</div>
              <div><input {...inputSt("state")} placeholder="State"/>{errors.state&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.state}</p>}</div>
              <div><input {...inputSt("pincode")} placeholder="Pincode" maxLength={6}/>{errors.pincode&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.pincode}</p>}</div>
              <div><input {...inputSt("phone")} placeholder="Phone" maxLength={10}/>{errors.phone&&<p style={{ color:"#dc2626", fontSize:11, margin:"2px 0 0" }}>{errors.phone}</p>}</div>
            </div>
            <h4 style={{ margin:"0 0 10px", fontSize:14, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", fontWeight:700 }}>Payment Method</h4>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {[["RAZORPAY","💳 Pay Online"],["COD","💵 Cash on Delivery"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPay(v)} style={{ padding:12, border:`2px solid ${payMethod===v?C.gold:C.border}`, borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, background:payMethod===v?`${C.gold}15`:"#fff", color:payMethod===v?C.maroon:C.textMid }}>{l}</button>
              ))}
            </div>
            {payMethod==="RAZORPAY"&&<div style={{ background:C.ivory, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.textMid, border:`1px solid ${C.border}` }}>💡 Test: Card <strong>4111 1111 1111 1111</strong>, CVV 123, any future date</div>}
            <div style={{ background:C.ivory, borderRadius:10, padding:"14px 16px", border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:C.textMid }}>Items</span><span>{fmt(total)}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, color:C.textMid }}>Shipping</span><span style={{ color:ship===0?"#16a34a":C.text }}>{ship===0?"FREE":fmt(ship)}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.border}`, marginTop:8 }}><span style={{ fontWeight:700, color:C.text }}>Total</span><span style={{ fontSize:18, fontWeight:900, color:C.maroon }}>{fmt(grand)}</span></div>
            </div>
          </div>
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, background:C.ivory }}>
            <button onClick={submit} disabled={loading} style={{ width:"100%", padding:13, border:"none", borderRadius:10, cursor:loading?"not-allowed":"pointer", background:payMethod==="RAZORPAY"?`linear-gradient(135deg,${C.maroon},${C.maroonLt})`:`linear-gradient(135deg,#c2410c,#ea580c)`, color:"#fff", fontWeight:700, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:10, opacity:loading?0.8:1 }}>
              {loading&&<Spinner size={18} color="#fff"/>}
              {loading?"Processing…":payMethod==="RAZORPAY"?`Pay ${fmt(grand)} →`:"Place Order (COD) →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onClose, showToast }) {
  const [tab,setTab]=useState("dashboard");
  const [stats,setStats]=useState(null);
  const [products,setProducts]=useState([]);
  const [orders,setOrders]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(false);
  const [productModal,setProductModal]=useState(null);
  const [orderFilter,setOrderFilter]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      if(tab==="dashboard"){ const d=await Admin.stats(); setStats(d); }
      else if(tab==="products"){ const d=await Admin.products({limit:100}); setProducts(d.products); }
      else if(tab==="orders"){ const d=await Admin.orders({limit:100,...(orderFilter&&{status:orderFilter})}); setOrders(d.orders); }
      else if(tab==="users"){ const d=await Admin.users({limit:100}); setUsers(d.users); }
    }catch(e){showToast("❌ "+e.message);}
    finally{setLoading(false);}
  },[tab,orderFilter]);

  useEffect(()=>{load();},[load]);

  const delProduct=async id=>{ if(!confirm("Delete product?"))return; try{await Admin.deleteProduct(id);showToast("✅ Deleted");load();}catch(e){showToast("❌ "+e.message);} };
  const orderStatus=async(id,s)=>{ try{await Admin.updateOrder(id,{orderStatus:s});showToast("✅ Updated");load();}catch(e){showToast("❌ "+e.message);} };
  const toggleUser=async u=>{ try{await Admin.updateUser(u._id,{isActive:!u.isActive});showToast(`✅ User ${u.isActive?"deactivated":"activated"}`);load();}catch(e){showToast("❌ "+e.message);} };

  const TABS=[["dashboard","📊 Dashboard"],["products","🪷 Products"],["orders","📋 Orders"],["users","👥 Users"]];

  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.7)", zIndex:1500 }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1600, display:"flex", flexDirection:"column", background:"#f8f3ee", animation:"scaleIn 0.2s" }}>
        <div style={{ background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{fontSize:20}}>🪷</span>
            <span style={{ fontWeight:800, fontSize:17, color:"#fff", fontFamily:"Georgia,serif" }}>Tanishka Saree — Admin Panel</span>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>← Back to Store</button>
        </div>
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          <div style={{ width:220, background:"#2C0A0A", display:"flex", flexDirection:"column", flexShrink:0, padding:"16px 0" }}>
            {TABS.map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{ padding:"12px 20px", border:"none", background:tab===key?`rgba(200,150,12,0.2)`:"none", color:tab===key?C.gold:"#b09090", cursor:"pointer", fontSize:13.5, fontWeight:tab===key?700:500, textAlign:"left", borderLeft:tab===key?`3px solid ${C.gold}`:"3px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:24 }}>
            {loading?<div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={48}/></div>:(

            tab==="dashboard"&&stats&&(
              <div>
                <h2 style={{ margin:"0 0 20px", fontSize:22, fontWeight:800, color:C.text, fontFamily:"Georgia,serif" }}>Dashboard Overview</h2>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
                  {[{l:"Total Revenue",v:fmt(stats.stats.revenue),i:"💰",c:"#16a34a"},{l:"Total Orders",v:stats.stats.totalOrders,i:"📦",c:C.maroon},{l:"Products",v:stats.stats.totalProducts,i:"🪷",c:"#7c3aed"},{l:"Users",v:stats.stats.totalUsers,i:"👥",c:C.gold}].map(card=>(
                    <div key={card.l} style={{ background:"#fff", borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{fontSize:28}}>{card.i}</span><span style={{ fontSize:22, fontWeight:900, color:card.c }}>{card.v}</span>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:C.textMid, fontWeight:600 }}>{card.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                  <div style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                    <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:C.text }}>Recent Orders</h3>
                    {(stats.recentOrders||[]).map(o=>(
                      <div key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.ivoryDk}` }}>
                        <div><p style={{ margin:0, fontSize:12, fontWeight:600 }}>#{o._id.slice(-6).toUpperCase()}</p><p style={{ margin:0, fontSize:11, color:C.textLight }}>{o.user?.name}</p></div>
                        <div style={{ textAlign:"right" }}><p style={{ margin:0, fontSize:13, fontWeight:700 }}>{fmt(o.totalAmount)}</p><span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:(STATUS_COLORS[o.orderStatus]||"#gray")+"20", color:STATUS_COLORS[o.orderStatus] }}>{o.orderStatus}</span></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                    <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:C.text }}>⚠️ Low Stock</h3>
                    {(stats.lowStockProducts||[]).length===0?<p style={{ color:C.textLight, fontSize:13 }}>All products well stocked!</p>
                    :(stats.lowStockProducts||[]).map(p=>(
                      <div key={p._id} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.ivoryDk}` }}>
                        <p style={{ margin:0, fontSize:12, fontWeight:600 }}>{p.title.slice(0,30)}…</p>
                        <span style={{ fontSize:12, fontWeight:800, color:p.stock<5?"#dc2626":"#f59e0b" }}>{p.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {!loading&&tab==="products"&&(
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text, fontFamily:"Georgia,serif" }}>Products ({products.length})</h2>
                  <button onClick={()=>setProductModal("new")} style={{ padding:"10px 20px", background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 }}>+ Add Saree</button>
                </div>
                <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:C.ivory }}>{["Image","Title","Category","Price","Stock","Rating","Actions"].map(h=><th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:700, color:C.textMid, borderBottom:`1px solid ${C.border}`, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {products.map(p=>(
                        <tr key={p._id} style={{ borderBottom:`1px solid ${C.ivoryDk}` }} onMouseEnter={e=>e.currentTarget.style.background=C.ivory} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <td style={{ padding:"10px 16px" }}><div style={{ width:48, height:52, background:C.ivoryDk, borderRadius:8, overflow:"hidden" }}>{p.images?.[0]?.url?<img src={p.images[0].url} alt={p.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:<div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🪷</div>}</div></td>
                          <td style={{ padding:"10px 16px", fontSize:13, fontWeight:600, color:C.text, maxWidth:180 }}>{p.title.slice(0,35)}{p.title.length>35?"…":""}</td>
                          <td style={{ padding:"10px 16px" }}><span style={{ fontSize:11, background:`${C.maroon}15`, color:C.maroon, padding:"2px 8px", borderRadius:20, fontWeight:600, textTransform:"capitalize" }}>{p.category}</span></td>
                          <td style={{ padding:"10px 16px", fontSize:13, fontWeight:700, color:C.maroon }}>{fmt(p.price)}</td>
                          <td style={{ padding:"10px 16px" }}><span style={{ fontSize:12, fontWeight:700, color:p.stock<10?"#dc2626":p.stock<20?"#f59e0b":"#16a34a" }}>{p.stock}</span></td>
                          <td style={{ padding:"10px 16px", fontSize:12, color:C.gold, fontWeight:700 }}>★ {p.rating}</td>
                          <td style={{ padding:"10px 16px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>setProductModal(p)} style={{ padding:"5px 12px", background:`${C.maroon}10`, border:"none", borderRadius:6, cursor:"pointer", fontSize:12, color:C.maroon, fontWeight:600 }}>Edit</button>
                              <button onClick={()=>delProduct(p._id)} style={{ padding:"5px 12px", background:"#fef2f2", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, color:"#dc2626", fontWeight:600 }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length===0&&<div style={{ textAlign:"center", padding:40, color:C.textLight }}>No products yet. Click "Add Saree" to get started!</div>}
                </div>
              </div>
            )}

            {!loading&&tab==="orders"&&(
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text, fontFamily:"Georgia,serif" }}>Orders ({orders.length})</h2>
                  <select value={orderFilter} onChange={e=>setOrderFilter(e.target.value)} style={{ padding:"8px 14px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, outline:"none", cursor:"pointer", background:"#fff", color:C.text }}>
                    <option value="">All Status</option>
                    {["placed","confirmed","shipped","out_for_delivery","delivered","cancelled"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {orders.map(o=>(
                    <div key={o._id} style={{ background:"#fff", borderRadius:12, padding:16, boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                        <div>
                          <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>#{o._id.slice(-8).toUpperCase()}</p>
                          <p style={{ margin:"2px 0 0", fontSize:12, color:C.textLight }}>{o.user?.name} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:14, fontWeight:800, color:C.maroon }}>{fmt(o.totalAmount)}</span>
                          <select value={o.orderStatus} onChange={e=>orderStatus(o._id,e.target.value)}
                            style={{ padding:"5px 10px", border:`1.5px solid ${STATUS_COLORS[o.orderStatus]||C.border}`, borderRadius:8, fontSize:12, fontWeight:700, color:STATUS_COLORS[o.orderStatus], outline:"none", cursor:"pointer", background:(STATUS_COLORS[o.orderStatus]||"#e2e8f0")+"15" }}>
                            {["placed","confirmed","shipped","out_for_delivery","delivered","cancelled"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {o.items.map((item,i)=>(
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:C.ivory, borderRadius:8, padding:"6px 10px", border:`1px solid ${C.border}` }}>
                            {item.image&&<img src={item.image} alt={item.title} style={{ width:32, height:36, objectFit:"cover", borderRadius:4 }}/>}
                            <div><p style={{ margin:0, fontSize:11, fontWeight:600 }}>{item.title?.slice(0,25)}</p><p style={{ margin:0, fontSize:10, color:C.textLight }}>x{item.qty} · {fmt(item.price)}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {orders.length===0&&<div style={{ textAlign:"center", padding:40, color:C.textLight }}>No orders found.</div>}
                </div>
              </div>
            )}

            {!loading&&tab==="users"&&(
              <div>
                <h2 style={{ margin:"0 0 20px", fontSize:22, fontWeight:800, color:C.text, fontFamily:"Georgia,serif" }}>Users ({users.length})</h2>
                <div style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(90,0,0,0.06)", border:`1px solid ${C.border}` }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:C.ivory }}>{["Name","Email","Phone","Role","Status","Joined","Action"].map(h=><th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, fontWeight:700, color:C.textMid, borderBottom:`1px solid ${C.border}`, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {users.map(u=>(
                        <tr key={u._id} style={{ borderBottom:`1px solid ${C.ivoryDk}` }} onMouseEnter={e=>e.currentTarget.style.background=C.ivory} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:C.text }}>{u.name}</td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:C.textMid }}>{u.email}</td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:C.textMid }}>{u.phone&&`+91 ${u.phone}`}</td>
                          <td style={{ padding:"12px 16px" }}><span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:u.role==="admin"?`${C.maroon}20`:`${C.gold}20`, color:u.role==="admin"?C.maroon:C.gold }}>{u.role}</span></td>
                          <td style={{ padding:"12px 16px" }}><span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:u.isActive?"#dcfce7":"#fef2f2", color:u.isActive?"#16a34a":"#dc2626" }}>{u.isActive?"Active":"Inactive"}</span></td>
                          <td style={{ padding:"12px 16px", fontSize:12, color:C.textLight }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <button onClick={()=>toggleUser(u)} style={{ padding:"5px 12px", background:u.isActive?"#fef2f2":"#f0fdf4", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, color:u.isActive?"#dc2626":"#16a34a", fontWeight:600 }}>
                              {u.isActive?"Deactivate":"Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {productModal&&<ProductFormModal product={productModal==="new"?null:productModal} onClose={()=>setProductModal(null)} onSaved={()=>{setProductModal(null);load();showToast("✅ Product saved!");}} showToast={showToast}/>}
    </>
  );
}

// ─── PRODUCT FORM (Admin) ─────────────────────────────────────────────────────
function ProductFormModal({ product, onClose, onSaved, showToast }) {
  const isEdit=!!product;
  const [form,setForm]=useState({
    title:product?.title||"", description:product?.description||"",
    price:product?.price||"", originalPrice:product?.originalPrice||"",
    category:product?.category||"silk", tag:product?.tag||"",
    brand:product?.brand||"", stock:product?.stock||100,
    isFeatured:product?.isFeatured||false, imageUrl:product?.images?.[0]?.url||"",
  });
  const [imgFile,setImgFile]=useState(null);
  const [imgPreview,setImgPreview]=useState(product?.images?.[0]?.url||"");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();

  const handleFile=e=>{
    const f=e.target.files[0]; if(!f)return;
    if(f.size>5*1024*1024){showToast("❌ File too large (max 5MB)");return;}
    setImgFile(f);
    const reader=new FileReader(); reader.onload=e=>setImgPreview(e.target.result); reader.readAsDataURL(f);
  };

  const save=async()=>{
    if(!form.title||!form.description||!form.price||!form.originalPrice){showToast("❌ Fill all required fields");return;}
    if(!imgFile&&!form.imageUrl&&!imgPreview){showToast("❌ Product image required");return;}
    setLoading(true);
    try{
      const fd=new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k,v));
      if(imgFile) fd.append("image",imgFile);
      if(isEdit) await Admin.updateProduct(product._id,fd);
      else       await Admin.createProduct(fd);
      onSaved();
    }catch(e){showToast("❌ "+e.message);}
    finally{setLoading(false);}
  };

  const inSt={ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", background:C.ivory, color:C.text, fontFamily:"inherit" };
  const F=(key,label,type="text",opts=null)=>(
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</label>
      {opts?
        <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={inSt}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>:
        <input value={form[key]} type={type} onChange={e=>setForm({...form,[key]:e.target.value})} style={inSt}
          onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
      }
    </div>
  );

  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.7)", zIndex:1700 }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1800, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:580, maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 80px rgba(90,0,0,0.4)", animation:"scaleIn 0.2s", border:`1px solid ${C.border}` }}>
          <div style={{ padding:"16px 24px", background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, color:"#fff", fontSize:16, fontFamily:"Georgia,serif" }}>{isEdit?"✏️ Edit Product":"✦ Add New Saree"}</h3>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:28, height:28, borderRadius:"50%", cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>
            {F("title","Saree / Product Title *")}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>Description *</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3}
                style={{ ...inSt, resize:"vertical" }} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {F("price","Selling Price (₹) *","number")}
              {F("originalPrice","Original Price (₹) *","number")}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {F("category","Category *","text",["silk","cotton","banarasi","kanjivaram","chanderi","designer","georgette","fashion"])}
              {F("stock","Stock Qty","number")}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {F("brand","Brand")}
              {F("tag","Tag (e.g. Best Seller)")}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.textMid, display:"block", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Product Image *</label>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <div onClick={()=>fileRef.current.click()}
                  style={{ width:100, height:100, border:`2px dashed ${C.border}`, borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, background:C.ivory, transition:"all 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.background=C.ivoryDk;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.ivory;}}>
                  <span style={{fontSize:24}}>📁</span>
                  <span style={{ fontSize:11, color:C.textLight, marginTop:4, textAlign:"center" }}>Upload<br/>Image</span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
                </div>
                {imgPreview&&(
                  <div style={{ flex:1, position:"relative" }}>
                    <img src={imgPreview} alt="preview" style={{ width:"100%", height:100, objectFit:"cover", borderRadius:10, border:`1px solid ${C.border}` }}/>
                    <button onClick={()=>{setImgFile(null);setImgPreview("");setForm({...form,imageUrl:""}); }}
                      style={{ position:"absolute", top:4, right:4, background:"rgba(44,10,10,0.7)", border:"none", color:"#fff", width:22, height:22, borderRadius:"50%", cursor:"pointer", fontSize:12 }}>✕</button>
                  </div>
                )}
              </div>
              {!imgPreview&&(
                <div style={{ marginTop:10 }}>
                  <p style={{ fontSize:11, color:C.textLight, margin:"0 0 6px" }}>— or paste image URL —</p>
                  <input value={form.imageUrl} onChange={e=>{setForm({...form,imageUrl:e.target.value});if(e.target.value)setImgPreview(e.target.value);}} placeholder="https://example.com/image.jpg" style={inSt}/>
                </div>
              )}
              {imgFile&&<p style={{ fontSize:11, color:"#16a34a", margin:"6px 0 0" }}>✓ {imgFile.name} selected — will upload to Cloudinary</p>}
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer", color:C.textMid }}>
              <input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/>
              Mark as Featured Product
            </label>
          </div>
          <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, background:C.ivory }}>
            <button onClick={onClose} style={{ flex:1, padding:12, border:`1.5px solid ${C.border}`, borderRadius:10, cursor:"pointer", background:"#fff", color:C.textMid, fontWeight:600, fontSize:14 }}>Cancel</button>
            <button onClick={save} disabled={loading} style={{ flex:2, padding:12, border:"none", borderRadius:10, cursor:"pointer", background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, color:"#fff", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.8:1 }}>
              {loading&&<Spinner size={16} color="#fff"/>}
              {loading?"Saving…":isEdit?"Update Product":"Add Saree"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MY ORDERS ────────────────────────────────────────────────────────────────
function MyOrdersModal({ onClose }) {
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ Orders.mine().then(d=>setOrders(d.orders)).catch(()=>{}).finally(()=>setLoading(false)); },[]);
  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.6)", zIndex:1300 }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:620, maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 80px rgba(90,0,0,0.35)", animation:"scaleIn 0.25s", border:`1px solid ${C.border}` }}>
          <div style={{ padding:"18px 24px", background:`linear-gradient(135deg,${C.maroonDk},${C.maroon})`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, color:"#fff", fontSize:17, fontFamily:"Georgia,serif" }}>📦 My Orders</h3>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:30, height:30, borderRadius:"50%", cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>
            {loading?<div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner/></div>
            :orders.length===0?<div style={{ textAlign:"center", padding:"60px 20px", color:C.textLight }}><div style={{ fontSize:54, marginBottom:14 }}>📦</div><p style={{ fontWeight:600, color:C.textMid, fontFamily:"Georgia,serif" }}>No orders yet</p><p style={{ fontSize:13 }}>Start shopping our beautiful sarees!</p></div>
            :orders.map(o=>(
              <div key={o._id} style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14, background:C.ivory }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div><p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>#{o._id.slice(-8).toUpperCase()}</p><p style={{ margin:"2px 0 0", fontSize:11, color:C.textLight }}>{new Date(o.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p></div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:(STATUS_COLORS[o.orderStatus]||"#gray")+"20", color:STATUS_COLORS[o.orderStatus], textTransform:"capitalize", alignSelf:"flex-start" }}>{o.orderStatus.replace("_"," ")}</span>
                </div>
                {o.items.map((item,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                    {item.image&&<img src={item.image} alt={item.title} style={{ width:48, height:54, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>}
                    <div><p style={{ margin:0, fontSize:12, fontWeight:600, color:C.text }}>{item.title?.slice(0,40)}{item.title?.length>40?"…":""}</p><p style={{ margin:0, fontSize:11, color:C.textMid }}>Qty: {item.qty} × {fmt(item.price)}</p></div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.border}`, marginTop:4 }}>
                  <span style={{ fontSize:12, color:C.textMid }}>{o.paymentMethod} · <span style={{ color:o.paymentStatus==="paid"?"#16a34a":"#f59e0b" }}>{o.paymentStatus}</span></span>
                  <span style={{ fontSize:15, fontWeight:800, color:C.maroon }}>{fmt(o.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────────────────
function ProductDetail({ product:init, onClose, onAdd, showToast }) {
  const [product,setProduct]=useState(init);
  const [qty,setQty]=useState(1);
  const [added,setAdded]=useState(false);
  const [tab,setTab]=useState("desc");
  const [rv,setRv]=useState({rating:5,comment:""});
  const [sub,setSub]=useState(false);
  useEffect(()=>{ if(init._id) Products.get(init._id).then(d=>setProduct(d.product)).catch(()=>{}); },[init._id]);
  const img=product.images?.[0]?.url||"";
  const disc=product.discount||Math.round(((product.originalPrice-product.price)/product.originalPrice)*100)||0;
  const handleAdd=async()=>{ setAdded(true); await onAdd(product,qty); setTimeout(()=>setAdded(false),1500); };
  const submitReview=async()=>{
    if(!rv.comment.trim())return; setSub(true);
    try{ await Products.addReview(product._id,rv.rating,rv.comment); const u=await Products.get(product._id); setProduct(u.product); setRv({rating:5,comment:""}); showToast("✅ Review submitted!"); }
    catch(e){ showToast("❌ "+e.message); } finally{setSub(false);}
  };
  return(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,10,10,0.6)", zIndex:1100 }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:900, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 80px rgba(90,0,0,0.35)", animation:"scaleIn 0.25s", border:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:`1px solid ${C.border}`, background:C.ivory }}>
            <h3 style={{ margin:0, fontSize:15, color:C.text, fontFamily:"Georgia,serif" }}>Product Details</h3>
            <button onClick={onClose} style={{ background:C.ivoryDk, border:`1px solid ${C.border}`, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:14, color:C.textMid }}>✕</button>
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ background:C.ivory, display:"flex", alignItems:"center", justifyContent:"center", minHeight:340, borderRight:`1px solid ${C.border}` }}>
                {img?<img src={img} alt={product.title} style={{ width:"100%", height:340, objectFit:"cover" }}/>:<div style={{ fontSize:70, color:C.textLight }}>🪷</div>}
              </div>
              <div style={{ padding:30 }}>
                {product.tag&&<span style={{ background:`${C.gold}25`, color:C.maroon, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:4 }}>{product.tag}</span>}
                <h2 style={{ margin:"12px 0 8px", fontSize:19, fontWeight:700, lineHeight:1.4, color:C.text, fontFamily:"Georgia, serif" }}>{product.title}</h2>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <StarRating rating={product.rating||0}/><span style={{ fontSize:12, color:C.textLight }}>({(product.numReviews||0).toLocaleString()} reviews)</span>
                </div>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
                  <span style={{ fontSize:28, fontWeight:900, color:C.maroon }}>{fmt(product.price)}</span>
                  {product.originalPrice>product.price&&<span style={{ fontSize:16, color:C.textLight, textDecoration:"line-through" }}>{fmt(product.originalPrice)}</span>}
                  {disc>0&&<span style={{ background:"#dcfce7", color:"#16a34a", fontSize:13, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>{disc}% OFF</span>}
                </div>
                {product.originalPrice>product.price&&<p style={{ margin:"0 0 14px", fontSize:12, color:"#16a34a", fontWeight:600 }}>You save {fmt(product.originalPrice-product.price)}</p>}
                {product.brand&&<p style={{ margin:"0 0 8px", fontSize:12, color:C.textMid }}><strong>Brand:</strong> {product.brand}</p>}
                <p style={{ fontSize:12, color:product.stock>0?"#16a34a":"#dc2626", fontWeight:600, margin:"0 0 16px" }}>{product.stock>0?`✓ In Stock (${product.stock} available)`:"✗ Out of Stock"}</p>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:13, color:C.textMid, fontWeight:600 }}>Qty:</span>
                  <div style={{ display:"flex", alignItems:"center", border:`1.5px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                    <button onClick={()=>setQty(Math.max(1,qty-1))} style={{ width:36, height:36, border:"none", background:C.ivory, cursor:"pointer", fontSize:18, fontWeight:700, color:C.maroon }}>−</button>
                    <span style={{ width:36, textAlign:"center", fontWeight:700, color:C.text }}>{qty}</span>
                    <button onClick={()=>setQty(Math.min(product.stock||99,qty+1))} style={{ width:36, height:36, border:"none", background:C.ivory, cursor:"pointer", fontSize:18, fontWeight:700, color:C.maroon }}>+</button>
                  </div>
                </div>
                <button onClick={handleAdd} disabled={!product.stock} style={{ width:"100%", padding:13, border:"none", borderRadius:10, cursor:"pointer", background:added?"linear-gradient(135deg,#16a34a,#15803d)":product.stock?`linear-gradient(135deg,${C.maroon},${C.maroonLt})`:"#e2e8f0", color:product.stock?"#fff":"#94a3b8", fontWeight:700, fontSize:15, marginBottom:12 }}>
                  {added?"✓ Added to Bag!":product.stock?`Add ${qty>1?qty+"x ":""}to Bag`:"Out of Stock"}
                </button>
                <div style={{ display:"flex", gap:18, background:C.ivory, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.border}` }}>
                  {[["🚚","Free Delivery"],["↩️","Easy Returns"],["🔒","Secure Pay"],["✓","Genuine Product"]].map(([ic,lb])=>(
                    <div key={lb} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}><span style={{fontSize:14}}>{ic}</span><span style={{ fontSize:10, color:C.textMid, fontWeight:600, textAlign:"center" }}>{lb}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:"0 28px 28px" }}>
              <div style={{ display:"flex", borderBottom:`2px solid ${C.ivoryDk}`, marginBottom:20 }}>
                {[["desc","Description"],["reviews",`Reviews (${product.reviews?.length||0})`]].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t)} style={{ padding:"10px 20px", border:"none", background:"none", cursor:"pointer", fontWeight:700, fontSize:13.5, color:tab===t?C.maroon:C.textLight, borderBottom:tab===t?`2px solid ${C.maroon}`:"2px solid transparent", marginBottom:-2 }}>{l}</button>
                ))}
              </div>
              {tab==="desc"?<p style={{ margin:0, fontSize:14, color:C.textMid, lineHeight:1.85 }}>{product.description}</p>:(
                <div>
                  <div style={{ background:C.ivory, borderRadius:10, padding:16, marginBottom:16, border:`1px solid ${C.border}` }}>
                    <p style={{ margin:"0 0 8px", fontWeight:700, fontSize:13, color:C.text }}>Write a Review</p>
                    <StarRating rating={rv.rating} interactive onRate={r=>setRv({...rv,rating:r})}/>
                    <textarea value={rv.comment} onChange={e=>setRv({...rv,comment:e.target.value})} placeholder="Share your experience with this saree…" rows={3}
                      style={{ width:"100%", marginTop:10, padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box", background:"#fff", fontFamily:"inherit", color:C.text }}/>
                    <button onClick={submitReview} disabled={sub||!rv.comment.trim()} style={{ marginTop:8, padding:"8px 20px", border:"none", borderRadius:8, background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", opacity:sub||!rv.comment.trim()?0.6:1, display:"flex", alignItems:"center", gap:6 }}>
                      {sub&&<Spinner size={14} color="#fff"/>}Submit Review
                    </button>
                  </div>
                  {(product.reviews||[]).length===0?<p style={{ color:C.textLight, fontSize:13 }}>No reviews yet. Be the first to review!</p>
                  :(product.reviews||[]).map((r,i)=>(
                    <div key={i} style={{ padding:14, background:C.ivory, borderRadius:10, marginBottom:10, border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ width:30, height:30, background:`linear-gradient(135deg,${C.maroon},${C.maroonLt})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:700, flexShrink:0 }}>{(r.name||"U")[0]}</span>
                        <div><p style={{ margin:0, fontSize:12, fontWeight:700, color:C.text }}>{r.name}</p><StarRating rating={r.rating}/></div>
                        <span style={{ marginLeft:"auto", fontSize:11, color:C.textLight }}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:C.textMid }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return(
    <footer style={{ background:`linear-gradient(135deg,${C.maroonDk},#1a0005)`, color:"#c8a8a8", marginTop:60 }}>
      {/* Gold border top */}
      <div style={{ height:3, background:`linear-gradient(to right,transparent,${C.gold},transparent)` }}/>
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"48px 20px 24px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:32, marginBottom:40 }}>
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{fontSize:20}}>🪷</span>
                <span style={{ fontWeight:800, fontSize:20, color:"#fff", fontFamily:"Georgia, serif" }}>Tanishka Saree</span>
              </div>
              <span style={{ fontSize:10, color:C.gold, letterSpacing:"3px", fontWeight:700, textTransform:"uppercase", marginLeft:28 }}>Pvt. Ltd.</span>
            </div>
            <p style={{ fontSize:13, lineHeight:1.8, margin:"0 0 6px", color:"#c8a8a8" }}>Your trusted destination for premium handwoven Indian sarees.</p>
            <p style={{ fontSize:12, color:`${C.gold}cc`, margin:"0 0 18px", fontStyle:"italic" }}>✦ Weaving traditions since generations ✦</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", background:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", borderRadius:10, textDecoration:"none", color:"#fff", fontWeight:700, fontSize:13, boxShadow:"0 4px 15px rgba(220,39,67,0.35)" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 25px rgba(220,39,67,0.5)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 15px rgba(220,39,67,0.35)";}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Follow Us
            </a>
          </div>
          {[{title:"Our Sarees",links:["Silk Sarees","Banarasi","Kanjivaram","Cotton Sarees","Designer"]},{title:"Support",links:["Help Center","Contact Us","Returns & Exchange","Track Order"]},{title:"Company",links:["About Us","Our Story","Careers","Blog"]}].map(col=>(
            <div key={col.title}>
              <h4 style={{ color:`${C.gold}cc`, fontWeight:700, marginBottom:14, fontSize:13, textTransform:"uppercase", letterSpacing:"1px" }}>{col.title}</h4>
              {col.links.map(l=><p key={l} style={{ margin:"0 0 9px", fontSize:13 }}><a href="#" style={{ color:"#c8a8a8", textDecoration:"none" }} onMouseEnter={e=>e.target.style.color=C.gold} onMouseLeave={e=>e.target.style.color="#c8a8a8"}>{l}</a></p>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop:`1px solid rgba(200,150,12,0.2)`, paddingTop:22, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <p style={{ margin:0, fontSize:12, color:"#9b7070" }}>© 2025 Tanishka Saree Pvt. Ltd. All rights reserved. Made with ❤️ in India</p>
          <div style={{ display:"flex", gap:10 }}>
            {["💳 Razorpay","💳 Visa","📱 UPI","🏦 Net Banking","💵 COD"].map(p=><span key={p} style={{ fontSize:11, background:"rgba(200,150,12,0.1)", border:`1px solid rgba(200,150,12,0.2)`, color:`${C.gold}aa`, padding:"4px 10px", borderRadius:4 }}>{p}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]             = useState(null);
  const [authChecked,setAC]        = useState(false);
  const [products,setProducts]     = useState([]);
  const [prodsLoading,setPL]       = useState(false);
  const [cart,setCart]             = useState([]);
  const [cartLoading,setCL]        = useState(false);
  const [cartOpen,setCartOpen]     = useState(false);
  const [searchQuery,setSearch]    = useState("");
  const [activeCat,setActiveCat]   = useState("all");
  const [selProduct,setSelProd]    = useState(null);
  const [toast,setToast]           = useState(null);
  const [checkoutOpen,setCheckout] = useState(false);
  const [ordersOpen,setOrdersOpen] = useState(false);
  const [adminOpen,setAdminOpen]   = useState(false);
  const [total,setTotal]           = useState(0);

  useEffect(()=>{ const tok=getToken(); if(tok){ Auth.me().then(d=>setUser(d.user)).catch(()=>localStorage.removeItem("curecart_token")).finally(()=>setAC(true)); }else setAC(true); },[]);

  useEffect(()=>{
    if(!user)return;
    const p={limit:50}; if(searchQuery)p.search=searchQuery; if(activeCat!=="all")p.category=activeCat;
    setPL(true); Products.list(p).then(d=>{setProducts(d.products);setTotal(d.total);}).catch(()=>showToast("❌ Failed to load products")).finally(()=>setPL(false));
  },[user,searchQuery,activeCat]);

  const fetchCart=useCallback(async()=>{ if(!user)return; setCL(true); try{const d=await CartAPI.get();setCart(d.items||[]);}catch{}finally{setCL(false);} },[user]);
  useEffect(()=>{fetchCart();},[fetchCart]);

  const showToast=msg=>{ setToast(msg); setTimeout(()=>setToast(null),3200); };

  const addToCart=async(product,qty=1)=>{
    const id=product._id||product.id;
    try{const d=await CartAPI.add(id,qty);setCart(d.items||[]);showToast(`✓ "${(product.title||"").slice(0,30)}…" added to bag`);}
    catch(err){showToast("❌ "+err.message);}
  };
  const removeFromCart=async pid=>{ try{const d=await CartAPI.remove(pid);setCart(d.items||[]);}catch(e){showToast("❌ "+e.message);} };
  const updateQty=async(pid,qty)=>{ if(qty<1){removeFromCart(pid);return;} try{const d=await CartAPI.update(pid,qty);setCart(d.items||[]);}catch(e){showToast("❌ "+e.message);} };
  const logout=()=>{ localStorage.removeItem("curecart_token"); setUser(null); setCart([]); setProducts([]); };
  const handlePlaced=async()=>{ setCheckout(false); setCartOpen(false); try{await CartAPI.clear();}catch{} setCart([]); setOrdersOpen(true); };
  const refreshProducts=()=>{ const p={limit:50}; if(searchQuery)p.search=searchQuery; if(activeCat!=="all")p.category=activeCat; Products.list(p).then(d=>setProducts(d.products)).catch(()=>{}); };

  const trending  = [...products].sort((a,b)=>(b.numReviews||0)-(a.numReviews||0)).slice(0,8);
  const bestDeals = [...products].sort((a,b)=>(b.discount||0)-(a.discount||0)).slice(0,8);
  const topRated  = [...products].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,8);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  if(!authChecked) return(
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg,${C.maroonDk},#1a0005,${C.maroonDk})`, flexDirection:"column", gap:18, fontFamily:"Georgia,serif" }}>
      <span style={{ fontSize:48 }}>🪷</span>
      <Spinner size={44}/>
      <p style={{ color:`${C.gold}cc`, fontSize:14, letterSpacing:"2px", textTransform:"uppercase" }}>Loading Tanishka Saree…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(!user) return <AuthPage onAuth={u=>setUser(u)}/>;

  return(
    <div style={{ fontFamily:"'Segoe UI',Georgia,system-ui,sans-serif", background:C.cream, minHeight:"100vh" }}>
      <Navbar user={user} cartCount={cartCount} onCartOpen={()=>setCartOpen(true)} onSearch={setSearch}
        onLogout={logout} onLogoClick={()=>{setSearch("");setActiveCat("all");}}
        onCategoryClick={setActiveCat} onOrdersOpen={()=>setOrdersOpen(true)} onAdminOpen={()=>setAdminOpen(true)}/>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"26px 20px" }}>
        <HeroBanner/>

        {/* Category pills */}
        <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:8, marginBottom:30, scrollbarWidth:"none" }}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{ padding:"8px 18px", border:"1.5px solid", borderRadius:50, cursor:"pointer", fontWeight:600, fontSize:13, whiteSpace:"nowrap", transition:"all 0.2s", borderColor:activeCat===c.id?C.maroon:C.border, background:activeCat===c.id?C.maroon:"#fff", color:activeCat===c.id?"#fff":C.textMid, boxShadow:activeCat===c.id?`0 4px 14px rgba(139,0,0,0.3)`:"none" }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {searchQuery&&<div style={{ marginBottom:24, padding:"14px 20px", background:`${C.gold}15`, borderRadius:10, border:`1px solid ${C.gold}40` }}><p style={{ margin:0, color:C.maroon, fontWeight:600, fontSize:14 }}>🔍 {total} results for "{searchQuery}"</p></div>}

        {prodsLoading?(
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"80px 20px", flexDirection:"column", gap:18 }}>
            <Spinner size={48}/><p style={{ color:C.textMid, fontSize:14, letterSpacing:"1px" }}>Loading our collection…</p>
          </div>
        ):products.length===0?(
          <div style={{ textAlign:"center", padding:"80px 20px", color:C.textLight }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🪷</div>
            <h3 style={{ color:C.textMid, fontFamily:"Georgia,serif" }}>{searchQuery?"No products found":"No products yet"}</h3>
            {user.role==="admin"&&!searchQuery&&<p style={{ fontSize:14 }}>Go to <strong>Admin Panel → Products → Add Saree</strong></p>}
            {user.role!=="admin"&&<p style={{ fontSize:14 }}>Our beautiful collection is coming soon!</p>}
          </div>
        ):(
          <>
            <ProductSection title="Trending Sarees" icon="🔥" products={trending} onAdd={addToCart} onView={setSelProd}/>
            <ProductSection title="Best Offers"     icon="💰" products={bestDeals} onAdd={addToCart} onView={setSelProd}/>
            <ProductSection title="Top Rated"       icon="⭐" products={topRated}  onAdd={addToCart} onView={setSelProd}/>
          </>
        )}
      </main>

      <Footer/>

      {cartOpen&&<CartSidebar cart={cart} onClose={()=>setCartOpen(false)} onRemove={removeFromCart} onUpdateQty={updateQty} loading={cartLoading} onCheckout={()=>{setCartOpen(false);setCheckout(true);}}/>}
      {checkoutOpen&&<CheckoutModal cart={cart} onClose={()=>setCheckout(false)} onPlaced={handlePlaced} showToast={showToast}/>}
      {ordersOpen&&<MyOrdersModal onClose={()=>setOrdersOpen(false)}/>}
      {selProduct&&<ProductDetail product={selProduct} onClose={()=>setSelProd(null)} onAdd={addToCart} showToast={showToast}/>}
      {adminOpen&&<AdminPanel onClose={()=>{setAdminOpen(false);refreshProducts();}} showToast={showToast}/>}

      {toast&&<div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:C.maroonDk, color:"#fff", padding:"12px 26px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:2000, maxWidth:"90vw", animation:"toastIn 0.3s ease", boxShadow:`0 8px 30px rgba(90,0,0,0.4)`, whiteSpace:"nowrap", border:`1px solid ${C.gold}40` }}>{toast}</div>}

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{from{opacity:0.5;transform:scale(1)}to{opacity:1;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        input:focus,textarea:focus,select:focus{border-color:${C.gold}!important;box-shadow:0 0 0 3px rgba(200,150,12,0.15)!important;outline:none!important;}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${C.ivory}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        button{font-family:inherit;}
      `}</style>
    </div>
  );
}
