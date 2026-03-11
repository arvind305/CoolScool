# CoolScool Brand Implementation Guide

## Overview
CoolScool uses an elephant logo — a front-facing elephant head inside a purple rounded-rectangle box. The elephant's face and body strokes are white, the ears and trunk are orange. The elephant symbolises wisdom, patience, memory, and the removal of obstacles (Ganesha) — core to the app's adaptive, pressure-free learning philosophy.

---

## Files in this folder

| File | Purpose | Where to use |
|---|---|---|
| `mark.svg` | Primary elephant mark (square, purple box) | App icon, navbar icon, anywhere the standalone mark appears |
| `favicon.svg` | Favicon-optimised mark (bolder strokes, elephant shifted up for small rendering) | `<link rel="icon">`, browser tab, bookmark icon |
| `lockup-light.svg` | Full lockup (mark + wordmark) for light/cream/white backgrounds | Site header on light pages, marketing materials on light |
| `lockup-dark.svg` | Full lockup (mark + wordmark) for dark backgrounds | Site header on dark navbar, dark mode, footer |
| `og-image.svg` | Social sharing card (1200×630) | `<meta property="og:image">`, Twitter card, LinkedIn, WhatsApp link preview |

---

## Colour Palette

| Name | Hex | Usage |
|---|---|---|
| Purple 700 | `#6D28D9` | Gradient start, eye pupils |
| Purple 600 | `#7C3AED` | Gradient end, primary brand colour |
| Purple 950 | `#4C1D95` | Eye pupils inside the mark |
| Orange 500 | `#F97316` | The "S" in wordmark (light backgrounds) |
| Orange 400 | `#FB923C` | Ears, trunk in mark; "S" in wordmark (dark backgrounds) |
| Stone 900 | `#1C1917` | Text on light backgrounds, dark navbar background |
| Stone 50 | `#FAFAF9` | Text on dark backgrounds |
| Cream | `#FAF9F6` | Site page background |

---

## Wordmark Rules

- **Always**: `CoolScool` — one word, no space, no hyphen
- **The "S"** is always orange and font-weight 800 (extra-bold)
- **The rest** is font-weight 700 (bold)
- **Font**: `Plus Jakarta Sans` (Google Fonts)
- **Letter spacing**: `-0.3px` (slightly tight)
- **On light backgrounds**: text is `#1C1917`, S is `#F97316`
- **On dark backgrounds**: text is `#FAFAF9`, S is `#FB923C`

### CSS example
```css
.brand-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.brand-name .s {
  color: #F97316; /* use #FB923C on dark backgrounds */
  font-weight: 800;
}
```

### HTML example
```html
<span class="brand-name">Cool<span class="s">S</span>cool</span>
```

---

## Mark Anatomy

The elephant mark consists of these layers (back to front):

1. **Purple rounded-rect** — `rx="22"` corner radius, gradient from `#6D28D9` to `#7C3AED`
2. **Head** — white stroke, `rgba(255,255,255,0.15)` fill
3. **Ears (left + right)** — `#FB923C` stroke, `rgba(251,146,60,0.2)` fill
4. **Trunk** — `#FB923C` stroke, curling left, no fill
5. **Eyes** — white circles (`opacity 0.92`) with `#4C1D95` pupils

### Non-negotiable elements at ANY size:
- Both eyes with visible pupils
- Both orange ears
- Orange curled trunk
- Purple rounded-rect container

---

## Size-specific notes

| Context | File to use | Notes |
|---|---|---|
| App Store icon (512px, 1024px) | `mark.svg` | SVG scales perfectly, no changes needed |
| Home screen (80px) | `mark.svg` | Same file, browser/OS scales it |
| Navbar (32-40px) | `mark.svg` | Used as `<img>` or inline SVG |
| Browser tab (32px) | `favicon.svg` | Has bolder strokes optimised for 16-32px |
| Favicon (16-20px) | `favicon.svg` | Elephant shifted up, max contrast |
| Social / OG image | `og-image.svg` | Convert to PNG at 1200×630 for `og:image` |

### Generating favicon.ico from SVG
```bash
# Using ImageMagick (if available)
convert -background none favicon.svg -resize 32x32 favicon-32.png
convert -background none favicon.svg -resize 16x16 favicon-16.png
convert favicon-16.png favicon-32.png favicon.ico

# Or use realfavicongenerator.net with the SVG
```

---

## Implementation in Next.js / React

### Favicon setup (app/layout.tsx or pages/_document.tsx)
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" /> <!-- 180x180 PNG from mark.svg -->
```

### OG image meta tag
```html
<meta property="og:image" content="https://coolscool.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

### Navbar component example
```jsx
<nav className="flex items-center justify-between px-6 py-3 bg-stone-900">
  <div className="flex items-center gap-3">
    <img src="/mark.svg" alt="CoolScool" className="w-9 h-9 rounded-lg" />
    <span className="text-lg font-bold text-stone-50 tracking-tight">
      Cool<span className="text-orange-400 font-extrabold">S</span>cool
    </span>
  </div>
  {/* ... nav items */}
</nav>
```

### Tailwind colour config (if extending)
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          'purple-dark': '#6D28D9',
          orange: '#F97316',
          'orange-light': '#FB923C',
          cream: '#FAF9F6',
        }
      }
    }
  }
}
```

---

## Do's and Don'ts

### Do
- Always use the elephant inside the purple rounded-rect box
- Always show eyes with pupils at every size
- Always show the orange trunk at every size
- Use `favicon.svg` for sizes below 40px (it's optimised)
- Use `mark.svg` for everything 40px and above

### Don't
- Never show the elephant floating without the purple box
- Never remove the trunk at small sizes
- Never make the eyes just dots without the white circle
- Never put a space in "CoolScool"
- Never change the S colour to anything other than orange
- Never use the mark on a purple background without switching to the white-stroke-only version
