// utilities
import * as books from 'uw-content-validation';
import { formRepoName, getOverridesForRepo } from "./getApi";

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
 * make sure references are a minimum of 2 digits, if not do zero padding
 * @param reference
 * @return reference with zero padding
 */
export const padRef2 = (reference: string) => {
    if (reference) {
        if (reference.length < 2) {
            reference = '0' + reference;
        }
    }
    return reference
}

/**
 * create link to repo
 * @param repoType
 * @param username
 * @param languageCode
 * @param bookID
 * @param lineNum
 * @param rawData
 * @param branch
 */
export const getLink = (repoType: string, username: string, languageCode: string, bookID: string, lineNum: string,
                        rowData: { [x: string]: any; }, rawData: { [x: string]: any; }, branch = `master`) => {
    const repoName = formRepoName(languageCode, repoType);
    let extension = 'usfm';
    let view = 'src';
    let fileName;
    try {
        fileName = books.usfmNumberName(bookID).toUpperCase();
    } catch (e) {}
    let repoTypeUC = repoType.toUpperCase();
    if (repoTypeUC === 'TN') {
        view = 'blame';
        extension = 'tsv';
        if (rawData.tsvFileName) {
          fileName = rawData.tsvFileName.split(".tsv")[0]; // remove the extension
        } else {
          fileName = `${repoName}_${fileName}`;
        }
        //         bookNumberAndName = await cachedGetBookFilenameFromManifest({ username, repository: repoName, branch, bookID: bookID.toLowerCase() });
    } else if (repoTypeUC === 'TQ') {
        extension = 'md';
        fileName = `${bookID}/${padRef2(rowData.C)}/${padRef2(rowData.V)}`;
    }
    const { username: username_, repoName: repoName_ } = getOverridesForRepo(username, repoName);
    if (['TN', 'TQ', 'UHB', 'UGNT', 'ULT', 'UST', 'LT', 'ST'].includes(repoTypeUC)) {

            let link = `https://git.door43.org/${username_}/${repoName_}/${view}/branch/${branch}/${fileName}.${extension}`;
            if (lineNum) {
                link += `#L${lineNum}`;
            }
            return link;
            // const anchor = `<a href="${link}" target="_blank">${lineNum}</a>`;
            // return anchor;

    }
    console.log(`getLink() - could not find link for repo type ${repoType} for ${languageCode}`);
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

/**
 * converts strings to numbers
 * @param value
 */
export const stringToNumber = (value: any) => {
    if (typeof value === 'string') {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            return num;
        }
    }
    return NaN;
}

/**
 * string compare that attempts to do numerical sorting fist and then will sort by string
 * @param a
 * @param b
 */
export const somewhatNumericalSort = (a: any, b: any) => {
    const aNum = stringToNumber(a);
    const bNum = stringToNumber(b);
    const aStr = a || "";
    const bStr = b || "";

    if (!isNaN(aNum) && !isNaN(bNum)) { // if both are numbers then do numerical compare
        return aNum - bNum;
    }

    if (isNaN(aNum) && isNaN(bNum)) { // if both are not numbers then do a string compare
        return aStr > bStr ? 1 : ( aStr === bStr ? 0 : -1);
    }

    if (isNaN(aNum)) {
        return -1;  // non-numeric strings less than numbers
    }
    return 1;
}

/**
 * sort by chapter first and then by verse if same chapter
 * @param a
 * @param b
 */
export const sortChapterVerse = (a: any, b: any) => {
    let results = somewhatNumericalSort(a.C, b.C);
    if (results === 0) { // if chapters are same, then sort on verse
        results = somewhatNumericalSort(a.V, b.V);
    }
    return results;
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
export const notices_to_mt = ( ob: { [x: string]: any; }, username: string, languageCode: string, bookID: string,
    renderLink: any, renderWithUnicodeLink: any, renderPriority: any,
    rawData: { [x: string]: any; }) =>
{
    let mt: ObjectLiteral = {};
    mt.title = "Validation Notices";
    mt.columns = [
        { title: 'Repo', field: 'extra' },
        {
            title: 'Pri',
            field: 'priority',
            render: (rowData: any) => (renderPriority(rowData.priority))
        },
        {
            title: 'Ch',
            field: 'C',
            customSort: (a: any, b: any) => sortChapterVerse(a, b)
        },
        {
            title: 'Vs',
            field: 'V',
            customSort: (a: any, b: any) => somewhatNumericalSort(a.V, b.V)
        },
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
        let _link = getLink(rowData.extra, username, languageCode, bookID, rowData.lineNumber, rowData, rawData);
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

    // @ts-ignore
    mt.data = mt.data.sort((a: object, b: object) => (a.priority > b.priority ? -1 : 1) ); // sort highest priority to the top of the table

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