---
# gstack: design-md-format=spec
name: EventRail
description: A live-event control room with the pulse of a city: dependable operations, energetic discovery.
colors:
  primary: "#176B5B"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  text: "#172A26"
  text-muted: "#62716D"
  accent: "#E8B34B"
  success: "#247A52"
  warning: "#A96512"
  error: "#B83D36"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable"
    fontWeight: 700
    fontSize: "clamp(2.25rem, 5vw, 4rem)"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree Variable"
    fontSize: 1rem
    lineHeight: 1.5
  label:
    fontFamily: "Figtree Variable"
    fontSize: 0.75rem
    letterSpacing: "0.04em"
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-hover:
    backgroundColor: "#125548"
  input:
    borderColor: "#DCE4DF"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  nav-link:
    textColor: "{colors.text}"
---

# EventRail

## Overview

**Creative North Star:** A live-event control room with the pulse of a city. The public site makes discovery feel vivid; operational pages make the work feel clear and dependable.
**Product context:** EventRail brings together event discovery and ticketing with organizer, vendor, and venue operations across web and local channels. The current site is the public attendee, organizer, vendor, and venue website.
**Mode per surface:** Attendee discovery — Experience. Organizer/vendor/venue pages — Persuade. Directories, checkout, help, and legal pages — Operate or Read.
**Reference sites:** [Tix Africa](https://tix.africa/), [TIKET](https://www.tiket.co.ke/), [Luma](https://lu.ma/).
**Key characteristics:**
- Clear, capable, and connected to the energy of real events.
- Event photography and real event details provide the expressive moments.
- Operational information uses direct labels, aligned numbers, and visible status.
- Navigation stays calm and consistent across attendee, organizer, vendor, and venue surfaces.

## Colors

**Strategy:** Full palette — a committed rail green anchors the brand; marigold marks the moments that need attention, with distinct semantic status colors for operational clarity.
**Light or dark:** Light is the default for public discovery and long operational sessions. Dark mode uses deep green-black surfaces with lifted panels and readable muted text.

Use green for primary actions, active links, and brand anchors. Reserve marigold for event date markers and time-sensitive emphasis; do not use it as a general success color. Always pair status colors with labels or icons. Build borders and muted surfaces from the green-gray neutral family. Never rely on color alone to convey ticket, payment, or gate status.

## Typography

Bricolage Grotesque Variable carries display headings and a restrained brand voice. Figtree Variable handles body copy, controls, and data because it remains readable at compact sizes. Use tabular numerals for prices, counts, and times. The same family may serve data labels; do not add monospace styling unless a real identifier or code needs it. Both families are self-hosted from the project's existing Fontsource dependencies.

## Layout

Marketing and discovery pages use a hybrid layout: event-led, asymmetric compositions for broad storytelling, with disciplined alignment for navigation, search, cards, and details. Keep page content within a consistent centered column and let the home hero break full bleed. On operational surfaces, show one primary work area at a time, with clear page actions and secondary details beside or below it rather than nesting panels. At phone widths, prioritize the active task, readable touch targets, and short labels; move secondary navigation and details out of the primary flow.

Use a 12-column desktop grid, a 6-column tablet grid, and a 4-column phone grid. Base spacing on 4px increments. Keep cards mostly flat with a border; use shadows only to signal actual elevation such as menus or overlays. Radius hierarchy: 4px for compact controls, 8px for standard controls, and 12px for larger content surfaces.

## Elevation & Depth

Use surface contrast and thin green-gray borders as the default separation. Use a small, soft shadow for floating controls and menus. Avoid decorative glows and stacks of nested cards.

## Shapes

Use restrained 4px, 8px, and 12px radii for controls, cards, and large surfaces. Reserve full pills for filter chips and compact status labels. Ticket stubs and event artifacts can use cut or perforated edges when they clarify the ticket metaphor.

## Components

Primary buttons use rail green with white text; secondary actions use a quiet outline or text treatment. Provide visible focus rings, hover and pressed states, and clear disabled states. Navigation distinguishes the current surface with a soft green tint and text weight. Cards should not add decorative icon tiles or colored edge bars. Keep input labels visible above fields and preserve errors in text as well as color.

## Do's and Don'ts

- Do use real event names, dates, venues, and local payment language in examples.
- Do make numbers and statuses easy to scan in tables and lists.
- Do give each page one obvious next action.
- Do use event imagery as the expressive layer and keep controls quiet.
- Don't use purple gradients, generic blue enterprise palettes, or ornamental map motifs.
- Don't use three equal feature cards as the default way to explain every product surface.
- Don't use marigold for small white-on-yellow text or as the only status signal.
- Don't make every content group a rounded, shadowed card.

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter(ease-out), exit(ease-out), move(ease-in-out).
- **Duration:** micro(50-100ms), short(150-250ms), medium(250-400ms), long(400-700ms).
- **The one authored moment:** A featured event transition can crossfade when the carousel changes; pause on hover or focus and respect reduced motion.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-05 | Initial EventRail design system created | Balances operational trust with event discovery energy and local market needs. |
