let lastSpeechTime = 0;

export const speak = (text) => {
  const now = Date.now();
  if (now - lastSpeechTime < 1800) return; // Prevent spamming

  // Cancel any in-progress speech so the latest cue takes priority
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.05; // Slightly faster for clinical cues
  window.speechSynthesis.speak(utterance);
  lastSpeechTime = now;
};
