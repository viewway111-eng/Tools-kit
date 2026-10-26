/* AI Creator Studio - script.js
   All tools run in the browser. No API keys, no external services. */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function val(id) { return $(id).value.trim(); }
  function pick(arr, i) { return arr[i % arr.length]; }
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function titleCase(s) { return s.replace(/\S+/g, cap); }
  function csv(s) { return s.split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) { var k = x.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function fill(tpl, t) { return tpl.replace(/\{T\}/g, titleCase(t)).replace(/\{t\}/g, t); }
  function hashtag(s) {
    var w = s.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).map(cap).join("");
    return w ? "#" + w : "";
  }
  function toast(msg) {
    var d = document.createElement("div");
    d.textContent = msg;
    d.setAttribute("role", "status");
    d.style.cssText = "position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#e8eaf0;color:#0f1115;padding:10px 16px;border-radius:8px;z-index:100;font-size:14px;max-width:90%;text-align:center";
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2200);
  }
  function need(id, msg) {
    if (!val(id)) { toast(msg); $(id).focus(); return false; }
    return true;
  }
  function later(fn) {
    var t = 0;
    return function () {
      if (t) return;
      t = requestAnimationFrame(function () { t = 0; fn(); });
    };
  }
  function setRange(id, v) {
    $(id).value = v;
    var o = $(id + "-v");
    if (o) o.textContent = v;
  }
  function saveCanvas(cv, name) {
    cv.toBlob(function (b) {
      if (!b) { toast("Could not create the image"); return; }
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    }, "image/png");
  }
  /* Opens an image file and returns it as a canvas no larger than maxSide pixels. */
  function loadImage(file, maxSide, cb) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Please choose an image file"); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * s));
      c.height = Math.max(1, Math.round(img.naturalHeight * s));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast("Could not open this image"); };
    img.src = url;
  }
  /* Brightness (-100..100), contrast (-100..100), saturation (-100..100), sharpness (0..100). */
  function adjust(ctx, w, h, b, c, sat, sharp) {
    if (!b && !c && !sat && !sharp) return;
    var d = ctx.getImageData(0, 0, w, h), p = d.data, i, r, g, bl, gray;
    var k = c * 2.55, f = (259 * (k + 255)) / (255 * (259 - k)), bo = b * 2.55, sf = 1 + sat / 100;
    for (i = 0; i < p.length; i += 4) {
      r = p[i]; g = p[i + 1]; bl = p[i + 2];
      if (sat) {
        gray = 0.299 * r + 0.587 * g + 0.114 * bl;
        r = gray + (r - gray) * sf; g = gray + (g - gray) * sf; bl = gray + (bl - gray) * sf;
      }
      p[i] = f * (r - 128) + 128 + bo;
      p[i + 1] = f * (g - 128) + 128 + bo;
      p[i + 2] = f * (bl - 128) + 128 + bo;
    }
    if (sharp > 0 && w > 2 && h > 2) {
      var a = sharp / 100, src = new Uint8ClampedArray(p), x, y, ch, j, v, row = w * 4;
      for (y = 1; y < h - 1; y++) {
        for (x = 1; x < w - 1; x++) {
          for (ch = 0; ch < 3; ch++) {
            j = (y * w + x) * 4 + ch;
            v = 5 * src[j] - src[j - 4] - src[j + 4] - src[j - row] - src[j + row];
            p[j] = src[j] + a * (v - src[j]);
          }
        }
      }
    }
    ctx.putImageData(d, 0, 0);
  }

  /* ---------- Navigation ---------- */
  var NAMES = {
    home: "AI Creator Studio", youtube: "YouTube Studio", enhancer: "Photo Enhancer",
    thumbnail: "Thumbnail Maker", script: "Script Writer", ideas: "Viral Idea Studio",
    videoprompt: "Video Prompt Studio", editor: "Photo Editor", social: "Social Media Studio"
  };
  function openMenu() { $("side").classList.add("open"); $("scrim").classList.add("open"); $("menuBtn").setAttribute("aria-expanded", "true"); }
  function closeMenu() { $("side").classList.remove("open"); $("scrim").classList.remove("open"); $("menuBtn").setAttribute("aria-expanded", "false"); }
  function show(id) {
    if (!NAMES[id]) id = "home";
    Array.prototype.forEach.call(document.querySelectorAll(".tool"), function (s) { s.hidden = s.id !== "tool-" + id; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-tool]"), function (a) {
      if (a.classList.contains("on") !== (a.getAttribute("data-tool") === id)) a.classList.toggle("on");
    });
    $("topTitle").textContent = NAMES[id];
    document.title = id === "home" ? "AI Creator Studio – Free Tools for YouTube and Social Media Creators" : NAMES[id] + " – AI Creator Studio";
    if (id !== "home") store.set("acs_last", id);
    closeMenu();
    window.scrollTo(0, 0);
  }
  function route() { show((location.hash || "#home").slice(1)); }
  $("menuBtn").addEventListener("click", openMenu);
  $("bottomMenu").addEventListener("click", openMenu);
  $("scrim").addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("hashchange", route);

  /* ---------- Copy buttons and range labels ---------- */
  function fallbackCopy(el) {
    try {
      el.focus(); el.select(); el.setSelectionRange(0, 99999);
      document.execCommand("copy");
      toast("Copied");
    } catch (e) { toast("Press and hold the text to copy"); }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-copy]") : null;
    if (!b) return;
    var el = $(b.getAttribute("data-copy"));
    if (!el.value) { toast("Nothing to copy yet"); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(el.value).then(function () { toast("Copied"); }, function () { fallbackCopy(el); });
    } else { fallbackCopy(el); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("input[type=range]"), function (r) {
    var o = $(r.id + "-v");
    if (o) r.addEventListener("input", function () { o.textContent = r.value; });
  });

  /* ---------- 1. YouTube Studio ---------- */
  var YT = {
    howto: ["How to {t} (Step by Step)", "{T}: A Complete Beginner's Guide", "Learn {t} in Minutes", "{T} Made Easy: Full Tutorial", "Stop Struggling With {t}: Do This Instead"],
    list: ["7 Tips for {t} You Need to Know", "Top 5 Mistakes in {t}", "{T}: 10 Things Nobody Tells You", "5 Quick Ways to Improve {t}", "The Ultimate {t} Checklist"],
    review: ["{T} Review: Is It Worth It?", "{T}: Honest Review After Real Use", "{T}: Pros, Cons and Verdict", "Should You Try {t}? My Honest Opinion", "{T} vs the Alternatives"],
    story: ["My {t} Journey: What Really Happened", "How {t} Changed Everything for Me", "{T}: My Story", "I Tried {t} for 30 Days", "The Truth About {t}"]
  };
  var YT_TAG = { howto: ["how to {t}", "{t} tutorial"], list: ["{t} tips", "{t} ideas"], review: ["{t} review"], story: ["{t} story", "{t} vlog"] };
  $("yt-generate").addEventListener("click", function () {
    if (!need("yt-topic", "Please enter a video topic")) return;
    var t = val("yt-topic"), kw = csv(val("yt-keywords")), st = $("yt-style").value, main = kw[0] || t;
    var titles = shuffle(YT[st]).map(function (x, i) {
      var s = fill(x, t);
      if (kw[0] && i % 2 === 1) s += " | " + titleCase(kw[0]);
      return (i + 1) + ". " + s + " (" + s.length + " characters)";
    });
    var words = t.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
    var all = uniq([t.toLowerCase()].concat(kw.map(function (k) { return k.toLowerCase(); }),
      YT_TAG[st].map(function (x) { return fill(x, t.toLowerCase()); }), words));
    var tags = [], len = 0;
    all.forEach(function (x) { if (len + x.length + 2 <= 500) { tags.push(x); len += x.length + 2; } });
    var tagLine = uniq([main].concat(kw)).slice(0, 3).map(hashtag).filter(Boolean).join(" ");
    $("yt-titles").value = titles.join("\n");
    $("yt-desc").value = titleCase(t) + "\n\nIn this video you will learn about " + t + "." +
      (kw.length ? " Topics covered: " + kw.join(", ") + "." : "") +
      "\n\nIn this video:\n- Introduction\n- Main ideas and examples\n- Summary\n\nIf this video helped you, like, subscribe and share it." +
      (tagLine ? "\n\n" + tagLine : "");
    $("yt-tags").value = tags.join(", ");
    $("yt-seo").value = "Main keyword: " + main + "\nSupporting keywords: " + (kw.slice(1).join(", ") || "none added") +
      "\n\nChecklist:\n- Put the main keyword near the start of the title.\n- Keep titles under about 60 characters so they are less likely to be cut off.\n- Mention the main keyword in the first two lines of the description.\n- Use relevant tags only.\n- Use a thumbnail with a few easy-to-read words.";
  });

  /* ---------- 2. Photo Enhancer ---------- */
  var en = { src: null };
  function enRender() {
    if (!en.src) return;
    var w = en.src.width, h = en.src.height, a = $("en-after"), c = a.getContext("2d");
    a.width = w; a.height = h;
    c.drawImage(en.src, 0, 0);
    adjust(c, w, h, +$("en-bright").value, +$("en-contrast").value, 0, +$("en-sharp").value);
  }
  var enSoon = later(enRender);
  $("en-file").addEventListener("change", function () {
    loadImage(this.files[0], 1600, function (c) {
      en.src = c;
      var b = $("en-before");
      b.width = c.width; b.height = c.height;
      b.getContext("2d").drawImage(c, 0, 0);
      enRender();
    });
  });
  ["en-bright", "en-contrast", "en-sharp"].forEach(function (id) { $(id).addEventListener("input", enSoon); });
  $("en-reset").addEventListener("click", function () {
    setRange("en-bright", 0); setRange("en-contrast", 0); setRange("en-sharp", 0); enRender();
  });
  $("en-download").addEventListener("click", function () {
    if (!en.src) { toast("Choose a photo first"); return; }
    saveCanvas($("en-after"), "enhanced-photo.png");
  });

  /* ---------- 3. Thumbnail Maker ---------- */
  var th = { img: null };
  function wrapText(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], cur = "", i, t;
    for (i = 0; i < words.length; i++) {
      t = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else { cur = t; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function thDraw() {
    var cv = $("th-canvas"), c = cv.getContext("2d"), W = 1280, H = 720, g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, $("th-bg").value); g.addColorStop(1, $("th-bg2").value);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (th.img) {
      var s = Math.max(W / th.img.width, H / th.img.height), iw = th.img.width * s, ih = th.img.height * s;
      c.drawImage(th.img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(0, 0, W, H);
    }
    var fs = +$("th-fs").value, text = $("th-title").value.trim(), sub = $("th-sub").value.trim();
    c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
    c.font = "bold " + fs + "px Impact, 'Arial Black', Arial, sans-serif";
    var lines = text ? wrapText(c, text, W - 160) : [], lh = fs * 1.15, subSize = Math.round(fs * 0.4);
    var total = lines.length * lh + (sub ? subSize * 1.6 : 0), y = (H - total) / 2 + lh / 2;
    c.fillStyle = $("th-color").value; c.strokeStyle = "rgba(0,0,0,0.85)"; c.lineWidth = Math.max(4, fs / 10);
    lines.forEach(function (l) { c.strokeText(l, W / 2, y); c.fillText(l, W / 2, y); y += lh; });
    if (sub) {
      var sy = y - lh / 2 + subSize * 0.8;
      c.font = "bold " + subSize + "px Arial, sans-serif"; c.lineWidth = Math.max(3, subSize / 8);
      c.strokeText(sub, W / 2, sy); c.fillText(sub, W / 2, sy);
    }
  }
  var thSoon = later(thDraw);
  ["th-title", "th-sub", "th-bg", "th-bg2", "th-color", "th-fs"].forEach(function (id) { $(id).addEventListener("input", thSoon); });
  $("th-img").addEventListener("change", function () {
    loadImage(this.files[0], 1600, function (c) { th.img = c; thDraw(); });
  });
  $("th-clearimg").addEventListener("click", function () { th.img = null; $("th-img").value = ""; thDraw(); });
  $("th-download").addEventListener("click", function () { thDraw(); saveCanvas($("th-canvas"), "thumbnail.png"); });

  /* ---------- 4. Script Writer ---------- */
  var SC_TONE = {
    friendly: "Hey everyone, welcome back to the channel!",
    professional: "Hello and welcome to this video.",
    energetic: "What is up everyone! Get ready, this one is going to be good!"
  };
  var SC_TPL = {
    tutorial: {
      hook: "Want to learn {t}? In this video I will show you exactly how, one step at a time.",
      intro: "Before we start, here is what you will be able to do by the end of this video.",
      point: "Step {n}: {p}. Explain why this step matters and show an example on screen.",
      recap: "That is how you handle {t}. Quick recap: {list}."
    },
    story: {
      hook: "I never expected what happened when I started with {t}.",
      intro: "Let me take you back to the beginning.",
      point: "Moment {n}: {p}. (Describe what happened and how you felt.)",
      recap: "Looking back, {t} taught me a lot. The key moments were: {list}."
    },
    review: {
      hook: "Is {t} really worth your time and money? Let us find out.",
      intro: "I will cover what it is, what I liked, and what I did not.",
      point: "Point {n}: {p}. (Share your honest experience.)",
      recap: "My verdict on {t}: sum up the pros and cons, and say who it is best for. Points covered: {list}."
    }
  };
  $("sc-generate").addEventListener("click", function () {
    if (!need("sc-topic", "Please enter a topic")) return;
    var t = val("sc-topic"), tpl = SC_TPL[$("sc-template").value], tone = $("sc-tone").value;
    var pts = $("sc-points").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    if (!pts.length) pts = ["The basics", "The key details", "Common mistakes to avoid"];
    var body = pts.map(function (p, i) { return tpl.point.replace("{n}", i + 1).replace("{p}", p); }).join("\n\n");
    var cta = val("sc-cta") || "Like, subscribe and share this video.";
    $("sc-out").value = "[HOOK]\n" + fill(tpl.hook, t) + "\n\n[INTRO]\n" + SC_TONE[tone] + " " + tpl.intro +
      "\n\n[MAIN POINTS]\n" + body + "\n\n[RECAP]\n" + fill(tpl.recap, t).replace("{list}", pts.join("; ")) +
      "\n\n[CALL TO ACTION]\n" + cta;
  });

  /* ---------- 5. Viral Idea Studio ---------- */
  var VI_IDEAS = [
    "I tried {n} for 30 days: here is what happened", "5 beginner mistakes in {n} (and how to fix them)",
    "{n}: myths vs facts", "A day in the life of someone who does {n}", "{n} on a tiny budget",
    "What nobody tells you about {n}", "{n} challenge: can I do it in 7 days?", "Beginner vs expert: {n}",
    "The easiest way to start {n} today", "Reacting to common {n} advice", "{n} tips I wish I knew sooner",
    "Before and after: my {n} progress", "Answering your top questions about {n}", "My {n} setup tour",
    "Why most people fail at {n}"
  ];
  var VI_HOOKS = [
    "Most people get {n} completely wrong, and here is why.", "If you are struggling with {n}, watch this before you give up.",
    "In the next few minutes I will show you one change that improves {n}.", "I wasted months on {n} so you do not have to.",
    "Here is the one {n} tip I wish I had on day one.", "Stop scrolling. This could change how you do {n}.",
    "Three things about {n} that surprised me.", "Everyone talks about {n}, but nobody mentions this.",
    "You do not need expensive gear to start {n}.", "This is what happened when I tested {n} for a week."
  ];
  $("vi-generate").addEventListener("click", function () {
    if (!need("vi-niche", "Please enter a niche or topic")) return;
    var n = val("vi-niche"), count = parseInt($("vi-count").value, 10) || 8;
    var f = function (x) { return x.replace(/\{n\}/g, n); };
    $("vi-ideas").value = shuffle(VI_IDEAS).slice(0, count).map(function (x, i) { return (i + 1) + ". " + cap(f(x)); }).join("\n");
    $("vi-hooks").value = shuffle(VI_HOOKS).slice(0, Math.min(count, VI_HOOKS.length)).map(function (x, i) { return (i + 1) + ". " + f(x); }).join("\n");
  });

  /* ---------- 6. Video Prompt Studio ---------- */
  var VP_SHOT = ["Wide establishing shot", "Medium shot", "Close-up shot", "Tracking shot", "Detail shot", "Low-angle dramatic shot",
    "Over-the-shoulder shot", "Aerial pull-back shot", "Slow reveal shot", "Final lingering wide shot"];
  var VP_LIGHT = ["soft golden-hour light", "natural daylight", "moody low-key lighting", "warm backlight", "cool blue ambient light"];
  var VP_MOVE = ["slow push-in", "smooth pan", "gentle handheld movement", "steady tracking move", "slow pull-back"];
  $("vp-generate").addEventListener("click", function () {
    if (!need("vp-subject", "Please enter a subject or story idea")) return;
    var subj = val("vp-subject"), style = $("vp-style").value, mood = $("vp-mood").value, ratio = $("vp-ratio").value;
    var n = Math.min(10, Math.max(1, parseInt($("vp-scenes").value, 10) || 4)), out = [], i;
    $("vp-scenes").value = n;
    out.push("OVERALL: " + subj + ". " + cap(style) + " style, " + mood + " mood, aspect ratio " + ratio + ". Keep the same character look, colors and lighting in every scene.");
    for (i = 0; i < n; i++) {
      out.push("\nSCENE " + (i + 1) + " (about 5 seconds)\n" + pick(VP_SHOT, i) + " of " + subj + ". " + cap(style) + " style, " + mood +
        " mood, " + pick(VP_LIGHT, i) + ", camera: " + pick(VP_MOVE, i) + ". Aspect ratio " + ratio + ".");
    }
    out.push("\nPaste each scene into your AI video tool. This page only writes the prompt text; it does not create video.");
    $("vp-out").value = out.join("\n");
  });

  /* ---------- 7. Photo Editor ---------- */
  var ed = { src: null, rot: 0 };
  function edRender() {
    if (!ed.src) return;
    var rot = ed.rot % 360, sw = ed.src.width, sh = ed.src.height, swap = rot === 90 || rot === 270;
    var rw = swap ? sh : sw, rh = swap ? sw : sh, r = document.createElement("canvas"), rc;
    r.width = rw; r.height = rh; rc = r.getContext("2d");
    rc.translate(rw / 2, rh / 2); rc.rotate(rot * Math.PI / 180); rc.drawImage(ed.src, -sw / 2, -sh / 2);
    var ratio = $("ed-crop").value === "free" ? 0 : parseFloat($("ed-crop").value), cw = rw, ch = rh;
    if (ratio) { if (rw / rh > ratio) { cw = rh * ratio; } else { ch = rw / ratio; } }
    cw = Math.max(1, Math.round(cw)); ch = Math.max(1, Math.round(ch));
    var cx = Math.round((rw - cw) / 2), cy = Math.round((rh - ch) / 2);
    var s = +$("ed-scale").value / 100, ow = Math.max(1, Math.round(cw * s)), oh = Math.max(1, Math.round(ch * s));
    var o = $("ed-canvas"), c = o.getContext("
