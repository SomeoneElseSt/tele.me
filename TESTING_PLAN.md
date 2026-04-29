# Testing Plan: Video Processing Performance & Compatibility

**Goal:** Get users the final, working video as fast as possible.

**Key Question:** What's the minimum processing needed to produce a video that:
1. Downloads instantly or near-instantly
2. Works in QuickTime Player
3. Works in video editors (DaVinci Resolve, Premiere, Final Cut, etc.)
4. Can be trimmed in-app

---

## Hypothesis to Test

The current code already has `injectFullFrameRateIntent()` which fixes VFR timestamps **without re-encoding**. But we're not using it - we're doing expensive FFmpeg re-encode instead.

**Commit 7b738c8 says:** "enable native trimming and avoid slowdowns in video editors"

**Question:** Do we ACTUALLY need full re-encoding, or does binary fix + codec copy work?

---

## Test Matrix

### Test 1: Performance Benchmarks (QUANTITATIVE)

Run `benchmark-video-pipeline.html` with different video lengths:

| Duration | Current (Re-encode) | Binary Fix | Codec Copy |
|----------|-------------------|------------|------------|
| 3s       | ? seconds         | ? ms       | ? ms       |
| 10s      | ? seconds         | ? ms       | ? ms       |
| 30s      | ? seconds         | ? ms       | ? ms       |
| 60s      | ? seconds         | ? ms       | ? ms       |

**Action:** Open `benchmark-video-pipeline.html` in browser, run tests, record actual numbers.

---

### Test 2: Compatibility Testing (QUALITATIVE)

For each processing method, test the output video in:

#### Playback Compatibility
- [ ] Chrome browser
- [ ] Safari browser
- [ ] Firefox browser
- [ ] QuickTime Player (macOS)
- [ ] Windows Media Player
- [ ] VLC Player

#### Editor Compatibility
- [ ] DaVinci Resolve (timeline import)
- [ ] Adobe Premiere Pro (timeline import)
- [ ] Final Cut Pro (timeline import)
- [ ] iMovie (basic test)
- [ ] Web-based editors (Kapwing, etc.)

#### Trim Testing
- [ ] In-app trim works (using FFmpeg trimVideo)
- [ ] Native editor trim works
- [ ] No slowdown when scrubbing timeline

**Test Cases:**
1. **Current (FFmpeg Re-encode)** - baseline (we know this works)
2. **Binary Fix Only** - fast but compatibility unknown
3. **Codec Copy** - fast but may not fix timestamps

---

### Test 3: Actual User Workflow

**Scenario:** User records 30s video, wants to download and edit it ASAP.

#### Current Pipeline
```
Record (30s) → Wait for re-encode (??s) → Download → Import to editor
TOTAL TIME: ??
```

#### Proposed: Binary Fix Only
```
Record (30s) → Binary fix (??ms) → Download → Import to editor
TOTAL TIME: ??
```

#### Proposed: Codec Copy
```
Record (30s) → Codec copy (??ms) → Download → Import to editor
TOTAL TIME: ??
```

**Measure:**
- Time to download ready
- Editor import success/fail
- Trimming works yes/no
- Timeline scrubbing smooth yes/no

---

## What We Need to Know

### Critical Questions

1. **Performance:** How much faster is binary fix vs re-encode?
   - Run benchmark with 10s, 30s, 60s videos
   - Record actual milliseconds/seconds

2. **QuickTime Compatibility:** Does binary fix work in QuickTime?
   - Record video → Apply binary fix → Open in QuickTime
   - Does it play at correct speed?
   - Does slow-mo UI appear?

3. **Editor Compatibility:** Can editors trim binary-fixed videos?
   - Import to DaVinci Resolve
   - Try to trim/cut
   - Does timeline scrub smoothly?
   - Does export work?

4. **In-App Trimming:** Does our FFmpeg trim work on binary-fixed videos?
   - Record → Binary fix → In-app trim
   - Does trimVideo() function work?
   - Output quality OK?

---

## Testing Protocol

### Phase 1: Benchmark Performance (30 minutes)

1. Open `benchmark-video-pipeline.html` in Chrome
2. Grant camera/mic permissions
3. Run "Full Benchmark" with 10s recording
4. Run again with 30s recording
5. Record all timing data

**Expected Outcome:** Actual numbers showing speedup of binary fix vs re-encode.

---

### Phase 2: QuickTime Testing (15 minutes)

1. Run benchmark, download all 3 outputs
2. Open each in QuickTime Player
3. Check for:
   - Plays at correct speed (not slow-mo)
   - Duration is correct
   - Audio synced
   - No artifacts

**Expected Outcome:** Know if binary fix works in QuickTime.

---

### Phase 3: Editor Testing (1 hour)

1. Download binary-fixed video
2. Import to DaVinci Resolve (or available editor)
3. Try to:
   - Add to timeline
   - Trim/cut clips
   - Scrub timeline (smooth vs stuttery)
   - Add effects
   - Export

**Expected Outcome:** Know if binary-fixed videos work in professional editors.

---

### Phase 4: In-App Trim Testing (30 minutes)

1. Modify Studio.tsx to use binary fix instead of remux
2. Record video
3. Use in-app trim feature
4. Download trimmed video
5. Test in QuickTime + editor

**Expected Outcome:** Know if trimming still works with binary-fixed videos.

---

## Decision Matrix

Based on test results, choose the approach:

| If... | Then use... | Reason |
|-------|------------|--------|
| Binary fix: fast + compatible + trims OK | **Binary fix only** | Best UX, instant availability |
| Binary fix: fast but QuickTime broken | **Codec copy** | Fast, fixes timestamps partially |
| Binary fix: fast but editor trimming broken | **Codec copy + binary fix** | Hybrid approach |
| Only re-encode works for editors | **Keep current (re-encode)** | No faster option exists |

---

## Success Criteria

**Goal:** Users get final, working video in < 1 second after recording stops.

**Minimum Requirements:**
- ✅ Works in QuickTime Player
- ✅ Works in at least 2 major video editors
- ✅ In-app trimming works
- ✅ Processing time < 1 second for 30s video
- ✅ No quality loss vs current

**Nice to Have:**
- Works in ALL editors
- Processing time < 500ms
- Smaller file size

---

## Next Steps

1. **RUN THE BENCHMARK** - Get actual timing data
2. **TEST COMPATIBILITY** - Verify binary fix works in real tools
3. **MEASURE END-TO-END** - Time complete user workflow
4. **DOCUMENT FINDINGS** - Update investigation with real data
5. **IMPLEMENT SOLUTION** - Use fastest method that meets requirements

---

## Notes

- Do NOT speculate about performance
- Do NOT assume anything about compatibility
- Do NOT propose solutions before testing
- DO measure everything
- DO test in real tools users actually use
- DO prioritize user experience (speed + compatibility)

---

**STATUS: Ready to test - benchmark tool created, protocol defined**
