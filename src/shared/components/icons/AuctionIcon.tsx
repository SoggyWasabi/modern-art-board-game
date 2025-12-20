import type { AuctionType } from '../../services/cardGenerator'

interface AuctionIconProps {
  type: AuctionType
  color: string
  size?: number
}

export const AuctionIcon: React.FC<AuctionIconProps> = ({ type, color, size = 16 }) => {
  const iconStyle = { width: size, height: size }

  switch (type) {
    case 'open':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill={color} />
        </svg>
      )
    case 'one_offer':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={color}
          >
            1
          </text>
        </svg>
      )
    case 'hidden':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" fill="none" />
          <path
            d="M7 11V7a5 5 0 0110 0v4"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.5" fill={color} />
          <path d="M12 17.5v1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'fixed_price':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill={color}
          >
            $
          </text>
        </svg>
      )
    case 'double':
      return (
        <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
          <path
            d="M8 6h8v12H8z"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M12 6v12"
            stroke={color}
            strokeWidth="2"
          />
          <circle cx="10" cy="10" r="1" fill={color} />
          <circle cx="14" cy="14" r="1" fill={color} />
        </svg>
      )
    default:
      return null
  }
}