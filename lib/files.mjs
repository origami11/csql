import * as fs from 'fs';
import * as path from 'path';
export function parseCSV(data, sep, header = null) {
    let result = [], first;
    if (header) {
        first = header.split(',');
    }
    else {
        let header = data.shift();
        first = header.split(sep);
    }
    for (let row of data) {
        let item = row.split(sep);
        let value = {};
        for (let n in first) {
            value[first[n]] = item[n];
        }
        result.push(value);
    }
    return result;
}
export function loadCSV(path, sep = ";") {
    let data = fs.readFileSync(path, 'utf-8').split("\n");
    return parseCSV(data, sep, false);
}
export function loadJSON(name, config) {
    let path = process.env.HOME + "/" + name + ".json";
    if (!fs.existsSync(path)) {
        path = name + ".json";
    }
    let result = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return result;
}
export function klawSync(dir, opts = {}, ls = null) {
    if (!ls) {
        ls = [];
        dir = path.resolve(dir);
        opts.fs = opts.fs || fs;
        if (opts.depthLimit > -1)
            opts.rootDepth = dir.split(path.sep).length + 1;
    }
    const paths = opts.fs.readdirSync(dir).map(p => dir + path.sep + p);
    for (var i = 0; i < paths.length; i += 1) {
        const pi = paths[i];
        const st = opts.fs.statSync(pi);
        const item = Object.assign({ path: pi }, st);
        const isUnderDepthLimit = (!opts.rootDepth || pi.split(path.sep).length - opts.rootDepth < opts.depthLimit);
        const filterResult = opts.filter ? opts.filter(item) : true;
        const isDir = st.isDirectory();
        const shouldAdd = filterResult && (isDir ? !opts.nodir : !opts.nofile);
        const shouldTraverse = isDir && isUnderDepthLimit && (opts.traverseAll || filterResult);
        if (shouldAdd)
            ls.push(item);
        if (shouldTraverse)
            ls = klawSync(pi, opts, ls);
    }
    return ls;
}
