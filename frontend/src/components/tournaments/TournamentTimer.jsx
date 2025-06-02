import React, { useState, useEffect } from 'react';

const TournamentTimer = ({ blindStructure, startTime }) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos em segundos
  const [isRunning, setIsRunning] = useState(false);
  const [levelTimes, setLevelTimes] = useState([]);

  // Calcular horários previstos para cada nível
  useEffect(() => {
    if (!blindStructure || !Array.isArray(blindStructure)) return;

    const calculateLevelTimes = () => {
      const times = [];
      let accumulatedMinutes = 0;

      blindStructure.forEach((level) => {
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() + accumulatedMinutes);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + level.duration);

        times.push({
          level: level.level,
          startTime: startTime.toLocaleTimeString(),
          endTime: endTime.toLocaleTimeString(),
          smallBlind: level.small_blind,
          bigBlind: level.big_blind
        });

        accumulatedMinutes += level.duration;
      });

      setLevelTimes(times);
    };

    calculateLevelTimes();
  }, [blindStructure]);

  // Reset timer quando mudar de nível
  useEffect(() => {
    if (blindStructure && blindStructure[currentLevel]) {
      setTimeLeft(blindStructure[currentLevel].duration * 60);
    }
  }, [currentLevel, blindStructure]);

  // Timer principal
  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentLevel < blindStructure.length - 1) {
      setCurrentLevel((prev) => prev + 1);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, currentLevel, blindStructure]);

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setCurrentLevel(0);
    setTimeLeft(blindStructure[0].duration * 60);
    setIsRunning(false);
  };

  if (!blindStructure || !Array.isArray(blindStructure) || blindStructure.length === 0) {
    return <div>Invalid blind structure</div>;
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Tournament Timer</h2>
      <div className="text-center">
        <div className="text-3xl font-bold mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="text-lg mb-4">
          Level {blindStructure[currentLevel].level}: {blindStructure[currentLevel].small_blind}/{blindStructure[currentLevel].big_blind}
        </div>
        
        <div className="flex justify-center space-x-4 mb-6">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Pause
            </button>
          )}
          <button
            onClick={resetTimer}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reset
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Blind Schedule</h3>
          <div className="max-h-60 overflow-y-auto">
            {levelTimes.map((level, index) => (
              <div 
                key={level.level}
                className={`p-2 text-sm ${
                  index === currentLevel 
                    ? 'bg-blue-100 font-bold' 
                    : index < currentLevel 
                    ? 'bg-gray-100' 
                    : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>Level {level.level}</span>
                  <span>{level.smallBlind}/{level.bigBlind}</span>
                  <span>{level.startTime} - {level.endTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentTimer; 