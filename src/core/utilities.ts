// utilities
import * as books from 'uw-content-validation';

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

/**
 * create link to repo
 * @param repo
 * @param username
 * @param languageCode
 * @param bookID
 * @param lineNum
 * @param branch
 */
export const getLink = (repo: string, username: string, languageCode: string, bookID: string, lineNum: string, branch = `master`) => {
    let repoName = `${languageCode.toLowerCase()}_${repo.toLowerCase()}`;
    let extension = 'usfm';
    let view = 'src';
    let namePrefix = '';
    let repoUC = repo.toUpperCase();
    if (repoUC === 'UHB') {
        repoName = 'hbo_uhb';
    }
    if (repoUC === 'UGNT') {
        repoName = 'el-x-koine_ugnt';
    }
    if (repoUC === 'TN') {
        view = 'blame';
        extension = 'tsv';
        namePrefix = `${repoName}_`;
    }
    if (['TN', 'UHB', 'UGNT', 'ULT', 'UST'].includes(repoUC)) {
        let bookNumberAndName;
        try {
            bookNumberAndName = books.usfmNumberName(bookID).toUpperCase();
            let link = `https://git.door43.org/${username}/${repoName}/${view}/branch/${branch}/${namePrefix}${bookNumberAndName}.${extension}`;
            if (lineNum) {
                link += `#L${lineNum}`;
            }
            return link;
            // const anchor = `<a href="${link}" target="_blank">${lineNum}</a>`;
            // return anchor;
        } catch (e) {}
    }
    return null;
}

/**
 * remove columns that don't have any data
 * @param rows
 * @param columns
 */
export const trimColumns = (rows: any[], columns: any[]) => {
    const newColumns = [];
    for (let column of columns) {
        const { field, title } = column;
        let hasData = false;

        for (let row of rows) {
            const cellData = row[field]
            if (cellData) {
                hasData = true;
                break;
            }
        }

        if (hasData) {
            newColumns.push(column);
        } else {
            console.log(`Removing column "${title}" because no data found`);
        }
    }
    return newColumns;
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
export const notices_to_mt = ( ob: { [x: string]: any; }, username: string, languageCode: string, bookID: string, renderLink: any, renderWithUnicodeLink: any) => {
    let mt: ObjectLiteral = {};
    mt.title = "Validation Notices";
    mt.columns = [
        { title: 'Repo', field: 'extra' },
        { title: 'Pri', field: 'priority' },
        { title: 'Ch', field: 'C' },
        { title: 'Vs', field: 'V' },
        {
            title: 'Line',
            field: 'lineNumber',
            render: (rowData: any) => (renderLink(rowData.link, rowData.lineNumber))
        },
        { title: 'Row ID', field: 'rowID' },
        { title: 'Field Name', field: 'fieldName' },
        { title: 'Details', field: 'details' },
        { title: 'Char Pos', field: 'charPos' },
        {
            title: 'Excerpt',
            field: 'excerpt',
            cellStyle: {
                fontFamily: "Ezra, Roboto, Helvetica, Arial, sans-serif"
            },
            render: (rowData: any) => (renderWithUnicodeLink(rowData.excerpt))
        },
        {
            title: 'Message',
            field: 'message',
            cellStyle: {
                fontFamily: "Ezra, Roboto, Helvetica, Arial, sans-serif",
                width: `400px`
            },
        },
        { title: 'Location', field: 'location' },
    ];
    mt.data = [];
    Object.keys(ob).forEach ( key => {
        const rowData = ob[key];
        let _location = rowData.location;
        _location = _location.replace(/en ... book package from unfoldingword/, '' );
        let _link = getLink(rowData.extra, username, languageCode, bookID, rowData.lineNumber);
        mt.data.push({
            extra: rowData.extra,
            priority: rowData.priority,
            C: rowData.C,
            V: rowData.V,
            lineNumber: rowData.lineNumber,
            rowID: rowData.rowID,
            charPos: rowData.characterIndex,
            excerpt: rowData.extract,
            link: _link,
            location: _location,
            message: rowData.message,
            fieldName: rowData.fieldName,
            details: rowData.details,
        })
    })

    mt.columns = trimColumns(mt.data, mt.columns);

    mt.options = {
        sorting: true,
        // padding: 'dense',
        exportButton: true,
        exportAllData: true,
        // tableLayout: 'auto',
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