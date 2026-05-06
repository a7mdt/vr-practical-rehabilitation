import { calculateAngle } from '../utils/angles';

export default {
  id: 'anklePump',
  name: 'Ankle Pump',
  joints: {
    leftKnee: 25,
    leftAnkle: 27,
    leftFootIndex: 31,
    rightKnee: 26,
    rightAnkle: 28,
    rightFootIndex: 32
  },
  gauges: [
    { name: 'Ankle', points: ['knee', 'ankle', 'footIndex'], target: 130 }
  ],
  analyze(landmarks, stage) {
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const leftFootIndex = landmarks[31];

    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    const rightFootIndex = landmarks[32];

    // Pick the more visible side
    const leftVis = Math.min(leftKnee.visibility, leftAnkle.visibility, leftFootIndex.visibility);
    const rightVis = Math.min(rightKnee.visibility, rightAnkle.visibility, rightFootIndex.visibility);
    const useRight = rightVis > leftVis;

    const knee = useRight ? rightKnee : leftKnee;
    const ankle = useRight ? rightAnkle : leftAnkle;
    const footIndex = useRight ? rightFootIndex : leftFootIndex;

    if (Math.max(leftVis, rightVis) < 0.5) {
      return {
        stage,
        feedback: { text: 'Keep foot in view — position camera to the side', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: null
      };
    }

    const ankleAngle = calculateAngle(knee, ankle, footIndex);

    let nextStage = stage;
    let feedback = { text: 'Pull toes up toward your shin', type: 'neutral' };
    let isGoodRep = false;

    // Dorsiflexion: toes pulled toward shin — angle drops below 150° when lying
    if (ankleAngle < 150) {
      if (stage === 'UP') {
        feedback = { text: 'Good — now point your toes away', type: 'good' };
        nextStage = 'DOWN';
      }
    }

    // Plantarflexion / neutral return — angle rises back above 155°
    if (ankleAngle > 155) {
      if (stage === 'DOWN') {
        isGoodRep = true;
        feedback = { text: 'Full cycle complete!', type: 'good' };
      }
      nextStage = 'UP';
    }

    return {
      stage: nextStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { ankle: ankleAngle }
    };
  }
};
