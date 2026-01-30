require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration - direct ShopCode URLs
const BREAKFAST_URL = process.env.BREAKFAST_URL;
const LUNCH_URL = process.env.LUNCH_URL;

// Time windows (in minutes from midnight)
const BREAKFAST_START = 8 * 60 + 30;  // 8:30 AM
const BREAKFAST_END = 9 * 60 + 30;    // 9:30 AM
const LUNCH_START = 11 * 60 + 30;     // 11:30 AM
const LUNCH_END = 13 * 60 + 30;       // 1:30 PM

function getTimeInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCurrentMealPeriod() {
  const timeInMinutes = getTimeInMinutes();

  if (timeInMinutes >= BREAKFAST_START && timeInMinutes < BREAKFAST_END) {
    return 'breakfast';
  } else if (timeInMinutes >= LUNCH_START && timeInMinutes < LUNCH_END) {
    return 'lunch';
  }
  return 'closed';
}

// Direct breakfast redirect (bypasses time check)
app.get('/breakfast', (req, res) => {
  console.log(`[DIRECT] Breakfast redirect`);
  if (!BREAKFAST_URL) {
    return res.redirect('/error');
  }
  res.redirect(BREAKFAST_URL);
});

// Direct lunch redirect (bypasses time check)
app.get('/lunch', (req, res) => {
  console.log(`[DIRECT] Lunch redirect`);
  if (!LUNCH_URL) {
    return res.redirect('/error');
  }
  res.redirect(LUNCH_URL);
});

// Main fastlane redirect endpoint
app.get('/fastlane', (req, res) => {
  const period = getCurrentMealPeriod();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  console.log(`[${timeStr}] Fastlane request - Period: ${period}`);

  if (period === 'closed') {
    return res.redirect('/closed');
  }

  let redirectUrl;
  if (period === 'breakfast') {
    redirectUrl = BREAKFAST_URL;
  } else if (period === 'lunch') {
    redirectUrl = LUNCH_URL;
  }

  if (!redirectUrl) {
    console.error('URL not configured for period:', period);
    return res.redirect('/error');
  }

  console.log(`Redirecting to: ${redirectUrl}`);
  res.redirect(redirectUrl);
});

// Kitchen closed page
app.get('/closed', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Kitchen Closed</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 400px;
        }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        .times {
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }
        .period { margin: 10px 0; }
        .period-name { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Kitchen Closed</h1>
        <p>Orders are available during:</p>
        <div class="times">
          <div class="period">
            <span class="period-name">Breakfast</span><br>
            8:30 AM - 9:30 AM
          </div>
          <div class="period">
            <span class="period-name">Lunch</span><br>
            11:30 AM - 1:30 PM
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Error page
app.get('/error', (req, res) => {
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .container { text-align: center; }
        h1 { color: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Something went wrong</h1>
        <p>Please try again or ask staff for assistance.</p>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  const period = getCurrentMealPeriod();
  res.json({
    status: 'ok',
    currentPeriod: period,
    configured: {
      breakfast: !!BREAKFAST_URL,
      lunch: !!LUNCH_URL
    }
  });
});

// Debug endpoint - shows what would happen without redirecting
app.get('/debug', (req, res) => {
  const period = getCurrentMealPeriod();
  const now = new Date();

  let redirectUrl = null;
  if (period === 'breakfast') {
    redirectUrl = BREAKFAST_URL;
  } else if (period === 'lunch') {
    redirectUrl = LUNCH_URL;
  }

  res.json({
    currentTime: now.toLocaleTimeString(),
    timeInMinutes: getTimeInMinutes(),
    period,
    redirectUrl,
    wouldRedirectTo: period === 'closed' ? '/closed' : redirectUrl,
    timeWindows: {
      breakfast: { start: '8:30 AM', end: '9:30 AM' },
      lunch: { start: '11:30 AM', end: '1:30 PM' }
    }
  });
});

// Home page with QR code instructions
app.get('/', (req, res) => {
  const serverUrl = req.protocol + '://' + req.get('host');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Fastlane Checkout</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f5f5f5;
        }
        h1 { margin-bottom: 20px; }
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .card h2 { margin-bottom: 12px; font-size: 1.2rem; }
        code {
          background: #e8e8e8;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .url { word-break: break-all; }
        ul { margin-left: 20px; margin-top: 10px; }
        li { margin: 8px 0; }
      </style>
    </head>
    <body>
      <h1>Fastlane Checkout Service</h1>

      <div class="card">
        <h2>QR Code URL</h2>
        <p>Generate a QR code pointing to:</p>
        <p class="url"><code>${serverUrl}/fastlane</code></p>
      </div>

      <div class="card">
        <h2>How It Works</h2>
        <ul>
          <li>Customer scans QR code</li>
          <li>Server checks time of day</li>
          <li>Redirects to checkout with correct product</li>
          <li>Customer pays on their phone</li>
        </ul>
      </div>

      <div class="card">
        <h2>Useful Links</h2>
        <ul>
          <li><a href="/debug">Debug info</a> - See current state</li>
          <li><a href="/health">Health check</a> - API status</li>
          <li><a href="/fastlane">Test redirect</a> - Simulate scan</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Fastlane Redirect Service Running      ║
╠════════════════════════════════════════════╣
║  Local:   http://localhost:${PORT}             ║
║  QR URL:  http://localhost:${PORT}/fastlane    ║
╠════════════════════════════════════════════╣
║  Debug:   http://localhost:${PORT}/debug       ║
║  Health:  http://localhost:${PORT}/health      ║
╚════════════════════════════════════════════╝

For external access, use ngrok:
  npx ngrok http ${PORT}

Then generate QR code for: https://YOUR-NGROK-URL/fastlane
  `);
});
