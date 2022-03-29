import * as fs from 'fs';
import * as path from 'path';
import RecipesParser from 'recipes-parser';
import { parse } from 'recipe-ingredient-parser-v3';
import { units } from './units';
import { globalUnit } from './glabal_unit';

// const rules = fs.readFileSync(path.join(__dirname, `src/services/parser/rules.pegjs`), {
//     encoding: 'utf8',
// });

// console.log('dir name', __dirname);

// console.log(rules);
// export const pantrioParser = new RecipesParser(rules, units, globalUnit);
// const ingreds = [
//     'Ingredients',
//     '240g wholewheat fusilli',
//     'knob of butter',
//     '1 large shallot, finely chopped',
//     '140g frozen peas',
//     '2 skinless salmon fillets, cut into chunks',
//     '140g low-fat crème fraîche',
//     '1/2 low-salt vegetable stock cube',
//     'small bunch of chives, snipped',
// ];

// const res = ingreds.map((i) => {
//     return pantrioParser.getIngredientsFromText([i], true);
// });

export const pantrioParserV2 = (rawIngredientList: string[]) => {
    const buildParsed = rawIngredientList.map((el) => {
        // const parsed =
        return {
            rawIngredientString: el,
            ...parse(el, 'eng'),
        };
    });
    return buildParsed;
};
