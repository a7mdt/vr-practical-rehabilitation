# Tele-rehabilitation - Engineering Diagrams

## 1. C4 Model - Level 1: System Context

Shows how Tele-rehabilitation interacts with users and the environment.

```mermaid
C4Context
    title System Context Diagram for Tele-rehabilitation

    Person(patient, "Patient", "Individual performing rehabilitation exercises at home.")
    Person(therapist, "Physiotherapist", "Medical professional reviewing patient progress.")
    
    System(rehab_ai, "Tele-rehabilitation Platform", "Real-time AI rehabilitation assistant and diagnostic tool.")
    
    System_Ext(camera, "Device Camera", "Hardware capturing video stream.")
    System_Ext(browser, "Web Browser", "Runtime environment (Chrome, Safari).")

    Rel(patient, rehab_ai, "Performs exercises, views feedback")
    Rel(therapist, rehab_ai, "Reviews reports, sets targets")
    Rel(camera, rehab_ai, "Provides video frames")
    Rel(rehab_ai, browser, "Uses WebAssembly, LocalStorage, TTS")
```

## 2. C4 Model - Level 2: Containers

Technical containers within the Tele-rehabilitation platform.

```mermaid
C4Container
    title Container Diagram for Tele-rehabilitation

    Container(react_app, "React SPA", "JavaScript/React", "Main UI and application logic.")
    Container(mediapipe, "MediaPipe Pose", "WASM/C++", "High-performance skeletal landmark detection.")
    ContainerDb(local_storage, "LocalStorage", "Browser Storage", "Persists session history and metrics.")
    Container(web_speech, "Web Speech API", "Browser API", "Generates audio corrective feedback.")

    Rel(react_app, mediapipe, "Sends video frames", "postMessage/WASM")
    Rel(mediapipe, react_app, "Returns 33 landmarks", "JSON")
    Rel(react_app, local_storage, "Saves/Reads sessions", "JSON/Key-Value")
    Rel(react_app, web_speech, "Triggers voice cues", "SpeechSynthesis")
```

## 3. C4 Model - Level 3: Components

Internal structure of the React SPA.

```mermaid
C4Component
    title Component Diagram for Tele-rehabilitation (React SPA)

    Component(app_main, "App.jsx (Main Loop)", "React Component", "Coordinates frame pump, state, and phase transitions.")
    Component(exercise_engine, "Exercise Modules", "JavaScript Logic", "Clinical rules, ROM calculation, and form validation.")
    Component(ui_layer, "UI Components", "React/CSS", "PreSession, TherapistPanel, TherapistReport.")
    Component(data_utils, "Data Utilities", "JS Functions", "LocalStorage wrappers, Angle math, Canvas drawing.")

    Rel(app_main, exercise_engine, "Calls analyze(landmarks)")
    Rel(app_main, ui_layer, "Provides state (reps, feedback)")
    Rel(app_main, data_utils, "Uses for math/storage")
    Rel(exercise_engine, data_utils, "Uses for angle calculations")
```

## 4. Repetition State Machine

Logic for tracking clinical-grade repetitions.

```mermaid
stateDiagram-v2
    [*] --> UP
    UP --> DOWN : Primary Joint < Threshold (Flexion)
    DOWN --> UP : Primary Joint > Threshold (Extension)
    
    state DOWN {
        [*] --> TrackingPeak
        TrackingPeak --> TrackingPeak : Update Min/Max Angle
    }
    
    state UP {
        [*] --> Validating
        Validating --> Counted : Form Valid && Depth Met
        Validating --> Discarded : Poor Form || Depth Not Met
    }
    
    Counted --> [*]
    Discarded --> [*]
```

## 5. Frame Processing Sequence

The lifecycle of a single video frame.

```mermaid
sequenceDiagram
    participant V as Video Element
    participant A as App.jsx
    participant M as MediaPipe
    participant E as Exercise Module
    participant U as UI State

    loop Every Frame (requestAnimationFrame)
        A->>M: pose.send({image: video})
        M-->>A: onResults(landmarks)
        A->>E: analyze(landmarks, stage)
        E-->>A: {stage, feedback, isGoodRep, angles}
        alt isGoodRep == true
            A->>U: Increment Reps, Update ROM History
        end
        A->>U: Update Feedback & Gauge UI
        A->>V: Draw Skeleton Overlay
    end
```

## 6. Use Case Diagram

High-level system interactions.

```mermaid
flowchart LR
    Patient((Patient))
    Therapist((Therapist))

    subgraph "Tele-rehabilitation Platform"
        UC1([Select Exercise])
        UC2([Start Session])
        UC3([Perform Reps w/ Feedback])
        UC4([View Session History])
        UC5([Generate Therapist Report])
        UC6([Print Report])
    end

    Patient --- UC1
    Patient --- UC2
    Patient --- UC3
    Patient --- UC4
    Therapist --- UC4
    Therapist --- UC5
    Therapist --- UC6
```

## 7. Entity Relationship Diagram (ERD)

Structure of stored session data.

```mermaid
erDiagram
    SESSION ||--o{ REP_SCORE : contains
    SESSION {
        string exercise_name
        int total_reps
        int avg_rom_score
        float latest_asymmetry
        float latest_stability
        json phase_timing
        int duration_seconds
        timestamp created_at
    }
    REP_SCORE {
        int rep_number
        int rom_score
        float angle
    }
```

## 8. Component Hierarchy

React component tree.

```mermaid
graph TD
    App --> PreSessionScreen
    App --> StageArea
    App --> TherapistPanel
    App --> SessionHistory
    App --> TherapistReport
    App --> ErrorOverlay
    App --> GoodFormBadge
    App --> VideoReferenceModal

    StageArea --> VideoElement
    StageArea --> OutputCanvas
```
