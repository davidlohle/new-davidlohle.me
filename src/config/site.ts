export const site = {
  brand: {
    name: 'David Lohle',
    tagline: 'Untitled 96 · 2026',
  },
  compass: 'DL · 40.6151°N · -74.0393°W',

  hero: {
    greeting: 'Heya!',
    intro: "I'm David, a",
    verbs: ['cooking', 'biking', 'photographing', 'bird-watching', 'hiking', 'camping', 'road-tripping', 'reading'],
    strikes: ['public-transit enthusiast', 'skilled whiteboarder', 'avid jetlagger'],
    correction: '(and software engineer!)',
    subtitle: ['Programmer', 'Systems\u00A0Architect', 'NYC'],
  },

  about: {
    title: 'About Me',
    paragraphs: [
      "I've always loved working with computers. From simple Batch scripts in Pre-K to running one of the world's most popular Minecraft servers, I've had a deep passion for the crossroads of computing, creativity, and community.",
      "Software engineering became my way to translate these ideas in my head to reality—from glue to keep game servers running to early machine-learning concepts for community moderation.",
      "Nowadays, I work at Broadcom (née VMware, Pivotal) helping clients solve all sorts of technical and human challenges. From cloud platform buildouts, to solving megascale hurdles, or even starting training bootcamps, nothing is 'not my job'.",
      'I practice <span style="background: #f3c40c; padding: 0 3px;">Extreme Programming</span>, focusing with User-Centered Design, and implementing with pair programming and test-driven development. I have <em>strong</em> opinions about platforms as products.',
      'Also: a lot of bad bird & astro pictures, bike rides, and a Cannonball attempt.',
    ],
    meta: 'Based: NYC · Stack: Go / Python / Java · 10+ yrs',
  },

  nowIntro: {
    title: "What I'm currently up to.",
  },

  photo: {
    title: 'Recently Seen',
    blurb: "Can't say I'm a good photographer, but I do find it a lot of fun :)",
  },

  projectsIntro: {
    title: 'Personal Projects',
  },

  writingIntro: {
    title: 'Recent Writings',
  },

  contact: {
    title: "Let's build something. Or just say <em>hi</em>.",
    body: "I read every email, usually within a day or two. Happy to talk about any technical issue you're facing, or if you just wanted to chat about something.",
    links: [
      { label: 'hi@davidlohle.me ↗', url: 'mailto:hi@davidlohle.me' },
      { label: 'GitHub ↗', url: 'https://github.com/davidlohle' },
      { label: 'LinkedIn ↗', url: 'https://www.linkedin.com/in/davidlohle/' }
    ],
  },

} as const;

export type Site = typeof site;
