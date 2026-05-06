import { calculateAngle } from '../utils/angles';

let internalStage = 'NEUTRAL';
let prevAngle = null;
let holdStartTime = null;
let holdFormFailed = false;

export default {
  id: 'birdDog',
  name: 'Bird-Dog',
  joints: {
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    leftWrist: 15,
    leftHip: 23,
    leftKnee: 25,
    leftAnkle: 27
  },
  gauges: [
    { name: 'Arm', points: ['leftHip', 'leftShoulder', 'leftElbow'], target: 160 },
    { name: 'Leg', points: ['leftShoulder', 'leftHip', 'leftKnee'], target: 155 }
  ],
  analyze(landmarks, currentStage) {
    const required = [11, 13, 15, 23, 25, 27];
    const allVisible = required.every(i => landmarks[i]?.visibility > 0.40);

    if (!allVisible) {
      return {
        stage: currentStage,
        feedback: {
          text: 'Adjust camera — make sure your full body is in frame',
          type: 'neutral'
        },
        isGoodRep: false,
        viewType: 'side',
        angles: { hip_extension: prevAngle ?? 90 }
      };
    }

    const armAngle = calculateAngle(landmarks[23], landmarks[11], landmarks[13]);
    const legAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
    const spineStability = legAngle;
    const invertedLegAngle = 180 - legAngle;
    prevAngle = invertedLegAngle;

    const trunkRotation = Math.abs(landmarks[11].y - landmarks[12].y);

    let mappedStage = internalStage === 'HOLD' ? 'DOWN' : 'UP';
    let feedback = { text: 'Extend your arm and opposite leg', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'NEUTRAL') {
      if (armAngle > 150 && legAngle > 150) {
        internalStage = 'HOLD';
        mappedStage = 'DOWN';
        holdStartTime = Date.now();
        holdFormFailed = false;
        feedback = { text: 'Hold still — keep your back flat', type: 'good' };
      }
    } else if (internalStage === 'HOLD') {
      if (spineStability < 158) {
        holdFormFailed = true;
        feedback = { text: 'Do not let your hip drop', type: 'error' };
      } else if (trunkRotation >= 0.06) {
        holdFormFailed = true;
        feedback = { text: 'Keep both shoulders level', type: 'error' };
      } else {
        feedback = { text: 'Hold still — keep your back flat', type: 'good' };
      }

      if (armAngle < 130 && legAngle < 130) {
        const holdDuration = Date.now() - holdStartTime;
        if (holdDuration >= 1500 && !holdFormFailed) {
          isGoodRep = true;
          feedback = { text: 'Rep achieved', type: 'good' };
        } else if (holdDuration < 1500) {
          feedback = { text: 'Hold for longer — aim for 2 seconds', type: 'error' };
        } else {
          feedback = { text: 'Rep discarded — maintain form during hold', type: 'error' };
        }
        internalStage = 'NEUTRAL';
        mappedStage = 'UP';
        holdStartTime = null;
        holdFormFailed = false;
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { hip_extension: invertedLegAngle }
    };
  }
};
