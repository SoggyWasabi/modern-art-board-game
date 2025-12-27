import { ARTIST_COLORS } from '../../engine/constants'

interface ArtistFilterTabsProps {
  selectedArtist: string
  onSelect: (artist: string) => void
}

// Generate artist tabs from constants with short names
const ARTIST_TABS = [
  { id: 'all', name: 'All', color: '#ffffff' },
  ...ARTIST_COLORS.map((artist) => ({
    id: artist.name,
    name: artist.name.split(' ')[0], // First name only (Manuel, Sigrid, etc.)
    color: artist.color,
  })),
]

export function ArtistFilterTabs({ selectedArtist, onSelect }: ArtistFilterTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {ARTIST_TABS.map((tab) => {
        const isActive = selectedArtist === tab.id
        const isAll = tab.id === 'all'

        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              padding: '10px 20px',
              background: isActive
                ? isAll
                  ? 'rgba(255,255,255,0.15)'
                  : `${tab.color}20`
                : 'transparent',
              border: isActive
                ? isAll
                  ? '1px solid rgba(255,255,255,0.3)'
                  : `1px solid ${tab.color}40`
                : '1px solid transparent',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = isAll
                  ? 'rgba(255,255,255,0.08)'
                  : `${tab.color}10`
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isActive
                  ? isAll
                    ? '#ffffff'
                    : tab.color
                  : 'rgba(255,255,255,0.5)',
              }}
            >
              {tab.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
