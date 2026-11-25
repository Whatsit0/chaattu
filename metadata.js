import { UAParser } from 'ua-parser-js';

// Cache to prevent repetitive external IP lookups
const geoCache = new Map();

export async function parseClientMetadata(socket) {
  const req = socket.request;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine client IP: prioritizing reverse-proxy headers for cloud hosts (Render, Cloudflare, AWS, Heroku)
  const xForwardedFor = req.headers['x-forwarded-for'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];

  let rawIp = cfConnectingIp || (xForwardedFor ? xForwardedFor.split(',')[0].trim() : (xRealIp || req.socket.remoteAddress || '127.0.0.1'));

  // Strip IPv6-to-IPv4 prefix (e.g. ::ffff:192.168.1.1)
  let ip = rawIp.replace(/^::ffff:/, '').trim();

  // Normalize IPv6 loopback to clean 127.0.0.1
  if (ip === '::1' || ip === 'localhost') {
    ip = '127.0.0.1';
  }

  // Format device type
  const deviceType = result.device.type || (result.os.name && /Android|iOS/i.test(result.os.name) ? 'mobile' : 'desktop');
  const browser = `${result.browser.name || 'Unknown'} ${result.browser.major || ''}`.trim();
  const os = `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim();

  // Determine approximate location without requesting any browser permissions (Server-Side Geo-IP)
  let location = 'Location Unavailable';
  const isPrivate = !ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' ||
    ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.');

  if (isPrivate) {
    location = 'Localhost / Private Network';
  } else if (geoCache.has(ip)) {
    location = geoCache.get(ip);
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && (data.city || data.regionName || data.country)) {
          // Format as City, State, Country (e.g. Kochi, Kerala, India)
          location = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
          geoCache.set(ip, location);
        }
      }
    } catch {
      location = 'Location Unavailable';
    }
  }

  return {
    ip,
    userAgent,
    device: deviceType,
    browser,
    os,
    location
  };
}
