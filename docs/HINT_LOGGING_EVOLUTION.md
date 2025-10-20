# Hint Logging Evolution Guidelines

## Overview

This document outlines the evolution path from simple socratic hints to full conversational chat in the Parsons AI Tutor, maintaining ProgSnap2 compliance and backwards compatibility throughout all phases.

## Benefits of This Approach

✅ **Backwards Compatible**: Simple hints work now  
✅ **Future-Proof**: Can evolve to full chat without breaking existing data  
✅ **Research Ready**: Maintains ProgSnap2 compliance throughout evolution  
✅ **Conversation Analysis**: Can track dialogue patterns and effectiveness  
✅ **Thread Reconstruction**: Can rebuild full conversations from logs  

## Current Implementation (Phase 0)

### Current State: Simple Hints

```json
{
  "type": "X-Hint.Socratic",
  "metadata": {
    "X-HintData": {
      "message": "What should happen before the loop starts?",
      "hintType": "suggestion",
      "conversationContext": "problem-demo-1729123456"
    }
  }
}
```

**Current Event Types:**
- `X-Hint.Widget`: Parsons widget feedback hints
- `X-Hint.Socratic`: AI tutor suggestions

## Evolution Roadmap

### Phase 1: Add Conversation Threading (Next Priority)

**Goal**: Track related hints as conversation threads

**Implementation:**

```typescript
// Update ParsonsWidget.tsx socratic logging
widgetAdapter.logManualEvent('X-Hint.Socratic', {
  'X-HintData': {
    message: result,
    hintType: 'suggestion',
    conversationID: generateConversationID(), // NEW: Unique conversation thread
    turnNumber: 1,                           // NEW: Turn counter
    awaitingResponse: true,                  // NEW: Expecting student reply
    conversationContext: `problem-${problemId}`
  }
});
```

**Helper Functions to Add:**

```typescript
// Add to ParsonsWidget.tsx
let currentConversationID: string | null = null;
let currentTurnNumber = 0;

const generateConversationID = () => {
  if (!currentConversationID) {
    currentConversationID = `conv-${problemId}-${Date.now()}`;
    currentTurnNumber = 0;
  }
  return currentConversationID;
};

const incrementTurn = () => ++currentTurnNumber;
```

### Phase 2: Capture Student Responses

**Goal**: Log student messages in response to tutor hints

**New Event Type:**

```typescript
// Add to src/lib/logging/types.ts
export type EventType = 
  // ...existing types...
  | 'X-Student.Response';  // NEW: Student chat responses
```

**Implementation:**

```typescript
// When student types in chat (future chat UI)
const logStudentResponse = (message: string) => {
  widgetAdapter.logManualEvent('X-Student.Response', {
    'X-HintData': {
      message: message,
      sender: 'student',
      conversationID: currentConversationID,
      turnNumber: incrementTurn(),
      responseToTurn: currentTurnNumber - 1,  // Which tutor message this responds to
      puzzleState: getCurrentPuzzleState()    // What was on screen when student replied
    }
  });
};
```

### Phase 3: Multi-Turn Conversations

**Goal**: Support back-and-forth dialogue between student and AI tutor

**Enhanced Logging:**

```typescript
// Tutor Follow-ups
const logSocraticFollowup = (message: string, isFollowup = false) => {
  widgetAdapter.logManualEvent('X-Hint.Socratic', {
    'X-HintData': {
      message: message,
      hintType: isFollowup ? 'followup' : 'question',
      conversationID: currentConversationID,
      turnNumber: incrementTurn(),
      previousTurns: getPreviousMessages(3), // Context of last 3 messages
      studentEngagement: calculateEngagement(), // How actively student is participating
      awaitingResponse: true
    }
  });
};
```

### Phase 4: Full Chat Interface

**Goal**: Complete conversational AI tutor with rich chat analytics

**Unified Chat Event:**

```typescript
// Add to src/lib/logging/types.ts
export type EventType = 
  // ...existing types...
  | 'X-Chat.Message';  // Unified chat event

// Chat logging function
const logChatMessage = (message: string, sender: 'student' | 'tutor', messageType?: string) => {
  widgetAdapter.logManualEvent('X-Chat.Message', {
    'X-HintData': {
      message: message,
      sender: sender,
      messageType: messageType || (sender === 'tutor' ? 'hint' : 'response'),
      conversationID: currentConversationID,
      turnNumber: incrementTurn(),
      timestamp: Date.now(),
      puzzleState: getCurrentPuzzleState(),
      sessionPhase: determineSessionPhase(), // 'exploration', 'struggling', 'near-solution'
      
      // Advanced features for chat analysis
      messageLength: message.length,
      questionCount: (message.match(/\?/g) || []).length,
      sentimentTone: 'neutral', // Could integrate sentiment analysis
      containsCode: /\b(for|if|while|def)\b/.test(message)
    }
  });
};
```

## EventLogger Evolution

### Enhanced Features to Add

```typescript
// Add to src/lib/logging/types.ts BehavioralFeatures interface
export interface BehavioralFeatures {
  // ...existing features...
  
  // Chat evolution features (Phase 2+)
  conversationCount: number;           // Number of distinct conversations
  avgConversationLength: number;       // Average turns per conversation
  studentResponseRate: number;         // % of tutor messages that got student replies
  avgResponseTime: number;             // Time between tutor message and student reply
  chatEngagementScore: number;         // Overall engagement metric
  helpSeekingBehavior: number;         // How proactively student asks for help
}
```

### EventLogger Methods to Add

```typescript
// Add to src/lib/logging/EventLogger.ts
private updateChatFeatures(event: ParsonsEvent): void {
  const conversationEvents = this.events.filter(e => 
    e.type.startsWith('X-Hint.Socratic') || 
    e.type.startsWith('X-Student.Response') ||
    e.type.startsWith('X-Chat.Message')
  );

  // Count unique conversations
  const conversations = new Set();
  conversationEvents.forEach(e => {
    const convID = e.metadata?.['X-HintData']?.conversationID;
    if (convID) conversations.add(convID);
  });
  this.features.conversationCount = conversations.size;

  // Calculate engagement metrics
  this.calculateEngagementMetrics(conversationEvents);
}

private calculateEngagementMetrics(chatEvents: ParsonsEvent[]): void {
  // Group events by conversation
  const conversations = this.groupByConversation(chatEvents);
  
  let totalTurns = 0;
  let responsiveConversations = 0;
  
  conversations.forEach((events, convID) => {
    totalTurns += events.length;
    
    // Check if student responded to tutor messages
    const tutorMessages = events.filter(e => e.metadata?.['X-HintData']?.sender !== 'student');
    const studentResponses = events.filter(e => e.metadata?.['X-HintData']?.sender === 'student');
    
    if (studentResponses.length > 0) {
      responsiveConversations++;
    }
  });

  this.features.avgConversationLength = totalTurns / Math.max(1, conversations.size);
  this.features.studentResponseRate = responsiveConversations / Math.max(1, conversations.size);
}

private groupByConversation(events: ParsonsEvent[]): Map<string, ParsonsEvent[]> {
  const conversations = new Map<string, ParsonsEvent[]>();
  
  events.forEach(event => {
    const convID = event.metadata?.['X-HintData']?.conversationID;
    if (convID) {
      if (!conversations.has(convID)) {
        conversations.set(convID, []);
      }
      conversations.get(convID)!.push(event);
    }
  });
  
  return conversations;
}
```

## Research Analysis Benefits

### Phase 1 Research Questions:
- How many hint interactions become multi-turn conversations?
- What types of hints lead to student questions?

### Phase 2 Research Questions:
- How do students respond to different hint types?
- What language patterns indicate confusion vs. understanding?

### Phase 3 Research Questions:
- How does conversation length correlate with problem-solving success?
- Which conversation patterns are most effective?

### Phase 4 Research Questions:
- Can we predict student success from early chat behavior?
- How does chat engagement affect learning outcomes?
- What makes an effective AI tutor conversation?

## Backwards Compatibility Strategy

### No Data Migration Required

Old and new data formats coexist perfectly:

```typescript
// Old sessions (Phase 0 - current)
{
  "type": "X-Hint.Socratic",
  "metadata": {
    "X-HintData": {
      "message": "What should happen first?"
    }
  }
}

// New sessions (Phase 4 - full chat) 
{
  "type": "X-Chat.Message", 
  "metadata": {
    "X-HintData": {
      "message": "What should happen first?",
      "conversationID": "conv-123",
      "turnNumber": 1,
      "sender": "tutor"
    }
  }
}
```

### Feature Calculation Compatibility

```typescript
// EventLogger handles both formats seamlessly
private updateHintFeatures(event: ParsonsEvent, actualStartTime: number): void {
  // Works with old simple hints AND new chat messages
  if (event.type === 'X-Hint.Socratic' || event.type === 'X-Chat.Message') {
    const sender = event.metadata?.['X-HintData']?.sender;
    if (!sender || sender === 'tutor') {  // Count tutor messages as hints
      this.features.socraticHintCount++;
    }
  }
  
  // New features are 0 for old sessions, calculated for new ones
  if (event.metadata?.['X-HintData']?.conversationID) {
    this.updateChatFeatures(event);  // Only runs on new format
  }
}
```

## Implementation Timeline

| Phase | Timeline | Features |
|-------|----------|----------|
| **Phase 1** | Month 1 | Conversation Threading |
| **Phase 2** | Month 2 | Student Response Capture |
| **Phase 3** | Month 3 | Multi-Turn Conversations |
| **Phase 4** | Month 6 | Full Chat Interface |

**Each phase is independently deployable and maintains full backwards compatibility.**

## Files to Modify by Phase

### Phase 1:
- `src/components/ParsonsWidget.tsx` - Add conversation threading
- `src/lib/logging/EventLogger.ts` - Add conversation counting

### Phase 2:
- `src/lib/logging/types.ts` - Add `X-Student.Response` event type
- `src/lib/logging/EventLogger.ts` - Add response tracking
- `src/components/*` - Add student input capture (when chat UI added)

### Phase 3:
- `src/lib/logging/EventLogger.ts` - Add engagement calculations
- `src/components/ParsonsWidget.tsx` - Add context-aware tutoring

### Phase 4:
- `src/lib/logging/types.ts` - Add `X-Chat.Message` unified event
- `src/components/*` - Full chat interface components
- `src/lib/logging/EventLogger.ts` - Complete chat analytics

## ProgSnap2 Compliance

All phases maintain ProgSnap2 compliance:
- Uses `X-` prefix for custom events ✅
- Stores rich data in `X-HintData` column ✅ 
- Compatible with standard ProgSnap2 analysis tools ✅
- Enables educational data mining research ✅

---

*This evolution path provides research flexibility to study everything from simple hint effectiveness to complex conversational AI tutoring patterns, all within the same data format.*