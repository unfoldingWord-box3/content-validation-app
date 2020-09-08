import React, { useState, useEffect } from 'react';
import { Typography } from '@material-ui/core';

import {checkBookPackage} from 'uw-content-validation';
import { processNoticesToErrorsWarnings } from 'uw-content-validation';
import { RenderSuccessesErrorsWarnings } from 'uw-content-validation'; 
import ValidationWarnings from './ValidationWarnings';
import ValidationErrors from './ValidationErrors';

//const CHECKER_VERSION_STRING = '0.1.2';
function BookPackageContentValidator({bookID}) {
    const username = 'unfoldingword';
    const language_code = 'en'
    // Check a single Bible book across many repositories
    const [result, setResultValue] = useState("Waiting-CheckBookPackage");

    let checkingOptions = { // Uncomment any of these to test them
        // 'extractLength': 25,
    };

    useEffect(() => {
        // Use an IIFE (Immediately Invoked Function Expression)
        //  e.g., see https://medium.com/javascript-in-plain-english/https-medium-com-javascript-in-plain-english-stop-feeling-iffy-about-using-an-iife-7b0292aba174
        (async () => {
            // Display our "waiting" message
            setResultValue(<p style={{ color: 'red' }}>Waiting for check results for {username} {language_code} <b>{bookID}</b> book package…</p>);

            const rawCBPResults = await checkBookPackage(username, language_code, bookID, setResultValue, checkingOptions);
            console.log("rawCBPResults=", rawCBPResults);
            // Add some extra fields to our rawCBPResults object in case we need this information again later
            rawCBPResults.checkType = 'BookPackage';
            rawCBPResults.username = username;
            rawCBPResults.language_code = language_code;
            rawCBPResults.bookID = bookID;
            rawCBPResults.checkedOptions = checkingOptions;

            // Now do our final handling of the result -- we have some options available
            let processOptions = { // Uncomment any of these to test them
                // 'maximumSimilarMessages': 3, // default is 2
                // 'errorPriorityLevel': 800, // default is 700
                // 'cutoffPriorityLevel': 100, // default is 0
                // 'sortBy': 'ByPriority', // default is 'AsFound'
                // 'ignorePriorityNumberList': [123, 202], // default is []
            };

            /*
                            file{processedResults.checkedFileCount===1?'':'s'} 
                from {processedResults.checkedRepoNames.length} 
                repo{processedResults.checkedRepoNames.length===1?'':'s'}: 
                <b>{processedResults.checkedRepoNames.join(', ')}</b>
                <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;including {processedResults.checkedFilenameExtensions.length} 
                file type{processedResults.checkedFilenameExtensions.size === 1 ? '' : 's'}: 
                {processedResults.checkedFilenameExtensions.join(', ')}.
                </p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;Finished in <RenderElapsedTime elapsedTime={processedResults.elapsedSeconds} />.</p>
            */
            function renderSummary(processedResults) {
                return (
                    <>
                    <Typography>
                        Successfully checked&nbsp;
                        {processedResults.checkedFileCount.toLocaleString()}&nbsp;
                        files in&nbsp;
                        {processedResults.elapsedSeconds}&nbsp;
                        seconds
                    </Typography>
                    <Typography>
                        There were {processedResults.errorList.length} errors and&nbsp; 
                        {processedResults.warningList.length} warnings.
                    </Typography>
                </>
            );
            }

            const processedResults = processNoticesToErrorsWarnings(rawCBPResults, processOptions);
            console.log('processedResults=', processedResults);

            if (processedResults.errorList.length || processedResults.warningList.length)
                setResultValue(<>
                    {renderSummary(processedResults)}
                    {processedResults.warningList.length ? <ValidationWarnings results={processedResults.warningList} /> : <br/> }
                    {processedResults.errorList.length ? <ValidationErrors results={processedResults.errorList} /> : <br/> }
                </>);
            else // no errors or warnings
                setResultValue(<>
                    {renderSummary(processedResults)}
                    {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}
                    <RenderSuccessesErrorsWarnings results={processedResults} />
                </>);

        })(); // end of async part in unnamedFunction
        // eslint-disable-next-line
    }, []); // end of useEffect part

    // {/* <div className={classes.root}> */}
    return (
        <div className="Fred">
        {result}
        </div>
    );
}

export default BookPackageContentValidator;


/* Code Graveyard 

            } else if (displayType === 'SevereMediumLow') {
                const processedResults = processNoticesToSevereMediumLow(rawCBPResults, processOptions);

                if (processedResults.severeList.length || processedResults.mediumList.length || processedResults.lowList.length)
                setResultValue(<>
                    {renderSummary(processedResults)}
                        {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}
                        <RenderSuccessesSevereMediumLow results={processedResults} />
                    </>);
                else // no severe, medium, or low notices
                setResultValue(<>
                    {renderSummary(processedResults)}
                    {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}
                        <RenderSuccessesSevereMediumLow results={processedResults} />
                    </>);
            } else if (displayType === 'SingleList') {
                const processedResults = processNoticesToSingleList(rawCBPResults, processOptions);

                if (processedResults.warningList.length)
                setResultValue(<>
                    {renderSummary(processedResults)}
                        {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}
                        <RenderSuccessesWarningsGradient results={processedResults} />
                    </>);
                else // no warnings
                setResultValue(<>
                    {renderSummary(processedResults)}
                    {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}
                        <RenderSuccessesWarningsGradient results={processedResults} />
                    </>);
            } else setResultValue(<b style={{ color: 'red' }}>Invalid displayType='{displayType}'</b>)




*/