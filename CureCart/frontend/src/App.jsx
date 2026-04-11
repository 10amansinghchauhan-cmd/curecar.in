import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
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
    ? JSON.stringify(options.body)
    : options.body;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers,
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
  createProduct: (fd)        => api("/admin/products", { method:"POST", body:fd }),   // FormData
  updateProduct: (id,fd)     => api(`/admin/products/${id}`, { method:"PUT", body:fd }),
  deleteProduct: (id)        => api(`/admin/products/${id}`, { method:"DELETE" }),
  orders:        (p={})      => api(`/admin/orders?${new URLSearchParams(p)}`),
  updateOrder:   (id,d)      => api(`/admin/orders/${id}/status`, { method:"PUT", body:d }),
};

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"all",         label:"All",           icon:"🛒" },
  { id:"electronics", label:"Electronics",   icon:"💻" },
  { id:"fashion",     label:"Fashion",       icon:"👗" },
  { id:"gaming",      label:"Gaming",        icon:"🎮" },
  { id:"home",        label:"Home & Kitchen",icon:"🏠" },
  { id:"books",       label:"Books",         icon:"📚" },
  { id:"sports",      label:"Sports",        icon:"⚽" },
  { id:"beauty",      label:"Beauty",        icon:"💄" },
];

const BANNERS = [
  { id:1, title:"Up to 70% Off",    subtitle:"Electronics Mega Sale",      bg:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)", accent:"#00d4ff", img:"💻" },
  { id:2, title:"Fashion Week",     subtitle:"New Collections Arrived",    bg:"linear-gradient(135deg,#1a0533,#3d0f6e,#6b21a8)", accent:"#e879f9", img:"👗" },
  { id:3, title:"Gaming Fest",      subtitle:"Consoles & Games On Sale",   bg:"linear-gradient(135deg,#0c1810,#1a3a1a,#15803d)", accent:"#4ade80", img:"🎮" },
];

const STATUS_COLORS = { placed:"#f59e0b", confirmed:"#3b82f6", shipped:"#8b5cf6", out_for_delivery:"#f97316", delivered:"#16a34a", cancelled:"#ef4444" };

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (p) => `₹${Number(p||0).toLocaleString("en-IN")}`;

const Spinner = ({ size=32, color="#0ea5e9" }) => (
  <div style={{ width:size, height:size, border:`3px solid #e2e8f0`, borderTop:`3px solid ${color}`, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
);

const StarRating = ({ rating, interactive=false, onRate }) => (
  <div style={{ display:"flex", alignItems:"center", gap:2 }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={() => interactive && onRate?.(s)}
        style={{ color: s<=Math.round(rating) ? "#f59e0b" : "#d1d5db", fontSize: interactive?22:13, cursor: interactive?"pointer":"default" }}>★</span>
    ))}
    {!interactive && <span style={{ fontSize:12, color:"#6b7280", marginLeft:4 }}>{rating}</span>}
  </div>
);



// ─── AUTH SHARED STYLES & COMPONENTS (outside AuthPage to prevent remount) ────
const authInputStyle = {
  width:"100%", padding:"12px 14px", border:"1.5px solid #e2e8f0",
  borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box",
};

const AuthBG = () => (
  <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none" }}>
    {[{top:"10%",left:"15%",s:300,c:"#3b82f620"},{top:"60%",right:"10%",s:250,c:"#8b5cf620"},{bottom:"5%",left:"40%",s:200,c:"#06b6d420"}].map((o,i)=>(
      <div key={i} style={{ position:"absolute", borderRadius:"50%", width:o.s, height:o.s, background:`radial-gradient(circle,${o.c},transparent)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, filter:"blur(40px)", animation:`pulse ${3+i}s ease-in-out infinite alternate` }}/>
    ))}
  </div>
);

const AuthCard = ({ children, title, subtitle, err }) => (
  <div style={{ background:"#fff", borderRadius:20, padding:"36px", width:"100%", maxWidth:420, boxShadow:"0 25px 60px rgba(0,0,0,0.4)", animation:"slideUp 0.4s ease", position:"relative" }}>
    <div style={{ textAlign:"center", marginBottom:24 }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", borderRadius:12, padding:"8px 16px", marginBottom:8 }}>
        <span style={{fontSize:20}}>🛒</span>
        <span style={{ fontWeight:800, fontSize:20, color:"#fff" }}>CureCart</span>
      </div>
      {title    && <h2 style={{ margin:"8px 0 4px", fontSize:18, fontWeight:800, color:"#0f172a" }}>{title}</h2>}
      {subtitle && <p  style={{ margin:0, fontSize:13, color:"#64748b" }}>{subtitle}</p>}
    </div>
    {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:14, color:"#ef4444", fontSize:13, fontWeight:600 }}>⚠️ {err}</div>}
    {children}
  </div>
);

const AuthBtn = ({ onClick, children, secondary=false, disabled=false, loading=false }) => (
  <button onClick={onClick} disabled={disabled||loading} style={{ width:"100%", padding:"13px", border: secondary?"1.5px solid #e2e8f0":"none", borderRadius:10, cursor:(disabled||loading)?"not-allowed":"pointer", background: secondary?"#fff":"linear-gradient(135deg,#0ea5e9,#6366f1)", color: secondary?"#475569":"#fff", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:(disabled||loading)?0.7:1, marginBottom:8 }}>
    {loading && !secondary && <Spinner size={16} color="#fff"/>} {children}
  </button>
);

const authWrap = {
  minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b,#0f172a)",
  display:"flex", alignItems:"center", justifyContent:"center", padding:20,
  fontFamily:"'Segoe UI',system-ui,sans-serif",
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
    if (!password)                        { setErr("Password required"); return; }
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

  if (mode === "login") return (
    <div style={authWrap}>
      <AuthBG/>
      <AuthCard title="Welcome Back!" subtitle="Sign in to your account" err={err}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            onKeyDown={e => e.key==="Enter" && loginEmail()}
            style={authInputStyle}
            onFocus={e => e.target.style.borderColor="#0ea5e9"}
            onBlur={e  => e.target.style.borderColor="#e2e8f0"}
          />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            onKeyDown={e => e.key==="Enter" && loginEmail()}
            style={authInputStyle}
            onFocus={e => e.target.style.borderColor="#0ea5e9"}
            onBlur={e  => e.target.style.borderColor="#e2e8f0"}
          />
        </div>
        <AuthBtn onClick={loginEmail} loading={loading}>Sign In →</AuthBtn>
        <div style={{ textAlign:"center", margin:"12px 0", color:"#94a3b8", fontSize:13 }}>— or —</div>
        <AuthBtn secondary onClick={() => { setErr(""); setMode("register"); }}>✨ Create New Account</AuthBtn>
      </AuthCard>
    </div>
  );

  return (
    <div style={authWrap}>
      <AuthBG/>
      <AuthCard title="Create Account" subtitle="Join CureCart today" err={err}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Doe"
            style={authInputStyle}
            onFocus={e => e.target.style.borderColor="#0ea5e9"}
            onBlur={e  => e.target.style.borderColor="#e2e8f0"}
          />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Email</label>
          <input
            type="email"
            value={regEmail}
            onChange={e => setRegEmail(e.target.value)}
            placeholder="you@example.com"
            style={authInputStyle}
            onFocus={e => e.target.style.borderColor="#0ea5e9"}
            onBlur={e  => e.target.style.borderColor="#e2e8f0"}
          />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Password</label>
          <input
            type="password"
            value={regPassword}
            onChange={e => setRegPassword(e.target.value)}
            placeholder="Min. 6 characters"
            onKeyDown={e => e.key==="Enter" && register()}
            style={authInputStyle}
            onFocus={e => e.target.style.borderColor="#0ea5e9"}
            onBlur={e  => e.target.style.borderColor="#e2e8f0"}
          />
        </div>
        <AuthBtn onClick={register} loading={loading}>Create Account 🎉</AuthBtn>
        <div style={{ textAlign:"center", margin:"12px 0", color:"#94a3b8", fontSize:13 }}>— or —</div>
        <AuthBtn secondary onClick={() => { setErr(""); setMode("login"); }}>← Back to Login</AuthBtn>
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
    <nav style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", padding:"0 20px", position:"sticky", top:0, zIndex:1000, boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
      <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", gap:16, height:64 }}>
        <button onClick={onLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:8, flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <span style={{fontSize:20}}>🛒</span>
          <span style={{fontWeight:800,fontSize:18,color:"#fff"}}>Cure<span style={{color:"#38bdf8"}}>Cart</span></span>
        </button>
        <div style={{flex:1,display:"flex",maxWidth:600}}>
          <input value={search} onChange={e=>handle(e.target.value)} placeholder="Search products, brands…"
            style={{flex:1,padding:"10px 16px",border:"none",borderRadius:"8px 0 0 8px",fontSize:14,outline:"none"}}/>
          <button style={{padding:"10px 18px",background:"#38bdf8",border:"none",borderRadius:"0 8px 8px 0",cursor:"pointer",fontSize:16}}>🔍</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",cursor:"pointer",color:"#e2e8f0",padding:"6px 10px",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{fontSize:18}}>👤</span>
              <span style={{fontSize:11,color:"#94a3b8"}}>Hi, {user.name.split(" ")[0]}</span>
            </button>
            {menuOpen&&(
              <div style={{position:"absolute",top:"100%",right:0,background:"#fff",borderRadius:10,boxShadow:"0 10px 40px rgba(0,0,0,0.2)",padding:8,minWidth:200,zIndex:100,animation:"slideDown 0.15s ease"}}>
                <div style={{padding:"8px 14px",borderBottom:"1px solid #f1f5f9",marginBottom:4}}>
                  <p style={{margin:0,fontWeight:700,fontSize:13,color:"#1e293b"}}>{user.name}</p>
                  <p style={{margin:0,fontSize:11,color:"#64748b"}}>{user.phone && `+91 ${user.phone}`}</p>
                  <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{user.email}</p>
                  {user.role==="admin"&&<span style={{fontSize:10,background:"#7c3aed",color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:700,display:"inline-block",marginTop:4}}>ADMIN</span>}
                </div>
                {user.role==="admin"&&(
                  <button onClick={()=>{setMenuOpen(false);onAdminOpen();}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",border:"none",background:"linear-gradient(135deg,#7c3aed,#6366f1)",cursor:"pointer",fontSize:13,color:"#fff",borderRadius:6,marginBottom:4,fontWeight:700}}>
                    ⚙️ Admin Panel
                  </button>
                )}
                <button onClick={()=>{setMenuOpen(false);onOrdersOpen();}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,color:"#374151",borderRadius:6}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="none"}>📦 My Orders</button>
                <button onClick={()=>{setMenuOpen(false);onLogout();}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,color:"#ef4444",borderRadius:6,marginTop:4,borderTop:"1px solid #f1f5f9"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#fef2f2"} onMouseLeave={e=>e.currentTarget.style.background="none"}>🚪 Sign Out</button>
              </div>
            )}
          </div>
          <button onClick={onCartOpen} style={{background:"none",border:"none",cursor:"pointer",color:"#e2e8f0",padding:"6px 10px",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontSize:20}}>🛒</span>
            {cartCount>0&&<span style={{position:"absolute",top:2,right:4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>}
            <span style={{fontSize:11,color:"#94a3b8"}}>Cart</span>
          </button>
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,0.05)",borderTop:"1px solid rgba(255,255,255,0.08)",overflowX:"auto",scrollbarWidth:"none"}}>
        <div style={{display:"flex",maxWidth:1280,margin:"0 auto"}}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>onCategoryClick(c.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"9px 16px",color:"#cbd5e1",fontSize:12.5,fontWeight:500,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#cbd5e1";}}>
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
  useEffect(()=>{ t.current=setInterval(()=>setActive(a=>(a+1)%BANNERS.length),4000); return()=>clearInterval(t.current); },[]);
  const b=BANNERS[active];
  return(
    <div style={{background:b.bg,borderRadius:16,padding:"40px 50px",marginBottom:32,position:"relative",overflow:"hidden",minHeight:200,display:"flex",alignItems:"center",boxShadow:"0 8px 30px rgba(0,0,0,0.15)"}}>
      <div style={{position:"relative",zIndex:1}}>
        <p style={{margin:"0 0 4px",fontSize:13,color:b.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Limited Time Offer</p>
        <h2 style={{margin:"0 0 8px",fontSize:40,fontWeight:900,color:"#fff",lineHeight:1.1}}>{b.title}</h2>
        <p style={{margin:"0 0 20px",fontSize:16,color:"rgba(255,255,255,0.7)"}}>{b.subtitle}</p>
        <button style={{padding:"10px 24px",background:b.accent,border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14,color:"#0f172a"}}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>Shop Now →</button>
      </div>
      <div style={{position:"absolute",right:60,fontSize:100,opacity:0.15}}>{b.img}</div>
      <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
        {BANNERS.map((_,i)=><button key={i} onClick={()=>setActive(i)} style={{width:active===i?24:8,height:8,borderRadius:4,border:"none",background:active===i?b.accent:"rgba(255,255,255,0.3)",cursor:"pointer",transition:"all 0.3s"}}/>)}
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
      style={{background:"#fff",borderRadius:14,overflow:"hidden",cursor:"pointer",border:"1px solid #f1f5f9",boxShadow:hov?"0 12px 40px rgba(0,0,0,0.15)":"0 2px 12px rgba(0,0,0,0.06)",transform:hov?"translateY(-4px)":"translateY(0)",transition:"all 0.25s"}}>
      <div style={{position:"relative",paddingTop:"70%",background:"#f8fafc"}}>
        {img?<img src={img} alt={product.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.3s",transform:hov?"scale(1.05)":"scale(1)"}}/>
            :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,color:"#cbd5e1"}}>📦</div>}
        {product.tag&&<span style={{position:"absolute",top:10,left:10,background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4}}>{product.tag}</span>}
        {disc>0&&<span style={{position:"absolute",top:10,right:10,background:"#16a34a",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 6px",borderRadius:4}}>{disc}% OFF</span>}
      </div>
      <div style={{padding:"12px 14px 14px"}}>
        <h3 style={{margin:"0 0 6px",fontSize:13,fontWeight:600,color:"#1e293b",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",lineHeight:1.4}}>{product.title}</h3>
        <StarRating rating={product.rating||0}/>
        <p style={{margin:"2px 0 8px",fontSize:11,color:"#94a3b8"}}>{(product.numReviews||0).toLocaleString()} reviews</p>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}>
          <span style={{fontSize:17,fontWeight:800,color:"#0f172a"}}>{fmt(product.price)}</span>
          {product.originalPrice>product.price&&<span style={{fontSize:12,color:"#94a3b8",textDecoration:"line-through"}}>{fmt(product.originalPrice)}</span>}
        </div>
        <button onClick={handleAdd} style={{width:"100%",padding:"9px 0",border:"none",borderRadius:8,cursor:"pointer",background:added?"#16a34a":"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",fontWeight:700,fontSize:12.5,transition:"all 0.2s"}}>
          {added?"✓ Added!":"+ Add to Cart"}
        </button>
      </div>
    </div>
  );
}

function ProductSection({ title, icon, products, onAdd, onView }) {
  if(!products.length) return null;
  return(
    <div style={{marginBottom:40}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <span style={{fontSize:22}}>{icon}</span>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#0f172a"}}>{title}</h2>
        <div style={{flex:1,height:2,background:"linear-gradient(to right,#e2e8f0,transparent)",marginLeft:8}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
        {products.map(p=><ProductCard key={p._id} product={p} onAdd={onAdd} onView={onView}/>)}
      </div>
    </div>
  );
}

// ─── CART SIDEBAR ─────────────────────────────────────────────────────────────
function CartSidebar({ cart, onClose, onRemove, onUpdateQty, loading, onCheckout }) {
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1100,animation:"fadeIn 0.2s"}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:"100%",maxWidth:420,background:"#fff",zIndex:1200,display:"flex",flexDirection:"column",boxShadow:"-10px 0 40px rgba(0,0,0,0.2)",animation:"slideInRight 0.3s"}}>
        <div style={{padding:"20px 24px",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h2 style={{margin:0,color:"#fff",fontSize:18,fontWeight:700}}>🛒 Cart ({cart.length})</h2>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {loading?<div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>
          :cart.length===0?<div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}><div style={{fontSize:60,marginBottom:16}}>🛒</div><p style={{fontWeight:600,color:"#475569"}}>Cart is empty</p></div>
          :cart.map(item=>{
            const pid=item.product?._id||item.product;
            const img=item.product?.images?.[0]?.url||item.image||"";
            const title=item.product?.title||item.title||"";
            return(
              <div key={pid} style={{display:"flex",gap:12,padding:"14px 0",borderBottom:"1px solid #f1f5f9"}}>
                <div style={{width:72,height:72,background:"#f8fafc",borderRadius:8,overflow:"hidden",flexShrink:0}}>
                  {img?<img src={img} alt={title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>📦</div>}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:"0 0 4px",fontSize:13,fontWeight:600,color:"#1e293b",lineHeight:1.3}}>{title.slice(0,45)}{title.length>45?"…":""}</p>
                  <p style={{margin:"0 0 8px",fontSize:15,fontWeight:700,color:"#0f172a"}}>{fmt(item.price)}</p>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden"}}>
                      <button onClick={()=>onUpdateQty(pid,item.qty-1)} style={{width:28,height:28,border:"none",background:"#f8fafc",cursor:"pointer",fontSize:14,fontWeight:700}}>−</button>
                      <span style={{width:28,textAlign:"center",fontSize:13,fontWeight:600}}>{item.qty}</span>
                      <button onClick={()=>onUpdateQty(pid,item.qty+1)} style={{width:28,height:28,border:"none",background:"#f8fafc",cursor:"pointer",fontSize:14,fontWeight:700}}>+</button>
                    </div>
                    <button onClick={()=>onRemove(pid)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12,fontWeight:600}}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {cart.length>0&&(
          <div style={{padding:"16px 20px",borderTop:"1px solid #f1f5f9",background:"#f8fafc"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:16,fontWeight:700}}>Total:</span>
              <span style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{fmt(total)}</span>
            </div>
            <button onClick={onCheckout} style={{width:"100%",padding:13,border:"none",borderRadius:10,cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"#fff",fontWeight:700,fontSize:15,boxShadow:"0 4px 15px rgba(245,158,11,0.4)"}}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── RAZORPAY CHECKOUT ────────────────────────────────────────────────────────
function CheckoutModal({ cart, onClose, onPlaced, showToast }) {
  const [form,setForm]=useState({name:"",street:"",city:"",state:"",pincode:"",phone:""});
  const [payMethod,setPay]=useState("RAZORPAY");
  const [loading,setLoading]=useState(false);
  const [errors,setErrors]=useState({});

  const validate=()=>{ const e={}; if(!form.name)e.name="Required"; if(!form.street)e.street="Required"; if(!form.city)e.city="Required"; if(!form.state)e.state="Required"; if(!/^\d{6}$/.test(form.pincode))e.pincode="6-digit required"; if(!/^\d{10}$/.test(form.phone))e.phone="10-digit required"; return e; };

  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=total>=499?0:49;
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
          key:rzp.keyId, amount:rzp.amount, currency:rzp.currency, name:"CureCart",
          description:"Purchase Payment", order_id:rzp.razorpayOrderId,
          handler:async r=>{ try{ await Payment.verify({razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature,orderId:createdOrder._id}); showToast("🎉 Payment successful!"); onPlaced(); }catch{ showToast("❌ Payment verification failed"); }},
          prefill:{name:form.name,contact:form.phone}, theme:{color:"#0ea5e9"},
          modal:{ondismiss:()=>{setLoading(false);showToast("Payment cancelled");}},
        }).open(); setLoading(false);
      }else{ showToast("🎉 Order placed! Pay on delivery."); onPlaced(); }
    }catch(err){showToast("❌ "+err.message);setLoading(false);}
  };

  const I=(field,ph,type="text")=>({ value:form[field], type, placeholder:ph, onChange:e=>{ setForm({...form,[field]:e.target.value}); setErrors({...errors,[field]:""}); }, style:{width:"100%",padding:"10px 14px",border:`1.5px solid ${errors[field]?"#ef4444":"#e2e8f0"}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"} });

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1300}}/>
      <div style={{position:"fixed",inset:0,zIndex:1400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"scaleIn 0.25s"}}>
          <div style={{padding:"18px 24px",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0,color:"#fff",fontSize:17}}>📦 Checkout</h3>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:30,height:30,borderRadius:"50%",cursor:"pointer"}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"20px 24px"}}>
            <h4 style={{margin:"0 0 12px",fontSize:14,color:"#374151"}}>Shipping Address</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div style={{gridColumn:"1/-1"}}><input {...I("name","Full Name")}/>{errors.name&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.name}</p>}</div>
              <div style={{gridColumn:"1/-1"}}><input {...I("street","Street Address")}/>{errors.street&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.street}</p>}</div>
              <div><input {...I("city","City")}/>{errors.city&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.city}</p>}</div>
              <div><input {...I("state","State")}/>{errors.state&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.state}</p>}</div>
              <div><input {...I("pincode","Pincode","tel")} maxLength={6}/>{errors.pincode&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.pincode}</p>}</div>
              <div><input {...I("phone","Phone","tel")} maxLength={10}/>{errors.phone&&<p style={{color:"#ef4444",fontSize:11,margin:"2px 0 0"}}>{errors.phone}</p>}</div>
            </div>
            <h4 style={{margin:"0 0 10px",fontSize:14,color:"#374151"}}>Payment</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["RAZORPAY","💳 Pay Online"],["COD","💵 Cash on Delivery"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPay(v)} style={{padding:12,border:`2px solid ${payMethod===v?"#0ea5e9":"#e2e8f0"}`,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,background:payMethod===v?"#eff6ff":"#fff",color:payMethod===v?"#0ea5e9":"#475569"}}>{l}</button>
              ))}
            </div>
            {payMethod==="RAZORPAY"&&<div style={{background:"#eff6ff",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#1d4ed8"}}>💡 Test: Card <strong>4111 1111 1111 1111</strong>, CVV 123, any future date</div>}
            <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Items</span><span>{fmt(total)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Shipping</span><span style={{color:ship===0?"#16a34a":"#1e293b"}}>{ship===0?"FREE":fmt(ship)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #e2e8f0",marginTop:8}}><span style={{fontWeight:700}}>Total</span><span style={{fontSize:17,fontWeight:800}}>{fmt(grand)}</span></div>
            </div>
          </div>
          <div style={{padding:"16px 24px",borderTop:"1px solid #f1f5f9"}}>
            <button onClick={submit} disabled={loading} style={{width:"100%",padding:13,border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",background:payMethod==="RAZORPAY"?"linear-gradient(135deg,#0ea5e9,#6366f1)":"linear-gradient(135deg,#f59e0b,#f97316)",color:"#fff",fontWeight:700,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?0.8:1}}>
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

  const TABS=[["dashboard","📊 Dashboard"],["products","📦 Products"],["orders","📋 Orders"],["users","👥 Users"]];

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1500}}/>
      <div style={{position:"fixed",inset:0,zIndex:1600,display:"flex",flexDirection:"column",background:"#f8fafc",animation:"scaleIn 0.2s"}}>
        <div style={{background:"linear-gradient(135deg,#7c3aed,#6366f1)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,flexShrink:0}}>
          <span style={{fontWeight:800,fontSize:18,color:"#fff"}}>⚙️ CureCart Admin Panel</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>← Back to Store</button>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{width:220,background:"#1e293b",display:"flex",flexDirection:"column",flexShrink:0,padding:"16px 0"}}>
            {TABS.map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{padding:"12px 20px",border:"none",background:tab===key?"rgba(99,102,241,0.3)":"none",color:tab===key?"#a5b4fc":"#94a3b8",cursor:"pointer",fontSize:14,fontWeight:tab===key?700:500,textAlign:"left",borderLeft:tab===key?"3px solid #6366f1":"3px solid transparent"}}>
                {label}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:24}}>
            {loading?<div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size={48}/></div>:(

            tab==="dashboard"&&stats&&(
              <div>
                <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:800,color:"#0f172a"}}>Dashboard</h2>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:28}}>
                  {[{l:"Total Revenue",v:fmt(stats.stats.revenue),i:"💰",c:"#16a34a"},{l:"Total Orders",v:stats.stats.totalOrders,i:"📦",c:"#0ea5e9"},{l:"Products",v:stats.stats.totalProducts,i:"🛍️",c:"#8b5cf6"},{l:"Users",v:stats.stats.totalUsers,i:"👥",c:"#f59e0b"}].map(c=>(
                    <div key={c.l} style={{background:"#fff",borderRadius:14,padding:"20px 22px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:28}}>{c.i}</span><span style={{fontSize:22,fontWeight:900,color:c.c}}>{c.v}</span>
                      </div>
                      <p style={{margin:0,fontSize:13,color:"#64748b",fontWeight:600}}>{c.l}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                  <div style={{background:"#fff",borderRadius:14,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>Recent Orders</h3>
                    {(stats.recentOrders||[]).map(o=>(
                      <div key={o._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                        <div><p style={{margin:0,fontSize:12,fontWeight:600}}>#{o._id.slice(-6).toUpperCase()}</p><p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{o.user?.name}</p></div>
                        <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:13,fontWeight:700}}>{fmt(o.totalAmount)}</p><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(STATUS_COLORS[o.orderStatus]||"#gray")+"20",color:STATUS_COLORS[o.orderStatus]}}>{o.orderStatus}</span></div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#fff",borderRadius:14,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                    <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>⚠️ Low Stock</h3>
                    {(stats.lowStockProducts||[]).length===0?<p style={{color:"#94a3b8",fontSize:13}}>All products well stocked!</p>
                    :(stats.lowStockProducts||[]).map(p=>(
                      <div key={p._id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                        <p style={{margin:0,fontSize:12,fontWeight:600}}>{p.title.slice(0,30)}…</p>
                        <span style={{fontSize:12,fontWeight:800,color:p.stock<5?"#ef4444":"#f59e0b"}}>{p.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {!loading&&tab==="products"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h2 style={{margin:0,fontSize:22,fontWeight:800}}>Products ({products.length})</h2>
                  <button onClick={()=>setProductModal("new")} style={{padding:"10px 20px",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>+ Add Product</button>
                </div>
                <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#f8fafc"}}>{["Image","Title","Category","Price","Stock","Rating","Actions"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:12,fontWeight:700,color:"#64748b",borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {products.map(p=>(
                        <tr key={p._id} style={{borderBottom:"1px solid #f1f5f9"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <td style={{padding:"10px 16px"}}><div style={{width:48,height:48,background:"#f1f5f9",borderRadius:8,overflow:"hidden"}}>{p.images?.[0]?.url?<img src={p.images[0].url} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📦</div>}</div></td>
                          <td style={{padding:"10px 16px",fontSize:13,fontWeight:600,color:"#1e293b",maxWidth:180}}>{p.title.slice(0,35)}{p.title.length>35?"…":""}</td>
                          <td style={{padding:"10px 16px"}}><span style={{fontSize:11,background:"#eff6ff",color:"#1d4ed8",padding:"2px 8px",borderRadius:20,fontWeight:600,textTransform:"capitalize"}}>{p.category}</span></td>
                          <td style={{padding:"10px 16px",fontSize:13,fontWeight:700}}>{fmt(p.price)}</td>
                          <td style={{padding:"10px 16px"}}><span style={{fontSize:12,fontWeight:700,color:p.stock<10?"#ef4444":p.stock<20?"#f59e0b":"#16a34a"}}>{p.stock}</span></td>
                          <td style={{padding:"10px 16px",fontSize:12,color:"#f59e0b",fontWeight:700}}>★ {p.rating}</td>
                          <td style={{padding:"10px 16px"}}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>setProductModal(p)} style={{padding:"5px 12px",background:"#eff6ff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,color:"#1d4ed8",fontWeight:600}}>Edit</button>
                              <button onClick={()=>delProduct(p._id)} style={{padding:"5px 12px",background:"#fef2f2",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,color:"#ef4444",fontWeight:600}}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length===0&&<div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>No products yet. Click "Add Product" to get started!</div>}
                </div>
              </div>
            )}

            {!loading&&tab==="orders"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
                  <h2 style={{margin:0,fontSize:22,fontWeight:800}}>Orders ({orders.length})</h2>
                  <select value={orderFilter} onChange={e=>setOrderFilter(e.target.value)} style={{padding:"8px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",cursor:"pointer"}}>
                    <option value="">All Status</option>
                    {["placed","confirmed","shipped","out_for_delivery","delivered","cancelled"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {orders.map(o=>(
                    <div key={o._id} style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                        <div>
                          <p style={{margin:0,fontWeight:700,fontSize:14}}>#{o._id.slice(-8).toUpperCase()}</p>
                          <p style={{margin:"2px 0 0",fontSize:12,color:"#94a3b8"}}>{o.user?.name} · {o.user?.phone&&`+91 ${o.user.phone}`} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:14,fontWeight:800}}>{fmt(o.totalAmount)}</span>
                          <select value={o.orderStatus} onChange={e=>orderStatus(o._id,e.target.value)}
                            style={{padding:"5px 10px",border:`1.5px solid ${STATUS_COLORS[o.orderStatus]||"#e2e8f0"}`,borderRadius:8,fontSize:12,fontWeight:700,color:STATUS_COLORS[o.orderStatus],outline:"none",cursor:"pointer",background:(STATUS_COLORS[o.orderStatus]||"#e2e8f0")+"15"}}>
                            {["placed","confirmed","shipped","out_for_delivery","delivered","cancelled"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {o.items.map((item,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"#f8fafc",borderRadius:8,padding:"6px 10px"}}>
                            {item.image&&<img src={item.image} alt={item.title} style={{width:32,height:32,objectFit:"cover",borderRadius:4}}/>}
                            <div><p style={{margin:0,fontSize:11,fontWeight:600}}>{item.title?.slice(0,25)}</p><p style={{margin:0,fontSize:10,color:"#94a3b8"}}>x{item.qty} · {fmt(item.price)}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {orders.length===0&&<div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>No orders found.</div>}
                </div>
              </div>
            )}

            {!loading&&tab==="users"&&(
              <div>
                <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:800}}>Users ({users.length})</h2>
                <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#f8fafc"}}>{["Name","Email","Phone","Role","Status","Joined","Action"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:12,fontWeight:700,color:"#64748b",borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {users.map(u=>(
                        <tr key={u._id} style={{borderBottom:"1px solid #f1f5f9"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <td style={{padding:"12px 16px",fontSize:13,fontWeight:600}}>{u.name}</td>
                          <td style={{padding:"12px 16px",fontSize:12,color:"#475569"}}>{u.email}</td>
                          <td style={{padding:"12px 16px",fontSize:12,color:"#475569"}}>{u.phone&&`+91 ${u.phone}`}</td>
                          <td style={{padding:"12px 16px"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:u.role==="admin"?"#7c3aed20":"#e0f2fe",color:u.role==="admin"?"#7c3aed":"#0ea5e9"}}>{u.role}</span></td>
                          <td style={{padding:"12px 16px"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:u.isActive?"#dcfce7":"#fef2f2",color:u.isActive?"#16a34a":"#ef4444"}}>{u.isActive?"Active":"Inactive"}</span></td>
                          <td style={{padding:"12px 16px",fontSize:12,color:"#94a3b8"}}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                          <td style={{padding:"12px 16px"}}>
                            <button onClick={()=>toggleUser(u)} style={{padding:"5px 12px",background:u.isActive?"#fef2f2":"#f0fdf4",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,color:u.isActive?"#ef4444":"#16a34a",fontWeight:600}}>
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

// ─── PRODUCT FORM (Admin) - with Cloudinary image upload ────────────────────
function ProductFormModal({ product, onClose, onSaved, showToast }) {
  const isEdit=!!product;
  const [form,setForm]=useState({
    title:product?.title||"", description:product?.description||"",
    price:product?.price||"", originalPrice:product?.originalPrice||"",
    category:product?.category||"electronics", tag:product?.tag||"",
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

  const F=(key,label,type="text",opts=null)=>(
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>{label}</label>
      {opts?
        <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>:
        <input value={form[key]} type={type} onChange={e=>setForm({...form,[key]:e.target.value})}
          style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor="#0ea5e9"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
      }
    </div>
  );

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1700}}/>
      <div style={{position:"fixed",inset:0,zIndex:1800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:580,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,0.4)",animation:"scaleIn 0.2s"}}>
          <div style={{padding:"16px 24px",background:"linear-gradient(135deg,#7c3aed,#6366f1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0,color:"#fff",fontSize:16}}>{isEdit?"✏️ Edit Product":"➕ Add New Product"}</h3>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",cursor:"pointer"}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"20px 24px"}}>
            {F("title","Product Title *")}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Description *</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3}
                style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {F("price","Selling Price (₹) *","number")}
              {F("originalPrice","Original Price (₹) *","number")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {F("category","Category *","text",["electronics","fashion","gaming","home","books","sports","beauty"])}
              {F("stock","Stock Qty","number")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {F("brand","Brand")}
              {F("tag","Tag (e.g. Best Seller)")}
            </div>

            {/* Image Upload Section */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8}}>Product Image *</label>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                {/* Upload button */}
                <div onClick={()=>fileRef.current.click()}
                  style={{width:100,height:100,border:"2px dashed #e2e8f0",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,background:"#f8fafc",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#0ea5e9";e.currentTarget.style.background="#eff6ff";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#f8fafc";}}>
                  <span style={{fontSize:24}}>📁</span>
                  <span style={{fontSize:11,color:"#64748b",marginTop:4,textAlign:"center"}}>Upload<br/>Image</span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
                </div>
                {/* Preview */}
                {imgPreview&&(
                  <div style={{flex:1,position:"relative"}}>
                    <img src={imgPreview} alt="preview" style={{width:"100%",height:100,objectFit:"cover",borderRadius:10}}/>
                    <button onClick={()=>{setImgFile(null);setImgPreview("");setForm({...form,imageUrl:""});}}
                      style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",width:22,height:22,borderRadius:"50%",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                )}
              </div>
              {!imgPreview&&(
                <div style={{marginTop:10}}>
                  <p style={{fontSize:11,color:"#94a3b8",margin:"0 0 6px"}}>— or paste image URL —</p>
                  <input value={form.imageUrl} onChange={e=>{setForm({...form,imageUrl:e.target.value});if(e.target.value)setImgPreview(e.target.value);}} placeholder="https://example.com/image.jpg"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              )}
              {imgFile&&<p style={{fontSize:11,color:"#16a34a",margin:"6px 0 0"}}>✓ {imgFile.name} selected — will upload to Cloudinary</p>}
            </div>

            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
              <input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/>
              Mark as Featured Product
            </label>
          </div>
          <div style={{padding:"14px 24px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:12,border:"1.5px solid #e2e8f0",borderRadius:10,cursor:"pointer",background:"#fff",color:"#475569",fontWeight:600,fontSize:14}}>Cancel</button>
            <button onClick={save} disabled={loading} style={{flex:2,padding:12,border:"none",borderRadius:10,cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#6366f1)",color:"#fff",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.8:1}}>
              {loading&&<Spinner size={16} color="#fff"/>}
              {loading?"Saving…":isEdit?"Update Product":"Add Product"}
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
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1300}}/>
      <div style={{position:"fixed",inset:0,zIndex:1400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:620,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"scaleIn 0.25s"}}>
          <div style={{padding:"18px 24px",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0,color:"#fff",fontSize:17}}>📦 My Orders</h3>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:30,height:30,borderRadius:"50%",cursor:"pointer"}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
            {loading?<div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>
            :orders.length===0?<div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}><div style={{fontSize:50,marginBottom:12}}>📦</div><p style={{fontWeight:600,color:"#475569"}}>No orders yet</p></div>
            :orders.map(o=>(
              <div key={o._id} style={{border:"1px solid #f1f5f9",borderRadius:12,padding:16,marginBottom:14,background:"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div><p style={{margin:0,fontWeight:700,fontSize:13}}>#{o._id.slice(-8).toUpperCase()}</p><p style={{margin:"2px 0 0",fontSize:11,color:"#94a3b8"}}>{new Date(o.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p></div>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:(STATUS_COLORS[o.orderStatus]||"#gray")+"20",color:STATUS_COLORS[o.orderStatus],textTransform:"capitalize",alignSelf:"flex-start"}}>{o.orderStatus.replace("_"," ")}</span>
                </div>
                {o.items.map((item,i)=>(
                  <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
                    {item.image&&<img src={item.image} alt={item.title} style={{width:48,height:48,objectFit:"cover",borderRadius:6}}/>}
                    <div><p style={{margin:0,fontSize:12,fontWeight:600}}>{item.title?.slice(0,40)}{item.title?.length>40?"…":""}</p><p style={{margin:0,fontSize:11,color:"#64748b"}}>Qty: {item.qty} × {fmt(item.price)}</p></div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #f1f5f9",marginTop:4}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{o.paymentMethod} · <span style={{color:o.paymentStatus==="paid"?"#16a34a":"#f59e0b"}}>{o.paymentStatus}</span></span>
                  <span style={{fontSize:14,fontWeight:800}}>{fmt(o.totalAmount)}</span>
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
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1100}}/>
      <div style={{position:"fixed",inset:0,zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:900,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"scaleIn 0.25s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 24px",borderBottom:"1px solid #f1f5f9"}}>
            <h3 style={{margin:0,fontSize:16}}>Product Details</h3>
            <button onClick={onClose} style={{background:"#f1f5f9",border:"none",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",minHeight:340}}>
                {img?<img src={img} alt={product.title} style={{width:"100%",height:340,objectFit:"cover"}}/>:<div style={{fontSize:60,color:"#cbd5e1"}}>📦</div>}
              </div>
              <div style={{padding:28}}>
                {product.tag&&<span style={{background:"#fef3c7",color:"#b45309",fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4}}>{product.tag}</span>}
                <h2 style={{margin:"10px 0",fontSize:18,fontWeight:700,lineHeight:1.4}}>{product.title}</h2>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <StarRating rating={product.rating||0}/><span style={{fontSize:12,color:"#64748b"}}>({(product.numReviews||0).toLocaleString()})</span>
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:4}}>
                  <span style={{fontSize:28,fontWeight:900}}>{fmt(product.price)}</span>
                  {product.originalPrice>product.price&&<span style={{fontSize:16,color:"#94a3b8",textDecoration:"line-through"}}>{fmt(product.originalPrice)}</span>}
                  {disc>0&&<span style={{background:"#dcfce7",color:"#16a34a",fontSize:13,fontWeight:700,padding:"2px 8px",borderRadius:4}}>{disc}% OFF</span>}
                </div>
                {product.originalPrice>product.price&&<p style={{margin:"0 0 12px",fontSize:12,color:"#16a34a",fontWeight:600}}>You save {fmt(product.originalPrice-product.price)}</p>}
                {product.brand&&<p style={{margin:"0 0 8px",fontSize:12,color:"#64748b"}}><strong>Brand:</strong> {product.brand}</p>}
                <p style={{fontSize:12,color:product.stock>0?"#16a34a":"#ef4444",fontWeight:600,margin:"0 0 14px"}}>{product.stock>0?`✓ In Stock (${product.stock})`:"✗ Out of Stock"}</p>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
                    <button onClick={()=>setQty(Math.max(1,qty-1))} style={{width:36,height:36,border:"none",background:"#f8fafc",cursor:"pointer",fontSize:18,fontWeight:700}}>−</button>
                    <span style={{width:36,textAlign:"center",fontWeight:700}}>{qty}</span>
                    <button onClick={()=>setQty(Math.min(product.stock||99,qty+1))} style={{width:36,height:36,border:"none",background:"#f8fafc",cursor:"pointer",fontSize:18,fontWeight:700}}>+</button>
                  </div>
                </div>
                <button onClick={handleAdd} disabled={!product.stock} style={{width:"100%",padding:12,border:"none",borderRadius:10,cursor:"pointer",background:added?"#16a34a":product.stock?"linear-gradient(135deg,#0ea5e9,#6366f1)":"#e2e8f0",color:product.stock?"#fff":"#94a3b8",fontWeight:700,fontSize:14,marginBottom:10}}>
                  {added?"✓ Added!":product.stock?`Add ${qty>1?qty+"x ":""}to Cart`:"Out of Stock"}
                </button>
                <div style={{display:"flex",gap:16}}>
                  {[["🚚","Free Delivery"],["↩️","Easy Returns"],["🔒","Secure Pay"]].map(([ic,lb])=>(
                    <div key={lb} style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:14}}>{ic}</span><span style={{fontSize:11,color:"#64748b"}}>{lb}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:"0 28px 28px"}}>
              <div style={{display:"flex",borderBottom:"2px solid #f1f5f9",marginBottom:20}}>
                {[["desc","Description"],["reviews",`Reviews (${product.reviews?.length||0})`]].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontWeight:700,fontSize:13.5,color:tab===t?"#0ea5e9":"#94a3b8",borderBottom:tab===t?"2px solid #0ea5e9":"2px solid transparent",marginBottom:-2}}>{l}</button>
                ))}
              </div>
              {tab==="desc"?<p style={{margin:0,fontSize:14,color:"#475569",lineHeight:1.8}}>{product.description}</p>:(
                <div>
                  <div style={{background:"#f8fafc",borderRadius:10,padding:16,marginBottom:16}}>
                    <p style={{margin:"0 0 8px",fontWeight:700,fontSize:13}}>Write a Review</p>
                    <StarRating rating={rv.rating} interactive onRate={r=>setRv({...rv,rating:r})}/>
                    <textarea value={rv.comment} onChange={e=>setRv({...rv,comment:e.target.value})} placeholder="Share your experience…" rows={3}
                      style={{width:"100%",marginTop:10,padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                    <button onClick={submitReview} disabled={sub||!rv.comment.trim()} style={{marginTop:8,padding:"8px 20px",border:"none",borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:sub||!rv.comment.trim()?0.6:1,display:"flex",alignItems:"center",gap:6}}>
                      {sub&&<Spinner size={14} color="#fff"/>}Submit Review
                    </button>
                  </div>
                  {(product.reviews||[]).length===0?<p style={{color:"#94a3b8",fontSize:13}}>No reviews yet. Be the first!</p>
                  :(product.reviews||[]).map((r,i)=>(
                    <div key={i} style={{padding:14,background:"#f8fafc",borderRadius:10,marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{width:30,height:30,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{(r.name||"U")[0]}</span>
                        <div><p style={{margin:0,fontSize:12,fontWeight:700}}>{r.name}</p><StarRating rating={r.rating}/></div>
                        <span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8"}}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p style={{margin:0,fontSize:13,color:"#475569"}}>{r.comment}</p>
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
    <footer style={{background:"#0f172a",color:"#94a3b8",marginTop:60}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"48px 20px 24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:32,marginBottom:40}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:18}}>🛒</span><span style={{fontWeight:800,fontSize:18,color:"#fff"}}>Cure<span style={{color:"#38bdf8"}}>Cart</span></span></div>
            <p style={{fontSize:13,lineHeight:1.7,margin:"0 0 16px"}}>Your trusted one-stop shopping destination.</p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",background:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",borderRadius:10,textDecoration:"none",color:"#fff",fontWeight:700,fontSize:13,boxShadow:"0 4px 15px rgba(220,39,67,0.4)"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 25px rgba(220,39,67,0.5)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 15px rgba(220,39,67,0.4)";}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @amansingh84538
            </a>
          </div>
          {[{title:"Company",links:["About Us","Careers","Press","Blog"]},{title:"Support",links:["Help Center","Contact Us","Returns","Track Order"]},{title:"Legal",links:["Privacy Policy","Terms of Service","Cookie Policy"]}].map(col=>(
            <div key={col.title}>
              <h4 style={{color:"#e2e8f0",fontWeight:700,marginBottom:14,fontSize:14}}>{col.title}</h4>
              {col.links.map(l=><p key={l} style={{margin:"0 0 8px",fontSize:13}}><a href="#" style={{color:"#94a3b8",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="#38bdf8"} onMouseLeave={e=>e.target.style.color="#94a3b8"}>{l}</a></p>)}
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <p style={{margin:0,fontSize:12}}>© 2025 CureCart. All rights reserved.</p>
          <div style={{display:"flex",gap:10}}>
            {["💳 Razorpay","💳 Visa","📱 UPI","🏦 Net Banking"].map(p=><span key={p} style={{fontSize:11,background:"rgba(255,255,255,0.05)",padding:"4px 10px",borderRadius:4}}>{p}</span>)}
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

  const showToast=msg=>{ setToast(msg); setTimeout(()=>setToast(null),3000); };

  const addToCart=async(product,qty=1)=>{
    const id=product._id||product.id;
    try{const d=await CartAPI.add(id,qty);setCart(d.items||[]);showToast(`✓ "${(product.title||"").slice(0,28)}…" added`);}
    catch(err){showToast("❌ "+err.message);}
  };
  const removeFromCart=async pid=>{ try{const d=await CartAPI.remove(pid);setCart(d.items||[]);}catch(e){showToast("❌ "+e.message);} };
  const updateQty=async(pid,qty)=>{ if(qty<1){removeFromCart(pid);return;} try{const d=await CartAPI.update(pid,qty);setCart(d.items||[]);}catch(e){showToast("❌ "+e.message);} };
  const logout=()=>{ localStorage.removeItem("curecart_token"); setUser(null); setCart([]); setProducts([]); };
  const handlePlaced=async()=>{ setCheckout(false); setCartOpen(false); try{await CartAPI.clear();}catch{} setCart([]); setOrdersOpen(true); };
  const refreshProducts=()=>{ const p={limit:50}; if(searchQuery)p.search=searchQuery; if(activeCat!=="all")p.category=activeCat; Products.list(p).then(d=>setProducts(d.products)).catch(()=>{}); };

  const trending   = [...products].sort((a,b)=>(b.numReviews||0)-(a.numReviews||0)).slice(0,8);
  const bestDeals  = [...products].sort((a,b)=>(b.discount||0)-(a.discount||0)).slice(0,8);
  const topRated   = [...products].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,8);
  const cartCount  = cart.reduce((s,i)=>s+i.qty,0);

  if(!authChecked) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a,#1e293b)",flexDirection:"column",gap:16,fontFamily:"system-ui"}}>
      <Spinner size={48} color="#38bdf8"/><p style={{color:"#94a3b8",fontSize:14}}>Loading CureCart…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(!user) return <AuthPage onAuth={u=>setUser(u)}/>;

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f8fafc",minHeight:"100vh"}}>
      <Navbar user={user} cartCount={cartCount} onCartOpen={()=>setCartOpen(true)} onSearch={setSearch}
        onLogout={logout} onLogoClick={()=>{setSearch("");setActiveCat("all");}}
        onCategoryClick={setActiveCat} onOrdersOpen={()=>setOrdersOpen(true)} onAdminOpen={()=>setAdminOpen(true)}/>

      <main style={{maxWidth:1280,margin:"0 auto",padding:"24px 20px"}}>
        <HeroBanner/>
        <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,marginBottom:28,scrollbarWidth:"none"}}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{padding:"8px 18px",border:"1.5px solid",borderRadius:50,cursor:"pointer",fontWeight:600,fontSize:13,whiteSpace:"nowrap",transition:"all 0.2s",borderColor:activeCat===c.id?"#0ea5e9":"#e2e8f0",background:activeCat===c.id?"#0ea5e9":"#fff",color:activeCat===c.id?"#fff":"#475569",boxShadow:activeCat===c.id?"0 4px 12px rgba(14,165,233,0.3)":"none"}}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {searchQuery&&<div style={{marginBottom:24,padding:"14px 20px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe"}}><p style={{margin:0,color:"#1d4ed8",fontWeight:600,fontSize:14}}>🔍 {total} results for "{searchQuery}"</p></div>}

        {prodsLoading?(
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"80px 20px",flexDirection:"column",gap:16}}>
            <Spinner size={48}/><p style={{color:"#64748b",fontSize:14}}>Loading products…</p>
          </div>
        ):products.length===0?(
          <div style={{textAlign:"center",padding:"80px 20px",color:"#94a3b8"}}>
            <div style={{fontSize:60,marginBottom:16}}>🛍️</div>
            <h3 style={{color:"#475569"}}>{searchQuery?"No products found":"No products yet"}</h3>
            {user.role==="admin"&&!searchQuery&&<p style={{fontSize:14}}>Go to <strong>Admin Panel → Products → Add Product</strong></p>}
            {user.role!=="admin"&&<p style={{fontSize:14}}>Products coming soon!</p>}
          </div>
        ):(
          <>
            <ProductSection title="Trending Now" icon="🔥" products={trending} onAdd={addToCart} onView={setSelProd}/>
            <ProductSection title="Best Deals"   icon="💰" products={bestDeals} onAdd={addToCart} onView={setSelProd}/>
            <ProductSection title="Top Rated"    icon="⭐" products={topRated}  onAdd={addToCart} onView={setSelProd}/>
          </>
        )}
      </main>

      <Footer/>

      {cartOpen&&<CartSidebar cart={cart} onClose={()=>setCartOpen(false)} onRemove={removeFromCart} onUpdateQty={updateQty} loading={cartLoading} onCheckout={()=>{setCartOpen(false);setCheckout(true);}}/>}
      {checkoutOpen&&<CheckoutModal cart={cart} onClose={()=>setCheckout(false)} onPlaced={handlePlaced} showToast={showToast}/>}
      {ordersOpen&&<MyOrdersModal onClose={()=>setOrdersOpen(false)}/>}
      {selProduct&&<ProductDetail product={selProduct} onClose={()=>setSelProd(null)} onAdd={addToCart} showToast={showToast}/>}
      {adminOpen&&<AdminPanel onClose={()=>{setAdminOpen(false);refreshProducts();}} showToast={showToast}/>}

      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1e293b",color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:2000,maxWidth:"90vw",animation:"toastIn 0.3s ease",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",whiteSpace:"nowrap"}}>{toast}</div>}

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{from{opacity:0.5;transform:scale(1)}to{opacity:1;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        input:focus,textarea:focus,select:focus{border-color:#0ea5e9!important;box-shadow:0 0 0 3px rgba(14,165,233,0.15)!important;outline:none!important;}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>
    </div>
  );
}
