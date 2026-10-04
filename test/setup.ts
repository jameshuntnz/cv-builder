import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no layout engine and leaves these out.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
Element.prototype.scrollIntoView = function scrollIntoView() {
  // Nothing to scroll in jsdom.
};

// ProseMirror measures text ranges to scroll the caret into view.
for (const proto of [Range.prototype, Element.prototype]) {
  Object.defineProperty(proto, "getClientRects", { configurable: true, value: () => [] });
}
Object.defineProperty(Range.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => DOMRect.fromRect(),
});
Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null });

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no pointer capture.
Object.defineProperty(Element.prototype, "setPointerCapture", {
  configurable: true,
  value: () => undefined,
});
