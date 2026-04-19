/* ============================================================
   a11y-fixes.js  —  CS 4110 Jupyter Book Accessibility Fixes
   Drop into: _static/a11y-fixes.js at repo root
   Referenced via _config.yml html_js_files entry.

   Covers:
     Issue 1  — Fix skip link pointing to wrong element
     Issue 2  — Ensure GitHub/download buttons are focusable
     Issue 3  — Move right-side "Contents" nav earlier in tab order
     Issues 4+5 — Fix MathJax aria-hidden + remove tabindex="0"
     Issue 6  — Heading focus highlight via tabindex="-1"
     Issue 7  — Wrap code blocks in labelled regions
     NEW      — Remove mjx-assistive-mml unselectable="on"
     NEW      — Fix heading anchor title attributes
   ============================================================ */

(function () {
  "use strict";

  /* ---- Utility: run after DOM is fully parsed --------------- */
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  /* ============================================================
     ISSUE 1 — Skip link target correction
     The skip link href="#main-content" may land on a toggle
     button that happens to have that id. We reassign focus
     programmatically to the actual <main> element or first H1
     so screen reader / keyboard users land in the right place.
     ============================================================ */
  function fixSkipLink() {
    // Target the <a> inside the wrapper div, not the div itself.
    // PyData Sphinx theme renders: <div class="skip-link"><a href="#main-content">...</a></div>
    const skipLinks = Array.from(
      document.querySelectorAll('.skip-link a, a[href="#main-content"]')
    );

    if (skipLinks.length === 0) return;

    // Determine the correct landing target in priority order:
    //   1. <main> element
    //   2. [role="main"]
    //   3. article.bd-article
    //   4. .bd-article-container
    //   5. First H1 inside article content
    const preferredTargets = [
      document.querySelector("main"),
      document.querySelector('[role="main"]'),
      document.querySelector("article.bd-article"),
      document.querySelector(".bd-article-container"),
      document.querySelector("h1"),
    ].filter(Boolean);

    const landingTarget = preferredTargets[0];
    if (!landingTarget) return;

    // Ensure the landing target can receive programmatic focus
    if (!landingTarget.hasAttribute("tabindex")) {
      landingTarget.setAttribute("tabindex", "-1");
    }
    // Give it a stable id that the skip link can reference
    if (!landingTarget.id) {
      landingTarget.id = "a11y-main-content";
    }

    skipLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        landingTarget.focus({ preventScroll: false });
        landingTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      // Update href so sighted users see a valid anchor
      link.setAttribute("href", "#" + landingTarget.id);
    });

    console.info("[a11y] Skip link redirected to:", landingTarget.tagName, "#" + landingTarget.id);
  }

  /* ============================================================
     ISSUE 2 — Ensure GitHub icon link and download buttons
     expose a visible, accessible label and can receive focus.
     Sphinx Book Theme renders these as <a> wrapping SVG icons
     with no visible text and sometimes no aria-label.
     ============================================================ */
  function fixIconButtons() {
    const labelMap = [
      { pattern: /github\.com/i,      label: "View source on GitHub" },
      { pattern: /issues\/new/i,      label: "Open an issue on GitHub" },
      { pattern: /\.md$/i,            label: "Download Markdown source" },
      { pattern: /\.pdf$/i,           label: "Download PDF" },
      { pattern: /\.ipynb$/i,         label: "Download Jupyter Notebook source" },
      { pattern: /colab\.research/i,  label: "Open in Google Colab" },
      { pattern: /mybinder\.org/i,    label: "Open in Binder" },
    ];

    document.querySelectorAll("a[href]").forEach(function (link) {
      const href = link.getAttribute("href") || "";
      const hasText = (link.textContent || "").trim().length > 0;
      const hasLabel = link.hasAttribute("aria-label");

      if (!hasText && !hasLabel) {
        for (const entry of labelMap) {
          if (entry.pattern.test(href)) {
            link.setAttribute("aria-label", entry.label);
            break;
          }
        }
      }

      // Remove any accidental tabindex="-1" on real links
      if (link.getAttribute("tabindex") === "-1" && !link.classList.contains("headerlink")) {
        link.removeAttribute("tabindex");
      }
    });

    // Explicitly handle navbar GitHub / repository link
    document.querySelectorAll(".navbar-nav .nav-item a, .bd-header-end a").forEach(function (a) {
      if (!a.getAttribute("aria-label") && !(a.textContent || "").trim()) {
        if (/github/i.test(a.href)) {
          a.setAttribute("aria-label", "GitHub repository");
        }
      }
    });

    console.info("[a11y] Icon button labels patched.");
  }

  /* ============================================================
     ISSUE 3 — Tab order: surface the right-side "Contents" nav
     earlier so keyboard users hit it before the article body.

     A proxy focusable element is inserted just before the article
     that, when focused, moves focus to the right nav. This avoids
     restructuring the DOM (which would break CSS layout).
     ============================================================ */
  function fixTabOrder() {
    const rightNav = document.querySelector(
      ".bd-sidebar-secondary, #bd-toc-nav, nav.bd-toc"
    );
    const articleContainer = document.querySelector(
      ".bd-article-container, article.bd-article"
    );

    if (!rightNav || !articleContainer) return;

    const proxy = document.createElement("a");
    proxy.href = "#a11y-contents-nav";
    proxy.className = "a11y-jump-link";
    proxy.textContent = "Jump to page contents navigation";
    proxy.setAttribute("aria-label", "Jump to page contents navigation (skip to On this page links)");

    proxy.style.cssText = [
      "position:absolute",
      "top:-9999px",
      "left:-9999px",
      "z-index:9000",
      "padding:0.5em 1em",
      "background:#1a1a2e",
      "color:#fff",
      "border:3px solid #7B2FBE",
      "border-radius:4px",
      "font-weight:700",
      "text-decoration:none",
    ].join(";");

    proxy.addEventListener("focus", function () {
      proxy.style.top = "8px";
      proxy.style.left = "8px";
    });
    proxy.addEventListener("blur", function () {
      proxy.style.top = "-9999px";
      proxy.style.left = "-9999px";
    });
    proxy.addEventListener("click", function (e) {
      e.preventDefault();
      if (!rightNav.hasAttribute("tabindex")) {
        rightNav.setAttribute("tabindex", "-1");
      }
      rightNav.id = rightNav.id || "a11y-contents-nav";
      rightNav.focus({ preventScroll: false });
      rightNav.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    rightNav.id = rightNav.id || "a11y-contents-nav";
    articleContainer.parentNode.insertBefore(proxy, articleContainer);

    console.info("[a11y] Tab order proxy inserted before article container.");
  }

  /* ============================================================
     ISSUES 4 & 5 — MathJax: remove aria-hidden and fix tabindex

     MathJax 3 sets aria-hidden="true" on the visual mjx-math
     element AND tabindex="0" on the container, making math
     unreachable to screen readers yet still a confusing tab stop.
     ============================================================ */
  function fixMathAccessibility() {
    const containers = document.querySelectorAll(
      "mjx-container, .MathJax, span.mjx-chtml, [data-mjx-texclass]"
    );

    containers.forEach(function (container) {
      // Remove aria-hidden from the container itself
      container.removeAttribute("aria-hidden");

      // Remove tabindex="0" — replaced with "-1" below if labelled
      container.removeAttribute("tabindex");

      // Build an aria-label from available sources
      let label = "";

      const svgTitle = container.querySelector("svg title");
      if (svgTitle && svgTitle.textContent.trim()) {
        label = svgTitle.textContent.trim();
      }

      if (!label) {
        const parent = container.closest("[data-latex], [data-math], script[type]");
        if (parent) {
          label = parent.getAttribute("data-latex") ||
                  parent.getAttribute("data-math") ||
                  parent.textContent.trim();
        }
      }

      const assistiveMml = container.querySelector(".MJX_Assistive_MathML, mjx-assistive-mml");
      if (!label && assistiveMml) {
        label = assistiveMml.textContent.trim();
      }

      if (!label) {
        let sib = container.previousElementSibling;
        if (sib && sib.tagName === "SCRIPT" &&
            (sib.type === "math/tex" || sib.type === "math/tex; mode=display")) {
          label = sib.textContent.trim();
        }
      }

      if (label) {
        container.setAttribute("aria-label", label);
        container.setAttribute("role", "math");
        container.setAttribute("tabindex", "-1");
      } else {
        container.setAttribute("aria-hidden", "true");
      }

      // The visual SVG is hidden from AT; the container carries the label
      const svg = container.querySelector("svg");
      if (svg) {
        svg.setAttribute("aria-hidden", "true");
        svg.removeAttribute("tabindex");
        svg.setAttribute("focusable", "false");
      }

      // The visual mjx-math element should be hidden from screen readers;
      // the mjx-assistive-mml element handles the reading
      const mjxMath = container.querySelector("mjx-math");
      if (mjxMath) {
        mjxMath.setAttribute("aria-hidden", "true");
      }
    });

    console.info("[a11y] MathJax containers patched:", containers.length);
  }

  /* ============================================================
     NEW — Fix mjx-assistive-mml unselectable="on"

     MathJax injects <mjx-assistive-mml unselectable="on"> to
     hold real MathML for screen readers, but the unselectable
     attribute prevents users from highlighting and copying math.
     Removing it makes math selectable like normal page text.
     ============================================================ */
  function fixMathSelectable() {
    const assistiveMmls = document.querySelectorAll("mjx-assistive-mml");

    assistiveMmls.forEach(function (el) {
      // Remove the unselectable attribute
      el.removeAttribute("unselectable");

      // Remove the CSS user-select:none that MathJax sets inline
      el.style.userSelect = "text";
      el.style.webkitUserSelect = "text";

      // Ensure it is visible to screen readers
      el.removeAttribute("aria-hidden");
    });

    console.info(
      "[a11y] mjx-assistive-mml unselectable removed:",
      assistiveMmls.length,
      "elements"
    );
  }

  /* ============================================================
     NEW — Fix heading anchor title attributes

     Every heading anchor currently has title="Link to this heading"
     which is generic. Screen readers announce this title on focus
     so users hear "Link to this heading" instead of the actual
     heading text. Replace each with the heading's own text.
     ============================================================ */
  function fixHeadingTitles() {
    document.querySelectorAll(
      "h1 a.headerlink, h2 a.headerlink, h3 a.headerlink, " +
      "h4 a.headerlink, h5 a.headerlink, h6 a.headerlink"
    ).forEach(function (anchor) {
      const heading = anchor.parentElement;

      // Get heading text excluding the "#" anchor character
      const headingText = Array.from(heading.childNodes)
        .filter(function (node) {
          return node !== anchor;
        })
        .map(function (node) {
          return node.textContent || "";
        })
        .join("")
        .trim();

      if (headingText) {
        anchor.setAttribute("title", "Link to heading: " + headingText);
        anchor.setAttribute("aria-label", "Link to heading: " + headingText);
      }
    });

    console.info("[a11y] Heading anchor titles updated.");
  }

  /* ============================================================
     ISSUE 6 — Add tabindex="-1" to headings so that screen
     reader heading-key navigation triggers the CSS focus
     highlight, helping sighted mobility users track their place.
     ============================================================ */
  function fixHeadingFocus() {
    document.querySelectorAll(
      "article h1, article h2, article h3, article h4, " +
      ".bd-article h1, .bd-article h2, .bd-article h3"
    ).forEach(function (h) {
      if (!h.hasAttribute("tabindex")) {
        h.setAttribute("tabindex", "-1");
      }
    });
    console.info("[a11y] Headings made programmatically focusable.");
  }

  /* ============================================================
     ISSUE 7 — Code blocks: wrap in labelled regions and ensure
     they are keyboard reachable for copy/inspection.
     ============================================================ */
  function fixCodeBlocks() {
    let blockIndex = 0;

    // Standalone highlight blocks (non-cell)
    document.querySelectorAll("div.highlight > pre, div.highlight-python > pre").forEach(function (pre) {
      blockIndex++;
      const wrapper = pre.parentElement;

      let lang = "code";
      const classes = Array.from(wrapper.classList);
      const langClass = classes.find((c) => c.startsWith("highlight-") && c !== "highlight");
      if (langClass) {
        lang = langClass.replace("highlight-", "").toUpperCase();
      }

      const label = lang + " example " + blockIndex;

      if (wrapper.getAttribute("role") !== "region") {
        wrapper.setAttribute("role", "region");
        wrapper.setAttribute("aria-label", label);
      }

      if (!pre.hasAttribute("tabindex")) {
        pre.setAttribute("tabindex", "0");
      }
    });

    // Jupyter cell input blocks
    document.querySelectorAll("div.cell_input").forEach(function (cell) {
      blockIndex++;
      if (cell.getAttribute("role") !== "region") {
        cell.setAttribute("role", "region");
        cell.setAttribute("aria-label", "Python code cell " + blockIndex);
      }
    });

    // Jupyter cell output blocks
    document.querySelectorAll("div.cell_output").forEach(function (output) {
      if (output.getAttribute("role") !== "region") {
        output.setAttribute("role", "region");
        output.setAttribute("aria-label", "Code output");
      }
    });

    console.info("[a11y] Code blocks labelled:", blockIndex);
  }

  /* ============================================================
     Re-run math fixes whenever MathJax finishes a new typeset
     pass, and watch for dynamically added math via MutationObserver
     ============================================================ */
  function hookMathJaxEvents() {
    document.addEventListener("MathJax:TypesetComplete", function () {
      fixMathAccessibility();
      fixMathSelectable();
    });

    const observer = new MutationObserver(function (mutations) {
      const hasMath = mutations.some(function (m) {
        return Array.from(m.addedNodes).some(function (n) {
          return n.nodeType === 1 &&
            (n.matches("mjx-container, .MathJax") ||
             n.querySelector("mjx-container, .MathJax"));
        });
      });
      if (hasMath) {
        fixMathAccessibility();
        fixMathSelectable();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ============================================================
   UPDATED — hookMathJaxEvents
   Replaces the previous version. Uses MathJax's own startup
   promise so fixes run exactly when rendering completes on
   heavy pages like Chapters 12 and 13, regardless of how
   long typesetting takes.
   ============================================================ */
  function hookMathJaxEvents() {

    // --- Method 1: MathJax 3 startup promise (most reliable) ---
    // MathJax 3 exposes a promise that resolves when all initial
    // math on the page has been typeset. Hook into it directly.
    function hookWhenMathJaxReady() {
      if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
        window.MathJax.startup.promise.then(function () {
          console.info("[a11y] MathJax startup promise resolved — running math fixes.");
          fixMathAccessibility();
          fixMathSelectable();
        }).catch(function (err) {
          console.warn("[a11y] MathJax startup promise rejected:", err);
        });
      } else {
        // MathJax not ready yet — retry in 200ms
        setTimeout(hookWhenMathJaxReady, 200);
      }
    }
    hookWhenMathJaxReady();

    // --- Method 2: MathJax TypesetComplete custom event ---
    document.addEventListener("MathJax:TypesetComplete", function () {
      fixMathAccessibility();
      fixMathSelectable();
    });

    // --- Method 3: MutationObserver for dynamically added math ---
    const observer = new MutationObserver(function (mutations) {
      const hasMath = mutations.some(function (m) {
        return Array.from(m.addedNodes).some(function (n) {
          return n.nodeType === 1 &&
            (n.matches("mjx-container, .MathJax") ||
             n.querySelector("mjx-container, .MathJax"));
        });
      });
      if (hasMath) {
        fixMathAccessibility();
        fixMathSelectable();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/* ============================================================
   UPDATED — MAIN ready() block
   Keeps safety-net timeouts but extends the final one to 10s
   for heavy pages, while the startup promise handles the
   precise timing on all pages.
   ============================================================ */
ready(function () {
  fixSkipLink();
  fixIconButtons();
  fixTabOrder();
  fixHeadingFocus();
  fixHeadingTitles();
  fixCodeBlocks();

  // Run immediately for any math already in the DOM
  fixMathAccessibility();
  fixMathSelectable();

  // Hook MathJax events for math rendered after page load
  hookMathJaxEvents();

  // Safety-net timeouts — catches edge cases where the startup
  // promise or events don't fire (e.g. MathJax config errors)
  setTimeout(function () {
    fixMathAccessibility();
    fixMathSelectable();
  }, 2000);

  setTimeout(function () {
    fixMathAccessibility();
    fixMathSelectable();
  }, 5000);

  // Extended timeout for heavy pages like Chapters 12 and 13
  // which have significantly more math than other chapters
  setTimeout(function () {
    fixMathAccessibility();
    fixMathSelectable();
    console.info("[a11y] Final safety-net math pass complete.");
  }, 10000);

  console.info("[a11y] All accessibility fixes applied.");
});
})();
