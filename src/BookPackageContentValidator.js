import React, { useState, useEffect } from 'react';
import { Typography } from '@material-ui/core';

import { checkBookPackage } from './core/book-package-check';
import ValidationNotices from './ValidationNotices';
import { fetchRepositoryZipFile, getFileCached, getFileListFromZip } from "./core/getApi";

function BookPackageContentValidator({bookID, username, language_code}) {
    //const username = 'unfoldingword';
    //const language_code = 'en';
    //const branch = 'master';
    // Check a single Bible book across many repositories
    const [result, setResultValue] = useState("Waiting-CheckBookPackage");

    const checkingOptions = {
      getFile: getFileCached,
      fetchRepositoryZipFile: fetchRepositoryZipFile,
      getFileListFromZip: getFileListFromZip,
      taRepoUsername: username
    };

    useEffect(() => {
        // Use an IIFE (Immediately Invoked Function Expression)
        //  e.g., see https://medium.com/javascript-in-plain-english/https-medium-com-javascript-in-plain-english-stop-feeling-iffy-about-using-an-iife-7b0292aba174
        (async () => {

            // Display our "waiting" message
            setResultValue(<p style={{ color: 'red' }}>Waiting for check results for {username} {language_code} <b>{bookID}</b> book package…</p>);

            const rawCBPResults = await checkBookPackage(username, language_code, bookID, setResultValue, checkingOptions);
            //console.log("rawCBPResults=", rawCBPResults);
            // Add some extra fields to our rawCBPResults object in case we need this information again later
            rawCBPResults.checkType = 'BookPackage';
            rawCBPResults.username = username;
            rawCBPResults.language_code = language_code;
            rawCBPResults.bookID = bookID;
            rawCBPResults.checkedOptions = checkingOptions;

            function renderSummary(rawCBPResults) {
                return (
                    <>
                    <Typography>
                        Successfully checked&nbsp;
                        {rawCBPResults.checkedFileCount.toLocaleString()}&nbsp;
                        files in&nbsp;
                        {rawCBPResults.elapsedSeconds}&nbsp;
                        seconds
                    </Typography>
                    <Typography>
                        There were {rawCBPResults.noticeList.length} notices.
                    </Typography>
                </>
            );
            }

            setResultValue(<>
                {renderSummary(rawCBPResults)}
                {rawCBPResults.noticeList.length ?
                  <ValidationNotices
                    results={rawCBPResults.noticeList}
                    username={username}
                    languageCode={language_code}
                    bookID={bookID}
                    rawData={rawCBPResults}
                  />
                : <br/> }
            </>);

        })(); // end of async part in unnamedFunction
        // eslint-disable-next-line
    }, []); // end of useEffect part

    // {/* <div className={classes.root}> */}
    return (
        <div>
        {result}
        </div>
    );
}

export default BookPackageContentValidator;
