import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bluetooth, Power, Square, Waves } from 'lucide-react';
import './style.css';

const encoder = new TextEncoder();

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

async function getPrimaryServicesSafe(server) {
  try {
    return await server.getPrimaryServices();
  } catch (error) {
    return [];
  }
}

function App() {
  const [device, setDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const [intensity, setIntensity] = useState(0);
  const [characteristics, setCharacteristics] = useState([]);
  const [selectedChar, setSelectedChar] = useState('');

  const supported = useMemo(() => Boolean(navigator.bluetooth), []);

  const log = (message) => {
    setLogs((items) => [`${new Date().toLocaleTimeString()} — ${message}`, ...items].slice(0, 80));
  };

  const scan = async () => {
    try {
      if (!navigator.bluetooth) {
        log('Web Bluetooth недоступний. Спробуй Chrome на Android або Desktop Chrome.');
        return;
      }

      const picked = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000180a-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
        ],
      });

      setDevice(picked);
      log(`Обрано пристрій: ${picked.name || picked.id}`);

      const server = await picked.gatt.connect();
      log('Підключено до GATT');

      const services = await getPrimaryServicesSafe(server);
      const found = [];

      for (const service of services) {
        log(`Service: ${service.uuid}`);
        try {
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            found.push(c);
            log(`  Characteristic: ${c.uuid} props=${Object.keys(c.properties).filter(k => c.properties[k]).join(',')}`);
          }
        } catch (e) {
          log(`  Не вдалося прочитати characteristics: ${e.message}`);
        }
      }

      setCharacteristics(found);
      if (found.length) setSelectedChar(found[0].uuid);
      if (!found.length) log('Characteristics не знайдені. Треба додати точні optionalServices після першого скану.');
    } catch (error) {
      log(`Помилка: ${error.message}`);
    }
  };

  const writeRaw = async (bytes) => {
    try {
      const char = characteristics.find((c) => c.uuid === selectedChar);
      if (!char) {
        log('Спочатку обери writable characteristic.');
        return;
      }
      await char.writeValueWithoutResponse?.(new Uint8Array(bytes)) ?? await char.writeValue(new Uint8Array(bytes));
      log(`Write HEX: ${bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    } catch (error) {
      log(`Write error: ${error.message}`);
    }
  };

  const testIntensity = async (value) => {
    setIntensity(value);
    // Placeholder-команда. Після BLE-сніфу замінимо на реальний протокол Satisfyer.
    await writeRaw([value]);
  };

  const stop = async () => {
    setIntensity(0);
    await writeRaw([0]);
  };

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="badge">PWA · Web Bluetooth · Satisfyer test lab</p>
          <h1>Vibro</h1>
          <p className="subtitle">
            Перший прототип для пошуку BLE services/characteristics і тесту команд.
            На iPhone Web Bluetooth не працює, тестуй у Chrome на Android або Desktop Chrome.
          </p>
        </div>
        <button className="primary" onClick={scan} disabled={!supported}>
          <Bluetooth size={20} />
          Connect / Scan
        </button>
      </section>

      {!supported && (
        <div className="warning">
          Web Bluetooth недоступний у цьому браузері. Відкрий у Chrome на Android/Desktop.
        </div>
      )}

      <section className="card">
        <h2>Device</h2>
        <p>{device ? `${device.name || 'Unnamed'} (${device.id})` : 'Не підключено'}</p>
      </section>

      <section className="card">
        <h2>Writable characteristic</h2>
        <select value={selectedChar} onChange={(e) => setSelectedChar(e.target.value)}>
          {characteristics.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.uuid}
            </option>
          ))}
        </select>
      </section>

      <section className="card controls">
        <h2>Manual control</h2>
        <label>
          Intensity: {intensity}
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => testIntensity(Number(e.target.value))}
          />
        </label>

        <div className="row">
          <button onClick={() => testIntensity(20)}><Waves size={18}/> 20%</button>
          <button onClick={() => testIntensity(60)}><Waves size={18}/> 60%</button>
          <button onClick={stop}><Square size={18}/> Stop</button>
        </div>
      </section>

      <section className="card">
        <h2>Debug log</h2>
        <div className="log">
          {logs.map((item, i) => <div key={i}>{item}</div>)}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
