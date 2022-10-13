export function getArg(opt, key, def = null) {
    if (opt.hasOwnProperty(key)) {
        return opt[key];
    }
    return def;
}

export function parseArgs(args) {
    let options = {'_': []};
    let key = false;
    for(let arg of args) {
        if (arg.charAt(0) == '-') {
            key = arg;
            options[key] = true;
        } else if (key) {
            options[key] = arg;
            key = false;
        } else {
            options['_'].push(arg);
        }
    }
    return options;
}