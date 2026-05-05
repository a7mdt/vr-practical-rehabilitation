export const ROM_CONFIG = {
  squats:     { primaryKey: 'knee',  label: 'Knee Flexion',       targetAngle: 100, startAngle: 165, normalRange: '≤ 100°' },
  heelSlides: { primaryKey: 'knee',  label: 'Knee Flexion',       targetAngle: 90,  startAngle: 165, normalRange: '≤ 90°'  },
  bicepCurls: { primaryKey: 'elbow', label: 'Elbow Flexion',      targetAngle: 40,  startAngle: 165, normalRange: '≤ 40°'  },
  lunges:     { primaryKey: 'knee',  label: 'Knee Flexion',       targetAngle: 90,  startAngle: 165, normalRange: '≤ 90°'  },
  anklePump:  { primaryKey: 'ankle', label: 'Ankle Dorsiflexion', targetAngle: 130, startAngle: 165, normalRange: '≤ 130°' },
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
  anklePump: [
    { minScore: 88, status: 'optimal',  label: 'Full ROM',              advice: 'Full ankle dorsiflexion achieved. Good circulatory and mobility response. Progress to standing calf raises when appropriate.' },
    { minScore: 65, status: 'mild',     label: 'Mild Restriction',       advice: 'Slight dorsiflexion limitation — common post-surgically or with prolonged immobilisation. Continue gentle pumping and add towel stretching at end range.' },
    { minScore: 40, status: 'moderate', label: 'Moderate Restriction',   advice: 'Moderate restriction. Assess for oedema, posterior capsule tightness, or Achilles involvement. Consider manual mobilisation before exercises.' },
    { minScore: 0,  status: 'severe',   label: 'Severe Restriction',     advice: 'Severely limited dorsiflexion. May indicate significant swelling, joint stiffness, or surgical complication. Suspend and arrange immediate therapist review.' },
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
