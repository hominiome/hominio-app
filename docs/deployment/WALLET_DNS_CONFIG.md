# DNS Configuration for wallet.hominio.me

This document provides DNS configuration instructions for the `hominio-wallet` service deployed to Fly.io.

## Overview

The wallet service runs on Fly.io as `hominio-wallet` and should be accessible at `wallet.hominio.me`.

## DNS Records

After deploying the wallet service to Fly.io, you need to configure DNS records to point `wallet.hominio.me` to the Fly.io app.

### Step 1: Get Fly.io IP Addresses

First, get the IP addresses assigned to your Fly.io app:

```bash
flyctl ips list --app hominio-wallet
```

This will show you the IPv4 and IPv6 addresses assigned to your app. Example output:

```
TYPE  IP                  REGION  CREATED AT
v4    66.241.124.146     fra     2024-01-15T10:00:00Z
v6    2a09:8280:1::aa:d39:1  fra     2024-01-15T10:00:00Z
```

### Step 2: Configure DNS Records

Add the following DNS records in your DNS provider (wherever `hominio.me` is managed):

#### Option A: Direct A/AAAA Records (Recommended)

**For wallet.hominio.me:**

```
Type: A
Name: wallet
Value: [IPv4_ADDRESS_FROM_FLY_IO]
TTL: 300 (or your preferred TTL)

Type: AAAA
Name: wallet
Value: [IPv6_ADDRESS_FROM_FLY_IO]
TTL: 300 (or your preferred TTL)
```

**Example:**
```
Type: A
Name: wallet
Value: 66.241.124.146
TTL: 300

Type: AAAA
Name: wallet
Value: 2a09:8280:1::aa:d39:1
TTL: 300
```

#### Option B: CNAME Record (Alternative)

If your DNS provider supports CNAME for subdomains:

```
Type: CNAME
Name: wallet
Value: hominio-wallet.fly.dev
TTL: 300
```

**Note:** CNAME records may have limitations depending on your DNS provider. A/AAAA records are generally more reliable.

### Step 3: Verify SSL Certificate

After DNS records are configured and propagated (usually takes a few minutes to hours), verify the SSL certificate:

```bash
flyctl certs check wallet.hominio.me --app hominio-wallet
```

The certificate should show as "Issued" once DNS has propagated and Fly.io can verify domain ownership.

### Step 4: Test the Service

Once DNS has propagated and the certificate is issued, test the service:

```bash
curl https://wallet.hominio.me/api/auth
```

You should receive a response from the BetterAuth API.

## DNS Propagation

DNS changes typically propagate within:
- **Minimum:** 5-15 minutes
- **Typical:** 1-4 hours
- **Maximum:** 24-48 hours (rare)

You can check DNS propagation status using:
- https://dnschecker.org/
- https://www.whatsmydns.net/

## Troubleshooting

### Certificate Not Issuing

If the SSL certificate doesn't issue after DNS propagation:

1. Verify DNS records are correct:
   ```bash
   dig wallet.hominio.me
   dig wallet.hominio.me AAAA
   ```

2. Check certificate status:
   ```bash
   flyctl certs check wallet.hominio.me --app hominio-wallet
   ```

3. If needed, recreate the certificate:
   ```bash
   flyctl certs delete wallet.hominio.me --app hominio-wallet
   flyctl certs create wallet.hominio.me --app hominio-wallet
   ```

### Service Not Accessible

If the service is not accessible after DNS configuration:

1. Check app status:
   ```bash
   flyctl status --app hominio-wallet
   ```

2. Check logs:
   ```bash
   flyctl logs --app hominio-wallet
   ```

3. Verify the service is running:
   ```bash
   flyctl machines list --app hominio-wallet
   ```

## GitHub Secrets Required

Make sure the following secrets are configured in GitHub Actions:

- `PUBLIC_DOMAIN_ROOT` - Root domain (e.g., `hominio.me`)
- `PUBLIC_DOMAIN_APP` - App service domain (e.g., `app.hominio.me`)
- `PUBLIC_DOMAIN_WALLET` - Wallet service domain (e.g., `wallet.hominio.me`)
- `PUBLIC_DOMAIN_SYNC` - Sync service domain (e.g., `sync.hominio.me`)
- `AUTH_SECRET` - BetterAuth secret key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `WALLET_POSTGRES_SECRET` - PostgreSQL connection string
- `POLAR_API_KEY` - Polar API key (for customer sync only)
- `FLY_API_TOKEN` - Fly.io API token

**Note:** Polar checkout and webhooks are handled by the legacy system for now. Dedicated services will be created later. Only customer creation on signup is handled by the wallet service.

## Related Documentation

- [Fly.io DNS Documentation](https://fly.io/docs/reference/dns/)
- [Fly.io Custom Domains](https://fly.io/docs/reference/certificates/)
- [BetterAuth Cross-Subdomain Cookies](https://www.better-auth.com/docs/configuration/cookies)

