# Congress Flashcards App

## What this is
A web-based flashcard app to help a journalist learn the faces and facts of all US Congress members. Shows a photo, user types the name. After guessing, shows the member's name and key facts. Tracks progress over time. Built with game-feel ("juice") in mind — animations, satisfying feedback, streaks, dopamine hits for correct answers.

## Who it's for
Currently just one user (Ray, a reporter and PM). Will eventually be a publicly available app for other journalists and anyone who wants to learn Congress.

## Core features
- Show a congress member's face, user types their name
- After guessing, show the member's name large in the card + facts panel (state, party, chamber, committees, years in office, a notable fact)
- Manual advance — user reads facts at their own pace, hits Next when ready
- Filters: party, chamber (House/Senate), committee, freshmen only, starred only — chosen at start, changeable mid-deck via "Change filters"
- Track what's been learned vs still needs work (spaced repetition style — not yet built)
- Data stays automatically up to date via Congress.gov API
- Works well on phones (fully responsive)
- Fun to use — not just functional

## Juice / game feel (implemented)
- Confetti burst on correct answers
- Streak counter with Lottie fire animation (appears at 1+, grows with consecutive correct answers)
- Star button (☆/⭐) on each card — saves to localStorage, persists across reloads
- 3D press-in buttons (Duolingo-style)
- Green/red card flash for correct/wrong
- Card pop animation on correct answer
- Deck is shuffled on every quiz start
- Duolingo color system: green #58cc02, red #ff4b4b, orange #ff9600, blue #1cb0f6

## Juice / game feel (not yet built)
- Sound effects (optional, togglable)
- Spaced repetition — show harder cards more often

## Design decisions (do not revisit without good reason)
- **No hints during guessing** — just the photo, no state/party shown
- **No auto-advance** — user controls pacing to read facts
- **Name shown after guessing** — card shows member's name large after submit, not just the facts panel
- **"Reset" always accessible** — small button in the quiz header at all times, not just at end of deck. Takes user back to filter screen.
- **Cheat mode** ("reveal answer") — small subtle button for testing, remove before public launch
- **Skip members with no photo** — members without an official photo are excluded from the deck (the whole point is learning faces). At the end of a session, if any members were skipped, show their names with a brief explanation ("excluded because no official photo is available"). Only show this section when there are actually skipped members.

## Tech stack
- **Next.js** — frontend + backend in one
- **Congress.gov API** — official government API for member data (names, state, party, chamber). API key in .env.
- **clerk.house.gov** — source for House member photos (direct URL, no key needed)
- **Wikipedia API** — source for Senate member photos (no key needed)
- **unitedstates/congress-legislators** — GitHub YAML repo for committee memberships (fetched at runtime, no key needed)
- **GovTrack API** — free source for vote records (no key needed) — not yet integrated
- **Supabase** — database for tracking user progress (signed up, not yet integrated)
- **Vercel** — deployment target (not yet deployed)

## Who I'm working with
Ray is a PM at a SaaS company who is completely new to coding. He's building this to become better at his job — understanding what engineers actually do. This is his first project.

- Ray is completely new to coding and VS Code — never assume he knows how to do something in the UI or terminal without being told explicitly
- Explain every step as if it's the first time — include exactly where to click, what folder to put things in, what the terminal output means
- When giving terminal commands, give one command at a time so they're easy to copy and run without splitting across lines
- When explaining code, reference the actual code directly (line numbers, variable names, specific functions)
- Always explain what you're doing and why before doing it
- Never assume knowledge of new concepts — explain terms when they come up for the first time
- Explain what just happened after a command runs, not just what to do next
- Use plan mode for anything non-trivial before touching code
- Prefer simple, readable code over clever code
- Point out when there's a decision to make rather than just deciding
- When touching anything security-related (API keys, passwords, environment variables), always explain why it matters

## Next steps (in order)
1. **Deploy to Vercel** — so it works on Ray's phone and is publicly accessible
2. **Mobile polish** — review layout and tap targets on a real phone after deploy
3. **Add state filter** — useful for drilling by state
4. **Supabase integration** — save progress across sessions (which members learned, which still need work)
5. **Spaced repetition** — surface harder cards more often based on history
6. **Remove cheat mode** — before going public

## Updating after an election (e.g. post-midterms 2026)

New members are sworn in early January. Here's what to do:

1. **Run the photo script** — downloads photos for any new members not already in `public/photos/`:
   ```
   node --env-file=.env scripts/download-photos.js
   ```
   Run this around inauguration day. Wikipedia and clerk.house.gov usually have photos up within days of swearing-in. Any member without a photo yet will show a gray placeholder until you re-run the script.

2. **Update the freshmen flag** — in `app/api/members/route.js`, line ~37, change the year cutoff:
   ```js
   freshmen: earliestYear >= 2027,  // update this after each election
   ```

3. **Member data and committees update automatically** — the Congress.gov API always returns current members, and committee data comes from the `unitedstates/congress-legislators` GitHub repo which is community-maintained and stays current.

## Known limitations
- **iOS keyboard scroll** — when the user taps the input field on iPhone, the keyboard appears and the page scrolls slightly, partially cutting off the photo. This is a fundamental iOS Safari limitation. Multiple fixes were attempted (dvh units, visualViewport API, position:fixed, interactive-widget meta tag) — none worked reliably. Not worth pursuing further unless iOS Safari improves support.

## Deferred features (good ideas, not now)
- Login / user accounts
- Leaderboards
- Sound effects
- Recent votes data (GovTrack)

## Project status
- [x] Install Node.js (v24.14.1)
- [x] Install VS Code (v1.113.0)
- [x] Sign up for Congress.gov API key (stored in .env)
- [x] Sign up for Supabase (Data API enabled, RLS enabled)
- [x] Sign up for GitHub (raylabs0, authenticated via gh CLI)
- [x] Initialize Next.js project
- [x] Build flashcard UI with fake data
- [x] Game feel — confetti, streaks, 3D buttons, Duolingo colors
- [x] Filter screen — party, chamber, committee, freshmen
- [x] Hook up Congress.gov API (real member data)
- [x] Photos — downloaded locally from clerk.house.gov (House) and Wikipedia (Senate)
- [x] Committee memberships — from unitedstates/congress-legislators
- [x] Star feature — localStorage, persists across reloads, filter on home screen
- [x] Deploy to Vercel (live at congress-flashcards.vercel.app)
- [ ] Mobile polish — keyboard scroll issue on iOS is a known limitation, not yet fixed. Everything else reviewed.
- [ ] Supabase progress tracking
- [ ] Spaced repetition
