import { calculateAngle } from '../utils/angles';

let internalStage = 'NEUTRAL';
let prevAngle = null;
let lumbarFailed = false;
let hipY_baseline = null;
let lastResetId = null;

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
    // Reset internal state when exercise restarts (stage externally set to UP)
    // Only reset once to avoid fighting with the App's state management
    if (currentStage === 'UP' && internalStage !== 'NEUTRAL') {
      if (lastResetId !== currentStage) {
        internalStage = 'NEUTRAL';
        lumbarFailed = false;
        hipY_baseline = null;
        lastResetId = currentStage;
      }
    }

    const required = [11, 13, 15, 23, 25, 27];
    const allVisible = required.every(i => landmarks[i]?.visibility > 0.3);

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

    // Hip-Shoulder-Wrist: measures arm extension away from torso
    const armAngle = calculateAngle(
      landmarks[23],  // leftHip
      landmarks[11],  // leftShoulder
      landmarks[15]   // leftWrist
    );

    // Shoulder-Hip-Ankle: measures leg extension away from torso
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
      // Capture the hip baseline for lumbar stability tracking
      hipY_baseline = landmarks[23].y;

      // Enter LOWER when arm and leg are extended away from body
      // Relaxed from 140° to 120° — Dead Bug starts with limbs up, and extending
      // them away from center produces larger angles at shoulder/hip
      if (armAngle > 120 && legAngle > 120) {
        internalStage = 'LOWER';
        mappedStage = 'DOWN';
        lumbarFailed = false;
        lastResetId = null;
        feedback = { text: 'Extension achieved — keep lowering steadily', type: 'good' };
      }
    } else if (internalStage === 'LOWER') {
      // Lumbar stability check: hip shouldn't shift vertically
      // Relaxed from 0.05 to 0.07 to tolerate minor camera/body sway
      if (hipY_baseline !== null) {
        const lumbarShift = Math.abs(landmarks[23].y - hipY_baseline);
        if (lumbarShift > 0.07) {
          lumbarFailed = true;
          feedback = { text: 'Keep your lower back pressed to the floor', type: 'error' };
        } else {
          feedback = { text: 'Keep lowering — breathe out steadily', type: 'good' };
        }
      }

      // Rep completes when limbs return toward center (angles decrease)
      // Relaxed from <110 to <100 for arm and <115 for leg
      if (armAngle < 100 && legAngle < 115) {
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
