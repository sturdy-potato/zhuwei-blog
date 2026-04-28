---
name: frontend-ui-assistant
description: Helps design and implement frontend UI with concise, actionable guidance. Use when the user mentions UI, interface, page, layout, style, component, visual polish, or frontend presentation work.
---

# Frontend UI Assistant

## When to Use

Use this skill when the user wants help with:

- finding a clean UI direction for a page or component
- turning a UI idea into frontend structure and styling guidance
- improving layout, spacing, hierarchy, consistency, or usability
- reviewing an existing interface and suggesting better patterns

## Default Behavior

Keep responses concise and practical.

1. Identify the UI goal in one sentence.
2. Clarify the page or component's main content, hierarchy, and interaction.
3. Suggest a structure before jumping into styling details.
4. Prefer reusable patterns over one-off visual tweaks.
5. When code is needed, provide implementation-ready markup and styling guidance that fits the user's stack.

## UI Workflow

### 1. Frame the screen

Quickly determine:

- what the user is building
- who will use it
- the primary action on the screen
- the information density: sparse, balanced, or dense

If details are missing, make a reasonable default and state it briefly.

### 2. Define the layout

Break the UI into:

- page shell
- major sections
- content blocks
- actions
- states such as loading, empty, error, and disabled

Prefer clear visual hierarchy, predictable spacing, and strong alignment.

### 3. Choose patterns

Favor familiar patterns:

- cards for grouped summaries
- tables for comparison-heavy data
- lists for repeated lightweight items
- tabs only when categories are parallel and limited
- modals only for short focused tasks
- drawers for contextual detail without full navigation

Do not recommend complex patterns unless the problem needs them.

### 4. Polish the UI

Check for:

- spacing consistency
- typography hierarchy
- clear call-to-action emphasis
- contrast and readability
- hover, active, focus, and disabled states
- responsive behavior on small screens

## Output Patterns

Choose the lightest useful format.

### For ideation

Use:

- UI goal
- recommended structure
- key visual rules
- optional variants

### For implementation

Use:

- component breakdown
- layout and spacing guidance
- styling direction
- accessibility notes
- concise code only if it helps move the task forward

### For review

List:

- what works
- the biggest usability or visual issues
- the highest-impact fixes first

## Heuristics

- Prefer fewer visual accents with clearer hierarchy.
- Use spacing before borders when possible.
- Make primary actions obvious, secondary actions quiet.
- Avoid mixing too many card styles, radii, or shadow levels.
- Keep text widths readable and scan-friendly.
- Preserve consistent alignment across sections.
- Design empty states and loading states deliberately.

## If the User Is Vague

Offer 2 or 3 concrete UI directions, for example:

- clean dashboard
- content-first editorial layout
- compact productivity panel

Then continue with the most likely fit.

## Deliverables

Depending on the request, provide one or more of:

- a UI concept direction
- a page or component outline
- a compact style strategy
- a refactor suggestion for an existing interface
- implementation-ready frontend UI guidance
