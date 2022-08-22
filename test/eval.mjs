import * as path from 'path';
import * as url from 'url';
import { executeSQL } from '../index.mjs';

import { assert, test, runAll } from './tests.mjs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
process.chdir(path.join(__dirname, '../sample'));

test('select all', async () => {
    let data = await executeSQL("SELECT * FROM data");
    assert(data.length, 9);
});

test('select property', async () => {
    let data = await executeSQL("SELECT name FROM data");
    assert(data.length, 9);    
});

test('order asc', async () => {
    let data = await executeSQL("SELECT name, mass AS m FROM data ORDER BY mass");
    assert(data[0].name, "JUPITER");    
});

test('order desc', async () => {
    let data = await executeSQL("SELECT name, mass AS m FROM data ORDER BY mass DESC");
    assert(data[0].name, "PLUTO");    
});

runAll();