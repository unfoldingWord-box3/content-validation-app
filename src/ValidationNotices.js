import React from 'react';
import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';
import { withStyles } from '@material-ui/core/styles';

import AddBox from '@material-ui/icons/AddBox';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import ViewColumn from '@material-ui/icons/ViewColumn';

import MaterialTable from 'material-table';
import * as util from './core/utilities.ts';

const tableIcons = {
  Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
  ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} />),
  ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
  ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />)
};

/**
 * Colorized priority according to severity of notice
 * @param content
 * @return {JSX.Element|string}
 */
export const renderPriority = (content) => {
  // breaking changes: 800 and above
  if ( content >= 800 ) {
      return <p style={{ color: 'red', fontWeight: 'bold' }}>{content}</p>;
  }

  // non-breaking changes: 600 to 799
  if ( content >= 600 ) {
    return <p style={{ color: 'blue', fontWeight: 'bold' }}>{content}</p>
  }

  // below 600 are warnings
  return <p style={{ color: 'green', fontWeight: 'bold' }}>{content}</p>;
}

/**
 * creates a link to external URL
 * @param link
 * @param content
 * @return {JSX.Element|string}
 */
export const renderLink = (link, content) => {
  if (link) {
    return <a href={link} target="_blank" rel="noopener noreferrer">{content}</a>
  } else if (content) {
    return `${content}`
  }
  return "";
}

/**
 * replaces unicode references with link to webpage describing the character
 * @param content
 * @return {JSX.Element|string}
 */
export const renderWithUnicodeLink = (content) => {
  if ( !content ) {
    return "";
  }
  // find unicode refs that look like '( =D8288/H2060)'
  const getUnicodeRegEx = new RegExp(/=D(\d+)\/H(\w+)\)/, 'g');
  let match;
  let lastPos = 0;
  const output = [];
  // eslint-disable-next-line no-cond-assign
  while (match = getUnicodeRegEx.exec(content)) {
    if (match.index > 0) {
      output.push(content.substring(lastPos, match.index));
    }
    let matchLen = match[0].length;
    const unicode = match[2];
    output.push (
      <a href={`http://www.fileformat.info/info/unicode/char/${unicode}/index.htm`} target="_blank" rel="noopener noreferrer">U+{unicode}</a>
    )
    lastPos = match.index + matchLen - 1; // update start position
  }
  if (lastPos < content.length) {
    output.push(content.substring(lastPos, content.length));
  }

  // assemble all the strings and anchors into one segment
  return <> {output} </>
};

function ValidationWarnings({
    results,
    username,
    languageCode,
    bookID,
    rawData
  }) {

    let mt = util.notices_to_mt(results, username, languageCode, bookID, renderLink, renderWithUnicodeLink, renderPriority, rawData);
    return (
      <Paper>
        <MaterialTable
          icons={tableIcons}
          title={mt.title}
          columns={mt.columns}
          data={mt.data}
          options={mt.options}
        />
      </Paper>
    );
  };

  ValidationWarnings.propTypes = {
    /** @ignore */
    results: PropTypes.array.isRequired,
  };

  const styles = theme => ({
    root: {
    },
  });

  export default withStyles(styles)(ValidationWarnings);

