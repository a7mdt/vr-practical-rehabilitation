import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import "./index.css";


import { speak } from "./utils/speech";
import {
  saveSession,
  getSessions,
  clearSessions,
} from "./utils/sessionStorage";
import { drawSkeleton } from "./utils/canvasDrawing";
import { ROM_CONFIG, computeROMScore } from "./utils/romConfig";

import { Activity, CircleCheckBig, Shield, Zap, BarChart3, ChevronRight, HeartPulse, Brain, Fingerprint, X, History, Trash2, AlertTriangle } from "lucide-react";



import { motion, AnimatePresence  } from "framer-motion";

import CameraPanel from "./components/CameraPanel";

import ReferencePanel from "./components/ReferencePanel";
import TherapistPanel from "./components/TherapistPanel";
import ExerciseSelector from "./components/ExerciseSelector";
import SessionHistory from "./components/SessionHistory";
import TherapistReport from "./components/TherapistReport";

import { exercises, getExercise } from "./exercises";
import LandingPage from "./components/LandingPage";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectionStep, setSelectionStep] = useState(1); // 1: features, 2: pick exercise
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);







  const videoRef = useRef(null);


  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameId = useRef(null);

  // Tracking refs (stable across renders, no stale closure)
  const stageRef = useRef("UP");
  const repsRef = useRef(0);
  const startTimeRef = useRef(null);
  const currentExerciseRef = useRef(null);
  const feedbackRef = useRef({ text: "Ready to start", type: "neutral" });

  // ROM tracking
  const peakAngleRef = useRef(null); // minimum primary angle seen in current rep's DOWN phase
  const prevAngleRef = useRef(null); // previous frame raw angle — used to filter extreme noise
  const smoothedAngleRef = useRef(null); // low-pass filtered angle to reduce jitter
  const baselineAngleRef = useRef(165); // captured starting posture (dynamic baseline)

  // Block body scroll when modal is open
  useEffect(() => {
    if (isQuickStartOpen || isHistoryOpen || showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isQuickStartOpen, isHistoryOpen, showDeleteConfirm]);


  // Phase Timing (TUT)
  const phaseStartTimeRef = useRef(null);
  const phaseDurationsRef = useRef({ eccentric: 0, concentric: 0 });

  // State
  const [selectedExerciseId, setSelectedExerciseId] = useState("squats");
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState({
    text: "Ready to start",
    type: "neutral",
  });
  const [videoSource, setVideoSource] = useState("camera");
  const [sessions, setSessions] = useState([]);
  const [latestROM, setLatestROM] = useState(null);
  const [latestAngle, setLatestAngle] = useState(null);
  const [latestAsymmetry, setLatestAsymmetry] = useState(null);
  const [latestStability, setLatestStability] = useState(null);
  const [repROMScores, setRepROMScores] = useState([]);
  const [targetReps, setTargetReps] = useState(10);
  const [showReport, setShowReport] = useState(false);
  const [currentReportData, setCurrentReportData] = useState(null);
  const [hasStream, setHasStream] = useState(false);

  // Initialize MediaPipe once
  useEffect(() => {
    setSessions(getSessions());
    currentExerciseRef.current = getExercise("squats");

    if (!window.Pose) {
      console.error("MediaPipe not loaded");
      return;
    }

    const pose = new window.Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults(onResults);
    poseRef.current = pose;

    setTimeout(() => startCamera(), 100);
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
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
    if (
      type === "error" ||
      text.includes("achieved") ||
      text.includes("counted") ||
      text === "Perfect!"
    )
      speak(text);
  };

  const onResults = (results) => {
    const canvasElement = canvasRef.current;
    const videoElement = videoRef.current;
    if (!canvasElement || !videoElement) return;

    const ctx = canvasElement.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results && results.poseLandmarks && videoElement.videoWidth > 0) {
      const exercise = currentExerciseRef.current;
      if (!exercise) {
        ctx.restore();
        return;
      }

      drawSkeleton(ctx, results.poseLandmarks, window.POSE_CONNECTIONS);

      try {
        const analysis = exercise.analyze(
          results.poseLandmarks,
          stageRef.current,
        );
        if (!analysis) {
          ctx.restore();
          return;
        }

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
            const isExtremeJump =
              prevRaw !== null && Math.abs(rawAngle - prevRaw) > 40;
            prevAngleRef.current = rawAngle;

            if (!isExtremeJump) {
              // 3. Exponential Smoothing (alpha = 0.2) to reduce jitter
              if (smoothedAngleRef.current === null) {
                smoothedAngleRef.current = rawAngle;
              } else {
                smoothedAngleRef.current =
                  smoothedAngleRef.current * 0.8 + rawAngle * 0.2;
              }
              const currentAngle = smoothedAngleRef.current;

              // 4. Dynamic Baseline (Capture resting posture while stable in UP position)
              if (stageRef.current === "UP" && !analysis.isGoodRep) {
                // Heavier weight on baseline (0.98) to prevent drift during movement
                baselineAngleRef.current =
                  baselineAngleRef.current * 0.98 + rawAngle * 0.02;
              }

              // 5. Peak Detection Logic (Using rawAngle to avoid smoothing lag)
              if (stageRef.current === "UP" && analysis.stage === "DOWN") {
                peakAngleRef.current = rawAngle;
              } else if (stageRef.current === "DOWN") {
                // Track minimum (deepest flexion)
                if (
                  peakAngleRef.current === null ||
                  rawAngle < peakAngleRef.current
                ) {
                  peakAngleRef.current = rawAngle;
                }
              }

              // ── Phase Timing (TUT Tracking) ───────────────────
              if (analysis.stage !== stageRef.current) {
                const now = Date.now();
                if (phaseStartTimeRef.current) {
                  const duration = (now - phaseStartTimeRef.current) / 1000;
                  // If we just finished DOWN, that was the eccentric phase
                  if (stageRef.current === "DOWN")
                    phaseDurationsRef.current.eccentric = duration;
                  // If we just finished UP, that was the concentric phase
                  if (stageRef.current === "UP")
                    phaseDurationsRef.current.concentric = duration;
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
            const isCorrectView =
              !analysis.viewType ||
              analysis.viewType === (cfg.requiredView || "side");

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
              setRepROMScores((prev) => [...prev, score]);

              // Update clinical assessment states
              if (analysis.angles) {
                if (analysis.angles.asymmetry !== undefined)
                  setLatestAsymmetry(analysis.angles.asymmetry);
                if (analysis.angles.stability !== undefined)
                  setLatestStability(analysis.angles.stability);
              }

              // ── Perfect Score Reward ─────────────────────
              if (score >= 100) {
                updateFeedback("Perfect!", "good");
              }
            } else {
              // Rep counted but ROM invalid due to camera angle
              updateFeedback(
                "Rep counted, but stand sideways for ROM analysis",
                "neutral",
              );
            }

            // Reset peak for next rep
            peakAngleRef.current = null;
          }
        }

        if (analysis.stage) stageRef.current = analysis.stage;

        if (analysis.feedback) {
          const text =
            typeof analysis.feedback === "string"
              ? analysis.feedback
              : analysis.feedback.text;
          const type =
            typeof analysis.feedback === "string"
              ? "neutral"
              : analysis.feedback.type || "neutral";
          if (text) updateFeedback(text, type);
        }
      } catch (err) {
        console.error("Analysis error:", err);
      }
    } else if (results && !results.poseLandmarks) {
      updateFeedback("Position yourself in view to begin", "neutral");
    }

    ctx.restore();
  };

  const startCamera = async () => {
    setVideoSource("camera");
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.style.transform = "scaleX(-1)";
    canvas.style.transform = "scaleX(-1)";

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateFeedback(
        "Camera API not available — try a modern browser or check HTTPS",
        "neutral",
      );
      return;
    }

    // Try multiple constraint sets as fallbacks
    const constraintSets = [
      { video: { width: 640, height: 480, facingMode: "user" }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let stream = null;
    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (_) {
        continue;
      }
    }

    if (!stream) {
      // Check permission state if available
      try {
        const permResult = await navigator.permissions.query({ name: "camera" });
        if (permResult.state === "denied") {
          updateFeedback(
            "Camera permission denied — check browser settings",
            "neutral",
          );
          return;
        }
      } catch (_) {}
      updateFeedback(
        "Camera unavailable — close other apps using it, or upload a video",
        "neutral",
      );
      return;
    }

    try {
      video.srcObject = stream;
      video.src = "";
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        cameraRef.current = {
          stop: () => stream.getTracks().forEach((t) => t.stop()),
        };
        setHasStream(true);
        pumpCameraFrames();
      };
    } catch (err) {
      console.warn("Camera setup error:", err.message);
      updateFeedback(
        "Camera error — upload a video to analyse",
        "neutral",
      );
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = "";
    }
    setHasStream(false);
    updateFeedback("Ready to start", "neutral");
  };

  const pumpCameraFrames = async () => {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    if (video.readyState >= 2 && video.videoWidth > 0 && poseRef.current) {
      try {
        await poseRef.current.send({ image: video });
      } catch (_) {}
    }
    animationFrameId.current = requestAnimationFrame(pumpCameraFrames);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoSource("file");
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.srcObject) video.srcObject = null;

    video.style.transform = "scaleX(1)";
    canvas.style.transform = "scaleX(1)";
    video.src = URL.createObjectURL(file);
    video.load();
    video.oncanplay = () => {
      video.play();
      setHasStream(true);
    };
  };

  const processVideoFrames = async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;
    if (poseRef.current && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        await poseRef.current.send({ image: video });
      } catch (_) {}
    }
    animationFrameId.current = requestAnimationFrame(processVideoFrames);
  };

  const resetSession = () => {
    currentExerciseRef.current?.reset?.();
    repsRef.current = 0;
    stageRef.current = "UP";
    startTimeRef.current = null;
    peakAngleRef.current = null;
    prevAngleRef.current = null;
    smoothedAngleRef.current = null;
    const cfg = ROM_CONFIG[currentExerciseRef.current?.id];
    baselineAngleRef.current = cfg?.startAngle ?? 165;
    feedbackRef.current = { text: 'Ready to start', type: 'neutral' };
    setReps(0);
    setFeedback({ text: "Ready to start", type: "neutral" });
    setRepROMScores([]);
    setLatestROM(null);
    setLatestAngle(null);
    setLatestAsymmetry(null);
    setLatestStability(null);
    setHasStream(false);
    phaseStartTimeRef.current = null;
    phaseDurationsRef.current = { eccentric: 0, concentric: 0 };
  };

  const finishSession = () => {
    if (repsRef.current === 0) return;
    const exercise = currentExerciseRef.current;
    if (!exercise) return;
    const avgROM =
      repROMScores.length > 0
        ? Math.round(
            repROMScores.reduce((a, b) => a + b, 0) / repROMScores.length,
          )
        : null;

    const sessionData = {
      exercise: exercise.name,
      reps: repsRef.current,
      goodReps: repsRef.current,
      romScore: avgROM,
      latestAsymmetry,
      latestStability,
      phaseTiming: { ...phaseDurationsRef.current },
      duration: startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0,
      timestamp: new Date().toISOString(),
    };

    saveSession(sessionData);
    setSessions(getSessions());
    setCurrentReportData(sessionData);
    setShowReport(true);
    resetSession();
    speak("Session complete. Report generated.");
  };

  // Display the latest rep's ROM for the metrics bar
  // Display the latest rep's ROM for the metrics bar
  const displayROM = latestROM;

  // ────────────────────────────────────────────────────────────────────────
  // New Render Flows
  // ────────────────────────────────────────────────────────────────────────


  const renderOnboarding = () => {
    const features = [
      { Icon: Fingerprint, title: 'Medical Privacy', desc: 'Your health data is protected by industry-leading encryption and localized processing, ensuring full HIPAA compliance and absolute patient confidentiality at every step.', color: 'oklch(90% 0.08 250)', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
      { Icon: Zap, title: 'Real-time AI', desc: 'Our advanced computer vision models analyze key body landmarks in real-time to provide immediate corrective feedback, optimizing your form and preventing secondary injuries.', color: 'oklch(90% 0.12 150)', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
      { Icon: BarChart3, title: 'Clinical Metrics', desc: 'Quantify your recovery with lab-grade accuracy. Track range-of-motion, limb symmetry, and session consistency through interactive data visualizations.', color: 'oklch(90% 0.12 280)', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    ];


    return (
      <div className="w-full min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-8 overflow-hidden relative">
        {/* Top Header with Logo (Smaller) */}
        <div className="absolute top-8 left-10 z-20">
          <div className="brand-new scale-90 origin-left" onClick={() => navigate("/")}>
            <div className="brand-icon-box !w-9 !h-9 !rounded-xl">
              <Activity size={18} />
            </div>
            <span className="brand-text !text-lg">
              rehabilitation<span className="text-brand-primary">.ai</span>
            </span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[1200px] w-full"
        >
          <div className="text-center mb-16 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
                Onboarding
              </span>
            </motion.div>
            <h1 className="text-6xl font-black tracking-tighter mb-4">Next-Gen Recovery</h1>
            <p className="text-gray-400 font-bold">Experience clinical excellence powered by artificial intelligence.</p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover="hover"
                className="group relative p-12 rounded-[48px] bg-white border border-black/[0.03] shadow-xl shadow-black/5 flex flex-col items-start overflow-hidden cursor-default min-h-[320px]"
              >
                {/* Top-Right Decorative Curve */}
                <motion.div 
                  variants={{
                    hover: { scale: 1.8, backgroundColor: f.color }
                  }}
                  className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gray-50/50 transition-colors duration-500"
                />

                {/* Background Icon (Synced with Main Icon) */}
                <div className="absolute -bottom-12 -right-12 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-1000 text-black">
                  <f.Icon size={240} strokeWidth={1} />
                </div>

                {/* Header: Icon + Title Beside Each Other */}
                <div className="relative z-10 flex items-center gap-6 mb-8">
                  <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center ${f.iconColor} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                    <f.Icon size={26} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-gray-800">{f.title}</h3>
                </div>
                
                <div className="relative z-10">
                  <p className="text-sm leading-relaxed text-gray-400 font-bold group-hover:text-gray-500 transition-colors">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/selection")}
              className="px-16 py-5 duration-300 bg-[#1a1a1a] text-white rounded-[32px] text-xl font-black shadow-2xl shadow-black/30 flex items-center gap-4 cursor-pointer group"
            >
              Continue to Selection 
              <motion.div 
                animate={{ x: [0, 5, 0] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ChevronRight size={28} strokeWidth={3} />
              </motion.div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderSelection = () => {
    const exList = Object.values(exercises);

    return (
      <div className="w-full min-h-screen bg-[#fafafa] p-12 flex flex-col items-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
          <Activity size={800} strokeWidth={0.5} />
        </div> */}

        {/* Top Header with Logo (Smaller) */}
        <div className="absolute top-8 left-10 z-20">
          <div className="brand-new scale-90 origin-left" onClick={() => navigate("/")}>
            <div className="brand-icon-box !w-9 !h-9 !rounded-xl">
              <Activity size={18} />
            </div>
            <span className="brand-text !text-lg">
              rehabilitation<span className="text-brand-primary">.ai</span>
            </span>
          </div>
        </div>


        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[1200px] w-full relative z-10"
        >
          <div className="text-center mb-16 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
                Onboarding Flow
              </span>
            </motion.div>
            <h1 className="text-6xl font-black mb-4 tracking-tighter">Exercises</h1>
            <p className="text-lg text-gray-400 font-bold">Select an exercise to begin your session</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-20">

            {exList.map((ex, i) => {
              const isSelected = selectedExerciseId === ex.id;
              const numStr = `0${i + 1}`;
              return (
                <motion.div
                  key={ex.id}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className={`group relative p-12 py-16 rounded-[48px] bg-white/70 backdrop-blur-md border-2 cursor-pointer transition-all duration-700 overflow-hidden flex flex-col items-center justify-center text-center min-h-[220px]
                    ${isSelected 
                      ? 'border-brand-primary shadow-2xl shadow-brand-primary/10 bg-brand-primary/[0.02]' 
                      : 'border-black/[0.03] shadow-sm hover:border-black/10'}`}
                >
                  {/* Background Large Number */}
                  <div className="absolute -bottom-10 -left-6 text-[160px] font-black text-black/[0.02] pointer-events-none select-none tracking-tighter leading-none transition-all duration-700 group-hover:opacity-[0.05] group-hover:scale-110">
                    {numStr}
                  </div>


                  {/* Selection Indicator Glow */}
                  {isSelected && (
                    <motion.div 
                      layoutId="cardGlow"
                      className="absolute inset-0 bg-brand-primary/5 blur-3xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}

                  {/* Top Left Hash Number */}
                  <div className="absolute top-8 left-10 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-brand-primary mt-1">#</span>
                    <span className={`text-base font-black tracking-tighter ${isSelected ? 'text-brand-primary' : 'text-gray-400'}`}>{numStr}</span>
                  </div>

                  <div className={`absolute top-8 right-10 transition-all duration-500 ${isSelected ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}>
                    <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/30">
                      <CircleCheckBig size={14} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className={`text-2xl font-black leading-tight transition-all duration-500 ${isSelected ? 'text-gray-900 scale-105' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {ex.name}
                    </h3>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">

            {selectedExerciseId && (
              <motion.div
                key={selectedExerciseId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12 border-t border-black/[0.05]"
              >
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <span className="text-xs font-black text-brand-primary">01</span>
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Reference Guide</h3>
                  </div>
                  <ReferencePanel exerciseId={selectedExerciseId} />
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <span className="text-xs font-black text-brand-primary">02</span>
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Configuration</h3>
                  </div>

                  <div className="flex flex-col justify-center items-center bg-white/70 backdrop-blur-md p-16 rounded-[48px] border border-black/[0.03] shadow-xl shadow-black/5 relative overflow-hidden group min-h-[400px]">
                    {/* Decorative background circle */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125" />
                    
                    <div className="flex flex-col items-center gap-10 w-full relative z-10">
                      <div className="text-center">
                        <p className="text-3xl font-black tracking-tight text-gray-800 mb-2">Target Repetitions</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prescribed Volume</p>
                      </div>

                      <div className="relative">
                        <input 
                          type="number"
                          value={targetReps}
                          onChange={(e) => setTargetReps(Math.max(1, parseInt(e.target.value) || 1))}
                          className="text-8xl font-black text-center w-48 bg-transparent border-none focus:ring-0 outline-none p-0 text-brand-primary selection:bg-brand-primary/10"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        />
                        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsSessionActive(true);
                          navigate("/dashboard");
                        }}
                        className="w-full py-6 bg-[#1a1a1a] text-white rounded-[24px] text-lg font-black uppercase tracking-widest shadow-2xl shadow-black/20 flex items-center justify-center gap-4 cursor-pointer"
                      >
                        Start Session <ChevronRight size={20} strokeWidth={3} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    );
  };





  const renderQuickStartModal = () => {
    return (
      <AnimatePresence>
        {isQuickStartOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickStartOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl overflow-visible p-10"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsQuickStartOpen(false)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6">
                  <Zap size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Quick Initialization</h2>
                <p className="text-gray-400 font-bold">Configure and launch session instantly</p>
              </div>

              <div className="space-y-10">
                <div className="space-y-3">
                  {/* <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Select Exercise</label> */}
                  <div className="w-full">
                    <ExerciseSelector 
                      selectedExercise={selectedExerciseId}
                      onSelect={setSelectedExerciseId}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">How many Reps will u do</label>

                  <div className="relative">
                    <style>{`
                      input[type='number']::-webkit-inner-spin-button,
                      input[type='number']::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }
                      input[type='number'] {
                        -moz-appearance: textfield;
                      }
                    `}</style>
                    <input 
                      type="number"
                      value={targetReps}
                      onChange={(e) => setTargetReps(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-5 bg-gray-50 border border-black/[0.03] rounded-2xl text-2xl font-black focus:ring-2 focus:ring-brand-primary/10 transition-all outline-none"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">REPS</span>
                  </div>

                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedExerciseId}
                  onClick={() => {
                    setIsSessionActive(true);
                    setIsQuickStartOpen(false);
                    navigate("/dashboard");
                  }}
                  className="w-full py-6 bg-[#1a1a1a] text-white rounded-[24px] text-lg font-black uppercase tracking-widest shadow-2xl shadow-black/20 flex items-center justify-center gap-4 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  Start Session <ChevronRight size={20} strokeWidth={3} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderHistoryModal = () => {
    return (
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-[800px] bg-[#fafafa] rounded-[48px] shadow-2xl overflow-hidden p-12 max-h-[85vh] flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="absolute top-10 right-10 p-3 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900 cursor-pointer z-20"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="flex items-center gap-6 mb-12">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                  <History size={32} />
                </div>
                <div className="text-left">
                  <h2 className="text-4xl font-black tracking-tight mb-1 text-gray-900">Session History</h2>
                  <p className="text-gray-400 font-bold">Track your recovery progress over time</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <SessionHistory 
                  sessions={sessions}
                  onClear={() => setShowDeleteConfirm(true)}
                  onViewReport={(session) => {
                    setCurrentReportData(session);
                    setShowReport(true);
                    setIsHistoryOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderDeleteAlert = () => {
    return (
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[400px] bg-white rounded-[40px] shadow-2xl overflow-hidden p-6 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-8">
                <Trash2 size={36} strokeWidth={2.5} />
              </div>
              
              <h3 className="text-2xl font-black mb-3">Delete Records?</h3>
              <p className="text-gray-400 font-bold mb-10 leading-relaxed px-4">
                This action cannot be undone. All clinical session history will be permanently removed.
              </p>

              <div className="flex flex-row gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl text-base font-black hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearSessions();
                    setSessions([]);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full py-5 bg-red-500 text-white rounded-2xl text-base font-black hover:bg-red-600 transition-all cursor-pointer shadow-lg shadow-red-200"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="app-main">
      {renderQuickStartModal()}
      {renderHistoryModal()}
      {renderDeleteAlert()}


      <Routes>
        <Route path="/" element={
          <LandingPage onGetStarted={() => navigate("/onboarding")} />
        } />


      <Route path="/onboarding" element={renderOnboarding()} />
      <Route path="/selection" element={renderSelection()} />
      <Route path="/dashboard" element={
        <div className="app-container">
          <header className="header">
            <div
              className="brand-new"
              onClick={() => {
                setIsSessionActive(false);
                navigate("/");
              }}
            >

          <div className="brand-icon-box">
            <Activity size={22} />
          </div>
          <span className="brand-text">
            rehabilitation<span className="text-brand-primary">.ai</span>
          </span>
        </div>

        <div className="header-controls">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-black/[0.05] text-gray-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer"
            >
              <History size={16} />
              History
            </button>

            {isSessionActive ? (
              <button 
                onClick={() => {
                  finishSession();
                  setIsSessionActive(false);
                }} 
                className="finish-btn"
              >
                Finish Session
              </button>
            ) : (
              <button
                onClick={() => setIsQuickStartOpen(true)}
                className="px-6 py-3 bg-brand-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all active:scale-95 cursor-pointer"
              >
                Start Session
              </button>
            )}
          </div>


        </div>
      </header>


      <div className="flex flex-col gap-6 w-full">
        <ReferencePanel exerciseId={selectedExerciseId} isDashboard={true} />
        
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
            onPlay={() => {
              if (videoSource === "file") processVideoFrames();
            }}
            feedback={feedback}
            reps={reps}
            romScore={displayROM}
            stabilityScore={latestStability}
            targetReps={targetReps}
            isSessionActive={isSessionActive}
            hasStream={hasStream}
            onStopCamera={stopCamera}
          />


          <div className="sidebar flex flex-col gap-6">

          <TherapistPanel
            exerciseId={selectedExerciseId}
            repROMScores={repROMScores}
            latestROM={latestROM}
            latestAngle={latestAngle}
          />

          <div className="bg-white border border-black/[0.05] rounded-[32px] overflow-hidden shadow-sm p-6">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-4 block">Session Statistics</span>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reps</span>
                <span className="text-xl font-black text-gray-900">
                  {reps} <span className="text-sm text-gray-400">/ {targetReps}</span>
                </span>
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">ROM Score</span>
                <span className={`text-xl font-black ${latestROM !== null ? (latestROM >= 88 ? 'text-emerald-500' : latestROM >= 65 ? 'text-brand-primary' : latestROM >= 40 ? 'text-orange-500' : 'text-red-500') : 'text-gray-400'}`}>
                  {latestROM !== null ? `${latestROM}%` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stability</span>
                <span className={`text-xl font-black ${latestStability !== null ? (latestStability >= 70 ? 'text-emerald-500' : 'text-red-500') : 'text-gray-400'}`}>
                  {latestStability !== null ? `${Math.round(latestStability)}%` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complete</span>
                <span className={`text-xl font-black ${Math.min(100, (reps / targetReps) * 100) >= 100 ? 'text-emerald-500' : 'text-gray-900'}`}>
                  {Math.round(Math.min(100, (reps / targetReps) * 100))}%
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>


      {showReport && (
        <TherapistReport
          data={currentReportData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
      } />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}


