---
name: expand-question-bank
description: Expand the project's reading comprehension, cloze, and grammar-fill question banks while following the repository's data rules and showing proposed data for review before any JSON update.
---

# Expand Question Bank

Use this skill when the user asks to expand the question bank, add an article, or add reading comprehension, cloze, or grammar-fill material.

## Before creating questions

1. Read the repository root `AGENTS.md` and the target JSON file. Follow the current repository instructions and the existing schema; do not rely on remembered schemas.
2. Before drafting, ask which question type to expand (reading, cloze, or grammar fill), the article topic, and the difficulty. If the user already supplied any of these for this request, confirm or ask only for the missing details.
3. Check the requested source/material constraints. Do not present copyrighted exam passages as original or copy them without permission. Prefer project-owned text or appropriately licensed sources when a source is needed.

## Data requirements by type

- **Reading comprehension:** Create 3 single-choice questions. Include the original locating sentence as `evidence` and Chinese `optionExplanations` that explain the distractor errors. Mark long-sentence translations using the project's `segments` array format.
- **Cloze:** Create exactly 5 objectively scored gaps. Each Chinese explanation must explicitly cover both “上下文逻辑线索” and “词汇/语法辨析”.
- **Grammar fill:** Create exactly 5 gaps, with 2–3 prompted content-word gaps and 2–3 unprompted function-word gaps. Prompted gaps must show the prompt beside the matching body placeholder, in the repository's required form (for example `__1__(go)`). Unprompted gaps use only `__2__` and must have a one-word function-word answer. Do not use unprompted personal or possessive pronouns. Provide Chinese explanations for context and grammar.

## Validate and present for review

- For grammar fill, run the repository's `validate-grammar.js` against the exact proposed dataset before presenting it. Use a temporary candidate JSON file outside the tracked data files if needed; do not overwrite the question-bank JSON to run validation. If the validator's current fixed article count prevents validating a larger candidate bank, make the smallest necessary validator adjustment so it checks the full candidate dataset while retaining the gap, prompt-format, and answer-category checks, then run it. Report validation failures honestly and fix them before presenting the candidate.
- Present the complete proposed data in a fenced code block and wait for the user's confirmation. Do not write or merge it into the project's question-bank JSON before confirmation.
- After confirmation, update the relevant JSON while preserving the existing application schema, then run the relevant validator again for grammar fill. Summarize the file changed and validation result.

