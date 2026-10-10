# Frontend UI rules

Each rule below was decided once and is cheap to violate by accident. Follow these rules on every new screen and when changing existing UI.

## Absent is not zero, all the way down

- A blank input becomes `null` in the DTO, remains unset on the wire, and is checked for presence in the service.
- Every quantity in a request body uses a boxed type, never a primitive. Do not coerce an absent quantity to zero.
- Forms with uncapped benefits say **“Blank means no cap.”**

## Dates

- Never use `<input type="date">`. Use the shared `AppDatePicker` (`app-date-picker`) for date entry.
- Store, compare, send, and receive dates as ISO-8601 calendar date strings (`YYYY-MM-DD`), without a timezone.
- Build ISO strings from year, month, and day integers. Never use `Date.toISOString()` to convert a calendar date.
- `formatDate` reads the year, month, and day directly from the ISO string; it never constructs a `Date`. Display dates as `13th Jul 26` everywhere.
- Use `formatPeriod` for date ranges. An open end displays as `1st Jun 26 onwards`.
- Never display raw ISO dates or locale dependent numeric date formats.

## Tables

- Do not zebra stripe rows. Separate rows with one hairline. A row tint must communicate a specific state, such as selection or a child row.
- Use vertical dividers through the header and every body row. Keep cell padding generous so the grid stays readable.
- Keep one body row height across tables, regardless of column count.
- Identity cells use a tinted monogram with a secondary value under the primary value. Do not spend a column on an ID.
- Badges communicate semantic status: success, warning, info, or neutral. Do not make every badge neutral.
- Every table uses `app-pagination` and reports the visible range, such as **“Showing 1 to 10 of 47.”**
- Pagination is client side while the gateway ignores page and size. Moving it server side changes both the resource URL and the component inputs.

## Row actions

- Show a row action only when it performs a real operation. If its endpoint does not exist, do not show the action.
- Use `app-icon-action` for row actions: an icon, a tooltip, and an optional short visible label. Toolbar actions above a table retain their words.
- The action label is required, even when visually hidden. It supplies both the tooltip and the accessible name.
- Choose icons that match the operation. Revising takes a branch icon, never a pencil: a pencil implies editing the existing record (U1).
- Reuse the established icon vocabulary rather than inventing a second icon for the same operation.

## Money

- Always show the ISO currency code, never a currency symbol (for example, `USD 1,234.56` or `LRD 1,234.56`).
- Format amounts from minor-unit digit strings by slicing the string, never by dividing a number.
- Read the decimal scale from the currency; do not assume every currency has two decimal places.

## Overlays

- Dialogs close through an explicit close control or Escape. Clicking the backdrop never closes a dialog.
- A popover inside a scrolling container uses fixed positioning with coordinates computed from its trigger. It flips when there is not enough room below and tracks its trigger during scrolling with a capture-phase scroll listener (`capture: true`).
- Do not rely on z-index to escape an overflow clip. Use a portal and the fixed positioning behavior above.

## Shared UI and styles

- Shared UI is a synced unit. Never edit a synced copy in place. In this repository, treat `src/components/ui` and `src/styles/globals.css` as the canonical shared sources; if synced copies appear under `src/app/shared/ui` or as `styles.css`, update the canonical source and keep the copies in sync through the established workflow.
- Use only Tailwind tokens declared in `src/styles/globals.css` and component classes that are defined in the shared UI. An unresolved `var(--name)` and an undefined class silently render without styling.
- The project currently has no `check:tokens` script and no `.ica-*` classes. Do not use those names until they are added to the canonical shared styles. Use the equivalent existing component and Tailwind token classes in the meantime; add any needed class or token definition before referencing it.

## Cards and output surfaces

- Put tables, calculator results, balances, and panels of computed figures on a card or table card, never directly on the page.
- Give each card a header and padded body. Use the shared `CardHeader` and `CardContent` components. A card without those content wrappers does not provide horizontal content padding, so direct text can touch the border.
- A table card contains its `AppPagination` as part of the same card.
- Prefer a card header followed by a flush table. Avoid nesting a card inside another card; a nested table keeps its border and loses its shadow automatically.
- Keep the grey page background and card shadow. They were chosen on 2026-09-16 because white on near-white surfaces was hard to read; restoring a flatter white-on-white look is not a correction.

## Table details

- Style every table header and cell explicitly. Bare `th` and `td` elements do not receive the required padding, header treatment, or dividers.
- Put wide tables in a container with `overflow-x: auto` so mobile users can scroll columns without clipping row actions.
- Right-align money and counts in both the header and cell. Use `text-right`; add `.ica-td-numeric` only after that class is defined in the canonical stylesheet. Dates stay left-aligned.

## Tabs, filters, and selection

- Use three colors for distinct meanings: violet means selected (active top tab, selected filter, selected table row); green means computed result (U11); brand color means the screen's primary action (such as Add New Product, Add Rate Band, or Add Service). Primary actions use `.ica-button-primary` and `.ica-button-tool-filled` once those classes are defined. Do not swap these meanings.
- Use the brand color on a light grey pill for the current sidebar destination. Keyboard focus is neutral and must not look like selection.
- For a choice among a few filters or views, use the shared segmented control (`.ica-segmented` with `.ica-segmented-option`) once those classes exist. The container has `role="group"` and an `aria-label` describing the filter group. Each option's `aria-pressed` reflects its selected state, and the visual selected state comes from that attribute. Never hand-roll selection with inline background bindings.
- When a design calls for a pill style segmented control (such as product setup section tabs or a dashboard period toggle), use `.ica-segmented-pill` once defined. The selected option is a white pill on a grey track, distinguished by shadow and font weight rather than violet.
- Mark a table row with open detail using `[class.ica-row-selected]`: a violet tint and a violet edge on the first cell, not a grey hover color.
- The active top tab sets `aria-current="page"`. Keep the visual active state and the accessible state in sync.
