import { calculateAngle } from '../utils/angles';

let internalStage = 'HANG';
let hasSwungForward = false;
let hasSwungBackward = false;
let elbowFailed = false;

export default {
  id: 'pendulum',
  name: 'Pendulum',
  joints: {
    leftShoulder: 11,
    leftElbow: 13,
    leftWrist: 15,
    leftHip: 23,
    leftKnee: 25
  },
  gauges: [
    { name: 'Arm Swing', points: ['leftHip', 'leftShoulder', 'leftElbow'], target: 55 }
  ],
  analyze(landmarks, currentStage) {
    const hipHingeAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);

    if (hipHingeAngle >= 120) {
      return {
        stage: currentStage,
        feedback: { text: 'Lean forward and let your arm hang freely', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: { shoulder_swing: 90 }
      };
    }

    const armAngle = calculateAngle(landmarks[23], landmarks[11], landmarks[13]);
    const elbowAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);

    let mappedStage = internalStage === 'HANG' ? 'UP' : 'DOWN';
    let feedback = { text: 'Let your arm swing forward and backward', type: 'neutral' };
    let isGoodRep = false;

    if (elbowAngle < 150) {
      elbowFailed = true;
      feedback = { text: 'Relax your arm — let it hang straight', type: 'error' };
    }

    if (internalStage === 'HANG') {
      if (armAngle < 70) {
        internalStage = 'FORWARD';
        mappedStage = 'DOWN';
        hasSwungForward = true;
        feedback = { text: 'Good — now swing your arm backward', type: 'good' };
      } else if (hasSwungForward && armAngle > 110) {
        internalStage = 'BACK';
        mappedStage = 'DOWN';
        hasSwungBackward = true;
        feedback = { text: 'Good — return to center', type: 'good' };
      }
    } else if (internalStage === 'FORWARD') {
      if (armAngle > 80) {
        internalStage = 'HANG';
        mappedStage = 'UP';
        feedback = { text: 'Good — now swing your arm backward', type: 'good' };
      }
    } else if (internalStage === 'BACK') {
      if (armAngle < 100) {
        if (hasSwungForward && hasSwungBackward && !elbowFailed) {
          isGoodRep = true;
          feedback = { text: 'Rep achieved', type: 'good' };
        }
        internalStage = 'HANG';
        mappedStage = 'UP';
        hasSwungForward = false;
        hasSwungBackward = false;
        elbowFailed = false;
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { shoulder_swing: armAngle }
    };
  }
};
