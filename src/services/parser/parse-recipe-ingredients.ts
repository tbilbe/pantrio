import * as fs from 'fs';
import * as path from 'path';
import RecipesParser from 'recipes-parser';

import { units } from './units';
import { globalUnit } from './glabal_unit';
const rules = fs.readFileSync(path.join(__dirname, `node_modules/recipes-parser/nlp/en/rules.pegjs`), {
    encoding: 'utf8',
});

export const parser = new RecipesParser(rules, units, globalUnit);

// const results = parser.getIngredientsFromText(
//   ["3 cl. fresh raspberries"],
//   true
// );
