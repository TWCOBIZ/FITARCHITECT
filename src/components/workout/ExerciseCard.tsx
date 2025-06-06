import React from 'react';
import { Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Exercise } from '../../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
}

const FALLBACK_IMAGE = '/assets/exercise-fallback.png';
const GENERIC_INSTRUCTIONS = 'Focus on proper form and controlled movement.';

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise }) => (
  <div className="exercise-card border border-gray-800 rounded-lg p-4 bg-black shadow hover:bg-gray-900 text-white">
    <h3 className="font-bold text-lg mb-2 text-white">{exercise.name}</h3>
    <img
      src={exercise.imageUrl || FALLBACK_IMAGE}
      alt={exercise.name}
      className="mb-2 w-full max-w-xs rounded"
    />
    {exercise.videoUrl && (
      <video controls width="320" className="mb-2">
        <source src={exercise.videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    )}
    <div className="flex items-center mb-2">
      <Tooltip title={exercise.instructions && exercise.instructions.length > 0 ? exercise.instructions.join(' ') : GENERIC_INSTRUCTIONS}>
        <span className="ml-1 cursor-pointer text-blue-400"><InfoOutlinedIcon /></span>
      </Tooltip>
    </div>
    <p className="text-gray-400 text-sm">{exercise.description}</p>
  </div>
);

export default ExerciseCard; 