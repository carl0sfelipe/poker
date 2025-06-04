import React, { useState, useEffect } from 'react';

const TournamentTimer = ({ tournament }) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [levelTimes, setLevelTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const levelsPerPage = 10;

  useEffect(() => {
    if (!tournament?.blind_structure || !Array.isArray(tournament.blind_structure)) return;

    // Inicializar o timer com o primeiro nível
    setCurrentLevel(0);
    setTimeLeft(tournament.blind_structure[0].duration * 60);

    // Calcular horários previstos para cada nível
    const calculateLevelTimes = () => {
      const times = [];
      let currentTime = new Date(tournament.start_time);

      tournament.blind_structure.forEach((level) => {
        const startTime = new Date(currentTime);
        const endTime = new Date(currentTime);
        endTime.setMinutes(endTime.getMinutes() + level.duration);

        times.push({
          level: level.level,
          startTime: startTime.toLocaleTimeString(),
          endTime: endTime.toLocaleTimeString(),
          smallBlind: level.smallBlind || level.small_blind,
          bigBlind: level.bigBlind || level.big_blind
        });

        currentTime = new Date(endTime);
      });

      setLevelTimes(times);
    };

    calculateLevelTimes();
  }, [tournament]);

  // Timer principal
  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && tournament?.blind_structure && currentLevel < tournament.blind_structure.length - 1) {
      setCurrentLevel((prev) => prev + 1);
      setTimeLeft(tournament.blind_structure[currentLevel + 1].duration * 60);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, currentLevel, tournament]);

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    if (!tournament?.blind_structure) return;
    setCurrentLevel(0);
    setTimeLeft(tournament.blind_structure[0].duration * 60);
    setIsRunning(false);
  };

  const totalPages = Math.ceil(levelTimes.length / levelsPerPage);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (!tournament?.blind_structure || !Array.isArray(tournament.blind_structure)) {
    return <div className="text-red-600">Invalid blind structure</div>;
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const currentBlindLevel = tournament.blind_structure[currentLevel];
  const currentSmallBlind = currentBlindLevel.smallBlind || currentBlindLevel.small_blind;
  const currentBigBlind = currentBlindLevel.bigBlind || currentBlindLevel.big_blind;

  // Calculate the levels to show for the current page
  const startIndex = (currentPage - 1) * levelsPerPage;
  const endIndex = startIndex + levelsPerPage;
  const currentLevels = levelTimes.slice(startIndex, endIndex);

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-2xl font-semibold mb-6">Tournament Timer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">
            {formatTime(timeLeft)}
          </div>
          <div className="text-xl mb-4">
            Level {currentBlindLevel.level}: {currentSmallBlind}/{currentBigBlind}
          </div>
          
          <div className="flex justify-center space-x-4 mb-6">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Start
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Pause
              </button>
            )}
            <button
              onClick={resetTimer}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Blind Schedule</h3>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Blinds</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLevels.map((level, index) => (
                  <tr 
                    key={level.level}
                    className={`${
                      level.level === currentBlindLevel.level
                        ? 'bg-blue-50 font-semibold' 
                        : level.level < currentBlindLevel.level
                        ? 'text-gray-400' 
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2">{level.level}</td>
                    <td className="px-4 py-2">{level.smallBlind}/{level.bigBlind}</td>
                    <td className="px-4 py-2">{level.startTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentTimer; 