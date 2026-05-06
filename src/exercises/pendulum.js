import { calculateAngle } from '../utils/angles';

let internalStage = 'HANG';
let hasSwungForward = false;
let hasSwungBackward = false;
let elbowFailed = false;
let frameCount = 0;

// Track angle history for direction-change detection
let prevArmAngle = null;
let smoothedArm = null;
let peakAngle = null;   // local maximum detected
let troughAngle = null; // local minimum detected
let trendDirection = 0; // +1 = increasing, -1 = decreasing, 0 = unknown
let trendFrames = 0;    // consecutive frames in current direction

const MIN_SWING_ARC = 8; // minimum degrees for a swing to count

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

  reset() {
    internalStage = 'HANG';
    hasSwungForward = false;
    hasSwungBackward = false;
    elbowFailed = false;
    frameCount = 0;
    prevArmAngle = null;
    smoothedArm = null;
    peakAngle = null;
    troughAngle = null;
    trendDirection = 0;
    trendFrames = 0;
  },

  analyze(landmarks, currentStage) {
    frameCount++;

    // ── Visibility gate (only arm landmarks required) ────────
    const armVisible = [11, 13, 15].every(i =>
      landmarks[i] && landmarks[i].visibility > 0.3
    );

    if (!armVisible) {
      return {
        stage: currentStage,
        feedback: { text: 'Adjust camera — shoulder and arm must be visible', type: 'neutral' },
        isGoodRep: false,
        viewType: 'side',
        angles: { shoulder_swing: prevArmAngle ?? 90 }
      };
    }

    // ── Optional hip hinge posture check ─────────────────────
    const hipVisible = landmarks[23]?.visibility > 0.3;
    const kneeVisible = landmarks[25]?.visibility > 0.3;

    if (hipVisible && kneeVisible) {
      const hipHingeAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
      if (hipHingeAngle >= 175) {
        return {
          stage: currentStage,
          feedback: { text: 'Lean forward slightly and let your arm hang freely', type: 'neutral' },
          isGoodRep: false,
          viewType: 'side',
          angles: { shoulder_swing: prevArmAngle ?? 90 }
        };
      }
    }

    // ── Compute arm angle ────────────────────────────────────
    let armAngle;
    if (hipVisible) {
      armAngle = calculateAngle(landmarks[23], landmarks[11], landmarks[13]);
    } else {
      const virtualHip = { x: landmarks[11].x, y: landmarks[11].y + 0.3, z: 0 };
      armAngle = calculateAngle(virtualHip, landmarks[11], landmarks[13]);
    }

    const elbowAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);

    // ── Smooth the arm angle to reduce noise ─────────────────
    if (smoothedArm === null) {
      smoothedArm = armAngle;
    } else {
      smoothedArm = smoothedArm * 0.6 + armAngle * 0.4;
    }

    // ── Direction-change detection (peak/trough finding) ─────
    // Instead of comparing to a fixed baseline, detect when the arm
    // REVERSES direction — that's a swing endpoint.
    if (prevArmAngle !== null) {
      const delta = smoothedArm - prevArmAngle;
      const newDirection = delta > 0.3 ? 1 : delta < -0.3 ? -1 : trendDirection;

      if (newDirection !== trendDirection && trendDirection !== 0) {
        // Direction changed!
        if (trendDirection === 1 && trendFrames >= 3) {
          // Was going UP (angle increasing), now reversing → PEAK found (backward swing endpoint)
          peakAngle = prevArmAngle;
        } else if (trendDirection === -1 && trendFrames >= 3) {
          // Was going DOWN (angle decreasing), now reversing → TROUGH found (forward swing endpoint)
          troughAngle = prevArmAngle;
        }
        trendFrames = 0;
      }

      if (newDirection === trendDirection) {
        trendFrames++;
      } else {
        trendFrames = 1;
      }
      trendDirection = newDirection;
    }

    prevArmAngle = smoothedArm;

    // ── State machine using direction changes ────────────────
    let mappedStage = internalStage === 'HANG' ? 'UP' : 'DOWN';
    let feedback = { text: 'Let your arm swing forward and backward', type: 'neutral' };
    let isGoodRep = false;

    // Elbow check (lenient)
    if (elbowAngle < 120) {
      elbowFailed = true;
      feedback = { text: 'Relax your arm — let it hang straight', type: 'error' };
    }

    if (internalStage === 'HANG') {
      // Detect forward swing: a trough was found (arm went forward and started coming back)
      if (troughAngle !== null && !hasSwungForward) {
        // Verify meaningful swing arc
        if (peakAngle !== null && (peakAngle - troughAngle) >= MIN_SWING_ARC) {
          hasSwungForward = true;
          internalStage = 'FORWARD';
          mappedStage = 'DOWN';
          feedback = { text: 'Good — now swing your arm backward', type: 'good' };
        } else if (peakAngle === null) {
          // First trough detected, no peak yet — forward swing in progress
          hasSwungForward = true;
          internalStage = 'FORWARD';
          mappedStage = 'DOWN';
          feedback = { text: 'Good — now swing your arm backward', type: 'good' };
        }
      }
    } else if (internalStage === 'FORWARD') {
      // Wait for backward swing: a peak is found (arm went backward and started coming forward)
      if (peakAngle !== null && troughAngle !== null) {
        const swingArc = peakAngle - troughAngle;
        if (swingArc >= MIN_SWING_ARC) {
          hasSwungBackward = true;
          internalStage = 'BACK';
          mappedStage = 'DOWN';
          feedback = { text: 'Good — return to center', type: 'good' };
        }
      }
    } else if (internalStage === 'BACK') {
      // Wait for the arm to return toward center (a new trough means a new forward swing started)
      if (troughAngle !== null && trendDirection === 1) {
        // Arm has reversed from the backward position — rep complete
        if (hasSwungForward && hasSwungBackward && !elbowFailed) {
          isGoodRep = true;
          feedback = { text: 'Rep achieved', type: 'good' };
        } else if (elbowFailed) {
          feedback = { text: 'Rep discarded — keep your arm relaxed', type: 'error' };
        }
        internalStage = 'HANG';
        mappedStage = 'UP';
        hasSwungForward = false;
        hasSwungBackward = false;
        elbowFailed = false;
        // Keep peak/trough for the next cycle
        peakAngle = null;
        troughAngle = null;
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
