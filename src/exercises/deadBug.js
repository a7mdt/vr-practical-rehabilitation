import { calculateAngle } from '../utils/angles';

let internalStage = 'NEUTRAL';
let prevAngle = null;
let lumbarFailed = false;
let hipY_baseline = null;

export default {
  id: 'deadBug',
  name: 'Dead-Bug',
  joints: {
    leftShoulder: 11,
    leftElbow: 13,
    leftWrist: 15,
    leftHip: 23,
    leftKnee: 25,
    leftAnkle: 27
  },
  gauges: [
    { name: 'Arm', points: ['leftHip', 'leftShoulder', 'leftWrist'], target: 150 },
    { name: 'Leg', points: ['leftShoulder', 'leftHip', 'leftAnkle'], target: 150 }
  ],
  analyze(landmarks, currentStage) {
    if (currentStage === 'UP') {
      internalStage = 'NEUTRAL';
    }

    const required = [11, 13, 15, 23, 25, 27];
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
        angles: { lumbar_stability: prevAngle ?? 90 }
      };
    }

    const armAngle = calculateAngle(
      landmarks[23],  // leftHip
      landmarks[11],  // leftShoulder
      landmarks[15]   // leftWrist
    );

    const legAngle = calculateAngle(
      landmarks[11],  // leftShoulder
      landmarks[23],  // leftHip
      landmarks[27]   // leftAnkle
    );

    const invertedLegAngle = 180 - legAngle;
    prevAngle = invertedLegAngle;

    let mappedStage = internalStage === 'LOWER' ? 'DOWN' : 'UP';
    let feedback = { text: 'Lower your arm and opposite leg slowly', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'NEUTRAL') {

      hipY_baseline = landmarks[23].y;

      if (armAngle > 140 && legAngle > 140) {
        internalStage = 'LOWER';
        mappedStage = 'DOWN';
        lumbarFailed = false;
        feedback = { text: 'Extension achieved — keep lowering steadily', type: 'good' };
      }
    } else if (internalStage === 'LOWER') {

      if (hipY_baseline !== null) {
        const lumbarShift = Math.abs(landmarks[23].y - hipY_baseline);
        if (lumbarShift > 0.05) {
          lumbarFailed = true;
          feedback = { text: 'Keep your lower back pressed to the floor', type: 'error' };
        } else {
          feedback = { text: 'Keep lowering — breathe out steadily', type: 'good' };
        }
      }


      if (armAngle < 110 && legAngle < 110) {
        if (!lumbarFailed) {
          isGoodRep = true;
          feedback = { text: 'Clinical target achieved. Rep counted.', type: 'good' };
        } else {
          feedback = { text: 'Rep discarded — back lifted off the floor', type: 'error' };
        }
        internalStage = 'NEUTRAL';
        mappedStage = 'UP';
        lumbarFailed = false;
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { lumbar_stability: invertedLegAngle }
    };
  }
};
