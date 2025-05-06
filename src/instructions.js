import './css/landingpages.css';
const button = document.getElementById('instructions-button');

const storedChoices = localStorage.getItem('storedChoices');
let studyChoices;

if (storedChoices) {
  studyChoices = JSON.parse(storedChoices);
} else {
  console.error('No data found in local storage');
}

// get and store id

studyChoices.ID = studyChoices?.ID ?? 'testID';
studyChoices.webcam = studyChoices?.webcam ?? false;

// define what happens on button click
const handleContinueClick = (event) => {
  event.preventDefault();
  // save the choices to local storage
  localStorage.setItem('storedChoices', JSON.stringify(studyChoices));
  window.location.href = `./orev.html`;
};

const handleWebcamClick = (event) => {
  event.preventDefault();
};

button.addEventListener('click', handleContinueClick, {
  capture: false,
});

button.addEventListener('click', handleWebcamClick, {
  capture: false,
});
