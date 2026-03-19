# ZapQuiz

Real-time quiz game platform (like Kahoot) built with Node.js.

## Tech Stack
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (via `pg` pool)
- **Frontend**: Vanilla JS (IIFE pattern), BEM CSS, no frameworks
- **Auth**: express-session, bcrypt, role-based (admin/member/premium)
- **Deploy**: Render (Oregon region), GitHub repo: https://github.com/bobo-vv/quizbattle

## Project Structure
```
server.js              — Express + Socket.io entry point
db/db.js               — PostgreSQL pool (SSL in production)
db/schema.sql          — All table definitions
routes/auth.js         — Login/register/session APIs
routes/quiz.js         — CRUD quizzes + questions + stats API
routes/game.js         — Game create + history APIs
routes/admin.js        — Admin user management APIs
middleware/auth.js     — requireAuth, getLimits (role-based limits)
socket/gameHandler.js  — All real-time game logic (join, answer, score, team, save history)
public/               — All frontend HTML/JS/CSS
public/js/i18n.js     — Thai/English translations
public/js/sound.js    — Web Audio API synthesized sounds
public/css/style.css  — Single CSS file, BEM naming
```

## Key Patterns
- Games are stored in-memory (`Map`) during play, saved to DB on game-end
- Game history is denormalized (quiz_title, question_text stored directly) so history survives quiz deletion
- All frontend JS uses IIFE `(function(){ 'use strict'; ... })()` pattern
- i18n: `data-i18n` attributes + `t('key')` function, TH/EN
- CSS: Watch for `display:flex` overriding `[hidden]` — always add `selector[hidden] { display: none; }` when using display:flex

## Features
- Quiz CRUD with Excel import
- Real-time game with PIN code, QR code, avatars, reactions
- Countdown 3-2-1-GO!, lobby music, sound effects
- Team mode (2-4 teams, round-robin assignment)
- Game history with player scores and answer details
- Quiz preview (browse questions with answers)
- Quiz statistics (per-question difficulty bar charts)
- Admin panel (approve/reject users, role management)
- Settings page (change email/password, delete account)

## Database Tables
- `hosts` — users with role (admin/member/premium) and status (pending/approved/rejected)
- `quizzes` → `questions` → `options` — quiz content
- `game_sessions` → `game_players`, `player_answers` — game history

## Running Locally
```bash
npm install
# Set DATABASE_URL in .env
node server.js
```
