import { calculateAngle } from '../utils/angles';

let internalStage = 'FLAT';
let prevAngle = null;
let formFailed = false;
let holdStartTime = null;

export default {
  id: 'bridge',
  name: 'Bridge',
  joints: {
    leftShoulder: 11,
    leftHip: 23,
    leftKnee: 25,
    leftAnkle: 27
  },
  gauges: [
    { name: 'Hip', points: ['leftShoulder', 'leftHip', 'leftKnee'], target: 160 }
  ],
  analyze(landmarks, currentStage) {
    const required = [11, 23, 25, 27];
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
        angles: { hip_bridge: prevAngle ?? 85 }
      };
    }

    const hipBridgeAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
    const kneeAlignAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
    const invertedAngle = 180 - hipBridgeAngle;
    prevAngle = invertedAngle;

    let mappedStage = internalStage === 'BRIDGE' ? 'DOWN' : 'UP';
    let feedback = { text: 'Press your feet into the floor and lift your hips', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'FLAT') {
      if (hipBridgeAngle > 140) {
        internalStage = 'BRIDGE';
        mappedStage = 'DOWN';
        holdStartTime = Date.now();
        formFailed = false;
        feedback = { text: 'Hold at the top — squeeze your glutes', type: 'good' };
      }
    } else if (internalStage === 'BRIDGE') {
      if (kneeAlignAngle < 80 || kneeAlignAngle > 100) {
        formFailed = true;
        feedback = { text: 'Keep your knees aligned over your ankles', type: 'error' };
      } else {
        feedback = { text: 'Hold at the top — squeeze your glutes', type: 'good' };
      }

      if (hipBridgeAngle < 110) {
        if (!formFailed) {
          isGoodRep = true;
          feedback = { text: 'Rep achieved', type: 'good' };
        } else {
          feedback = { text: 'Rep discarded — keep knees aligned', type: 'error' };
        }
        internalStage = 'FLAT';
        mappedStage = 'UP';
        holdStartTime = null;
        formFailed = false;
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'side',
      angles: { hip_bridge: invertedAngle }
    };
  }
};
