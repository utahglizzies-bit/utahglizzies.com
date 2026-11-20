/* Meta Pixel — Utah Glizzies HC
   Pixel/dataset 1564698035463606 — the same one the Shopify "Facebook & Instagram" channel uses.
   This file tracks the site side (PageView, ViewContent, AddToCart, InitiateCheckout).
   Purchase is tracked by Shopify at checkout (browser + Conversions API), so it is NOT fired here (no double counting).
   Loaded on every page via <script src="/assets/meta-pixel.js?v=N" async>. Bump ?v=N when editing (assets are cached 1 year). */
(function () {
  if (window.fbq) return;
  var PIXEL_ID = "1564698035463606";

  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // Catalog IDs match the Shopify Facebook channel format: shopify_US_<productId>_<variantId>
  function num(gid) { var m = String(gid || "").match(/(\d+)$/); return m ? m[1] : ""; }
  function cid(pid, vid) { return "shopify_US_" + pid + (vid ? "_" + vid : ""); }
  function safe(fn) { try { fn(); } catch (e) {} }

  function hook() {
    // ViewContent — product detail pages
    var wrap = document.querySelector(".pd-wrap[data-product-id]");
    if (wrap) safe(function () {
      var pid = wrap.getAttribute("data-product-id");
      var h1 = document.querySelector(".pd-info h1") || document.querySelector("h1");
      fbq('track', 'ViewContent', {
        content_ids: [cid(pid)], content_type: 'product_group',
        content_name: h1 ? h1.textContent.trim() : undefined, currency: 'USD'
      });
    });

    // AddToCart — wrap the site cart's add() without changing its behavior
    var C = window.GlizzCart;
    if (C && typeof C.add === "function" && !C.__fbHooked) {
      var origAdd = C.add;
      C.add = function (opts) {
        safe(function () {
          var v = (opts && opts.variant) || {};
          var pid = num(opts && opts.productId) || (wrap && wrap.getAttribute("data-product-id")) || "";
          fbq('track', 'AddToCart', {
            content_ids: [cid(pid, num(v.id))], content_type: 'product',
            content_name: opts && opts.title, value: parseFloat(v.price && v.price.amount) || 0, currency: 'USD'
          });
        });
        return origAdd.apply(this, arguments);
      };
      C.__fbHooked = true;
    }

    // InitiateCheckout — click on the cart drawer's Checkout button
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest && e.target.closest("#cartCheckout");
      if (!a || a.classList.contains("disabled")) return;
      safe(function () {
        var st = JSON.parse(localStorage.getItem("glizz_cart_v1") || "null") || { lines: [] };
        var lines = st.lines || [];
        fbq('track', 'InitiateCheckout', {
          value: lines.reduce(function (s, l) { return s + (l.price || 0) * (l.qty || 1); }, 0),
          num_items: lines.reduce(function (s, l) { return s + (l.qty || 1); }, 0),
          currency: 'USD'
        });
      });
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hook); else hook();
})();
