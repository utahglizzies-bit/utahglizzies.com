/* Utah Glizzies Shop — shared Storefront API cart (localStorage-persisted across pages).
   Public Storefront token is safe client-side. STAGED build. */
(function(){
  var SHOP = { domain:"vwfmfp-td.myshopify.com", token:"ab2528f2ad6d835250f683c1fa17e58d", apiVersion:"2024-10" }; /* per-item shipping calculated at checkout; free-ship threshold removed */
  var ENDPOINT = "https://" + SHOP.domain + "/api/" + SHOP.apiVersion + "/graphql.json";
  var LS_KEY = "glizz_cart_v1";

  function gql(q,v){ return fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":SHOP.token},body:JSON.stringify({query:q,variables:v||{}})}).then(function(r){return r.json();}); }
  function gid(id){ return "gid://shopify/Product/"+id; }
  function money(n){ return "$"+(Math.round(n*100)/100).toFixed(2).replace(/\.00$/,""); }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // ---- persisted state ----
  var state = { cartId:null, checkoutUrl:null, lines:[] };
  try { var saved = JSON.parse(localStorage.getItem(LS_KEY)||"null"); if(saved && saved.lines) state = saved; } catch(e){}
  function persist(){ try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){} }

  var PRODUCT_QUERY = "query($id: ID!){ product(id:$id){ id title availableForSale priceRange{ minVariantPrice{ amount } maxVariantPrice{ amount } } options{ name values } variants(first:100){ edges{ node{ id title availableForSale price{ amount } selectedOptions{ name value } } } } } }";
  var CART_CREATE = "mutation($lines:[CartLineInput!]!){ cartCreate(input:{lines:$lines}){ cart{ id checkoutUrl } userErrors{ message } } }";

  var loaded = {}; // productId -> {variants, options, available, minPrice}

  function fetchProduct(pid){
    if(loaded[pid]) return Promise.resolve(loaded[pid]);
    return gql(PRODUCT_QUERY,{id:gid(pid)}).then(function(res){
      var pr = res && res.data && res.data.product;
      if(!pr){ loaded[pid]={variants:[],options:[],available:false,minPrice:null}; return loaded[pid]; }
      loaded[pid] = {
        variants:(pr.variants.edges||[]).map(function(e){return e.node;}),
        options:pr.options||[], available:pr.availableForSale,
        minPrice:parseFloat(pr.priceRange.minVariantPrice.amount),
        maxPrice:parseFloat(pr.priceRange.maxVariantPrice.amount)
      };
      return loaded[pid];
    }).catch(function(){ loaded[pid]={variants:[],options:[],available:false,minPrice:null}; return loaded[pid]; });
  }

  function realOptions(options){ return (options||[]).filter(function(o){ return !(o.values.length===1 && (o.values[0]==="Default Title"||o.name==="Title")); }); }

  // Rebuild the Shopify cart from our line list; returns promise resolving to checkoutUrl
  function syncCart(){
    var lines = state.lines.map(function(l){
      var input = { merchandiseId:l.variantId, quantity:l.qty };
      if(l.custom){ input.attributes=[{key:"Nameplate",value:l.custom.name},{key:"Number",value:l.custom.number}]; }
      return input;
    });
    if(!lines.length){ state.cartId=null; state.checkoutUrl=null; persist(); return Promise.resolve(); }
    return gql(CART_CREATE,{lines:lines}).then(function(res){
      var c=res.data.cartCreate.cart; state.cartId=c.id; state.checkoutUrl=c.checkoutUrl; persist();
    });
  }

  function subtotal(){ return state.lines.reduce(function(s,l){return s+l.price*l.qty;},0); }
  function count(){ return state.lines.reduce(function(s,l){return s+l.qty;},0); }

  // ---- drawer rendering (expects the standard cart DOM to exist on the page) ----
  function renderCart(){
    var itemsEl=document.getElementById("cartItems"),countEl=document.getElementById("cartCount"),
        subEl=document.getElementById("cartSubtotal"),nudge=document.getElementById("cartShipNudge"),
        checkout=document.getElementById("cartCheckout");
    if(countEl) countEl.textContent = count();
    if(!itemsEl) return;
    if(!state.lines.length){
      itemsEl.innerHTML='<div class="cart-empty">Your cart is empty. Get that dog in you.</div>';
      if(subEl) subEl.textContent="$0";
      if(nudge){ nudge.textContent="Shipping calculated at checkout — low per-item rates. Pucks & stickers ship free."; nudge.classList.remove("free"); }
      if(checkout){ checkout.classList.add("disabled"); checkout.removeAttribute("href"); }
      return;
    }
    itemsEl.innerHTML = state.lines.map(function(l,i){
      var custom=l.custom?'<div class="cart-line-custom">'+esc(l.custom.name)+' #'+esc(l.custom.number)+'</div>':'';
      var variant=l.variantTitle?'<div class="cart-line-variant">'+esc(l.variantTitle)+'</div>':'';
      return '<div class="cart-line"><img src="'+l.img+'" alt="" /><div class="cart-line-info"><div class="cart-line-title">'+esc(l.title)+'</div>'+variant+custom
        +'<div class="cart-line-bottom"><span class="cart-qty"><button data-dec="'+i+'">–</button><span>'+l.qty+'</span><button data-inc="'+i+'">+</button></span><span class="cart-line-price">'+money(l.price*l.qty)+'</span></div>'
        +'<button class="cart-line-remove" data-rm="'+i+'">Remove</button></div></div>';
    }).join("");
    var sub=subtotal(); if(subEl) subEl.textContent=money(sub);
    if(nudge){ nudge.textContent="Shipping calculated at checkout — low per-item rates. Pucks & stickers ship free."; nudge.classList.remove("free"); }
    if(checkout){ checkout.classList.remove("disabled"); checkout.setAttribute("href", state.checkoutUrl||"#"); }
  }

  // ---- public API ----
  window.GlizzCart = {
    fetchProduct: fetchProduct,
    realOptions: realOptions,
    money: money,
    esc: esc,
    add: function(opts){
      // opts: {productId, variant, title, img, custom}
      var v = opts.variant;
      var line = { variantId:v.id, qty:1, title:opts.title, variantTitle:(v.title&&v.title!=="Default Title")?v.title:"", price:parseFloat(v.price.amount), img:opts.img, custom:opts.custom||null };
      state.lines.push(line);
      persist();
      renderCart();
      return syncCart().then(function(){ renderCart(); });
    },
    render: renderCart,
    inc: function(i){ state.lines[i].qty++; persist(); renderCart(); return syncCart().then(renderCart); },
    dec: function(i){ state.lines[i].qty--; if(state.lines[i].qty<=0) state.lines.splice(i,1); persist(); renderCart(); return syncCart().then(renderCart); },
    remove: function(i){ state.lines.splice(i,1); persist(); renderCart(); return syncCart().then(renderCart); },
    count: count
  };

  // ---- wire drawer controls once DOM ready ----
  function wire(){
    var fab=document.getElementById("cartFab"), drawer=document.getElementById("cartDrawer"), overlay=document.getElementById("cartOverlay"), close=document.getElementById("cartClose");
    function open(){ drawer&&drawer.classList.add("open"); overlay&&overlay.classList.add("open"); }
    function shut(){ drawer&&drawer.classList.remove("open"); overlay&&overlay.classList.remove("open"); }
    fab&&fab.addEventListener("click",open);
    close&&close.addEventListener("click",shut);
    overlay&&overlay.addEventListener("click",shut);
    window.GlizzCart.open = open; window.GlizzCart.close = shut;
    var itemsEl=document.getElementById("cartItems");
    itemsEl&&itemsEl.addEventListener("click",function(e){
      var inc=e.target.getAttribute("data-inc"),dec=e.target.getAttribute("data-dec"),rm=e.target.getAttribute("data-rm");
      if(inc!==null) window.GlizzCart.inc(+inc);
      else if(dec!==null) window.GlizzCart.dec(+dec);
      else if(rm!==null) window.GlizzCart.remove(+rm);
    });
    renderCart();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wire); else wire();

  // nav toggle (shared)
  function navwire(){
    var t=document.querySelector('.menu-toggle'),n=document.querySelector('.site-nav');
    if(!n) return;
    function setNavOpen(o){ n.classList.toggle('is-open',o); t&&t.setAttribute('aria-expanded',String(o)); t&&(t.textContent=o?'Close':'Menu'); document.body.style.overflow=o?'hidden':''; }
    t&&t.addEventListener('click',function(){ setNavOpen(!n.classList.contains('is-open')); });
    document.querySelectorAll('.site-nav a').forEach(function(a){a.addEventListener('click',function(){ setNavOpen(false); });});
    var nc=document.querySelector('.nav-close'); nc&&nc.addEventListener('click',function(){ setNavOpen(false); });
    window.addEventListener('resize',function(){ if(window.innerWidth>1100 && n.classList.contains('is-open')) setNavOpen(false); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", navwire); else navwire();

  // ---- IMAGE ZOOM / LIGHTBOX (product pages) ----
  function lightboxWire(){
    var main = document.querySelector(".pd-main");
    if(!main) return;
    var wrap = document.querySelector(".pd-wrap");
    // collect gallery image srcs (from thumbs if present, else the single main img)
    var srcs = [];
    var thumbs = wrap ? wrap.querySelectorAll(".pd-thumb") : [];
    if(thumbs.length){ thumbs.forEach(function(t){ srcs.push(t.getAttribute("data-thumb")); }); }
    else { var mi = main.querySelector("img"); if(mi) srcs.push(mi.getAttribute("src")); }
    if(!srcs.length) return;

    // build overlay once
    var lb = document.createElement("div");
    lb.className = "glizz-lightbox";
    lb.innerHTML = '<button class="glizz-lb-close" aria-label="Close">&times;</button>'
      + (srcs.length>1 ? '<button class="glizz-lb-nav glizz-lb-prev" aria-label="Previous">&#8249;</button><button class="glizz-lb-nav glizz-lb-next" aria-label="Next">&#8250;</button>' : '')
      + '<img src="'+srcs[0]+'" alt="" />'
      + (srcs.length>1 ? '<div class="glizz-lb-count"></div>' : '');
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img");
    var countEl = lb.querySelector(".glizz-lb-count");
    var idx = 0, zoomed = false;

    function show(i){
      idx = (i + srcs.length) % srcs.length;
      lbImg.classList.remove("zoomed"); zoomed=false; lbImg.style.transform="scale(1)";
      lbImg.src = srcs[idx];
      if(countEl) countEl.textContent = (idx+1) + " / " + srcs.length;
    }
    function open(startSrc){
      // open at whatever the main image currently shows
      var i = srcs.indexOf(startSrc); if(i<0) i=0;
      show(i);
      lb.classList.add("open"); document.body.style.overflow="hidden";
    }
    function close(){ lb.classList.remove("open"); document.body.style.overflow=""; }

    main.addEventListener("click", function(){
      var cur = main.querySelector("img");
      open(cur ? cur.getAttribute("src") : srcs[0]);
    });
    lb.querySelector(".glizz-lb-close").addEventListener("click", function(e){ e.stopPropagation(); close(); });
    var prev = lb.querySelector(".glizz-lb-prev"), next = lb.querySelector(".glizz-lb-next");
    prev && prev.addEventListener("click", function(e){ e.stopPropagation(); show(idx-1); });
    next && next.addEventListener("click", function(e){ e.stopPropagation(); show(idx+1); });
    // click image = toggle deeper zoom; click backdrop = close
    lbImg.addEventListener("click", function(e){
      e.stopPropagation();
      zoomed = !zoomed;
      lbImg.classList.toggle("zoomed", zoomed);
      lbImg.style.transform = zoomed ? "scale(2)" : "scale(1)";
    });
    lb.addEventListener("click", function(){ close(); });
    document.addEventListener("keydown", function(e){
      if(!lb.classList.contains("open")) return;
      if(e.key==="Escape") close();
      else if(e.key==="ArrowLeft" && srcs.length>1) show(idx-1);
      else if(e.key==="ArrowRight" && srcs.length>1) show(idx+1);
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", lightboxWire); else lightboxWire();

  // ---- SIZE TABLE with In/Cm tabs (data-driven) ----
  // Markup: <div data-sizedata='{"cols":["Length","Width"],"rows":[["S","17 3/4","19 3/4"], ...],"note":"..."}'></div>
  // Values are INCHES as display strings (may contain fractions). CM computed on the fly.
  function fracToNum(s){
    s = String(s).trim();
    if(s === "" || s.toUpperCase() === "TODO") return null;
    var whole = 0, frac = 0, parts = s.split(" ");
    if(parts.length === 2){ whole = parseFloat(parts[0]); var f = parts[1].split("/"); frac = parseFloat(f[0])/parseFloat(f[1]); }
    else if(s.indexOf("/") > -1){ var f2 = s.split("/"); frac = parseFloat(f2[0])/parseFloat(f2[1]); }
    else { whole = parseFloat(s); }
    var n = whole + frac;
    return isNaN(n) ? null : n;
  }
  function renderSizeTable(host){
    var data;
    try { data = JSON.parse(host.getAttribute("data-sizedata")); } catch(e){ return; }
    if(!data || !data.cols || !data.rows) return;
    var unit = "in";
    function build(){
      var head = "<tr><th>Size</th>" + data.cols.map(function(c){ return "<th>"+esc(c)+" ("+unit+")</th>"; }).join("") + "</tr>";
      var body = data.rows.map(function(r){
        var cells = "<td>"+esc(r[0])+"</td>";
        for(var i=1;i<r.length;i++){
          var raw = r[i];
          var num = fracToNum(raw);
          var out;
          if(num === null){ out = '<span class="size-todo">TODO</span>'; }
          else if(unit === "in"){ out = esc(raw); }
          else { out = (Math.round(num*2.54*10)/10).toFixed(1); }
          cells += "<td>"+out+"</td>";
        }
        return "<tr>"+cells+"</tr>";
      }).join("");
      var note = data.note ? '<div class="size-note">'+esc(data.note)+'</div>' : '';
      host.innerHTML =
        '<div class="size-unit-tabs">'
        + '<button type="button" class="size-unit-tab'+(unit==="in"?" active":"")+'" data-unit="in">Inches</button>'
        + '<button type="button" class="size-unit-tab'+(unit==="cm"?" active":"")+'" data-unit="cm">Centimeters</button>'
        + '</div>'
        + '<table class="size-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table>'
        + note;
    }
    build();
    host.addEventListener("click", function(e){
      var t = e.target.closest("[data-unit]");
      if(!t) return;
      var u = t.getAttribute("data-unit");
      if(u !== unit){ unit = u; build(); }
    });
  }
  function sizeTablesWire(){
    document.querySelectorAll("[data-sizedata]").forEach(renderSizeTable);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", sizeTablesWire); else sizeTablesWire();
})();
