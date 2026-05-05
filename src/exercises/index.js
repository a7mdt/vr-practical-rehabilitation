import squats from './squats';
import bicepCurls from './bicepCurls';
import lunges from './lunges';
import heelSlides from './heelSlides';
import anklePump from './anklePump';

export const exercises = {
  squats,
  bicepCurls,
  lunges,
  heelSlides,
  anklePump
};

export const getExercise = (id) => exercises[id] || exercises.squats;
