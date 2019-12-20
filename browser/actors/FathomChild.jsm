/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["FathomChild"];

ChromeUtils.defineModuleGetter(
  this,
  "fathom",
  "resource://gre/modules/third_party/fathom/fathom.js"
);

const COLORS = {
  shopping: "red",
  article: "blue",
};

class FathomChild extends JSWindowActorChild {
  constructor() {
    super();
  }

  handleEvent(aEvent) {
    switch (aEvent.type) {
      case "DOMContentLoaded":
        this.executeFathom();
        break;
    }
  }

  executeFathom() {
    const shoppingRules = makeShoppingRuleset();
    const articleRules = makeArticleRuleset();
    const scores = {
      "shopping": shoppingRules.against(this.document).get("shopping")[0].scoreFor("shopping"),
      "article": articleRules.against(this.document).get("article")[0].scoreFor("article")
    };
    console.log("shopping: ", scores["shopping"]);
    console.log("article: ", scores["article"]);
    const predictedCategory = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    if (scores[predictedCategory] >= 0.5) {
      this.addCSSBorderAndLabel(predictedCategory, scores[predictedCategory]);
    }
  }

  addCSSBorderAndLabel(type, score) {
    const color = COLORS[type];
    if (!color) {
      console.error(
        `Unknown type ${type}. Border and label will not be added to this page.`
      );
      return;
    }

    const borderWidth = "5px";

    const labelElement = this.document.createElement("SPAN");
    labelElement.style.display = "inline-block";
    labelElement.style.position = "relative";
    labelElement.style.zIndex = "1000";
    labelElement.style.padding = "10px";
    // The label sits just inside the bounds of the border; this ensures the text looks centered in the label
    labelElement.style.top = `-${borderWidth}`;
    labelElement.style.left = "50%";
    labelElement.style.transform = "translateX(-50%)";
    labelElement.style.backgroundColor = color;
    labelElement.style.color = "white";
    labelElement.style.fontSize = "32px";
    labelElement.style.fontFamily = "sans-serif";
    labelElement.style.lineHeight = "1.15em";
    labelElement.innerText = `${type}: ${(score * 100).toFixed(2)}% confidence`;

    const borderElement = this.document.createElement("DIV");
    borderElement.style.position = "fixed";
    borderElement.style.zIndex = "1000";
    borderElement.style["pointer-events"] = "none";
    borderElement.style.top = "0";
    borderElement.style.bottom = "0";
    borderElement.style.left = "0";
    borderElement.style.right = "0";
    borderElement.style.border = `${borderWidth} solid ${color}`;

    borderElement.append(labelElement);
    this.document.body.append(borderElement);
  }
}

// Adapted from mozilla-services/fathom-smoot commit 9612fcddc64096418e95b347f3bf26ca02a600f4
function makeShoppingRuleset() {
  const {dom, rule, ruleset, score, type} = fathom;

  function caselessIncludes(haystack, needle) {
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  function numberOfOccurrencesOf(fnode, text) {
    const regex = new RegExp(text, "gi");
    return (fnode.element.innerText.match(regex) || []).length;
  }

  function numberOfCartOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "cart") > 1;
  }

  function numberOfBuyOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "buy") > 1;
  }

  function numberOfCheckoutOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "checkout") > 1;
  }

  function numberOfBuyButtons(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button,input,a'));
    return buttons.filter(button => caselessIncludes(button.innerText, 'buy')).length > 2;
  }

  function numberOfShopButtons(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button,input,a'));
    return buttons.filter(button => caselessIncludes(button.innerText, 'shop')).length > 2;
  }

  function hasAddToCartButton(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button, a[class*="btn"]'));
    if (buttons.some(button => {
      return caselessIncludes(button.innerText, 'add to cart') ||
        caselessIncludes(button.innerText, 'add to bag') ||
        caselessIncludes(button.innerText, 'add to basket') ||
        caselessIncludes(button.innerText, 'add to trolley') ||
        caselessIncludes(button.className, 'add-to-cart') ||
        caselessIncludes(button.title, 'add to cart');
    })) {
      return true;
    }
    const images = Array.from(fnode.element.querySelectorAll('img'));
    if (images.some(image => caselessIncludes(image.title, 'add to cart'))) {
      return true;
    }
    const inputs = Array.from(fnode.element.querySelectorAll('input'));
    if (inputs.some(input => caselessIncludes(input.className, 'add-to-cart'))) {
      return true;
    }
    const spans = Array.from(fnode.element.querySelectorAll('span'));
    if (spans.some(span => {
      return caselessIncludes(span.className, 'addtocart') ||
        caselessIncludes(span.innerText, 'add to bag') ||
        caselessIncludes(span.innerText, 'add to cart');
    })) {
      return true;
    }
    const links = Array.from(fnode.element.querySelectorAll('a'));
    return links.some(link => caselessIncludes(link.innerText, '加入购物车'));
  }

  function hasCheckoutButton(fnode) {
    const divs = Array.from(fnode.element.querySelectorAll('div'));
    if (divs.some(div => caselessIncludes(div.className, 'checkout'))) {
      return true;
    }
    const buttons = Array.from(fnode.element.querySelectorAll('button'));
    if (buttons.some(button => {
      return caselessIncludes(button.innerText, 'checkout') ||
        caselessIncludes(button.innerText, 'check out') ||
        caselessIncludes(button.className, 'checkout');
    })) {
      return true;
    }
    const spans = Array.from(fnode.element.querySelectorAll('span'));
    if (spans.some(span => caselessIncludes(span.className, 'checkout'))) {
      return true;
    }
    const links = Array.from(fnode.element.querySelectorAll('a'));
    if (links.some(link => {
      return caselessIncludes(link.innerText, 'checkout') ||
        caselessIncludes(link.href, 'checkout');
    })) {
      return true;
    }
    const inputs = Array.from(fnode.element.querySelectorAll('input'));
    return inputs.some(input => caselessIncludes(input.value, 'checkout'));
  }

  function hasLinkToCart(fnode) {
    const links = Array.from(fnode.element.getElementsByTagName('a'));
    if (links.some(link => {
      return caselessIncludes(link.className, 'cart') ||
        link.href.endsWith('/cart/') ||
        link.href.endsWith('/cart') ||
        caselessIncludes(getAriaLabel(link), 'cart') ||
        link.href.endsWith('/main_view_cart.php') ||
        caselessIncludes(link.className, '/cart/') ||
        link.href.endsWith('/cart.php') ||
        link.href.endsWith('/shoppingCart') ||
        link.href.endsWith('/ShoppingCart') ||
        link.href.endsWith('/shopping_cart.php') ||
        caselessIncludes(link.id, 'cart') ||
        caselessIncludes(link.id, 'basket') ||
        caselessIncludes(link.id, 'bag') ||
        caselessIncludes(link.id, 'trolley') ||
        caselessIncludes(link.className, 'basket') ||
        caselessIncludes(link.className, 'trolley') ||
        caselessIncludes(link.className, 'shoppingbag') ||
        caselessIncludes(link.title, 'cart') ||
        link.href.endsWith('/trolley') ||
        link.href.endsWith('/basket') ||
        link.href.endsWith('/bag') ||
        link.href.endsWith('/viewcart') ||
        link.href.endsWith('/basket.html') ||
        link.href.endsWith('/ShoppingBag.aspx') ||
        link.href.startsWith('https://cart.');
    })) {
      return true;
    }
    const buttons = Array.from(fnode.element.querySelectorAll('button'));
    if (buttons.some(button => {
      return caselessIncludes(button.className, 'cart') ||
        caselessIncludes(getAriaLabel(button), 'cart');
    })) {
      return true;
    }
    const spans = Array.from(fnode.element.getElementsByTagName('span'));
    return spans.some(span => {
      return caselessIncludes(span.className, 'cart');
    });
  }

  function getAriaLabel(element) {
    if (element.hasAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }
    return '';
  }

  function numberOfLinksToStore(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      return link.href.startsWith('https://shop.') ||
        link.href.startsWith('https://store.') ||
        link.href.startsWith('https://products.') ||
        link.href.endsWith('/shop/') ||
        link.href.endsWith('/products') ||
        caselessIncludes(link.href, '/marketplace/') ||
        caselessIncludes(link.href, '/store/') ||
        caselessIncludes(link.href, '/shop/') ||
        link.href.endsWith('/store');
    }).length > 2;
  }

  function numberOfLinksToCatalog(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => caselessIncludes(link.href, 'catalog')).length > 1;
  }

  function hasShoppingCartIcon(fnode) {
    const icons = Array.from(fnode.element.getElementsByTagName('i'));
    if (icons.some(icon => caselessIncludes(icon.className, 'cart'))) {
      return true
    }
    const imgs = Array.from(fnode.element.getElementsByTagName('img'));
    if (imgs.some(img => caselessIncludes(img.src, 'cart'))) {
      return true
    }
    const spans = Array.from(fnode.element.getElementsByTagName('span'));
    return spans.some(span => {
      return caselessIncludes(span.className, 'cart') ||
        caselessIncludes(span.className, 'trolley');
    })
  }

  function hasStarRatings(fnode) {
    const divs = Array.from(fnode.element.querySelectorAll('div[class*="rating" i], div[class*="review" i]'));
    return divs.some(div => {
      const stars = div.querySelectorAll('span[class*="star" i], i[class*="star" i], div[type*="star" i], div[class*="star" i], svg[class*="star" i]');
      return stars.length >= 5;
    });
  }

  function numberOfCurrencySymbols(fnode) {
    const currencies = /[$£€¥]/g;
    return (fnode.element.innerText.match(currencies) || []).length >= 4;
  }

  function numberOfShippingAddressOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "shipping address") >= 1;
  }

  function numberOfBillingAddressOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "billing address") >= 2;
  }

  function numberOfPaymentMethodOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "payment method") >= 1;
  }

  function numberOfShippingMethodOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "shipping method") >= 1;
  }

  function numberOfStockPhraseOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "in stock") + numberOfOccurrencesOf(fnode, "out of stock") >= 1;
  }

  function numberOfContinueShoppingOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "continue shopping") >= 1;
  }

  function numberOfPolicyOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "policy") >= 1;
  }

  function numberOfTermsOccurrences(fnode) {
    return numberOfOccurrencesOf(fnode, "terms") >= 1;
  }

  function numberOfLinksToSale(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      return caselessIncludes(link.href, 'sale') ||
        caselessIncludes(link.href, 'deals') ||
        caselessIncludes(link.href, 'clearance');
    }).length >= 1;
  }

  function numberOfProductLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => caselessIncludes(link.href, 'product')).length >= 5;
  }

  function numberOfElementsWithProductClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="product" i]')).length >= 4;
  }

  function numberOfElementsWithProductId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="product" i]')).length >= 1;
  }

  function hasOrderForm(fnode) {
    const forms = Array.from(fnode.element.getElementsByTagName('form'));
    return forms.some(form => {
      return caselessIncludes(form.name, 'order') ||
        caselessIncludes(form.name, 'shipping') ||
        caselessIncludes(form.name, 'payment') ||
        caselessIncludes(form.name, 'checkout') ||
        caselessIncludes(form.name, 'address') ||
        caselessIncludes(form.name, 'product');
    })
  }

  function hasContactForm(fnode) {
    const forms = Array.from(fnode.element.getElementsByTagName('form'));
    return forms.some(form => {
      return caselessIncludes(form.name, 'contact') ||
        caselessIncludes(form.name, 'question');
    })
  }

  function numberOfHelpOrSupportLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      try {
        const url = new URL(link.href);
        return urlIsHelpOrSupport(url)
      } catch (e) {
        // None empty strings that are not valid URLs
        return false
      }
    }).length >= 1;
  }

  function numberOfPromoLinkOccurrences(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => caselessIncludes(link.href, 'promo')).length >= 2;
  }

  function numberOfPercentOff(fnode) {
    return numberOfOccurrencesOf(fnode, "% off") >= 1;
  }

  function isAHelpOrSupportURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    return urlIsHelpOrSupport(pageURL);
  }

  function urlIsHelpOrSupport(url) {
    const domainPieces = url.hostname.split(".");
    const subdomain = domainPieces[0];
    if (caselessIncludes(subdomain, 'help') || caselessIncludes(subdomain, 'support')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (caselessIncludes(topLevelDomain, 'help') || caselessIncludes(topLevelDomain, 'support')) {
      return true;
    }
    const pathname = url.pathname;
    return (
      caselessIncludes(pathname, 'help') ||
      caselessIncludes(pathname, 'support') ||
      caselessIncludes(pathname, 'contact') ||
      caselessIncludes(pathname, 'policy') ||
      caselessIncludes(pathname, 'terms') ||
      caselessIncludes(pathname, 'troubleshooting')
    );
  }

  function isAJobsURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const domainPieces = pageURL.hostname.split(".");
    const subdomain = domainPieces[0];
    if (caselessIncludes(subdomain, 'jobs') || caselessIncludes(subdomain, 'careers')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (caselessIncludes(topLevelDomain, 'jobs') || caselessIncludes(topLevelDomain, 'careers')) {
      return true;
    }
    const pathname = pageURL.pathname;
    return (
      caselessIncludes(pathname, 'jobs') ||
      caselessIncludes(pathname, 'careers')
    );
  }

  function isAShopishURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const domainPieces = pageURL.hostname.split(".");
    const subdomain = domainPieces[0];
    if (caselessIncludes(subdomain, 'shop') || caselessIncludes(subdomain, 'store')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (caselessIncludes(topLevelDomain, 'shop') || caselessIncludes(topLevelDomain, 'store')) {
      return true;
    }
    const pathname = pageURL.pathname;
    return (
      caselessIncludes(pathname, 'product') ||
      caselessIncludes(pathname, 'store') ||
      caselessIncludes(pathname, 'marketplace') ||
      caselessIncludes(pathname, 'catalog') ||
      caselessIncludes(pathname, 'shop')
    );
  }

  // TODO: Should this just be part of `isAShopishURL`?
  function isAShoppingActionURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const pathname = pageURL.pathname;
    return (
      caselessIncludes(pathname, 'cart') ||
      caselessIncludes(pathname, 'checkout') ||
      caselessIncludes(pathname, 'wishlist') ||
      caselessIncludes(pathname, 'deals') ||
      caselessIncludes(pathname, 'sales') ||
      caselessIncludes(pathname, 'pricing') ||
      caselessIncludes(pathname, 'basket') ||
      caselessIncludes(pathname, 'wish-list')
    );
  }

  function isArticleishURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    return isArticleish(pageURL)
  }

  function isArticleish(url) {
    const domainPieces = url.hostname.split(".");
    const subdomain = domainPieces[0];
    if (caselessIncludes(subdomain, 'blog') || caselessIncludes(subdomain, 'news')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (caselessIncludes(topLevelDomain, 'blog') || caselessIncludes(topLevelDomain, 'news')) {
      return true;
    }
    const pathname = url.pathname;
    return (
      caselessIncludes(pathname, 'blog') ||
      caselessIncludes(pathname, 'news')
    );
  }

  function numberOfArticleishLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      try {
        const pageURL = new URL(link.href);
        return isArticleish(pageURL)
      } catch (e) {
        // None empty strings that are not valid URLs
        return false
      }
    }).length >= 1;
  }

  function hasLinkToStoreFinder(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.some(link => {
      return caselessIncludes(link.href, 'storelocator') ||
        caselessIncludes(link.href, 'storefinder') ||
        caselessIncludes(link.innerText, 'store locator') ||
        caselessIncludes(link.innerText, 'store finder') ||
        caselessIncludes(link.innerText, 'locate a store') ||
        caselessIncludes(link.innerText, 'find a store');
    })
  }

  function numberOfPrices(fnode) {
    const price = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/g;
    return (fnode.element.innerText.match(price) || []).length >= 5;
  }

  function numberOfElementsWithCheckoutClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="checkout" i]')).length >= 1;
  }

  function numberOfElementsWithCheckoutId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="checkout" i]')).length >= 1;
  }

  function numberOfElementsWithCartClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="cart" i]')).length >= 1;
  }

  function numberOfElementsWithCartId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="cart" i]')).length >= 1;
  }

  function numberOfElementsWithShippingClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="shipping" i]')).length >= 1;
  }

  function numberOfElementsWithShippingId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="shipping" i]')).length >= 1;
  }

  function numberOfElementsWithPaymentClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="payment" i]')).length >= 1;
  }

  function numberOfElementsWithPaymentId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="payment" i]')).length >= 1;
  }

  return ruleset(
    [
      rule(dom('html'), type('shopping')),
      rule(type('shopping'), score(numberOfCartOccurrences), {name: 'numberOfCartOccurrences'}),
      rule(type('shopping'), score(numberOfBuyOccurrences), {name: 'numberOfBuyOccurrences'}),
      rule(type('shopping'), score(numberOfCheckoutOccurrences), {name: 'numberOfCheckoutOccurrences'}),
      rule(type('shopping'), score(numberOfBuyButtons), {name: 'numberOfBuyButtons'}),
      rule(type('shopping'), score(numberOfShopButtons), {name: 'numberOfShopButtons'}),
      rule(type('shopping'), score(hasAddToCartButton), {name: 'hasAddToCartButton'}),
      rule(type('shopping'), score(hasCheckoutButton), {name: 'hasCheckoutButton'}),
      rule(type('shopping'), score(hasLinkToCart), {name: 'hasLinkToCart'}),
      rule(type('shopping'), score(numberOfLinksToStore), {name: 'numberOfLinksToStore'}),
      rule(type('shopping'), score(numberOfLinksToCatalog), {name: 'numberOfLinksToCatalog'}),
      rule(type('shopping'), score(hasShoppingCartIcon), {name: 'hasShoppingCartIcon'}),
      rule(type('shopping'), score(hasStarRatings), {name: 'hasStarRatings'}),
      rule(type('shopping'), score(numberOfCurrencySymbols), {name: 'numberOfCurrencySymbols'}),
      rule(type('shopping'), score(numberOfShippingAddressOccurrences), {name: 'numberOfShippingAddressOccurrences'}),
      rule(type('shopping'), score(numberOfBillingAddressOccurrences), {name: 'numberOfBillingAddressOccurrences'}),
      rule(type('shopping'), score(numberOfPaymentMethodOccurrences), {name: 'numberOfPaymentMethodOccurrences'}),
      rule(type('shopping'), score(numberOfShippingMethodOccurrences), {name: 'numberOfShippingMethodOccurrences'}),
      rule(type('shopping'), score(numberOfStockPhraseOccurrences), {name: 'numberOfStockPhraseOccurrences'}),
      rule(type('shopping'), score(numberOfContinueShoppingOccurrences), {name: 'numberOfContinueShoppingOccurrences'}),
      rule(type('shopping'), score(numberOfPolicyOccurrences), {name: 'numberOfPolicyOccurrences'}),
      rule(type('shopping'), score(numberOfTermsOccurrences), {name: 'numberOfTermsOccurrences'}),
      rule(type('shopping'), score(numberOfLinksToSale), {name: 'numberOfLinksToSale'}),
      rule(type('shopping'), score(numberOfProductLinks), {name: 'numberOfProductLinks'}),
      rule(type('shopping'), score(numberOfElementsWithProductClass), {name: 'numberOfElementsWithProductClass'}),
      rule(type('shopping'), score(numberOfElementsWithProductId), {name: 'numberOfElementsWithProductId'}),
      rule(type('shopping'), score(hasOrderForm), {name: 'hasOrderForm'}),
      rule(type('shopping'), score(hasContactForm), {name: 'hasContactForm'}),
      rule(type('shopping'), score(numberOfHelpOrSupportLinks), {name: 'numberOfHelpOrSupportLinks'}),
      rule(type('shopping'), score(numberOfPromoLinkOccurrences), {name: 'numberOfPromoLinkOccurrences'}),
      rule(type('shopping'), score(numberOfPercentOff), {name: 'numberOfPercentOff'}),
      rule(type('shopping'), score(isAHelpOrSupportURL), {name: 'isAHelpOrSupportURL'}),
      rule(type('shopping'), score(isAJobsURL), {name: 'isAJobsURL'}),
      rule(type('shopping'), score(isAShopishURL), {name: 'isAShopishURL'}),
      rule(type('shopping'), score(isAShoppingActionURL), {name: 'isAShoppingActionURL'}),
      rule(type('shopping'), score(isArticleishURL), {name: 'isArticleishURL'}),
      rule(type('shopping'), score(numberOfArticleishLinks), {name: 'numberOfArticleishLinks'}),
      rule(type('shopping'), score(hasLinkToStoreFinder), {name: 'hasLinkToStoreFinder'}),
      rule(type('shopping'), score(numberOfPrices), {name: 'numberOfPrices'}),
      rule(type('shopping'), score(numberOfElementsWithCheckoutClass), {name: 'numberOfElementsWithCheckoutClass'}),
      rule(type('shopping'), score(numberOfElementsWithCheckoutId), {name: 'numberOfElementsWithCheckoutId'}),
      rule(type('shopping'), score(numberOfElementsWithCartClass), {name: 'numberOfElementsWithCartClass'}),
      rule(type('shopping'), score(numberOfElementsWithCartId), {name: 'numberOfElementsWithCartId'}),
      rule(type('shopping'), score(numberOfElementsWithShippingClass), {name: 'numberOfElementsWithShippingClass'}),
      rule(type('shopping'), score(numberOfElementsWithShippingId), {name: 'numberOfElementsWithShippingId'}),
      rule(type('shopping'), score(numberOfElementsWithPaymentClass), {name: 'numberOfElementsWithPaymentClass'}),
      rule(type('shopping'), score(numberOfElementsWithPaymentId), {name: 'numberOfElementsWithPaymentId'}),
      rule(type('shopping'), 'shopping')
    ],
    [
      ["numberOfCartOccurrences", 0.004431677050888538],
      ["numberOfBuyOccurrences", 0.37095534801483154],
      ["numberOfCheckoutOccurrences", 0.003904791548848152],
      ["numberOfBuyButtons", 0.5181145071983337],
      ["numberOfShopButtons", 0.09862659871578217],
      ["hasAddToCartButton", 0.5496213436126709],
      ["hasCheckoutButton", 0.41033145785331726],
      ["hasLinkToCart", 0.37247663736343384],
      ["numberOfLinksToStore", 0.6745859980583191],
      ["numberOfLinksToCatalog", 0.39251187443733215],
      ["hasShoppingCartIcon", 0.34280550479888916],
      ["hasStarRatings", 0.5168086886405945],
      ["numberOfCurrencySymbols", 0.7948866486549377],
      ["numberOfShippingAddressOccurrences", 0.8619705438613892],
      ["numberOfBillingAddressOccurrences", 0.3214116096496582],
      ["numberOfPaymentMethodOccurrences", -0.26714643836021423],
      ["numberOfShippingMethodOccurrences", 0.3138491213321686],
      ["numberOfStockPhraseOccurrences", 0.5305109620094299],
      ["numberOfContinueShoppingOccurrences", 0.8661705255508423],
      ["numberOfPolicyOccurrences", -0.014949105679988861],
      ["numberOfTermsOccurrences", -0.5102343559265137],
      ["numberOfLinksToSale", 0.6466160416603088],
      ["numberOfProductLinks", 0.5545489192008972],
      ["numberOfElementsWithProductClass", 0.5344703197479248],
      ["numberOfElementsWithProductId", 0.3443285822868347],
      ["hasOrderForm", 0.7178601026535034],
      ["hasContactForm", -1.2140718698501587],
      ["numberOfHelpOrSupportLinks", -0.9627346992492676],
      ["numberOfPromoLinkOccurrences", 0.892467200756073],
      ["numberOfPercentOff", 0.6170496940612793],
      ["isAHelpOrSupportURL", -0.8478246927261353],
      ["isAJobsURL", -0.6292590498924255],
      ["isAShopishURL", 0.6362354755401611],
      ["isAShoppingActionURL", 0.8201884031295776],
      ["isArticleishURL", -0.3249336779117584],
      ["numberOfArticleishLinks", -0.5694810152053833],
      ["hasLinkToStoreFinder", 0.5195519328117371],
      ["numberOfPrices", 0.5592770576477051],
      ["numberOfElementsWithCheckoutClass", 0.10612574964761734],
      ["numberOfElementsWithCheckoutId", 0.2279045581817627],
      ["numberOfElementsWithCartClass", 0.21071551740169525],
      ["numberOfElementsWithCartId", 0.3967038094997406],
      ["numberOfElementsWithShippingClass", 0.6411164402961731],
      ["numberOfElementsWithShippingId", -0.3398124575614929],
      ["numberOfElementsWithPaymentClass", 0.4274355173110962],
      ["numberOfElementsWithPaymentId", 0.7997353672981262]
    ],
    [
      ["shopping", -0.7523059248924255]
    ]
  );
}

// Adapted from mozilla-services/fathom-smoot commit d1f0ca55cf472754fef611656d97681fa6cd049f
function makeArticleRuleset() {
  const {dom, rule, ruleset, score, type, utils: {linearScale}} = fathom;

  // Memoize expensive results, so they are only computed once.
  let highestScoringParagraphs;
  let numParagraphsInAllDivs;

  // Text nodes are not targetable via document.querySelectorAll (i.e. Fathom's `dom` method).
  // We instead use a heuristic to estimate the number of paragraph-like text nodes based on the
  // number of descendant <br> elements and list elements in the <div>
  function numParagraphTextNodesInDiv({element}) {
    if (element.tagName !== "DIV") {
      return 0;
    }
    const listDescendants = Array.from(element.querySelectorAll("ol")).concat(Array.from(element.querySelectorAll("ul")));
    const brDescendants = Array.from(element.querySelectorAll("br"));
    // We assume a <br> divides two text nodes/"chunks" (a paragraph or a list)
    return (brDescendants.length - listDescendants.length + 1);
  }

  function getNumParagraphsInAllDivs(paragraphFnodes) {
    const divWithBrFnodes = paragraphFnodes.filter(({element}) => element.tagName === "DIV");
    return divWithBrFnodes.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.noteFor("paragraph");
    }, 0);
  }

  function isElementVisible({element}) {
    // Have to null-check element.style to deal with SVG and MathML nodes.
    return (
      (!element.style || element.style.display != "none")
      && !element.hasAttribute("hidden")
    );
  }

  function divHasBrChildElement({element}) {
    if (element.tagName !== "DIV") {
      return true;
    }
    return Array.from(element.children).some((childEle) => childEle.tagName === "BR");
  }

  function pElementHasNoListItemAncestor({element}) {
    return !element.matches("li p");
  }

  function hasLongTextContent({element}) {
    const textContentLength = element.textContent.trim().length;
    return textContentLength >= 234; // Optimized with 10 sample pages; see /vectors/rule_output_analysis.ipynb
  }

  function getHighestScoringParagraphs(fnode) {
    return fnode._ruleset.get("paragraph");
  }

  function hasEnoughParagraphs(fnode) {
    const paragraphFnodes = highestScoringParagraphs || getHighestScoringParagraphs(fnode);
    const paragraphsInDivsWithBrs = numParagraphsInAllDivs || getNumParagraphsInAllDivs(paragraphFnodes);
    return (paragraphFnodes.length + paragraphsInDivsWithBrs) >= 9; // Optimized with 40 training samples
  }

  function hasArticleElement(fnode) {
    return !!(fnode.element.ownerDocument.querySelector("article"));
  }

  function paragraphElementsHaveSiblingsWithSameTagName(fnode) {
    const paragraphFnodes = highestScoringParagraphs || getHighestScoringParagraphs(fnode);
    const numSiblingsPerParagraphNode = [];
    for (const fnode of paragraphFnodes) {
      const {element} = fnode;
      let siblingsWithSameTagName = 0;
      if (element.tagName === "DIV") {
        const numParagraphs = fnode.noteFor("paragraph");
        siblingsWithSameTagName = numParagraphs - 1;
      } else {
        siblingsWithSameTagName = Array.from(
          element.parentNode.children
        ).filter(
          node => node.tagName === element.tagName && node !== element
        ).length;
      }
      numSiblingsPerParagraphNode.push(siblingsWithSameTagName);
    }
    const sum = numSiblingsPerParagraphNode.reduce((prev, current) => current += prev, 0);
    // average sibling count per highest scoring paragraph node; divide by 0 returns NaN which makes the feature return false
    return Math.round(sum / numSiblingsPerParagraphNode.length) >= 3; // Optimized with 40 training samples
  }

  function mostParagraphElementsAreHorizontallyAligned(fnode) {
    const paragraphFnodes = highestScoringParagraphs || getHighestScoringParagraphs(fnode);
    const leftPositionVsFrequency = new Map();
    for (const {element} of paragraphFnodes) {
      const left = element.getBoundingClientRect().left;
      if (leftPositionVsFrequency.get(left) === undefined) {
        leftPositionVsFrequency.set(left, 1);
      } else {
        leftPositionVsFrequency.set(left, leftPositionVsFrequency.get(left) + 1);
      }
    }

    // At least one left position should contain the majority of paragraph nodes
    const totals = [];
    for (const total of leftPositionVsFrequency.values()) {
      totals.push(total);
    }
    const sum = totals.reduce((prev, current) => current += prev, 0);
    // TODO: Include paragraphs inside divs with brs, see 'getNumParagraphsInAllDivs'
    return sum >= 9; // Optimized with 40 training samples
  }

  function moreParagraphElementsThanListItemsOrTableRows(fnode) {
    const paragraphFnodes = highestScoringParagraphs || getHighestScoringParagraphs(fnode);
    const numParagraphElements = paragraphFnodes.length;
    const tableRowElements = fnode.element.ownerDocument.getElementsByTagName("tr");
    const listItemElements = fnode.element.ownerDocument.getElementsByTagName("li");
    // TODO: Include paragraphs inside divs with brs, see 'getNumParagraphsInAllDivs'
    // TODO: the greater the difference, the higher the score
    return numParagraphElements > tableRowElements.length && numParagraphElements > listItemElements.length;
  }

  function headerElementIsSiblingToParagraphElements(fnode) {
    const headerTagNames = ["H1", "H2"];
    let counter = 0;
    const paragraphFnodes = highestScoringParagraphs || getHighestScoringParagraphs(fnode);
    for (const {element} of paragraphFnodes) {
      const siblings = Array.from(element.parentNode.children).filter(node => node !== element);
      if (siblings.some(sibling => headerTagNames.includes(sibling.tagName))) {
        counter++;
      }
    }
    // TODO: Include paragraphs inside divs with brs, see 'getNumParagraphsInAllDivs'
    return linearScale(counter, 4, 11); // oneAt cut-off optimized with 40 samples
  }

  return ruleset([
      /**
       * Paragraph rules
       */
      // Consider all visible paragraph-ish elements
      rule(dom("p, pre, div").when(isElementVisible).when(divHasBrChildElement), type("paragraph").note(numParagraphTextNodesInDiv)),
      rule(type("paragraph"), score(pElementHasNoListItemAncestor), {name: "pElementHasNoListItemAncestor"}),
      rule(type("paragraph"), score(hasLongTextContent), {name: "hasLongTextContent"}),
      // return paragraph-ish element(s) with max score
      rule(type("paragraph").max(), "paragraph"),

      /**
       * Article rules
       */
      rule(dom("html"), type("article")),
      rule(type("article"), score(hasEnoughParagraphs), {name: "hasEnoughParagraphs"}),
      rule(type("article"), score(hasArticleElement), {name: "hasArticleElement"}),
      rule(type("article"), score(paragraphElementsHaveSiblingsWithSameTagName), {name: "paragraphElementsHaveSiblingsWithSameTagName"}),
      rule(type("article"), score(mostParagraphElementsAreHorizontallyAligned), {name: "mostParagraphElementsAreHorizontallyAligned"}),
      rule(type("article"), score(moreParagraphElementsThanListItemsOrTableRows), {name: "moreParagraphElementsThanListItemsOrTableRows"}),
      rule(type("article"), score(headerElementIsSiblingToParagraphElements), {name: "headerElementIsSiblingToParagraphElements"}),
      rule(type("article"), "article")
    ],
    [
      ["pElementHasNoListItemAncestor", 1.9143790006637573],
      ["hasLongTextContent", 2.991241216659546],
      ["hasEnoughParagraphs", -6.825904369354248],
      ["hasArticleElement", 0.5530931353569031],
      ["paragraphElementsHaveSiblingsWithSameTagName", 5.291628837585449],
      ["mostParagraphElementsAreHorizontallyAligned", 6.951136589050293],
      ["moreParagraphElementsThanListItemsOrTableRows", 0.8062509894371033],
      ["headerElementIsSiblingToParagraphElements", 9.11874008178711]
    ],
    [
      ["paragraph", -3.526047468185425],
      ["article", -3.6415750980377197]
    ]
  );
}
