# Domain & GitHub Pages Troubleshooting (`panoskokmotos.com`)

If the site is not visible, the problem is usually DNS or GitHub Pages configuration, not the website source code.

## 1) Confirm GitHub Pages is enabled

In your repository:

1. `Settings` → `Pages`
2. `Source`: `Deploy from a branch`
3. Branch: `main` (or your live branch), folder: `/ (root)`
4. `Custom domain`: `panoskokmotos.com`
5. Save, then wait for Pages to rebuild.

The repo already contains a `CNAME` file with:

```txt
panoskokmotos.com
```

## 2) Use correct DNS records

At your DNS provider, set these records.

### Apex/root (`@`)
Use **A** records to GitHub Pages IPs:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Optional IPv6:

- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

### `www`
Create **CNAME**:

- `www` → `panoskokmotos.github.io`

> Avoid conflicting/extra A/CNAME records for the same host.

## 3) Remove conflicting records

Common issue: extra A records left from registrar parking/old host.

For `@`, keep only GitHub Pages IPs above.
For `www`, keep only the single CNAME above.

## 4) Verify DNS from terminal

Run:

```bash
dig +short A panoskokmotos.com
dig +short AAAA panoskokmotos.com
dig +short CNAME www.panoskokmotos.com
```

Expected:

- Apex includes GitHub IPs above.
- `www` resolves to `panoskokmotos.github.io` (possibly followed by GitHub edge names).

## 5) Verify HTTPS and response

```bash
curl -I https://panoskokmotos.com
curl -I https://www.panoskokmotos.com
```

Expected:

- HTTP 200 or a redirect chain ending in 200.
- Valid TLS cert (no browser warning).

## 6) If still broken

- Wait 5–30 minutes (sometimes up to 24h) for DNS/SSL propagation.
- In GitHub Pages settings, temporarily remove and re-add custom domain.
- Ensure no CDN proxy mode is interfering (if using Cloudflare DNS, start with DNS-only while debugging).

## 7) What is repo-side vs infra-side

- Repo-side (already done): static site files and `CNAME`.
- Infra-side (must be correct): DNS records, GitHub Pages domain setting, HTTPS provisioning.
