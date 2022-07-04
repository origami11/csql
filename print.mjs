function getColSize(arr) {
    let size = [];
    for(let item of arr) {
        for(let k in item) {
            let n = item[k];
            
            if (!size.hasOwnProperty(k)) size[k] = 0;
            size[k] = Math.max(size[k], n.length);
        }
    }
    return size;
}

export function printTable(arr) {
    if (arr.length == 0) {
        return;
    }
    let keys = Object.keys(arr[0]);
    let first = [];
    for(let k of keys) {
        first[k] = k;
    }

    arr.unshift(first);

    let size = getColSize(arr);
    let values = arr;
    let N = arr.length.length;
    for(let i in values) {
        let item = values[i];
        
        let s = " " +  i +  ' '.repeat(N - i.length) + " | ";
        for(let k in item) {
            let n = item[k];
            s += n + ' '.repeat(size[k] - n.length) +  ' | '; 
        }
        console.log(s);
    }
}

export function printCSV(arr) {
    if (arr.length == 0) {
        return;
    }
    let keys = Object.keys(arr[0]);
    let first = [];
    for(let k of keys) {
        first[k] = k;
    }

    arr.unshift(first);

    let values = arr;
    let N = arr.length.length;
    for(let i in values) {
        let item = values[i];
        console.log(item.join(';'));
    }
}

export function printJSON(arr) {
    console.log(JSON.stringify(arr, 0, 2));
}
