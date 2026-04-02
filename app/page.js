"use client"

import { useState, useEffect, useRef } from "react"
import Lottie from 'lottie-react'
import fireAnimation from './animations/Fire.json'


// Returns members filtered by the current filter selections
function applyFilters(members, filters, starredIds = new Set()) {
  return members.filter(m => {
    if (filters.party !== "all" && m.party !== filters.party) return false
    if (filters.chamber !== "all" && m.chamber !== filters.chamber) return false
    if (filters.committee !== "all" && !m.committees.includes(filters.committee)) return false
    if (filters.freshmenOnly && !m.freshmen) return false
    if (filters.starredOnly && !starredIds.has(m.id)) return false
    return true
  })
}

// Returns a sorted list of every unique committee across all members
function getAllCommittees(members) {
  const all = members.flatMap(m => m.committees)
  return [...new Set(all)].sort()
}

// 3D press-in button — handles its own pressed state so the shadow effect works reliably
function Button3D({ onClick, buttonRef, children, disabled }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        backgroundColor: disabled ? '#a8e063' : pressed ? '#4eb302' : '#58cc02',
        boxShadow: disabled ? '0 4px 0 #8bc34a' : pressed ? '0 1px 0 #46a302' : '0 4px 0 #46a302',
        transform: pressed && !disabled ? 'translateY(3px)' : 'translateY(0)',
        transition: 'transform 0.08s, box-shadow 0.08s',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '700',
        fontSize: '1.125rem',
        width: '100%',
        padding: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// Duolingo's exact brand colors
const COLORS = {
  green:      '#58cc02',
  greenDark:  '#46a302',
  greenLight: '#d7f5b0',
  red:        '#ff4b4b',
  redLight:   '#ffdfe0',
  orange:     '#ff9600',
  blue:       '#1cb0f6',
}

const CONFETTI_COLORS = [COLORS.green, COLORS.red, COLORS.orange, '#ffc800', '#ce82ff', COLORS.blue]

// Confetti component — renders animated particles that burst across the screen on correct answers
function Confetti({ particles }) {
  if (!particles.length) return null
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.tall ? p.size * 0.45 : p.size,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '3px',
            animationName: 'confetti-fall',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
            opacity: 0,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            '--rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}

// A single toggle button used in the filter screen
function FilterChip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: selected ? COLORS.blue : 'white',
        borderColor: selected ? COLORS.blue : '#e5e7eb',
        color: selected ? 'white' : '#6b7280',
      }}
    >
      {label}
    </button>
  )
}

const DEFAULT_FILTERS = { party: "all", chamber: "all", committee: "all", freshmenOnly: false, starredOnly: false }

export default function Home() {
  const [screen, setScreen] = useState("filters") // "filters" | "quiz"
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [allMembers, setAllMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [deck, setDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [feedback, setFeedback] = useState(null) // null | "correct" | "wrong"
  const [missed, setMissed] = useState([])
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [popActive, setPopActive] = useState(false)
  const [confettiParticles, setConfettiParticles] = useState([])
  const [showPhotoToggle, setShowPhotoToggle] = useState(false)
  const [starredIds, setStarredIds] = useState(new Set())
  const [starredHydrated, setStarredHydrated] = useState(false)
  const [starPopped, setStarPopped] = useState(false)

  const nextButtonRef = useRef(null)

  // Fetch all members from the Congress.gov API on first load
  useEffect(() => {
    fetch("/api/members")
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setAllMembers(data)
      })
      .catch(err => setFetchError(err.message))
      .finally(() => setLoadingMembers(false))
  }, [])

  // Load starred members from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("starred-members")
    if (saved) setStarredIds(new Set(JSON.parse(saved)))
    setStarredHydrated(true)
  }, [])

  // Save starred members to localStorage whenever they change
  useEffect(() => {
    if (!starredHydrated) return
    localStorage.setItem("starred-members", JSON.stringify([...starredIds]))
  }, [starredIds, starredHydrated])

  // Focus Next button shortly after answering so Enter key advances the card
  useEffect(() => {
    if (feedback !== null) {
      const timer = setTimeout(() => nextButtonRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Clear card pop animation after it plays
  useEffect(() => {
    if (popActive) {
      const timer = setTimeout(() => setPopActive(false), 350)
      return () => clearTimeout(timer)
    }
  }, [popActive])

  function spawnConfetti() {
    const particles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: 20 + Math.random() * 60,
      top:  25 + Math.random() * 25,
      delay: Math.random() * 0.35,
      duration: 0.8 + Math.random() * 0.5,
      tx: (Math.random() - 0.5) * 320,
      ty: 120 + Math.random() * 220,
      rotate: Math.random() * 720 - 360,
      size: 7 + Math.floor(Math.random() * 8),
      circle: Math.random() > 0.6,
      tall: Math.random() > 0.5,
    }))
    setConfettiParticles(particles)
    setTimeout(() => setConfettiParticles([]), 1600)
  }

  function startQuiz(withFilters) {
    const filtered = applyFilters(allMembers, withFilters, starredIds)
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    setDeck(shuffled)
    setCurrentIndex(0)
    setInputValue("")
    setFeedback(null)
    setCorrect(0)
    setMissed([])
    setStreak(0)
    setPopActive(false)
    setConfettiParticles([])
    setScreen("quiz")
  }

  function handleStartOver() {
    startQuiz(filters)
  }

  function handleOpenSettings() {
    setScreen("filters")
  }

  function handleSubmit() {
    if (feedback !== null || inputValue.trim() === "") return

    const member = deck[currentIndex]
    const isCorrect = inputValue.trim().toLowerCase() === member.name.toLowerCase()

    if (isCorrect) {
      setCorrect((n) => n + 1)
      setStreak((s) => s + 1)
      setPopActive(true)
      spawnConfetti()
    } else {
      setMissed((prev) => [...prev, member])
      setStreak(0)
    }

    setFeedback(isCorrect ? "correct" : "wrong")
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1)
    setInputValue("")
    setFeedback(null)
    setShowPhotoToggle(false)
    setStarPopped(false)
  }

  function handleToggleStar(id) {
    setStarredIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setStarPopped(true)
    setTimeout(() => setStarPopped(false), 350)
  }

  function handleRetryMissed() {
    setDeck(missed)
    setCurrentIndex(0)
    setInputValue("")
    setFeedback(null)
    setCorrect(0)
    setMissed([])
    setStreak(0)
    setPopActive(false)
    setConfettiParticles([])
  }

  // ---- Loading / error screens ----
  if (loadingMembers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading members...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">Failed to load members</p>
          <p className="text-gray-400 text-sm">{fetchError}</p>
        </div>
      </div>
    )
  }

  // ---- Filter screen ----
  if (screen === "filters") {
    const matchCount = applyFilters(allMembers, filters, starredIds).length

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">US Congress Face and Name Flashcards</h1>
          <p className="text-gray-400 mb-8">For congressional reporters</p>

          {/* Party filter */}
          <p className="text-sm font-semibold text-gray-500 mb-2">Party</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {["all", "Democrat", "Republican", "Independent"].map(option => (
              <FilterChip
                key={option}
                label={option === "all" ? "All" : option}
                selected={filters.party === option}
                onClick={() => setFilters(f => ({ ...f, party: option }))}
              />
            ))}
          </div>

          {/* Chamber filter */}
          <p className="text-sm font-semibold text-gray-500 mb-2">Chamber</p>
          <div className="flex gap-2 mb-6">
            {["all", "House", "Senate"].map(option => (
              <FilterChip
                key={option}
                label={option === "all" ? "All" : option}
                selected={filters.chamber === option}
                onClick={() => setFilters(f => ({ ...f, chamber: option }))}
              />
            ))}
          </div>

          {/* Committee filter */}
          <p className="text-sm font-semibold text-gray-500 mb-2">Committee</p>
          <div className="relative mb-6">
            <select
              value={filters.committee}
              onChange={(e) => setFilters(f => ({ ...f, committee: e.target.value }))}
              className="w-full appearance-none bg-white border-2 rounded-xl px-4 py-2 pr-10 text-sm font-semibold focus:outline-none cursor-pointer"
              style={{
                borderColor: filters.committee !== "all" ? COLORS.blue : "#e5e7eb",
                color: filters.committee !== "all" ? COLORS.blue : "#6b7280",
              }}
            >
              <option value="all">All committees</option>
              {getAllCommittees(allMembers).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
          </div>

          {/* Freshmen filter */}
          <p className="text-sm font-semibold text-gray-500 mb-2">Seniority</p>
          <div className="flex gap-2 mb-6">
            <FilterChip
              label="All members"
              selected={!filters.freshmenOnly}
              onClick={() => setFilters(f => ({ ...f, freshmenOnly: false }))}
            />
            <FilterChip
              label="Freshmen only"
              selected={filters.freshmenOnly}
              onClick={() => setFilters(f => ({ ...f, freshmenOnly: true }))}
            />
          </div>

          {/* Starred filter */}
          <p className="text-sm font-semibold text-gray-500 mb-2">Starred</p>
          <div className="flex gap-2 mb-8">
            <FilterChip
              label="All members"
              selected={!filters.starredOnly}
              onClick={() => setFilters(f => ({ ...f, starredOnly: false }))}
            />
            <FilterChip
              label="Starred only"
              selected={filters.starredOnly}
              onClick={() => setFilters(f => ({ ...f, starredOnly: true }))}
            />
          </div>

          {/* Match count + Start button */}
          <p className="text-sm text-gray-400 text-center mb-3">
            {matchCount === 0
              ? filters.starredOnly ? "You haven't starred anyone yet" : "No members match these filters"
              : `${matchCount} member${matchCount === 1 ? "" : "s"} selected`}
          </p>
          <Button3D
            onClick={() => startQuiz(filters)}
            disabled={matchCount === 0}
          >
            Start →
          </Button3D>
        </div>
      </div>
    )
  }

  // ---- Finished screen ----
  if (currentIndex >= deck.length) {
    const total = deck.length
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-sm flex flex-col h-full">
          <div className="text-center mb-6">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">You finished the deck!</h2>
            <p className="text-gray-500">
              {correct} correct · {total - correct} wrong · out of {total}
            </p>
          </div>

          {missed.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 text-left overflow-y-auto flex-1">
              <p className="text-sm font-semibold text-gray-500 mb-2">Ones you missed:</p>
              <ul className="space-y-1">
                {missed.map((m) => (
                  <li key={m.id} className="text-sm text-gray-700">• {m.name} — {m.state}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {missed.length > 0 && (
              <Button3D onClick={handleRetryMissed}>
                Retry missed ({missed.length})
              </Button3D>
            )}
            <button
              onClick={handleStartOver}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Start over ({deck.length})
            </button>
            <button
              onClick={handleOpenSettings}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Change filters
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Quiz screen ----
  const member = deck[currentIndex]
  const progress = (currentIndex / deck.length) * 100

  const cardStyle = {
    backgroundColor:
      feedback === "correct" ? COLORS.greenLight :
      feedback === "wrong"   ? COLORS.redLight   :
      "white",
    border: `2px solid ${
      feedback === "correct" ? COLORS.green :
      feedback === "wrong"   ? COLORS.red   :
      "#e5e7eb"
    }`,
    transition: "background-color 0.2s, border-color 0.2s",
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      <Confetti particles={confettiParticles} />

      <div className="w-full max-w-sm flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-700">US Congress Face and Name Flashcards</h1>
          <button
            onClick={handleOpenSettings}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Card count + streak */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-400">Card {currentIndex + 1} of {deck.length}</p>
          {streak > 0 && (
            <div className="flex items-center gap-1">
              <Lottie
                animationData={fireAnimation}
                loop={true}
                style={{ width: 28, height: 28 }}
              />
              <span className="font-bold" style={{ fontSize: 18, color: COLORS.orange, marginTop: 6 }}>
                {streak}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full mb-4">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: COLORS.blue }}
          />
        </div>

        {/* Photo card — shows photo before guessing, name after */}
        <div
          className={`relative rounded-2xl shadow-md overflow-hidden mb-4 ${popActive ? "card-pop" : ""}`}
          style={{ ...cardStyle, height: '280px' }}
        >
          {starredHydrated && (
            <button
              onClick={() => handleToggleStar(member.id)}
              aria-label={starredIds.has(member.id) ? "Unstar" : "Star"}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                fontSize: '1.25rem',
                lineHeight: 1,
                padding: 0,
                background: 'rgba(0,0,0,0.25)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: '3px',
                zIndex: 10,
                animationName: starPopped ? 'star-pop' : 'none',
                animationDuration: '350ms',
                animationTimingFunction: 'ease-out',
              }}
            >
              {starredIds.has(member.id) ? '⭐' : '☆'}
            </button>
          )}
          {feedback && !showPhotoToggle ? (
            <button
              onClick={() => setShowPhotoToggle(true)}
              className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer"
            >
              <p className="text-3xl font-bold text-center text-gray-800">{member.name}</p>
              <p className="text-xs text-gray-400 mt-3">tap to see photo</p>
            </button>
          ) : (
            <img
              src={member.photoUrl}
              alt="Congress member"
              className={`w-full h-full object-contain ${feedback ? "cursor-pointer" : ""}`}
              onClick={() => feedback && setShowPhotoToggle(false)}
              onError={(e) => { e.target.src = "https://placehold.co/400x500/d1d5db/6b7280?text=No+Photo" }}
            />
          )}
        </div>

        {/* Facts panel + Next button — shown after guessing */}
        {feedback && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="overflow-y-auto min-h-0">
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm text-gray-700" style={{ border: '1px solid #f3f4f6' }}>
                <div className="flex justify-between">
                  <span className="text-gray-400">State</span>
                  <span className="font-medium">{member.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Party</span>
                  <span className="font-medium">{member.party}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chamber</span>
                  <span className="font-medium">{member.chamber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Years in office</span>
                  <span className="font-medium">{member.yearsInOffice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Committees</span>
                  <span className="font-medium text-right max-w-[60%]">{member.committees.join(", ")}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 text-gray-500 italic">
                  {member.fact}
                </div>
              </div>
            </div>
            <Button3D onClick={handleNext} buttonRef={nextButtonRef}>Next →</Button3D>
          </div>
        )}

        {/* Input + Submit — shown before guessing */}
        {!feedback && (
          <>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
              placeholder="Type their name..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 mb-3"
            />
            <Button3D onClick={handleSubmit}>Submit</Button3D>
            <button
              onClick={() => setInputValue(member.name)}
              className="text-xs text-gray-300 hover:text-gray-400 transition-colors cursor-pointer mt-2 text-center w-full"
            >
              reveal answer
            </button>
          </>
        )}

      </div>
    </div>
  )
}
