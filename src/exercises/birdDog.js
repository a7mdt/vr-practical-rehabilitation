import { calculateAngle } from '../utils/angles';

let internalStage = 'NEUTRAL';
let prevAngle = null;
let holdStartTime = null;
let holdFormFailed = false;
let lastResetId = null;

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
    // Reset internal state when exercise restarts
    if (currentStage === 'UP' && internalStage !== 'NEUTRAL') {
      if (lastResetId !== currentStage) {
        internalStage = 'NEUTRAL';
        holdFormFailed = false;
        holdStartTime = null;
        lastResetId = currentStage;
      }
    }

    const required = [11, 12, 13, 15, 23, 25, 27];
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
        angles: { hip_extension: prevAngle ?? 90 }
      };
    }

    // Hip-Shoulder-Elbow angle: measures arm extension relative to torso
    const armAngle = calculateAngle(landmarks[23], landmarks[11], landmarks[13]);
    // Shoulder-Hip-Knee angle: measures leg extension relative to torso
    const legAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);

    const invertedLegAngle = 180 - legAngle;
    prevAngle = invertedLegAngle;

    // Trunk rotation check — shoulder height difference in normalized coords
    const trunkRotation = Math.abs(landmarks[11].y - landmarks[12].y);

    let mappedStage = internalStage === 'HOLD' ? 'DOWN' : 'UP';
    let feedback = { text: 'Extend your arm and opposite leg', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'NEUTRAL') {
      // Enter HOLD when both arm and leg are extended
      // Relaxed thresholds: arm > 130° and leg > 130° (was 150 — too strict)
      if (armAngle > 130 && legAngle > 130) {
        internalStage = 'HOLD';
        mappedStage = 'DOWN';
        holdStartTime = Date.now();
        holdFormFailed = false;
        lastResetId = null;
        feedback = { text: 'Hold still — keep your back flat', type: 'good' };
      }
    } else if (internalStage === 'HOLD') {
      // Form checks during hold phase — relaxed to avoid false negatives
      // Spine stability: leg angle should stay above 140° during hold (was 158 — too strict)
      if (legAngle < 140) {
        holdFormFailed = true;
        feedback = { text: 'Do not let your hip drop', type: 'error' };
      } else if (trunkRotation >= 0.08) {
        // Trunk rotation: relaxed from 0.06 to 0.08 to tolerate normal body asymmetry
        holdFormFailed = true;
        feedback = { text: 'Keep both shoulders level', type: 'error' };
      } else {
        feedback = { text: 'Hold still — keep your back flat', type: 'good' };
      }

      // Return to NEUTRAL when both arm and leg come back down
      // Relaxed from <130 to <120 so it's easier to complete the rep cycle
      if (armAngle < 120 && legAngle < 120) {
        const holdDuration = Date.now() - holdStartTime;
        // Reduced hold requirement from 1500ms to 800ms — still clinically meaningful
        if (holdDuration >= 800 && !holdFormFailed) {
          isGoodRep = true;
          feedback = { text: 'Rep achieved', type: 'good' };
        } else if (holdDuration < 800) {
          feedback = { text: 'Hold for longer — aim for 1-2 seconds', type: 'error' };
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
