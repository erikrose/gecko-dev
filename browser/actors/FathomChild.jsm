/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["FathomChild"];

const {fathom: {dom, rule, ruleset, score, type, utils: {inlineTextLength}}} = ChromeUtils.import("resource://gre/modules/third_party/fathom/fathom.js");

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
    console.log(this.contentWindow.location.href);

    // An example ruleset that hits some public and private utils, just to
    // prove it's all there:
    const rules = ruleset([
      rule(dom("p"), type("paragraphish")),
      rule(type("paragraphish"), score(fnode => inlineTextLength(fnode.element))),
      rule(type("paragraphish"), "p")
    ]);
    // The actual number emitted is always 1 or close to it due to the sigmoid
    // math. It'll throw an error on pages with no <p> tags.
    console.log(rules.against(this.document).get("p")[0].scoreFor("paragraphish"));
  }
}
