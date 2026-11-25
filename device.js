const DEVICE_TOKEN_KEY = 'chaattiko_device_token';

export function getOrCreateDeviceToken() {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Helper to identify specific Apple iPhone / iPad models from screen dimensions and devicePixelRatio
 * Since Apple deliberately masks exact model strings as "iPhone" in userAgent.
 */
function detectAppleDeviceModel(width, height, dpr) {
  const w = Math.min(width, height);
  const h = Math.max(width, height);

  // Physical screen points * dpr
  const key = `${w * dpr}x${h * dpr}`;

  const appleMap = {
    '1290x2796': 'iPhone 14/15/16 Pro Max',
    '1179x2556': 'iPhone 14/15/16 Pro',
    '1284x2778': 'iPhone 12/13/14 Plus/Pro Max',
    '1170x2532': 'iPhone 12/13/14',
    '1080x2340': 'iPhone 12/13 mini',
    '828x1792': 'iPhone XR / iPhone 11',
    '1125x2436': 'iPhone X / XS / 11 Pro',
    '1242x2688': 'iPhone XS Max / 11 Pro Max',
    '750x1334': 'iPhone 6/7/8/SE (2nd/3rd gen)',
    '1242x2208': 'iPhone 6/7/8 Plus',
    '640x1136': 'iPhone 5/5s/SE (1st gen)',
    '1620x2160': 'iPad 10.2"',
    '1668x2388': 'iPad Pro 11"',
    '2048x2732': 'iPad Pro 12.9"',
    '1536x2048': 'iPad Mini / Air',
    '1640x2360': 'iPad Air 10.9"'
  };

  if (appleMap[key]) {
    return appleMap[key];
  }

  return 'Apple iPhone/iPad';
}

/**
 * Extract rich frontend device detection info for security & moderation logging.
 * Detects device type (Mobile/Tablet/Desktop), OS, browser, screen resolution, and mobile model where supported.
 */
export async function getClientDeviceInfo() {
  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const screenWidth = typeof window !== 'undefined' && window.screen ? window.screen.width : (typeof window !== 'undefined' ? window.innerWidth : 0);
  const screenHeight = typeof window !== 'undefined' && window.screen ? window.screen.height : (typeof window !== 'undefined' ? window.innerHeight : 0);
  const innerWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const touchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;
  const hasTouch = 'ontouchstart' in (typeof window !== 'undefined' ? window : {}) || touchPoints > 0;

  // OS Detection & Full Version Extraction
  let os = 'Unknown OS';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[_.]\d+(?:[_.]\d+)?)/);
    if (match) os += ` ${match[1].replace(/_/g, '.')}`;
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s([0-9.]+)/i);
    if (match) os += ` ${match[1]}`;
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows NT 6.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/);
    if (match) os += ` ${match[1].replace(/_/g, '.')}`;
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  }

  // Browser Detection with Exact Version
  let browser = 'Unknown Browser';
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/i);
    browser = `Edge ${match ? match[1] : ''}`.trim();
  } else if (/OPR\/([0-9.]+)/i.test(ua) || /Opera\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/([0-9.]+)/i);
    browser = `Opera ${match ? match[1] : ''}`.trim();
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium|OPR|Edg/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    browser = `Chrome ${match ? match[1] : ''}`.trim();
  } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua)) {
    const verMatch = ua.match(/Version\/([0-9.]+)/i);
    browser = `Safari ${verMatch ? verMatch[1] : ''}`.trim();
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    browser = `Firefox ${match ? match[1] : ''}`.trim();
  }

  // Device Type & Model Detection
  let deviceType = 'Desktop';
  let deviceModel = null;

  const isTablet = /(iPad|Tablet|(Android(?!.*Mobile))|Silk)/i.test(ua) || (innerWidth >= 600 && innerWidth < 1024 && hasTouch);
  const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (innerWidth < 768 && hasTouch);

  if (isTablet) {
    deviceType = 'Tablet';
  } else if (isMobile) {
    deviceType = 'Mobile';
  }

  // Extract Android mobile model (e.g. SM-S908B, Pixel 7 Pro, Xiaomi 13, OnePlus Nord CE Lite)
  if (/Android/i.test(ua)) {
    const modelMatch = ua.match(/Android[^;]+;\s*([^;)]+)(?:;\s*([^)]+))?\)/i);
    if (modelMatch) {
      const candidates = [modelMatch[2], modelMatch[1]].filter(Boolean);
      for (const cand of candidates) {
        const cleaned = cand.replace(/Build\/.*/i, '').trim();
        if (cleaned && !cleaned.toLowerCase().includes('k') && cleaned.length > 2) {
          deviceModel = cleaned;
          break;
        }
      }
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceModel = detectAppleDeviceModel(screenWidth, screenHeight, dpr);
  }

  // Modern High Entropy Values API (Chrome/Edge on Android/PC)
  if (typeof navigator !== 'undefined' && navigator.userAgentData) {
    try {
      if (typeof navigator.userAgentData.mobile === 'boolean') {
        if (navigator.userAgentData.mobile && deviceType !== 'Tablet') {
          deviceType = 'Mobile';
        }
      }
      if (navigator.userAgentData.getHighEntropyValues) {
        const highEntropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        if (highEntropy.model && highEntropy.model.trim()) {
          deviceModel = highEntropy.model.trim();
        }
        if (highEntropy.platform) {
          if (highEntropy.platform === 'Android') {
            os = `Android ${highEntropy.platformVersion || ''}`.trim();
          } else if (highEntropy.platform === 'Windows') {
            // Windows 11 platformVersion is >= 13.0.0
            const majorVer = parseInt(highEntropy.platformVersion || '0', 10);
            if (majorVer >= 13) {
              os = 'Windows 11';
            } else if (majorVer > 0) {
              os = 'Windows 10';
            }
          }
        }
      }
    } catch {
      // Fallback cleanly
    }
  }

  // Basic Hardware Specs (CPU & RAM) via permissionless standard browser APIs
  const cpuCores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency)
    ? `${navigator.hardwareConcurrency} Cores`
    : 'N/A';
  const ram = (typeof navigator !== 'undefined' && navigator.deviceMemory)
    ? `~${navigator.deviceMemory} GB RAM`
    : 'N/A';
  const hardwareSpecs = (cpuCores !== 'N/A' || ram !== 'N/A')
    ? `${cpuCores} · ${ram}`
    : 'Standard Hardware';

  // Network Connection Speed & Network Tier
  let networkType = 'Unknown Network';
  let connectionSpeed = 'Fast';

  if (typeof navigator !== 'undefined') {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const effType = (conn.effectiveType || '').toLowerCase(); // '4g', '3g', '2g', 'slow-2g'
      const downlink = conn.downlink !== undefined ? `${conn.downlink} Mbps` : '';

      if (effType === 'slow-2g' || effType === '2g' || effType === '3g' || (conn.downlink && conn.downlink < 2.0)) {
        connectionSpeed = 'Slow';
      } else {
        connectionSpeed = 'Fast';
      }

      networkType = [effType ? effType.toUpperCase() : '', downlink].filter(Boolean).join(' · ') || (connectionSpeed === 'Fast' ? 'High-Speed' : 'Low-Speed');
    }
  }

  // Physical Screen Resolution (accounting for devicePixelRatio on modern mobile screens)
  const physicalWidth = Math.round(screenWidth * dpr);
  const physicalHeight = Math.round(screenHeight * dpr);
  const screenResolution = dpr > 1 
    ? `${physicalWidth}x${physicalHeight} (${screenWidth}x${screenHeight})`
    : `${screenWidth}x${screenHeight}`;

  return {
    deviceType,
    deviceModel: deviceModel || (deviceType === 'Desktop' ? 'PC/Mac' : `${deviceType} Device`),
    os,
    browser,
    screen: screenResolution,
    rawScreen: `${screenWidth}x${screenHeight}`,
    physicalScreen: `${physicalWidth}x${physicalHeight}`,
    windowSize: `${innerWidth}x${innerHeight}`,
    pixelRatio: dpr,
    hasTouch,
    cpuCores,
    ram,
    hardwareSpecs,
    networkType,
    connectionSpeed,
    userAgent: ua
  };
}
