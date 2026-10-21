import { register } from '../i18n.js';

// Reihenfolge = Reihenfolge auf der Startseite
import yesno from './yesno.js';
import coin from './coin.js';
import picker from './picker.js';
import wheel from './wheel.js';
import eightball from './eightball.js';
import rps from './rps.js';
import number from './number.js';
import dice from './dice.js';
import lottery from './lottery.js';
import percent from './percent.js';
import teams from './teams.js';
import order from './order.js';
import cards from './cards.js';
import bottle from './bottle.js';
import password from './password.js';
import letter from './letter.js';
import color from './color.js';
import datetime from './datetime.js';
import uuid from './uuid.js';
import truth from './truth.js';
import food from './food.js';
import activity from './activity.js';

export const CATEGORIES = ['decide', 'numbers', 'groups', 'text', 'fun'];

export const TOOLS = [yesno, coin, picker, wheel, eightball, rps, number, dice, lottery, percent, teams, order, cards, bottle, password, letter, color, datetime, uuid, truth, food, activity];

for (const tool of TOOLS) {
  for (const [lang, messages] of Object.entries(tool.messages)) register(lang, tool.id, messages);
}

export const toolById = (id) => TOOLS.find((tool) => tool.id === id);
