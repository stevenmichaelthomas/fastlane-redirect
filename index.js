require('dotenv').config();
const express = require('express');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (logo, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Configuration - direct ShopCode URLs
const BREAKFAST_URL = process.env.BREAKFAST_URL;
const LUNCH_URL = process.env.LUNCH_URL;

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

// Main fastlane redirect endpoint - uses CLIENT-SIDE time detection
app.get('/fastlane', (req, res) => {
  console.log(`[${new Date().toISOString()}] Fastlane request`);

  // Serve a page that checks user's local time and redirects accordingly
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Redirecting...</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: black;
          color: #7FBF3A;
          padding: 20px;
        }
        .container { text-align: center; }
        .logo { width: 60px; height: auto; margin-bottom: 16px; }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(127,191,58,0.3);
          border-top-color: #7FBF3A;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="/logo.png" alt="HD" class="logo">
        <div class="spinner"></div>
        <p>Checking menu availability...</p>
      </div>
      <script>
        // Time windows (in minutes from midnight) - LOCAL TIME
        const BREAKFAST_START = 8 * 60 + 30;  // 8:30 AM
        const BREAKFAST_END = 10 * 60 + 0;    // 10:00 AM
        const LUNCH_START = 11 * 60 + 0;     // 11:00 AM
        const LUNCH_END = 13 * 60 + 30;       // 1:30 PM

        const now = new Date();
        const timeInMinutes = now.getHours() * 60 + now.getMinutes();

        let redirectUrl;
        if (timeInMinutes >= BREAKFAST_START && timeInMinutes < BREAKFAST_END) {
          redirectUrl = ${JSON.stringify(BREAKFAST_URL)};
        } else if (timeInMinutes >= LUNCH_START && timeInMinutes < LUNCH_END) {
          redirectUrl = ${JSON.stringify(LUNCH_URL)};
        } else {
          redirectUrl = '/closed';
        }

        // Small delay so user sees the spinner briefly
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 300);
      </script>
    </body>
    </html>
  `);
});

// Kitchen closed page
app.get('/closed', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Payment Closed</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: black;
          color: #7FBF3A;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 400px;
        }
        .logo { width: 60px; height: auto; margin-bottom: 16px; }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        .times {
          background: rgba(127,191,58,0.1);
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
        <img src="/logo.png" alt="HD" class="logo">
        <h1>Payment Closed</h1>
        <div class="times">
          <div class="period">
            <span class="period-name">Breakfast</span><br>
            8:30 AM - 10:00 AM
          </div>
          <div class="period">
            <span class="period-name">Lunch</span><br>
            11:00 AM - 1:30 PM
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
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    configured: {
      breakfast: !!BREAKFAST_URL,
      lunch: !!LUNCH_URL
    }
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Debug Info</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { margin-bottom: 20px; }
        h2 { margin-bottom: 12px; font-size: 1.2rem; }
        .info { margin: 8px 0; }
        .label { font-weight: bold; color: #666; }
        .value { font-family: monospace; }
        .open { color: #4caf50; font-weight: bold; }
        .closed { color: #f44336; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Debug Info</h1>
      <div class="card">
        <h2>Your Local Time</h2>
        <div class="info">
          <span class="label">Time:</span>
          <span class="value" id="localTime"></span>
        </div>
        <div class="info">
          <span class="label">Timezone:</span>
          <span class="value" id="timezone"></span>
        </div>
        <div class="info">
          <span class="label">Current Period:</span>
          <span id="period"></span>
        </div>
        <div class="info">
          <span class="label">Would Redirect To:</span>
          <span class="value" id="redirectUrl"></span>
        </div>
      </div>
      <div class="card">
        <h2>Time Windows</h2>
        <div class="info">Breakfast: 8:30 AM - 10:00 AM</div>
        <div class="info">Lunch: 11:00 AM - 1:30 PM</div>
      </div>
      <div class="card">
        <h2>Server Info</h2>
        <div class="info">
          <span class="label">Server Time:</span>
          <span class="value">${new Date().toISOString()}</span>
        </div>
      </div>
      <script>
        const BREAKFAST_START = 8 * 60 + 30;
        const BREAKFAST_END = 10 * 60 + 0;
        const LUNCH_START = 11 * 60 + 0;
        const LUNCH_END = 13 * 60 + 30;

        const now = new Date();
        const timeInMinutes = now.getHours() * 60 + now.getMinutes();

        document.getElementById('localTime').textContent = now.toLocaleTimeString();
        document.getElementById('timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;

        let period, redirectUrl;
        if (timeInMinutes >= BREAKFAST_START && timeInMinutes < BREAKFAST_END) {
          period = 'breakfast';
          redirectUrl = ${JSON.stringify(BREAKFAST_URL)};
        } else if (timeInMinutes >= LUNCH_START && timeInMinutes < LUNCH_END) {
          period = 'lunch';
          redirectUrl = ${JSON.stringify(LUNCH_URL)};
        } else {
          period = 'closed';
          redirectUrl = '/closed';
        }

        const periodEl = document.getElementById('period');
        periodEl.textContent = period.charAt(0).toUpperCase() + period.slice(1);
        periodEl.className = period === 'closed' ? 'closed' : 'open';
        document.getElementById('redirectUrl').textContent = redirectUrl;
      </script>
    </body>
    </html>
  `);
});

// Home page with live QR code
app.get('/', (req, res) => {
  const serverUrl = req.protocol + '://' + req.get('host');
  const fastlaneUrl = `${serverUrl}/fastlane`;
  // Use QR Server API to generate QR code
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fastlaneUrl)}`;

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
        h1 { margin-bottom: 20px; text-align: center; }
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .card h2 { margin-bottom: 12px; font-size: 1.2rem; }
        .qr-container {
          text-align: center;
          padding: 20px;
        }
        .qr-container img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .qr-url {
          margin-top: 16px;
          padding: 12px;
          background: #e8e8e8;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.85rem;
          word-break: break-all;
        }
        ul { margin-left: 20px; margin-top: 10px; }
        li { margin: 8px 0; }
        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
        }
        .status.open { background: #c8e6c9; color: #2e7d32; }
        .status.closed { background: #ffcdd2; color: #c62828; }
      </style>
    </head>
    <body>
      <h1>Fastlane Checkout</h1>

      <div class="card qr-container">
        <h2>Scan to Order</h2>
        <img src="${qrCodeUrl}" alt="QR Code for Fastlane Checkout" width="300" height="300">
        <div class="qr-url">${fastlaneUrl}</div>
        <p style="margin-top: 16px; color: #666;">
          Current status: <span class="status" id="status"></span>
        </p>
      </div>

      <div class="card">
        <h2>Order Times</h2>
        <ul>
          <li><strong>Breakfast:</strong> 8:30 AM - 10:00 AM</li>
          <li><strong>Lunch:</strong> 11:00 AM - 1:30 PM</li>
        </ul>
      </div>

      <div class="card">
        <h2>Direct Links</h2>
        <ul>
          <li><a href="/breakfast">Breakfast checkout</a> (bypasses time check)</li>
          <li><a href="/lunch">Lunch checkout</a> (bypasses time check)</li>
          <li><a href="/debug">Debug info</a></li>
        </ul>
      </div>

      <script>
        const BREAKFAST_START = 8 * 60 + 30;
        const BREAKFAST_END = 10 * 60 + 0;
        const LUNCH_START = 11 * 60 + 0;
        const LUNCH_END = 13 * 60 + 30;

        function updateStatus() {
          const now = new Date();
          const timeInMinutes = now.getHours() * 60 + now.getMinutes();
          const statusEl = document.getElementById('status');

          if (timeInMinutes >= BREAKFAST_START && timeInMinutes < BREAKFAST_END) {
            statusEl.textContent = 'Breakfast Open';
            statusEl.className = 'status open';
          } else if (timeInMinutes >= LUNCH_START && timeInMinutes < LUNCH_END) {
            statusEl.textContent = 'Lunch Open';
            statusEl.className = 'status open';
          } else {
            statusEl.textContent = 'Closed';
            statusEl.className = 'status closed';
          }
        }

        updateStatus();
        setInterval(updateStatus, 60000); // Update every minute
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`
Fastlane Redirect Service running on port ${PORT}
- Home/QR:  http://localhost:${PORT}/
- Fastlane: http://localhost:${PORT}/fastlane
- Debug:    http://localhost:${PORT}/debug
  `);
});
