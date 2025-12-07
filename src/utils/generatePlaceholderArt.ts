// Utility to generate placeholder SVG artworks for testing
// In production, these would be replaced with actual artwork assets

export function generatePlaceholderSVG(
  artist: string,
  artworkId: string,
  width: number = 200,
  height: number = 280
): string {
  // Get artist-specific colors
  const colors: Record<string, { primary: string; secondary: string; accent: string }> = {
    'Manuel Carvalho': {
      primary: '#f59e0b',
      secondary: '#f8c273',
      accent: '#d97706',
    },
    'Sigrid Thaler': {
      primary: '#0ea5e9',
      secondary: '#7dd3fc',
      accent: '#0284c7',
    },
    'Daniel Melim': {
      primary: '#22c55e',
      secondary: '#86efac',
      accent: '#16a34a',
    },
    'Ramon Martins': {
      primary: '#a855f7',
      secondary: '#d8b4fe',
      accent: '#9333ea',
    },
    'Rafael Silveira': {
      primary: '#ec4899',
      secondary: '#f9a8d4',
      accent: '#db2777',
    },
  };

  const colorScheme = colors[artist] || colors['Manuel Carvalho'];

  // Generate unique pattern based on artwork ID
  const seed = artworkId.split('-')[1] || '001';
  const pattern = parseInt(seed) % 5;

  // Generate different patterns based on seed
  const patterns = [
    // Circles pattern
    `
      <defs>
        <pattern id="circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="15" fill="${colorScheme.secondary}" opacity="0.3"/>
          <circle cx="10" cy="10" r="8" fill="${colorScheme.accent}" opacity="0.4"/>
          <circle cx="30" cy="30" r="8" fill="${colorScheme.accent}" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="${colorScheme.primary}" opacity="0.1"/>
      <rect width="${width}" height="${height}" fill="url(#circles)"/>
    `,
    // Stripes pattern
    `
      <defs>
        <pattern id="stripes" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="10" height="20" fill="${colorScheme.secondary}" opacity="0.3"/>
          <rect x="10" y="0" width="10" height="20" fill="${colorScheme.accent}" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="${colorScheme.primary}" opacity="0.1"/>
      <rect width="${width}" height="${height}" fill="url(#stripes)"/>
    `,
    // Gradient shapes
    `
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.primary};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${colorScheme.accent};stop-opacity:0.3" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad1)"/>
      <polygon points="${width/2},${height/4} ${width*3/4},${height*3/4} ${width/4},${height*3/4}"
               fill="${colorScheme.secondary}" opacity="0.6"/>
    `,
    // Dots pattern
    `
      <defs>
        <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="5" fill="${colorScheme.accent}" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="${colorScheme.primary}" opacity="0.1"/>
      <rect width="${width}" height="${height}" fill="url(#dots)"/>
    `,
    // Waves pattern
    `
      <defs>
        <pattern id="waves" x="0" y="0" width="100" height="40" patternUnits="userSpaceOnUse">
          <path d="M0,20 Q25,5 50,20 T100,20 L100,40 L0,40 Z" fill="${colorScheme.secondary}" opacity="0.3"/>
          <path d="M0,30 Q25,15 50,30 T100,30 L100,40 L0,40 Z" fill="${colorScheme.accent}" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="${colorScheme.primary}" opacity="0.1"/>
      <rect width="${width}" height="${height}" fill="url(#waves)"/>
    `,
  ];

  const selectedPattern = patterns[pattern] || patterns[0];

  // Create SVG with artist name and pattern
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${selectedPattern}
      <text x="${width/2}" y="${height/2}"
            font-family="Playfair Display, Georgia, serif"
            font-size="${width/8}"
            font-weight="bold"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="${colorScheme.accent}"
            opacity="0.2">
        ${artist.split(' ')[0]}
      </text>
    </svg>
  `;

  // Convert to data URL
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

// Generate all placeholder artworks and return as a map
export function generateAllPlaceholders(): Record<string, string> {
  const artists = ['Manuel Carvalho', 'Sigrid Thaler', 'Daniel Melim', 'Ramon Martins', 'Rafael Silveira'];
  const placeholders: Record<string, string> = {};

  artists.forEach(artist => {
    for (let i = 1; i <= 3; i++) {
      const artworkId = `${artist.toLowerCase().replace(' ', '-')}-${String(i).padStart(3, '0')}`;
      placeholders[artworkId] = generatePlaceholderSVG(artist, artworkId);
    }
  });

  return placeholders;
}