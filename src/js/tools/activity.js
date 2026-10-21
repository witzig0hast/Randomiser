import { createPickerTool } from './picker.js';

export default createPickerTool({
  id: 'activity',
  icon: 'activity',
  category: 'fun',
  messages: {
    de: {
      title: 'Was unternehmen wir?',
      desc: 'Ideen für Freizeit und Wochenende, ausgelost aus deiner Liste.',
      keywords: 'aktivität freizeit wochenende ausflug langeweile idee',
      placeholder: 'Spaziergang\nKino\nSpieleabend',
      example: ['Spaziergang im Park', 'Kino', 'Spieleabend', 'Gemeinsam kochen', 'Radtour', 'Museum besuchen', 'Picknick', 'Bowling', 'Minigolf', 'Flohmarkt', 'Wandern', 'Café ausprobieren', 'Schwimmen gehen', 'Fotospaziergang', 'Filmmarathon', 'Neues Brettspiel', 'Eis essen gehen', 'Sonnenuntergang ansehen'].join('\n'),
    },
    en: {
      title: 'What shall we do?',
      desc: 'Ideas for free time and weekends, drawn from your list.',
      keywords: 'activity free time weekend outing bored idea',
      placeholder: 'Walk in the park\nCinema\nGame night',
      example: ['Walk in the park', 'Cinema', 'Game night', 'Cook together', 'Bike ride', 'Visit a museum', 'Picnic', 'Bowling', 'Mini golf', 'Flea market', 'Hiking', 'Try a new café', 'Go swimming', 'Photo walk', 'Movie marathon', 'New board game', 'Get ice cream', 'Watch the sunset'].join('\n'),
    },
  },
});
