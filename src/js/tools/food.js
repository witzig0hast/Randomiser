import { createPickerTool } from './picker.js';

export default createPickerTool({
  id: 'food',
  icon: 'food',
  category: 'fun',
  messages: {
    de: {
      title: 'Was essen wir?',
      desc: 'Der Zufall entscheidet über das nächste Essen. Die Liste ist frei anpassbar.',
      keywords: 'essen hunger mittag abendessen restaurant gericht kochen',
      placeholder: 'Pizza\nSushi\nBurger',
      example: ['Pizza', 'Pasta', 'Burger', 'Sushi', 'Döner', 'Currywurst', 'Salat-Bowl', 'Ramen', 'Tacos', 'Curry', 'Falafel', 'Lasagne', 'Schnitzel', 'Pfannkuchen', 'Gemüsepfanne', 'Flammkuchen', 'Dim Sum', 'Risotto', 'Suppe', 'Wraps'].join('\n'),
    },
    en: {
      title: 'What’s for dinner?',
      desc: 'Let chance decide the next meal. The list is fully editable.',
      keywords: 'food eat hungry lunch dinner restaurant dish cook',
      placeholder: 'Pizza\nSushi\nBurgers',
      example: ['Pizza', 'Pasta', 'Burgers', 'Sushi', 'Kebab', 'Fish & chips', 'Salad bowl', 'Ramen', 'Tacos', 'Curry', 'Falafel', 'Lasagne', 'Schnitzel', 'Pancakes', 'Stir-fry', 'Flatbread', 'Dim sum', 'Risotto', 'Soup', 'Wraps'].join('\n'),
    },
  },
});
