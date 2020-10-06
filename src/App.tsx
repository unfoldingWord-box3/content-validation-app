import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme, Theme, createStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Checkbox from '@material-ui/core/Checkbox';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import * as books from '../src/core/books';
import { Container, CssBaseline, Grid, RadioGroup, Radio, CircularProgress } from '@material-ui/core';

import BookPackageContentValidator from './BookPackageContentValidator';
import { clearCaches, PreLoadRepos, verifyReposForLanguages } from './core/getApi';
import RepoValidation from './RepoValidation';

// stores repo validation results for each language index by language
const languagesValidationResults: { [x: string]: any; } = {};

async function doInitialization() {
    //const username = 'unfoldingword';
    //const language_code = 'en';
    console.log("doInitialization()");
    const branch = 'master'
    await clearCaches();

    // TODO: may need to add prompting for paths, may want to remove this if language list gets too big
    verifyReposForLanguages('unfoldingword', ['TA', 'TW', 'TN', 'TQ', 'ST', 'LT'], languagesValidationResults).then(() => {
        if (!languagesValidationResults.success) {
            console.error("Repo verification error - could not find these repos:", languagesValidationResults);
        } else {
            console.log("Repo verification - all repos found");
        }
    });

    const success = await PreLoadRepos('unfoldingword', '', branch, [], true);
    if (!success) {
        console.log(`Failed to pre-load original language repos`);
    }
}

async function doLanguageInitialization(username: string,language_code: string) {
    //const username = 'unfoldingword';
    //const language_code = 'en';
    console.log("doLanguageInitialization() username, lang:", username, language_code);
    const branch = 'master'
    const success = await PreLoadRepos(username, language_code, branch, ['TA', 'TW', 'TN', 'TQ'], false, true);
    if (!success) {
        console.log(`Failed to pre-load all repos`)
    }
}

const drawerWidth = 240;
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      flexGrow: 1,
      display: 'flex',
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    appBar: {
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    },
    appBarShift: {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    },
    title: {
      flexGrow: 1,
    },
    formControl: {
      margin: theme.spacing(3),
    },
    button: {
      marginRight: theme.spacing(1),
    },
    instructions: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    hide: {
      display: 'none',
    },
    drawer: {
      width: drawerWidth,
      flexShrink: 0,
    },
    drawerPaper: {
      width: drawerWidth,
    },
    drawerHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: theme.spacing(0, 1),
      ...theme.mixins.toolbar,
      justifyContent: 'flex-end',
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      marginLeft: -drawerWidth,
    },
    contentShift: {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    },
    alignItemsAndJustifyContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    offset: {...theme.mixins.toolbar},
  }),
);

interface bpStateIF { [x: string]: boolean[]; };

function joinBookIds(state: bpStateIF ): string[] {
  const x = Object.keys(state);
  let y: string[] = [];
  for (let i=0; i<x.length; i++) {
    if ( state[x[i]][0] ) {
      y.push(books.bookIdByTitle(x[i]));
    }
  }
  return y;
}


function getSteps() {
  return ['Select Organization and Language', 'Repo Validation', 'Select Books', 'Content Validation Details'];
}

function getStepContent(step: number) {
  switch (step) {
    case 0:
      return 'Select Organization and Language';
    case 1:
      return 'Repo Validation';
    case 2:
      return 'Select books, then click Next to generate book package details';
    case 3:
      return 'Content Validation Results';
    default:
      return 'Unknown step';
  }
}

// A custom hook that builds on useLocation to parse
// the query string for you.
let queryProcessedOnce = false;
function useQuery() {
  let search = window.location.search;
  //console.log("url=",window.location.origin,window.location.pathname)
  return new URLSearchParams(search);
}

export default function App() {
  const [state, setState] = React.useState({ ...books.titlesToBoolean() });
  const [activeStep, setActiveStep] = React.useState(0);
  const [skipped, setSkipped] = React.useState(new Set<number>());
  const [org, setOrg]   = React.useState('unfoldingword');
  const [lang, setLang] = React.useState('en');
  const [repoValidation, setRepoValidation] = React.useState(<CircularProgress/>)
  React.useEffect( () => {
    if (activeStep !== 1) {return;}
    if ( languagesValidationResults.finished ) {
      setRepoValidation( <RepoValidation results={languagesValidationResults[lang].errors} /> );
    } else {
      setRepoValidation(<CircularProgress/>);
    }
  }, [lang, activeStep]); 

  /* ----------------------------------------------------------
      Prefetch the orginal languages, which are in
      org=unfoldingword and lang is ignored; since they are
      in a fixed location.
  */
  //console.log("Prefetching Original Language Repos!");
  //clearCacheAndPreloadRepos('unfoldingword', 'en', ['rut','jud'], 'master', []);

  /* ----------------------------------------------------------
      Stepper
  */
  const steps = getSteps();

  const isStepOptional = (step: number) => {
    return false;
  };

  const isStepSkipped = (step: number) => {
    return skipped.has(step);
  };


  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      // You probably want to guard against something like this,
      // it should never occur unless someone's actively trying to break something.
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep(prevActiveStep => prevActiveStep + 1);
    setSkipped(prevSkipped => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const handleNext = () => {
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }
    if ( activeStep === 0 ) {
      // time to preload cache!
        doLanguageInitialization(org, lang);
    }

    // TODO: need to add step for validation
    if ( activeStep === 0) {
        const languageValidation = languagesValidationResults[lang];
        if (languageValidation && languageValidation.finished) {
            console.log(`Validation for '${lang}' completed before going to book selection`, languageValidation);
            if (languageValidation.errors.length) {
                console.log(`missing repos for '${lang}'!`, languageValidation.errors);
            }
        } else {
            console.log(`Validation for '${lang}' did not complete before going to book selection`);
        }
    }
    setActiveStep(prevActiveStep => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  let query = useQuery();
  if ( activeStep === 0 && queryProcessedOnce === false ) {
    doInitialization();
    queryProcessedOnce = true;
    let bks   = query.get("books");
    if ( bks !== null ) {
      // user has launched the app with URL query parameters
      let barrayIds = bks.split(',');
      let barrayTitles: string[] = [];
      for ( let i=0; i < barrayIds.length; i++ ) {
        let x = books.bookTitleById(barrayIds[i]);
        if ( x === "" ) {
          alert("Invalid Book Id:"+barrayIds[i]);
          break;
        }
        barrayTitles.push(x);
      }
      for( let i=0; i < barrayTitles.length; i++) {
        let name = barrayTitles[i];
        console.log("name:",name)
        // set the state variables
        state[name][0] = true;
        state[name][1] = false;
        let b: boolean[] = [];
        b[0] = true;
        b[1] = false;
      }
      handleNext();
    }
  }


  const classes = useStyles();
  const theme = useTheme();

  /* ----------------------------------------------------------
      Menu drawer
  */
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleSelectNoneOt = () => {
    let states = books.oldTestament();
    for( let i=0; i < states.length; i++) {
      state[states[i]][0] = false;
      state[states[i]][1] = false;
      let name = states[i];
      let b: boolean[] = [];
      b[0] = false;
      b[1] = false;
      setState({ ...state, [name]: b });
    }
  };

  const handleSelectAllOt = () => {
    let states = books.oldTestament();
    for( let i=0; i < states.length; i++) {
      state[states[i]][0] = true;
      state[states[i]][1] = false;
      let name = states[i];
      let b: boolean[] = [];
      b[0] = true;
      b[1] = false;
      setState({ ...state, [name]: b });
    }
  };

  const handleSelectNoneNt = () => {
    let states = books.newTestament();
    for( let i=0; i < states.length; i++) {
      state[states[i]][0] = false;
      state[states[i]][1] = false;
      let name = states[i];
      let b: boolean[] = [];
      b[0] = false;
      b[1] = false;
      setState({ ...state, [name]: b });
    }
  };

  const handleSelectAllNt = () => {
    let states = books.newTestament();
    for( let i=0; i < states.length; i++) {
      state[states[i]][0] = true;
      state[states[i]][1] = false;
      let name = states[i];
      let b: boolean[] = [];
      b[0] = true;
      b[1] = false;
      setState({ ...state, [name]: b });
    }
  };


  /* ----------------------------------------------------------
      Form/checkbox stuff
  */
  // these are for the initial book selection
  const handleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let b: boolean[] = [];
    b[0] = event.target.checked;
    b[1] = false;
    setState({ ...state, [name]: b });
  };

  /* as of 2020-09-21:
  The languages/orgs are:
    Russian (RU)/ru_gl
    Hindi (HI)/translationCore-Create-BCS
    Kannada (KN)/translationCore-Create-BCS
    Latin-American Spanish (ES-419)/Es-419_gl
  */
  const handleOrgLangChange = () => (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = (event.target as HTMLInputElement).value;
    let org  = 'unfoldingword';
    let lang = 'en';
    if ( val === 'ru' ) {
      org  = 'ru_gl';
      lang = 'ru';
    } else if ( val === 'hi' ) {
      org  = 'translationCore-Create-BCS';
      lang = 'hi';
    } else if ( val === 'kn' ) {
      org  = 'translationCore-Create-BCS';
      lang = 'kn';
    } else if ( val === 'es-419' ) {
      org = 'Es-419_gl';
      lang = 'es-419';
    }
    setOrg(org);
    setLang(lang);
  };

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed"
          className={clsx(classes.appBar, {[classes.appBarShift]: open })}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            className={clsx(classes.menuButton, open && classes.hide)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Book Package Content Validation
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.drawerHeader}>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <Divider />
          <Typography>Nothing here to see!</Typography>
        <Divider />
      </Drawer>
      <Paper>
        <Typography> <br/> <br/> </Typography>
        <Stepper activeStep={activeStep}>
          {steps.map((label, index) => {
            const stepProps: { completed?: boolean } = {};
            const labelProps: { optional?: React.ReactNode } = {};
            if (isStepOptional(index)) {
              labelProps.optional = <Typography variant="caption">Optional</Typography>;
            }
            if (isStepSkipped(index)) {
              stepProps.completed = false;
            }
            return (
              <Step key={label} {...stepProps}>
                <StepLabel {...labelProps}>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>
        <Container>
          <div className={classes.alignItemsAndJustifyContent}>
          <Typography className={classes.instructions}>{getStepContent(activeStep)}</Typography>
          </div>

          <div className={classes.alignItemsAndJustifyContent}>
            <Button disabled={activeStep === 0} onClick={handleBack} color="primary" variant="contained" className={classes.button}>
              Back
            </Button>

            {isStepOptional(activeStep) && (
              <Button variant="contained" color="primary" onClick={handleSkip} className={classes.button}>
                Skip
              </Button>
            )}

            <Button disabled={activeStep === 3} variant="contained" color="primary" onClick={handleNext} className={classes.button}>
              Next
            </Button>

          </div>

          <div className={classes.alignItemsAndJustifyContent}>

          {(activeStep === 0) && (
              <>
              <div>
                <Paper>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Languages</FormLabel>
                    <RadioGroup aria-label="orgLang" name="orgLang" value={lang} onChange={handleOrgLangChange()}>
                      <FormControlLabel value="en" control={<Radio />} label="English (unfoldingWord)" />
                      <FormControlLabel value="ru" control={<Radio />} label="Russian (ru_gl)" />
                      <FormControlLabel value="hi" control={<Radio />} label="Hindi (translationCore-Create-BCS)" />
                      <FormControlLabel value="kn" control={<Radio />} label="Kannada (translationCore-Create-BCS)" />
                      <FormControlLabel value="es-419" control={<Radio />} label="Latin-American Spanish (Es-419_gl)" />
                    </RadioGroup>
                  </FormControl>
                </Paper>
              </div>
              </>
            )}

            {(activeStep === 1) && (
              <Paper>{repoValidation}</Paper>
            )}

            {(activeStep === 2) && (
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Paper>
                    <Typography> <br/> </Typography>
                    <div>
                    <Button onClick={handleSelectAllOt} color="primary" variant="contained" className={classes.button}>
                      Select All
                    </Button>
                    <Button onClick={handleSelectNoneOt} color="primary" variant="contained" className={classes.button}>
                      Select None
                    </Button>
                    </div>
                    <FormControl required component="fieldset" className={classes.formControl}>
                    <FormLabel component="legend">Old Testament</FormLabel>
                    <FormGroup>
                      {books.oldTestament().map(t =>
                        <FormControlLabel
                          control={<Checkbox checked={state[t][0]} onChange={handleChange(t)} value={t} />}
                          label={t} key={t}
                        />
                      )}
                    </FormGroup>
                    <FormHelperText />
                    </FormControl>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper>
                    <Typography> <br/> </Typography>
                    <div>
                    <Button onClick={handleSelectAllNt} color="primary" variant="contained" className={classes.button}>
                      Select All
                    </Button>
                    <Button onClick={handleSelectNoneNt} color="primary" variant="contained" className={classes.button}>
                      Select None
                    </Button>
                    </div>

                    <FormControl required component="fieldset" className={classes.formControl}>
                    <FormLabel component="legend">New Testament</FormLabel>
                    <FormGroup>
                      {books.newTestament().map(t =>
                        <FormControlLabel
                          control={<Checkbox checked={state[t][0]} onChange={handleChange(t)} value={t} />}
                          label={t} key={t}
                        />
                      )}
                    </FormGroup>
                    <FormHelperText />
                    </FormControl>
                  </Paper>
                </Grid>
              </Grid>
            )}


            {(activeStep === 3) && (
              <>
              <div>
                <Paper>
                {
                  joinBookIds(state).map(id =>
                    <div>
                    <Typography variant="h6" >Book Package for {books.bookTitleById(id)} </Typography>
                    <BookPackageContentValidator bookID={id} key={id} username={org} language_code={lang} />
                    </div>
                  )
                }
                </Paper>
              </div>
              </>
            )}


          </div>
        </Container>
      </Paper>
    </div>
  );
}
