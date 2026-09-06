import { ContenderDossier } from '../types';

export const SCIFI_DATABASE: ContenderDossier[] = [
  {
    name: 'Portal Gun (ASHPD)',
    aliases: ['portal gun', 'ashpd', 'aperture portal gun'],
    category: 'scifi',
    universeOrOrigin: 'Aperture Science (Portal / Half-Life)',
    score: 95,
    scouterPowerLevel: 9400000,
    badges: [
      { label: 'Technology', value: 'Quantum Tunneling Device', highlight: true },
      { label: 'Range', value: 'Interplanetary (Fired a portal onto the Moon)' },
      { label: 'Physics', value: 'Preserves kinetic momentum seamlessly ("Speedy thing goes in...")' },
      { label: 'Power Source', value: 'Miniature black hole ringed with cooling rods' },
    ],
    headlineFeat: 'Shot a portal through 238,900 miles of space directly onto the surface of the Moon, creating instant lunar vacuum suction.',
    verdictSnippet: "The Portal Gun's instantaneous momentum-conserving spatial wormholes redirect any weapon back at the attacker.",
  },
  {
    name: 'Lightsaber',
    aliases: ['lightsaber', 'jedi lightsaber', 'sith lightsaber'],
    category: 'scifi',
    universeOrOrigin: 'Star Wars (Jedi Order)',
    score: 91,
    scouterPowerLevel: 8850000,
    badges: [
      { label: 'Technology', value: 'Kyber Crystal Plasma Blade', highlight: true },
      { label: 'Core Element', value: 'Attuned Kyber Crystal resonating in the Force' },
      { label: 'Cutting Power', value: 'Melts blast doors and armor instantly' },
      { label: 'Defense', value: 'Deflects high-velocity blaster bolts' },
    ],
    headlineFeat: 'An elegant weapon for a more civilized age, capable of slicing effortlessly through reinforced bulkheads.',
    verdictSnippet: "The Lightsaber's weightless plasma blade slices through mundane metals and barriers like boiling water through snow.",
  },
  {
    name: 'TARDIS',
    aliases: ['tardis', 'time machine tardis', 'doctor who tardis'],
    category: 'scifi',
    universeOrOrigin: 'Doctor Who (Time Lords of Gallifrey)',
    score: 99,
    scouterPowerLevel: 9900000,
    badges: [
      { label: 'Technology', value: 'Type 40 TT Capsule (Living Time Machine)', highlight: true },
      { label: 'Dimension', value: '"Bigger on the inside" (Infinite rooms & eye of harmony)' },
      { label: 'Capability', value: 'Travels to any point in time, space, and alternate dimensions' },
      { label: 'Defense', value: 'Absolute Temporal Forcefields' },
    ],
    headlineFeat: 'Houses an imprisoned collapsing star within its heart and dematerializes out of the time vortex at will.',
    verdictSnippet: "The TARDIS's mastery over all timelines, dimensions, and temporal causality out-scales conventional physical weapons.",
  },
];
