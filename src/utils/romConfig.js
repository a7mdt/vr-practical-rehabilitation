export const ROM_CONFIG = {
  squats:     { primaryKey: 'knee', label: 'Knee Flexion', targetAngle: 100, startAngle: 165, normalRange: '≤ 100°' },
  heelSlides: { primaryKey: 'knee', label: 'Knee Flexion', targetAngle: 90,  startAngle: 165, normalRange: '≤ 90°'  },
  bicepCurls: { primaryKey: 'elbow', label: 'Elbow Flexion', targetAngle: 40, startAngle: 165, normalRange: '≤ 40°' },
  lunges:     { primaryKey: 'knee', label: 'Knee Flexion', targetAngle: 90,  startAngle: 165, normalRange: '≤ 90°'  },
  clamshell:  { primaryKey: 'hip_abduction', label: 'Hip Abduction', targetAngle: 130, startAngle: 160, normalRange: '≥ 50° abduction', requiredView: 'side' },
  deadBug:    { primaryKey: 'lumbar_stability', label: 'Lumbar Stability', targetAngle: 30, startAngle: 90, normalRange: '≥ 150° extension', requiredView: 'side' },
  singleLegStand: { primaryKey: 'hip_flexion', label: 'Hip Flexion Hold', targetAngle: 135, startAngle: 175, normalRange: '≤ 135°', requiredView: 'front' },
  catCamel:   { primaryKey: 'spine', label: 'Spinal Flexion', targetAngle: 155, startAngle: 165, normalRange: '≤ 155°', requiredView: 'side' },
};

const DIAGNOSES = {
  squats: [
    { minScore: 88, status: 'optimal',  label: 'Full ROM',              advice: 'Squat depth within clinical targets. Continue progressive loading as tolerated.' },
    { minScore: 65, status: 'mild',     label: 'Mild Restriction',       advice: 'Depth mildly limited. Likely ankle dorsiflexion or hip flexor restriction. Try heel elevation and hip flexor stretching before sessions.' },
    { minScore: 40, status: 'moderate', label: 'Moderate Restriction',   advice: 'Significant flexion deficit. Soft tissue mobilisation recommended. Avoid heavy loading until ROM improves.' },
    { minScore: 0,  status: 'severe',   label: 'Severe Restriction',     advice: 'Possible post-surgical stiffness, effusion, or patellofemoral pain. Consult supervising therapist before advancing.' },
  ],
  heelSlides: [
    { minScore: 88, status: 'optimal',  label: 'Full ROM',              advice: 'Target knee flexion achieved. Good post-operative recovery. Consider progressing to closed-chain exercises.' },
    { minScore: 65, status: 'mild',     label: 'Mild Restriction',       advice: 'Slight restriction — common in early post-op. Continue with gentle overpressure at end range as tolerated.' },
    { minScore: 40, status: 'moderate', label: 'Moderate Restriction',   advice: 'Moderate deficit. Consider patellar mobilisation and prone hangs. Document and review if not improving within 5–7 days.' },
    { minScore: 0,  status: 'severe',   label: 'Severe Restriction',     advice: 'May indicate joint effusion, adhesion, or early arthrofibrosis risk. Immediate therapist review recommended.' },
  ],
  bicepCurls: [
    { minScore: 88, status: 'optimal',  label: 'Full ROM',              advice: 'Full elbow flexion achieved. Increase resistance as tolerated.' },
    { minScore: 65, status: 'mild',     label: 'Mild Restriction',       advice: 'Slight end-range restriction. Likely anterior capsule or biceps tightness. Add gentle passive stretching.' },
    { minScore: 40, status: 'moderate', label: 'Moderate Restriction',   advice: 'Moderate restriction. Consider neurological screen. Avoid heavy loading until ROM normalises.' },
    { minScore: 0,  status: 'severe',   label: 'Severe Restriction',     advice: 'Possible heterotopic ossification or contracture. Suspend and arrange therapist assessment.' },
  ],
  lunges: [
    { minScore: 88, status: 'optimal',  label: 'Full ROM',              advice: 'Excellent lunge depth. Advance to weighted lunge or Bulgarian split squat.' },
    { minScore: 65, status: 'mild',     label: 'Mild Restriction',       advice: 'Mildly limited. Hip flexor tightness likely. Add hip flexor mobilisation between sets.' },
    { minScore: 40, status: 'moderate', label: 'Moderate Restriction',   advice: 'Reduce step length. Focus on controlled descent. Check hip extension ROM on the lunge side.' },
    { minScore: 0,  status: 'severe',   label: 'Severe Restriction',     advice: 'Do not advance depth. Revert to stationary exercises and review with therapist.' },
  ],
  clamshell: [
    { minScore: 88, status: 'optimal',  label: 'Full Hip Abduction',    advice: 'Excellent gluteus medius activation. Progress to resistance band.' },
    { minScore: 65, status: 'mild',     label: 'Partial Abduction',     advice: 'Moderate range. Focus on slow controlled opening phase.' },
    { minScore: 40, status: 'moderate', label: 'Limited Abduction',     advice: 'Restricted hip abduction. Assess TFL and hip capsule tightness.' },
    { minScore: 0,  status: 'severe',   label: 'Minimal Abduction',     advice: 'Significantly limited. Manual therapy and passive stretching recommended.' },
  ],
  deadBug: [
    { minScore: 88, status: 'optimal',  label: 'Excellent Stability',   advice: 'Excellent core control. Progress to weighted variation.' },
    { minScore: 68, status: 'mild',     label: 'Good Control',          advice: 'Good stability. Exhale during the lowering phase.' },
    { minScore: 45, status: 'moderate', label: 'Lumbar Instability',    advice: 'Lower back lifted off floor. Reduce range until core strength improves.' },
    { minScore: 0,  status: 'severe',   label: 'Critical Instability',  advice: 'Significant instability. Regress to single-limb movements only.' },
  ],
  singleLegStand: [
    { minScore: 88, status: 'optimal',  label: 'Full Balance Control',  advice: 'Excellent stability. Progress to eyes-closed or unstable surface.' },
    { minScore: 65, status: 'mild',     label: 'Adequate Stability',    advice: 'Good balance. Work on extending hold duration and adding arm movements.' },
    { minScore: 40, status: 'moderate', label: 'Balance Deficit',       advice: 'Compensatory trunk lean detected. Strengthen hip abductors and core.' },
    { minScore: 0,  status: 'severe',   label: 'Significant Instability', advice: 'Significant balance deficit. Consult therapist before progressing.' },
  ],
  catCamel: [
    { minScore: 88, status: 'optimal',  label: 'Full Spinal Mobility',  advice: 'Full spinal mobility achieved. Continue with progressive loading.' },
    { minScore: 65, status: 'mild',     label: 'Adequate Range',        advice: 'Good range. Add thoracic extension mobilisation drills.' },
    { minScore: 40, status: 'moderate', label: 'Restricted Mobility',   advice: 'Restricted spinal motion. Soft tissue mobilisation recommended.' },
    { minScore: 0,  status: 'severe',   label: 'Severely Limited',      advice: 'Severely limited spinal mobility. Consult supervising therapist.' },
  ],
};

/** Returns 0–100 ROM score. Higher = better. */
export const computeROMScore = (exerciseId, peakAngle) => {
  const cfg = ROM_CONFIG[exerciseId];
  if (!cfg || peakAngle == null) return null;
  const range = cfg.startAngle - cfg.targetAngle;
  const achieved = cfg.startAngle - peakAngle;
  return Math.max(0, Math.min(100, Math.round((achieved / range) * 100)));
};

/** Returns the matching diagnosis object. */
export const getDiagnosis = (exerciseId, romScore) => {
  const list = DIAGNOSES[exerciseId];
  if (!list || romScore == null) return null;
  return list.find(d => romScore >= d.minScore) ?? list[list.length - 1];
};
