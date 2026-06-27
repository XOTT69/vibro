# Vibro

Український експериментальний застосунок для BLE-дебагу.

## Вебверсія

```bash
npm install
npm run dev
```

Вебверсія підходить для Chrome на Android або Desktop Chrome.

## iPhone

На iPhone використовуємо той самий React-інтерфейс, але запускаємо його як нативний застосунок через Capacitor + Xcode.

```bash
npm install
npm run ios
```

Деталі: [IOS_SETUP.md](./IOS_SETUP.md)

## Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Vercel потрібен для вебверсії. Для Bluetooth на iPhone потрібна iOS-збірка.
