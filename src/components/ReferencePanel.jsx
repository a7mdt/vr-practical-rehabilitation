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
  anklePump: {
    videoId: 'hh_fsJOpFjQ',
    tips: [
      'Pull your toes up toward your shin as far as comfortable',
      'Then point your toes away — full plantarflexion',
      'Keep your leg still; only the foot moves',
      'Move slowly and smoothly through the full range'
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
