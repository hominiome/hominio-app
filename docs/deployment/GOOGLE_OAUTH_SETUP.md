# Google OAuth Setup Guide

This guide explains how to set up Google OAuth credentials for the wallet service authentication.

## Credential Type

**Select: "OAuth client ID"** (not API key or Service account)

This is the second option in the dropdown: "Requests user consent so your app can access the user's data"

## Best Practice: Separate Clients for Production and Development

**⚠️ Recommended:** Create **two separate OAuth clients**:
1. **Production client** - for `wallet.hominio.me` and `app.hominio.me`
2. **Development client** - for `localhost:4201` and `localhost:4202`

This provides:
- ✅ Better security isolation (dev leaks don't affect production)
- ✅ Independent credential rotation
- ✅ Clear separation of environments
- ✅ Easier management

## Step-by-Step Setup

### 1. Configure OAuth Consent Screen (if not already done)

If this is your first OAuth client, you'll need to configure the consent screen first:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services > OAuth consent screen**
4. Choose **External** (unless you have a Google Workspace)
5. Fill in:
   - **App name**: `Hominio`
   - **User support email**: Your email
   - **Developer contact information**: Your email
6. Click **Save and Continue**
7. Skip scopes (click **Save and Continue**)
8. Add test users if needed (click **Save and Continue**)
9. Review and go back to dashboard

### 2. Create Production OAuth Client ID

1. Navigate to **APIs & Services > Credentials**
2. Click **"+ Create credentials" > "OAuth client ID"**
3. Select **Application type**: **"Web application"**
4. Fill in:

   **Name:**
   ```
   Hominio Wallet Auth (Production)
   ```

   **Authorized JavaScript origins:**
   ```
   https://wallet.hominio.me
   https://app.hominio.me
   ```

   **Authorized redirect URIs:**
   ```
   https://wallet.hominio.me/api/auth/callback/google
   ```

5. Click **Create**
6. **Copy the credentials immediately** (you won't see the secret again):
   - **Client ID** (e.g., `123456789-prod-abc.apps.googleusercontent.com`)
   - **Client secret** (e.g., `GOCSPX-prod-abc...`)

### 3. Create Development OAuth Client ID

1. Still in **Credentials**, click **"+ Create credentials" > "OAuth client ID"** again
2. Select **Application type**: **"Web application"**
3. Fill in:

   **Name:**
   ```
   Hominio Wallet Auth (Development)
   ```

   **Authorized JavaScript origins:**
   ```
   http://localhost:4201
   http://localhost:4202
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:4201/api/auth/callback/google
   ```

4. Click **Create**
5. **Copy the credentials immediately**:
   - **Client ID** (e.g., `123456789-dev-xyz.apps.googleusercontent.com`)
   - **Client secret** (e.g., `GOCSPX-dev-xyz...`)

### 4. Add to GitHub Secrets (Production Only)

Add the **production credentials** to your GitHub repository secrets (`Settings > Secrets and variables > Actions`):

- **`GOOGLE_CLIENT_ID`** = Production Client ID
- **`GOOGLE_CLIENT_SECRET`** = Production Client secret

**Note:** Development credentials go in your local `.env` file, not GitHub secrets.

### 5. Configure Local Development (.env)

Add the **development credentials** to your local `.env` file (root of the monorepo):

```bash
# Development Google OAuth (for localhost)
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-client-secret
```

**⚠️ Important:** Never commit `.env` to git - it's already in `.gitignore`.

## Redirect URI Explanation

BetterAuth automatically creates the callback endpoint at:
- **Production**: `https://wallet.hominio.me/api/auth/callback/google`
- **Development**: `http://localhost:4201/api/auth/callback/google`

The OAuth flow works like this:
1. User clicks "Sign in with Google" on `app.hominio.me` (or `localhost:4202`)
2. User is redirected to Google for authentication
3. Google redirects back to `wallet.hominio.me/api/auth/callback/google`
4. BetterAuth processes the callback and sets cookies
5. User is redirected back to the app service

## Authorized Origins Explanation

**Authorized JavaScript origins** are the domains that can initiate the OAuth flow:

- `https://wallet.hominio.me` - Wallet service (auth API)
- `https://app.hominio.me` - App service (where users sign in)
- `http://localhost:4201` - Local wallet service (dev)
- `http://localhost:4202` - Local app service (dev)

**Authorized redirect URIs** are where Google sends users after authentication:

- `https://wallet.hominio.me/api/auth/callback/google` - Production callback
- `http://localhost:4201/api/auth/callback/google` - Development callback

## Testing

After setting up:

1. **Local testing:**
   ```bash
   # Make sure your .env has DEVELOPMENT credentials:
   GOOGLE_CLIENT_ID=your-dev-client-id
   GOOGLE_CLIENT_SECRET=your-dev-client-secret
   
   # Start services
   bun dev
   
   # Visit http://localhost:4202/signin
   # Click "Sign in with Google"
   # Should redirect to Google and back
   ```

2. **Production testing:**
   - Ensure GitHub secrets have PRODUCTION credentials
   - Deploy via GitHub Actions
   - Visit `https://app.hominio.me/signin`
   - Click "Sign in with Google"
   - Should redirect to Google and back

## Troubleshooting

### "Redirect URI mismatch" Error

- Make sure the redirect URI in Google Console **exactly matches**:
  - Production: `https://wallet.hominio.me/api/auth/callback/google`
  - Development: `http://localhost:4201/api/auth/callback/google`
- Check for trailing slashes or typos
- Wait a few minutes after updating (Google caches settings)

### "Origin mismatch" Error

- Verify all authorized JavaScript origins are added
- Make sure you're accessing from an authorized origin
- Check that HTTPS is used in production (not HTTP)

### Can't See Client Secret

- If you didn't copy it, you'll need to create a new OAuth client
- Secrets are only shown once during creation
- Consider using Google Secret Manager for production secrets

## Security Best Practices

1. **Never commit secrets to git** - Use GitHub Secrets
2. **Use different credentials for dev/prod** - Create separate OAuth clients
3. **Restrict redirect URIs** - Only add the exact URIs you need
4. **Rotate secrets regularly** - Update credentials periodically
5. **Monitor usage** - Check Google Cloud Console for suspicious activity

## Related Documentation

- [BetterAuth Google Provider Docs](https://www.better-auth.com/docs/providers/google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

