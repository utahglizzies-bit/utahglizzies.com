/* Utah Glizzies Shop — client-side search / sort / in-stock filter for generated listing pages.
   Works on shop.html and shop/<category>.html. Remembers sort + query in the URL (?q=&sort=) so links are shareable. */
(function(){
  var root = document.querySelector("[data-shop-browse]"); if(!root) return;
  var grid = root.querySelector("[data-shop-grid]"), input = root.querySelector("[data-shop-search]"),
      sortSel = root.querySelector("[data-shop-sort]"), stock = root.querySelector("[data-shop-instock]"),
      count = root.querySelector("[data-shop-count]"), empty = root.querySelector("[data-shop-empty]"),
      clearBtn = root.querySelector("[data-shop-clear]");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".product-card"));
  var params = new URLSearchParams(location.search);
  if(params.get("q")) input.value = params.get("q");
  if(params.get("sort")) sortSel.value = params.get("sort");
  if(params.get("instock")==="1") stock.checked = true;

  var sorters = {
    featured: function(a,b){ return (+a.dataset.order)-(+b.dataset.order) || Date.parse(b.dataset.created)-Date.parse(a.dataset.created); },
    "new": function(a,b){ return Date.parse(b.dataset.created)-Date.parse(a.dataset.created); },
    "price-asc": function(a,b){ return (+a.dataset.price)-(+b.dataset.price); },
    "price-desc": function(a,b){ return (+b.dataset.price)-(+a.dataset.price); },
    name: function(a,b){ return a.dataset.name.localeCompare(b.dataset.name); }
  };
  function apply(){
    var terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    var sorted = cards.slice().sort(function(a,b){
      // sold-out items sink to the bottom unless sorting by name
      if(sortSel.value!=="name" && a.dataset.soldout!==b.dataset.soldout) return (+a.dataset.soldout)-(+b.dataset.soldout);
      return (sorters[sortSel.value]||sorters.featured)(a,b);
    });
    sorted.forEach(function(c){
      var ok = terms.every(function(t){ return c.dataset.search.indexOf(t) > -1; }) && (!stock.checked || c.dataset.soldout!=="1");
      c.hidden = !ok; if(ok) shown++;
      grid.appendChild(c);
    });
    count.textContent = shown + (shown===1 ? " item" : " items") + (terms.length ? ' for "' + input.value.trim() + '"' : "");
    empty.hidden = shown !== 0;
    var p = new URLSearchParams(location.search);
    input.value.trim() ? p.set("q", input.value.trim()) : p.delete("q");
    sortSel.value !== "featured" ? p.set("sort", sortSel.value) : p.delete("sort");
    stock.checked ? p.set("instock","1") : p.delete("instock");
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }
  var t; input.addEventListener("input", function(){ clearTimeout(t); t = setTimeout(apply, 120); });
  sortSel.addEventListener("change", apply);
  stock.addEventListener("change", apply);
  if(clearBtn) clearBtn.addEventListener("click", function(){ input.value=""; stock.checked=false; apply(); input.focus(); });
  // "/" focuses search, like most stores
  document.addEventListener("keydown", function(e){ if(e.key==="/" && document.activeElement.tagName!=="INPUT"){ e.preventDefault(); input.focus(); } });
  apply();
  if(typeof gtag==="function"){ input.addEventListener("change", function(){ if(input.value.trim()) gtag("event","search",{search_term:input.value.trim()}); }); }
})();
