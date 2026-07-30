# Villa Park Friends and Neighbors

A simple, low-cost neighborhood website: static Astro site + Decap CMS for content editing. No database, no server to maintain — content lives as markdown files in this repo.

## Project structure

```text
/
├── public/
│   └── admin/          # Decap CMS admin panel (visit /admin on the live site)
├── src/
│   ├── content/
│   │   ├── blog/        # blog posts (markdown)
│   │   ├── resources/   # resource links (markdown)
│   │   └── pages/       # one-off page content, e.g. about.md
│   ├── layouts/
│   └── pages/            # routes: /, /blog, /resources, /about, /contact
└── netlify.toml
```

## Commands

| Command           | Action                                       |
| :----------------- | :-------------------------------------------- |
| `npm install`       | Install dependencies                          |
| `npm run dev`       | Start local dev server at `localhost:4321`    |
| `npm run build`     | Build production site to `./dist/`            |
| `npm run preview`   | Preview the build locally before deploying    |

## Deploying (Netlify, free tier)

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project**, pick this repo. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`).
3. Enable **Identity** on the site (Site configuration → Identity → Enable). Under Identity settings, set registration to **Invite only** so only people you invite can log in.
4. Enable **Git Gateway** (Identity → Services → Git Gateway) — this lets Decap CMS commit content changes on behalf of logged-in users without them needing a GitHub account.
5. Invite your non-technical admins from the Identity tab. They'll get an email invite, set a password, and can then log in at `https://<your-site>/admin`.
6. Contact form submissions show up under **Forms** in the Netlify dashboard automatically (no extra setup — this is what `data-netlify="true"` on the contact form enables).

## Editing content

Admins log in at `/admin` and get a simple form-based UI (Decap CMS) to:
- Write and publish blog posts
- Add/edit resource links
- Edit the About page text

Every change is committed to git automatically, so full history is preserved.

## Adding a database later

If the group later wants member accounts, comments, or event RSVPs, add [Supabase](https://supabase.com) (free tier: Postgres + auth) and call it from specific interactive components — the rest of the site stays static. No rewrite needed.
