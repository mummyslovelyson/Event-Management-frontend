// Central Category Cover Image mapping & resolution utility

export const CATEGORY_IMAGE_MAP = {
  // Musical Shows & Concerts
  'Musical Shows':          'musical-shows',
  'Musical Show':           'musical-shows',
  'Music & Concerts':       'musical-shows',
  'Music and Concerts':     'musical-shows',
  'Concerts':               'musical-shows',
  'Concert':                'musical-shows',
  'Music':                  'musical-shows',

  // Festivals & Cultural
  'Festivals':              'festivals',
  'Festival':               'festivals',
  'Arts & Culture':         'festivals',
  'Arts and Culture':       'festivals',

  // Corporate & Tech & Business
  'Corporate Event':        'corporate-event',
  'Corporate Events':       'corporate-event',
  'Business & Networking':  'corporate-event',
  'Business and Networking': 'corporate-event',
  'Conferences':            'corporate-event',
  'Conference':             'corporate-event',
  'Tech & Innovation':      'corporate-event',

  // Tournaments & Sports
  'Tournaments':            'tournaments',
  'Tournament':             'tournaments',
  'Sports & Fitness':       'tournaments',
  'Sports and Fitness':     'tournaments',
  'Sports':                 'tournaments',

  // Social Events, Nightlife & Food
  'Social Events':          'social-events',
  'Social Event':           'social-events',
  'Nightlife & Parties':    'social-events',
  'Nightlife and Parties':  'social-events',
  'Food & Drinks':          'social-events',
  'Food and Drinks':        'social-events',
  'Parties':                'social-events',
  'Party':                  'social-events',

  // Movies & Stage Plays & Theatre
  'Movies & Stage Plays':   'movies-and-stage-plays',
  'Movies and Stage Plays': 'movies-and-stage-plays',
  'Theatre':                'movies-and-stage-plays',
  'Stage Plays':            'movies-and-stage-plays',
  'Comedy':                 'movies-and-stage-plays',

  // Fairs, Exhibitions & Workshops
  'Fairs & Exhibitions':    'fairs-and-exhibitions',
  'Fairs and Exhibitions':  'fairs-and-exhibitions',
  'Workshops & Education':  'fairs-and-exhibitions',
  'Workshops and Education':'fairs-and-exhibitions',
  'Workshops':              'fairs-and-exhibitions',
  'Exhibitions':            'fairs-and-exhibitions',
  'Exhibition':             'fairs-and-exhibitions',

  // Religious & Community
  'Religious Activities':   'religious-activities',
  'Religious Activity':     'religious-activities',
  'Community & Causes':     'religious-activities',
  'Community and Causes':   'religious-activities',
  'Church':                 'religious-activities',
};

const DEFAULT_CATEGORY_IMAGES = [
  '/assets/images/musical-shows/cover.png',
  '/assets/images/festivals/cover.png',
  '/assets/images/corporate-event/cover.png',
  '/assets/images/tournaments/cover.png',
  '/assets/images/social-events/cover.png',
  '/assets/images/movies-and-stage-plays/cover.png',
  '/assets/images/fairs-and-exhibitions/cover.png',
  '/assets/images/religious-activities/cover.png',
];

/**
 * Returns the verified cover image path for any category name
 */
export function getCategoryImage(name, fallbackIndex = 0) {
  if (!name) {
    return DEFAULT_CATEGORY_IMAGES[fallbackIndex % DEFAULT_CATEGORY_IMAGES.length];
  }

  const trimmed = name.trim();
  const directSlug = CATEGORY_IMAGE_MAP[trimmed];
  if (directSlug) {
    return `/assets/images/${directSlug}/cover.png`;
  }

  // Keyword fuzzy matching
  const lower = trimmed.toLowerCase();
  if (lower.includes('music') || lower.includes('concert') || lower.includes('song') || lower.includes('dj')) {
    return '/assets/images/musical-shows/cover.png';
  }
  if (lower.includes('fest') || lower.includes('art') || lower.includes('cultur')) {
    return '/assets/images/festivals/cover.png';
  }
  if (lower.includes('corp') || lower.includes('business') || lower.includes('tech') || lower.includes('conf') || lower.includes('meetup')) {
    return '/assets/images/corporate-event/cover.png';
  }
  if (lower.includes('tourn') || lower.includes('sport') || lower.includes('game') || lower.includes('fit') || lower.includes('race')) {
    return '/assets/images/tournaments/cover.png';
  }
  if (lower.includes('social') || lower.includes('party') || lower.includes('night') || lower.includes('food') || lower.includes('drink')) {
    return '/assets/images/social-events/cover.png';
  }
  if (lower.includes('movie') || lower.includes('theatre') || lower.includes('play') || lower.includes('film') || lower.includes('drama')) {
    return '/assets/images/movies-and-stage-plays/cover.png';
  }
  if (lower.includes('fair') || lower.includes('exhib') || lower.includes('work') || lower.includes('edu') || lower.includes('class')) {
    return '/assets/images/fairs-and-exhibitions/cover.png';
  }
  if (lower.includes('relig') || lower.includes('church') || lower.includes('comm') || lower.includes('cause') || lower.includes('charit')) {
    return '/assets/images/religious-activities/cover.png';
  }

  return DEFAULT_CATEGORY_IMAGES[fallbackIndex % DEFAULT_CATEGORY_IMAGES.length];
}

export const POPULAR_CATEGORY_LIST = [
  { name: 'Musical Shows', image: '/assets/images/musical-shows/cover.png', slug: 'musical-shows' },
  { name: 'Festivals', image: '/assets/images/festivals/cover.png', slug: 'festivals' },
  { name: 'Corporate Events', image: '/assets/images/corporate-event/cover.png', slug: 'corporate-event' },
  { name: 'Tournaments', image: '/assets/images/tournaments/cover.png', slug: 'tournaments' },
  { name: 'Social Events', image: '/assets/images/social-events/cover.png', slug: 'social-events' },
  { name: 'Movies & Stage Plays', image: '/assets/images/movies-and-stage-plays/cover.png', slug: 'movies-and-stage-plays' },
  { name: 'Fairs & Exhibitions', image: '/assets/images/fairs-and-exhibitions/cover.png', slug: 'fairs-and-exhibitions' },
  { name: 'Religious Activities', image: '/assets/images/religious-activities/cover.png', slug: 'religious-activities' },
];
