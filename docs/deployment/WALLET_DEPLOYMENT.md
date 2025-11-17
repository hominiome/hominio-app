# Wallet Service Deployment Guide

This guide covers deploying the `hominio-wallet` service to Fly.io.

## Prerequisites

1. **Fly.io CLI installed**: [Install Fly CLI](https://fly.io/docs/flyctl/install/)
2. **Logged into Fly.io**: `flyctl auth login`
3. **GitHub Secrets configured**: See [GitHub Secrets Setup](#github-secrets-setup)

## Quick Start

### Deployment via GitHub Actions (Recommended)

**All deployments run automatically via GitHub Actions.** Simply push to `main` branch:

```bash
git push origin main
```

The workflow will automatically:
1. Build the wallet service
2. Set all environment variables from GitHub secrets
3. Deploy to Fly.io
4. Configure SSL certificate

**Note:** The `scripts/deploy-wallet.sh` script is only for initial setup (creating the Fly.io app, allocating IPs, etc.). After initial setup, all deployments are handled by GitHub Actions.

## Initial Setup (First Time Only)

If this is the first deployment, you need to create the Fly.io app:

```bash
# Create the app
flyctl apps create hominio-wallet --org personal

# Set primary region
flyctl regions set fra --app hominio-wallet

# Allocate IP addresses
flyctl ips allocate-v4 --app hominio-wallet
flyctl ips allocate-v6 --app hominio-wallet

# Set up SSL certificate (after DNS is configured)
flyctl certs create wallet.hominio.me --app hominio-wallet
```

## GitHub Secrets Setup

Configure the following secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PUBLIC_DOMAIN_ROOT` | Root domain | `hominio.me` |
| `PUBLIC_DOMAIN_APP` | App service domain | `app.hominio.me` |
| `PUBLIC_DOMAIN_WALLET` | Wallet service domain | `wallet.hominio.me` |
| `PUBLIC_DOMAIN_SYNC` | Sync service domain | `sync.hominio.me` |
| `AUTH_SECRET` | BetterAuth secret key | `your-secret-key-here` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `your-google-client-secret` |
| `WALLET_POSTGRES_SECRET` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `POLAR_API_KEY` | Polar API key (for customer sync only) | `your-polar-api-key` |
| `FLY_API_TOKEN` | Fly.io API token | Get from: `flyctl auth token` |

**Note:** Polar checkout and webhooks are handled by the legacy system for now. Dedicated services will be created later. Only customer creation on signup is handled by the wallet service.

### Setting Secrets in GitHub

1. Go to your repository on GitHub
2. Navigate to `Settings > Secrets and variables > Actions`
3. Click `New repository secret`
4. Add each secret with its name and value
5. Click `Add secret`

## DNS Configuration

After deploying, configure DNS records to point `wallet.hominio.me` to your Fly.io app.

### Step 1: Get Fly.io IP Addresses

```bash
flyctl ips list --app hominio-wallet
```

Example output:
```
TYPE  IP                  REGION  CREATED AT
v4    66.241.124.146     fra     2024-01-15T10:00:00Z
v6    2a09:8280:1::aa:d39:1  fra     2024-01-15T10:00:00Z
```

### Step 2: Add DNS Records

Add these DNS records in your DNS provider:

**Type A Record:**
```
Name: wallet
Type: A
Value: 66.241.124.146 (use your IPv4 address)
TTL: 300
```

**Type AAAA Record:**
```
Name: wallet
Type: AAAA
Value: 2a09:8280:1::aa:d39:1 (use your IPv6 address)
TTL: 300
```

### Step 3: Verify SSL Certificate

After DNS propagates (usually 5-60 minutes), verify the SSL certificate:

```bash
flyctl certs check wallet.hominio.me --app hominio-wallet
```

The certificate should show as "Issued" once DNS has propagated.

## Verification

After deployment and DNS configuration:

1. **Check app status:**
   ```bash
   flyctl status --app hominio-wallet
   ```

2. **View logs:**
   ```bash
   flyctl logs --app hominio-wallet
   ```

3. **Test the API:**
   ```bash
   curl https://wallet.hominio.me/api/auth
   ```

4. **Open in browser:**
   ```bash
   flyctl open --app hominio-wallet
   ```

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs for errors
2. Verify all GitHub secrets are set correctly
3. Check Fly.io app status: `flyctl status --app hominio-wallet`

### SSL Certificate Not Issuing

1. Verify DNS records are correct:
   ```bash
   dig wallet.hominio.me
   dig wallet.hominio.me AAAA
   ```

2. Check certificate status:
   ```bash
   flyctl certs check wallet.hominio.me --app hominio-wallet
   ```

3. If needed, recreate certificate:
   ```bash
   flyctl certs delete wallet.hominio.me --app hominio-wallet
   flyctl certs create wallet.hominio.me --app hominio-wallet
   ```

### Service Not Accessible

1. Check app logs: `flyctl logs --app hominio-wallet`
2. Verify environment variables: `flyctl secrets list --app hominio-wallet`
3. Check machine status: `flyctl machines list --app hominio-wallet`

## Environment Variables

All environment variables are managed via Fly.io secrets and set automatically by GitHub Actions. To manually set secrets:

```bash
flyctl secrets set \
  PUBLIC_DOMAIN_WALLET="wallet.hominio.me" \
  AUTH_SECRET="your-secret" \
  --app hominio-wallet
```

See [GitHub Secrets Setup](#github-secrets-setup) for the complete list.

## Related Documentation

- [DNS Configuration Guide](./WALLET_DNS_CONFIG.md)
- [Fly.io Documentation](https://fly.io/docs/)
- [BetterAuth Documentation](https://www.better-auth.com/docs)

