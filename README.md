# Vibro

Український експериментальний застосунок для BLE-дебагу.

## Запуск вебверсії

```bash
npm install
npm run dev
```

## Збірка для iPhone

Інструкція тут: [IOS_SETUP.md](./IOS_SETUP.md)

Команди:

```bash
npm install
npm run build
npm run cap:add:ios
npm run cap:sync
npm run ios
```

## Деплой на Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
