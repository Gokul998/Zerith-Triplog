export function getMoodClass(destination: string): string {
  const d = destination.toLowerCase();
  if (d.match(/beach|bali|goa|phuket|maldives|hawaii|miami|cancun|ibiza/)) return 'mood-beach';
  if (d.match(/mountain|himalaya|alps|colorado|denver|shimla|manali|swiss/)) return 'mood-mountain';
  if (d.match(/desert|dubai|sahara|rajasthan|jaisalmer|arizona/)) return 'mood-desert';
  return 'mood-city';
}

export function getMoodLabel(destination: string): string {
  const d = destination.toLowerCase();
  if (d.match(/beach|bali|goa|phuket|maldives|hawaii|miami|cancun/)) return '🌊 Beach Getaway';
  if (d.match(/mountain|himalaya|alps|colorado|shimla|manali|swiss/)) return '⛰️ Mountain Adventure';
  if (d.match(/desert|dubai|sahara|rajasthan|jaisalmer|arizona/)) return '🏜️ Desert Expedition';
  return '🏙️ City Explorer';
}

export function getMoodEmoji(destination: string): string {
  const d = destination.toLowerCase();
  if (d.match(/beach|bali|goa|phuket|maldives|hawaii|miami|cancun/)) return '🏖️';
  if (d.match(/mountain|himalaya|alps|colorado|shimla|manali|swiss/)) return '🏔️';
  if (d.match(/desert|dubai|sahara|rajasthan|jaisalmer|arizona/)) return '🏜️';
  return '🌆';
}

export function getDestinationCode(destination: string): string {
  return destination.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3) || 'TRP';
}
