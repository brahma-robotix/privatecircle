import { UserDeviceSession } from '../types';

export const INITIAL_DEVICE_SESSIONS: UserDeviceSession[] = [
  {
    id: 'sess-current-web',
    userId: 'user-admin',
    deviceName: 'MacBook Pro 16"',
    browser: 'Google Chrome 128',
    lastActive: 'Active Now',
    approxLocation: 'New York, USA',
    isCurrent: true,
  },
  {
    id: 'sess-mobile-iphone',
    userId: 'user-admin',
    deviceName: 'iPhone 15 Pro',
    browser: 'Mobile Safari 17.5',
    lastActive: '2 hours ago',
    approxLocation: 'New York, USA',
    isCurrent: false,
  },
  {
    id: 'sess-tablet-ipad',
    userId: 'user-admin',
    deviceName: 'iPad Air 5th Gen',
    browser: 'Mobile Safari 17.4',
    lastActive: 'Yesterday, 8:45 PM',
    approxLocation: 'New York, USA',
    isCurrent: false,
  },
  {
    id: 'sess-maya-mac',
    userId: 'user-girlfriend',
    deviceName: 'MacBook Air M2',
    browser: 'Google Chrome 128',
    lastActive: 'Active Now',
    approxLocation: 'Paris, France',
    isCurrent: true,
  },
  {
    id: 'sess-maya-iphone',
    userId: 'user-girlfriend',
    deviceName: 'iPhone 14',
    browser: 'Mobile Safari',
    lastActive: '45 mins ago',
    approxLocation: 'Paris, France',
    isCurrent: false,
  },
];

export const DeviceSessionService = {
  getDeviceIcon(deviceName: string): string {
    const lower = deviceName.toLowerCase();
    if (lower.includes('iphone') || lower.includes('pixel') || lower.includes('galaxy') || lower.includes('phone')) {
      return '📱';
    }
    if (lower.includes('ipad') || lower.includes('tablet')) {
      return '📲';
    }
    return '💻';
  },

  getSecurityNote(): string {
    return 'Revoking a device invalidates its active session token and clears local decryption keys. That device must re-authenticate to rejoin.';
  },
};
