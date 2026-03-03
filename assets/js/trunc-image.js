// Expand / collapse truncated images
(function () {
  var DEFAULT_TRUNC = 420;

  function autoWrapPostImages() {
    var post = document.querySelector(".post-content");
    if (!post) return;

    var imgs = post.querySelectorAll("img");

    imgs.forEach(function (img, index) {
      // Skip if already wrapped or explicitly opted out
      if (
        img.closest(".trunc-image") ||
        img.hasAttribute("data-no-trunc") ||
        img.classList.contains("include_image") || // front-matter title images
        img.classList.contains("img-av") ||
        img.classList.contains("img-os") ||
        img.classList.contains("float") ||
        img.classList.contains("float-left") ||
        img.classList.contains("left-image")
      ) {
        return;
      }

      // Don't auto-truncate the very first inline image in the post
      if (index === 0) {
        return;
      }

      var figure = document.createElement("figure");
      figure.className = "trunc-image include_image";

      var inner = document.createElement("div");
      inner.className = "trunc-image__inner";
      inner.setAttribute("data-max-height", String(DEFAULT_TRUNC));

      var fade = document.createElement("div");
      fade.className = "trunc-image__fade";

      var caption = document.createElement("figcaption");
      caption.className = "trunc-image__caption";

      var btn = document.createElement("button");
      btn.className = "trunc-image__toggle";
      btn.type = "button";
      btn.textContent = "Expand full image";

      caption.appendChild(btn);
      inner.appendChild(img.cloneNode(true));
      inner.appendChild(fade);
      figure.appendChild(inner);
      figure.appendChild(caption);

      img.parentNode.replaceChild(figure, img);
    });
  }

  function initTruncImages() {
    // First wrap any plain post images
    autoWrapPostImages();

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

