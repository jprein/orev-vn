import './css/orev.css';
import * as DetectRTC from 'detectrtc';

import { downloadData } from './js/downloadData.js';
import { downloadVideo } from './js/downloadVideo.js';
import { uploadData } from './js/uploadData.js';
import { uploadVideo } from './js/uploadVideo.js';
import { pause } from './js/pause.js';
// import { hideURLparams } from './js/hideURLparams.js';
import { openFullscreen } from './js/openFullscreen.js';
import { checkForTouchscreen } from './js/checkForTouchscreen.js';
// import { randomizeNewTrials } from './js/randomizeNewTrials.js';
import {
  isMediaRecorderSupported,
  initMedia,
  startRecording,
  stopRecording,
} from './js/mediaRecorderServices.js';

const storedChoices = localStorage.getItem('storedChoices');
let studyChoices;

if (storedChoices) {
  studyChoices = JSON.parse(storedChoices);
} else {
  console.error('No data found in local storage');
}

document.addEventListener('DOMContentLoaded', function () {
  const devmode = false;

  //------------------------------------------------------------------
  // automatically add running trial numbers as ids to html
  //------------------------------------------------------------------
  const trialDivs = document.querySelectorAll('.trials');

  // Iterate over trial divs and set their IDs
  trialDivs.forEach((div, index) => {
    div.id = `trial${index}`;
  });

  //------------------------------------------------------------------
  // create object to save data
  //------------------------------------------------------------------
  const responseLog = {
    // get ID out of URL parameter
    meta: {
      subjID: studyChoices?.subjID || 'testID',
      order: window.location.pathname.split('/').pop().replace('.html', ''),
      touchscreen: checkForTouchscreen(),
      webcam: studyChoices?.webcam || 'false',
      //saving: studyChoices?.saving || 'download',
    },
    data: [],
  };

  // hide url parameters
  // hideURLparams();

  //------------------------------------------------------------------
  // log user testing setup
  //------------------------------------------------------------------
  DetectRTC.load(() => {
    responseLog.meta.os = DetectRTC.osName;
    responseLog.meta.browser = DetectRTC.browser.name;
    responseLog.meta.browserVersion = JSON.stringify(DetectRTC.browser.version);
    responseLog.meta.safari = DetectRTC.browser.isSafari || false;
    responseLog.meta.iOSSafari =
      responseLog.meta.touchscreen && responseLog.meta.safari;

    if (devmode) console.log(responseLog.meta);
  });

  //------------------------------------------------------------------
  // study variables
  //------------------------------------------------------------------
  let trialNr = 0;
  let t0 = 0;
  let t1 = 0;

  //------------------------------------------------------------------
  // get relevant elements
  //------------------------------------------------------------------
  const allAudios = document.getElementsByTagName('audio');
  const betweenTrials = document.getElementById('between-trials');
  const button = document.getElementById('orev-button');
  const speaker = document.getElementById('speaker');
  const headingFullscreen = document.getElementById('heading-fullscreen');
  const headingTestsound = document.getElementById('heading-testsound');

  //------------------------------------------------------------------
  // define response click
  //------------------------------------------------------------------
  const handleResponseClick = async (event) => {
    event.preventDefault();

    t1 = new Date().getTime();

    const currentTrial = document.getElementById(`trial${trialNr - 1}`);
    const currentImages = Array.from(currentTrial.getElementsByTagName('img'));
    currentImages.forEach((img) => {
      img.style.border = '0.3vw solid black';
    });

    event.target.style.border = '0.3vw solid blue';

    // save response
    // trial - 2 since array starts at zero (-1) and continue click already advanced trial count (-1)
    responseLog.data[trialNr - 2] = {
      timestamp: new Date(parseInt(t1)).toISOString(),
      responseTime: t1 - t0,
      trial: trialNr - 1,
      // split('/').pop(): splits string at / and keeps only last element
      // then remove N_ and .jpg
      targetWord: allAudios[trialNr - 1].src
        .split('/')
        .pop()
        .replace('N_', '')
        .replace('V_', '')
        .replace('zm_', '')
        .replace('.mp3', ''),
      chosenWord: event.target.src
        .split('/')
        .pop()
        .replace('N_', '')
        .replace('V_', '')
        .replace('.jpeg', '')
        .replace('.png', ''),
      chosenCategory: event.target.dataset.wordCategory,
      chosenPosition: event.target.classList[0],
      wordClass: allAudios[trialNr - 1].src.split('/').pop().startsWith('N_')
        ? 'noun'
        : allAudios[trialNr - 1].src.split('/').pop().startsWith('V_')
        ? 'verb'
        : 'unknown',
    };

    button.addEventListener('click', handleContinueClick, {
      capture: false,
      once: true,
    });
  };

  //------------------------------------------------------------------
  // define continue click
  //------------------------------------------------------------------
  const handleContinueClick = async (event) => {
    event.preventDefault();

    if (devmode) {
      console.log('trialNr', trialNr);
      console.log(allAudios[trialNr]);
      console.log(responseLog);
    }

    // enable fullscreen and have short break, before first trial starts
    if (trialNr === 0) {
      if (!devmode & !responseLog.meta.iOSSafari) openFullscreen();
      headingFullscreen.style.display = 'none';
      headingTestsound.style.display = 'inline';
      speaker.setAttribute('visibility', 'visible');
      await pause(1000);
      // for safari, first sound needs to happen on user interaction
      allAudios[trialNr].play();

      await pause(1000);

      button.addEventListener('click', handleContinueClick, {
        capture: false,
        once: true,
      });
    }

    // end of trials
    if (trialNr === trialDivs.length) {
      studyChoices.ID = responseLog.meta.subjID;
      // Show fullscreen overlay (spinner
      const overlay = document.querySelector('#uploadOverlay');
      overlay.classList.remove('hidden');
      try {
        await stopRecording();
      } catch (e) {
        console.warn('Failed to stop recording, continuing anyway:', e);
      }

      try {
        await downloadData(responseLog.data, responseLog.meta.subjID);
        await uploadData(responseLog.data, responseLog.meta.subjID);
        await pause(2000);
      } catch (err) {
        console.error('Error during uploading processing:', err);
      }
      try {
        if (responseLog.meta.webcam === 'true') {
          // !responseLog.meta.iOSSafari &&
          await downloadVideo(responseLog.meta.webcam, responseLog.meta.subjID);
          await uploadVideo(responseLog.meta.webcam, responseLog.meta.subjID);
          await pause(5000);
        }
      } catch (err) {
        console.error('Error during uploading processing:', err);
      }
      overlay.classList.add('hidden');
      window.location.href = './goodbye.html';

    }

    // hide last Trial, show background (empty pictures) instead
    if (trialNr > 0) {
      headingTestsound.style.display = 'none';
      // pause audio (that might be playing if speaker item was clicked and prompt was repeated)
      allAudios[trialNr - 1].pause();
      allAudios[trialNr - 1].currentTime = 0;
      const lastTrial = document.getElementById(`trial${trialNr - 1}`);
      lastTrial.style.display = 'none';

      betweenTrials.style.display = 'flex';

      await pause(150);

      // play audio of current trial
      allAudios[trialNr].play();

      await pause(0);

      // save response time start point
      t0 = new Date().getTime();

      betweenTrials.style.display = 'none';

      const currentTrial = document.getElementById(`trial${trialNr}`);
      currentTrial.style.display = 'flex';

      const currentImages = Array.from(
        currentTrial.getElementsByTagName('img'),
      );

      allAudios[trialNr].onended = () => {
        currentImages.forEach((img) => {
          img.addEventListener('click', handleResponseClick, {
            capture: false,
            once: false,
          });
        });
      };
    }
    trialNr++;
  };

  //------------------------------------------------------------------
  // define speaker click
  //------------------------------------------------------------------
  const handleSpeakerClick = async (event) => {
    event.preventDefault();
    // use trial - 1 since the trial count already went up in the continue click function
    // pause audio
    if (trialNr > 1) {
      allAudios[trialNr - 1].pause();
      allAudios[trialNr - 1].currentTime = 0;
    }

    // play audio of current trial
    allAudios[trialNr - 1].play();
  };

  //------------------------------------------------------------------
  // add eventListeners
  //------------------------------------------------------------------
  button.addEventListener('click', handleContinueClick, {
    capture: false,
    once: true,
  });

  speaker.addEventListener('click', handleSpeakerClick, {
    capture: false,
    once: false,
  });

  // ---------------------------------------------------------------------------------------------------------------------
  // START TRIALS
  // ---------------------------------------------------------------------------------------------------------------------
  // browser takes time for webcam permission
  const startTrials = async () => {
    await pause(500);

    // ---------------------------------------------------------------------------------------------------------------------
    // FOR DEMO: Conditional Recording (only if not iOS Safari)
    // ---------------------------------------------------------------------------------------------------------------------
    if (responseLog.meta.webcam === 'true') {
      // !responseLog.meta.iOSSafari &&
      if (!isMediaRecorderSupported()) {
        console.log('MediaRecorder is not supported in this browser.');
      } else if (responseLog.meta.webcam === 'true') {
        try {
          console.log('Requesting camera/microphone...');
          await initMedia({
            audio: true,
            video: {
              frameRate: { min: 1, ideal: 5, max: 10 },
              width: { min: 640, ideal: 640, max: 640 }, // keep it small
              height: { min: 480, ideal: 480, max: 480 },
              facingMode: 'user',
            },
          });
          console.log('Camera ready. You can start recording.');

          startRecording();
          console.log('Recording started.');
        } catch (error) {
          console.error('Failed to access camera/microphone:', error);
        }
      }
    }
    await pause(2500);

    button.style.display = 'inline';
    button.disabled = false;
  };
  startTrials();

  //------------------------------------------------------------------
  // randomize new words
  //------------------------------------------------------------------
  // console.log(randomizeNewTrials());
});
