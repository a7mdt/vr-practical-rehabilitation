import { calculateAngle } from '../utils/angles';

let internalStage = 'NEUTRAL';
let hasFlexed = false;
let formPassed = true;

export default {
  id: 'catCamel',
  name: 'Cat-Camel',
  joints: {
    leftShoulder: 11,
    leftWrist: 15,
    leftHip: 23,
    leftKnee: 25
  },
  gauges: [
    { name: 'Spine', points: ['leftShoulder', 'leftHip', 'leftKnee'], target: 155 }
  ],
  analyze(landmarks, currentStage) {
    if (currentStage === 'UP') {
      internalStage = 'NEUTRAL';
      hasFlexed = false;
      formPassed = true;
    }


    const shoulder = landmarks[11];
    const hip = landmarks[23];
    const knee = landmarks[25];

    if (shoulder.visibility < 0.5 || hip.visibility < 0.5 || knee.visibility < 0.5) {
      return {
        stage: currentStage,
        feedback: { text: 'Keep your full body in view', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: { spine: 165 }
      };
    }

    const spineAngle = calculateAngle(
      landmarks[11],  // leftShoulder
      landmarks[23],  // leftHip
      landmarks[25]   // leftKnee
    );


    let mappedStage = internalStage === 'NEUTRAL' ? 'UP' : 'DOWN';
    let feedback = { text: 'Round your spine up toward the ceiling', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'NEUTRAL') {
      if (spineAngle < 155) {
        internalStage = 'FLEX';
        mappedStage = 'DOWN';
        hasFlexed = true;
        formPassed = true;
        feedback = { text: 'Flexion achieved — now arch your spine down', type: 'good' };
      }
    } else if (internalStage === 'FLEX') {
      if (spineAngle > 175) {
        internalStage = 'EXTEND';
        feedback = { text: 'Extension achieved — return to neutral slowly', type: 'good' };
      } else {
        feedback = { text: 'Keep rounding — push your spine higher', type: 'good' };
      }
    } else if (internalStage === 'EXTEND') {
      if (spineAngle >= 158 && spineAngle <= 172) {
        const wristDrift = Math.abs(landmarks[15].x - landmarks[11].x);
        if (wristDrift >= 0.18) {
          formPassed = false;
          feedback = { text: 'Keep your hands directly under your shoulders', type: 'error' };
        }

        if (hasFlexed) {
          if (formPassed) {
            isGoodRep = true;
            feedback = { text: 'Full cycle achieved. Rep counted.', type: 'good' };
          } else {
            feedback = { text: 'Rep discarded — hand position drifted', type: 'error' };
          }
        } else {
          feedback = { text: 'Rep discarded — complete Cat phase first', type: 'error' };
        }

        internalStage = 'NEUTRAL';
        mappedStage = 'UP';
        hasFlexed = false;
        formPassed = true;
      } else {
        feedback = { text: 'Hold the arch, then return to neutral slowly', type: 'good' };
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { spine: spineAngle }
    };
  }
};
