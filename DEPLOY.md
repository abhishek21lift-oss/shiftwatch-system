# Deploying ShiftWatch on Render

This guide takes you from a local project to a live URL on the public internet using **Render.com** — a managed platform that handles servers, databases, and HTTPS for you. Total time: roughly 20 minutes. Cost on the free tier: ₹0 to start; about ₹600/month (~$7) per service if you upgrade to "Starter" for always-on.

---

## What you'll end up with

| Piece | URL pattern |
|-------|-------------|
| Frontend (React) | `https://shiftwatch-ui.onrender.com` |
| Backend (API) | `https://shiftwatch-api.onrender.com` |
| Database (Postgres) | Internal — only the API connects to it |

You log into the frontend URL, it talks to the API, the API talks to Postgres. Same as your local Docker setup, just hosted.

---

## One-time prerequisites

1. **GitHub account** — Render deploys from a Git repository. If you don't have one, sign up at github.com (free).
2. **Render account** — sign up at [render.com](https://render.com) using your GitHub login. This way Render can read your repos directly.
3. **Push the project to GitHub** — if it isn't there yet:
   ```bash
   cd F:\shiftwatch-system
   git init
   git add .
   git commit -m "Initial commit"
   # Create an empty repo on github.com first, then:
   git remote add origin https://github.com/<your-username>/shiftwatch-system.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 1 — Create the Blueprint

Render reads the `render.yaml` file at the root of the repo and provisions everything described in it.

1. In Render, click **New → Blueprint**.
2. Connect your GitHub account if prompted, then select the `shiftwatch-system` repo.
3. Render will detect `render.yaml`. Give the Blueprint a name (e.g. `shiftwatch`) and click **Apply**.
4. Render starts creating three resources:
   - `shiftwatch-db` (Postgres database)
   - `shiftwatch-api` (Node web service)
   - `shiftwatch-ui` (React static site)

Wait for the database to finish provisioning before moving on (status turns green, ~2 minutes). The two web services will fail their first build because environment variables aren't fully wired yet — that's expected; we fix it in Step 3.

---

## Step 2 — Load the database schema

Render's Postgres comes empty. We need to load `database/schema.sql` (which also seeds the default users like `admin / Admin@123`).

1. Open the **shiftwatch-db** service in Render.
2. Find the **External Database URL** under "Connections" and copy it. It looks like `postgres://postgres:xxxx@xxxx.oregon-postgres.render.com/shiftwatch_db`.
3. From your local machine (Windows PowerShell), run:
   ```powershell
   psql "<paste-the-external-url-here>" -f F:\shiftwatch-system\database\schema.sql
   ```
   You need `psql.exe` installed locally — if you don't have it, install PostgreSQL on your PC (the same prereq as `init.ps1`).
4. You should see a series of `CREATE TABLE`, `INSERT`, etc. messages and no errors.

---

## Step 3 — Wire up the cross-service URLs

Render generates the public URLs only after each service is created, so two env vars need to be filled in by hand once.

1. Open **shiftwatch-ui** in Render → **Environment** tab.
   - Add value for `REACT_APP_API_URL`:
     `https://shiftwatch-api.onrender.com/api`
     (use the actual API URL Render gave you — visible at the top of the `shiftwatch-api` service page)
   - Click **Save Changes**. Render will rebuild the frontend automatically.

2. Open **shiftwatch-api** in Render → **Environment** tab.
   - Add value for `FRONTEND_URL`:
     `https://shiftwatch-ui.onrender.com`
     (use the actual frontend URL)
   - Click **Save Changes**. The backend will redeploy with CORS configured for your real frontend.

---

## Step 4 — Test it

1. Open the frontend URL in your browser.
2. Log in with the seeded admin account: **admin / Admin@123**.
3. Mark attendance, view the dashboard, etc. — same flows as locally.

> **Important:** change the admin password immediately after first login. The default credentials in `README.md` are public knowledge.

---

## Free tier caveats (read this)

The free tier is great for trying it out but has limits worth knowing before you put real gym data on it:

| Limit | What it means for you |
|-------|----------------------|
| Backend sleeps after 15 min idle | First request after a quiet period takes ~30 sec to wake up. |
| Database expires after 90 days | Render deletes free Postgres databases after 90 days. **Plan to upgrade or back up before then.** |
| 750 build minutes/month | Plenty unless you redeploy constantly. |

For real production use at the gym, upgrade `shiftwatch-api` and `shiftwatch-db` to **Starter** ($7/month each) — no sleep, no expiry, automatic daily backups for the database.

---

## Common deploy errors and fixes

**"Cannot find module" during backend build**
The build is using `npm ci` somewhere — make sure `render.yaml` says `npm install` (not `ci`). Already fixed in the version of `render.yaml` shipped with this repo.

**Frontend builds but shows a blank page**
`REACT_APP_API_URL` was missing or wrong at build time. Set it in the static-site env vars and trigger a manual redeploy from the service page.

**"CORS error" in browser console after login**
`FRONTEND_URL` on the backend doesn't match the actual frontend URL. Check for trailing slashes — `https://shiftwatch-ui.onrender.com` (no trailing slash).

**Database connection refused**
Either the schema didn't load (Step 2 was skipped) or the database is still provisioning. Wait for green status, then retry.

---

## Updating the deployment

After the first setup, every `git push` to `main` triggers an automatic redeploy of any service whose code changed. Database schema changes need to be applied manually with `psql` (same as Step 2).
