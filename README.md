# Panos Kokmotos – Personal Website

This repository contains the source code for **panoskokmotos.com**, your personal brand website.

## Tech stack

- **HTML / CSS / JavaScript** for the main single-page site (`index.html`, `style.css`, `script.js`, `chat.js`).
- **Cloudflare Worker** (`cloudflare-worker.js`) for edge routing/proxying between the front-end chat UI and AI backend.
- **GitHub Pages** + `CNAME` for deployment with custom domain.

## Main sections

- Hero + personal intro
- Journey / milestones (gamified timeline)
- Experience + media + LinkedIn cards
- Companies (formerly “Projects”)
- Press, education, books, skills, contact form

## Setup

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Brand & content checklist

- [x] Use real profile photo in hero, about, and favicon/apple touch icon.
- [x] Navigation order optimized (LinkedIn appears before Watch).
- [x] “Based in San Francisco, USA & Athens/Patras, Greece” copy update.
- [x] Skills expanded with AI-related tools.
- [x] Hobbies expanded (HYROX, CrossFit, Triathlon, Trail Running, Piano).
- [x] Better emoji usage and footer readability.
- [x] Improved subtle animations across cards.
- [x] “Projects” renamed to **Companies**.
- [ ] Replace LinkedIn card links with your **exact post URLs**.
- [ ] Replace Formspree endpoint if you want a different inbox owner.


## Domain troubleshooting

If `panoskokmotos.com` is not visible, follow the step-by-step runbook in [`DOMAIN_TROUBLESHOOTING.md`](./DOMAIN_TROUBLESHOOTING.md).

## Analytics

This site uses **Plausible Analytics** via script in `index.html`.

Where to see analytics:
1. Sign in at `https://plausible.io`.
2. Open the site project for `panoskokmotos.com`.
3. See dashboard metrics (visitors, top pages, referrers, countries, goals).

## GitHub profile and repository setup

### Make repository private
On GitHub: **Settings → General → Danger Zone → Change repository visibility → Make private**.

### Improve repository "About" section
On the repo homepage, click the **⚙️** next to About and add:
- Description: `Panos Kokmotos personal website — entrepreneur, builder, and social impact advocate.`
- Website: `https://panoskokmotos.com`
- Topics: `personal-website`, `portfolio`, `entrepreneurship`, `social-impact`, `givelink`, `forbes30under30`, `wef`

### Add Codex as collaborator
On GitHub: **Settings → Collaborators and teams → Add people** and invite the username you want to grant access to.
Use **Write** access if you want contribution support only, or **Admin** only if you fully trust the account.

### Protect main branch
On GitHub: **Settings → Branches → Add branch protection rule** for `main`.
Recommended:
- Require a pull request before merging.
- Require at least 1 approval.
- Require conversation resolution before merge.
- Restrict direct pushes.
- Require status checks to pass (if CI is enabled).
