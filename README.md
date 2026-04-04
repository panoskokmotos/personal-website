# 👨‍💼 Panos Kokmotos – Personal Website

[![Portfolio](https://img.shields.io/badge/Live%20Portfolio-panoskokmotos.com-blue?style=for-the-badge)](https://panoskokmotos.com)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-181717?style=for-the-badge&logo=github)](https://pages.github.com/)
[![Built with](https://img.shields.io/badge/Built%20with-HTML%20%7C%20CSS%20%7C%20JavaScript-orange?style=flat-square)](https://github.com/panoskokmotos/personal-website)

A modern, performant personal portfolio website showcasing professional journey, projects, and expertise.

**Live Site**: [panoskokmotos.com](https://panoskokmotos.com)

---

## 🎯 Overview

This repository contains the complete source code for my personal portfolio website, built with modern web technologies and deployed on GitHub Pages with a custom domain.

### 🚀 What's Featured

- 👤 **Professional Profile** – About me, background, and expertise
- 🏢 **Companies** – Organizations and projects I've founded/worked on
- 📚 **Experience & Media** – Highlights from my career journey
- 🎓 **Education** – Academic background and certifications
- 🛠️ **Skills** – Technical expertise and tools I work with
- 🏆 **Press & Recognition** – Media features and awards
- 📖 **Featured Reading** – Books that shaped my thinking
- 💬 **Contact Form** – Get in touch directly

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **HTML 5** | Semantic markup |
| **CSS 3** | Modern responsive styling |
| **JavaScript** | Interactive components & chat |
| **Cloudflare Worker** | Edge computing for routing |
| **GitHub Pages** | Static hosting |
| **Plausible Analytics** | Privacy-first analytics |
| **Formspree** | Email form submissions |

---

## 📁 Project Structure

```
personal-website/
├── index.html              # Main page (single-page app)
├── style.css               # Global styles & components
├── script.js               # Main JavaScript logic
├── chat.js                 # Chat UI component
├── CNAME                   # Custom domain (panoskokmotos.com)
├── DOMAIN_TROUBLESHOOTING.md
├── _config.yml             # Jekyll config (GitHub Pages)
├── public/
│   ├── favicon.ico         # Favicon
│   ├── apple-touch-icon.png # iOS bookmark icon
│   └── assets/             # Images and media
└── README.md               # This file
```

---

## 🚀 Installation & Setup

### Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/panoskokmotos/personal-website.git
cd personal-website

# 2. Start a local web server
# Option A: Python 3
python3 -m http.server 4173

# Option B: Node.js (http-server)
npx http-server . -p 4173

# Option C: VS Code Live Server extension
# Right-click index.html → "Open with Live Server"

# 3. Open browser
# Visit http://localhost:4173
```

### Development Tips

- **Hot Reload**: Use VS Code Live Server or similar for auto-refresh
- **Testing Forms**: Use Formspree test endpoint before production
- **Browser DevTools**: Inspect responsive design at different breakpoints

---

## 🌐 Deployment

### GitHub Pages Setup

#### Option 1: Automatic Deployment (Recommended)

```bash
# GitHub Pages automatically deploys from main branch
git push origin main
# Check repository → Settings → Pages to verify deployment
```

#### Option 2: Using GitHub Actions

Repository is configured for automatic deployment via GitHub Actions:
1. Push to `main` branch
2. GitHub Actions automatically builds and deploys
3. Live site updates within seconds

### Custom Domain Setup

The site is configured with a custom domain: **panoskokmotos.com**

#### DNS Configuration

Add these DNS records to your domain provider:

```
Type: CNAME
Name: www
Value: panoskokmotos.github.io

Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

#### GitHub Pages Settings

1. Repository → **Settings** → **Pages**
2. Source: Deploy from a branch
3. Branch: `main` / root
4. Custom domain: `panoskokmotos.com`
5. ✅ Enforce HTTPS

**Need Help?** See [`DOMAIN_TROUBLESHOOTING.md`](./DOMAIN_TROUBLESHOOTING.md)

---

## 📝 Content & Brand Checklist

### Profile & About
- [x] Professional photo in hero, about, and favicon
- [x] Updated bio and professional description
- [x] Location: San Francisco, USA & Athens/Patras, Greece
- [x] Current role: Founder @ Givelink

### Skills
- [x] Core technical skills (TypeScript, React, Python)
- [x] AI/ML tools (ChatGPT, IRIS, v0.app)
- [x] Product & operational tools

### Experience
- [x] Career highlights and milestones
- [x] LinkedIn profile integration
- [x] Media features and press
- [x] Awards & recognition

### Personal Brand
- [x] Companies section showcasing ventures
- [x] Books that shaped my thinking
- [x] Hobbies: HYROX, CrossFit, Triathlon, Trail Running, Piano
- [x] Social links (LinkedIn, GitHub, Twitter, etc.)

### To-Do
- [ ] Update LinkedIn post URLs in media section
- [ ] Add new press features
- [ ] Update Formspree endpoint if needed
- [ ] Refresh analytics dashboard

---

## 📊 Analytics

### Plausible Analytics Setup

**Privacy-first analytics** (no cookie banners needed!)

```html
<!-- Already configured in index.html -->
<script defer data-domain="panoskokmotos.com" src="https://plausible.io/js/script.js"></script>
```

**View Analytics:**
1. Sign in: https://plausible.io
2. Open project: `panoskokmotos.com`
3. See metrics: visitors, top pages, referrers, countries, goals

---

## 💬 Contact Form

Powered by **Formspree** – emails sent to your inbox

```html
<!-- Already configured in index.html -->
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>
```

### Update Formspree Endpoint
1. Visit https://formspree.io
2. Create new form or use existing
3. Get your form ID: `f/xxxxxxxxxxxx`
4. Update `chat.js` with new form ID

---

## 🔐 Security Best Practices

- ✅ HTTPS enforced
- ✅ No sensitive data in frontend
- ✅ Form submissions via Formspree
- ✅ Analytics privacy-first (Plausible)
- ✅ No tracking cookies
- ✅ Regular security updates

---

## 📱 Responsive Design

Optimized for all devices:

| Device | Size | Status |
|--------|------|--------|
| Mobile | 320px - 640px | ✅ Optimized |
| Tablet | 641px - 1024px | ✅ Responsive |
| Desktop | 1025px+ | ✅ Full width |
| Wide Screens | 1280px+ | ✅ Centered layout |

---

## ⚡ Performance

- **Page Load**: ~1.5 seconds
- **Lighthouse Score**: 95+
- **No JavaScript frameworks** for faster load times
- **Optimized images** with modern formats
- **Minified CSS/JS** for production

**Test Performance**: https://pagespeed.web.dev/

---

## 🔄 Updating Content

### Edit in GitHub Web Editor

1. Navigate to `index.html`
2. Click the **✏️ pencil** icon
3. Make changes
4. Commit with message
5. Changes deploy automatically

### Edit Locally

```bash
# 1. Edit files locally
# 2. Test with local server
python3 -m http.server 4173

# 3. Commit and push
git add .
git commit -m "Update content"
git push origin main

# 4. Verify deployment
# Visit https://panoskokmotos.com
```

---

## 🎨 Customization

### Colors & Styling

Edit `style.css` variables:

```css
:root {
  --primary-color: #0a66c2;     /* LinkedIn Blue */
  --accent-color: #ff6b6b;      /* Accent color */
  --text-primary: #1a1a1a;      /* Dark text */
  --text-secondary: #666;       /* Gray text */
  --background: #ffffff;        /* Background */
}
```

### Sections to Customize

- **Hero**: Update tagline and CTA button
- **About**: Update bio and profile photo
- **Skills**: Add/remove skills and expertise
- **Companies**: Update projects and links
- **Press**: Add new media features
- **Books**: Update reading list
- **Contact**: Update email and social links

---

## 🚀 SEO Optimization

Already configured:
- ✅ Meta tags for open graph
- ✅ Semantic HTML structure
- ✅ Mobile-friendly viewport
- ✅ Sitemap optimization
- ✅ Fast page load times
- ✅ Canonical URLs

---

## 📦 Available Scripts

| Command | Description |
|---------|------------|
| Local dev | `python3 -m http.server 4173` |
| Test build | Open `index.html` in browser |
| Deploy | `git push origin main` |
| Analytics | Visit https://plausible.io |

---

## 🤝 Contributing

Have suggestions? Open an issue or submit a PR!

1. Fork repository
2. Create feature branch: `git checkout -b improvement/amazing-idea`
3. Commit: `git commit -m 'Add improvement'`
4. Push: `git push origin improvement/amazing-idea`
5. Open Pull Request

---

## 📞 Support & Contact

- 💬 **Chat**: Use contact form on website
- 📧 **Email**: panos@givelink.app
- 🔗 **LinkedIn**: https://www.linkedin.com/in/panoskokmotos/
- 🐙 **GitHub**: https://github.com/panoskokmotos

---

## 📝 License

MIT License – see LICENSE file

---

## 🔗 Related Projects

- [GitHub Profile Repo](https://github.com/panoskokmotos/panoskokmotos)
- [Admin Deliveries](https://github.com/panoskokmotos/admin-deliveries)
- [Admin Design System](https://github.com/panoskokmotos/admin-design)
- [Givelink Platform](https://givelink.app)

---

## 📈 Changelog

### April 2026
- Enhanced README with comprehensive setup instructions
- Updated tech stack documentation
- Added GitHub Pages deployment guide
- Improved customization sections

### Previous Updates
- Added responsive design
- Implemented analytics (Plausible)
- Set up contact form (Formspree)
- Optimized performance

---

**Status**: Active Maintenance  
**Last Updated**: April 2026  
**Deployed**: [panoskokmotos.com](https://panoskokmotos.com)