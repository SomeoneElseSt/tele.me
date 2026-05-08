# Quick Reference: Video Availability Bottlenecks

**TL;DR:** Video processing takes 6-33+ seconds due to FFmpeg re-encoding. Users wait ~20s for a 30s video.

---

## The Problem in 30 Seconds

```
User stops recording → Video appears with spinner → 
🔴 User waits 20+ seconds → Download button finally works
```

---

## The Bottleneck (90% of the delay)

**File:** `src/lib/videoTrim.ts:48-55`

```typescript
await ffmpeg.exec([
  '-i', inputFile,
  '-c:v', 'libx264',        // ❌ Full re-encode (5-30+ seconds)
  '-preset', 'ultrafast',
  '-crf', '18',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  outputFile,
])
```

**Why it exists:** Fixes broken timestamps from MediaRecorder for QuickTime compatibility

**Cost:** 
- 10s video = ~7s wait
- 30s video = ~20s wait  
- 60s video = ~40s wait

---

## The Fix (Recommended)

### Option 1: Dual-Track Availability ⭐ BEST
```typescript
// Show original immediately (0.1s)
setTakes((prev) => [{ ...take, originalUrl: url }, ...prev])

// Optimize in background
remuxVideo(blob).then(optimized => {
  setTakes(prev => prev.map(t => 
    t.id === takeId ? { ...t, optimizedUrl: optimized } : t
  ))
})
```

**User sees:** "Download Original (instant)" vs "Download Optimized (processing...)"

---

### Option 2: Skip Re-encoding, Use Binary Fix
```typescript
// Instead of FFmpeg remux (20s), use binary MP4 fix (0.2s)
const fixed = injectFullFrameRateIntent(
  new Uint8Array(await blob.arrayBuffer())
)
```

**Already implemented in:** `src/lib/mp4FullFrameRate.ts`  
**Cost:** ~200ms instead of 20s

---

### Option 3: Codec Copy (Fast Path)
```typescript
await ffmpeg.exec([
  '-i', inputFile,
  '-c:v', 'copy',  // No re-encode (0.5s instead of 20s)
  '-c:a', 'copy',
  '-movflags', '+faststart',
  outputFile
])
```

**Cost:** ~500ms (95% faster)

---

## Timeline Breakdown (30s video)

| Phase | Current | With Dual-Track |
|-------|---------|-----------------|
| Blob creation | 0.1s | 0.1s |
| **Available for download** | **21s** ⏱️ | **0.1s** ✅ |
| Optimization complete | 21s | 21s (background) |

**Improvement:** 99.5% reduction in perceived latency

---

## Other Bottlenecks (Minor)

1. **IndexedDB save:** 1-3s (can defer)
2. **Sequential queue:** Videos can't process in parallel
3. **FFmpeg WASM load:** 0.5-2s first time

---

## Code Locations

| Component | File | Purpose |
|-----------|------|---------|
| Recording | `src/hooks/useRecorder.ts` | Creates blob |
| Remux trigger | `src/features/studio/Studio.tsx:642-691` | Starts FFmpeg |
| **FFmpeg remux** | `src/lib/videoTrim.ts:36-65` | **🔴 BOTTLENECK** |
| Binary fix | `src/lib/mp4FullFrameRate.ts` | Fast alternative |
| Storage | `src/lib/videoStorage.ts` | IndexedDB |
| Download UI | `src/features/studio/DownloadPopover.tsx` | User interface |

---

## Next Steps

1. ✅ Investigation complete
2. 🔲 Prototype dual-track UI
3. 🔲 Test binary fix compatibility
4. 🔲 Measure real-world improvements
5. 🔲 Implement solution
6. 🔲 Add progress feedback

---

## Full Documentation

- **Investigation:** `INVESTIGATION_VIDEO_AVAILABILITY_LATENCY.md`
- **Visual diagrams:** `docs/video-pipeline-flow.md`
- **This summary:** You are here

---

**Impact:** Fixing this could reduce user wait time from 20+ seconds to <1 second while maintaining all quality/compatibility benefits.
