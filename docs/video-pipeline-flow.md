# Video Recording Pipeline Flow Diagram

## Visual Pipeline Overview

```mermaid
graph TB
    subgraph "Phase 1: Recording → Blob Creation (FAST: ~100ms)"
        A[User clicks Stop] --> B[MediaRecorder.stop]
        B --> C[Collect data chunks]
        C --> D[Create Blob]
        D --> E[URL.createObjectURL]
        E --> F[State update with URL]
    end

    subgraph "Phase 2: Processing (SLOW: 5-30+ seconds)"
        F --> G[Create take object]
        G --> H[Add to UI with spinner]
        H --> I[Fetch blob from URL]
        I --> J{FFmpeg Remuxing}
        J --> K[Load FFmpeg WASM ~500ms-2s]
        K --> L[Queue job sequentially]
        L --> M[Write to virtual FS ~100-500ms]
        M --> N[🔴 libx264 re-encode ~5-30s]
        N --> O[Read from virtual FS ~100-500ms]
        O --> P[Create optimized blob]
        P --> Q{Persist enabled?}
        Q -->|Yes| R[🟡 IndexedDB save ~1-3s]
        Q -->|No| S[Skip persistence]
        R --> T[Remove processing flag]
        S --> T
    end

    subgraph "Phase 3: Availability (INSTANT)"
        T --> U[Download button active]
        T --> V[Video playback ready]
    end

    style N fill:#ff6b6b,stroke:#c92a2a
    style R fill:#ffd43b,stroke:#f08c00
    style A fill:#51cf66,stroke:#2f9e44
    style U fill:#51cf66,stroke:#2f9e44
    style V fill:#51cf66,stroke:#2f9e44
```

## Bottleneck Heatmap

```mermaid
gantt
    title Video Processing Timeline (30-second recording)
    dateFormat X
    axisFormat %Ss

    section Fast
    Blob creation           :done, 0, 100
    Take added to UI        :done, 100, 200

    section Slow
    Fetch blob              :active, 200, 500
    FFmpeg WASM load        :active, 500, 2000
    FS write                :active, 2000, 2500
    libx264 re-encode       :crit, 2500, 19500
    FS read                 :active, 19500, 20000
    IndexedDB save          :crit, 20000, 22000

    section Ready
    Video available         :milestone, 22000, 0
```

## Sequential Queue Impact

```mermaid
graph LR
    subgraph "Current: Sequential Processing"
        V1[Video 1<br/>10s] --> V2[Video 2<br/>10s] --> V3[Video 3<br/>10s]
    end
    
    subgraph "Time to All Available"
        T1[30 seconds total]
    end
    
    V1 -.-> T1
    V2 -.-> T1
    V3 -.-> T1
    
    style V1 fill:#ff6b6b
    style V2 fill:#ff8787
    style V3 fill:#ffa8a8
```

## Proposed Solution: Dual-Track Architecture

```mermaid
graph TB
    A[Recording Stops] --> B[Create Original Blob]
    B --> C[URL.createObjectURL]
    C --> D[✅ INSTANT: Add to UI - Download Ready]
    
    B --> E[Background: Start Remuxing]
    E --> F[FFmpeg Processing]
    F --> G[Optimized Blob Ready]
    G --> H[Show 'Optimized' Badge]
    
    D --> I{User Action}
    I -->|Download Original| J[Download Original ~0s]
    I -->|Download Optimized| K{Ready?}
    K -->|Yes| L[Download Optimized ~0s]
    K -->|No| M[Show Progress Bar]
    M --> N[Wait for completion]
    N --> L
    
    style D fill:#51cf66,stroke:#2f9e44
    style J fill:#51cf66,stroke:#2f9e44
    style L fill:#51cf66,stroke:#2f9e44
    style F fill:#ffd43b,stroke:#f08c00
```

## Performance Comparison

| Approach | Time to Available | Compatibility | User Experience |
|----------|------------------|---------------|-----------------|
| **Current** | 6-33+ seconds | 🟢 Excellent | 🔴 Poor (long wait) |
| **Original Only** | < 0.1 seconds | 🟡 Good (most players) | 🟢 Excellent (instant) |
| **Dual-Track** | < 0.1 seconds | 🟢 Excellent (both options) | 🟢 Excellent (choice + instant) |
| **Codec Copy** | ~0.5 seconds | 🟡 Good | 🟢 Excellent |
| **Binary Fix Only** | ~0.2 seconds | 🟢 Very Good | 🟢 Excellent |

## Code Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant MediaRecorder
    participant useRecorder
    participant Studio
    participant videoTrim
    participant FFmpeg
    participant IndexedDB
    participant UI

    User->>MediaRecorder: Stop Recording
    MediaRecorder->>useRecorder: ondataavailable (chunks)
    MediaRecorder->>useRecorder: onstop
    useRecorder->>useRecorder: Create Blob
    useRecorder->>useRecorder: URL.createObjectURL
    useRecorder->>Studio: Update state (url, blob)
    Studio->>UI: Add take with spinner
    Note over Studio,UI: User sees video in list<br/>but cannot download yet
    
    Studio->>Studio: fetch(url).then(blob)
    Studio->>videoTrim: remuxVideo(blob, mimeType)
    
    activate videoTrim
    videoTrim->>FFmpeg: Load WASM (~1s)
    videoTrim->>FFmpeg: writeFile (input)
    videoTrim->>FFmpeg: exec([libx264 re-encode])
    Note over FFmpeg: 🔴 5-30+ seconds<br/>depending on video length
    FFmpeg-->>videoTrim: Optimized blob
    deactivate videoTrim
    
    Studio->>Studio: URL.createObjectURL(optimized)
    Studio->>IndexedDB: saveVideo (if enabled)
    Note over IndexedDB: 🟡 1-3 seconds for large videos
    IndexedDB-->>Studio: Complete
    Studio->>UI: Remove spinner, enable download
    Note over User,UI: ✅ Video now available<br/>(6-33+ seconds later)
    User->>UI: Click download
```

## Resource Utilization During Processing

```mermaid
pie title CPU/Memory Usage During Remuxing
    "FFmpeg libx264" : 85
    "Memory allocation" : 8
    "IndexedDB write" : 5
    "UI updates" : 2
```

## Architecture Decision Trade-offs

```mermaid
mindmap
  root((Video<br/>Processing))
    Current Approach
      ✅ Maximum compatibility
      ✅ High quality output
      ✅ Web streaming ready
      ❌ 6-33+ second wait
      ❌ Blocks all downloads
      ❌ No progress feedback
    Dual-Track Proposal
      ✅ Instant availability
      ✅ User choice
      ✅ Better UX
      ✅ Still offers optimization
      ⚠️ More complex UI
      ⚠️ Two versions stored
    Binary Fix Only
      ✅ Very fast <0.2s
      ✅ No re-encode
      ✅ Small memory footprint
      ⚠️ May not fix all players
      ⚠️ Limited by MP4 structure
```

---

**Note:** All diagrams are Mermaid-compatible and can be rendered in GitHub, VS Code, and most documentation platforms.
