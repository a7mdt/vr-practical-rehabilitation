# PRD: Tele-rehabilitation - Clinical-Grade Rehabilitation Assistant

## 1. Executive Summary

Tele-rehabilitation is a diagnostic-first platform designed to bridge the gap between clinical physiotherapy and home-based recovery. Unlike generic fitness apps, Tele-rehabilitation focuses on medical precision, ROM (Range of Motion) accuracy, and clinical reporting to ensure patients recover safely and effectively from surgery or injury.

## 2. Problem Statement

Patients recovering from orthopedic surgeries or significant injuries often struggle with:

- **Incorrect Form**: Performing exercises without supervision leads to suboptimal recovery or re-injury.
- **Subjective Progress**: Lack of hard data on ROM and stability makes it difficult for therapists to track objective progress.
- **Motivation Gap**: Home exercises can feel isolating and unrewarding without immediate feedback.

## 3. Goals & Objectives

- **Clinical Precision**: Capture raw peak angles for medical charts.
- **Real-time Feedback**: Provide instant corrective cues via visual and audio channels.
- **Therapist Integration**: Generate print-ready reports that integrate seamlessly into clinical workflows.
- **Accessibility**: Support mobile and desktop browsers without specialized hardware (e.g., VR headsets).

## 4. User Personas

### A. The Patient (Post-Op)

- **Need**: Guided exercises with immediate "Am I doing this right?" feedback.
- **Constraint**: Limited mobility, potentially using a smartphone on a tripod.

### B. The Physiotherapist

- **Need**: Objective data (ROM, Symmetry, Stability) to adjust treatment plans.
- **Constraint**: High patient load, needs "one-glance" reports.

## 5. Key Features

- **AI Pose Estimation**: Real-time skeletal tracking using MediaPipe.
- **Clinical Rule Engine**: Exercise-specific logic for form validation (e.g., Squat depth vs. Back angle).
- **TTS Feedback**: Audio cues for hands-free correction.
- **Session History**: Longitudinal tracking of recovery metrics.
- **Therapist Report**: A4-optimized diagnostic assessment summary.

## 6. Success Metrics

- **Accuracy**: ROM measurements within +/- 5 degrees of manual goniometer readings.
- **Engagement**: Completion rate of prescribed home exercise programs.
- **Outcome**: Faster return to functional baseline for post-op patients.
