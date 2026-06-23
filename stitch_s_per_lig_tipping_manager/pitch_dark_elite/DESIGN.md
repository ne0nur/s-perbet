---
name: Pitch Dark Elite
colors:
  surface: '#0e131f'
  surface-dim: '#0e131f'
  surface-bright: '#343946'
  surface-container-lowest: '#080e1a'
  surface-container-low: '#161c28'
  surface-container: '#1a202c'
  surface-container-high: '#242a36'
  surface-container-highest: '#2f3542'
  on-surface: '#dde2f3'
  on-surface-variant: '#d3c5ac'
  inverse-surface: '#dde2f3'
  inverse-on-surface: '#2b303d'
  outline: '#9c8f79'
  outline-variant: '#4f4633'
  surface-tint: '#f9bd22'
  primary: '#ffe1a7'
  on-primary: '#402d00'
  primary-container: '#fbbf24'
  on-primary-container: '#6c4f00'
  inverse-primary: '#795900'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#d7e5ff'
  on-tertiary: '#233144'
  tertiary-container: '#bbc9e2'
  on-tertiary-container: '#465469'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9f'
  primary-fixed-dim: '#f9bd22'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#0e131f'
  on-background: '#dde2f3'
  surface-variant: '#2f3542'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  score-display:
    fontFamily: JetBrains Mono
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.02em
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is engineered to evoke the high-stakes atmosphere of a floodlit stadium at night. It targets a premium demographic of football enthusiasts who value precision, data, and the ritual of match-day tipping. 

The aesthetic is a fusion of **Glassmorphism** and **High-Contrast Bold**. Deep, obsidian surfaces provide a canvas for glowing amber accents, mimicking the brilliance of championship trophies under stadium lights. The UI must feel athletic and high-performance—fast-loading, responsive, and data-dense without being cluttered. Visual hierarchy is established through "light-leaks" and translucent layering, creating a sense of physical depth as if the interface is projected onto glass.

## Colors
The palette is anchored by an extremely dark slate (#030712) to ensure maximum contrast for the gold/amber accents. 

- **Primary:** Gold/Amber is reserved for high-value actions: placing a tip, claiming rewards, and viewing league standings. It should feel radiant, often paired with a subtle glow (outer glow or drop shadow) to simulate light.
- **Surfaces:** All container elements utilize a 20% opacity version of the secondary color (#1e293b) to create the glass effect.
- **Status:** Tipping results are color-coded strictly: Emerald-500 for a win (Success), Slate-400 for a draw, and Rose-500 for a loss.
- **Accents:** Use a 5% white border on all glass cards to define edges against the deep background.

## Typography
The system employs a dual-font strategy. **Geist** handles the primary UI narrative, providing a clean, modern, and highly legible experience for news, team names, and navigation. 

**JetBrains Mono** is the "engine" font. It is used exclusively for scores, timers, point values, and betting odds. The monospaced nature ensures that numbers don't jump horizontally during live score updates, maintaining visual stability in data-heavy views. Use uppercase for labels to reinforce the "industrial/precise" feel of a sports broadcast.

## Layout & Spacing
The layout follows a **fluid grid** model optimized for mobile-first usage. A 4px baseline grid ensures tight, mathematical consistency.

- **Mobile:** Uses a single-column layout with 16px side margins. Bottom navigation is persistent, featuring high-blur glass backgrounds.
- **Desktop:** Scales to a 12-column grid. Match cards typically span 4 columns, while the "Live Leaderboard" occupies a 4-column sidebar.
- **Rhythm:** Spacing between related items (like home/away teams in a fixture) should be `sm` (8px), while spacing between separate match cards should be `lg` (24px) to allow the glass-border highlights enough room to breathe.

## Elevation & Depth
This design system rejects traditional drop shadows in favor of **Tonal Layering** and **Backdrop Blurs**.

1. **Level 0 (Pitch):** The base background (#030712).
2. **Level 1 (Turf):** Match cards and lists using 20% opacity glass with a 12px backdrop blur.
3. **Level 2 (Stadium Screen):** Modals and Pop-overs, using 40% opacity glass with a 20px backdrop blur and a 1px inner border of #ffffff10.
4. **Level 3 (Spotlight):** Primary buttons and active state indicators, using a solid gold fill with a 15px outer glow (drop-shadow: 0 0 15px #fbbf2440).

## Shapes
The shape language is "Rounded" to balance the aggressive high-contrast colors with a premium, tactile feel. 

- **Cards:** Use `rounded-lg` (1rem) for match fixtures and player profiles.
- **Interactive Elements:** Buttons and input fields use `rounded-md` (0.5rem). 
- **Badges:** Use "Pill-shaped" (rounded-full) for status indicators like "LIVE" or "HT" (Half-time) to differentiate them from functional buttons.

## Components
- **Primary Buttons:** Solid #fbbf24 background with black (#030712) text using Geist Bold. No border. High-impact.
- **Glass Match Cards:** Background #1e293b at 20% opacity, 1px border at 5% white. Content inside uses JetBrains Mono for the scoreline (centered, large) and Geist for team names.
- **Bottom Navigation:** 60% opacity #030712 background with 20px backdrop-blur. Active icon state is Gold (#fbbf24) with a tiny 4px gold dot below.
- **Input Fields:** Darker surface than cards (#000000 at 30% opacity), 1px border #334155. Focus state changes border to #fbbf24.
- **Tipping Chips:** Small, interactive score adjusters (+/-). Use monospaced fonts and a subtle glass texture to differentiate from the main card.
- **Leaderboard Rows:** Alternating background transparency (0% vs 5%) to guide the eye without adding visual weight.