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
