\
/* src/App.jsx */
import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Search, Filter, X, Check, Loader2, ArrowUpRight, Trash2, Menu } from "lucide-react";
import { Toaster, toast } from "sonner";

const currency = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n||0);
const parseNumber = (v)=>{ if(v==null) return 0; if(typeof v==="number") return v; const cleaned=String(v).replace(/\s|€|\u00A0|,/g,"."); const num=parseFloat(cleaned); return Number.isFinite(num)?num:0; };
const normalizeProduct = (raw)=>{ const pick=(...k)=>k.map(x=>raw?.[x]).find(v=>v!=null && v!==""); const id=pick("id","product_id","sku")||Math.random().toString(36).slice(2); const title=pick("title","name","product_name")||"Produit"; const price=parseNumber(pick("price","prix","amount"))||0; const image=pick("image","image_url")||"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"; const commissionField=pick("commission","commission_rate"); let commissionRate=0, commissionFlat=0; if(commissionField!=null){ const c=parseNumber(commissionField); if(c>0 && c<=1) commissionRate=c; else commissionFlat=c;} return { id,title,price,image,commissionRate,commissionFlat,raw }; };

async function fetchEffinityProducts(){ try{ const r = await fetch("/api/effinity"); if(!r.ok) throw new Error("Upstream"); const data = await r.json(); const list = Array.isArray(data)?data:(data?.products||data?.items||data?.data||[]); return list.map(normalizeProduct).filter(p=>p.title && p.price>=0); }catch(e){ console.warn(e); return []; } }

const CART_KEY="affi_cart_v1"; const loadCart=()=>{ try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); }catch{return [];} }; const saveCart=(c)=>localStorage.setItem(CART_KEY,JSON.stringify(c));

export default function App(){
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [products,setProducts]=useState([]); const [query,setQuery]=useState(""); const [filtersOpen,setFiltersOpen]=useState(false); const [cart,setCart]=useState(loadCart()); const [filters,setFilters]=useState({priceMin:0,priceMax:1000,commissionMin:0,category:"",merchant:""});

  useEffect(()=>{ saveCart(cart); },[cart]);
  useEffect(()=>{ (async ()=>{ setLoading(true); try{ const list = await fetchEffinityProducts(); setProducts(list); if(list.length){ const prices=list.map(p=>p.price); setFilters(f=>({...f,priceMin:Math.max(0,Math.floor(Math.min(...prices))), priceMax:Math.ceil(Math.max(...prices))})); } }catch(e){ setError("Échec chargement produits"); } finally{ setLoading(false); } })(); },[]);

  const categories = useMemo(()=>Array.from(new Set(products.map(p=>p.raw?.category||"")).values()).filter(Boolean),[products]);
  const filtered = useMemo(()=> products.filter(p=> p.price>=filters.priceMin && p.price<=filters.priceMax ), [products, filters]);

  const addToCart=(p)=>{ setCart(prev=>{ const existing=prev.find(i=>i.p.id===p.id); let next; if(existing) next = prev.map(i=> i.p.id===p.id?{...i,qty:i.qty+1}:i); else next=[...prev,{p,qty:1}]; toast.success("Ajouté au panier",{description:p.title}); return next; }); };
  const removeFromCart=(id)=> setCart(prev=> prev.filter(i=>i.p.id!==id));

  return (
    <div style={{minHeight:'100vh'}}>
      <Toaster richColors position="top-center" />
      <header style={{position:'fixed',top:0,left:0,right:0,background:'rgba(2,6,23,0.6)',backdropFilter:'blur(6px)',padding:12,zIndex:40}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:40,height:40,background:'rgba(255,255,255,0.06)',borderRadius:10}}></div><strong>AffiShop</strong></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input placeholder="Rechercher..." value={query} onChange={e=>setQuery(e.target.value)} style={{padding:8,borderRadius:10,background:'rgba(255,255,255,0.04)',border:'none',color:'#fff'}}/>
            <button onClick={()=>setFiltersOpen(v=>!v)} style={{padding:8,borderRadius:8,background:'rgba(255,255,255,0.04)'}}>Filtres</button>
            <div style={{position:'relative'}}><ShoppingCart />{cart.length>0 && <span style={{position:'absolute',right:-8,top:-8,fontSize:12,background:'#000',color:'#fff',padding:'2px 6px',borderRadius:999}}>{cart.reduce((a,b)=>a+b.qty,0)}</span>}</div>
          </div>
        </div>
      </header>
      <main style={{maxWidth:1100,margin:'0 auto',padding:'96px 16px 64px'}}>
        <section style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
          <div>
            {loading? <div>Chargement…</div> : error? <div style={{color:'salmon'}}>{error}</div> :
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                {filtered.map(p=> (
                  <div key={p.id} style={{background:'rgba(255,255,255,0.03)',padding:10,borderRadius:12}}>
                    <img src={p.image} alt={p.title} style={{width:'100%',height:140,objectFit:'cover',borderRadius:8}}/>
                    <h3 style={{fontSize:14}}>{p.title}</h3>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>{currency(p.price)}</div>
                      <div style={{display:'flex',gap:8}}><a href={p.url} target="_blank" rel="noreferrer">Voir</a><button onClick={()=>addToCart(p)}>Ajouter</button></div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
          <aside style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:12}}>
              <strong>Panier</strong>
              {cart.length===0? <div>Votre panier est vide</div> : cart.map(({p,qty})=>(
                <div key={p.id} style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                  <img src={p.image} style={{width:48,height:48,objectFit:'cover',borderRadius:8}}/>
                  <div style={{flex:1}}>{p.title}<div style={{fontSize:13,opacity:0.8}}>{qty} × {currency(p.price)}</div></div>
                  <button onClick={()=>removeFromCart(p.id)}><Trash2/></button>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
