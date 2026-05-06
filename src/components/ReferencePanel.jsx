import React, { useState } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


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
  },
  birdDog: {
    videoId: '',
    tips: [
      'Start on hands and knees with a flat back',
      'Extend opposite arm and leg simultaneously',
      'Hold the position for at least 2 seconds',
      'Keep both shoulders level — do not rotate your trunk'
    ]
  },
  pendulum: {
    videoId: '',
    tips: [
      'Lean forward at the hip and let your arm hang freely',
      'Swing your arm forward and backward like a pendulum',
      'Keep your elbow straight — do not actively curl',
      'Relax your shoulder and let gravity do the work'
    ]
  },
  bridge: {
    videoId: '',
    tips: [
      'Lie on your back with knees bent and feet flat',
      'Press your feet into the floor and lift your hips',
      'Squeeze your glutes at the top of the movement',
      'Keep your knees aligned over your ankles throughout'
    ]
  },
  quadSets: {
    videoId: 'khUhNAq2Fzo',
    tips: [
      'Lie flat with your leg fully extended on the surface',
      'Tighten your thigh muscle — press the back of your knee toward the floor',
      'Hold the contraction for 5–10 seconds',
      'Relax slowly, then repeat'
    ]
  },
  straightLegRaise: {
    videoId: 'U4L_6JEv9Jg',
    tips: [
      'Lie flat — bend the opposite knee for back support',
      'Tighten your thigh to lock the knee fully straight before lifting',
      'Raise your leg to roughly 45° (level with the opposite knee)',
      'Lower slowly and under control — do not drop the leg'
    ]
  }
};

export default function ReferencePanel({ exerciseId, isDashboard }) {
  const config = exerciseConfig[exerciseId] || exerciseConfig.squats;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-black/[0.05] rounded-[32px] overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Reference Guide</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={18} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 pt-0 border-t border-black/[0.03]">
              <div className={`grid ${isDashboard ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1'} gap-x-6 gap-y-4 mt-6 max-w-7xl mx-auto`}>
                {config.tips.map((tip, i) => (
                  <div key={i} className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-2xl">
                    <span className="text-sm font-black text-brand-primary mt-0.5">{i + 1}</span>
                    <p className="text-[15px] font-semibold text-gray-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

