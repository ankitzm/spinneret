// Build the demo store into store/public/. Two variants:
//   a = clean semantic markup (scraper's golden target)
//   b = "redesigned" — same content, mutated structure that kills selectors
//       (renamed classes, h1->h2, extra wrappers, reordered nodes)
// This is the breakage the self-heal loop recovers from, à la Bright Data's
// own Alto & Oak anti-scraper demo.
//
//   node store/build.mjs a   # (default) clean site
//   node store/build.mjs b   # broken site

import { writeFile, mkdir, rm, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "public");
const variant = process.argv[2] === "b" ? "b" : "a";

const PRODUCTS = [
  { slug: "aurora-headphones", name: "Aurora Wireless Headphones", price: "129", rating: "4.6",
    desc: "Over-ear wireless headphones with active noise cancellation and 40-hour battery." },
  { slug: "pulse-smartwatch", name: "Pulse Smartwatch", price: "199", rating: "4.4",
    desc: "Fitness smartwatch with GPS, heart-rate tracking, and a 7-day battery." },
  { slug: "mute-earbuds", name: "Mute Pro Earbuds", price: "89", rating: "4.7",
    desc: "Compact ANC earbuds with wireless charging and low-latency mode." },
  { slug: "hub-usb-c-dock", name: "Hub 9 USB-C Dock", price: "149", rating: "4.5",
    desc: "9-in-1 USB-C dock with dual 4K HDMI, gigabit ethernet, and 100W passthrough." },
];

// variant A: clean, stable, semantic selectors
const pageA = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${p.name} — Alto</title><link rel="stylesheet" href="/style.css"/></head>
<body>
<header class="site-header"><a href="/" class="logo">Alto</a></header>
<main class="product">
  <img class="product-image" src="/img/box.svg" alt="${p.name}"/>
  <div class="product-info">
    <h1 class="product-name">${p.name}</h1>
    <div class="product-price">$${p.price}</div>
    <div class="product-rating">${p.rating}</div>
    <p class="product-description">${p.desc}</p>
    <button class="buy">Add to cart</button>
  </div>
</main></body></html>`;

// variant B: same content, hostile structure. Prices identical (world didn't
// change) but every selector A relied on is gone — a pure BROKEN, not CHANGED.
const pageB = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${p.name} — Alto</title><link rel="stylesheet" href="/style.css"/></head>
<body>
<header class="site-header"><a href="/" class="logo">Alto</a></header>
<main class="c-9f21">
  <section class="c-a03">
    <img class="c-7b2 media" src="/img/box.svg" alt="${p.name}"/>
    <article class="c-x4">
      <h2 class="c-title-e8">${p.name}</h2>
      <div class="c-meta">
        <span class="c-x9k2" data-role="amt">$${p.price}</span>
        <span class="c-stars-2" data-role="score">${p.rating}</span>
      </div>
      <p class="c-copy-1">${p.desc}</p>
      <button class="c-cta">Add to cart</button>
    </article>
  </section>
</main></body></html>`;

const STYLE = `:root{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1c1a}
body{margin:0;background:#fbfaf5}
.site-header{padding:20px 32px;border-bottom:1px solid #e0e0dc}
.logo{font-weight:700;text-decoration:none;color:#1c1c1a;font-size:20px;letter-spacing:-.02em}
main{max-width:820px;margin:48px auto;padding:0 32px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
img{width:100%;border:1px solid #e0e0dc;border-radius:12px;background:#fff}
h1,h2{font-size:28px;margin:0 0 12px;letter-spacing:-.02em}
.product-price,.c-x9k2{font-size:24px;font-weight:600;color:#165e83}
.product-rating,.c-stars-2{color:#9a6425;margin:8px 0}
.c-meta{display:flex;flex-direction:column;gap:8px}
p{color:#727171;line-height:1.6}
button{margin-top:16px;padding:12px 20px;border:none;border-radius:8px;background:#1c1c1a;color:#fff;font-size:15px;cursor:pointer}`;

const INDEX = (v) => `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Alto — demo store</title><link rel="stylesheet" href="/style.css"/></head>
<body><header class="site-header"><a href="/" class="logo">Alto</a></header>
<main style="grid-template-columns:1fr"><div><h1>Alto</h1>
<p>A tiny demo store for Spinneret. Layout variant: <b>${v.toUpperCase()}</b>.</p>
<ul>${PRODUCTS.map(p=>`<li><a href="/product/${p.slug}">${p.name} — $${p.price}</a></li>`).join("")}</ul>
</div></main></body></html>`;

const BOX = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f2f1ec"/><rect x="130" y="90" width="140" height="120" rx="8" fill="#d8d6cf"/><rect x="130" y="90" width="140" height="40" rx="8" fill="#c4c2ba"/></svg>`;

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "product"), { recursive: true });
  await mkdir(join(OUT, "img"), { recursive: true });
  const page = variant === "b" ? pageB : pageA;
  for (const p of PRODUCTS) {
    await writeFile(join(OUT, "product", `${p.slug}.html`), page(p));
  }
  await writeFile(join(OUT, "index.html"), INDEX(variant));
  await writeFile(join(OUT, "style.css"), STYLE);
  await writeFile(join(OUT, "img", "box.svg"), BOX);
  process.stderr.write(`store built: variant ${variant} → ${OUT}\n`);
}
main();
