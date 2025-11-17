<script>
  import SignInButton from './SignInButton.svelte';
  import { createAuthClient } from '../client.js';
  import { onMount } from 'svelte';
  
  let {
    callbackURL = '/',
    baseURL = undefined,
    title = 'Sign In to Hominio',
    subtitle = 'Join the alpha and help us build the future of purpose-driven startups.',
    onAlreadySignedIn = undefined
  } = $props();
  
  let loading = $state(true);
  
  const authClient = createAuthClient({ baseURL });
  
  onMount(async () => {
    // Check if user is already logged in
    const sessionData = await authClient.getSession();
    if (sessionData?.data?.user && onAlreadySignedIn) {
      onAlreadySignedIn();
      return;
    }
    loading = false;
  });
</script>

<div class="signin-container">
  <div class="signin-card">
    <div class="signin-header">
      <h1 class="signin-title">{title}</h1>
      <p class="signin-subtitle">{subtitle}</p>
    </div>

    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
      </div>
    {:else}
      <div class="signin-state">
        <SignInButton {callbackURL} {baseURL} />
        
        <div class="divider">
          <span>Alpha Access Only</span>
        </div>

        <p class="terms-text">
          By continuing, you agree to participate in the Hominio Alpha and help
          us build the future of co-ownership. You also agree to our{" "}
          <a href="/privacy-policy" class="terms-link">Privacy Policy</a>.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .signin-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #f0fffe 0%, #fff9e6 100%);
    position: relative;
  }

  .signin-card {
    width: 100%;
    max-width: 480px;
    background: white;
    border-radius: 24px;
    box-shadow:
      0 8px 32px rgba(79, 195, 195, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.05);
    padding: 3rem;
    border: 2px solid #4fc3c3;
  }

  .signin-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .signin-title {
    font-size: 2.5rem;
    font-weight: 900;
    color: #111827;
    margin: 0 0 1rem 0;
    letter-spacing: -0.02em;
  }

  .signin-subtitle {
    font-size: 1.125rem;
    line-height: 1.6;
    color: #6b7280;
    margin: 0;
  }

  .loading-state {
    text-align: center;
    padding: 3rem 0;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #4fc3c3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .signin-state {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 1rem 0;
  }

  .divider::before,
  .divider::after {
    content: "";
    position: absolute;
    top: 50%;
    width: calc(50% - 80px);
    height: 1px;
    background: #e5e7eb;
  }

  .divider::before {
    left: 0;
  }

  .divider::after {
    right: 0;
  }

  .divider span {
    display: inline-block;
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: white;
  }

  .terms-text {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #9ca3af;
    text-align: center;
    margin: 0;
  }

  .terms-link {
    color: #4fc3c3;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .terms-link:hover {
    color: #3db5ac;
  }

  @media (max-width: 640px) {
    .signin-container {
      padding: 1rem;
    }

    .signin-card {
      padding: 2rem 1.5rem;
    }

    .signin-title {
      font-size: 2rem;
    }

    .signin-subtitle {
      font-size: 1rem;
    }
  }
</style>


