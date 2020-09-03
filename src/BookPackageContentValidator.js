import React, { useState, useEffect } from 'react';
import {checkBookPackage} from 'uw-content-validation';
import { processNoticesToErrorsWarnings, processNoticesToSevereMediumLow, processNoticesToSingleList } from 'uw-content-validation';
import { RenderSuccessesErrorsWarnings, RenderSuccessesSevereMediumLow, RenderSuccessesWarningsGradient, RenderElapsedTime } from 'uw-content-validation';

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
            setResultValue(<p style={{ color: 'magenta' }}>Waiting for check results for {username} {language_code} <b>{bookID}</b> book package…</p>);

            const rawCBPResults = await checkBookPackage(username, language_code, bookID, setResultValue, checkingOptions);
            // console.log("checkBookPackage() returned", typeof rawCBPResults); //, JSON.stringify(rawCBPResults));

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

            let displayType = 'ErrorsWarnings'; // default

            function renderSummary(processedResults) {
                return (<>
                <p>Checked <b>{username} {language_code} {bookID}</b> </p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;Successfully checked {processedResults.checkedFileCount.toLocaleString()} 
                file{processedResults.checkedFileCount===1?'':'s'} 
                from {processedResults.checkedRepoNames.length} 
                repo{processedResults.checkedRepoNames.length===1?'':'s'}: 
                <b>{processedResults.checkedRepoNames.join(', ')}</b>
                <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;including {processedResults.checkedFilenameExtensions.length} 
                file type{processedResults.checkedFilenameExtensions.size === 1 ? '' : 's'}: 
                {processedResults.checkedFilenameExtensions.join(', ')}.
                </p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;Finished in <RenderElapsedTime elapsedTime={processedResults.elapsedTime} />.</p>
                </>);
            }

            if (displayType === 'ErrorsWarnings') {
                const processedResults = processNoticesToErrorsWarnings(rawCBPResults, processOptions);

                if (processedResults.errorList.length || processedResults.warningList.length)
                    setResultValue(<>
                        {renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}
                        <RenderSuccessesErrorsWarnings results={processedResults} />
                    </>);
                else // no errors or warnings
                    setResultValue(<>
                        {renderSummary(processedResults)}
                        {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}
                        <RenderSuccessesErrorsWarnings results={processedResults} />
                    </>);
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
