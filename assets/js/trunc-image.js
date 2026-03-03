// Expand / collapse truncated images
(function () {
  function initTruncImages() {
    var blocks = document.querySelectorAll(".trunc-image");
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      var inner = block.querySelector(".trunc-image__inner");
      var btn = block.querySelector(".trunc-image__toggle");
      if (!inner || !btn) return;

      var maxHeightAttr = inner.getAttribute("data-max-height");
      if (maxHeightAttr) {
        var h = parseInt(maxHeightAttr, 10);
        if (!isNaN(h) && h > 0) {
          inner.style.maxHeight = h + "px";
        }
      }

      btn.addEventListener("click", function () {
        var expanded = block.classList.toggle("trunc-image--expanded");
        btn.textContent = expanded ? "Shrink image" : "Expand full image";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTruncImages);
  } else {
    initTruncImages();
  }
})();

