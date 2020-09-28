import Path from 'path';
import yaml from 'yaml';
import localforage from 'localforage';
import { setup } from 'axios-cache-adapter';
import JSZip from 'jszip';

const baseURL = 'https://git.door43.org/';
const apiPath = 'api/v1';

/**
 *
 * @param {string} username
 * @param {string} repo
 * @return {string} username to use
 */
export function getUserNameOverrideForRepo(username, repo) {
  //    console.log(`getUserNameOverrideForRepo('${username}', '${repo}')…`);
  const originalUsername = username;
  if (['el-x-koine_ugnt', 'hbo_uhb'].includes(repo)) {
    username = 'unfoldingWord';
  } else if ((repo.indexOf('_glt') > 0)  || (repo.indexOf('_gst') > 0)) {
    username = 'STR';
  } else if (['hi_tw'].includes(repo)) {
    username = 'STR';
  }

  if (username.toLowerCase() !== originalUsername.toLowerCase()) {
    console.log(`getUserNameOverrideForRepo('${originalUsername}', '${repo}') - changing username to ${username}`);
  }
  return username;
}

// caches failed http file fetches so we don't waste time with repeated attempts
const failedStore = localforage.createInstance({
  driver: [localforage.INDEXEDDB],
  name: 'failed-store',
});

// caches zip file fetches done by fetchRepositoryZipFile()
const zipStore = localforage.createInstance({
  driver: [localforage.INDEXEDDB],
  name: 'zip-store',
});

// caches http file fetches done by fetchFileFromServer()
const cacheStore = localforage.createInstance({
  driver: [localforage.INDEXEDDB],
  name: 'web-cache',
});

// caches the unzipped files requested so we don't do repeated unzipping of the same file which is slow in JS
const unzipStore = localforage.createInstance({
  driver: [localforage.INDEXEDDB],
  name: 'unzip-store',
});

// API for http requests
const Door43Api = setup({
  baseURL: baseURL,
  cache: {
    store: cacheStore,
    maxAge: 5 * 60 * 1000, // 5-minutes
    exclude: { query: false },
    key: req => {
      // if (req.params) debugger
      let serialized = req.params instanceof URLSearchParams ?
        req.params.toString() : JSON.stringify(req.params) || '';
      return req.url + serialized;
    },
  },
});

/**
 * try to get previously unzipped file from cache
 * @param {string} path
 * @return {Promise<unknown>} resolves to file contents or null if not found
 */
export async function getUnZippedFile(path) {
  // console.log(`getUnZippedFile(${path})`);
  const contents = await unzipStore.getItem(path.toLowerCase());
  return contents;
}

/**
 * searches for files in this order:
 *   - cache of uncompressed files (unzipStore)
 *   - cache of zipped repos (zipStore)
 *   - and finally calls fetchFileFromServer() which firts checks in cacheStore to see if already fetched.
 * @param {String} username
 * @param {String} repository
 * @param {String} path
 * @param {String} branch
 * @return {Promise<*>}
 */
export async function getFileCached({ username, repository, path, branch }) {

  username = getUserNameOverrideForRepo(username, repository);

  const filePath = Path.join(username, repository, path, branch);
  // console.log(`getFileCached(${username}, ${repository}, ${path}, ${branch})…`);
  let contents = await getUnZippedFile(filePath);
  if (contents) {
    // console.log(`in cache - ${filePath}`);
    return contents;
  }

  contents = await getFileFromZip({ username, repository, path, branch });
  if (!contents) {
    contents = await fetchFileFromServer({ username, repository, path, branch });
  }

  if (contents) {
    // save unzipped file in cache to speed later retrieval
    await unzipStore.setItem(filePath.toLowerCase(), contents);
    // console.log(`saving to cache - ${filePath}`);
  } else {
    console.log(`getFileCached(${username}, ${repository}, ${path}, ${branch}) - failed to get file`);
  }

  return contents;
}

/**
 * Retrieve manifest.yaml from requested repo
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @return {Promise<[]|*[]>} resolves to manifest contents if downloaded (else undefined)
 */
async function cachedGetManifest({ username, repository, branch }) {
  // console.log(`cachedGetManifest(${username}, ${repository}, ${branch})…`);

  const manifestContents = await getFileCached({ username, repository, path: 'manifest.yaml', branch });
  let formData;
  try {
    formData = yaml.parse(manifestContents);
    // console.log("yaml.parse(YAMLText) got formData", JSON.stringify(formData));
  }
  catch (yamlError) {
    console.error(`${username} ${repository} ${branch} manifest yaml parse error: ${yamlError.message}`);
  }
  return formData;
}


/**
 * Retrieve manifest.yaml from requested repo
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @param {string} bookID -- 3-character USFM book code
 * @return {Promise<[]|*[]>} resolves to filename from the manifest for the book (else undefined)
 */
export async function cachedGetBookFilenameFromManifest({ username, repository, branch, bookID }) {
  // console.log(`cachedGetBookFilenameFromManifest(${username}, ${repository}, ${branch}, ${bookID})…`);
  const manifestJSON = await cachedGetManifest({ username, repository, branch });
  for (const projectEntry of manifestJSON.projects) {
    if (projectEntry.identifier === bookID) {
      let bookPath = projectEntry.path;
      if (bookPath.startsWith('./')) bookPath = bookPath.substring(2);
      return bookPath;
    }
  }
}

/**
 * clear all the stores
 * @return {Promise<void>}
 */
export async function clearCaches() {
  console.log("Clearing localforage.INDEXEDDB zipStore, cacheStore, etc. caches…");
  // const tasks = [zipStore, cacheStore].map(localforage.clear);
  // const results = await Promise.all(tasks);
  // results.forEach(x => console.log("Done it", x));
  await failedStore.clear();
  await zipStore.clear();
  await cacheStore.clear();
  await unzipStore.clear();
}

/**
 * @description - Forms and returns a Door43 repoName string
 * @param {String} languageCode - the language code, e.g., 'en'
 * @param {String} repoCode - the repo code, e.g., 'TQ'
 * @return {String} - the Door43 repoName string
 */
export function formRepoName(languageCode, repoCode) {
  //    console.log(`formRepoName('${languageCode}', '${repoCode}')…`);

  // TODO: Should we also check the username 'unfoldingWord' and/or 'Door43-Catalog' here???
  //        (We don't currently have the username available in this function.)
  if (repoCode === 'LT') repoCode = languageCode === 'en' ? 'ULT' : 'GLT';
  if (repoCode === 'ST') repoCode = languageCode === 'en' ? 'UST' : 'GST';

  let repo_languageCode = languageCode;
  if (repoCode === 'UHB') repo_languageCode = 'hbo';
  else if (repoCode === 'UGNT') repo_languageCode = 'el-x-koine';
  const repoName = `${repo_languageCode}_${repoCode.toLowerCase()}`;
  return repoName;
}

/**
 * add new repo to list if missing
 * @param {string} repos
 * @param {string} newRepo
 * @param {boolean} addToStart - if true add to start
 */
function addIfMissing(repos, newRepo, addToStart = true) {
  if (!repos.includes(newRepo)) {
    if (addToStart) {
      repos.unshift(newRepo);
    } else {
      repos.push(newRepo);
    }
  }
}

/**
 * preloads repo zips, before running book package checks.
 *   TRICKY: note that even if the user is super fast in selecting books and clicking next, it will not hurt anything.  getFile() would just be fetching files directly from repo until the zips are loaded.  After that the files would be pulled out of zipStore.
 * @param {string} username
 * @param {string} languageCode
 * @param {string} branch - optional, defaults to master
 * @param {Array} repos - optional, list of additional repos to pre-load
 * @param {boolean} loadOriginalLangs - if true will download original language books
 * @param {boolean} loadUltAndUst
 * @return {Promise<Boolean>} resolves to true if file loads are successful
 */
export async function PreLoadRepos(username, languageCode, branch = 'master', repos = [],
                                   loadOriginalLangs = false,
                                   loadUltAndUst = false) {
  console.log(`PreLoadRepos(${username}, ${languageCode}, ${branch}, ${repos}, ${loadOriginalLangs})…`);

  let success = true;
  const repos_ = repos.map((repo) => (formRepoName(languageCode, repo)));

  if (loadOriginalLangs) {
    // make sure we have the original languages needed
    for (const origLangBibles of [ 'UHB', 'UGNT' ]) {
      addIfMissing(repos_, formRepoName(languageCode, origLangBibles), true);
    }
  }

  if (loadUltAndUst) {
    const LT = languageCode === 'en' ? 'ULT' : 'GLT';
    const ST = languageCode === 'en' ? 'UST' : 'GST';
    addIfMissing(repos_, formRepoName(languageCode, LT), false);
    addIfMissing(repos_, formRepoName(languageCode, ST), false);
  }

  // load all the repos needed
  for (const repoName of repos_) {
    console.log(`PreLoadRepos: preloading zip file for ${repoName}…`);
    const zipFetchSucceeded = await fetchRepositoryZipFile({ username, repository: repoName, branch });
    if (!zipFetchSucceeded) {
      console.log(`PreLoadRepos: misfetched zip file for ${repoName} repo with ${zipFetchSucceeded}`);
      success = false;
    }
  }

  return success;
}

/**
 * does http file fetch from server  uses cacheStore to minimize repeated fetches of same file
 * @param {string} username
 * @param {string} repository
 * @param {string} path
 * @param {string} branch
 * @return {Promise<null|any>} resolves to file content
 */
async function fetchFileFromServer({ username, repository, path, branch = 'master' }) {
  console.log(`fetchFileFromServer(${username}, ${repository}, ${path}, ${branch})…`);
  const repoExists = await repositoryExists({ username, repository });
  let uri;
  if (repoExists) {
    uri = Path.join(username, repository, 'raw/branch', branch, path);
    const failMessage = await failedStore.getItem(uri.toLowerCase());
    if (failMessage) {
      // console.log(`fetchFileFromServer failed previously for ${uri}: ${failMessage}`);
      return null;
    }
    try {
      // console.log("URI=",uri);
      const data = await cachedGet({ uri });
      // console.log("Got data", data);
      return data;
    }
    catch (fffsError) {
      console.log(`ERROR: fetchFileFromServer could not fetch ${path}: ${fffsError}`)
      /* await */ failedStore.setItem(uri.toLowerCase(), fffsError.message);
      return null;
    }
  } else {
    console.log(`ERROR: fetchFileFromServer repo '${repository}' does not exist!`);
    /* await */ failedStore.setItem(uri.toLowerCase(), `Repo '${repository}' does not exist!`);
    return null;
  }
};

/**
 *  older getFile without that doesn't use the unzipStore
 * @param {string} username
 * @param {string} repository
 * @param {string} path
 * @param {string} branch
 * @return {Promise<*>}
 */
async function getFile({ username, repository, path, branch }) {
  console.log(`getFile(${username}, ${repository}, ${path}, ${branch})…`);
  let file;
  file = await getFileFromZip({ username, repository, path, branch });
  if (!file) {
    file = await fetchFileFromServer({ username, repository, path, branch });
  }
  return file;
}

async function getUID({ username }) {
  // console.log(`getUID(${username})…`);
  const uri = Path.join(apiPath, 'users', username);
  // console.log(`getUID uri=${uri}`);
  const user = await cachedGet({ uri });
  // console.log(`getUID user=${user}`);
  const { id: uid } = user;
  // console.log(`  getUID returning: ${uid}`);
  return uid;
}

/**
 * check server to see if repository exists on server.  Do this before we try to download
 * @param {string} username
 * @param {string} repository
 * @return {Promise<boolean>}
 */
async function repositoryExists({ username, repository }) {
  // console.log(`repositoryExists(${username}, ${repository})…`);
  const uid = await getUID({ username });
  // console.log(`repositoryExists uid=${uid}`);
  // Default limit is 10 -- way too small
  // TODO: we probably want to change this to do paging since we cannot be sure of future size limits on fetches
  const params = { q: repository, limit: 500, uid }; // Documentation says limit is 50, but larger numbers seem to work ok
  // console.log(`repositoryExists params=${JSON.stringify(params)}`);
  const uri = Path.join(apiPath, 'repos', `search`);
  // console.log(`repositoryExists uri=${uri}`);
  const { data: repos } = await cachedGet({ uri, params });
  // console.log(`repositoryExists repos (${repos.length})=${repos}`);
  // for (const thisRepo of repos) console.log(`  thisRepo (${JSON.stringify(Object.keys(thisRepo))}) =${JSON.stringify(thisRepo.name)}`);
  const repo = repos.filter(repo => repo.name === repository)[0];
  // console.log(`repositoryExists repo=${repo}`);
  // console.log(`  repositoryExists returning: ${!!repo}`);
  return !!repo;
};

async function cachedGet({ uri, params }) {
  // console.log(`cachedGet(${uri}, ${JSON.stringify(params)})…`);
  // console.log(`  get querying: ${baseURL+uri}`);
  const { data } = await Door43Api.get(baseURL + uri, { params });
  // console.log(`  cachedGet returning: ${JSON.stringify(data)}`);
  return data;
};

export async function cachedGetURL({ uri, params }) {
  // console.log(`cachedGetURL(${uri}, ${params})…`);
  const { data } = await Door43Api.get(uri, { params });
  // console.log(`  cachedGetURL returning: ${data}`);
  return data;
};

/*
function fetchRepositoriesZipFiles({username, languageId, branch}) {
  const repositories = resourceRepositories({languageId});
  const promises = Object.values(repositories).map(repository => {
    return fetchRepositoryZipFile({username, repository, branch});
  });
  const zipArray = await Promise.all(promises);
  return zipArray;
};
*/


/**
 * retrieve repo as zip file
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @param {boolean} forceLoad - if not true, then use existing repo in zipstore
 * @return {Promise<[]|*[]>} resolves to true if downloaded
 */
export async function fetchRepositoryZipFile({ username, repository, branch }, forceLoad = false) {
  // https://git.door43.org/{username}/{repository}/archive/{branch}.zip
  console.log(`fetchRepositoryZipFile(${username}, ${repository}, ${branch})…`);

  username = getUserNameOverrideForRepo(username, repository);

  if (!forceLoad) { // see if we already have in zipStore
    const zipBlob = await getZipFromStore(username, repository, branch);
    if (zipBlob) {
      console.log(`fetchRepositoryZipFile(${username}, ${repository}, ${branch})… - already loaded`);
      return true;
    }
  }

  const repoExists = await repositoryExists({ username, repository });
  if (!repoExists) {
    console.log(`fetchRepositoryZipFile(${username}, ${repository}, ${branch}) - repo doesn't exist`, { username, repository });
    return false;
  }

  const uri = zipUri({ username, repository, branch });
  const response = await fetch(uri);
  if (response.status === 200 || response.status === 0) {
    const zipArrayBuffer = await response.arrayBuffer(); // blob storage not supported on mobile
    console.log(`fetchRepositoryZipFile(${username}, ${repository}, ${branch}) - saving zip: ${uri}`);
    await zipStore.setItem(uri.toLowerCase(), zipArrayBuffer);
    return true;
  } else {
    console.log(`fetchRepositoryZipFile(${username}, ${repository}, ${branch}) - got response status: ${response.status}`);
    return false;
  }
};

/**
 * pull repo from zipstore and get a file list
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @param {string} optionalPrefix - to filter by book, etc.
 * @return {Promise<[]|*[]>}  resolves to file list
 */
export async function getFileListFromZip({ username, repository, branch, optionalPrefix }) {
  // console.log(`getFileListFromZip(${username}, ${repository}, ${branch}, ${optionalPrefix})…`);

  username = getUserNameOverrideForRepo(username, repository);

  const uri = zipUri({ username, repository, branch });
  let zipBlob = await getZipFromStore(username, repository, branch);

  if (!zipBlob) { // Seems that we need to load the zip file first
    const response = await fetch(uri);
    if (response.status === 200 || response.status === 0) {
      const zipArrayBuffer = await response.arrayBuffer(); // blob storage not supported on mobile
      zipBlob = await zipStore.setItem(uri.toLowerCase(), zipArrayBuffer);
    } else {
      console.log(`ERROR: getFilelistFromZip got response status: ${response.status}`);
      return [];
    }
  }

  const pathList = [];
  try {
    if (zipBlob) {
      // console.log(`  Got zipBlob for uri=${uri}`);
      const zip = await JSZip.loadAsync(zipBlob);
      // console.log(`  Got zip`);
      // Now we need to fetch the list of files from the repo
      // zip.forEach(function (relativePath, fileObject) {
      zip.forEach(function (relativePath) {
        // console.log(`relPath=${relativePath}`)
        // consoleLogObject('fileObject', fileObject);
        if (!relativePath.endsWith('/')) // it's not a folder
        {
          if (relativePath.startsWith(`${repository}/`)) // remove repo name prefix
            relativePath = relativePath.substring(repository.length + 1);
          if (relativePath.length
            && !relativePath.startsWith('.git') // skips files in these folders
            && !relativePath.startsWith('.apps') // skips files in this folder
            && (!optionalPrefix || relativePath.startsWith(optionalPrefix))) // it's the correct prefix
            pathList.push(relativePath);
        }
      })
    }
    // else console.log("  getFileListFromZip: No zipBlob");
  } catch (error) {
    console.log(`ERROR: getFilelistFromZip got: ${error.message}`);
  }

  // console.log(`getFileListFromZip is returning (${pathList.length}) entries: ${pathList}`);
  return pathList;
}

/**
 * try to get zip file from cache
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @return {Promise<unknown>} resolves to null if not found
 */
export async function getZipFromStore(username, repository, branch) {
  const uri = zipUri({username, repository, branch});
  const zipBlob = await zipStore.getItem(uri.toLowerCase());
  // console.log(`getZipFromStore(${uri} - empty: ${!zipBlob}`);
  return zipBlob;
}

/**
 * pull repo from zipstore and get the unzipped file
 * @param {string} username
 * @param {string} repository
 * @param {string} branch
 * @param {object} optionalPrefix
 * @return {Promise<[]|*[]>} resolves to unzipped file if found or null
 */
async function getFileFromZip({ username, repository, path, branch }) {
  // console.log(`getFileFromZip(${username}, ${repository}, ${path}, ${branch})…`);
  let file;
  const zipBlob = await getZipFromStore(username, repository, branch);
  try {
    if (zipBlob) {
      // console.log(`  Got zipBlob for uri=${uri}`);
      const zip = await JSZip.loadAsync(zipBlob);
      const zipPath = Path.join(repository.toLowerCase(), path);
      // console.log(`  zipPath=${zipPath}`);
      file = await zip.file(zipPath).async('string');
      // console.log(`    Got zipBlob ${file.length} bytes`);
    }
    // else console.log("  No zipBlob");
  } catch (error) {
    console.log(`ERROR: getFileFromZip for ${username} ${repository} ${path} ${branch} got: ${error.message}`);
    file = null;
  }
  return file;
};


export function zipUri({ username, repository, branch = 'master' }) {
  // console.log(`zipUri(${username}, ${repository}, ${branch})…`);
  const zipPath = Path.join(username, repository, 'archive', `${branch}.zip`);
  const zipUri = baseURL + zipPath;
  return zipUri;
};


export async function fetchTree({ username, repository, sha = 'master' }) {
  // console.log(`fetchTree(${username}, ${repository}, ${sha})…`);
  let data;
  try {
    const uri = Path.join('api/v1/repos', username, repository, 'git/trees', sha);
    // console.log(`  uri='${uri}'`);
    data = await cachedGet({ uri });
    // console.log(`  data (${typeof data})`);
    return data;
    // const tree = JSON.parse(data); // RJH: Why was this here???
    // console.log(`  tree (${typeof tree})`);
    // return tree;
  } catch (error) {
    console.log(`ERROR: fetchTree got: ${error.message}`);
    console.log(`  Data was: ${JSON.stringify(data)}`);
    return null;
  }
};


/*
async function recursiveTree({username, repository, path, sha}) {
  console.log("recurse tree args:",username,repository,path,sha)
  let tree = {};
  const pathArray = path.split();
  const results = fetchTree({username, repository, sha});
  const result = results.tree.filter(item => item.path === pathArray[0])[0];
  if (result) {
    if (result.type === 'tree') {
      const childPath = pathArray.slice(1).join('/');
      const children = recursiveTree({username, repository, path: childPath, sha: result.sha});
      tree[result.path] = children;
    } else if (result.type === 'blob') {
      tree[result.path] = true;
    }
  }
};

async function fileExists({username, repository, path, branch}) {
  // get root listing
  recursiveTree()
  // get recursive path listing
}
*/
