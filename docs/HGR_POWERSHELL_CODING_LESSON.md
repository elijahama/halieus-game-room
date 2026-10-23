# HGR Part 31 — PowerShell coding lesson through algebra

**Teaching log:** 22–23 October 2026.
**Status:** Lesson in progress. This is learning documentation, not a new website release or a claim that post-reboot connection is validated.

## Goal and implemented Windows automation

Run the *ChatGPT-connected Desktop Commander remote agent* in the background when the owner signs in to Lagz. It is **not** RustDesk, Windows Remote Desktop or the HGR Control website.

- Manual Start-menu and desktop shortcut: **ChatGPT Remote Desktop (Lagz)**.
- Installed Windows Task Scheduler task: **ChatGPT Remote Desktop (Lagz)**, trigger **at user logon** (not before Windows login). Runs under the owner's interactive Windows user with normal privileges and a hidden PowerShell window.
- Supervisor script: `%LOCALAPPDATA%\ChatGPT Remote Desktop\Start-Desktop-Commander-Background.ps1`.
- Existing Node.js program: `npx.cmd --yes @wonderwhy-er/desktop-commander@0.3.1 remote`; version intentionally pinned.
- The script checks for an existing Desktop Commander Node.js process before launching, loops every 30 seconds if already active, retries after failures, and records minimal status to `%LOCALAPPDATA%\ChatGPT Remote Desktop\background-agent.log`. Task Scheduler uses **IgnoreNew** to avoid duplicate task instances.
- Locally verified: PowerShell parsed; `-CheckOnly` located Node.js and the existing agent process; Task Scheduler registered successfully, ran, and wrote the supervisor-start log entry without disrupting the established connector.
- **Not yet verified:** actual fresh Windows reboot/sign-in autostart; remote cloud authentication after the reconnect. Process presence does not prove a healthy network connection. The computer must remain on, awake, signed into Windows and connected for the agent to serve ChatGPT; Oracle-hosted HGR game traffic is independent of this laptop.
- No credential values or private agent authentication files should be inspected, logged, or committed. Do not change HGR icons/branding, Oracle secrets or production permissions as part of this lesson.

## Learning approach: algebra → PowerShell → output

The learner finds algebra, propositional logic and set theory especially intuitive. Explain any new symbol before introducing exercises. Distinguish the mathematical condition from the runtime flow.

| Mathematical idea | PowerShell | Note |
| --- | --- | --- |
| x = 5 (comparison) | `$x -eq 5` | `$x = 5` **assigns** 5 instead |
| x ≠ 5 | `$x -ne 5` | Not equal to |
| x < 5 | `$x -lt 5` | Strict boundary |
| x ≤ 5 | `$x -le 5` | Includes 5 |
| x > 5 | `$x -gt 5` | Strict boundary |
| x ≥ 5 | `$x -ge 5` | Includes 5 |
| P ∧ Q | `-and` | Both true |
| P ∨ Q | `-or` | Inclusive OR: either or both |
| ¬P | `-not` | Negates the entire following condition |
| x ← x + 2 | `$x = $x + 2` | Reassignment, not an automatic loop |

`$` marks a **variable**, not a unit; command parameters such as `-Seconds` determine units.

### Variables and execution order

```powershell
$Name = "Lagz"
$Name = "Halieus"
Write-Host $Name
# Halieus
```

A reassignment replaces the stored value once. `Write-Host` prints the current value; putting it before or after an addition changes the output. A `while` condition is checked **before each iteration**, not between every line of the body.

```powershell
$x = 0
while ($x -lt 5) {
    Write-Host $x
    $x = $x + 1
}
# 0, 1, 2, 3, 4
```

Move `Write-Host` below `$x = $x + 1`, and the output becomes 1, 2, 3, 4, 5. `break` exits the loop; `continue` skips the remaining body of one iteration and rechecks the loop condition. `while ($true)` repeats indefinitely until explicitly stopped, which is intentional for the background supervisor.

### Sets and logical operators

`x ∈ S` is *set membership* (∈ is not Greek epsilon). `A ∪ B` is union; `A ∩ B` is intersection; `S \ A` is set difference, not division. A set contains unique values. In a `foreach` loop, x takes **one candidate value at a time**, not multiple simultaneous values.

```powershell
$Numbers = @(2, 4, 6, 8)
foreach ($x in $Numbers) {
    if ($x -lt 4 -or $x -ge 6) {
        Write-Host $x
    }
}
# 2, 6, 8
```

`x < 4 ∧ x ≥ 6` has no solutions: both conditions cannot be satisfied at once. The law of non-contradiction is `¬(P ∧ ¬P)`; two incompatible inequalities are not necessarily exact negations. A condition in `while` decides whether the **whole loop repeats**, whereas a condition in `if` inside the loop can selectively **filter printed values**.

### De Morgan's laws: current stopping point

- **¬(P ∨ Q) ≡ ¬P ∧ ¬Q**
- **¬(P ∧ Q) ≡ ¬P ∨ ¬Q**

Exercise: `S = {2, 4, 6, 8, 10, 12}` and `¬(x < 6 ∨ x > 10)`.

Work algebraically:
1. `¬(x < 6) ≡ x ≥ 6`.
2. `¬(x > 10) ≡ x ≤ 10`.
3. So `6 ≤ x ≤ 10`, and the satisfying set is **{6, 8, 10}**.

**Important learning correction:** the learner found the correct final set but temporarily interpreted the negations as `x ≠ 6` and `x ≠ 10`. They are **not** equivalent: negating a strict inequality reverses the inequality and includes equality, which keeps the boundary values.

PowerShell expression:

```powershell
$Numbers = @(2, 4, 6, 8, 10, 12)
foreach ($x in $Numbers) {
    if (-not ($x -lt 6 -or $x -gt 10)) {
        Write-Host $x
    }
}
# 6, 8, 10
```

Equivalent `if` condition: `$x -ge 6 -and $x -le 10`.

## Next teaching steps and pause etiquette

Practice **negation of inequalities** (particularly the equality boundaries), then the second De Morgan law, then Boolean conditions in the *real* background process supervisor. Keep exercises conversational and gradual. The owner has HGR development happening at the same time and requested a natural pause: signal when a good stopping point is reached, without inventing a clock time or promising automatic future delivery. No changes to code should be made solely to demonstrate a lesson without consent.
