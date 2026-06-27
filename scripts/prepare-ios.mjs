import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function ensureIosProject() {
  if (!existsSync('ios/App')) {
    run('npx cap add ios');
    return;
  }

  console.log('iOS project already exists, skipping `cap add ios`.');
}

function insertBeforeClosingDict(plist, block) {
  if (!plist.includes('</dict>')) {
    throw new Error('Info.plist does not contain </dict>.');
  }

  return plist.replace(/\n<\/dict>/, `\n${block}\n</dict>`);
}

function ensureKey(plist, key, value) {
  if (plist.includes(`<key>${key}</key>`)) {
    return plist;
  }

  const block = `\t<key>${key}</key>\n\t<string>${value}</string>`;
  return insertBeforeClosingDict(plist, block);
}

function patchInfoPlist() {
  const plistPath = 'ios/App/App/Info.plist';

  if (!existsSync(plistPath)) {
    throw new Error(`${plistPath} not found. Run capacitor ios setup first.`);
  }

  let plist = readFileSync(plistPath, 'utf8');
  plist = ensureKey(plist, 'NSBluetoothAlwaysUsageDescription', 'Vibro використовує Bluetooth для підключення до вашого пристрою.');
  plist = ensureKey(plist, 'NSBluetoothPeripheralUsageDescription', 'Vibro використовує Bluetooth для підключення до вашого пристрою.');

  writeFileSync(plistPath, plist);
  console.log('Bluetooth permissions are present in ios/App/App/Info.plist.');
}

ensureIosProject();
run('npx cap sync ios');
patchInfoPlist();
