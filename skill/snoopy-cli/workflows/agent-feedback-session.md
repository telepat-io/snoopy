# Agent Feedback Session Workflow

## Overview

Strict, atomic, human-in-the-loop workflow for improving job quality via feedback. This workflow is **ONE ATOMIC OPERATION**: review → submit → consolidate. Agents MUST NOT skip any step.

The feedback loop teaches Snoopy's LLM to better understand user criteria through validated examples.

---

## Workflow Guardrails (STRICT)

1. **Never fabricate feedback** — User must provide explicit verdict for EVERY result
2. **Reason required for invalid** — `snoopy feedback submit --invalid` REQUIRES `--reason`
3. **Atomic sequencing** — review → submit → consolidate is ONE workflow; never interrupt
4. **Explicit exit gates** — Before interrupting, ask: "Exit now? (This will lose feedback. Or consolidate first?)"
5. **Consolidate before ending** — Always run consolidate before ending session, even if only 1-2 feedbacks collected

---

## Prerequisites

- Job exists and has been run at least once (has qualified results)
- User has reviewed some results and formed opinions about quality
- Qualification rate is not ideal (< 0.95) and user wants to improve

---

## Step 1: Review Unvalidated Results

### Goal
Retrieve a batch of qualified results awaiting user feedback.

### Commands

```bash
snoopy feedback review <jobRef> --json --limit 10
```

**Expected Output (JSON array):**

```json
[
  {
    "resultId": "feedback_uuid_001",
    "title": "Thread Title",
    "author": "username",
    "subreddit": "subreddit1",
    "score": 42,
    "content": "Full post text here...",
    "url": "https://reddit.com/r/.../...",
    "qualificationReason": "Initial match: 'buying intent' keyword found",
    "createdAt": "2026-05-08T10:30:00Z",
    "validated": false
  },
  {
    "resultId": "feedback_uuid_002",
    "title": "Another Thread",
    "author": "another_user",
    "score": 15,
    "content": "...",
    "qualificationReason": "Initial match: 'purchase' mentioned",
    "validated": false
  }
]
```

### Agent Workflow

**Step 1a: Fetch unvalidated results**

```bash
snoopy feedback review <jobRef> --json --limit 10
```

- `--json`: Ensures machine-readable output
- `--limit 10`: Reasonable batch size (adjust as needed; 5-20 typical)

**Step 1b: Parse and display to user**

Agent should display each result to user in readable format:

```
Result 1 of 10
Title: "[post title]"
Subreddit: r/[subreddit]
Author: u/[username]
Score: [score]
Content: "[first 200 chars of content]..."
URL: [link]
Initial reason: "[original qualification reason]"

---
Is this a good match for your criteria? (yes/no)
---
```

**Step 1c: Exit conditions**

- **No unvalidated results** → Offer: "All results already validated. Run another job for more? (yes/no)"
- **User exits early** → Ask: "Stop reviewing? (This will lose feedback. Or consolidate first?)"
  - If "consolidate first": Skip to Step 3
  - If "exit without consolidate": Report warning; do NOT proceed to consolidate

### Agent Responsibility

- [ ] Fetch with `--json` for reliable parsing
- [ ] Display each result clearly to user
- [ ] Collect explicit feedback for EACH result (never skip)
- [ ] Store resultId and user's verdict
- [ ] Track which results are processed

---

## Step 2: Submit Feedback (Per Result)

### Goal
Record user's judgment on each result. **This is not optional.**

### For Each Result: Collect Verdict from User

Ask user explicitly:

```
"Is this a good match for your criteria?"

(Context: We marked it as qualified because: "[original reason]")

Your verdict: (yes/no)
```

### Commands

**If user says YES (valid result):**

```bash
snoopy feedback submit <resultId> --valid

# Output: { "submitted": true, "resultId": "...", "verdict": "valid" }
```

**If user says NO (invalid result, reason REQUIRED):**

```bash
# First, collect reason from user
"Why is this not a good match? Please be specific."
# User responds: "Not actually buying, just asking a question"

# Then submit with reason
snoopy feedback submit <resultId> --invalid --reason "Not actually buying, just asking a question"

# Output: { "submitted": true, "resultId": "...", "verdict": "invalid" }
```

### Agent Workflow

```
For each result in reviewed batch:
  
  1. Display result to user
  2. Ask: "Good match? (yes/no)"
  3. Collect explicit answer
  
  If "yes":
    - Submit: snoopy feedback submit <resultId> --valid
    
  If "no":
    - Ask: "Why not? (please be specific)"
    - Collect reason from user
    - Submit: snoopy feedback submit <resultId> --invalid --reason "<reason>"
  
  4. Confirm submission to user: "Feedback recorded"
  
  Continue to next result
```

### Failure Recovery

| Error | Cause | Action |
| --- | --- | --- |
| Feedback submit fails | Missing --reason for invalid | Catch error; re-ask user for reason; retry submit |
| Feedback submit fails | API error | Retry once; escalate if persistent; do NOT consolidate until resolved |
| resultId not found | Invalid UUID | Verify resultId matches exactly; retry |
| DB locked | Multiple writes | Retry after brief pause |

### Agent Responsibility

- [ ] Collect explicit verdict for EVERY result
- [ ] For invalid verdicts, collect and include `--reason`
- [ ] Submit each feedback immediately after collecting verdict
- [ ] Confirm success of each submission
- [ ] Track all submitted feedbacks
- [ ] Never skip any result in the batch

---

## Step 3: Consolidate Feedback (REQUIRED)

### Goal
Rewrite the job's qualification prompt based on feedback patterns.

### CRITICAL: This step MUST run before ending the session

### Commands

```bash
snoopy feedback consolidate <jobRef> --json
```

**Expected Output:**

```json
{
  "jobRef": "abc123",
  "oldPrompt": "Looking for posts about buying tech with intent to purchase",
  "newPrompt": "Looking for posts where user explicitly mentions buying or purchasing. Exclude posts that are just asking questions or seeking advice without purchase intent.",
  "changesApplied": [
    "Added disqualifier: 'just asking a question'",
    "Strengthened signal: 'explicitly mentions buying'",
    "Added exclusion pattern: 'seeking advice without purchase'"
  ],
  "requiresConsolidation": false,
  "feedbackCount": 8
}
```

### Agent Workflow

**Step 3a: Run consolidate**

```bash
snoopy feedback consolidate <jobRef> --json
```

**Step 3b: Display changes to user**

```
Prompt Consolidation Complete!

Old prompt:
"Looking for posts about buying tech with intent to purchase"

New prompt:
"Looking for posts where user explicitly mentions buying or purchasing. 
Exclude posts that are just asking questions or seeking advice without purchase intent."

Changes applied:
- Added disqualifier: 'just asking a question'
- Strengthened signal: 'explicitly mentions buying'
- Added exclusion pattern: 'seeking advice without purchase'

Feedback processed: 8 results

---
The new prompt will be used in all future runs.
```

**Step 3c: Offer next actions**

```
What would you like to do next?
- Test the improved prompt: Run job now? (yes/no)
- Continue feedback: Review more results? (yes/no)
- Exit: Done improving? (yes/no)
```

### Agent Responsibility

- [ ] Always run consolidate (never skip)
- [ ] Parse and display changes to user
- [ ] Confirm to user that new prompt is now active
- [ ] Offer to test new prompt by running job again
- [ ] Offer to continue feedback loop if desired

---

## Complete Feedback Session Example

```
Agent: "Ready to improve job quality?"

User: "Yes, let's review what we're missing"

STEP 1: REVIEW
├─ snoopy feedback review abc123 --json --limit 10
├─ Fetches: 10 unvalidated results
└─ Displays to user (one at a time)

STEP 2: SUBMIT FEEDBACK
├─ Result 1: User says "yes" → snoopy feedback submit uuid_001 --valid
├─ Result 2: User says "no" (reason: "not buying") → submit --invalid --reason "not buying"
├─ Result 3: User says "yes" → submit --valid
├─ Result 4: User says "no" (reason: "asking question") → submit --invalid --reason "asking question"
├─ ... (8 results processed)
└─ Confirm: "8 results validated"

STEP 3: CONSOLIDATE (REQUIRED)
├─ snoopy feedback consolidate abc123 --json
├─ Output: Old prompt, new prompt, changes applied
└─ Confirm to user: "Prompt improved with your feedback"

NEXT ACTIONS
├─ Test: "Run job again to test new prompt?" → snoopy job run abc123 --limit 5
├─ More feedback: "Review more results?" → Loop back to Step 1
└─ Exit: "Done for now?" → End session
```

---

## Atomic Workflow Enforcement

### Prevent User Interruption

**Scenario: User starts review, then says "I need to stop"**

```
Agent: "Reviewing feedback... (3 of 10 complete)"
User: "I need to stop. We can continue later."

Agent offer:
"Stop now? Your current feedback will be lost.

Options:
A) Consolidate feedback now, then exit (recommended)
B) Exit without consolidating (feedback lost for these 3)
C) Continue reviewing (don't exit)"
```

**If user chooses A (Consolidate):**
- Skip remaining results
- Run consolidate immediately
- End session with changes applied

**If user chooses B (Exit without consolidate):**
- Warn: "3 feedbacks will be lost. Continue exiting?"
- If confirm: Exit without consolidate
- If cancel: Return to reviewing

**If user chooses C (Continue):**
- Continue reviewing from result 4

### Prevent Skip Consolidate

**Scenario: After Step 2 is complete**

```
All feedback submitted. Feedback count: 8

Next: Consolidate to improve prompt?
This is the final step - without consolidation, 
your feedback won't improve the prompt.

(yes/no)
```

**If YES:**
- Run Step 3 (Consolidate)
- Apply changes
- Exit session

**If NO:**
- Warn: "Consolidation is required to apply learning."
- Offer: "Would you like to consolidate now?"
- If still no: Escalate to user (explain why consolidate matters)

---

## Error Handling During Feedback Session

| Error | Step | Recovery |
| --- | --- | --- |
| Feedback submit fails | Step 2 | Show error; ask user if they want to retry or continue to consolidate |
| Consolidate fails | Step 3 | Show error; offer retry; if persistent, escalate to user |
| resultId invalid | Step 2 | Show error; verify ID; retry submit |
| User provides no reason for invalid | Step 2 | Re-ask: "Why not? Please provide reason"; do NOT submit without reason |
| Review exits early | During Step 1 | Offer: Consolidate now? If yes, skip to Step 3. If no, confirm exit without consolidate. |

---

## Qualification Rate Improvement Tracking

After feedback loop, user can verify improvement:

```bash
# Before feedback loop
snoopy analytics <jobRef> --days 7
# Output: qualificationRate: 0.08 (8%)

# [User runs feedback loop]

# After feedback loop + new job run
snoopy analytics <jobRef> --days 7
# Output: qualificationRate: 0.12 (12%)
# Improvement: +50%
```

Agent can track and report this improvement to user.

---

## Feedback Session Termination Checklist

- [ ] All displayed results have been reviewed OR user explicitly exited
- [ ] All feedbacks were submitted (if review completed)
- [ ] Consolidate was run (if any feedbacks submitted)
- [ ] User confirmed changes or new prompt
- [ ] Session end offered: test new prompt, more feedback, or exit

**Session is complete** when all checkboxes are checked.
