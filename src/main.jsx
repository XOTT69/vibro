import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, Bluetooth, Clipboard, Smartphone, Square, Waves } from 'lucide-react';
import './style.css';

const COMMON_OPTIONAL_SERVICES = [
  '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
  '0000180f-0000-1000-8000-00805f9b34fb', // Battery
  '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
  '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
];

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function parseHex(input) {
  return input
    .replace(/0x/gi, '')
    .split(/[\s,;:-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 16))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 255);
}

function dataViewFromBytes(bytes) {
  const array = Uint8Array.from(bytes);
  return new DataView(array.buffer);
}

function getPropertyList(properties = {}) {
  if (!properties) return '';
  if (Array.isArray(properties)) return properties.join(', ');
  return Object.keys(properties).filter((key) => properties[key]).join(', ');
}

async function detectNativeRuntime() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
    };
  } catch {
    return { isNative: false, platform: 'web' };
  }
}

async function getPrimaryServicesSafe(server) {
  try {
    return await server.getPrimaryServices();
  } catch {
    return [];
  }
}

function App() {
  const [runtime, setRuntime] = useState({ isNative: false, platform: 'web' });
  const [device, setDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const [intensity, setIntensity] = useState(0);
  const [characteristics, setCharacteristics] = useState([]);
  const [selectedChar, setSelectedChar] = useState('');
  const [rawHex, setRawHex] = useState('00');
  const [busy, setBusy] = useState(false);

  const webBluetoothSupported = useMemo(() => Boolean(navigator.bluetooth), []);
  const canUseNativeBle = runtime.isNative;
  const canConnect = webBluetoothSupported || canUseNativeBle;

  useEffect(() => {
    detectNativeRuntime().then(setRuntime);
  }, []);

  const log = (message) => {
    setLogs((items) => [`${new Date().toLocaleTimeString()} — ${message}`, ...items].slice(0, 120));
  };

  const selectFirstWritable = (found) => {
    const writable = found.find((item) =>
      item.properties?.write ||
      item.properties?.writeWithoutResponse ||
      item.properties?.write_without_response ||
      item.properties?.Write ||
      item.properties?.WriteWithoutResponse
    );
    const first = writable || found[0];
    if (first) setSelectedChar(first.key);
  };

  const connectWebBluetooth = async () => {
    if (!navigator.bluetooth) {
      log('Web Bluetooth недоступний у цьому браузері. Для сайту відкрий Chrome на Android або Desktop Chrome. На iPhone потрібна нативна збірка через Xcode.');
      return;
    }

    const picked = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_OPTIONAL_SERVICES,
    });

    setDevice({ transport: 'web', name: picked.name || 'Без назви', id: picked.id, raw: picked });
    log(`Обрано пристрій: ${picked.name || picked.id}`);

    const server = await picked.gatt.connect();
    log('Підключено через Web Bluetooth / GATT');

    const services = await getPrimaryServicesSafe(server);
    const found = [];

    for (const service of services) {
      log(`Service: ${service.uuid}`);
      try {
        const chars = await service.getCharacteristics();
        for (const characteristic of chars) {
          const item = {
            transport: 'web',
            key: `${service.uuid}|${characteristic.uuid}`,
            serviceUuid: service.uuid,
            uuid: characteristic.uuid,
            properties: characteristic.properties,
            raw: characteristic,
          };
          found.push(item);
          log(`  Characteristic: ${characteristic.uuid} props=${getPropertyList(characteristic.properties) || 'немає даних'}`);
        }
      } catch (error) {
        log(`  Не вдалося прочитати characteristics: ${error.message}`);
      }
    }

    setCharacteristics(found);
    selectFirstWritable(found);
    if (!found.length) {
      log('Characteristics не знайдені. Для Web Bluetooth, можливо, треба додати точні UUID сервісів у optionalServices після першого нативного скану.');
    }
  };

  const connectNativeBle = async () => {
    const { BleClient } = await import('@capacitor-community/bluetooth-le');

    await BleClient.initialize({ androidNeverForLocation: true });
    log(`Нативний BLE режим: ${runtime.platform}`);

    const picked = await BleClient.requestDevice();
    const deviceId = picked.deviceId || picked.id;
    const deviceName = picked.name || picked.localName || 'Без назви';

    setDevice({ transport: 'native', name: deviceName, id: deviceId, raw: picked });
    log(`Обрано пристрій: ${deviceName} (${deviceId})`);

    await BleClient.connect(deviceId, (disconnectedId) => {
      log(`Пристрій відключився: ${disconnectedId}`);
    });
    log('Підключено через Capacitor Bluetooth LE');

    const services = await BleClient.getServices(deviceId);
    const found = [];

    for (const service of services) {
      log(`Service: ${service.uuid}`);
      for (const characteristic of service.characteristics || []) {
        const item = {
          transport: 'native',
          key: `${service.uuid}|${characteristic.uuid}`,
          serviceUuid: service.uuid,
          uuid: characteristic.uuid,
          properties: characteristic.properties || {},
        };
        found.push(item);
        log(`  Characteristic: ${characteristic.uuid} props=${getPropertyList(characteristic.properties) || 'немає даних'}`);
      }
    }

    setCharacteristics(found);
    selectFirstWritable(found);
    if (!found.length) log('Characteristics не знайдені. Спробуй перепідключити пристрій або увімкнути його заново.');
  };

  const scan = async () => {
    setBusy(true);
    try {
      if (canUseNativeBle) {
        await connectNativeBle();
      } else {
        await connectWebBluetooth();
      }
    } catch (error) {
      log(`Помилка підключення: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const writeRaw = async (bytes) => {
    const characteristic = characteristics.find((item) => item.key === selectedChar);
    if (!characteristic) {
      log('Спочатку підключи пристрій і обери writable characteristic.');
      return;
    }

    try {
      if (characteristic.transport === 'native') {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        const deviceId = device?.id;
        if (!deviceId) throw new Error('Немає deviceId');

        try {
          await BleClient.writeWithoutResponse(deviceId, characteristic.serviceUuid, characteristic.uuid, dataViewFromBytes(bytes));
        } catch {
          await BleClient.write(deviceId, characteristic.serviceUuid, characteristic.uuid, dataViewFromBytes(bytes));
        }
      } else {
        const payload = Uint8Array.from(bytes);
        if (characteristic.raw.writeValueWithoutResponse) {
          await characteristic.raw.writeValueWithoutResponse(payload);
        } else {
          await characteristic.raw.writeValue(payload);
        }
      }

      log(`Надіслано HEX: ${bytesToHex(bytes)}`);
    } catch (error) {
      log(`Помилка запису: ${error.message}`);
    }
  };

  const testIntensity = async (value) => {
    setIntensity(value);
    // Тимчасова тестова команда. Реальний протокол Satisfyer треба підібрати після BLE-логу.
    await writeRaw([value]);
  };

  const stop = async () => {
    setIntensity(0);
    await writeRaw([0]);
  };

  const sendCustomHex = async () => {
    const bytes = parseHex(rawHex);
    if (!bytes.length) {
      log('Введи HEX-команду, наприклад: 00 або 14.');
      return;
    }
    await writeRaw(bytes);
  };

  const copyLogs = async () => {
    const text = logs.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      log('Лог скопійовано в буфер обміну.');
    } catch {
      log('Не вдалося скопіювати лог автоматично. Виділи його вручну.');
    }
  };

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="badge">PWA · iOS native · BLE lab</p>
          <h1>Vibro</h1>
          <p className="subtitle">
            Український прототип для підключення Satisfyer через Bluetooth LE, пошуку сервісів/характеристик і тесту команд.
          </p>
        </div>
        <button className="primary" onClick={scan} disabled={!canConnect || busy}>
          {runtime.isNative ? <Smartphone size={20} /> : <Bluetooth size={20} />}
          {busy ? 'Підключення...' : 'Підключити / сканувати'}
        </button>
      </section>

      <section className="notice">
        <AlertTriangle size={20} />
        <div>
          <strong>Для iPhone потрібна нативна збірка.</strong>
          <p>
            Сайт/PWA у Safari не зможе напряму керувати Bluetooth. На iPhone цей код треба зібрати через Capacitor + Xcode. Android/Desktop можуть тестувати через Chrome.
          </p>
        </div>
      </section>

      {!canConnect && (
        <div className="warning">
          Bluetooth API недоступний у цьому середовищі. Для вебверсії відкрий Chrome на Android/Desktop, або збери нативний iOS-застосунок.
        </div>
      )}

      <section className="grid">
        <div className="card">
          <h2>Пристрій</h2>
          <p>{device ? `${device.name} (${device.id})` : 'Не підключено'}</p>
          <p className="muted">Режим: {runtime.isNative ? `нативний ${runtime.platform}` : 'веб/PWA'}</p>
        </div>

        <div className="card">
          <h2>Characteristic для запису</h2>
          <select value={selectedChar} onChange={(event) => setSelectedChar(event.target.value)}>
            <option value="">Не обрано</option>
            {characteristics.map((characteristic) => (
              <option key={characteristic.key} value={characteristic.key}>
                {characteristic.uuid} · {getPropertyList(characteristic.properties) || 'props невідомі'}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card controls">
        <h2>Ручне керування</h2>
        <label>
          Інтенсивність: {intensity}%
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(event) => testIntensity(Number(event.target.value))}
          />
        </label>

        <div className="row">
          <button onClick={() => testIntensity(20)}><Waves size={18}/> 20%</button>
          <button onClick={() => testIntensity(60)}><Waves size={18}/> 60%</button>
          <button onClick={stop}><Square size={18}/> Стоп</button>
        </div>

        <div className="hexBox">
          <label>
            Своя HEX-команда
            <input value={rawHex} onChange={(event) => setRawHex(event.target.value)} placeholder="00 або 14" />
          </label>
          <button onClick={sendCustomHex}>Надіслати HEX</button>
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle">
          <h2>Debug log</h2>
          <button className="ghost" onClick={copyLogs}><Clipboard size={16} /> Скопіювати</button>
        </div>
        <div className="log">
          {logs.length ? logs.map((item, index) => <div key={index}>{item}</div>) : <span className="muted">Лог з’явиться після підключення.</span>}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
