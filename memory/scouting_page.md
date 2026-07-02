---
name: scouting-page
description: Prospect Board tool — dual-mode NFL dynasty values + CFBD college recruiting data for future classes
metadata:
  type: project
---

The scouting page at `/tools/scouting` has two data modes:

**NFL mode (years 2020-2026):** Fetches from `/api/scouting/prospects` which uses FantasyCalc dynasty values + Sleeper rawJson.years_exp to bucket players into draft class years. Grades based on dynasty value.

**College mode (years 2027-2029):** Fetches from `/api/scouting/cfbd-prospects` which hits the College Football Data API (`https://api.collegefootballdata.com/recruiting/players`) using the key stored in `CFBD_API_KEY` env var. Maps NFL draft year → recruiting class year (nflDraftYear - 4). Shows recruiting stars, committed college, high school, national rank. Grades based on stars + national ranking.

**Why:** User wants to scout both current NFL rookies (FantasyCalc) and future college prospects (2027-2029 projected draft classes).

**How to apply:** If extending the scouting page, use the CFBD API for any college-based features. The key is in `.env.local` as `CFBD_API_KEY`. The data structure has id, name, position (QB/RB/WR/TE/ATH), highSchool, committedTo, city, state, stars (1-5), rating (0-1), nationalRank, height, weight.

Star/target system uses localStorage key `scoutingStarred` — NFL players use Sleeper ID, college players use `cfbd-${id}`.
