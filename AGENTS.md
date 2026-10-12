# Agent instructions

- Follow the project UI conventions in [Frontend UI rules](docs/frontend-ui-rules.md) whenever you build or change frontend UI.
- On index/list pages, use one page title and one supporting sentence; place search and filters outside and immediately before the results card; keep only the table and pagination inside the card. For filters with fewer than five choices, use `FilterTabs` with **All** selected by default when valid; the selected tab uses primary text on white. See [Frontend UI rules](docs/frontend-ui-rules.md).
- Keep API calls out of UI scaffolding until the relevant endpoint is intentionally wired.
- Handle empty and null API data explicitly in every UI: show clear loading, error, empty, and no-filter-results states; normalize nullable collections to empty lists and render safe fallbacks for nullable fields so screens never crash or show `null`/`undefined`.
