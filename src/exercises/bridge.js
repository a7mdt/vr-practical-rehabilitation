import { calculateAngle } from '../utils/angles';

let internalStage = 'FLAT';
let prevAngle = null;
let formFailed = false;
let holdStartTime = null;
let lastResetId = null;

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
    // Reset internal state when exercise restarts (stage externally set to UP)
    if (currentStage === 'UP' && internalStage !== 'FLAT') {
      if (lastResetId !== currentStage) {
        internalStage = 'FLAT';
        formFailed = false;
        holdStartTime = null;
        lastResetId = currentStage;
      }
    }

    const required = [11, 23, 25, 27];
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
        angles: { hip_bridge: prevAngle ?? 85 }
      };
    }

    // ── REAL DATA from patient video: ──────────────────────────
    // Flat (lying):   hipAngle ≈ 121°,  kneeAlign ≈ 31°
    // Bridge (hips up): hipAngle ≈ 179°, kneeAlign ≈ 60°
    // ──────────────────────────────────────────────────────────

    const hipBridgeAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[25]);
    const kneeAlignAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);

    // ── DEBUG: Log angles every 500ms ──
    if (!this._lastLog || Date.now() - this._lastLog > 500) {
      this._lastLog = Date.now();
      console.log(
        `[BRIDGE] stage=${internalStage} | hipAngle=${hipBridgeAngle.toFixed(1)}° | kneeAlign=${kneeAlignAngle.toFixed(1)}°`
      );
    }

    // For the gauge we invert so it starts low and rises
    const invertedAngle = 180 - hipBridgeAngle;
    prevAngle = invertedAngle;

    let mappedStage = internalStage === 'BRIDGE' ? 'DOWN' : 'UP';
    let feedback = { text: 'Press your feet into the floor and lift your hips', type: 'neutral' };
    let isGoodRep = false;

    if (internalStage === 'FLAT') {
      // Transition to BRIDGE when hips are lifted
      // Real data: flat ≈ 121°, bridged ≈ 179°
      // Threshold: hipAngle > 150° means hips are clearly lifted
      if (hipBridgeAngle > 150) {
        internalStage = 'BRIDGE';
        mappedStage = 'DOWN';
        holdStartTime = Date.now();
        formFailed = false;
        lastResetId = null;
        feedback = { text: 'Hold at the top — squeeze your glutes', type: 'good' };
      }
    } else if (internalStage === 'BRIDGE') {
      // Form check: knee alignment
      // Real data shows kneeAlign ≈ 60° when bridged, ≈ 31° when flat
      // These are MUCH lower than we assumed — accept 25° to 120°
      if (kneeAlignAngle < 25 || kneeAlignAngle > 120) {
        formFailed = true;
        feedback = { text: 'Keep your knees aligned over your ankles', type: 'error' };
      } else {
        feedback = { text: 'Hold at the top — squeeze your glutes', type: 'good' };
      }

      // Rep completes when the patient lowers back down
      // Real data: flat ≈ 121°, so threshold at 135° gives comfortable margin
      if (hipBridgeAngle < 135) {
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
