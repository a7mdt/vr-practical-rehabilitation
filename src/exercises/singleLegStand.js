import { calculateAngle } from '../utils/angles';
let internalStage = 'BILATERAL';
let holdStartTime = null;
let stabilityFailed = false;
let stabilityFailCount = 0;

export default {
  id: 'singleLegStand',
  name: 'Single Leg Stand',
  joints: {
    leftEar: 7,
    rightEar: 8,
    leftShoulder: 11,
    rightShoulder: 12,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28
  },
  gauges: [
    { name: 'Hip Flexion', points: ['leftShoulder', 'leftHip', 'leftKnee'], target: 135 }
  ],
  analyze(landmarks, currentStage) {

    if (currentStage === 'UP') {
      internalStage = 'BILATERAL';
      holdStartTime = null;
      stabilityFailed = false;
      stabilityFailCount = 0;
    }


    const lHip = landmarks[23];
    const rHip = landmarks[24];
    const lKnee = landmarks[25];
    const rKnee = landmarks[26];

    if (lHip.visibility < 0.5 || rHip.visibility < 0.5 ||
      lKnee.visibility < 0.5 || rKnee.visibility < 0.5) {
      return {
        stage: currentStage,
        feedback: { text: 'Keep your full body in view', type: 'neutral' },
        isGoodRep: false,
        viewType: 'front',
        angles: { hip_flexion: 175 }
      };
    }


    const kneeLiftDiff = Math.abs(landmarks[25].y - landmarks[26].y);
    const isOneLegLifted = kneeLiftDiff > 0.06;

    let liftedHipAngle;
    if (landmarks[25].y < landmarks[26].y) {
      liftedHipAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
    } else {
      liftedHipAngle = calculateAngle(landmarks[12], landmarks[24], landmarks[26]);
    }

    const shoulderMidX = (landmarks[11].x + landmarks[12].x) / 2;
    const hipMidX = (landmarks[23].x + landmarks[24].x) / 2;
    const trunkLean = Math.abs(shoulderMidX - hipMidX);


    let mappedStage = internalStage === 'HOLD' ? 'DOWN' : 'UP';
    let feedback = { text: 'Lift one knee to hip height and hold', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'BILATERAL') {

      if (isOneLegLifted && liftedHipAngle < 140) {
        internalStage = 'HOLD';
        mappedStage = 'DOWN';
        holdStartTime = Date.now();
        stabilityFailed = false;
        stabilityFailCount = 0;
        feedback = { text: 'Hold position — keep your trunk upright', type: 'good' };
      } else if (isOneLegLifted && liftedHipAngle < 160) {
        feedback = { text: 'Lift your knee higher — aim for hip height', type: 'neutral' };
      }

    } else if (internalStage === 'HOLD') {

      if (!isOneLegLifted || liftedHipAngle > 155) {
        const holdDuration = Date.now() - holdStartTime;

        if (holdDuration >= 2000 && !stabilityFailed) {
          isGoodRep = true;
          feedback = { text: 'Balance hold achieved. Rep counted.', type: 'good' };
        } else if (holdDuration < 2000) {
          feedback = { text: 'Hold for longer — aim for 2 full seconds', type: 'error' };
        } else {
          feedback = { text: 'Rep discarded — too much trunk lean', type: 'error' };
        }

        internalStage = 'BILATERAL';
        mappedStage = 'UP';
        holdStartTime = null;
        stabilityFailed = false;
        stabilityFailCount = 0;

      } else {
        if (trunkLean > 0.07) {
          stabilityFailCount++;
          if (stabilityFailCount >= 5) {
            stabilityFailed = true;
          }
          feedback = { text: 'Keep your trunk upright — do not lean sideways', type: 'error' };
        } else {
          stabilityFailCount = Math.max(0, stabilityFailCount - 1);
          const elapsed = Date.now() - holdStartTime;
          if (elapsed < 2000) {
            const remaining = Math.ceil((2000 - elapsed) / 1000);
            feedback = { text: `Hold steady — ${remaining}s remaining`, type: 'good' };
          } else {
            feedback = { text: 'Target hold achieved — you can lower your foot', type: 'good' };
          }
        }
      }
    }

    return {
      stage: mappedStage,
      feedback,
      isGoodRep,
      viewType: 'front',
      angles: { hip_flexion: liftedHipAngle }
    };
  }
};
