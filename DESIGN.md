# Design System Guidelines: Architectural Trust

## 1. Overview & Creative North Star
This design system is built to transform the traditional, often sterile insurance landscape into a high-end editorial experience. We are moving away from "generic corporate" and toward a philosophy we call **"The Architectural Guardian."**

The North Star of this system is the tension between structural solidity (the deep forest green) and fluid movement (the turquoise and sky blue waves). We achieve a premium feel not through decoration, but through **intentional asymmetry, massive white space, and tonal depth.** Instead of rigid grids, we use overlapping elements and a dramatic typography scale to guide the user’s eye, creating a digital space that feels curated, professional, and bespoke.

---

## 2. Colors: Tonal Atmosphere
The color palette is extracted directly from the AD SEGUROS mark, utilizing a sophisticated Material Design logic to ensure accessibility while maintaining a signature aesthetic.

*   **Primary (#002d27):** Use this Deep Forest Green to anchor the experience. It represents the "Guardian"—stable, deep, and authoritative.
*   **Secondary (#006a61):** The Vibrant Turquoise is our bridge to the user. Use this for interaction points and to draw attention to growth-oriented content.
*   **Tertiary (#002a40):** This deep Sky Blue variant provides a secondary layer of trust, perfect for information-heavy sections or alternative call-to-actions.

### The "No-Line" Rule
To maintain a high-end editorial look, **1px solid borders are strictly prohibited for sectioning content.** Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit directly against a `surface` background. The change in tone is the divider.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper.
*   **Background (`#f4fbf9`):** The base canvas.
*   **Surface Tiers:** Use `surface-container-lowest` for floating cards and `surface-container-highest` for prominent sidebars or headers.
*   **The Glass & Gradient Rule:** For main Hero sections or primary CTAs, do not use flat colors. Apply subtle linear gradients transitioning from `primary` to `primary_container` (0deg). This adds "visual soul" and depth that feels custom-engineered.

---

## 3. Typography: Editorial Authority
We use a high-contrast font pairing to balance modern approachability with institutional weight.

*   **The Display Voice (Manrope):** All headlines and display text use Manrope. Its geometric yet warm character feels "Architectural." Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for hero statements to create a "magazine" feel.
*   **The Functional Voice (Inter):** All body, labels, and titles use Inter. Inter’s tall x-height ensures maximum readability for complex insurance policy details.
*   **Hierarchy as Identity:** Use extreme scale differences. A `display-lg` headline should often be followed by a significantly smaller `body-lg` sub-text. This gap in scale creates a luxury, minimalist aesthetic.

---

## 4. Elevation & Depth
In this design system, depth is a functional tool, not a stylistic flourish. We move away from traditional "box-shadows" in favor of **Tonal Layering.**

*   **The Layering Principle:** Achieve lift by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift without the clutter of shadows.
*   **Ambient Shadows:** If a floating element (like a mobile navigation bar) requires a shadow, it must be "Ambient." Use a 24px blur with only 4% opacity, using the `on-surface` color tinted with a hint of `primary` to mimic natural light.
*   **The Ghost Border Fallback:** If a container requires a definition for accessibility, use a "Ghost Border": the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** For floating overlays or tooltips, use `surface_variant` at 80% opacity with a `backdrop-filter: blur(12px)`. This integrates the component into the layout rather than making it feel "pasted on."

---

## 5. Components

### Buttons
*   **Primary:** High-pill shape (`rounded-full`). Use a subtle gradient from `primary` to `primary_container`. Text should be `on-primary`.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **States:** On hover, primary buttons should scale slightly (1.02x) rather than just changing color.

### Cards
*   **Structure:** No dividers, no borders. 
*   **Spacing:** Use generous internal padding (at least 32px) to let the typography breathe. 
*   **Separation:** Use `surface-container-low` for the card body against a `surface` background.

### Input Fields
*   **Style:** Minimalist "Underline" style or a subtle `surface-container-highest` fill. 
*   **Focus:** Transition the "Ghost Border" from 15% opacity to 100% `secondary` turquoise on focus.

### Additional Signature Component: The "Policy Glass" Chip
For insurance products (Life, Auto, Home), use large, semi-transparent turquoise chips (`secondary_container` at 40% opacity) with `backdrop-blur`. This creates a sophisticated, "tech-forward" way to categorize services.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace White Space:** If you think there is enough space, double it. High-end design thrives on "wasteful" margins.
*   **Use Asymmetric Layouts:** Offset images from text containers to break the "template" feel.
*   **Maintain Tonal Consistency:** Ensure that the `on-surface` text color is always used for readability against the light background.

### Don't:
*   **Don't use 1px dividers:** Use vertical white space or a subtle background color shift (`surface-container`) to separate list items.
*   **Don't use pure black:** Use `primary` or `on-surface` for dark text. Pure black (#000) is too harsh for this organic, forest-inspired palette.
*   **Don't crowd the logo:** The AD SEGUROS mark is architectural. Give it a large "clear zone" to maintain its prestige.