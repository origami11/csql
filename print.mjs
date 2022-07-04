function getColSize(arr) {
    let size = {};
    for(let item of arr) {
        for(let k in item) {
            let n = item[k];
            if (!size.hasOwnProperty(k)) { size[k] = 0; }
          
            size[k] = Math.max(size[k], n ? n.toString().length : 0);
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
    let N = arr.length.toString().length;
    for(let i in values) {
        let item = values[i];
        
        let s = " " +  i +  (' '.repeat(N - i.length)) + ' | ';
        for(let k in item) {
            let n = item[k];
            s += n.toString().replace(/\r|\t|\n/g, ' ') + ' '.repeat(size[k] - (n ? n.toString().length : 0)) +  ' | '; 
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
    for(let i in values) {
        let item = values[i];
        console.log(Object.values(item).join(';'));
    }
}

export function printJSON(arr) {
    console.log(JSON.stringify(arr, 0, 2));
}
