import './css/landingpages.css';
const button = document.getElementById('instructions-button');

// Check if the URL contains any parameters
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.toString()) {
  // If there are URL parameters, save them in an object
  const storedChoices = {};
  urlParams.forEach((value, key) => {
    storedChoices[key] = value;
  });

  // Save the object to localStorage for persistence
  localStorage.setItem('storedChoices', JSON.stringify(storedChoices));

  // Hide the URL parameter after saving it in local storage
  window.history.replaceState(null, document.title, window.location.pathname);
} else {
  console.log('No URL parameters found.');
}

const storedChoices = localStorage.getItem('storedChoices');
let studyChoices;

// If we find data in local storage, set studyChoices to that data
if (storedChoices) {
  studyChoices = JSON.parse(storedChoices);
} else {
  console.log('No data found in local storage. Setting default values.');
}

// get and store parameters. If local storage is empty, set default values
studyChoices.subjID = studyChoices?.subjID ?? 'testID';
studyChoices.webcam = studyChoices?.webcam ?? false;
studyChoices.saving = studyChoices?.saving ?? 'download';

// define what happens on button click
const handleContinueClick = (event) => {
  event.preventDefault();
  // save the choices to local storage
  localStorage.setItem('storedChoices', JSON.stringify(studyChoices));
  window.location.href = `./orev.html`;
};

button.addEventListener('click', handleContinueClick, {
  capture: false,
});
