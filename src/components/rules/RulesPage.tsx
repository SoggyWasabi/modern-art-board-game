import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../Card'
import type { CardData } from '../Card'

// Artist configurations - Original names with Mayfair card distribution
const ARTISTS = [
  { name: 'Manuel Carvalho', color: '#F5C846', textColor: '#000000', cardCount: 12 },
  { name: 'Sigrid Thaler', color: '#DC2626', textColor: '#FFFFFF', cardCount: 13 },
  { name: 'Daniel Melim', color: '#2DD4BF', textColor: '#000000', cardCount: 14 },
  { name: 'Ramon Martins', color: '#22C55E', textColor: '#000000', cardCount: 15 },
  { name: 'Rafael Silveira', color: '#A855F7', textColor: '#FFFFFF', cardCount: 16 },
]

// Example card data for visual demonstrations
const EXAMPLE_CARDS: CardData[] = [
  { id: 'ex1', artist: 'Manuel Carvalho', artistIndex: 0, cardIndex: 0, auctionType: 'open' },
  { id: 'ex2', artist: 'Sigrid Thaler', artistIndex: 1, cardIndex: 0, auctionType: 'one_offer' },
  { id: 'ex3', artist: 'Daniel Melim', artistIndex: 2, cardIndex: 0, auctionType: 'hidden' },
  { id: 'ex4', artist: 'Ramon Martins', artistIndex: 3, cardIndex: 0, auctionType: 'fixed_price' },
  { id: 'ex5', artist: 'Rafael Silveira', artistIndex: 4, cardIndex: 0, auctionType: 'double' },
]

// Rulebook chapters/sections
const CHAPTERS = [
  { id: 'overview', title: 'Overview', color: ARTISTS[0].color },
  { id: 'setup', title: 'Setup', color: ARTISTS[1].color },
  { id: 'gameplay', title: 'Gameplay', color: ARTISTS[2].color },
  { id: 'auctions', title: 'Auction Types', color: ARTISTS[3].color },
  { id: 'rounds', title: 'Rounds & Scoring', color: ARTISTS[4].color },
]

interface RulesPageProps {
  onBack: () => void
}

export function RulesPage({ onBack }: RulesPageProps) {
  const [activeChapter, setActiveChapter] = useState('overview')

  // Handle scroll to update active chapter
  useEffect(() => {
    const handleScroll = () => {
      const sections = CHAPTERS.map(ch => document.getElementById(ch.id)).filter(Boolean)
      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom >= 100) {
          setActiveChapter(section.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToChapter = (chapterId: string) => {
    const element = document.getElementById(chapterId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Subtle floating card background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.08,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0L100 50L50 100L0 50Z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid ' + ARTISTS[0].color + '20',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = ARTISTS[0].color
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 200,
              letterSpacing: '0.15em',
              margin: 0,
              background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #C9A227 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            RULES
          </h1>

          <div style={{ width: '80px' }} />
        </div>
      </motion.header>

      {/* Simple Chapter Navigation - Horizontal Tabs */}
      <nav
        style={{
          position: 'sticky',
          top: '72px',
          zIndex: 95,
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px 24px',
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexWrap: 'wrap',
        }}
      >
        {CHAPTERS.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => scrollToChapter(chapter.id)}
            style={{
              padding: '10px 20px',
              background: activeChapter === chapter.id
                ? `${chapter.color}20`
                : 'transparent',
              border: activeChapter === chapter.id
                ? `1px solid ${chapter.color}40`
                : '1px solid transparent',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (activeChapter !== chapter.id) {
                e.currentTarget.style.background = `${chapter.color}10`
              }
            }}
            onMouseLeave={(e) => {
              if (activeChapter !== chapter.id) {
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
                color: activeChapter === chapter.id
                  ? chapter.color
                  : 'rgba(255,255,255,0.5)',
              }}
            >
              {chapter.title}
            </span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '900px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '100px',
          paddingBottom: '80px',
        }}
      >
        {/* Overview Section */}
        <section id="overview" style={{ marginBottom: '120px', scrollMarginTop: '100px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  width: '60px',
                  height: '3px',
                  backgroundColor: ARTISTS[0].color,
                  marginBottom: '16px',
                  boxShadow: `0 0 12px ${ARTISTS[0].color}60`,
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 200,
                  letterSpacing: '0.1em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                OVERVIEW
              </h2>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.8,
                fontSize: '1rem',
              }}
            >
              <p style={{ marginBottom: '24px' }}>
                <strong style={{ color: ARTISTS[0].color, fontWeight: 500 }}>MODERN ART</strong> by Reiner Knizia is an auction game where
                players take on the role of museum buyers and sellers. Your goal is to make the most money by
                strategically buying paintings, influencing which artists become popular, and selling at the right time.
              </p>

              <p style={{ marginBottom: '24px' }}>
                The game is played over <strong style={{ color: ARTISTS[0].color }}>4 rounds (called "seasons")</strong>.
                In each round, players auction paintings from their hand. At the end of each round, all purchased paintings
                are sold to the bank. The more paintings by an artist that were sold, the more valuable that artist becomes.
              </p>

              <p style={{ marginBottom: '24px' }}>
                <strong style={{ color: ARTISTS[0].color, fontWeight: 500 }}>Winning:</strong> After the fourth round ends and all
                paintings are sold, players reveal their money. The player with the most money wins!
              </p>

              {/* Components list */}
              <div
                style={{
                  marginTop: '32px',
                  padding: '24px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: `1px solid ${ARTISTS[0].color}20`,
                }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: ARTISTS[0].color,
                    margin: '0 0 20px 0',
                  }}
                >
                  Components
                </h3>
                <div
                  style={{
                    display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  fontSize: '0.95rem',
                }}
                >
                  <div>
                    <div style={{ color: ARTISTS[0].color, fontWeight: 500, marginBottom: '8px' }}>
                      70 Painting Cards
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255,255,255,0.6)' }}>
                      <li>12 Manuel Carvalho</li>
                      <li>13 Sigrid Thaler</li>
                      <li>14 Daniel Melim</li>
                      <li>15 Ramon Martins</li>
                      <li>16 Rafael Silveira</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{ color: ARTISTS[0].color, fontWeight: 500, marginBottom: '8px' }}>
                      Digital Money
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Each player starts with <strong>$100,000 USD</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: ARTISTS[0].color, fontWeight: 500, marginBottom: '8px' }}>
                      Artist Values
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255,255,255,0.6)' }}>
                      <li>Values update each round ($10k, $20k, $30k)</li>
                      <li>Accumulate across all 4 rounds</li>
                      <li>Based on paintings sold per artist</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Setup Section */}
        <section id="setup" style={{ marginBottom: '120px', scrollMarginTop: '100px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  width: '60px',
                  height: '3px',
                  backgroundColor: ARTISTS[1].color,
                  marginBottom: '16px',
                  boxShadow: `0 0 12px ${ARTISTS[1].color}60`,
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 200,
                  letterSpacing: '0.1em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                SETUP
              </h2>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.8,
                fontSize: '1rem',
              }}
            >
              <p style={{ marginBottom: '24px' }}>
                Before starting, make sure you have <strong>3-5 players</strong>. The game plays differently
                based on player count, especially regarding how many cards each person receives.
              </p>

              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {[
                  {
                    title: 'Shuffle the Deck',
                    content: 'All 70 painting cards are shuffled and ready for dealing. The game automatically handles card distribution.',
                  },
                  {
                    title: 'Deal Starting Hands',
                    content: 'Each player is dealt their starting cards based on the number of players. See the chart below for exact amounts.',
                  },
                  {
                    title: 'Remaining Cards',
                    content: 'The undealt cards are reserved for future rounds. You\'ll receive more cards at the start of Rounds 2 and 3.',
                  },
                  {
                    title: 'Starting Money',
                    content: 'Each player starts with <strong>$100,000</strong>. This is your budget for the entire game - manage it wisely!',
                  },
                  {
                    title: 'Determine First Player',
                    content: 'The youngest player takes the first turn and will conduct the first auction. Play continues clockwise from them.',
                  },
                ].map((step, index) => (
                  <li
                    key={index}
                    style={{
                      marginBottom: '32px',
                      paddingLeft: '48px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: ARTISTS[1].color + '20',
                        border: `1px solid ${ARTISTS[1].color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: ARTISTS[1].color,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 500,
                          color: '#ffffff',
                          marginBottom: '8px',
                        }}
                      >
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
                        {step.content}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Card Dealing Table */}
              <div
                style={{
                  marginTop: '32px',
                  padding: '24px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: `1px solid ${ARTISTS[1].color}20`,
                }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: ARTISTS[1].color,
                    margin: '0 0 16px 0',
                  }}
                >
                  🎴 Starting Cards (Round 1)
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  The number of cards dealt to each player depends on your total player count:
                </p>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.95rem',
                  }}
                >
                  <thead>
                    <tr>
                      {['Players', 'Cards Each', 'Total Dealt'].map((header, i) => (
                        <th
                          key={header}
                          style={{
                            padding: '12px',
                            textAlign: i === 0 ? 'left' : 'center',
                            borderBottom: `2px solid ${ARTISTS[1].color}40`,
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 500,
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { players: '3', cards: '10', total: '30' },
                      { players: '4', cards: '9', total: '36' },
                      { players: '5', cards: '8', total: '40' },
                    ].map((row) => (
                      <tr key={row.players}>
                        <td style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <strong style={{ color: ARTISTS[1].color }}>{row.players}</strong> players
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <strong style={{ color: '#ffffff', fontSize: '1.1rem' }}>{row.cards}</strong> cards
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                          {row.total} cards total
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(220, 38, 38, 0.08)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <strong style={{ color: ARTISTS[1].color }}>Important:</strong> The game automatically keeps the remaining cards in reserve.
                  You'll be dealt more cards at the start of Rounds 2 and 3 (see Gameplay section for details).
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Gameplay Section */}
        <section id="gameplay" style={{ marginBottom: '120px', scrollMarginTop: '100px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  width: '60px',
                  height: '3px',
                  backgroundColor: ARTISTS[2].color,
                  marginBottom: '16px',
                  boxShadow: `0 0 12px ${ARTISTS[2].color}60`,
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 200,
                  letterSpacing: '0.1em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                GAMEPLAY
              </h2>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.8,
                fontSize: '1rem',
              }}
            >
              <p style={{ marginBottom: '24px' }}>
                Modern Art is played over <strong style={{ color: ARTISTS[2].color }}>4 rounds</strong>. Each round follows this sequence:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {[
                  { step: '1', title: 'Auction', desc: 'Players take turns (clockwise) auctioning one painting at a time. The player who played the card becomes the auctioneer.' },
                  { step: '2', title: 'Winning Bidder', desc: 'The highest bidder pays the auctioneer and takes the painting. If the auctioneer wins, they pay the bank instead. If no one bids, the auctioneer gets it free!' },
                  { step: '3', title: 'Round Ends', desc: 'The round ends immediately when the 5th painting of ANY artist is played. That 5th painting is NOT auctioned - it just counts for ranking.' },
                  { step: '4', title: 'Sell to Bank', desc: 'Count how many paintings each artist sold. Top 3 artists get values ($30k, $20k, $10k). All players sell their purchased paintings at these values. <strong>Values accumulate across rounds</strong> - add new values to previous rounds\' tiles!' },
                  { step: '5', title: 'Next Round', desc: 'Deal new cards (see chart below) and continue with player to the left of whoever played the last painting.' },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: 'flex',
                      gap: '20px',
                      padding: '20px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: `1px solid rgba(255,255,255,0.05)`,
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: ARTISTS[2].color + '15',
                        border: `1px solid ${ARTISTS[2].color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 200,
                        color: ARTISTS[2].color,
                      }}
                    >
                      {item.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 500,
                          color: '#ffffff',
                          marginBottom: '6px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Dealing Chart */}
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'rgba(45, 212, 191, 0.08)',
                  borderRadius: '12px',
                  border: `1px solid ${ARTISTS[2].color}20`,
                }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: ARTISTS[2].color,
                    margin: '0 0 16px 0',
                  }}
                >
                  📊 Cards Dealt Each Round
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  At the start of each round (except Round 4), deal additional cards to each player. These are <strong>added</strong> to any cards remaining in your hand.
                </p>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr>
                      {['Round', '3 Players', '4 Players', '5 Players'].map((header, i) => (
                        <th
                          key={header}
                          style={{
                            padding: '10px',
                            textAlign: 'center',
                            borderBottom: `2px solid ${ARTISTS[2].color}40`,
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { round: 'Round 1', p3: '10', p4: '9', p5: '8' },
                      { round: 'Round 2', p3: '6', p4: '4', p5: '3' },
                      { round: 'Round 3', p3: '6', p4: '4', p5: '3' },
                      { round: 'Round 4', p3: '0', p4: '0', p5: '0' },
                    ].map((row) => (
                      <tr key={row.round}>
                        <td style={{ padding: '12px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 500 }}>
                          {row.round}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <strong style={{ color: '#ffffff' }}>{row.p3}</strong>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <strong style={{ color: '#ffffff' }}>{row.p4}</strong>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <strong style={{ color: '#ffffff' }}>{row.p5}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(45, 212, 191, 0.1)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <strong style={{ color: ARTISTS[2].color }}>Round 4:</strong> No new cards are dealt. Play continues with any cards remaining in your hand from Round 3.
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Auction Types Section */}
        <section id="auctions" style={{ marginBottom: '120px', scrollMarginTop: '100px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  width: '60px',
                  height: '3px',
                  backgroundColor: ARTISTS[3].color,
                  marginBottom: '16px',
                  boxShadow: `0 0 12px ${ARTISTS[3].color}60`,
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 200,
                  letterSpacing: '0.1em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                THE 5 AUCTION TYPES
              </h2>
            </div>

            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '40px',
                fontSize: '1rem',
              }}
            >
              Each painting has an auction type symbol. When you play a card, you must run that auction type.
            </p>

            {/* Open Auction */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 640 ? '1fr 1fr' : '1fr',
                gap: '24px',
                padding: '24px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: `1px solid ${ARTISTS[0].color}20`,
                marginBottom: '32px',
              }}
            >
              <div>
                <Card card={EXAMPLE_CARDS[0]} size="lg" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: ARTISTS[0].color,
                    margin: '0 0 12px 0',
                  }}
                >
                  OPEN AUCTION
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.7,
                  }}
                >
                  All players (including the auctioneer) can bid in any order, any number of times. Shout out your bids!
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>Auctioneer keeps track of bids</li>
                  <li style={{ marginBottom: '8px' }}>Ends when no one wants to bid higher</li>
                  <li style={{ marginBottom: '8px' }}>If no one bids, auctioneer gets it <strong>FREE</strong></li>
                </ul>
              </div>
            </div>

            {/* One Offer Auction */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 640 ? '1fr 1fr' : '1fr',
                gap: '24px',
                padding: '24px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: `1px solid ${ARTISTS[1].color}20`,
                marginBottom: '32px',
              }}
            >
              <div>
                <Card card={EXAMPLE_CARDS[1]} size="lg" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: ARTISTS[1].color,
                    margin: '0 0 12px 0',
                  }}
                >
                  ONE OFFER AUCTION
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.7,
                  }}
                >
                  Starting left of auctioneer and going clockwise, each player gets <strong>exactly ONE bid</strong>.
                  Bid higher than the current bid or pass. Auctioneer bids last.
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>Turn order matters - each player gets one chance</li>
                  <li style={{ marginBottom: '8px' }}>Must bid higher than current bid to stay in</li>
                  <li style={{ marginBottom: '8px' }}>Auctioneer has the final opportunity to bid</li>
                  <li>If everyone passes, auctioneer gets it free</li>
                </ul>
              </div>
            </div>

            {/* Hidden/Sealed Auction */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 640 ? '1fr 1fr' : '1fr',
                gap: '24px',
                padding: '24px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: `1px solid ${ARTISTS[2].color}20`,
                marginBottom: '32px',
              }}
            >
              <div>
                <Card card={EXAMPLE_CARDS[2]} size="lg" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: ARTISTS[2].color,
                    margin: '0 0 12px 0',
                  }}
                >
                  HIDDEN (SEALED) AUCTION
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.7,
                  }}
                >
                  All players simultaneously make <strong>one secret bid</strong>. Enter your bid amount privately -
                  you can bid $0 if you don't want the painting. All bids are revealed at the same time!
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>Everyone bids at once - no waiting for your turn</li>
                  <li style={{ marginBottom: '8px' }}>Highest bid wins (ties go to player closest to auctioneer clockwise)</li>
                  <li style={{ marginBottom: '8px' }}>You can bid $0 - great for bluffing!</li>
                  <li>If everyone bids $0, auctioneer gets it free</li>
                </ul>
              </div>
            </div>

            {/* Fixed Price */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 640 ? '1fr 1fr' : '1fr',
                gap: '24px',
                padding: '24px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: `1px solid ${ARTISTS[3].color}20`,
                marginBottom: '32px',
              }}
            >
              <div>
                <Card card={EXAMPLE_CARDS[3]} size="lg" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: ARTISTS[3].color,
                    margin: '0 0 12px 0',
                  }}
                >
                  FIXED PRICE AUCTION
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.7,
                  }}
                >
                  The auctioneer announces a price. Going clockwise, each player decides to <strong>buy it now</strong> or pass.
                  First player to take it buys at that price and the auction ends immediately.
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>Auctioneer cannot set a price higher than what they have</li>
                  <li style={{ marginBottom: '8px' }}>If everyone passes, the auctioneer <strong>MUST buy it</strong> themselves</li>
                  <li>Fast and predictable - great for setting up strategy</li>
                </ul>
              </div>
            </div>

            {/* Double Auction - Important! */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 640 ? '1fr 1fr' : '1fr',
                gap: '24px',
                padding: '24px',
                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                borderRadius: '12px',
                border: `2px solid ${ARTISTS[4].color}40`,
                marginBottom: '32px',
              }}
            >
              <div>
                <Card card={EXAMPLE_CARDS[4]} size="lg" />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    color: ARTISTS[4].color,
                    margin: '0 0 12px 0',
                  }}
                >
                  DOUBLE AUCTION ⚠️
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.7,
                  }}
                >
                  The auctioneer <strong>may offer a second painting</strong> of the same artist (but not another Double Auction card).
                  Both paintings are auctioned together using the auction type shown on the second card.
                </p>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 500, color: ARTISTS[4].color }}>
                    WHAT IF NO SECOND CARD?
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    Each player clockwise gets the opportunity to play a second card (same artist, not Double).
                    If someone plays it, they become the NEW auctioneer and get all the money!
                    If no one plays a second card, the original auctioneer gets their card for free.
                  </p>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>Both paintings sold as a set - one bid for both!</li>
                  <li style={{ marginBottom: '8px' }}>Second card determines the auction type</li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Round-ending edge case:</strong> If playing a Double + second card would make an artist reach
                    their 5th painting, <strong>both paintings are unsold</strong> and count toward the round total
                  </li>
                  <li>Powerful for boosting an artist's popularity quickly</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Rounds & Scoring Section */}
        <section id="rounds" style={{ scrollMarginTop: '100px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div style={{ marginBottom: '40px' }}>
              <div
                style={{
                  width: '60px',
                  height: '3px',
                  backgroundColor: ARTISTS[4].color,
                  marginBottom: '16px',
                  boxShadow: `0 0 12px ${ARTISTS[4].color}60`,
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  fontWeight: 200,
                  letterSpacing: '0.1em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                ROUNDS & SCORING
              </h2>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.8,
                fontSize: '1rem',
              }}
            >
              {/* When Round Ends */}
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderLeft: `4px solid ${ARTISTS[4].color}`,
                  borderRadius: '0 12px 12px 0',
                  marginBottom: '32px',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 500,
                    color: ARTISTS[4].color,
                    margin: '0 0 16px 0',
                  }}
                >
                  ⚠️ CRITICAL: When a Round Ends
                </h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>
                  Keep track of how many paintings have been sold for each artist during the round.
                  When the <strong>5th painting of ANY artist is played</strong> (even if it's not sold),
                  the round ends <strong>immediately</strong>:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  <li style={{ marginBottom: '8px' }}>The 5th painting is <strong>NOT auctioned</strong> and nobody owns it</li>
                  <li style={{ marginBottom: '8px' }}>It still counts for ranking that artist</li>
                  <li style={{ marginBottom: '8px' }}>If Double Auction: the 5th painting could be BOTH paintings (2 unsold)</li>
                  <li>Players keep remaining cards for future rounds</li>
                </ul>
              </div>

              {/* Ranking */}
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 400,
                  color: '#ffffff',
                  margin: '0 0 20px 0',
                }}
              >
                Ranking Artists
              </h3>
              <p style={{ marginBottom: '20px' }}>
                Count how many paintings of each artist were <strong>sold in auctions this round</strong> (include unsold 5th paintings).
                Rank the top 3:
              </p>
              <div
                style={{
                  display: 'grid',
                  gap: '16px',
                  marginBottom: '32px',
                }}
              >
                {[
                  { rank: '🥇 First Place', value: '$30k', desc: 'Most paintings sold' },
                  { rank: '🥈 Second Place', value: '$20k', desc: 'Second most paintings sold' },
                  { rank: '🥉 Third Place', value: '$10k', desc: 'Third most paintings sold' },
                  { rank: 'No Value', value: '$0', desc: 'All other artists' },
                ].map((tier) => (
                  <div
                    key={tier.rank}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: tier.rank.includes('First') ? 'rgba(251, 191, 36, 0.15)' :
                                 tier.rank.includes('Second') ? 'rgba(156, 163, 175, 0.15)' :
                                 tier.rank.includes('Third') ? 'rgba(205, 133, 63, 0.15)' :
                                 'rgba(255,255,255,0.02)',
                      border: tier.rank.includes('First') ? `1px solid ${ARTISTS[0].color}40` :
                                 tier.rank.includes('Second') ? `1px solid ${ARTISTS[1].color}40` :
                                 tier.rank.includes('Third') ? `1px solid ${ARTISTS[2].color}40` :
                                 '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                      {tier.rank}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {tier.desc}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 500, color: ARTISTS[4].color }}>
                      {tier.value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  marginBottom: '32px',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                  <strong style={{ color: ARTISTS[0].color }}>Tiebreaker:</strong> If artists have the same number of sales,
                  the artist with <strong>fewer total cards</strong> ranks higher (Manuel beats Sigrid, Sigrid beats Daniel, etc.).
                  This makes rarer artists more valuable in tie situations.
                </p>
              </div>

              {/* Value Accumulation */}
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 400,
                  color: '#ffffff',
                  margin: '0 0 20px 0',
                }}
              >
                How Values Accumulate
              </h3>
              <p style={{ marginBottom: '20px' }}>
                Artist values <strong>accumulate across rounds</strong>! Place value tiles on the board each round.
                Paintings are worth the <strong>SUM of all tiles</strong> in that artist's column.
              </p>

              <div
                style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, ${ARTISTS[4].color}10, transparent)`,
                  borderRadius: '12px',
                  border: `1px solid ${ARTISTS[4].color}30`,
                  marginBottom: '32px',
                }}
              >
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: ARTISTS[4].color,
                    margin: '0 0 16px 0',
                  }}
                >
                  Example: Rafael Silveira
                </h4>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>Round 1:</strong> Finishes 1st ($30k value). Your Rafael paintings sell for $30k each.
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>Round 2:</strong> Finishes 3rd ($10k value). Now worth $40k each ($30 + $10).
                  </p>
                  <p style={{ marginBottom: '12px' }}>
                    <strong>Round 3:</strong> Not in top 3. Worth $0 this round, but still has $30k + $10k from previous rounds.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Round 4:</strong> Finishes 2nd ($20k value). Worth $60k each! ($30 + $10 + $20)
                  </p>
                </div>
              </div>

              {/* Selling Rules */}
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 400,
                  color: '#ffffff',
                  margin: '0 0 20px 0',
                }}
              >
                Selling to the Bank
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                <li style={{ marginBottom: '12px' }}>All players sell <strong>EVERY painting</strong> they purchased, even if worth nothing</li>
                <li style={{ marginBottom: '12px' }}>After selling, <strong>discard all paintings</strong> from the round - ownership never carries over</li>
                <li style={{ marginBottom: '12px' }}>Paintings not in top 3 can still be valuable from previous rounds (accumulated tiles)</li>
                <li>Cards in players' hands are NOT discarded between rounds</li>
              </ul>

              {/* Value Reference Chart */}
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                }}
              >
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.9)',
                    margin: '0 0 16px 0',
                  }}
                >
                  Quick Reference: Value Progression
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  An artist's value is the sum of all their value tiles from each round they placed in the top 3:
                </p>
                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                    fontSize: '0.85rem',
                  }}
                >
                  {[
                    { rounds: '1st place → 1st place → 1st place → 1st place', value: '$120k (30+30+30+30)' },
                    { rounds: '1st → 2nd → 3rd → 2nd', value: '$90k (30+20+10+20)' },
                    { rounds: '1st → 3rd → nothing → 1st', value: '$60k (30+10+0+20)' },
                    { rounds: '2nd → 3rd → nothing → 1st', value: '$50k (20+10+0+20)' },
                  ].map((example) => (
                    <div
                      key={example.rounds}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{example.rounds}</span>
                      <span style={{ fontWeight: 500, color: ARTISTS[4].color }}>{example.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer with rulebook reference */}
        <footer
          style={{
            padding: '40px 24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            Based on the official Modern Art rulebook by Reiner Knizia
          </p>
          <a
            href="/9b-modern-art-rulebook.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.85rem',
              color: ARTISTS[0].color,
              textDecoration: 'none',
              borderBottom: `1px solid ${ARTISTS[0].color}40`,
              paddingBottom: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            📄 View Official Rulebook PDF
          </a>
        </footer>
      </main>
    </div>
  )
}
