// Base UI's ScrollArea reads the Web Animations API, which JSDOM does not implement.
if (!Element.prototype.getAnimations) {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
}
