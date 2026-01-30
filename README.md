# Fastlane Redirect Service

A simple Express server that redirects QR code scans to Shopify checkout with the correct product based on time of day.

## Flow

```
[Customer scans QR code]
         ↓
   [Server checks time]
         ↓
   ┌─────┴─────┐
   ↓           ↓           ↓
8:30-9:30   11:30-1:30   Other times
   ↓           ↓             ↓
Redirect    Redirect    "Kitchen Closed"
to checkout to checkout     page
(breakfast) (lunch)
   ↓           ↓
[Customer pays on phone]
   (Apple Pay / Shop Pay)
         ↓
      [Done!]
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your store details:

```
SHOP_DOMAIN=your-store.myshopify.com
BREAKFAST_VARIANT_ID=12345678901234
LUNCH_VARIANT_ID=12345678901235
PORT=3000
```

### 3. Find your variant IDs

**Option A: From Shopify Admin URL**
1. Go to Products → Select product → Select variant
2. URL looks like: `.../products/123/variants/456`
3. The variant ID is `456`

**Option B: Using GraphQL**
```graphql
{
  products(first: 10) {
    edges {
      node {
        title
        variants(first: 5) {
          edges {
            node {
              id
              title
              legacyResourceId  # This is the numeric ID you need
            }
          }
        }
      }
    }
  }
}
```

### 4. Run the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Expose to internet (for QR codes)

For testing, use ngrok:

```bash
npx ngrok http 3000
```

This gives you a public URL like `https://abc123.ngrok.io`

### 6. Generate QR code

Create a QR code pointing to:
```
https://YOUR-NGROK-URL/fastlane
```

Use any QR generator:
- [qr-code-generator.com](https://www.qr-code-generator.com/)
- [goqr.me](https://goqr.me/)
- macOS: `qrencode -o qr.png "https://YOUR-URL/fastlane"`

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Home page with setup instructions |
| `/fastlane` | Main redirect endpoint (use for QR code) |
| `/closed` | Kitchen closed page |
| `/debug` | Shows current state without redirecting |
| `/health` | Health check / status |

## Testing

### Debug endpoint

Visit `/debug` to see what would happen without actually redirecting:

```json
{
  "currentTime": "9:15:30 AM",
  "timeInMinutes": 555,
  "period": "breakfast",
  "variantId": "12345678901234",
  "checkoutUrl": "https://your-store.myshopify.com/cart/12345678901234:1",
  "wouldRedirectTo": "https://your-store.myshopify.com/cart/12345678901234:1"
}
```

### Test different times

To test different time periods without waiting, temporarily modify the `getTimeInMinutes()` function:

```javascript
function getTimeInMinutes() {
  // Uncomment one of these to test:
  // return 9 * 60;      // 9:00 AM - breakfast
  // return 12 * 60;     // 12:00 PM - lunch
  // return 15 * 60;     // 3:00 PM - closed

  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
```

## Deployment Options

### Heroku

```bash
heroku create fastlane-redirect
heroku config:set SHOP_DOMAIN=your-store.myshopify.com
heroku config:set BREAKFAST_VARIANT_ID=123
heroku config:set LUNCH_VARIANT_ID=456
git push heroku main
```

### Vercel

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/index.js" }]
}
```

### Railway

```bash
railway init
railway up
```

## Customization

### Time windows

Edit the constants in `index.js`:

```javascript
const BREAKFAST_START = 8 * 60 + 30;  // 8:30 AM
const BREAKFAST_END = 9 * 60 + 30;    // 9:30 AM
const LUNCH_START = 11 * 60 + 30;     // 11:30 AM
const LUNCH_END = 13 * 60 + 30;       // 1:30 PM
```

### Adding more periods

1. Add new variant ID to `.env`
2. Add time window constants
3. Update `getCurrentMealPeriod()` to include new period
4. Update the redirect logic in `/fastlane` endpoint

## Troubleshooting

### "Checkout page shows empty cart"

The variant ID might be wrong. Double-check with `/debug` endpoint.

### "Product not available"

The product might be:
- Out of stock
- Not published to Online Store sales channel
- Archived or deleted

### QR code not working

1. Check that ngrok is still running
2. Verify the URL in the QR code matches your current ngrok URL
3. Test by visiting the URL directly in browser first
