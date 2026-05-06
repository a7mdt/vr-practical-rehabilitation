import { calculateAngle } from '../utils/angles';

// ── Internal stage (module-scoped, survives across frames) ─────────
// Maps to App.jsx stages: CLOSED=UP, OPEN=DOWN
let internalStage = 'CLOSED';
let prevAngle = null;
let formPassed = true;

export default {
  id: 'clamshell',
  name: 'Clamshell',
  joints: {
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28
  },
  gauges: [
    { name: 'Hip Abduction', points: ['leftKnee', 'leftHip', 'rightKnee'], target: 50 }
  ],
  analyze(landmarks, currentStage) {

    if (currentStage === 'UP') {
      internalStage = 'CLOSED';
    }

    const required = [23, 24, 25, 26];
    const allVisible = required.every(i => landmarks[i]?.visibility > 0.35);

    if (!allVisible) {
      return {
        stage: currentStage,
        feedback: {
          text: 'Adjust camera — make sure your full body is in frame',
          type: 'neutral'
        },
        isGoodRep: false,
        viewType: 'side',
        angles: { hip_abduction: prevAngle ?? 160 }
      };
    }

    const hipAbductionAngle = calculateAngle(
      landmarks[25],  // leftKnee
      landmarks[23],  // leftHip
      landmarks[26]   // rightKnee
    );


    const invertedAngle = 180 - hipAbductionAngle;
    prevAngle = invertedAngle;


    let mappedStage = internalStage === 'OPEN' ? 'DOWN' : 'UP';
    let feedback = { text: 'Open your top knee toward the ceiling', type: 'neutral' };
    let isGoodRep = false;

    const feetTogether = Math.abs(landmarks[27].y - landmarks[28].y) < 0.06;
    const pelvisStable = Math.abs(landmarks[23].x - landmarks[24].x) < 0.10;

    if (!feetTogether) {
      formPassed = false;
      feedback = { text: 'Keep your feet together throughout the movement', type: 'error' };
    } else if (!pelvisStable) {
      formPassed = false;
      feedback = { text: 'Do not let your hips roll backward', type: 'error' };
    }

    if (internalStage === 'CLOSED') {
      if (hipAbductionAngle > 40) {
        internalStage = 'OPEN';
        mappedStage = 'DOWN';
        formPassed = true;
        feedback = { text: 'Target abduction achieved', type: 'good' };
      }
    } else if (internalStage === 'OPEN') {
      if (hipAbductionAngle < 25) {

        if (formPassed) {
          isGoodRep = true;
          feedback = { text: 'Clinical target achieved. Rep counted.', type: 'good' };
        } else {
          feedback = { text: 'Rep discarded — maintain position', type: 'error' };
        }
        internalStage = 'CLOSED';
        mappedStage = 'UP';
        formPassed = true;
      } else if (feetTogether && pelvisStable) {
        feedback = { text: 'Good — now lower your knee slowly', type: 'good' };
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { hip_abduction: invertedAngle }
    };
  }
};
