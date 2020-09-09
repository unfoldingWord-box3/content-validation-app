// utilities

// function to convert an array to an object
// with keys being 0..n
export const array_to_obj = ( (ar: any) => {
    const ob = {};
    Object.assign(ob,ar);
    return ob;
});

// function to convert map to object
export const map_to_obj = ( (mp: any[]) => {
    const ob: any = {};
    mp.forEach((v: any,k: any) => {ob[k]=v});
    return ob;
});

// function to convert object to a map
export const obj_to_map = ( (ob: { [x: string]: any; }) => {
    const mp = new Map();
    Object.keys ( ob ).forEach (k => { mp.set(k, ob[k]) });
    return mp;
});


interface ObjectLiteral {
    [key: string]: any;
} 

/* Sample of Warnings List:
    C: "1"
    V: "1"
    bookID: "2PE"
    characterIndex: undefined
    extract: undefined
    lineNumber: 4
    location: " with ID 'n1di' en 2pe book package from unfoldingword"
    message: "TN Missing OrigQuote field"
    priority: 276
*/
// function to convert word frequency map
// to an object suitable for MaterialTable
export const notices_to_mt = ( ob: { [x: string]: any; }) => {
    let mt: ObjectLiteral = {};
    mt.title = "Validation Notices";
    mt.columns = [
        { title: 'Resource', field: 'extra' },
        { title: 'Priority', field: 'priority' },
        { title: 'Chapter', field: 'C' },
        { title: 'Verse', field: 'V' },
        { title: 'Line', field: 'lineNumber' },
        { title: 'Location', field: 'location' },
        { title: 'Message', field: 'message' },
    ];
    mt.data = [];
    Object.keys(ob).forEach ( key => {
        let _location = ob[key].location;
        _location = _location.replace(/en ... book package from unfoldingword/, '' );
        mt.data.push({ 
            extra: ob[key].extra,
            priority: ob[key].priority,
            C: ob[key].C, 
            V: ob[key].V, 
            lineNumber: ob[key].lineNumber,
            location: _location,
            message: ob[key].message,
        })
    })

    mt.options = { 
        sorting: true, 
        padding: 'dense', 
        exportButton: true, 
        exportAllData: true, 
        tableLayout: 'auto',
        columnsButton: true,
        filtering: true,
        pageSize: 10,
    };

    return mt;
};

/*
// function to convert an array of words to
// an object suitable for MaterialTable
export const aw_to_mt = ( ar => {
    // first convert array to object
    const ob = array_to_obj(ar);
    const mt = {};
    mt.title = "All Words in Text Order";
    mt.columns = [
        { title: 'Order', field: 'order' , type: 'numeric'},
        { title: 'Word', field: 'word' },
    ];
    mt.data = [];
    Object.keys(ob).forEach ( n => {
        mt.data.push({ order: n, word: ob[n] })
    });

    mt.options = { sorting: true };

    return mt;
});
*/