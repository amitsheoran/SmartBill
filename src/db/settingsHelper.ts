import { db } from './db';

export async function getSetting(key: string, defaultValue: any = ''): Promise<any> {
  const item = await db.settings.get(key);
  return item ? item.value : defaultValue;
}

export async function setSetting(key: string, value: any): Promise<void> {
  await db.settings.put({ id: key, value });
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const list = await db.settings.toArray();
  const settingsObj: Record<string, any> = {};
  for (const item of list) {
    settingsObj[item.id] = item.value;
  }
  return settingsObj;
}
