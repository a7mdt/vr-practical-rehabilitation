import { calculateAngle } from '../utils/angles';

// Module-level adaptive state — persists across analyze() calls
let _restBaseline = null;   // tracks the patient's actual resting angle dynamically
let _extendPeak = null;     // tracks peak angle during contraction phase

const CONTRACT_DELTA = 2.5; // degrees above resting baseline to detect contraction
const RELEASE_DELTA = 2.0;  // degrees below peak to detect relaxation

export default {
  id: 'quadSets',
  name: 'Quad Sets',

  reset() {
    _restBaseline = null;
    _extendPeak   = null;
  },
  joints: {
    leftHip: 23,
    leftKnee: 25,
    leftAnkle: 27,
    rightHip: 24,
    rightKnee: 26,
    rightAnkle: 28
  },
  gauges: [
    { name: 'Knee', points: ['hip', 'knee', 'ankle'], target: 172 }
  ],
  analyze(landmarks, stage) {
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];

    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    const leftVis = Math.min(leftHip.visibility, leftKnee.visibility, leftAnkle.visibility);
    const rightVis = Math.min(rightHip.visibility, rightKnee.visibility, rightAnkle.visibility);
    const useRight = rightVis > leftVis;

    const hip = useRight ? rightHip : leftHip;
    const knee = useRight ? rightKnee : leftKnee;
    const ankle = useRight ? rightAnkle : leftAnkle;

    if (Math.max(leftVis, rightVis) < 0.5) {
      return {
        stage,
        feedback: { text: 'Keep leg in view — position camera to the side', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: null
      };
    }

    const kneeAngle = calculateAngle(hip, knee, ankle);
    const currentStage = stage || 'UP';

    let nextStage = currentStage;
    let feedback = { text: 'Tighten your thigh — press knee toward the floor', type: 'neutral' };
    let isGoodRep = false;

    if (currentStage === 'UP') {
      // Continuously update resting baseline as the minimum angle seen at rest,
      // with slow upward drift so it adapts if the patient shifts position
      if (_restBaseline === null) {
        _restBaseline = kneeAngle;
      } else if (kneeAngle < _restBaseline) {
        _restBaseline = kneeAngle;
      } else {
        // Drift up slowly (~1.5°/sec at 30fps) to follow patient's resting position
        _restBaseline = Math.min(_restBaseline + 0.05, kneeAngle);
      }

      // Contraction detected: angle rose CONTRACT_DELTA above the resting baseline
      if (kneeAngle >= _restBaseline + CONTRACT_DELTA) {
        isGoodRep = true;
        _extendPeak = kneeAngle;
        nextStage = 'DOWN';
        feedback = { text: 'Good squeeze! Hold the contraction', type: 'good' };
      }
    } else {
      // Track the peak extension angle during contraction
      if (_extendPeak === null || kneeAngle > _extendPeak) {
        _extendPeak = kneeAngle;
      }

      // Relaxation detected: angle dropped RELEASE_DELTA below the peak
      if (_extendPeak !== null && kneeAngle <= _extendPeak - RELEASE_DELTA) {
        _extendPeak = null;
        _restBaseline = kneeAngle; // re-seed baseline from current relaxed angle
        nextStage = 'UP';
        feedback = { text: 'Relax — prepare for next squeeze', type: 'neutral' };
      } else {
        feedback = { text: 'Good squeeze! Hold the contraction', type: 'good' };
      }
    }

    return {
      stage: nextStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { knee: kneeAngle }
    };
  }
};
