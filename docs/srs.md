# SRS: Tele-rehabilitation Software Requirements Specification

## 1. Introduction

This document specifies the functional and non-functional requirements for the Tele-rehabilitation platform.

## 2. Functional Requirements

### 2.1 Motion Tracking

- **FR-1**: The system MUST utilize MediaPipe Pose for 33-point skeletal landmark detection.
- **FR-2**: The system MUST support real-time coordinate extraction at a minimum of 20 FPS on modern mobile devices.

### 2.2 Clinical Analysis

- **FR-3**: The system MUST calculate joint angles using the dot product formula.
- **FR-4**: The system MUST track repetition stages (UP/DOWN/UP) based on exercise-specific thresholds.
- **FR-5**: The system MUST validate form using secondary joint checks (e.g., knee drift during squats).

### 2.3 User Feedback

- **FR-6**: The system MUST display real-time visual feedback (Good Form Badge, Error Overlay).
- **FR-7**: The system MUST provide audio corrective cues using the Web Speech API.

### 2.4 Data Persistence & Reporting

- **FR-8**: The system MUST store session summaries in Browser LocalStorage.
- **FR-9**: The system MUST generate a print-optimized (A4) therapist report.

## 3. Non-Functional Requirements

### 3.1 Performance

- **NFR-1**: Processing latency per frame (capture to analysis) SHOULD be less than 50ms.
- **NFR-2**: The initial application bundle size SHOULD be under 5MB (excluding MediaPipe WASM).

### 3.2 Usability

- **NFR-3**: The interface MUST follow accessibility standards for patients with limited mobility.
- **NFR-4**: High-contrast UI MUST be used for clinical clarity.

### 3.3 Reliability

- **NFR-5**: The system MUST handle camera disconnection gracefully with an error overlay.
- **NFR-6**: Motion smoothing MUST be applied to prevent jitter in ROM calculations.

## 4. Technical Constraints

- **TC-1**: Must run in a web browser (Chrome/Safari/Firefox).
- **TC-2**: No server-side processing for motion data (Privacy by Design).
- **TC-3**: React 18+ for UI and state management.
