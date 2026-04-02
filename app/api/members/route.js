import yaml from 'js-yaml'

const CURRENT_YEAR = 2025

const YAML_BASE = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main"

// Fetches committee names and memberships, returns a map of bioguideId -> [committee names]
async function fetchCommitteesByMember() {
  const [namesText, membershipsText] = await Promise.all([
    fetch(`${YAML_BASE}/committees-current.yaml`,           { next: { revalidate: 86400 } }).then(r => r.text()),
    fetch(`${YAML_BASE}/committee-membership-current.yaml`, { next: { revalidate: 86400 } }).then(r => r.text()),
  ])

  const committees   = yaml.load(namesText)   // array of { thomas_id, name, ... }
  const memberships  = yaml.load(membershipsText) // { SSAF: [{ bioguide, ... }], ... }

  // Build a lookup of committee code -> human name
  const nameByCode = {}
  for (const c of committees) {
    nameByCode[c.thomas_id] = c.name
  }

  // Build a lookup of bioguideId -> [committee names]
  const byMember = {}
  for (const [code, members] of Object.entries(memberships)) {
    const name = nameByCode[code]
    if (!name) continue
    for (const m of members) {
      if (!byMember[m.bioguide]) byMember[m.bioguide] = []
      if (!byMember[m.bioguide].includes(name)) byMember[m.bioguide].push(name)
    }
  }

  return byMember
}

// Converts "Last, First Middle" → "First Last" (drops middle name/initial)
function reverseName(apiName) {
  const [last, first] = apiName.split(", ")
  if (!first) return apiName
  const firstName = first.split(" ")[0]
  return `${firstName} ${last}`
}

// Returns "House" or "Senate" based on the member's most recent term
function getCurrentChamber(terms) {
  const items = terms?.item ?? []
  if (items.length === 0) return "House"
  const latest = items.reduce((best, t) => t.startYear > best.startYear ? t : best)
  return latest.chamber === "House of Representatives" ? "House" : "Senate"
}

// Converts a raw Congress.gov member object into the shape our app uses
function normalizeMember(m, committeesByMember) {
  const terms = m.terms?.item ?? []

  const earliestYear = terms.length > 0
    ? Math.min(...terms.map(t => t.startYear))
    : CURRENT_YEAR

  // The API uses "Democratic" — we normalize to "Democrat" to match our filter labels
  const party = m.partyName === "Democratic" ? "Democrat" : m.partyName

  return {
    id:           m.bioguideId,
    name:         reverseName(m.name),
    state:        m.state,
    party,
    chamber:      getCurrentChamber(m.terms),
    yearsInOffice: Math.max(0, CURRENT_YEAR - earliestYear),
    freshmen:     earliestYear >= 2023,
    committees:   committeesByMember[m.bioguideId] ?? [],
    fact:         "",
    photoUrl:     `/photos/${m.bioguideId}.jpg`,
  }
}

export async function GET() {
  try {
    const BASE = "https://api.congress.gov/v3/member"
    const KEY  = process.env.CONGRESS_API_KEY

    // Fetch all 3 pages in parallel (538 members total, 250 per page)
    const urls = [0, 250, 500].map(
      offset => `${BASE}?currentMember=true&limit=250&offset=${offset}&format=json&api_key=${KEY}`
    )

    const [responses, committeesByMember] = await Promise.all([
      Promise.all(urls.map(url => fetch(url, { next: { revalidate: 3600 } }))),
      fetchCommitteesByMember(),
    ])
    const pages = await Promise.all(responses.map(r => r.json()))
    const raw   = pages.flatMap(page => page.members ?? [])

    const members = raw.map(m => normalizeMember(m, committeesByMember))

    return Response.json(members)
  } catch (error) {
    console.error("Congress API fetch failed:", error)
    return Response.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}
