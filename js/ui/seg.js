// Segmented controls: slide each .seg-thumb under its active button.
export function thumbs() {
  document.querySelectorAll(".seg").forEach((seg) => {
    const on = seg.querySelector("button.on"), th = seg.querySelector(".seg-thumb");
    if (!on || !th || !seg.offsetParent) return;
    th.style.width = on.offsetWidth + "px";
    th.style.transform = `translateX(${on.offsetLeft}px)`;
  });
}
addEventListener("resize", thumbs);
document.fonts?.ready.then(thumbs);
document.fonts?.addEventListener?.("loadingdone", thumbs);
new MutationObserver(() => requestAnimationFrame(thumbs)).observe(document.body, { attributes: true, attributeFilter: ["data-view"] });
