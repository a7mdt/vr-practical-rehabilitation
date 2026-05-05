import squats from './squats';
import bicepCurls from './bicepCurls';
import lunges from './lunges';
import heelSlides from './heelSlides';
import clamshell from './clamshell';
import deadBug from './deadBug';
import singleLegStand from './singleLegStand';
import catCamel from './catCamel';

export const exercises = {
  squats,
  bicepCurls,
  lunges,
  heelSlides,
  clamshell,
  deadBug,
  singleLegStand,
  catCamel
};

export const getExercise = (id) => exercises[id] || exercises.squats;
