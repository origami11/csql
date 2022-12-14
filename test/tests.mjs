let runner = [];

export function assert(a, b) {
    if (a == b) {
        console.log('OK');
    } else {
        console.error('FAIL', a, b);
    }
}

export function test(name, fn) {    
    runner.push({n: name, fn: fn});
}

export async function runAll() {
    for(let test of runner) {
        console.log(test.n);
        await test.fn();
    }
}
