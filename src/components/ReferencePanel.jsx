import React from 'react';
import { Activity } from 'lucide-react';

const exerciseConfig = {
  squats: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Keep your back straight and chest up',
      'Drop your hips below your knees',
      'Keep your weight on your heels',
      'Do not let your knees cave inward'
    ]
  },
  bicepCurls: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Keep your elbows tucked into your sides',
      'Avoid swinging your upper body',
      'Control the weight on the way down',
      'Full range of motion: extend fully'
    ]
  },
  lunges: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Keep your torso upright',
      'Step far enough forward to create 90° angles',
      'Front knee should not go past toes',
      'Lower your back knee towards the floor'
    ]
  },
  heelSlides: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Keep your heel in contact with the surface',
      'Slide slowly and smoothly',
      'Push into the stretch at the end',
      'Extend fully between repetitions'
    ]
  },
  clamshell: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Lie on your side with hips and knees stacked',
      'Keep your feet together throughout the movement',
      'Rotate your top knee toward the ceiling slowly',
      'Do not let your hips roll backward'
    ]
  },
  deadBug: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Keep your lower back pressed firmly to the floor',
      'Lower opposite arm and leg together slowly',
      'Breathe out steadily during the lowering phase',
      'Return to start position with control'
    ]
  },
  singleLegStand: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Lift one knee to hip height and hold for 2 seconds',
      'Keep your trunk upright — do not lean sideways',
      'Focus your gaze on a fixed point ahead of you',
      'Engage your core and standing hip for stability'
    ]
  },
  catCamel: {
    videoId: '', // Placeholder: add clinical demo ID
    tips: [
      'Start on hands and knees with a neutral spine',
      'Round your spine up toward the ceiling (Cat)',
      'Arch your spine down and lift your head (Camel)',
      'Move slowly through the full range of motion'
    ]
  }
};

export default function ReferencePanel({ exerciseId }) {
  const config = exerciseConfig[exerciseId] || exerciseConfig.squats;

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Reference Guide</span>
      </div>
      <div className="reference-content">
        <div className="tips-list">
          {config.tips.map((tip, i) => (
            <div key={i} className="tip-item">
              <span className="tip-num">{i + 1}</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
        <div className="demo-video-container">
          {config.videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${config.videoId}?controls=0&modestbranding=1&rel=0`}
              title="Exercise Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="video-placeholder">
              <Activity size={48} className="placeholder-icon" />
              <p>Clinical Demo Pending</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
