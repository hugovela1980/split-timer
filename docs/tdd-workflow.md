# TDD Workflow with GitHub Copilot

A practical guide for using test-driven development when prompting Copilot to add features.

---

## Core Principle

Write (or have Copilot write) the test first. The test is the spec. If you can't write the test, the feature isn't defined well enough yet.

---

## Step-by-Step Workflow

### 1. Describe the feature in plain English

Before writing any code, explain what you want the function to do:

> "I want a function that takes a list of route segments and returns the total distance in kilometers."

### 2. Ask Copilot to propose an approach before writing code

Add this to your prompt:

> "Before writing anything, tell me how you'd structure this and why. Keep it as simple as possible for this codebase."

This surfaces class-vs-function tradeoffs early, before any code is written.

### 3. Ask Copilot to write the tests first

Once you agree on the structure:

> "Write the tests for this using `node:test` and `assert`. Don't implement the function yet."

Review the tests. If they don't match your expectation, correct them now — it's cheaper than fixing implementation later.

### 4. Run the tests and confirm they fail

```bash
node --test tests/your-test-file.js
```

A test that passes before the implementation exists is a bad test.

### 5. Ask Copilot to implement the function

> "Now implement the function to make those tests pass. Don't change the tests."

### 6. Run the tests again and confirm they pass

If any fail, paste the failure output back to Copilot:

> "This test is failing with this error: [paste output]. Fix the implementation."

### 7. Refactor if needed

> "The tests pass. Can we simplify this implementation without changing the behavior?"

Tests stay untouched. If they still pass after refactoring, the behavior is preserved.

---

## Prompting Tips

- **Be explicit about constraints**: "I want a plain function, not a class" or "this needs to work in the browser without bundling."
- **Paste real data**: If your function processes JSON route data, paste a real example from your data files so tests use realistic inputs.
- **One feature per session**: Keep scope small. A focused prompt produces better tests than a broad one.
- **Don't skip the failing step**: It feels like extra work but it confirms your test is actually testing something.

---

## Quick Prompt Templates

**Start a new feature:**
> "I want to add [feature]. Propose how you'd structure it for this codebase before writing any code."

**Write tests first:**
> "Write `node:test` tests for [function name]. It should [behavior]. Don't implement yet."

**Fix a failing test:**
> "This test is failing: [paste error]. Fix the implementation only, not the tests."

**Refactor after green:**
> "All tests pass. Simplify this if you can without changing behavior."
