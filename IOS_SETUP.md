# iPhone / iOS запуск

PWA у Safari на iPhone не має прямого доступу до Web Bluetooth, тому для реального керування Bluetooth-пристроєм потрібна нативна збірка через Capacitor + Xcode.

## Що потрібно

- Mac із Xcode
- Node.js
- Реальний iPhone для тесту
- Apple ID / Apple Developer акаунт для підпису застосунку

## Встановлення

```bash
npm install
npm run build
npm run cap:add:ios
npm run cap:sync
npm run ios
```

Після `npm run ios` відкриється Xcode.

## Обов'язково в Xcode

У файлі `ios/App/App/Info.plist` додай опис дозволу Bluetooth:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Vibro використовує Bluetooth для підключення до вашого пристрою.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Vibro використовує Bluetooth для підключення до вашого пристрою.</string>
```

Потім:

1. В Xcode вибери `App` → `Signing & Capabilities`.
2. Обери свою Team.
3. Підключи iPhone кабелем.
4. Натисни Run.

## Як тестувати Satisfyer

1. Заряди й увімкни Satisfyer.
2. Закрий офіційний застосунок Satisfyer Connect, щоб він не тримав Bluetooth-з'єднання.
3. Запусти Vibro на iPhone.
4. Натисни `Підключити / сканувати`.
5. Обери пристрій.
6. Скопіюй Debug log і збережи UUID сервісів/характеристик.

Реальні команди Satisfyer ще треба підібрати. Поточний повзунок надсилає тестові байти `[0..100]` у вибрану writable characteristic.
