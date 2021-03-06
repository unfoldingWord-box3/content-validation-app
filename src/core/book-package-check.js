import React from 'react';
import * as books from './books';
import {
  cachedGetBookFilenameFromManifest,
  //formRepoName, 
  getFileListFromZip,
  getFileCached,
  fetchRepositoryZipFile, getRepoMap
} from './getApi';

import {
  checkManifestText,
  checkMarkdownText,
  checkPlainText,
  checkTN_TSVText,
  checkUSFMText,
  checkYAMLText
} from 'uw-content-validation';

/*
    checkRepo
*/
export async function checkRepo(username, repoName, branch, givenLocation, setResultValue, checkingOptions) {
  /*
  checkRepo DOES NOT USE the Gitea React Toolkit to fetch the repo

  It returns an object containing:
      successList: an array of strings to tell the use exactly what has been checked
      noticeList: an array of 9 (i.e., with extra bookOrFileCode parameter at end) notice components
  */
  // console.log(`checkRepo(${username}, ${repoName}, ${branch}, ${givenLocation}, (fn), ${JSON.stringify(checkingOptions)})…`);
  const startTime = new Date();

  const languageCode = repoName.split('_')[0];
  // console.log("checkRepo languageCode", languageCode);

  if (branch === undefined) branch = 'master'; // Ideally we should ask what the default branch is

  let checkRepoResult = {
    successList: [], noticeList: [],
    checkedFileCount: 0, checkedFilenames: [], checkedFilenameExtensions: []
  };

  function addSuccessMessage(successString) {
    // Adds the message to the result that we will later return
    // console.log(`checkRepo success: ${successString}`);
    checkRepoResult.successList.push(successString);
  }
  function addNoticePartial(noticeObject) {
    // Adds the notices to the result that we will later return
    // bookID is a three-character UPPERCASE USFM book identifier or 'OBS'.
    // Note that bookID,C,V might all be empty strings (as some repos don't have BCV)
    // console.log(`checkRepo addNoticePartial: ${noticeObject.priority}:${noticeObject.message} ${noticeObject.bookID} ${noticeObject.C}:${noticeObject.V} ${noticeObject.filename}:${noticeObject.lineNumber} ${noticeObject.characterIndex > 0 ? ` (at character ${noticeObject.characterIndex})` : ""}${noticeObject.extract ? ` ${noticeObject.extract}` : ""}${noticeObject.location}`);
    console.assert(noticeObject.priority !== undefined, "cR addNoticePartial: 'priority' parameter should be defined");
    console.assert(typeof noticeObject.priority === 'number', `cR addNoticePartial: 'priority' parameter should be a number not a '${typeof noticeObject.priority}'`);
    console.assert(noticeObject.message !== undefined, "cR addNoticePartial: 'message' parameter should be defined");
    console.assert(typeof noticeObject.message === 'string', `cR addNoticePartial: 'message' parameter should be a string not a '${typeof noticeObject.message}'`);
    // console.assert(bookID !== undefined, "cR addNoticePartial: 'bookID' parameter should be defined");
    if (noticeObject.bookID) {
      console.assert(typeof noticeObject.bookID === 'string', `cR addNoticePartial: 'bookID' parameter should be a string not a '${typeof noticeObject.bookID}'`);
      console.assert(noticeObject.bookID.length === 3, `cR addNoticePartial: 'bookID' parameter should be three characters long not ${noticeObject.bookID.length}`);
      console.assert(books.isOptionalValidBookID(noticeObject.bookID), `cR addNoticePartial: '${noticeObject.bookID}' is not a valid USFM book identifier`);
    }
    // console.assert(C !== undefined, "cR addNoticePartial: 'C' parameter should be defined");
    if (noticeObject.C) console.assert(typeof noticeObject.C === 'string', `cR addNoticePartial: 'C' parameter should be a string not a '${typeof noticeObject.C}'`);
    // console.assert(V !== undefined, "cR addNoticePartial: 'V' parameter should be defined");
    if (noticeObject.V) console.assert(typeof noticeObject.V === 'string', `cR addNoticePartial: 'V' parameter should be a string not a '${typeof noticeObject.V}'`);
    // console.assert(characterIndex !== undefined, "cR addNoticePartial: 'characterIndex' parameter should be defined");
    if (noticeObject.characterIndex) console.assert(typeof noticeObject.characterIndex === 'number', `cR addNoticePartial: 'characterIndex' parameter should be a number not a '${typeof noticeObject.characterIndex}'`);
    // console.assert(extract !== undefined, "cR addNoticePartial: 'extract' parameter should be defined");
    if (noticeObject.extract) console.assert(typeof noticeObject.extract === 'string', `cR addNoticePartial: 'extract' parameter should be a string not a '${typeof noticeObject.extract}'`);
    console.assert(noticeObject.location !== undefined, "cR addNoticePartial: 'location' parameter should be defined");
    console.assert(typeof noticeObject.location === 'string', `cR addNoticePartial: 'location' parameter should be a string not a '${typeof noticeObject.location}'`);
    console.assert(noticeObject.extra !== undefined, "cR addNoticePartial: 'extra' parameter should be defined");
    console.assert(typeof noticeObject.extra === 'string', `cR addNoticePartial: 'extra' parameter should be a string not a '${typeof noticeObject.extra}'`);
    // Add in the repoName from the outer scope
    checkRepoResult.noticeList.push({ ...noticeObject, repoName });
  }


  async function ourCheckRepoFileContents(bookOrFileCode, cfBookID, filename, file_content, fileLocation, optionalCheckingOptions) {
    // We assume that checking for compulsory fields is done elsewhere
    // console.log(`checkRepo ourCheckRepoFileContents(${filename})…`);

    // Updates the global list of notices
    console.assert(bookOrFileCode !== undefined, "ourCheckRepoFileContents: 'bookOrFileCode' parameter should be defined");
    console.assert(typeof bookOrFileCode === 'string', `ourCheckRepoFileContents: 'bookOrFileCode' parameter should be a string not a '${typeof bookOrFileCode}'`);
    console.assert(cfBookID !== undefined, "ourCheckRepoFileContents: 'cfBookID' parameter should be defined");
    console.assert(typeof cfBookID === 'string', `ourCheckRepoFileContents: 'cfBookID' parameter should be a string not a '${typeof cfBookID}'`);
    console.assert(filename !== undefined, "ourCheckRepoFileContents: 'filename' parameter should be defined");
    console.assert(typeof filename === 'string', `ourCheckRepoFileContents: 'filename' parameter should be a string not a '${typeof filename}'`);
    console.assert(file_content !== undefined, "ourCheckRepoFileContents: 'file_content' parameter should be defined");
    console.assert(typeof file_content === 'string', `ourCheckRepoFileContents: 'file_content' parameter should be a string not a '${typeof file_content}'`);
    console.assert(fileLocation !== undefined, "ourCheckRepoFileContents: 'fileLocation' parameter should be defined");
    console.assert(typeof fileLocation === 'string', `ourCheckRepoFileContents: 'fileLocation' parameter should be a string not a '${typeof fileLocation}'`);

    const cfcResultObject = await checkFileContents(languageCode, filename, file_content, fileLocation, optionalCheckingOptions);
    // console.log("checkFileContents() returned", resultObject.successList.length, "success message(s) and", resultObject.noticeList.length, "notice(s)");
    // for (const successEntry of resultObject.successList)
    //     console.log("  ", successEntry);

    // Process results line by line,  appending the bookOrFileCode as an extra field as we go
    for (const cfcNoticeEntry of cfcResultObject.noticeList)
      // We add the bookOrFileCode as an extra value
      addNoticePartial({ ...cfcNoticeEntry, bookID: cfBookID, extra: bookOrFileCode });
  }
  // end of ourCheckRepoFileContents function


  // Main code for checkRepo()
  // Put all this in a try/catch block coz otherwise it's difficult to debug/view errors
  try {
    let ourLocation = givenLocation;
    if (ourLocation && ourLocation[0] !== ' ') ourLocation = ` ${ourLocation}`;
    // if (ourLocation.indexOf(username) < 0)
    // ourLocation = ` in ${username} ${repoName} ${givenLocation}`

    // Update our "waiting" message
    setResultValue(<p style={{ color: 'magenta' }}>Fetching zipped files from <b>{username}/{repoName}</b> repository…</p>);

    // Let's fetch the zipped repo since it should be much more efficient than individual fetches
    // console.log(`checkRepo: fetch zip file for ${repoName}…`);
    const fetchRepositoryZipFile_ = (checkingOptions && checkingOptions.fetchRepositoryZipFile) ? checkingOptions.fetchRepositoryZipFile : fetchRepositoryZipFile;
    const zipFetchSucceeded = await fetchRepositoryZipFile_({ username, repository: repoName, branch });
    if (!zipFetchSucceeded) {
      console.error(`checkRepo: misfetched zip file for repo with ${zipFetchSucceeded}`);
      setResultValue(<p style={{ color: 'red' }}>Failed to fetching zipped files from <b>{username}/{repoName}</b> repository</p>);
      addNoticePartial({ priority: 999, message: "Failed to find/load repository", location: ourLocation });
      return checkRepoResult;
    }

    // Now we need to fetch the list of files from the repo
    setResultValue(<p style={{ color: 'magenta' }}>Preprocessing file list from <b>{username}/{repoName}</b> repository…</p>);
    // const pathList = await getFileListFromFetchedTreemaps(username, repoName, branch);
    const getFileListFromZip_ = checkingOptions && checkingOptions.getFileListFromZip ? checkingOptions.getFileListFromZip : getFileListFromZip;
    const pathList = await getFileListFromZip_({ username, repository: repoName, branch });
    // console.log(`Got pathlist (${pathList.length}) = ${pathList}`);

    // So now we want to work through checking all the files in this repo
    const countString = `${pathList.length.toLocaleString()} file${pathList.length === 1 ? '' : 's'}`;
    let checkedFileCount = 0, checkedFilenames = [], checkedFilenameExtensions = new Set(), totalCheckedSize = 0;
    for (const thisFilepath of pathList) {
      // console.log(`At top of loop: thisFilepath='${thisFilepath}'`);

      // Update our "waiting" message
      setResultValue(<p style={{ color: 'magenta' }}>Checking <b>{username}/{repoName}</b> repo: checked {checkedFileCount.toLocaleString()}/{countString}…</p>);

      const thisFilename = thisFilepath.split('/').pop();
      // console.log(`thisFilename=${thisFilename}`);
      const thisFilenameExtension = thisFilename.split('.').pop();
      // console.log(`thisFilenameExtension=${thisFilenameExtension}`);

      // Default to the main filename without the extensions
      let bookOrFileCode = thisFilename.substring(0, thisFilename.length - thisFilenameExtension.length - 1);
      let ourBookID = "";
      if (thisFilenameExtension === 'usfm') {
        // const filenameMain = thisFilename.substring(0, thisFilename.length - 5); // drop .usfm
        // console.log(`Have USFM filenameMain=${bookOrFileCode}`);
        const bookID = bookOrFileCode.substring(bookOrFileCode.length - 3);
        // console.log(`Have USFM bookcode=${bookID}`);
        console.assert(books.isValidBookID(bookID), `checkRepo: '${bookID}' is not a valid USFM book identifier`);
        bookOrFileCode = bookID;
        ourBookID = bookID;
      }
      else if (thisFilenameExtension === 'tsv') {
        // const filenameMain = thisFilename.substring(0, thisFilename.length - 4); // drop .tsv
        // console.log(`Have TSV filenameMain=${bookOrFileCode}`);
        const bookID = bookOrFileCode.substring(bookOrFileCode.length - 3);
        // console.log(`Have TSV bookcode=${bookID}`);
        console.assert(books.isValidBookID(bookID), `checkRepo: '${bookID}' is not a valid USFM book identifier`);
        bookOrFileCode = bookID;
        ourBookID = bookID;
      }

      // console.log("checkRepo: Try to load", username, repoName, thisFilepath, branch);
      const getFile_ = (checkingOptions && checkingOptions.getFile) ? checkingOptions.getFile : getFileCached;
      let repoFileContent;
      try {
        repoFileContent = await getFile_({ username, repository: repoName, path: thisFilepath, branch });
        // console.log("Fetched file_content for", repoName, thisPath, typeof repoFileContent, repoFileContent.length);
      } catch (cRgfError) {
        console.error("Failed to load", username, repoName, thisFilepath, branch, `${cRgfError}`);
        addNoticePartial({ priority: 996, message: "Failed to load", bookID: ourBookID, filename: thisFilename, location: `${givenLocation} ${thisFilepath}: ${cRgfError}`, extra: repoName });
        return;
      }
      if (repoFileContent) {
        // console.log(`checkRepo for ${repoName} checking ${thisFilename}`);
        await ourCheckRepoFileContents(bookOrFileCode, ourBookID,
          // OBS has many files with the same name, so we have to give some of the path as well
          repoName.endsWith('_obs') ? thisFilepath.replace('content/', '') : thisFilename,
          repoFileContent, ourLocation, checkingOptions);
        checkedFileCount += 1;
        checkedFilenames.push(thisFilename);
        checkedFilenameExtensions.add(thisFilenameExtension);
        totalCheckedSize += repoFileContent.length;
        // console.log(`checkRepo checked ${thisFilename}`);
        if (thisFilenameExtension !== 'md') // There's often far, far too many of these
          addSuccessMessage(`Checked ${bookOrFileCode.toUpperCase()} file: ${thisFilename}`);
      }
    }

    // Check that we processed a license and a manifest
    if (checkedFilenames.indexOf('LICENSE.md') < 0)
      addNoticePartial({ priority: 946, message: "Missing LICENSE.md", location: ourLocation, extra: 'LICENSE' });
    if (checkedFilenames.indexOf('manifest.yaml') < 0)
      addNoticePartial({ priority: 947, message: "Missing manifest.yaml", location: ourLocation, extra: 'MANIFEST' });

    // Add some extra fields to our checkRepoResult object
    //  in case we need this information again later
    checkRepoResult.checkedFileCount = checkedFileCount;
    checkRepoResult.checkedFilenames = checkedFilenames;
    checkRepoResult.checkedFilenameExtensions = [...checkedFilenameExtensions]; // convert Set to Array
    checkRepoResult.checkedFilesizes = totalCheckedSize;
    checkRepoResult.checkedRepoNames = [`${username}/${repoName}`];
    // checkRepoResult.checkedOptions = checkingOptions; // This is done at the caller level

    addSuccessMessage(`Checked ${username} repo: ${repoName}`);
    // console.log(`checkRepo() is returning ${checkRepoResult.successList.length.toLocaleString()} success message(s) and ${checkRepoResult.noticeList.length.toLocaleString()} notice(s)`);
  } catch (cRerror) {
    console.error(`checkRepo main code block got error: ${cRerror.message}`);
    setResultValue(<>
      <p style={{ color: 'red' }}>checkRepo main code block got error: <b>{cRerror.message}</b></p>
    </>);

  }
  checkRepoResult.elapsedSeconds = (new Date() - startTime) / 1000; // seconds
  // console.log(`checkRepo() returning ${JSON.stringify(checkRepoResult)}`);
  return checkRepoResult;
};
// end of checkRepo()


/*
    checkFileContents
*/
export async function checkFileContents(languageCode, filename, fileContent, givenLocation, checkingOptions) {
  // Determine the file type from the filename extension
  //  and return the results of checking that kind of file text
  // console.log(`checkFileContents(${languageCode}, ${filename}, ${fileContent.length} chars, ${givenLocation}, ${JSON.stringify(checkingOptions)})…`);
  const startTime = new Date();

  let ourCFLocation = givenLocation;
  if (ourCFLocation[0] !== ' ') ourCFLocation = ' ' + ourCFLocation;

  let checkFileResult;
  if (filename.toLowerCase().endsWith('.tsv')) {
    const filenameMain = filename.substring(0, filename.length - 4); // drop .tsv
    // console.log(`Have TSV filenameMain=${filenameMain}`);
    const bookID = filenameMain.substring(filenameMain.length - 3);
    // console.log(`Have TSV bookcode=${bookID}`);
    console.assert(books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    checkFileResult = await checkTN_TSVText(languageCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
  }
  else if (filename.toLowerCase().endsWith('.usfm')) {
    const filenameMain = filename.substring(0, filename.length - 5); // drop .usfm
    // console.log(`Have USFM filenameMain=${filenameMain}`);
    const bookID = filenameMain.substring(filenameMain.length - 3);
    // console.log(`Have USFM bookcode=${bookID}`);
    console.assert(books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    let repoCode = "";
    checkFileResult = checkUSFMText(languageCode, repoCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
  } else if (filename.toLowerCase().endsWith('.sfm')) {
    const filenameMain = filename.substring(0, filename.length - 4); // drop .sfm
    console.log(`Have SFM filenameMain=${filenameMain}`);
    const bookID = filenameMain.substring(2, 5);
    console.log(`Have SFM bookcode=${bookID}`);
    console.assert(books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    checkFileResult = checkUSFMText(languageCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
  } else if (filename.toLowerCase().endsWith('.md'))
    checkFileResult = checkMarkdownText(languageCode, filename, fileContent, ourCFLocation, checkingOptions);
  else if (filename.toLowerCase().endsWith('.txt'))
    checkFileResult = checkPlainText(filename, fileContent, ourCFLocation, checkingOptions);
  else if (filename.toLowerCase() === 'manifest.yaml')
    checkFileResult = checkManifestText(filename, fileContent, ourCFLocation, checkingOptions);
  else if (filename.toLowerCase().endsWith('.yaml'))
    checkFileResult = checkYAMLText(filename, fileContent, ourCFLocation, checkingOptions);
  else {
    checkFileResult = checkPlainText(filename, fileContent, ourCFLocation, checkingOptions);
    checkFileResult.noticeList.unshift({ priority: 995, message: "File extension is not recognized, so treated as plain text.", filename, location: filename });
  }
  // console.log(`checkFileContents got initial results with ${checkFileResult.successList.length} success message(s) and ${checkFileResult.noticeList.length} notice(s)`);

  // Add some extra fields to our checkFileResult object
  //  in case we need this information again later
  checkFileResult.checkedFileCount = 1;
  checkFileResult.checkedFilename = filename;
  checkFileResult.checkedFilesize = fileContent.length;
  checkFileResult.checkedOptions = checkingOptions;

  checkFileResult.elapsedSeconds = (new Date() - startTime) / 1000; // seconds
  // console.log(`checkFileContents() returning ${JSON.stringify(checkFileResult)}`);
  return checkFileResult;
};
// end of checkFileContents()


/*
    checkTQbook
*/
export async function checkTQbook(username, languageCode, repoName, branch, bookID, checkingOptions) {
  // console.log(`checkTQbook(${username}, ${repoName}, ${branch}, ${bookID}, ${JSON.stringify(checkingOptions)})…`)
  const repoCode = 'TQ';
  const generalLocation = ` in ${username} (${branch})`;

  const ctqResult = { successList: [], noticeList: [] };

  function addSuccessMessage(successString) {
    // console.log(`checkBookPackage success: ${successString}`);
    ctqResult.successList.push(successString);
  }

  function addNoticePartial(noticeObject) {
    // bookID is a three-character UPPERCASE USFM book identifier or 'OBS'.
    // console.log(`checkTQbook addNoticePartial: ${noticeObject.priority}:${noticeObject.message} ${noticeObject.bookID} ${noticeObject.C}:${noticeObject.V} ${noticeObject.filename}:${noticeObject.lineNumber} ${noticeObject.characterIndex > 0 ? ` (at character ${noticeObject.characterIndex})` : ""}${noticeObject.extract ? ` ${noticeObject.extract}` : ""}${noticeObject.location}`);
    console.assert(noticeObject.priority !== undefined, "cTQ addNoticePartial: 'priority' parameter should be defined");
    console.assert(typeof noticeObject.priority === 'number', `cTQ addNoticePartial: 'priority' parameter should be a number not a '${typeof noticeObject.priority}'`);
    console.assert(noticeObject.message !== undefined, "cTQ addNoticePartial: 'message' parameter should be defined");
    console.assert(typeof noticeObject.message === 'string', `cTQ addNoticePartial: 'message' parameter should be a string not a '${typeof noticeObject.message}'`);
    console.assert(noticeObject.bookID !== undefined, "cTQ addNoticePartial: 'bookID' parameter should be defined");
    console.assert(typeof noticeObject.bookID === 'string', `cTQ addNoticePartial: 'bookID' parameter should be a string not a '${typeof noticeObject.bookID}'`);
    console.assert(noticeObject.bookID.length === 3, `cTQ addNoticePartial: 'bookID' parameter should be three characters long not ${noticeObject.bookID.length}`);
    console.assert(books.isValidBookID(noticeObject.bookID), `cTQ addNoticePartial: '${noticeObject.bookID}' is not a valid USFM book identifier`);
    // console.assert(C !== undefined, "cTQ addNoticePartial: 'C' parameter should be defined");
    if (noticeObject.C) console.assert(typeof noticeObject.C === 'string', `cTQ addNoticePartial: 'C' parameter should be a string not a '${typeof noticeObject.C}'`);
    // console.assert(V !== undefined, "cTQ addNoticePartial: 'V' parameter should be defined");
    if (noticeObject.V) console.assert(typeof noticeObject.V === 'string', `cTQ addNoticePartial: 'V' parameter should be a string not a '${typeof noticeObject.V}'`);
    // console.assert(characterIndex !== undefined, "cTQ addNoticePartial: 'characterIndex' parameter should be defined");
    if (noticeObject.characterIndex) console.assert(typeof noticeObject.characterIndex === 'number', `cTQ addNoticePartial: 'characterIndex' parameter should be a number not a '${typeof noticeObject.characterIndex}'`);
    // console.assert(extract !== undefined, "cTQ addNoticePartial: 'extract' parameter should be defined");
    if (noticeObject.extract) console.assert(typeof noticeObject.extract === 'string', `cTQ addNoticePartial: 'extract' parameter should be a string not a '${typeof noticeObject.extract}'`);
    console.assert(noticeObject.location !== undefined, "cTQ addNoticePartial: 'location' parameter should be defined");
    console.assert(typeof noticeObject.location === 'string', `cTQ addNoticePartial: 'location' parameter should be a string not a '${typeof noticeObject.location}'`);
    console.assert(noticeObject.extra !== undefined, "cTQ addNoticePartial: 'extra' parameter should be defined");
    console.assert(typeof noticeObject.extra === 'string', `cTQ addNoticePartial: 'extra' parameter should be a string not a '${typeof noticeObject.extra}'`);
    ctqResult.noticeList.push({ ...noticeObject, repoName, bookID });
  }


  async function ourCheckTQFileContents(repoCode, bookID, C, V, cfFilename, file_content, fileLocation, optionalCheckingOptions) {
    // console.log(`checkBookPackage ourCheckTQFileContents(${cfFilename})`);

    // Updates the global list of notices
    console.assert(repoCode !== undefined, "cTQ ourCheckTQFileContents: 'repoCode' parameter should be defined");
    console.assert(typeof repoCode === 'string', `cTQ ourCheckTQFileContents: 'repoCode' parameter should be a string not a '${typeof repoCode}'`);
    console.assert(cfFilename !== undefined, "cTQ ourCheckTQFileContents: 'cfFilename' parameter should be defined");
    console.assert(typeof cfFilename === 'string', `cTQ ourCheckTQFileContents: 'cfFilename' parameter should be a string not a '${typeof cfFilename}'`);
    console.assert(file_content !== undefined, "cTQ ourCheckTQFileContents: 'file_content' parameter should be defined");
    console.assert(typeof file_content === 'string', `cTQ ourCheckTQFileContents: 'file_content' parameter should be a string not a '${typeof file_content}'`);
    console.assert(fileLocation !== undefined, "cTQ ourCheckTQFileContents: 'fileLocation' parameter should be defined");
    console.assert(typeof fileLocation === 'string', `cTQ ourCheckTQFileContents: 'fileLocation' parameter should be a string not a '${typeof fileLocation}'`);

    const cfResultObject = await checkFileContents(languageCode, cfFilename, file_content, fileLocation, optionalCheckingOptions);
    // console.log("checkFileContents() returned", cfResultObject.successList.length, "success message(s) and", cfResultObject.noticeList.length, "notice(s)");
    // for (const successEntry of cfResultObject.successList) console.log("  ourCheckTQFileContents:", successEntry);

    // Process results line by line,  appending the repoCode as an extra field as we go
    for (const noticeEntry of cfResultObject.noticeList) {
      // noticeEntry is an array of eight fields: 1=priority, 2=bookID, 3=C, 4=V, 5=msg, 6=characterIndex, 7=extract, 8=location
      // console.assert(Object.keys(noticeEntry).length === 5, `cTQ ourCheckTQFileContents notice length=${Object.keys(noticeEntry).length}`);
      // We add the repoCode as an extra value
      addNoticePartial({ ...noticeEntry, bookID, C, V, extra: repoCode });
    }
  }
  // end of ourCheckTQFileContents function


  // Main code for checkTQbook
  // We need to find an check all the markdown folders/files for this book
  let checkedFileCount = 0, checkedFilenames = [], checkedFilenameExtensions = new Set(['md']), totalCheckedSize = 0;
  const getFileListFromZip_ = checkingOptions && checkingOptions.getFileListFromZip ? checkingOptions.getFileListFromZip : getFileListFromZip;
  const bookIdLc = bookID.toLowerCase();
  let pathList = await getFileListFromZip_({ username, repository: repoName, branch, optionalPrefix: `${bookIdLc}/` });
  if (!Array.isArray(pathList) || !pathList.length) {
    console.error("checkTQrepo failed to load", username, repoName, branch);
    addNoticePartial({ priority: 996, message: "Failed to load", bookID, location: generalLocation, extra: repoCode });
  } else {

    // console.log(`  Got ${pathList.length} pathList entries`)
    for (const thisPath of pathList) {
      // console.log("checkTQbook: Try to load", username, repoName, thisPath, branch);

      console.assert(thisPath.endsWith('.md'), `Expected ${thisPath} to end with .md`);
      const filename = thisPath.split('/').pop();
      const pathParts = thisPath.slice(0, -3).split('/');
      const C = pathParts[pathParts.length - 2].replace(/^0+(?=\d)/, ''); // Remove leading zeroes
      const V = pathParts[pathParts.length - 1].replace(/^0+(?=\d)/, ''); // Remove leading zeroes

      const getFile_ = (checkingOptions && checkingOptions.getFile) ? checkingOptions.getFile : getFileCached;
      let tqFileContent;
      try {
        tqFileContent = await getFile_({ username, repository: repoName, path: thisPath, branch });
        // console.log("Fetched file_content for", repoName, thisPath, typeof tqFileContent, tqFileContent.length);
        checkedFilenames.push(thisPath);
        totalCheckedSize += tqFileContent.length;
      } catch (tQerror) {
        console.error("checkTQbook failed to load", username, repoName, thisPath, branch, tQerror + '');
        addNoticePartial({ priority: 996, message: "Failed to load", bookID, C, V, location: `${generalLocation} ${thisPath}: ${tQerror}`, extra: repoCode });
        continue;
      }

      // We use the generalLocation here (does not include repo name)
      //  so that we can adjust the returned strings ourselves
      await ourCheckTQFileContents(repoCode, bookID, C, V, filename, tqFileContent, generalLocation, checkingOptions); // Adds the notices to checkBookPackageResult
      checkedFileCount += 1;
      // addSuccessMessage(`Checked ${repoCode.toUpperCase()} file: ${thisPath}`);
    }
    addSuccessMessage(`Checked ${checkedFileCount.toLocaleString()} ${repoCode.toUpperCase()} file${checkedFileCount === 1 ? '' : 's'}`);
  }

  ctqResult.checkedFileCount = checkedFileCount;
  ctqResult.checkedFilenames = checkedFilenames;
  ctqResult.checkedFilenameExtensions = [...checkedFilenameExtensions]; // convert Set to Array
  ctqResult.checkedFilesizes = totalCheckedSize;
  // console.log(`  checkTQbook returning ${JSON.stringify(ctqResult)}`);
  return ctqResult;
}
// end of checkTQbook function


/*
    checkBookPackage
*/
/**
 *
 * @param {string} username
 * @param {string} languageCode
 * @param {string} bookID
 * @param {Function} setResultValue
 * @param {Object} checkingOptions
 */
export async function checkBookPackage(username, languageCode, bookID, setResultValue, checkingOptions) {
  /*
  Note: You may want to run clearCaches() before running this function???

  Note that bookID here can also be the 'OBS' pseudo bookID.
  */
  // console.log(`checkBookPackage(${username}, ${languageCode}, ${bookID}, …, ${JSON.stringify(checkingOptions)})…`)
  const startTime = new Date();
  bookID = bookID.toUpperCase(); // normalise to USFM standard

  let checkBookPackageResult = { successList: [], noticeList: [] };

  const newCheckingOptions = checkingOptions ? { ...checkingOptions } : {}; // clone before modify
  const getFile_ = newCheckingOptions.getFile ? newCheckingOptions.getFile : getFileCached; // default to using caching of files
  newCheckingOptions.getFile = getFile_; // use same getFile_ when we call core functions
  
  if (!newCheckingOptions.originalLanguageRepoUsername) newCheckingOptions.originalLanguageRepoUsername = username;
  if (!newCheckingOptions.taRepoUsername) newCheckingOptions.taRepoUsername = username;

  // No point in passing the branch through as a parameter
  //  coz if it's not 'master', it's unlikely to be common for all the repos
  const branch = 'master';

  //const generalLocation = ` in ${languageCode} ${bookID} book package from ${username} ${branch} branch`;
  const generalLocation = ` in ${languageCode} ${bookID} book package`;


  function addSuccessMessage(successString) {
    // console.log(`checkBookPackage success: ${successString}`);
    checkBookPackageResult.successList.push(successString);
  }

  function addNoticePartial(noticeObject) {
    // bookID is a three-character UPPERCASE USFM book identifier or 'OBS'.
    // console.log(`checkBookPackage addNoticePartial: (priority=${noticeObject.priority}) ${noticeObject.bookID} ${noticeObject.C}:${noticeObject.V} ${noticeObject.message}${noticeObject.characterIndex > 0 ? ` (at character ${noticeObject.characterIndex})` : ""}${extract ? ` ${extract}` : ""}${location}`);
    console.assert(noticeObject.priority !== undefined, "cBP addNoticePartial: 'priority' parameter should be defined");
    console.assert(typeof noticeObject.priority === 'number', `cBP addNoticePartial: 'priority' parameter should be a number not a '${typeof noticeObject.priority}'`);
    console.assert(noticeObject.message !== undefined, "cBP addNoticePartial: 'message' parameter should be defined");
    console.assert(typeof noticeObject.message === 'string', `cBP addNoticePartial: 'message' parameter should be a string not a '${typeof noticeObject.message}'`);
    // console.assert(bookID !== undefined, "cBP addNoticePartial: 'bookID' parameter should be defined");
    if (noticeObject.bookID) {
      console.assert(typeof noticeObject.bookID === 'string', `cBP addNoticePartial: 'bookID' parameter should be a string not a '${typeof noticeObject.bookID}'`);
      console.assert(noticeObject.bookID.length === 3, `cBP addNoticePartial: 'bookID' parameter should be three characters long not ${noticeObject.bookID.length}`);
      console.assert(books.isValidBookID(noticeObject.bookID), `cBP addNoticePartial: '${noticeObject.bookID}' is not a valid USFM book identifier`);
    }
    // console.assert(C !== undefined, "cBP addNoticePartial: 'C' parameter should be defined");
    if (noticeObject.C) console.assert(typeof noticeObject.C === 'string', `cBP addNoticePartial: 'C' parameter should be a string not a '${typeof noticeObject.C}'`);
    // console.assert(V !== undefined, "cBP addNoticePartial: 'V' parameter should be defined");
    if (noticeObject.V) console.assert(typeof noticeObject.V === 'string', `cBP addNoticePartial: 'V' parameter should be a string not a '${typeof noticeObject.V}'`);
    // console.assert(characterIndex !== undefined, "cBP addNoticePartial: 'characterIndex' parameter should be defined");
    if (noticeObject.characterIndex) console.assert(typeof noticeObject.characterIndex === 'number', `cBP addNoticePartial: 'characterIndex' parameter should be a number not a '${typeof noticeObject.characterIndex}'`);
    // console.assert(extract !== undefined, "cBP addNoticePartial: 'extract' parameter should be defined");
    if (noticeObject.extract) console.assert(typeof noticeObject.extract === 'string', `cBP addNoticePartial: 'extract' parameter should be a string not a '${typeof noticeObject.extract}'`);
    console.assert(noticeObject.location !== undefined, "cBP addNoticePartial: 'location' parameter should be defined");
    console.assert(typeof noticeObject.location === 'string', `cBP addNoticePartial: 'location' parameter should be a string not a '${typeof noticeObject.location}'`);
    console.assert(noticeObject.extra !== undefined, "cBP addNoticePartial: 'extra' parameter should be defined");
    console.assert(typeof noticeObject.extra === 'string', `cBP addNoticePartial: 'extra' parameter should be a string not a '${typeof noticeObject.extra}'`);
    checkBookPackageResult.noticeList.push({ ...noticeObject, bookID });
  }


  async function ourCheckBPFileContents(repoCode, cfFilename, file_content, fileLocation, optionalCheckingOptions) {
    // console.log(`checkBookPackage ourCheckBPFileContents(${repoCode}, ${cfFilename}, ${file_content.length}, ${fileLocation}, ${JSON.stringify(optionalCheckingOptions)})…`);

    // Updates the global list of notices
    console.assert(repoCode !== undefined, "cBP ourCheckBPFileContents: 'repoCode' parameter should be defined");
    console.assert(typeof repoCode === 'string', `cBP ourCheckBPFileContents: 'repoCode' parameter should be a string not a '${typeof repoCode}'`);
    console.assert(cfFilename !== undefined, "cBP ourCheckBPFileContents: 'cfFilename' parameter should be defined");
    console.assert(typeof cfFilename === 'string', `cBP ourCheckBPFileContents: 'cfFilename' parameter should be a string not a '${typeof cfFilename}'`);
    console.assert(file_content !== undefined, "cBP ourCheckBPFileContents: 'file_content' parameter should be defined");
    console.assert(typeof file_content === 'string', `cBP ourCheckBPFileContents: 'file_content' parameter should be a string not a '${typeof file_content}'`);
    console.assert(fileLocation !== undefined, "cBP ourCheckBPFileContents: 'fileLocation' parameter should be defined");
    console.assert(typeof fileLocation === 'string', `cBP ourCheckBPFileContents: 'fileLocation' parameter should be a string not a '${typeof fileLocation}'`);

    const cfcResultObject = await checkFileContents(languageCode, cfFilename, file_content, fileLocation, optionalCheckingOptions);
    // console.log("checkFileContents() returned", cfResultObject.successList.length, "success message(s) and", cfResultObject.noticeList.length, "notice(s)");
    // for (const successEntry of cfResultObject.successList) console.log("  ourCheckBPFileContents:", successEntry);
    // console.log("cfcResultObject", JSON.stringify(cfcResultObject));

    // Process results line by line,  appending the repoCode as an extra field as we go
    for (const cfcNoticeEntry of cfcResultObject.noticeList)
      // noticeEntry is an object
      // We add the repoCode as an extra value
      addNoticePartial({ ...cfcNoticeEntry, filename: cfFilename, extra: repoCode });
  }
  // end of ourCheckBPFileContents function


  // Main code for checkBookPackage()
  // console.log("checkBookPackage() main code…");
  if (bookID === 'OBS') {
    // We use the generalLocation here (does not include repo name)
    //  so that we can adjust the returned strings ourselves
    // console.log("Calling OBS checkRepo()…");
    checkBookPackageResult = await checkRepo(username, `${languageCode}_obs`, branch, generalLocation, setResultValue, newCheckingOptions); // Adds the notices to checkBookPackageResult
    // console.log(`checkRepo() returned ${checkBookPackageResult.successList.length} success message(s) and ${checkBookPackageResult.noticeList.length} notice(s)`);
    // console.log("crResultObject keys", JSON.stringify(Object.keys(checkBookPackageResult)));

    // Concat is faster if we don't need to process each notice individually
    // checkBookPackageResult.successList = checkBookPackageResult.successList.concat(crResultObject.successList);
    // checkBookPackageResult.noticeList = checkBookPackageResult.noticeList.concat(crResultObject.noticeList);
    // checkedFileCount += crResultObject.fileCount;
    addSuccessMessage(`Checked ${languageCode} OBS repo from ${username}`);
  } else { // not OBS
    // We also need to know the number for USFM books
    let bookNumberAndName, whichTestament;
    try {
      bookNumberAndName = books.usfmNumberNameById(bookID);
      whichTestament = books.testament(bookID); // returns 'old' or 'new'
    } catch (bNNerror) {
      if (books.isValidBookID(bookID)) // must be in FRT, BAK, etc.
        whichTestament = 'other'
      else {
        addNoticePartial({ priority: 902, message: "Bad function call: should be given a valid book abbreviation", extract: bookID, location: ` (not '${bookID}')${generalLocation}` }); return checkBookPackageResult;
      }
    }
    // console.log(`checkBookPackage: bookNumberAndName='${bookNumberAndName}' (${whichTestament} testament)`);

    // So now we want to work through checking this one specified Bible book in various repos:
    //  UHB/UGNT, ULT/GLT, UST/GST, TN, TQ
    const getFile_ = (newCheckingOptions && newCheckingOptions.getFile) ? newCheckingOptions.getFile : getFileCached;
    let checkedFileCount = 0, checkedFilenames = [], checkedFilenameExtensions = new Set(), totalCheckedSize = 0, checkedRepoNames = [];
    const origLang = whichTestament === 'old' ? 'UHB' : 'UGNT';

    // optionally pass in list of repos to check
    const repoCodeList = (newCheckingOptions && newCheckingOptions.checkRepos) ? newCheckingOptions.checkRepos : [origLang, 'LT', 'ST', 'TN', 'TQ'];
    for (const repoCode of repoCodeList) {
      // consult repo map for org and repo values
      const orgRepo  = getRepoMap()[languageCode][repoCode];
      const orgname  = orgRepo.split('/')[0];
      const repoName = orgRepo.split('/')[1];

      console.log(`checkBookPackage: check ${bookID} in ${repoCode} (${languageCode} ${bookID} from ${orgname})`);
      const repoLocation = ` in ${repoCode.toUpperCase()}${generalLocation}`;
      //const repoName = formRepoName(languageCode, repoCode);

      // Update our "waiting" message
      //setResultValue(<p style={{ color: 'magenta' }}>Checking {username} {languageCode} <b>{bookID}</b> book package in <b>{repoCode}</b> (checked <b>{checkedRepoNames.length.toLocaleString()}</b>/{repoCodeList.length} repos)…</p>);
      setResultValue(<p style={{ color: 'magenta' }}>Checking {orgname} {languageCode} <b>{bookID}</b> book package in <b>{repoCode}</b> (checked <b>{checkedRepoNames.length.toLocaleString()}</b>/{repoCodeList.length} repos)…</p>);

      let filename;
      if (repoCode === 'UHB' || repoCode === 'UGNT' || repoCode === 'LT' || repoCode === 'ST') {
        // TODO: Might we need specific releases/tags for some of these (e.g., from the TN manifest)???
        // TODO: Do we need to hard-code where to find the UHB and UGNT???
        filename = `${bookNumberAndName}.usfm`;
        checkedFilenameExtensions.add('usfm');
      }
      else if (repoCode === 'TN') {
        try {
          filename = await cachedGetBookFilenameFromManifest({ username: orgname, repository: repoName, branch, bookID: bookID.toLowerCase() });
          checkBookPackageResult.tsvFileName = filename;
          //console.assert(filename.startsWith(`${languageCode}_`), `Expected TN filename '${filename}' to start with the language code '${languageCode}_'`);
        } catch (e) {
          console.error(`cachedGetBookFilenameFromManifest failed with: ${e}`);
          filename = `${languageCode}_tn_${bookNumberAndName}.tsv`;
        }
        console.assert(filename.endsWith('.tsv'), `Expected TN filename '${filename}' to end with '.tsv'`);
        checkedFilenameExtensions.add('tsv');
      }

      if (repoCode === 'TQ') {
        // This resource might eventually be converted to TSV tables
        const tqResultObject = await checkTQbook(orgname, languageCode, repoName, branch, bookID, newCheckingOptions);
        checkBookPackageResult.successList = checkBookPackageResult.successList.concat(tqResultObject.successList);
        checkBookPackageResult.noticeList = checkBookPackageResult.noticeList.concat(tqResultObject.noticeList);
        checkedFilenames = checkedFilenames.concat(tqResultObject.checkedFilenames);
        checkedFilenameExtensions = new Set([...checkedFilenameExtensions, ...tqResultObject.checkedFilenameExtensions]);
        checkedFileCount += tqResultObject.checkedFileCount;
        totalCheckedSize += tqResultObject.totalCheckedSize;
        checkedRepoNames.push(repoCode);
      } else { // For repos other than TQ, we only have one file to check
        // console.log("Try to load", username, repoName, filename, branch);
        let repoFileContent;
        try {
          // console.log("checkBookPackage about to fetch file_content for", username, repoName, branch, filename);
          repoFileContent = await getFile_({ username: orgname, repository: repoName, path: filename, branch });
          // console.log("checkBookPackage fetched file_content for", username, repoName, branch, filename, typeof repoFileContent, repoFileContent.length);
          checkedFilenames.push(filename);
          totalCheckedSize += repoFileContent.length;
          checkedRepoNames.push(repoCode);
        } catch (cBPgfError) {
          console.error("Failed to load", orgname, repoName, filename, branch, cBPgfError + '');
          addNoticePartial({ priority: 996, message: "Failed to load", repoName, filename, location: `${repoLocation}: ${cBPgfError}`, extra: repoCode });
          continue;
        }

        // We use the generalLocation here (does not include repo name)
        //  so that we can adjust the returned strings ourselves
        newCheckingOptions.originalLanguageRepoUsername = orgname;
        newCheckingOptions.taRepoUsername = getRepoMap()[languageCode].TA.split('/')[0]
        await ourCheckBPFileContents(repoCode, filename, repoFileContent, generalLocation, newCheckingOptions); // Adds the notices to checkBookPackageResult
        checkedFileCount += 1;
        addSuccessMessage(`Checked ${repoCode.toUpperCase()} file: ${filename}`);
      }
    }

    // Add some extra fields to our checkFileResult object
    //  in case we need this information again later
    checkBookPackageResult.checkedFileCount = checkedFileCount;
    checkBookPackageResult.checkedFilenames = checkedFilenames;
    checkBookPackageResult.checkedFilenameExtensions = [...checkedFilenameExtensions]; // convert Set to Array
    checkBookPackageResult.checkedFilesizes = totalCheckedSize;
    checkBookPackageResult.checkedRepoNames = checkedRepoNames;
    // checkBookPackageResult.checkedOptions = newCheckingOptions; // This is done at the caller level
  }

  checkBookPackageResult.elapsedSeconds = (new Date() - startTime) / 1000; // seconds
  // console.log("checkBookPackageResult:", JSON.stringify(checkBookPackageResult));
  console.log(`checkBookPackageResult(${bookID}): elapsedSeconds = ${checkBookPackageResult.elapsedSeconds}, notices count = ${checkBookPackageResult.noticeList.length}`);
  return checkBookPackageResult;
};
// end of checkBookPackage()
