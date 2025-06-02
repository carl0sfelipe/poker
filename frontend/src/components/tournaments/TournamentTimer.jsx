import React, { useState, useEffect } from 'react';

const TournamentTimer = ({ blindStructure, startTime }) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentLevel < blindStructure.levels.length - 1) {
      setCurrentLevel((prev) => prev + 1);
      setTimeLeft(blindStructure.levels[currentLevel + 1].duration * 60);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, currentLevel, blindStructure]);

  const startTimer = () => {
    const startTimeDate = new Date(startTime);
    const now = new Date();
    if (startTimeDate > now) {
      setTimeLeft(Math.floor((startTimeDate - now) / 1000));
    } else {
      setTimeLeft(blindStructure.levels[0].duration * 60);
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setCurrentLevel(0);
    setTimeLeft(blindStructure.levels[0].duration * 60);
    setIsRunning(false);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Tournament Timer</h2>
      
      <div className="text-center mb-4">
        <div className="text-4xl font-bold mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="text-lg">
          Level {currentLevel + 1}: {blindStructure.levels[currentLevel].small_blind}/
          {blindStructure.levels[currentLevel].big_blind}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
          >
            Start
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600"
          >
            Pause
          </button>
        )}
        <button
          onClick={resetTimer}
          className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default TournamentTimer; 