import { calculateAngle } from '../utils/angles';

let _flatBaseline = null;
let _raisedMin    = null;

const RAISE_DELTA = 12;
const LOWER_DELTA = 8;

export default {
  id: 'straightLegRaise',
  name: 'Straight Leg Raise',
  joints: {
    leftHip:   23,
    leftKnee:  25,
    rightHip:  24,
    rightKnee: 26
  },
  gauges: [
    { name: 'Hip', points: ['refHip', 'hip', 'knee'], target: 135 }
  ],

  reset() {
    _flatBaseline = null;
    _raisedMin    = null;
  },

  analyze(landmarks, stage) {
    const leftHip   = landmarks[23];
    const leftKnee  = landmarks[25];
    const rightHip  = landmarks[24];
    const rightKnee = landmarks[26];

    // Use hip + knee visibility only — shoulder is often out of frame when lying
    const leftVis  = Math.min(leftHip.visibility,  leftKnee.visibility);
    const rightVis = Math.min(rightHip.visibility, rightKnee.visibility);

    if (Math.max(leftVis, rightVis) < 0.5) {
      return {
        stage,
        feedback: { text: 'Keep leg and hip in view — position camera to the side', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: null
      };
    }

    // Reference = opposite hip (forms the pelvis baseline, always in frame)
    // Angle: oppositeHip → raisedHip → raisedKnee ≈ 180° flat, ~135° at 45° raise
    const useRight = rightVis > leftVis;
    const refHip   = useRight ? leftHip   : rightHip;
    const hip      = useRight ? rightHip  : leftHip;
    const knee     = useRight ? rightKnee : leftKnee;

    // Also verify opposite hip is visible for the angle reference
    if (refHip.visibility < 0.4) {
      return {
        stage,
        feedback: { text: 'Keep both hips in view — position camera to the side', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: null
      };
    }

    const hipAngle     = calculateAngle(refHip, hip, knee);
    const currentStage = stage || 'UP';

    let nextStage = currentStage;
    let feedback  = { text: 'Keep leg straight — raise toward the ceiling', type: 'neutral' };
    let isGoodRep = false;

    if (currentStage === 'UP') {
      // Track the maximum (flattest) angle seen at rest as the baseline
      if (_flatBaseline === null) {
        _flatBaseline = hipAngle;
      } else if (hipAngle > _flatBaseline) {
        _flatBaseline = _flatBaseline * 0.8 + hipAngle * 0.2;
      }

      // Raise detected: angle dropped RAISE_DELTA° below resting baseline
      if (_flatBaseline !== null && hipAngle < _flatBaseline - RAISE_DELTA) {
        _raisedMin = hipAngle;
        nextStage  = 'DOWN';
        feedback   = { text: 'Good height! Now lower slowly and under control', type: 'good' };
      }
    } else {
      // Track peak lift (minimum angle) during the raise phase
      if (_raisedMin === null || hipAngle < _raisedMin) {
        _raisedMin = hipAngle;
      }

      // Return detected: angle climbed back to within LOWER_DELTA° of baseline
      if (_flatBaseline !== null && hipAngle > _flatBaseline - LOWER_DELTA) {
        isGoodRep  = true;
        _raisedMin = null;
        nextStage  = 'UP';
        feedback   = { text: 'Rep complete — raise again', type: 'good' };
      } else {
        feedback = { text: 'Hold — then lower slowly', type: 'good' };
      }
    }

    return {
      stage: nextStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { hip: hipAngle }
    };
  }
};
