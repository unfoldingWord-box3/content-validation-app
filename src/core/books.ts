import data from './books.json';

export interface bookDataIF {
  "id": string;
  "title": string;
  "usfm": string;
  "testament": string;
  "verseCount": number;
  "chapters": number[];
}

interface bpStateIF { [x: string]: boolean[]; };

export const chaptersInBook = (bookId: string) => {
    let chapters: number[];
    chapters = bookData(bookId).chapters;
    if ( chapters === undefined ) {
      throw new Error("Error: chaptersInBook(): Invalid bookId");
    }
    return chapters;
};

export const versesInChapter = (bookId: string, chapter: number) => {
  const verses = chaptersInBook(bookId)[chapter - 1];
  return verses;
};

export const bookData = (bookId: string) => {
  const _bookData: bookDataIF = data.filter(row => row.id === bookId)[0];
  return _bookData;
};

export const testament = (bookId: string) => {
  const _testament = bookData(bookId).testament;
  return _testament;
};

export const newTestament = () => {
  let list: string[] = [];
  for (let i=0; i < data.length; i++) {
    if ( data[i].testament === "new" ) {
      list.push( data[i].title )
    }
  }
  return list;
}

export const oldTestament = () => {
  let list: string[] = [];
  for (let i=0; i < data.length; i++) {
    if ( data[i].testament === "old" ) {
      list.push( data[i].title )
    }
  }
  return list;
}

export const bookDataTitles = () => {
  let list: string[] = [];
  for (let i=0; i < data.length; i++) {
      list.push( data[i].title )
  }
  return list;
}

export const titlesToBoolean = () => {
  let ob: bpStateIF = {};
  let list = bookDataTitles();
  list.forEach((v,k) => {ob[v]= [false,false]});
  return ob;
}

export const bookIdByTitle = (title: string) => {
  for (let i=0; i < data.length; i++) {
    if ( data[i].title === title ) {
      return data[i].id;
    }
  }
  return "";
}

export const bookTitleById = (id: string) => {
  for (let i=0; i < data.length; i++) {
    if ( data[i].id === id ) {
      return data[i].title;
    }
  }
  return "";
}

const extraBookList = ['FRT','BAK'];

export const isOptionalValidBookID = (bookId: string) => {
  return !bookId || bookId.toLowerCase() in data || extraBookList.indexOf(bookId) >= 0;
}
export const isValidBookID = (id: string) => {
  const _id = id.toLowerCase();
  for (let i=0; i < data.length; i++) {
    if ( data[i].id === _id ) {
      return true;
    }
  }
  const __id = id.toUpperCase();
  for (let i=0; i < extraBookList.length; i++) {
    if ( extraBookList[i] === __id ) {
      return true;
    }
  }

  return false;
}
export const usfmNumberNameById = (id: string) => {
  for (let i=0; i < data.length; i++) {
    if ( data[i].id === id ) {
      return data[i].usfm;
    }
  }
  throw new Error(`usfmNumberName() given invalid bookId: '${id}'`);
}

