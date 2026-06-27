# Vibro

Experimental PWA for BLE debugging and future custom control of Satisfyer Heated Affair.

## Important

This is an early prototype. It currently scans Bluetooth LE devices and lists services/characteristics.
Real Satisfyer commands still need to be discovered and added.

## Requirements

- Chrome on Android or Desktop Chrome
- HTTPS hosting, for example Vercel
- Bluetooth enabled

iOS/Safari does not support Web Bluetooth for direct PWA control.

## Local dev

```bash
npm install
npm run dev
```

Open the local URL in Chrome.

## Deploy to Vercel

1. Import this repository in Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.

## Next step

Run the app, press Connect / Scan, select the toy, and copy the Debug log.
Then we can add the exact Satisfyer BLE service/characteristic and commands.
