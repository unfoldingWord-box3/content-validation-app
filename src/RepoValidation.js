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


function RepoValidation({
    results,
}) 
{

    const columns = [
        { title: 'Resource Type', field: 'repoType', editable: 'never' },
        { title: 'Org', field: 'org' },
        { title: 'Repo', field: 'repo' },
        { title: 'Message', field: 'message', editable: 'never' },
    ];
    const [data, setData] = React.useState([]);
    React.useEffect( () => {
        let _data = [];
        for (let i=0; i<results.length; i++) {
            let msg = results[i].message;
            let org = results[i].username;
            let repo = results[i].repository;
            _data.push({
                repoType: results[i].repoType,
                org: org,
                repo: repo,
                message: msg,
            });
        }
        setData(_data);
    }, [results]); 

    let repoVisual = (
        <Paper>
        <MaterialTable
            icons={tableIcons}
            title="Repo Validation"
            columns={columns}
            data={data}
            options={ {sorting: true} }
            cellEditable={{
                onCellEditApproved: (newValue, oldValue, rowData, columnDef) => {
                  return new Promise((resolve, reject) => {
                    let _data = data;
                    // first find the matching row
                    for (let i=0; i<_data.length; i++) {
                        if ( _data[i].repoType === rowData.repoType &&
                             _data[i].org      === rowData.org &&
                             _data[i].repo     === rowData.repo 
                        ) {
                            if ( columnDef.field === 'repo' ) {
                                _data[i].repo = newValue;
                            } else if ( columnDef.field === 'org' ) {
                                _data[i].org  = newValue;
                            }
                        }
                    }
                    setData(_data);
                    console.log('xx newValue: ' + newValue);
                    setTimeout(resolve, 1000);
                  });
                }
              }}      
        />
        </Paper>
    );

    return repoVisual;
};

RepoValidation.propTypes = {
/** @ignore */
results: PropTypes.array.isRequired,
};

const styles = theme => ({
    root: {
    },
});

export default withStyles(styles)(RepoValidation);

