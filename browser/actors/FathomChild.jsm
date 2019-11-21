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
    // TODO: Something like Fathom.runRuleset(this.document);
    console.log(this.contentWindow.location.href);
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
