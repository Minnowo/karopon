---
name: ponkotsu-css
description: How to write UI markup with ponkotsu-css, a simplified Material Design 3 style for Tailwind v4. Use whenever writing or restyling frontend markup - picking a heading level, labeling a form field, spacing things, choosing a container or button, or picking a color.
---

# Writing UI with ponkotsu

ponkotsu is a base style on top of Tailwind v4. Plain HTML elements are
already styled. The rule of the system is:

**Pick the element by meaning, then add classes only for layout (flex,
grid, gap, width) or to choose a variant (`surface-N`, `btn-*`).**

Do not restyle the typography of an element with utilities. If `<h2>` looks
wrong somewhere, the fix is a different element or a change to the base
style, not `class="text-lg font-bold"`.

## Type

| Element | Use | Looks like |
|---|---|---|
| `<h1>` | Page title, one per page | 28px, weight 425 |
| `<h2>` | A panel or section title | 22px, weight 425 |
| `<h3>` | A group inside a panel | 18px, weight 500 |
| `<h4>` | A card or row title | 16px, weight 500 |
| `<p>` / plain text | Everything else | 16px, weight 400 |
| `<label>` | The caption of a field | 14px, muted |
| `<small>` | Subtitles, hints, metadata, counts | 14px, muted |
| `<strong>` | Inline emphasis | weight 500 |
| `<code>` | Inline code, tag names, class names | monospace on a tinted chip |

Do not write:

- `font-semibold` / `font-bold` / `font-medium`. Use a heading or `<strong>`.
- `<span class="font-semibold">Note</span>` above an input. Use `<label>`.
- `text-sm text-c-on-surface-variant`. Use `<small>`.
- A text size on a heading. Pick a different heading level.

The one allowed size utility is for display numbers (a stat tile's big
value): `<p class="text-2xl">1,570</p>`. It stays weight 400.

## Spacing

Spacing comes from `gap` on the parent. Children do not carry margins, and
`<br />` is never a spacer. Headings, paragraphs and `<hr>` have no margin.

| Class | Size | Use |
|---|---|---|
| `gap-1` | 4px | Inside one control: a caption and its input, an icon and its text |
| `gap-2` | 8px | Between related fields, rows or buttons |
| `gap-4` | 16px | Between sections or panels |
| `p-3` | 12px | Container padding (already built into `surface-N`) |
| `px-4` | 16px | Page margin |

Stay on these values. Stacking is `flex flex-col gap-*`; a row is
`flex items-center gap-2` (add `flex-wrap` if it can overflow on a phone).

## Forms

A field is a `<label>` that wraps its caption and its input:

```html
<label class="flex flex-col gap-1">
    Note
    <textarea rows="2" placeholder="Optional"></textarea>
</label>
```

- The caption text doesn't react to the mouse (clicking or hovering it does
  nothing); only the input does. Checkbox and radio labels stay clickable.
- Inputs, selects, textareas and buttons need no classes. A field inside a
  `<label>` fills the label's width. A field not in a label is about 20
  characters wide and won't shrink past that, so in a row give it `flex-1`
  or a width (`w-20`, `w-full`).
- A checkbox or radio label reads as body text automatically:
  ```html
  <label class="flex items-center gap-2">
      <input type="checkbox" /> Beeps
  </label>
  ```
- A caption over a group of checkboxes is a bare `<label>` above them, in a
  `flex flex-col gap-1` wrapper.
- An input with no visible caption gets `aria-label` and a `placeholder`.
- Captions are short nouns ("Note", "Add exercise"). Put "(optional)" in
  the placeholder, not the caption.

## Containers

The page background is `surface`. A box on it is `surface-1`. A box inside
that is `surface-2`, and so on up to `surface-6`. Depth comes from the fill
tone only; there are no borders and no shadows.

```html
<div class="surface-1 flex flex-col gap-2">
    <h2>New workout</h2>
    <div class="surface-2 flex flex-col gap-2">...</div>
</div>
```

- `surface-N` already has padding (`p-3`) and rounding (`rounded-md`). Don't
  add `p-*`, `border` or `rounded-*`.
- Add `surface-border` only when a box needs a drawn edge: on its own for a
  box flush with the page, or next to a `surface-N`
  (`class="surface-2 surface-border"`). Use it rarely.
- Don't nest a box just to group things. Use a `gap` stack instead; nest only
  when the content is a separate thing (a set inside a workout, an item
  inside a list).
- Rows inside a container (the steps of a set, the items in a list) are a
  `flex flex-col gap-2` stack; whitespace separates them. Group the parts of a
  container (its fields, its list, its actions) with `gap-4` between them.
- A `<table>` needs no classes; wrap it in `<div class="overflow-x-auto">` so
  it scrolls instead of overflowing on a phone.
- `<hr />` (a 1px `outline-variant` line) is a last resort, for when rows are
  dense enough that gap alone can't tell them apart. Never put one between
  every row by default.

## Buttons

Emphasis goes filled, then outlined, then plain:

| Markup | Use |
|---|---|
| `btn-primary`, `btn-success`, ... | The one main action of a group (Save, Add) |
| `btn-outlined-error`, `btn-outlined-primary`, ... | A colored secondary action, usually an inline Delete/Remove |
| `<button>` | Everything else: Cancel, Close, Duplicate, Move up |

- At most one filled button per group.
- Cancel is always a plain `<button>`, never `btn-error`.
- `btn-error` (filled) is only for the confirm step of a destructive action,
  e.g. the "Delete" in an "Are you sure?" dialog.
- Action rows are `flex justify-end gap-2`, with the main action last:
  `<button>Cancel</button> <button class="btn-success">Save</button>`.
- Don't restyle buttons (`px-*`, `py-*`, `rounded-*`, `font-*`). Width
  utilities and `self-start` are fine.

## Color

Colors are role tokens: `bg-c-<role>`, `text-c-<role>`, `border-c-<role>`.
Never write a hex value, `bg-white`, `text-gray-*` or any other stock
Tailwind color.

**Pairing rule**: text on fill `X` is `on-X`. `bg-c-primary` gets
`text-c-on-primary`, `bg-c-error-container` gets
`text-c-on-error-container`, surfaces get `on-surface`. Anything else is
probably low contrast.

| Role | Use |
|---|---|
| `primary` | Main actions, the active nav item, links |
| `secondary` | Less prominent accents, selected-but-not-main states |
| `tertiary` | A sparing contrasting accent (badges, highlights) |
| `error` | Destructive actions, error messages |
| `success` | Confirming actions, done states |
| `<role>-container` | A soft tinted box for a message: `rounded-md p-3 bg-c-primary-container text-c-on-primary-container` |
| `on-surface-variant` | Muted text. Usually you want `<small>` or `<label>` instead |
| `outline` / `outline-variant` | Borders. Rarely needed by hand; the base style draws the few that exist |
| `inverse-surface` | A toast or tooltip that must stand out from anything under it |

Categorical colors `pink`, `red`, `yellow`, `green`, `blue` (each with an
`l-` light and `d-` dark variant, and `on-*` pairs) are for charts and
user-chosen tag colors only. `red` does not mean error; use `error`.

Custom interactive components reuse the generated state colors instead of
`color-mix()` or opacity: `hover:bg-c-<role>-hover` /
`active:bg-c-<role>-focus` on a filled fill, `hover:bg-c-<role>-hover-tint`
/ `active:bg-c-<role>-focus-tint` over a transparent one. Focus rings come
from the `std-focus` utility.

## Shape

`rounded-sm` (4px) for inputs, buttons and small chips. `rounded-md` (8px)
for containers. `rounded-full` for pills and dots. Nothing else.

## Example

```html
<div class="surface-1 flex flex-col gap-4">
    <div>
        <h2>New workout</h2>
        <small>A workout is a list of sets.</small>
    </div>

    <div class="flex flex-col gap-2">
        <label class="flex flex-col gap-1">
            Name
            <input type="text" placeholder="e.g. Leg day" />
        </label>
        <label class="flex items-center gap-2">
            <input type="checkbox" /> Beeps
        </label>
    </div>

    <div class="surface-2 flex flex-col gap-4">
        <h3>Warm up</h3>
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
                <span class="flex-1">Jumping jacks</span>
                <button>Duplicate</button>
                <button class="btn-outlined-error">Remove</button>
            </div>
            <div class="flex items-center gap-2">
                <span class="flex-1">Rest</span>
                <button>Duplicate</button>
                <button class="btn-outlined-error">Remove</button>
            </div>
        </div>
        <label class="flex flex-col gap-1">
            Add exercise
            <input type="text" placeholder="Search exercises" />
        </label>
    </div>

    <div class="flex justify-end gap-2">
        <button>Cancel</button>
        <button class="btn-success">Save</button>
    </div>
</div>
```
