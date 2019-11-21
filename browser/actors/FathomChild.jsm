/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["FathomChild"];

// Example for importing a Fathom module:
// ChromeUtils.defineModuleGetter(
//   this,
//   "Fathom",
//   "resource://gre/modules/Fathom.jsm"
// );

const { Fathom } = ChromeUtils.import("resource://gre/modules/third_party/fathom/fathom.js");

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
    // TODO: Something like Fathom.runRuleset(this.document);
    console.log(this.contentWindow.location.href);
    console.log(Fathom.peeka());
  }
}
