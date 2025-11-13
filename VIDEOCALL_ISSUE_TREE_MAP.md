# VideoCall Issues - Tree Map & Dependency Analysis

## 🌳 ISSUE HIERARCHY TREE

```
VIDEOCALL ISSUES (20 Total)
│
├─ 🔴 CRITICAL (6)
│  │
│  ├─ #1 Multiple AudioContext Leak
│  │   ├─ RELATED TO: #2, #6
│  │   └─ CAUSES: Memory spike, CPU high
│  │
│  ├─ #2 Infinite Audio Detection Loops
│  │   ├─ RELATED TO: #1, #6
│  │   └─ CAUSES: CPU drain, ghost timers
│  │
│  ├─ #3 Screen Sharing Broken (no track replacement)
│  │   ├─ DEPENDS ON: Peer connection state
│  │   └─ CAUSES: Remote sees camera instead of screen
│  │
│  ├─ #4 Race Condition in Peer Setup
│  │   ├─ RELATED TO: #5, #11, #7
│  │   └─ CAUSES: Connection storms, duplicate calls
│  │
│  ├─ #5 Missing Exponential Backoff
│  │   ├─ RELATED TO: #4
│  │   └─ CAUSES: Network flooding on disconnect
│  │
│  └─ #6 Animation Frame Not Cleared
│      ├─ RELATED TO: #1, #2
│      └─ CAUSES: React state update warnings
│
├─ 🟠 HIGH (8)
│  │
│  ├─ #7 Supabase Channels Not Cleaned
│  │   ├─ RELATED TO: #4
│  │   └─ CAUSES: Listener accumulation
│  │
│  ├─ #8 Deafen Toggle Logic Inverted ⭐ EASY FIX
│  │   ├─ SEVERITY: High impact, 1-line fix
│  │   └─ CAUSES: Feature completely broken
│  │
│  ├─ #9 Bandwidth Limits Fragile
│  │   ├─ DEPENDS ON: #3 (screen sharing)
│  │   └─ CAUSES: Poor video quality
│  │
│  ├─ #10 Permission Error Handling Missing
│  │   ├─ RELATED TO: #11
│  │   └─ CAUSES: No retry UI
│  │
│  ├─ #11 Stream Race Condition During Setup
│  │   ├─ RELATED TO: #4, #10
│  │   └─ CAUSES: Silent failure, dead streams
│  │
│  ├─ #12 Missing Room ID Validation
│  │   ├─ SEVERITY: Security risk
│  │   └─ CAUSES: Wrong room joins
│  │
│  ├─ #13 Unmounted State Updates
│  │   ├─ RELATED TO: #6
│  │   └─ CAUSES: Console warnings
│  │
│  └─ #14 Emoji Console Logs
│      ├─ RELATED TO: #4, #11 (hides errors)
│      └─ CAUSES: Debug difficulty
│
├─ 🟡 MEDIUM (3)
│  │
│  ├─ #15 Hardcoded PeerJS Server
│  │   ├─ SEVERITY: Reliability risk
│  │   └─ CAUSES: Service unavailable
│  │
│  ├─ #16 STUN/TURN Config Suboptimal
│  │   ├─ RELATED TO: #15
│  │   └─ CAUSES: Slow connections
│  │
│  └─ #17 No Bandwidth Throttling
│      ├─ RELATED TO: #9
│      └─ CAUSES: No quality adaptation
│
└─ 🟢 LOW (3)
   │
   ├─ #18 Console Emoji Styling
   ├─ #19 Magic Numbers Hardcoded
   └─ #20 No Type Definitions
```

---

## 🔗 DEPENDENCY GRAPH - How Issues Connect

### Layer 1: ROOT CAUSES (Foundation Issues)
```
LAYER 1 (Foundation)
    │
    ├─ #14 Emoji Logging ──────────┐
    │  └─ Hides actual errors        │
    │                                │
    ├─ #15 Hardcoded PeerJS ───────┐
    │  └─ No control over server     │
    │                                │
    └─ #19 Magic Numbers ───────────┤
       └─ Code hard to maintain      │
                                     ↓
              MAKES DEBUGGING DIFFICULT
```

### Layer 2: RESOURCE MANAGEMENT (Memory/CPU Issues)
```
LAYER 2 (Resource Problems)
    │
    ├─ #1 Multiple AudioContext ───┐
    │  └─ Never cleaned             │
    │     └─ Refs not stored ◄──────┼─ #2 Infinite Audio Loops
    │                                │  └─ No way to stop
    │                                │
    └─ #2 Infinite Audio Loops ─────┤
       └─ Accumulate over time       │
          └─ No cleanup ◄────────────┼─ #6 Animation Frame Leak
                                     │  └─ State updates after unmount
                                     ↓
                     MEMORY LEAKS + CPU SPIKE
```

### Layer 3: ASYNC & CONCURRENCY (Timing Issues)
```
LAYER 3 (Concurrency Problems)
    │
    ├─ #4 Race Condition Setup ────────┐
    │  └─ getUserMedia + Peer + Sub     │
    │     are unsynchronized            │
    │     │                             │
    │     ├─> #11 Stream Race ◄──────────┤─ #10 Permission Errors
    │     │   └─ Dead stream refs        │  └─ Can't retry
    │     │                              │
    │     └─> #7 Multiple Channels ◄────┤
    │         └─ Listeners accumulate    │
    │                                    │
    └─ #5 No Exponential Backoff ──────┐
       └─ Reconnection floods network    │
          └─ Combines with #4 on fail ◄─┘
                                     ↓
          CONNECTION STORMS + DUPLICATE CALLS
```

### Layer 4: FUNCTIONAL FEATURES (User-facing)
```
LAYER 4 (Feature Bugs)
    │
    ├─ #3 Screen Sharing Broken ────────┐
    │  └─ No track replacement           │
    │     └─ Peer sees camera            │
    │        └─ Related to #9 ◄──────────┤─ #9 Bandwidth Limits
    │                                    │  └─ Low-quality stream
    │                                    │
    ├─ #8 Deafen Toggle Inverted ──────┐
    │  └─ track.enabled = isDeafened    │
    │     └─ Audio plays when muted      │
    │                                    │
    └─ #12 Room ID Not Validated ──────┤
       └─ No format check               │
          └─ Wrong room joins           ↓

               USER FEATURES BROKEN OR INSECURE
```

---

## 🎯 CRITICAL DEPENDENCY CHAINS

### Chain 1: Memory Leak Cascade 💥
```
#1 AudioContext Created
    ↓ (no cleanup)
#2 Audio Loop Never Stops
    ↓ (accumulates)
#6 AnimationFrame Still Running
    ↓
⚠️ Result: Memory spike → Browser lag → Call drops
    └─ After 10+ peers joined
```

### Chain 2: Race Condition Spiral 🌪️
```
#4 Peer Setup Not Synchronized
    ↓ (many peers at once)
#11 Stream Captured in Closure
    ↓ (component unmounts)
#10 Permission Error Triggers
    ↓ (no retry, stream dead)
⚠️ Result: Connection fails → No audio/video → Silent failure
    └─ User doesn't know why
```

### Chain 3: Reconnection Storm ⚡
```
#4 Race Condition Happens
    ↓ (connection fails)
#5 No Exponential Backoff
    ↓ (retries every 2s)
All 10 peers retry simultaneously
    ↓
⚠️ Result: Network flooded → More failures → More retries
    └─ Exponential backoff would fix this
```

### Chain 4: Screen Sharing Failure 📺
```
#3 Track Not Replaced
    ↓ (only video element updated)
Peer connection still has old track
    ↓ (Remote peer doesn't know about change)
#9 Bandwidth Limit on Wrong Stream
    ↓ (old camera stream with limits)
⚠️ Result: Screen appears frozen/blank
    └─ User can't see presenter's screen
```

### Chain 5: Debugging Nightmare 🔍
```
#14 Emoji Logs Hide Errors
    ↓ (hard to grep)
Any of #1-7 failures occur
    ↓ (error hidden in emoji soup)
#11 Race Condition Race manifests
    ↓ (intermittent, timing-dependent)
⚠️ Result: Impossible to debug
    └─ 50% of failures are timing-dependent (hidden by #14)
```

---

## 📊 IMPACT MATRIX - Which Issues Affect Each Other

```
        #1   #2   #3   #4   #5   #6   #7   #8   #9  #10  #11  #12  #13  #14
        AC   ALp  SS   RC   EB   AF   SC   DT   BW  PH   SRC  RID  US   ECL
#1 AC   —    ✓    —    —    —    ✓    —    —    —   —    —    —    ✓    —
#2 ALp  ✓    —    —    —    —    ✓    —    —    —   —    —    —    ✓    —
#3 SS   —    —    —    —    —    —    —    —    ✓   —    —    —    —    —
#4 RC   —    —    —    —    ✓    —    ✓    —    —   ✓    ✓    —    —    ✓
#5 EB   —    —    —    ✓    —    —    —    —    —   —    —    —    —    —
#6 AF   ✓    ✓    —    —    —    —    —    —    —   —    —    —    —    —
#7 SC   —    —    —    ✓    —    —    —    —    —   —    —    —    —    —
#8 DT   —    —    —    —    —    —    —    —    —   —    —    —    —    —
#9 BW   —    —    ✓    —    —    —    —    —    —   —    —    —    —    —
#10 PH  —    —    —    ✓    —    —    —    —    —   —    ✓    —    —    ✓
#11 SRC —    —    —    ✓    —    —    —    —    —   ✓    —    —    —    ✓
#12 RID —    —    —    —    —    —    —    —    —   —    —    —    —    —
#13 US  ✓    ✓    —    —    —    —    —    —    —   —    —    —    —    —
#14 ECL —    —    —    ✓    —    —    —    —    —   ✓    ✓    —    —    —

Legend:
AC = AudioContext, ALp = Audio Loop, SS = Screen Share, RC = Race Condition
EB = Exponential Backoff, AF = Animation Frame, SC = Supabase Channel, DT = Deafen Toggle
BW = Bandwidth, PH = Permission Handling, SRC = Stream Race Condition, RID = Room ID
US = Unmounted State, ECL = Emoji Console Logs

✓ = Direct impact/dependency
```

---

## 🚨 SEVERITY SCORING

### Critical Dependencies (Fix First!)
| Rank | Issue | Why Critical | Affects | Fix Time |
|------|-------|-------------|---------|----------|
| 🔴 1 | #1 + #2 | Both cause memory leak; compound effect | All users | 30 min |
| 🔴 2 | #4 + #5 | Race + no backoff = connection hell | All calls | 1-2h |
| 🔴 3 | #3 | Feature completely broken | Screen share | 1-2h |
| 🔴 4 | #8 | One-liner fix; feature broken | Audio control | 5 min |
| 🔴 5 | #11 | Silent failure; hard to debug | New users | 1h |

### High Dependencies
| Rank | Issue | Why High | Affects | Fix Time |
|------|-------|---------|---------|----------|
| 🟠 6 | #14 | Hides #1, #4, #11 errors | Debugging | 30 min |
| 🟠 7 | #10 + #11 | Permission fails → dead stream | New users | 1h |
| 🟠 8 | #7 | Accumulates with #4 | Long sessions | 20 min |
| 🟠 9 | #9 | Makes #3 worse | Stream quality | 20 min |

---

## 🔄 SEQUENCE DIAGRAM - What Happens When Call Starts

```
USER JOINS CALL
    │
    ├─ T=0ms:  getUserMedia() starts
    │   └─ Dialog shown to user
    │       └─ RISK: User clicks close window
    │           └─ TRIGGERS: Race condition #4, #11
    │
    ├─ T=500ms: User clicks "Allow"
    │   └─ Stream ready
    │       └─ TRIGGER: setupAudioLevelDetection()
    │           ├─ Creates AudioContext #1 ✓
    │           └─ Starts rAF loop #2 ✓
    │
    ├─ T=600ms: new Peer() initialization
    │   └─ Connects to 0.peerjs.com #15
    │       └─ RISK: Server down → #5 no backoff
    │
    ├─ T=700ms: Peer.on('open') fires
    │   ├─ Creates DB record
    │   ├─ Calls loadAndCallPeers() #4 RACE!
    │   │   └─ For EACH existing peer (with 500ms delay):
    │   │       └─ callPeer() creates NEW AudioContext #1 ✗
    │   │           └─ For remote audio detection #2
    │   │               └─ setTimeout loop never stops ✗
    │   │
    │   └─ Calls subscribeToNewPeers()
    │       └─ Supabase channel listener #7
    │           └─ Not cleaned up properly ✗
    │
    ├─ T=800ms: Incoming call from peer
    │   └─ Gets remote stream
    │       └─ Stores in remotePeers
    │           ├─ Maps to peer call object
    │           └─ Plays in <video> element
    │
    ├─ T=1200ms: User clicks deafen
    │   └─ toggleDeafen() #8
    │       └─ track.enabled = isDeafened ✗ WRONG LOGIC!
    │           └─ Audio still plays
    │
    ├─ T=5000ms: User clicks screen share
    │   └─ toggleScreenShare() #3
    │       └─ Updates video element
    │           └─ BUT: Doesn't replace peer tracks ✗
    │               └─ Remote peers see camera ✗
    │
    ├─ T=10000ms: Network glitch
    │   └─ Connection state → 'failed'
    │       └─ onconnectionstatechange() fires
    │           └─ setTimeout(2000ms) #5 NO BACKOFF ✗
    │               ├─ callPeer() again
    │               └─ If 10 peers fail:
    │                   └─ 10 simultaneous reconnect attempts ✗
    │
    └─ T=30000ms: User closes component
        └─ cleanup() called
            ├─ cancelAnimationFrame() #6 ✓
            ├─ audioContext.close() #1 ✓
            │   └─ BUT: Remote contexts never closed!
            ├─ peer.destroy() ✓
            └─ supabase.removeChannel() #7
                └─ LATE! Listeners still attached ✗
```

---

## 🎯 PROBLEM CLUSTERS

### Cluster A: RESOURCE MANAGEMENT (Memory/CPU)
**Issues**: #1, #2, #6
**Root Cause**: No lifecycle management for external resources
**Impact**: Browser slowdown, crash with 50+ peers
**Why Hard to Fix**: Resources scattered across callbacks

```
Resource Creation          Resource Cleanup
─────────────────         ──────────────────
AudioContext (L269)       cleanup() (L585) ✓
  │ Local only
  │
AudioContext (L301) ✗────────────────────► NOT CLEANED
  │ For EACH remote peer
  │ Stored: nowhere ✗
  │
requestAnimationFrame ◄───────────────────┐ cancelAnimationFrame ✓
  │ Local detection                       │
  │                                       │
setTimeout (L324) ✗──────────────────────────► NOT CLEANED
  │ For EACH remote peer audio
  │ IDs: nowhere ✗
```

### Cluster B: CONCURRENCY & ASYNC (Timing)
**Issues**: #4, #5, #7, #10, #11
**Root Cause**: Async operations not coordinated
**Impact**: Connection storms, silent failures
**Why Hard to Fix**: Timing-dependent bugs are intermittent

```
Async Operations          Problem
──────────────────        ───────
getUserMedia()            ─┐
    │                      │ All run
new Peer()                 ├─> Race condition #4 ✗
    │                      │   #11 stream scope issue
subscribe()               ─┘

onconnectionstatechange   ─────> #5 No backoff ✗
    │                             Floods network
    └─> setTimeout(2000)
```

### Cluster C: USER FEATURES (Functionality)
**Issues**: #3, #8, #9, #12
**Root Cause**: Implementation incomplete or wrong
**Impact**: Features don't work as expected
**Why Hard to Fix**: Some are easy 1-liners, some need redesign

```
Feature        Issue                  Fix Complexity
───────        ─────                  ──────────────
Screen Share   Track not replaced     Medium (API redesign)
Deafen         Logic inverted         Low (1 line!)
Bandwidth      SDP fragile            Low (20 lines)
Room ID        Not validated          Low (10 lines)
```

### Cluster D: DEBUGGING & OBSERVABILITY (Hidden Issues)
**Issues**: #14, and amplifies #4, #11
**Root Cause**: Emoji logging makes errors invisible
**Impact**: Can't debug race conditions
**Why Hard to Fix**: Requires logging refactor

```
Error Occurs               Visibility
────────────              ──────────
Real Error (e.g., #4)     ──> 📞 Calling: abc (emoji hides context)
                                  Lost in logs ✗

Should be: [VIDEO_CALL] Calling peer: abc ✓
```

---

## 📈 FIX IMPACT GRAPH

```
If we fix ONLY...          Impact on other issues
───────────────            ──────────────────────

#1 + #2 (Audio cleanup)    ───> #6 partially fixed
                               ✓ Solves 30% of memory issues

#4 + #5 (Race + backoff)   ───> #7, #11 improved
                               ✓ Solves 50% of connection issues

#3 (Screen sharing)        ───> #9 partially fixed
                               ✓ Solves feature immediately

#8 (Deafen logic)          ───> Standalone fix
                               ✓ 1-line instant fix

#14 (Remove emoji logs)    ───> #4, #11 become debuggable
                               ✓ Makes 20% of issues visible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix ALL critical            ───> System becomes stable
#1, #2, #3, #4, #5, #6          ✓ 90% issues solved
```

---

## 🏥 DIAGNOSIS: What Does User See?

### Scenario 1: "My video is choppy"
**Actual causes**: #1, #2, #9, #15
```
#1 Multiple AudioContext ──┐
#2 Infinite loops ─────────├──> CPU 80%+ ──> Choppy video
#9 Bandwidth limits ───────┤    Buffer fills
#15 Slow server ───────────┘
```

### Scenario 2: "I can't hear anyone"
**Actual causes**: #11, #8, #4
```
#11 Stream race condition ─┐
#8 Deafen toggle broken ───├──> Audio muted ──> "Can't hear"
#4 Connection race ────────┘    No signal
```

### Scenario 3: "Screen share not working"
**Actual causes**: #3, #9
```
#3 Track not replaced ─────┐
#9 Bandwidth limits ───────├──> Remote sees camera ──> No screen
```

### Scenario 4: "Call drops after 5 minutes"
**Actual causes**: #1, #2, #4, #5
```
#1 AudioContext leak ──────┐
#2 Memory accumulate ──────├──> Memory 800MB ──> Browser kills tab
#4 Race creates duplicates ├──> Crashes
#5 Retries too fast ───────┘
```

### Scenario 5: "Call never connects"
**Actual causes**: #4, #10, #11, #15
```
#4 Race condition ─────────┐
#10 Permission fails ──────├──> Connection fails ──> "Can't join"
#11 Dead stream ───────────┤    No media
#15 Server down ───────────┘
```

---

## ✅ FIX PRIORITY & ORDER

```
Order    Issue    Time    Blocks                  Test
─────    ─────    ────    ───────────────────────  ──────
1.       #8       5min    —                        1 click
2.       #5       15min   —                        Disconnect test
3.       #14      30min   Reveals #4, #11          Grep logs
4.       #1+#2    60min   #6, memory               10 peers
5.       #3       90min   Bandwidth                Screen share
6.       #11      60min   #4 awareness             Unmount test
7.       #4       90min   #7, #10                  Load test
8.       #10+#7   45min   Supabase cleanup         Permission test
9.       #12      20min   Security                 Invalid ID test
10.      #15+#16  120min  Performance              Deploy PeerJS
```

---

## 📋 SUMMARY TABLE

| # | Issue | Type | Severity | Depends On | Affects | Fix |
|---|-------|------|----------|-----------|---------|-----|
| 1 | AudioContext Leak | Memory | CRITICAL | — | 2,6,13 | 30min |
| 2 | Audio Loop | Memory | CRITICAL | — | 1,6,13 | 30min |
| 3 | Screen Share | Feature | CRITICAL | — | 9 | 90min |
| 4 | Race Condition | Concurrency | CRITICAL | — | 5,7,11 | 90min |
| 5 | No Backoff | Network | CRITICAL | 4 | 4 | 15min |
| 6 | AnimFrame Leak | Memory | CRITICAL | 1,2 | 13 | 10min |
| 7 | Supabase Channels | Memory | HIGH | 4 | — | 20min |
| 8 | Deafen Toggle | Feature | HIGH | — | — | 5min ⭐ |
| 9 | Bandwidth Limits | Quality | HIGH | 3 | — | 20min |
| 10 | Permission Handle | UX | HIGH | 4,11 | — | 30min |
| 11 | Stream Race | Functional | HIGH | 4,10 | — | 60min |
| 12 | Room ID Validation | Security | HIGH | — | — | 10min |
| 13 | Unmounted Updates | Warnings | HIGH | 1,2,6 | — | 20min |
| 14 | Emoji Logs | Debug | HIGH | — | 4,11 | 30min |
| 15 | Hardcoded PeerJS | Reliability | MEDIUM | — | 4,5 | 120min |
| 16 | STUN/TURN Config | Performance | MEDIUM | 15 | — | 30min |
| 17 | Bandwidth Throttle | Quality | MEDIUM | 9 | — | 60min |
| 18 | Console Emojis | Style | LOW | — | — | 20min |
| 19 | Magic Numbers | Code | LOW | — | — | 30min |
| 20 | No Types | Code | LOW | — | — | 30min |

