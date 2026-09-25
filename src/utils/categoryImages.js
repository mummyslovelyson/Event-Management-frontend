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
  'Religious events':       'religious-activities',
  'Religious Event':        'religious-activities',
  'Community & Causes':     'religious-activities',
  'Community and Causes':   'religious-activities',
  'Community events':       'religious-activities',
  'Community Event':        'religious-activities',
  'Fundraisers':            'religious-activities',
  'Fundraiser':             'religious-activities',
  'Weddings':               'social-events',
  'Wedding':                'social-events',
  'Networking':             'corporate-event',
  'Education':              'fairs-and-exhibitions',
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
  if (lower.includes('corp') || lower.includes('business') || lower.includes('tech') || lower.includes('conf') || lower.includes('meetup') || lower.includes('network')) {
    return '/assets/images/corporate-event/cover.png';
  }
  if (lower.includes('tourn') || lower.includes('sport') || lower.includes('game') || lower.includes('fit') || lower.includes('race')) {
    return '/assets/images/tournaments/cover.png';
  }
  if (lower.includes('social') || lower.includes('party') || lower.includes('night') || lower.includes('food') || lower.includes('drink') || lower.includes('wed')) {
    return '/assets/images/social-events/cover.png';
  }
  if (lower.includes('movie') || lower.includes('theatre') || lower.includes('play') || lower.includes('film') || lower.includes('drama') || lower.includes('comedy')) {
    return '/assets/images/movies-and-stage-plays/cover.png';
  }
  if (lower.includes('fair') || lower.includes('exhib') || lower.includes('work') || lower.includes('edu') || lower.includes('class')) {
    return '/assets/images/fairs-and-exhibitions/cover.png';
  }
  if (lower.includes('relig') || lower.includes('church') || lower.includes('comm') || lower.includes('cause') || lower.includes('charit') || lower.includes('fund')) {
    return '/assets/images/religious-activities/cover.png';
  }

  return DEFAULT_CATEGORY_IMAGES[fallbackIndex % DEFAULT_CATEGORY_IMAGES.length];
}

export const POPULAR_CATEGORY_LIST = [
  { name: 'Concerts', image: '/assets/images/musical-shows/cover.png', slug: 'concerts', countLabel: 'Live Music' },
  { name: 'Festivals', image: '/assets/images/festivals/cover.png', slug: 'festivals', countLabel: 'Culture & Arts' },
  { name: 'Sports', image: '/assets/images/tournaments/cover.png', slug: 'sports', countLabel: 'Tournaments' },
  { name: 'Conferences', image: '/assets/images/corporate-event/cover.png', slug: 'conferences', countLabel: 'Tech & Business' },
  { name: 'Nightlife', image: '/assets/images/social-events/cover.png', slug: 'nightlife', countLabel: 'Clubs & Lounges' },
  { name: 'Comedy', image: '/assets/images/movies-and-stage-plays/cover.png', slug: 'comedy', countLabel: 'Stand-up & Laughs' },
  { name: 'Networking', image: '/assets/images/corporate-event/cover.png', slug: 'networking', countLabel: 'Meetups & Career' },
  { name: 'Parties', image: '/assets/images/social-events/cover.png', slug: 'parties', countLabel: 'Day & Night Parties' },
  { name: 'Theatre', image: '/assets/images/movies-and-stage-plays/cover.png', slug: 'theatre', countLabel: 'Plays & Drama' },
  { name: 'Religious Events', image: '/assets/images/religious-activities/cover.png', slug: 'religious-events', countLabel: 'Worship & Seminars' },
  { name: 'Corporate Events', image: '/assets/images/corporate-event/cover.png', slug: 'corporate-events', countLabel: 'Summits & Galas' },
  { name: 'Weddings', image: '/assets/images/social-events/cover.png', slug: 'weddings', countLabel: 'Ceremonies & Receptions' },
  { name: 'Education', image: '/assets/images/fairs-and-exhibitions/cover.png', slug: 'education', countLabel: 'Classes & Training' },
  { name: 'Community Events', image: '/assets/images/religious-activities/cover.png', slug: 'community-events', countLabel: 'Local Causes' },
  { name: 'Fundraisers', image: '/assets/images/religious-activities/cover.png', slug: 'fundraisers', countLabel: 'Charity & Non-Profit' },
];
