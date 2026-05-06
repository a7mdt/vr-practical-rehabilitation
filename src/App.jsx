import React, { useEffect, useRef, useState } from 'react';
import './index.css';

import { speak } from './utils/speech';
import { saveSession, getSessions, clearSessions } from './utils/sessionStorage';
import { drawSkeleton } from './utils/canvasDrawing';
import { ROM_CONFIG, computeROMScore } from './utils/romConfig';

import CameraPanel from './components/CameraPanel';
import ReferencePanel from './components/ReferencePanel';
import TherapistPanel from './components/TherapistPanel';
import ExerciseSelector from './components/ExerciseSelector';
import SessionHistory from './components/SessionHistory';
import TherapistReport from './components/TherapistReport';

import { getExercise } from './exercises';

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameId = useRef(null);

  // Tracking refs (stable across renders, no stale closure)
  const stageRef = useRef('UP');
  const repsRef = useRef(0);
  const startTimeRef = useRef(null);
  const currentExerciseRef = useRef(null);
  const feedbackRef = useRef({ text: 'Ready to start', type: 'neutral' });

  // ROM tracking
  const peakAngleRef = useRef(null);      // minimum primary angle seen in current rep's DOWN phase
  const prevAngleRef = useRef(null);      // previous frame raw angle — used to filter extreme noise
  const smoothedAngleRef = useRef(null);  // low-pass filtered angle to reduce jitter
  const baselineAngleRef = useRef(165);   // captured starting posture (dynamic baseline)

  // Phase Timing (TUT)
  const phaseStartTimeRef = useRef(null);
  const phaseDurationsRef = useRef({ eccentric: 0, concentric: 0 });

  // State
  const [selectedExerciseId, setSelectedExerciseId] = useState('squats');
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState({ text: 'Ready to start', type: 'neutral' });
  const [videoSource, setVideoSource] = useState('camera');
  const [sessions, setSessions] = useState([]);
  const [latestROM, setLatestROM] = useState(null);
  const [latestAngle, setLatestAngle] = useState(null);
  const [latestAsymmetry, setLatestAsymmetry] = useState(null);
  const [latestStability, setLatestStability] = useState(null);
  const [repROMScores, setRepROMScores] = useState([]);
  const [targetReps, setTargetReps] = useState(10);
  const [showReport, setShowReport] = useState(false);
  const [currentReportData, setCurrentReportData] = useState(null);

  // Initialize MediaPipe once
  useEffect(() => {
    setSessions(getSessions());
    currentExerciseRef.current = getExercise('squats');

    if (!window.Pose) { console.error('MediaPipe not loaded'); return; }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(onResults);
    poseRef.current = pose;

    setTimeout(() => startCamera(), 100);
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    currentExerciseRef.current = getExercise(selectedExerciseId);
    resetSession();
  }, [selectedExerciseId]); // eslint-disable-line

  const updateFeedback = (text, type) => {
    if (feedbackRef.current.text === text) return;
    feedbackRef.current = { text, type };
    setFeedback({ text, type });
    if (type === 'error' || text.includes('achieved') || text.includes('counted') || text === 'Perfect!') speak(text);
  };

  const onResults = (results) => {
    const canvasElement = canvasRef.current;
    const videoElement = videoRef.current;
    if (!canvasElement || !videoElement) return;

    const ctx = canvasElement.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results && results.poseLandmarks && videoElement.videoWidth > 0) {
      const exercise = currentExerciseRef.current;
      if (!exercise) { ctx.restore(); return; }

      drawSkeleton(ctx, results.poseLandmarks, window.POSE_CONNECTIONS);

      try {
        const analysis = exercise.analyze(results.poseLandmarks, stageRef.current);
        if (!analysis) { ctx.restore(); return; }

        // ── ROM tracking (Advanced) ──────────────────────────────
        const cfg = ROM_CONFIG[exercise.id];
        if (cfg && analysis.angles) {
          let rawAngle = analysis.angles[cfg.primaryKey];

          if (rawAngle != null) {
            // 1. Physical Sanity Check
            if (rawAngle < 5 || rawAngle > 200) {
              rawAngle = prevAngleRef.current || 165;
            }

            // 2. Filter Extreme Noise Jumps
            const prevRaw = prevAngleRef.current;
            const isExtremeJump = prevRaw !== null && Math.abs(rawAngle - prevRaw) > 40;
            prevAngleRef.current = rawAngle;

            if (!isExtremeJump) {
              // 3. Exponential Smoothing (alpha = 0.2) to reduce jitter
              if (smoothedAngleRef.current === null) {
                smoothedAngleRef.current = rawAngle;
              } else {
                smoothedAngleRef.current = (smoothedAngleRef.current * 0.8) + (rawAngle * 0.2);
              }
              const currentAngle = smoothedAngleRef.current;

              // 4. Dynamic Baseline (Capture resting posture while stable in UP position)
              if (stageRef.current === 'UP' && !analysis.isGoodRep) {
                // Heavier weight on baseline (0.98) to prevent drift during movement
                baselineAngleRef.current = (baselineAngleRef.current * 0.98) + (rawAngle * 0.02);
              }

              // 5. Peak Detection Logic (Using rawAngle to avoid smoothing lag)
              if (stageRef.current === 'UP' && analysis.stage === 'DOWN') {
                peakAngleRef.current = rawAngle;
              } else if (stageRef.current === 'DOWN') {
                // Track minimum (deepest flexion)
                if (peakAngleRef.current === null || rawAngle < peakAngleRef.current) {
                  peakAngleRef.current = rawAngle;
                }
              }

              // ── Phase Timing (TUT Tracking) ───────────────────
              if (analysis.stage !== stageRef.current) {
                const now = Date.now();
                if (phaseStartTimeRef.current) {
                  const duration = (now - phaseStartTimeRef.current) / 1000;
                  // If we just finished DOWN, that was the eccentric phase
                  if (stageRef.current === 'DOWN') phaseDurationsRef.current.eccentric = duration;
                  // If we just finished UP, that was the concentric phase
                  if (stageRef.current === 'UP') phaseDurationsRef.current.concentric = duration;
                }
                phaseStartTimeRef.current = now;
              }
            }
          }

          // ── Count rep and record ROM on completion ─────────────────
          if (analysis.isGoodRep) {
            repsRef.current += 1;
            setReps(repsRef.current);
            if (!startTimeRef.current) startTimeRef.current = Date.now();

            // Only compute ROM if the view is appropriate for the exercise
            const isCorrectView = !analysis.viewType || analysis.viewType === (cfg.requiredView || 'side');

            if (isCorrectView) {
              const repPeak = peakAngleRef.current || rawAngle || 165;
              const baseline = baselineAngleRef.current;

              // Percentage of progress from baseline towards clinical target
              const range = Math.abs(baseline - cfg.targetAngle);
              const achieved = Math.abs(baseline - repPeak);
              let score = Math.round((achieved / range) * 100);
              score = Math.max(0, Math.min(100, score));

              setLatestROM(score);
              setLatestAngle(repPeak);
              setRepROMScores(prev => [...prev, score]);

              // Update clinical assessment states
              if (analysis.angles) {
                if (analysis.angles.asymmetry !== undefined) setLatestAsymmetry(analysis.angles.asymmetry);
                if (analysis.angles.stability !== undefined) setLatestStability(analysis.angles.stability);
              }

              // ── Perfect Score Reward ─────────────────────
              if (score >= 100) {
                updateFeedback('Perfect!', 'good');
              }
            } else {
              // Rep counted but ROM invalid due to camera angle
              updateFeedback('Rep counted, but stand sideways for ROM analysis', 'neutral');
            }

            // Reset peak for next rep
            peakAngleRef.current = null;
          }
        }

        if (analysis.stage) stageRef.current = analysis.stage;

        if (analysis.feedback) {
          const text = typeof analysis.feedback === 'string' ? analysis.feedback : analysis.feedback.text;
          const type = typeof analysis.feedback === 'string' ? 'neutral' : (analysis.feedback.type || 'neutral');
          if (text) updateFeedback(text, type);
        }
      } catch (err) {
        console.error('Analysis error:', err);
      }
    } else if (results && !results.poseLandmarks) {
      updateFeedback('Position yourself in view to begin', 'neutral');
    }

    ctx.restore();
  };

  const startCamera = async () => {
    setVideoSource('camera');
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.style.transform = 'scaleX(-1)';
    canvas.style.transform = 'scaleX(-1)';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      video.src = '';
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        cameraRef.current = { stop: () => stream.getTracks().forEach(t => t.stop()) };
        pumpCameraFrames();
      };
    } catch (err) {
      console.warn('Camera unavailable:', err.message);
      updateFeedback('Camera unavailable — upload a video to analyse', 'neutral');
    }
  };

  const pumpCameraFrames = async () => {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    if (video.readyState >= 2 && video.videoWidth > 0 && poseRef.current) {
      try { await poseRef.current.send({ image: video }); } catch (_) { }
    }
    animationFrameId.current = requestAnimationFrame(pumpCameraFrames);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoSource('file');
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.srcObject) video.srcObject = null;

    video.style.transform = 'scaleX(1)';
    canvas.style.transform = 'scaleX(1)';
    video.src = URL.createObjectURL(file);
    video.load();
    video.oncanplay = () => video.play();
  };

  const processVideoFrames = async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;
    if (poseRef.current && video.readyState >= 2 && video.videoWidth > 0) {
      try { await poseRef.current.send({ image: video }); } catch (_) { }
    }
    animationFrameId.current = requestAnimationFrame(processVideoFrames);
  };

  const resetSession = () => {
    currentExerciseRef.current?.reset?.();
    repsRef.current = 0;
    stageRef.current = 'UP';
    startTimeRef.current = null;
    peakAngleRef.current = null;
    prevAngleRef.current = null;
    smoothedAngleRef.current = null;
    const cfg = ROM_CONFIG[currentExerciseRef.current?.id];
    baselineAngleRef.current = cfg?.startAngle ?? 165;
    feedbackRef.current = { text: 'Ready to start', type: 'neutral' };
    setReps(0);
    setFeedback({ text: 'Ready to start', type: 'neutral' });
    setRepROMScores([]);
    setLatestROM(null);
    setLatestAngle(null);
    setLatestAsymmetry(null);
    setLatestStability(null);
    phaseStartTimeRef.current = null;
    phaseDurationsRef.current = { eccentric: 0, concentric: 0 };
  };

  const finishSession = () => {
    if (repsRef.current === 0) return;
    const exercise = currentExerciseRef.current;
    if (!exercise) return;
    const avgROM = repROMScores.length > 0
      ? Math.round(repROMScores.reduce((a, b) => a + b, 0) / repROMScores.length)
      : null;

    const sessionData = {
      exercise: exercise.name,
      reps: repsRef.current,
      goodReps: repsRef.current,
      romScore: avgROM,
      latestAsymmetry,
      latestStability,
      phaseTiming: { ...phaseDurationsRef.current },
      duration: startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0,
      timestamp: new Date().toISOString()
    };

    saveSession(sessionData);
    setSessions(getSessions());
    setCurrentReportData(sessionData);
    setShowReport(true);
    resetSession();
    speak('Session complete. Report generated.');
  };

  // Display the latest rep's ROM for the metrics bar
  const displayROM = latestROM;

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand">
          <span className="brand-meta">v1</span>
          <h1>rehabilitation</h1>
        </div>
        <div className="header-controls">
          <ExerciseSelector selectedExercise={selectedExerciseId} onSelect={setSelectedExerciseId} />
          <div className="target-input-wrap">
            <label className="target-label" htmlFor="target-reps">Target</label>
            <input
              id="target-reps"
              type="number"
              min="1"
              max="100"
              value={targetReps}
              onChange={(e) => setTargetReps(Math.max(1, parseInt(e.target.value) || 1))}
              className="target-input"
            />
          </div>
          <button onClick={finishSession} className="finish-btn">Finish Session</button>
        </div>
      </header>

      <div className="main-content">
        <CameraPanel
          videoRef={videoRef}
          canvasRef={canvasRef}
          videoSource={videoSource}
          onStartCamera={startCamera}
          onFileUpload={handleFileUpload}
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
          onPlay={() => { if (videoSource === 'file') processVideoFrames(); }}
          feedback={feedback}
          reps={reps}
          romScore={displayROM}
          stabilityScore={latestStability}
          targetReps={targetReps}
        />

        <div className="sidebar">
          <TherapistPanel
            exerciseId={selectedExerciseId}
            repROMScores={repROMScores}
            latestROM={latestROM}
            latestAngle={latestAngle}
          />
          <ReferencePanel exerciseId={selectedExerciseId} />
          <SessionHistory
            sessions={sessions}
            onClear={() => { clearSessions(); setSessions([]); }}
            onViewReport={(session) => {
              setCurrentReportData(session);
              setShowReport(true);
            }}
          />
        </div>
      </div>

      {showReport && (
        <TherapistReport
          data={currentReportData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
