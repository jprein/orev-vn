/**
 * Mixes the microphone track with the study's stimulus <audio> elements
 * into a single clean audio track, so the recorded video always has both
 * the participant's/child's voice AND the prompt word being played,
 * clearly audible and in sync - instead of relying on the mic picking up
 * the prompt audio off the speakers.
 */

let audioContext = null;
let destinationNode = null; // MediaStreamAudioDestinationNode - the recording mix bus
let micSourceNode = null;
const connectedElements = new WeakSet(); // guards createMediaElementSource being called twice on the same element

/**
 * Set up the shared AudioContext + mix bus and route the microphone
 * track from an existing camera/mic MediaStream into it.
 *
 * @param {MediaStream} camStream - Stream returned by initMedia().
 */
export function initAudioMixer(camStream) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    console.warn('Web Audio API is not supported in this browser.');
    return;
  }

  audioContext = new AudioContextCtor();
  destinationNode = audioContext.createMediaStreamDestination();

  const micTrack = camStream && camStream.getAudioTracks()[0];
  if (micTrack) {
    micSourceNode = audioContext.createMediaStreamSource(new MediaStream([micTrack]));
    // Connect to the recording bus only - NOT to audioContext.destination,
    // otherwise the mic would feed back out of the speakers.
    micSourceNode.connect(destinationNode);
  }

  // Best-effort: browsers may keep the context suspended until a user
  // gesture happens (see resumeAudioMixer()).
  resumeAudioMixer();
}

/**
 * Route each stimulus <audio> element's output into the recording mix bus,
 * while keeping it audible through the speakers exactly as before.
 *
 * @param {HTMLCollectionOf<HTMLAudioElement>|HTMLAudioElement[]} audioElements
 */
export function connectPromptAudioElements(audioElements) {
  if (!audioContext || !destinationNode) {
    console.warn('connectPromptAudioElements() called before initAudioMixer().');
    return;
  }

  Array.from(audioElements).forEach((el) => {
    if (connectedElements.has(el)) return;

    try {
      const sourceNode = audioContext.createMediaElementSource(el);
      sourceNode.connect(destinationNode); // into the recording
      sourceNode.connect(audioContext.destination); // keep audible through speakers
      connectedElements.add(el);
    } catch (err) {
      console.error('Failed to connect audio element to mixer:', el, err);
    }
  });
}

/**
 * @returns {MediaStreamTrack|null} The mixed (mic + prompts) audio track, for
 *   building the final stream passed into startRecording().
 */
export function getMixedAudioTrack() {
  return destinationNode ? destinationNode.stream.getAudioTracks()[0] || null : null;
}

/**
 * Resume the shared AudioContext if it's suspended (e.g. blocked by the
 * browser's autoplay/gesture policy). Safe to call speculatively and more
 * than once.
 */
export async function resumeAudioMixer() {
  if (audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (err) {
      console.warn('Could not resume AudioContext yet:', err);
    }
  }
}

/**
 * Disconnect all nodes and close the AudioContext. Call once the study/
 * recording is finished.
 */
export function closeAudioMixer() {
  try {
    if (micSourceNode) micSourceNode.disconnect();
  } catch (err) {
    /* already disconnected, ignore */
  }

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch((err) => console.warn('Error closing AudioContext:', err));
  }

  audioContext = null;
  destinationNode = null;
  micSourceNode = null;
}
