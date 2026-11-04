/**
 * The temple's governing body for the 2026–27 term.
 *
 * Unlike almost everything else in this folder, **none of this is seeded**. It is the
 * roster the society publishes, transcribed from `BOARD_SOURCE` below, and these are
 * real people. So: do not invent a name to fill a column, do not reorder a group to
 * make a card balance, and do not drop somebody because a list looks long. When the
 * term turns over, replace the whole file from the new PDF rather than editing names
 * in place — a half-updated roster is worse than an openly stale one, because nothing
 * on the page says which half is which.
 *
 * The order inside each group is the order the published sheet prints, which is not
 * alphabetical and is not an accident — office bearers lead, and the rest follow in
 * the society's own sequence. `OFFICES` is carried on the member rather than split
 * into a separate "office bearers" group, because all ten of the Executive Committee
 * are the Executive Committee; six of them additionally hold an office.
 */

export interface BoardMember {
  name: string
  /** The office held, where the published roster names one. */
  office?: string
}

export interface BoardGroup {
  key: string
  title: string
  /** The roster's own second line, where it carries one. */
  subtitle?: string
  members: BoardMember[]
}

/** The term this roster covers, as the society's own document titles it. */
export const BOARD_TERM = '2026–27'

/** Where it came from. Printed on the page so a reader can check it against the source. */
export const BOARD_SOURCE =
  'https://chakra-mts.s3.us-east-2.amazonaws.com/mts/docs/mts_board_2026-27.pdf'

export const BOARD_PRESIDENT: BoardMember = {
  name: 'Sockalingam Kannappan',
  office: 'Hon. President',
}

export const BOARD_GROUPS: BoardGroup[] = [
  {
    key: 'executive',
    title: 'Executive Committee',
    members: [
      { name: 'Kumar Bashyam', office: 'Chairman' },
      { name: 'Vijayarani Chilukuri', office: 'Secretary' },
      { name: 'Sethuraman Raman', office: 'Treasurer' },
      { name: 'Srikanth Venugopalan', office: 'Vice Chairman' },
      { name: 'Murugan Selvan', office: 'Joint Secretary' },
      { name: 'Muthuraman Solayappan', office: 'Joint Treasurer' },
      { name: 'Parthiban Dhanabalan' },
      { name: 'Rajendra Mikkilineni' },
      { name: 'P. Vaduganathan' },
      { name: 'Subbarao Yalamanchili' },
    ],
  },
  {
    key: 'directors',
    title: 'Directors',
    members: [
      { name: 'Sowmia Ganesan' },
      { name: 'Satheesh Kumar' },
      { name: 'Madhuri Mukhopadhyay' },
      { name: 'Gopee Ravipati' },
      { name: 'Luckmi Anantha Pawa' },
      { name: 'Raja Palvadi' },
      { name: 'Govindan Somaskandan' },
      { name: 'Saraswathi Sumathi Srinivasan' },
    ],
  },
  {
    key: 'advisory',
    title: 'Advisory Council',
    members: [
      { name: 'Vinod Reddy Kaila', office: 'Hon. Vice President' },
      { name: 'M.K. Sriram' },
      { name: 'A. Alagappan' },
      { name: 'Sundar Arun' },
      { name: 'Karunakar Chowdavarappu' },
      { name: 'Ramamurthy Ramsunder' },
      { name: 'Rama S Chavali' },
      { name: 'T. Gopalakrishnan' },
      { name: 'Dhamo S Dhamotharan' },
      { name: 'Tupil V Narasiman' },
    ],
  },
  {
    key: 'trustees',
    title: 'Hon. Advisory Council',
    subtitle: 'Trustees',
    members: [
      { name: 'Padmini Ranganathan' },
      { name: 'Bala N Aiyer' },
      { name: 'S Alagugurusamy' },
      { name: 'A.V.N. Reddy' },
      { name: 'K. Ramaswamy' },
    ],
  },
]

/**
 * Those who have stepped back from an office but are still named on the roster. Kept
 * out of {@link BOARD_GROUPS} because each is a group of one, and four cards holding a
 * single name each would read as a layout accident rather than as a distinction.
 */
export const BOARD_EMERITUS: BoardMember[] = [
  { name: 'Venugopal Menon', office: 'Chairman Emeritus' },
  { name: 'S.G. Appan', office: 'Director Emeritus' },
]

/**
 * Everybody named above, counted once.
 *
 * Derived rather than written down: the non-profit card quotes this figure, and a
 * hand-typed total is the first thing to go stale when a name is added.
 */
export const BOARD_HEADCOUNT =
  1 + BOARD_GROUPS.reduce((n, g) => n + g.members.length, 0) + BOARD_EMERITUS.length
