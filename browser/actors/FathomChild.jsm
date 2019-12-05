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
    const shoppingRules = (new ShoppingRuleset()).makeRuleset();
    const articleRules = (new ArticleRuleset()).makeRuleset();
    console.log(shoppingRules.against(this.document).get("shopping")[0].scoreFor("shopping"));
    console.log(articleRules.against(this.document).get("article")[0].scoreFor("article"));
  }

  addCSSBorderAndLabel(type) {
    const color = COLORS[type];
    if (!color) {
      console.error(
        `Unknown type ${type}. Border and label will not be added to this page.`
      );
      return;
    }
    this.document.body.style.border = `5px solid ${color}`;
    const labelElement = this.document.createElement("SPAN");
    labelElement.style.position = "absolute";
    labelElement.style.padding = "10px";
    labelElement.style.top = "0";
    labelElement.style.left = "50%";
    labelElement.style.transform = "translateX(-50%)";
    labelElement.style.backgroundColor = color;
    labelElement.style.color = "white";
    labelElement.style.fontSize = "32px";
    labelElement.innerText = type;
    this.document.body.append(labelElement);
  }
}

class ShoppingRuleset {
  caselessIncludes(haystack, needle) {
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  numberOfOccurrencesOf(fnode, text) {
    const regex = new RegExp(text, "gi");
    return (fnode.element.innerText.match(regex) || []).length;
  }

  numberOfCartOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "cart") > 1;
  }

  numberOfBuyOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "buy") > 1;
  }

  numberOfCheckoutOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "checkout") > 1;
  }

  numberOfBuyButtons(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button,input,a'));
    return buttons.filter(button => this.caselessIncludes(button.innerText, 'buy')).length > 2;
  }

  numberOfShopButtons(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button,input,a'));
    return buttons.filter(button => this.caselessIncludes(button.innerText, 'shop')).length > 2;
  }

  hasAddToCartButton(fnode) {
    const buttons = Array.from(fnode.element.querySelectorAll('button, a[class*="btn"]'));
    if (buttons.some(button => {
      return this.caselessIncludes(button.innerText, 'add to cart') ||
        this.caselessIncludes(button.innerText, 'add to bag') ||
        this.caselessIncludes(button.innerText, 'add to basket') ||
        this.caselessIncludes(button.innerText, 'add to trolley') ||
        this.caselessIncludes(button.className, 'add-to-cart') ||
        this.caselessIncludes(button.title, 'add to cart');
    })) {
      return true;
    }
    const images = Array.from(fnode.element.querySelectorAll('img'));
    if (images.some(image => this.caselessIncludes(image.title, 'add to cart'))) {
      return true;
    }
    const inputs = Array.from(fnode.element.querySelectorAll('input'));
    if (inputs.some(input => this.caselessIncludes(input.className, 'add-to-cart'))) {
      return true;
    }
    const spans = Array.from(fnode.element.querySelectorAll('span'));
    if (spans.some(span => {
      return this.caselessIncludes(span.className, 'addtocart') ||
        this.caselessIncludes(span.innerText, 'add to bag') ||
        this.caselessIncludes(span.innerText, 'add to cart');
    })) {
      return true;
    }
    const links = Array.from(fnode.element.querySelectorAll('a'));
    return links.some(link => this.caselessIncludes(link.innerText, '加入购物车'));
  }

  hasCheckoutButton(fnode) {
    const divs = Array.from(fnode.element.querySelectorAll('div'));
    if (divs.some(div => this.caselessIncludes(div.className, 'checkout'))) {
      return true;
    }
    const buttons = Array.from(fnode.element.querySelectorAll('button'));
    if (buttons.some(button => {
      return this.caselessIncludes(button.innerText, 'checkout') ||
        this.caselessIncludes(button.innerText, 'check out') ||
        this.caselessIncludes(button.className, 'checkout');
    })) {
      return true;
    }
    const spans = Array.from(fnode.element.querySelectorAll('span'));
    if (spans.some(span => this.caselessIncludes(span.className, 'checkout'))) {
      return true;
    }
    const links = Array.from(fnode.element.querySelectorAll('a'));
    if (links.some(link => {
      return this.caselessIncludes(link.innerText, 'checkout') ||
        this.caselessIncludes(link.href, 'checkout');
    })) {
      return true;
    }
    const inputs = Array.from(fnode.element.querySelectorAll('input'));
    return inputs.some(input => this.caselessIncludes(input.value, 'checkout'));
  }

  hasLinkToCart(fnode) {
    const links = Array.from(fnode.element.getElementsByTagName('a'));
    if (links.some(link => {
      return this.caselessIncludes(link.className, 'cart') ||
        link.href.endsWith('/cart/') ||
        link.href.endsWith('/cart') ||
        this.caselessIncludes(this.getAriaLabel(link), 'cart') ||
        link.href.endsWith('/main_view_cart.php') ||
        this.caselessIncludes(link.className, '/cart/') ||
        link.href.endsWith('/cart.php') ||
        link.href.endsWith('/shoppingCart') ||
        link.href.endsWith('/ShoppingCart') ||
        link.href.endsWith('/shopping_cart.php') ||
        this.caselessIncludes(link.id, 'cart') ||
        this.caselessIncludes(link.id, 'basket') ||
        this.caselessIncludes(link.id, 'bag') ||
        this.caselessIncludes(link.id, 'trolley') ||
        this.caselessIncludes(link.className, 'basket') ||
        this.caselessIncludes(link.className, 'trolley') ||
        this.caselessIncludes(link.className, 'shoppingbag') ||
        this.caselessIncludes(link.title, 'cart') ||
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
      return this.caselessIncludes(button.className, 'cart') ||
        this.caselessIncludes(this.getAriaLabel(button), 'cart');
    })) {
      return true;
    }
    const spans = Array.from(fnode.element.getElementsByTagName('span'));
    return spans.some(span => {
      return this.caselessIncludes(span.className, 'cart');
    });
  }

  getAriaLabel(element) {
    if (element.hasAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }
    return '';
  }

  numberOfLinksToStore(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      return link.href.startsWith('https://shop.') ||
        link.href.startsWith('https://store.') ||
        link.href.startsWith('https://products.') ||
        link.href.endsWith('/shop/') ||
        link.href.endsWith('/products') ||
        this.caselessIncludes(link.href, '/marketplace/') ||
        this.caselessIncludes(link.href, '/store/') ||
        this.caselessIncludes(link.href, '/shop/') ||
        link.href.endsWith('/store');
    }).length > 2;
  }

  numberOfLinksToCatalog(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => this.caselessIncludes(link.href, 'catalog')).length > 1;
  }

  hasShoppingCartIcon(fnode) {
    const icons = Array.from(fnode.element.getElementsByTagName('i'));
    if (icons.some(icon => this.caselessIncludes(icon.className, 'cart'))) {
      return true
    }
    const imgs = Array.from(fnode.element.getElementsByTagName('img'));
    if (imgs.some(img => this.caselessIncludes(img.src, 'cart'))) {
      return true
    }
    const spans = Array.from(fnode.element.getElementsByTagName('span'));
    return spans.some(span => {
      return this.caselessIncludes(span.className, 'cart') ||
        this.caselessIncludes(span.className, 'trolley');
    })
  }

  hasStarRatings(fnode) {
    const divs = Array.from(fnode.element.querySelectorAll('div[class*="rating" i], div[class*="review" i]'));
    return divs.some(div => {
      const stars = div.querySelectorAll('span[class*="star" i], i[class*="star" i], div[type*="star" i], div[class*="star" i], svg[class*="star" i]');
      return stars.length >= 5;
    });
  }

  numberOfCurrencySymbols(fnode) {
    const currencies = /[$£€¥]/g;
    return (fnode.element.innerText.match(currencies) || []).length >= 4;
  }

  numberOfShippingAddressOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "shipping address") >= 1;
  }

  numberOfBillingAddressOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "billing address") >= 2;
  }

  numberOfPaymentMethodOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "payment method") >= 1;
  }

  numberOfShippingMethodOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "shipping method") >= 1;
  }

  numberOfStockPhraseOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "in stock") + this.numberOfOccurrencesOf(fnode, "out of stock") >= 1;
  }

  numberOfContinueShoppingOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "continue shopping") >= 1;
  }

  numberOfPolicyOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "policy") >= 1;
  }

  numberOfTermsOccurrences(fnode) {
    return this.numberOfOccurrencesOf(fnode, "terms") >= 1;
  }

  numberOfLinksToSale(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      return this.caselessIncludes(link.href, 'sale') ||
        this.caselessIncludes(link.href, 'deals') ||
        this.caselessIncludes(link.href, 'clearance');
    }).length >= 1;
  }

  numberOfProductLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => this.caselessIncludes(link.href, 'product')).length >= 5;
  }

  numberOfElementsWithProductClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="product" i]')).length >= 4;
  }

  numberOfElementsWithProductId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="product" i]')).length >= 1;
  }

  hasOrderForm(fnode) {
    const forms = Array.from(fnode.element.getElementsByTagName('form'));
    return forms.some(form => {
      return this.caselessIncludes(form.name, 'order') ||
        this.caselessIncludes(form.name, 'shipping') ||
        this.caselessIncludes(form.name, 'payment') ||
        this.caselessIncludes(form.name, 'checkout') ||
        this.caselessIncludes(form.name, 'address') ||
        this.caselessIncludes(form.name, 'product');
    })
  }

  hasContactForm(fnode) {
    const forms = Array.from(fnode.element.getElementsByTagName('form'));
    return forms.some(form => {
      return this.caselessIncludes(form.name, 'contact') ||
        this.caselessIncludes(form.name, 'question');
    })
  }

  numberOfHelpOrSupportLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      try {
        const url = new URL(link.href);
        return this.urlIsHelpOrSupport(url)
      } catch (e) {
        // None empty strings that are not valid URLs
        return false
      }
    }).length >= 1;
  }

  numberOfPromoLinkOccurrences(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => this.caselessIncludes(link.href, 'promo')).length >= 2;
  }

  numberOfPercentOff(fnode) {
    return this.numberOfOccurrencesOf(fnode, "% off") >= 1;
  }

  isAHelpOrSupportURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    return this.urlIsHelpOrSupport(pageURL);
  }

  urlIsHelpOrSupport(url) {
    const domainPieces = url.hostname.split(".");
    const subdomain = domainPieces[0];
    if (this.caselessIncludes(subdomain, 'help') || this.caselessIncludes(subdomain, 'support')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (this.caselessIncludes(topLevelDomain, 'help') || this.caselessIncludes(topLevelDomain, 'support')) {
      return true;
    }
    const pathname = url.pathname;
    return (
      this.caselessIncludes(pathname, 'help') ||
      this.caselessIncludes(pathname, 'support') ||
      this.caselessIncludes(pathname, 'contact') ||
      this.caselessIncludes(pathname, 'policy') ||
      this.caselessIncludes(pathname, 'terms') ||
      this.caselessIncludes(pathname, 'troubleshooting')
    );
  }

  isAJobsURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const domainPieces = pageURL.hostname.split(".");
    const subdomain = domainPieces[0];
    if (this.caselessIncludes(subdomain, 'jobs') || this.caselessIncludes(subdomain, 'careers')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (this.caselessIncludes(topLevelDomain, 'jobs') || this.caselessIncludes(topLevelDomain, 'careers')) {
      return true;
    }
    const pathname = pageURL.pathname;
    return (
      this.caselessIncludes(pathname, 'jobs') ||
      this.caselessIncludes(pathname, 'careers')
    );
  }

  isAShopishURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const domainPieces = pageURL.hostname.split(".");
    const subdomain = domainPieces[0];
    if (this.caselessIncludes(subdomain, 'shop') || this.caselessIncludes(subdomain, 'store')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (this.caselessIncludes(topLevelDomain, 'shop') || this.caselessIncludes(topLevelDomain, 'store')) {
      return true;
    }
    const pathname = pageURL.pathname;
    return (
      this.caselessIncludes(pathname, 'product') ||
      this.caselessIncludes(pathname, 'store') ||
      this.caselessIncludes(pathname, 'marketplace') ||
      this.caselessIncludes(pathname, 'catalog') ||
      this.caselessIncludes(pathname, 'shop')
    );
  }

  // TODO: Should this just be part of `isAShopishURL`?
  isAShoppingActionURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    const pathname = pageURL.pathname;
    return (
      this.caselessIncludes(pathname, 'cart') ||
      this.caselessIncludes(pathname, 'checkout') ||
      this.caselessIncludes(pathname, 'wishlist') ||
      this.caselessIncludes(pathname, 'deals') ||
      this.caselessIncludes(pathname, 'sales') ||
      this.caselessIncludes(pathname, 'pricing') ||
      this.caselessIncludes(pathname, 'basket') ||
      this.caselessIncludes(pathname, 'wish-list')
    );
  }

  isArticleishURL(fnode) {
    const pageURL = new URL(fnode.element.ownerDocument.URL);
    return this.isArticleish(pageURL)
  }

  isArticleish(url) {
    const domainPieces = url.hostname.split(".");
    const subdomain = domainPieces[0];
    if (this.caselessIncludes(subdomain, 'blog') || this.caselessIncludes(subdomain, 'news')) {
      return true;
    }
    const topLevelDomain = domainPieces[domainPieces.length - 1];
    if (this.caselessIncludes(topLevelDomain, 'blog') || this.caselessIncludes(topLevelDomain, 'news')) {
      return true;
    }
    const pathname = url.pathname;
    return (
      this.caselessIncludes(pathname, 'blog') ||
      this.caselessIncludes(pathname, 'news')
    );
  }

  numberOfArticleishLinks(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.filter(link => {
      try {
        const pageURL = new URL(link.href);
        return this.isArticleish(pageURL)
      } catch (e) {
        // None empty strings that are not valid URLs
        return false
      }
    }).length >= 1;
  }

  hasLinkToStoreFinder(fnode) {
    const links = Array.from(fnode.element.querySelectorAll('a[href]:not([href=""])'));
    return links.some(link => {
      return this.caselessIncludes(link.href, 'storelocator') ||
        this.caselessIncludes(link.href, 'storefinder') ||
        this.caselessIncludes(link.innerText, 'store locator') ||
        this.caselessIncludes(link.innerText, 'store finder') ||
        this.caselessIncludes(link.innerText, 'locate a store') ||
        this.caselessIncludes(link.innerText, 'find a store');
    })
  }

  numberOfPrices(fnode) {
    const price = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/g;
    return (fnode.element.innerText.match(price) || []).length >= 5;
  }

  numberOfElementsWithCheckoutClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="checkout" i]')).length >= 1;
  }

  numberOfElementsWithCheckoutId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="checkout" i]')).length >= 1;
  }

  numberOfElementsWithCartClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="cart" i]')).length >= 1;
  }

  numberOfElementsWithCartId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="cart" i]')).length >= 1;
  }

  numberOfElementsWithShippingClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="shipping" i]')).length >= 1;
  }

  numberOfElementsWithShippingId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="shipping" i]')).length >= 1;
  }

  numberOfElementsWithPaymentClass(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[class*="payment" i]')).length >= 1;
  }

  numberOfElementsWithPaymentId(fnode) {
    return Array.from(fnode.element.querySelectorAll('*[id*="payment" i]')).length >= 1;
  }

  makeRuleset() {
    const {dom, rule, ruleset, score, type} = fathom;
    return ruleset(
      [
        rule(dom('html'), type('shopping')),
        rule(type('shopping'), score(this.numberOfCartOccurrences.bind(this)), {name: 'numberOfCartOccurrences'}),
        rule(type('shopping'), score(this.numberOfBuyOccurrences.bind(this)), {name: 'numberOfBuyOccurrences'}),
        rule(type('shopping'), score(this.numberOfCheckoutOccurrences.bind(this)), {name: 'numberOfCheckoutOccurrences'}),
        rule(type('shopping'), score(this.numberOfBuyButtons.bind(this)), {name: 'numberOfBuyButtons'}),
        rule(type('shopping'), score(this.numberOfShopButtons.bind(this)), {name: 'numberOfShopButtons'}),
        rule(type('shopping'), score(this.hasAddToCartButton.bind(this)), {name: 'hasAddToCartButton'}),
        rule(type('shopping'), score(this.hasCheckoutButton.bind(this)), {name: 'hasCheckoutButton'}),
        rule(type('shopping'), score(this.hasLinkToCart.bind(this)), {name: 'hasLinkToCart'}),
        rule(type('shopping'), score(this.numberOfLinksToStore.bind(this)), {name: 'numberOfLinksToStore'}),
        rule(type('shopping'), score(this.numberOfLinksToCatalog.bind(this)), {name: 'numberOfLinksToCatalog'}),
        rule(type('shopping'), score(this.hasShoppingCartIcon.bind(this)), {name: 'hasShoppingCartIcon'}),
        rule(type('shopping'), score(this.hasStarRatings.bind(this)), {name: 'hasStarRatings'}),
        rule(type('shopping'), score(this.numberOfCurrencySymbols.bind(this)), {name: 'numberOfCurrencySymbols'}),
        rule(type('shopping'), score(this.numberOfShippingAddressOccurrences.bind(this)), {name: 'numberOfShippingAddressOccurrences'}),
        rule(type('shopping'), score(this.numberOfBillingAddressOccurrences.bind(this)), {name: 'numberOfBillingAddressOccurrences'}),
        rule(type('shopping'), score(this.numberOfPaymentMethodOccurrences.bind(this)), {name: 'numberOfPaymentMethodOccurrences'}),
        rule(type('shopping'), score(this.numberOfShippingMethodOccurrences.bind(this)), {name: 'numberOfShippingMethodOccurrences'}),
        rule(type('shopping'), score(this.numberOfStockPhraseOccurrences.bind(this)), {name: 'numberOfStockPhraseOccurrences'}),
        rule(type('shopping'), score(this.numberOfContinueShoppingOccurrences.bind(this)), {name: 'numberOfContinueShoppingOccurrences'}),
        rule(type('shopping'), score(this.numberOfPolicyOccurrences.bind(this)), {name: 'numberOfPolicyOccurrences'}),
        rule(type('shopping'), score(this.numberOfTermsOccurrences.bind(this)), {name: 'numberOfTermsOccurrences'}),
        rule(type('shopping'), score(this.numberOfLinksToSale.bind(this)), {name: 'numberOfLinksToSale'}),
        rule(type('shopping'), score(this.numberOfProductLinks.bind(this)), {name: 'numberOfProductLinks'}),
        rule(type('shopping'), score(this.numberOfElementsWithProductClass.bind(this)), {name: 'numberOfElementsWithProductClass'}),
        rule(type('shopping'), score(this.numberOfElementsWithProductId.bind(this)), {name: 'numberOfElementsWithProductId'}),
        rule(type('shopping'), score(this.hasOrderForm.bind(this)), {name: 'hasOrderForm'}),
        rule(type('shopping'), score(this.hasContactForm.bind(this)), {name: 'hasContactForm'}),
        rule(type('shopping'), score(this.numberOfHelpOrSupportLinks.bind(this)), {name: 'numberOfHelpOrSupportLinks'}),
        rule(type('shopping'), score(this.numberOfPromoLinkOccurrences.bind(this)), {name: 'numberOfPromoLinkOccurrences'}),
        rule(type('shopping'), score(this.numberOfPercentOff.bind(this)), {name: 'numberOfPercentOff'}),
        rule(type('shopping'), score(this.isAHelpOrSupportURL.bind(this)), {name: 'isAHelpOrSupportURL'}),
        rule(type('shopping'), score(this.isAJobsURL.bind(this)), {name: 'isAJobsURL'}),
        rule(type('shopping'), score(this.isAShopishURL.bind(this)), {name: 'isAShopishURL'}),
        rule(type('shopping'), score(this.isAShoppingActionURL.bind(this)), {name: 'isAShoppingActionURL'}),
        rule(type('shopping'), score(this.isArticleishURL.bind(this)), {name: 'isArticleishURL'}),
        rule(type('shopping'), score(this.numberOfArticleishLinks.bind(this)), {name: 'numberOfArticleishLinks'}),
        rule(type('shopping'), score(this.hasLinkToStoreFinder.bind(this)), {name: 'hasLinkToStoreFinder'}),
        rule(type('shopping'), score(this.numberOfPrices.bind(this)), {name: 'numberOfPrices'}),
        rule(type('shopping'), score(this.numberOfElementsWithCheckoutClass.bind(this)), {name: 'numberOfElementsWithCheckoutClass'}),
        rule(type('shopping'), score(this.numberOfElementsWithCheckoutId.bind(this)), {name: 'numberOfElementsWithCheckoutId'}),
        rule(type('shopping'), score(this.numberOfElementsWithCartClass.bind(this)), {name: 'numberOfElementsWithCartClass'}),
        rule(type('shopping'), score(this.numberOfElementsWithCartId.bind(this)), {name: 'numberOfElementsWithCartId'}),
        rule(type('shopping'), score(this.numberOfElementsWithShippingClass.bind(this)), {name: 'numberOfElementsWithShippingClass'}),
        rule(type('shopping'), score(this.numberOfElementsWithShippingId.bind(this)), {name: 'numberOfElementsWithShippingId'}),
        rule(type('shopping'), score(this.numberOfElementsWithPaymentClass.bind(this)), {name: 'numberOfElementsWithPaymentClass'}),
        rule(type('shopping'), score(this.numberOfElementsWithPaymentId.bind(this)), {name: 'numberOfElementsWithPaymentId'}),
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
}

class ArticleRuleset {
  constructor() {
    // Memoize expensive results, so they are only computed once.
    this.highestScoringParagraphs = null;
    this.numParagraphsInAllDivs = null;
  }

  // Text nodes are not targetable via document.querySelectorAll (i.e. Fathom's `dom` method).
  // We instead use a heuristic to estimate the number of paragraph-like text nodes based on the
  // number of descendant <br> elements and list elements in the <div>
  numParagraphTextNodesInDiv({element}) {
    if (element.tagName !== "DIV") {
      return 0;
    }
    const listDescendants = Array.from(element.querySelectorAll("ol")).concat(Array.from(element.querySelectorAll("ul")));
    const brDescendants = Array.from(element.querySelectorAll("br"));
    // We assume a <br> divides two text nodes/"chunks" (a paragraph or a list)
    return (brDescendants.length - listDescendants.length + 1);
  }

  getNumParagraphsInAllDivs(paragraphFnodes) {
    const divWithBrFnodes = paragraphFnodes.filter(({element}) => element.tagName === "DIV");
    return divWithBrFnodes.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.noteFor("paragraph");
    }, 0);
  }

  isElementVisible({element}) {
    // Have to null-check element.style to deal with SVG and MathML nodes.
    return (
      (!element.style || element.style.display != "none")
      && !element.hasAttribute("hidden")
    );
  }

  divHasBrChildElement({element}) {
    if (element.tagName !== "DIV") {
      return true;
    }
    return Array.from(element.children).some((childEle) => childEle.tagName === "BR");
  }

  pElementHasNoListItemAncestor({element}) {
    return !element.matches("li p");
  }

  hasLongTextContent({element}) {
    const textContentLength = element.textContent.trim().length;
    return textContentLength >= 234; // Optimized with 10 sample pages; see /vectors/rule_output_analysis.ipynb
  }

  getHighestScoringParagraphs(fnode) {
    return fnode._ruleset.get("paragraph");
  }

  hasEnoughParagraphs(fnode) {
    const paragraphFnodes = this.highestScoringParagraphs || this.getHighestScoringParagraphs(fnode);
    const paragraphsInDivsWithBrs = this.numParagraphsInAllDivs || this.getNumParagraphsInAllDivs(paragraphFnodes);
    return (paragraphFnodes.length + paragraphsInDivsWithBrs) >= 9; // Optimized with 40 training samples
  }

  hasArticleElement(fnode) {
    return !!(fnode.element.ownerDocument.querySelector("article"));
  }

  paragraphElementsHaveSiblingsWithSameTagName(fnode) {
    const paragraphFnodes = this.highestScoringParagraphs || this.getHighestScoringParagraphs(fnode);
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

  mostParagraphElementsAreHorizontallyAligned(fnode) {
    const paragraphFnodes = this.highestScoringParagraphs || this.getHighestScoringParagraphs(fnode);
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

  moreParagraphElementsThanListItemsOrTableRows(fnode) {
    const paragraphFnodes = this.highestScoringParagraphs || this.getHighestScoringParagraphs(fnode);
    const numParagraphElements = paragraphFnodes.length;
    const tableRowElements = fnode.element.ownerDocument.getElementsByTagName("tr");
    const listItemElements = fnode.element.ownerDocument.getElementsByTagName("li");
    // TODO: Include paragraphs inside divs with brs, see 'getNumParagraphsInAllDivs'
    // TODO: the greater the difference, the higher the score
    return numParagraphElements > tableRowElements.length && numParagraphElements > listItemElements.length;
  }

  headerElementIsSiblingToParagraphElements(fnode) {
    const headerTagNames = ["H1", "H2"];
    let counter = 0;
    const paragraphFnodes = this.highestScoringParagraphs || this.getHighestScoringParagraphs(fnode);
    for (const {element} of paragraphFnodes) {
      const siblings = Array.from(element.parentNode.children).filter(node => node !== element);
      if (siblings.some(sibling => headerTagNames.includes(sibling.tagName))) {
        counter++;
      }
    }
    // TODO: Include paragraphs inside divs with brs, see 'getNumParagraphsInAllDivs'
    const {utils: {linearScale}} = fathom;
    return linearScale(counter, 4, 11); // oneAt cut-off optimized with 40 samples
  }

  makeRuleset() {
    const {dom, rule, ruleset, score, type} = fathom;
    return ruleset([
        /**
         * Paragraph rules
         */
        // Consider all visible paragraph-ish elements
        rule(dom("p, pre, div").when(this.isElementVisible).when(this.divHasBrChildElement.bind(this)), type("paragraph").note(this.numParagraphTextNodesInDiv)),
        rule(type("paragraph"), score(this.pElementHasNoListItemAncestor.bind(this)), {name: "pElementHasNoListItemAncestor"}),
        rule(type("paragraph"), score(this.hasLongTextContent.bind(this)), {name: "hasLongTextContent"}),
        // return paragraph-ish element(s) with max score
        rule(type("paragraph").max(), "paragraph"),

        /**
         * Article rules
         */
        rule(dom("html"), type("article")),
        rule(type("article"), score(this.hasEnoughParagraphs.bind(this)), {name: "hasEnoughParagraphs"}),
        rule(type("article"), score(this.hasArticleElement.bind(this)), {name: "hasArticleElement"}),
        rule(type("article"), score(this.paragraphElementsHaveSiblingsWithSameTagName.bind(this)), {name: "paragraphElementsHaveSiblingsWithSameTagName"}),
        rule(type("article"), score(this.mostParagraphElementsAreHorizontallyAligned.bind(this)), {name: "mostParagraphElementsAreHorizontallyAligned"}),
        rule(type("article"), score(this.moreParagraphElementsThanListItemsOrTableRows.bind(this)), {name: "moreParagraphElementsThanListItemsOrTableRows"}),
        rule(type("article"), score(this.headerElementIsSiblingToParagraphElements.bind(this)), {name: "headerElementIsSiblingToParagraphElements"}),
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
}
