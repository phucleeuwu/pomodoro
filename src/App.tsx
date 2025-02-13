import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX, Clock, Calendar, Settings, Target } from 'lucide-react';
import useSound from 'use-sound';

type TimerMode = 'work' | 'break';

interface Lap {
  mode: TimerMode;
  duration: number;
  timestamp: Date;
}

interface DailyStats {
  workSessions: number;
  breakSessions: number;
  totalWorkTime: number;
  totalBreakTime: number;
  dailyGoal: number;
  streakDays: number;
}

interface TimerSettings {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

function App() {
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4
  });

  const [timeLeft, setTimeLeft] = useState(settings.workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('work');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [showLaps, setShowLaps] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    workSessions: 0,
    breakSessions: 0,
    totalWorkTime: 0,
    totalBreakTime: 0,
    dailyGoal: 8,
    streakDays: 0
  });
  
  const [playStart] = useSound('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', {
    soundEnabled: isSoundEnabled
  });
  const [playWorkComplete] = useSound('https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3', {
    soundEnabled: isSoundEnabled
  });
  const [playBreakComplete] = useSound('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', {
    soundEnabled: isSoundEnabled
  });

  const resetTimer = useCallback(() => {
    const newTime = mode === 'work' ? settings.workDuration : settings.breakDuration;
    setTimeLeft(newTime);
    setIsRunning(false);
  }, [mode, settings]);

  const toggleTimer = () => {
    if (!isRunning) {
      playStart();
    }
    setIsRunning(!isRunning);
  };

  const addLap = useCallback(() => {
    const totalTime = mode === 'work' ? settings.workDuration : settings.breakDuration;
    const elapsedTime = totalTime - timeLeft;
    if (elapsedTime > 0) {
      const newLap = {
        mode,
        duration: elapsedTime,
        timestamp: new Date()
      };
      
      setLaps(prevLaps => [newLap, ...prevLaps]);
      
      setDailyStats(prev => {
        const newStats = {
          ...prev,
          workSessions: prev.workSessions + (mode === 'work' ? 1 : 0),
          breakSessions: prev.breakSessions + (mode === 'break' ? 1 : 0),
          totalWorkTime: prev.totalWorkTime + (mode === 'work' ? elapsedTime : 0),
          totalBreakTime: prev.totalBreakTime + (mode === 'break' ? elapsedTime : 0)
        };

        // Update streak if daily goal is met
        if (mode === 'work' && newStats.workSessions >= prev.dailyGoal && 
            newStats.workSessions !== prev.workSessions) {
          newStats.streakDays = prev.streakDays + 1;
        }

        return newStats;
      });
    }
  }, [mode, timeLeft, settings]);

  const switchMode = useCallback(() => {
    addLap();
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    const isLongBreak = newMode === 'break' && 
                       dailyStats.workSessions % settings.sessionsUntilLongBreak === 0;
    setTimeLeft(newMode === 'work' ? 
      settings.workDuration : 
      (isLongBreak ? settings.longBreakDuration : settings.breakDuration)
    );
    setIsRunning(false);
  }, [mode, settings, dailyStats.workSessions, addLap]);

  const handleModeChange = (newMode: TimerMode) => {
    if (mode !== newMode) {
      addLap();
      setMode(newMode);
      setTimeLeft(newMode === 'work' ? settings.workDuration : settings.breakDuration);
      setIsRunning(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            if (mode === 'work') {
              playWorkComplete();
            } else {
              playBreakComplete();
            }
            switchMode();
            return time - 1;
          }
          return time - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, playWorkComplete, playBreakComplete, switchMode, mode]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalTime = mode === 'work' ? settings.workDuration : settings.breakDuration;
  const percentage = ((totalTime - timeLeft) / totalTime) * 100;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const progressColor = mode === 'work' ? 'rgb(96, 165, 250)' : 'rgb(167, 139, 250)';
  const progressBackground = 'rgba(255, 255, 255, 0.05)';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        {/* Header with Settings */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-white/80" />
            <div className="text-white/80">
              <span className="font-medium">{dailyStats.streakDays}</span>
              <span className="text-sm ml-1">day streak</span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Settings size={20} className="text-white/80" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl mb-6">
            <h3 className="text-white/90 font-medium mb-4">Timer Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-2">Work Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.workDuration / 60}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    workDuration: Math.max(1, parseInt(e.target.value)) * 60
                  }))}
                  className="bg-white/10 text-white border-0 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.breakDuration / 60}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    breakDuration: Math.max(1, parseInt(e.target.value)) * 60
                  }))}
                  className="bg-white/10 text-white border-0 rounded-lg p-2 w-full focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Long Break Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.longBreakDuration / 60}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    longBreakDuration: Math.max(1, parseInt(e.target.value)) * 60
                  }))}
                  className="bg-white/10 text-white border-0 rounded-lg p-2 w-full focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-2">Sessions until Long Break</label>
                <input
                  type="number"
                  value={settings.sessionsUntilLongBreak}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sessionsUntilLongBreak: Math.max(1, parseInt(e.target.value))
                  }))}
                  className="bg-white/10 text-white border-0 rounded-lg p-2 w-full focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Daily Stats */}
        <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl mb-6">
          <div className="flex items-center justify-between text-white/80 mb-4">
            <Calendar size={20} />
            <span className="text-sm font-medium">Today's Progress</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain size={16} className="text-blue-400" />
                <span className="text-white/60 text-sm">Work</span>
              </div>
              <div className="text-white font-medium">{dailyStats.workSessions} / {dailyStats.dailyGoal}</div>
              <div className="text-white/40 text-sm">{formatTime(dailyStats.totalWorkTime)} total</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Coffee size={16} className="text-purple-400" />
                <span className="text-white/60 text-sm">Break</span>
              </div>
              <div className="text-white font-medium">{dailyStats.breakSessions} sessions</div>
              <div className="text-white/40 text-sm">{formatTime(dailyStats.totalBreakTime)} total</div>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="bg-white/5 backdrop-blur-xl p-2 rounded-2xl mb-8 flex justify-center gap-2">
          <button
            onClick={() => handleModeChange('work')}
            className={`flex-1 py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
              mode === 'work'
                ? 'bg-white/10 shadow-lg'
                : 'hover:bg-white/5'
            }`}
          >
            <Brain size={20} className={mode === 'work' ? 'text-blue-400' : 'text-white/60'} />
            <span className={`font-medium ${mode === 'work' ? 'text-white' : 'text-white/60'}`}>Work</span>
          </button>
          <button
            onClick={() => handleModeChange('break')}
            className={`flex-1 py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
              mode === 'break'
                ? 'bg-white/10 shadow-lg'
                : 'hover:bg-white/5'
            }`}
          >
            <Coffee size={20} className={mode === 'break' ? 'text-purple-400' : 'text-white/60'} />
            <span className={`font-medium ${mode === 'break' ? 'text-white' : 'text-white/60'}`}>Break</span>
          </button>
        </div>

        {/* Timer Display */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl mb-8">
          <div className="relative w-[280px] h-[280px] mx-auto">
            {/* Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r="120"
                className="fill-none"
                stroke={progressBackground}
                strokeWidth="12"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                className="fill-none"
                stroke={progressColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            
            {/* Timer Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
              <div className="text-7xl font-bold mb-2 tracking-tight text-white">
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="flex items-center justify-center gap-2 text-lg font-medium text-white/80">
                {mode === 'work' ? <Brain size={24} /> : <Coffee size={24} />}
                <span className="capitalize">{mode} Time</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex justify-center items-center gap-6">
            <button
              onClick={resetTimer}
              className="p-4 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw size={24} className="text-white/80" />
            </button>
            <button
              onClick={toggleTimer}
              className={`p-6 rounded-full transition-all duration-300 ${
                isRunning
                  ? 'bg-white/20 hover:bg-white/25'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            >
              {isRunning ? (
                <Pause size={32} className="text-white" />
              ) : (
                <Play size={32} className="text-white ml-1" />
              )}
            </button>
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="p-4 rounded-full hover:bg-white/5 transition-colors"
              aria-label={isSoundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {isSoundEnabled ? (
                <Volume2 size={24} className="text-white/80" />
              ) : (
                <VolumeX size={24} className="text-white/80" />
              )}
            </button>
          </div>
        </div>

        {/* Session Info and Laps Toggle */}
        <div className="text-center space-y-4">
          <div className="text-white/60 text-sm">
            {mode === 'work' ? 
              `${Math.floor(settings.workDuration / 60)} minutes work session` : 
              (dailyStats.workSessions % settings.sessionsUntilLongBreak === 0 ? 
                `${Math.floor(settings.longBreakDuration / 60)} minutes long break` :
                `${Math.floor(settings.breakDuration / 60)} minutes break`)}
          </div>
          <button
            onClick={() => setShowLaps(!showLaps)}
            className="flex items-center gap-2 mx-auto text-white/80 hover:text-white transition-colors"
          >
            <Clock size={16} />
            <span className="text-sm">{showLaps ? 'Hide History' : 'Show History'}</span>
          </button>
        </div>

        {/* Laps History */}
        {showLaps && laps.length > 0 && (
          <div className="mt-8 bg-white/5 backdrop-blur-xl rounded-2xl p-4 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {laps.map((lap, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {lap.mode === 'work' ? (
                      <Brain size={16} className="text-blue-400" />
                    ) : (
                      <Coffee size={16} className="text-purple-400" />
                    )}
                    <span className="text-white/80 capitalize">{lap.mode}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/60 text-sm">
                      {formatTime(lap.duration)}
                    </span>
                    <span className="text-white/40 text-xs">
                      {new Date(lap.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;