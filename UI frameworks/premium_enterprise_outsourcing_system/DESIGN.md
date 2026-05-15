---
name: Premium Enterprise Outsourcing System
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
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
  xl: 32px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is engineered for high-stakes enterprise outsourcing management. It evokes a sense of precision, reliability, and executive-level oversight. The brand personality is "The Invisible Facilitator"—sophisticated enough to stay out of the way, yet powerful enough to manage complex global workstreams.

The aesthetic blends the technical clarity of Linear with the expansive, premium feel of Apple and the mathematical cleanliness of Stripe. It utilizes a high-ratio of white space, razor-sharp typography, and subtle glassmorphism to distinguish between the background work environment and active high-level insights.

## Colors

The color strategy uses a deep **Dark Navy (#0F172A)** as the structural anchor, particularly in sidebars and dark mode backgrounds, providing a premium "pro" feel. The **Primary Blue (#2563EB)** is used sparingly for call-to-actions and focused states to maintain a calm interface.

In Light Mode, the system relies on a very soft **Background (#F8FAFC)** to make white cards pop. Success, Warning, and Danger colors are calibrated for high legibility against both light and dark backgrounds, used primarily for status indicators and KPIs.

## Typography

The system exclusively uses **Inter** to achieve a neutral, systematic, and utilitarian feel. Hierarchy is established through aggressive weight hopping—using Bold (700) for headers to create strong visual anchors, while keeping body text light and readable.

Letter spacing is slightly tightened on larger headings to mimic high-end editorial layouts (the Apple effect), while labels use increased tracking and uppercase styling for immediate categorization.

## Layout & Spacing

This system utilizes a **12-column fluid grid** for the main content area, with a fixed sidebar width of 260px. The spacing philosophy follows a 4px baseline grid, ensuring consistent vertical rhythm.

- **Desktop:** 24px margins and gutters. Content is centered with a max-width of 1440px.
- **Tablet:** Sidebars collapse into icons or a hamburger menu; gutters reduce to 16px.
- **Mobile:** Single column layout with 16px horizontal margins.

Layouts should prioritize "Information Density" without clutter, using generous padding (24px+) inside cards to keep the enterprise data feeling breathable.

## Elevation & Depth

Depth is used to signify "interactivity" and "importance" through three distinct levels:

1.  **Level 0 (Flat):** The main background surface.
2.  **Level 1 (Surface):** Standard cards and containers. These use a 1px subtle border (#E2E8F0) and a very soft shadow (0px 4px 6px -1px rgba(0,0,0,0.05)).
3.  **Level 2 (Glass):** Top-level widgets and floating navigation. These use a Backdrop Filter (Blur 12px) and 80% opacity backgrounds to create a sense of layering.

In Dark Mode, elevation is communicated through slightly lighter surface colors rather than heavy shadows, following the "Linear" aesthetic.

## Shapes

The design system uses a signature **16px radius** for all cards and primary containers, creating a modern, approachable, and premium hardware-like feel. 

Interactive elements like buttons and input fields use a tighter **8px radius** to maintain a sense of precision and professional utility. Status badges and tags are fully pill-shaped (9999px) to contrast against the structured grid.

## Components

### Buttons
- **Primary:** Solid Blue (#2563EB) with white text. Subtle 1px inner light border for a tactile feel.
- **Secondary:** White background with #E2E8F0 border.
- **Success/Danger:** Solid fills using the system palette.
- **Interaction:** On hover, buttons should darken by 5% and lift slightly (y-1px).

### Tables & Data
- **Modern Tables:** Sticky headers with a frosted glass effect. Row hover states use #F1F5F9.
- **Status Badges:** Subtle background tints (10% opacity of the status color) with high-contrast bold text.

### KPI Cards
- **Gradients:** Use subtle linear gradients (e.g., Primary Blue to a slightly darker shade) at a 135-degree angle.
- **Glass Widgets:** Use for "At a Glance" metrics sitting atop the dashboard background.

### Inputs & Search
- **Search Bars:** "Command-K" style inputs with a subtle inset shadow and search icon prefix.
- **Focus State:** 2px ring in Primary Blue with 20% opacity.

### Navigation
- **Sidebar:** Dark Navy background with "Active" states indicated by a left-hand blue border and high-brightness text.