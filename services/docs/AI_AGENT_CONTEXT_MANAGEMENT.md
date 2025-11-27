# AI Agent Context Management Architecture

## Overview

This document analyzes the current AI agent context management hierarchy and logic, specifically around dynamic tool definitions, delegation patterns, and the relationship between the dashboard agent, Charles, and Karl sub-agents.

## Architecture Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Agent                          │
│  (Default state when no agentId specified)                  │
│  - Generic helpful assistant                                │
│  - Can delegate to sub-agents via switchAgent tool         │
│  - System instruction: Generic helper                       │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Charles Agent  │    │   Karl Agent     │
│  (Hotel         │    │  (Calendar       │
│   Concierge)    │    │   Assistant)    │
│                 │    │                 │
│  Skills:        │    │  Skills:        │
│  - show-menu    │    │  - view-calendar│
│  - show-wellness│    │  - create-entry │
│                 │    │  - edit-entry   │
│                 │    │  - delete-entry │
└─────────────────┘    └─────────────────┘
```

## Key Components

### 1. Agent Configuration System

**Location:** `libs/hominio-agents/lib/agents/{agentId}/config.json`

Each agent has a JSON configuration file defining:
- **Identity**: `id`, `name`, `role`, `description`, `avatar`
- **Prompts**: `systemInstructionTemplate`, `examplesText`
- **Data Context**: Background knowledge/instructions (JSON-based)
- **Skills**: Array of capabilities with:
  - `id`: Skill identifier
  - `name`: Human-readable name
  - `description`: What the skill does
  - `functionId`: Function implementation ID
  - `parameters`: JSON schema for skill parameters
  - `dataContext`: Skill-specific context (optional, overrides agent-level)

**Current Agents:**
- `charles`: Hotel Concierge (2 skills: show-menu, show-wellness)
- `karl`: Calendar Assistant (4 skills: view-calendar, create-calendar-entry, edit-calendar-entry, delete-calendar-entry)

### 2. Dynamic Tool Definition System

**Location:** `libs/hominio-agents/src/tool-schema-builder.js`

**How It Works:**

1. **Schema Aggregation**: On WebSocket connection, the system:
   - Loads ALL agent configs (`charles`, `karl`)
   - Collects ALL skills from all agents
   - Builds a **comprehensive unified schema** for the `actionSkill` tool

2. **Schema Building Process**:
   ```javascript
   // From voice/live.ts lines 129-150
   const allSkills = [];
   for (const agentId of ['charles', 'karl']) {
       const agentConfig = await loadAgentConfig(agentId);
       allSkills.push(...agentConfig.skills);
   }
   const actionSkillArgsSchema = buildActionSkillArgsSchema(allSkills);
   ```

3. **Unified Tool Schema**:
   - **Base properties**: `agentId` (enum: ["charles", "karl"]), `skillId` (string)
   - **Dynamic properties**: All parameters from ALL skills merged into one flat schema
   - **Required fields**: Only `agentId` and `skillId` are strictly required
   - **Context-aware descriptions**: Each parameter includes which skill it belongs to

**Example Schema Structure:**
```json
{
  "type": "object",
  "properties": {
    "agentId": { "type": "string", "enum": ["charles", "karl"] },
    "skillId": { "type": "string" },
    // Charles skills parameters
    "category": { "type": "string", "enum": ["appetizers", "mains", ...] },
    // Karl skills parameters
    "title": { "type": "string", "description": "REQUIRED when skillId='create-calendar-entry'..." },
    "date": { "type": "string", "description": "REQUIRED when skillId='create-calendar-entry'..." },
    "time": { "type": "string", "description": "REQUIRED when skillId='create-calendar-entry'..." },
    "duration": { "type": "number", "description": "REQUIRED when skillId='create-calendar-entry'..." },
    "id": { "type": "string", "description": "REQUIRED when skillId='edit-calendar-entry'..." }
  },
  "required": ["agentId", "skillId"],
  "additionalProperties": false
}
```

**Key Design Decision**: The tool schema is **static** (built once at connection time) but **comprehensive** (includes all possible parameters from all agents). The LLM must provide the correct parameters based on the `skillId` it chooses.

### 3. Context Management Flow

#### A. Initial Connection (Dashboard State)

**Location:** `services/api/src/routes/v0/voice/live.ts` (lines 115-180)

1. **Default State**: `currentAgentId = null` (dashboard mode)
2. **System Instruction**: Generic helper message
3. **Tool Schema**: Built from ALL agents' skills (comprehensive)
4. **Available Tools**:
   - `switchAgent`: Navigate to agent or dashboard
   - `actionSkill`: Execute any skill (but context-checked)

#### B. Agent Switching (Delegation)

**Location:** `services/api/src/routes/v0/voice/live.ts` (lines 287-335, 475-524)

**Flow:**
1. User requests agent switch: `switchAgent({ agentId: "charles" })`
2. System loads agent config: `loadAgentConfig(agentId)`
3. Builds agent-specific system instruction:
   - Loads agent's `dataContext` (excluding menu/wellness)
   - Builds system instruction from template
   - Injects calendar context for Karl (if applicable)
4. Updates conversation context:
   - Sends new system instruction as text message to Google Live API
   - Updates `currentAgentId` and `currentAgentConfig` in session
5. **Tool Schema Remains Unchanged**: Still comprehensive, but context-checked

**Key Point**: The tool schema doesn't change, but the **system instruction** changes to reflect the current agent's context and capabilities.

#### C. Skill Execution (Action Delegation)

**Location:** `services/api/src/routes/v0/voice/live.ts` (lines 336-403, 527-644)

**Flow:**
1. LLM calls `actionSkill({ agentId: "charles", skillId: "show-menu", ... })`
2. **Context Validation**:
   ```javascript
   if (!currentAgentId || currentAgentId !== agentId) {
       // Reject: Skill not available in current context
   }
   ```
3. **Dynamic Context Injection** (for specific skills):
   - `show-menu`: Injects menu data context (from skill's `dataContext`)
   - `show-wellness`: Injects wellness data context (from skill's `dataContext`)
   - Calendar skills: Injects calendar context (from `getCalendarContextString()`)
4. **Frontend Execution**: Tool call forwarded to frontend for actual execution

**Key Design**: Skills can only be executed when the **current agent context matches** the requested agent. This prevents cross-agent skill execution.

### 4. Data Context Hierarchy

**Location:** `libs/hominio-agents/src/data-context-loader.js`

**Context Loading Priority:**

1. **Agent-Level Context** (`agentConfig.dataContext`):
   - General background knowledge
   - Loaded into system instruction at agent switch
   - **Excludes**: `menu` and `wellness` (injected dynamically)

2. **Skill-Level Context** (`skill.dataContext`):
   - Skill-specific data (e.g., menu data for `show-menu`)
   - **Injected dynamically** when skill is called
   - **Overrides**: Agent-level context for that skill

3. **Runtime Context** (special cases):
   - **Calendar Context**: Injected for Karl or calendar-related skills
   - **Current Date**: Added to all system instructions

**Context Injection Flow:**
```
Agent Switch
  ↓
Load agentConfig.dataContext
  ↓
Exclude menu/wellness
  ↓
Build system instruction
  ↓
[User calls skill]
  ↓
Load skill.dataContext (if exists)
  ↓
Inject as text message to conversation
  ↓
Execute skill handler
```

### 5. System Instruction Building

**Location:** `libs/hominio-agents/src/system-instruction-builder.js`

**Process:**
1. Load agent config
2. Build skills description from `agentConfig.skills`
3. Load data context (excluding menu/wellness)
4. Get examples text from config or use default
5. Replace template placeholders:
   - `{name}` → Agent name
   - `{role}` → Agent role
   - `{description}` → Agent description
   - `{skillsDesc}` → Formatted skills list
   - `{examplesText}` → Usage examples
   - `{dataContext}` → Formatted data context
   - `{calendarContext}` → Calendar context (Karl only)
6. Append current date context

**Template Example:**
```
Du bist {name}, {role}. {description}

Verfügbare Funktionen, die du mit actionSkill ausführen kannst:
{skillsDesc}

{examplesText}

{dataContext}{calendarContext}

AKTUELLES DATUM: [formatted date]
```

## Delegation Patterns

### Pattern 1: Dashboard → Agent Delegation

**Trigger**: User says "I want to talk to Charles" or "Switch to Karl"

**Flow:**
1. LLM calls `switchAgent({ agentId: "charles" })`
2. System loads Charles config
3. Updates system instruction with Charles context
4. User can now use Charles skills

**Current Limitation**: Dashboard agent has generic system instruction. It doesn't know about available agents unless told via `switchAgent`.

### Pattern 2: Agent → Agent Delegation

**Current State**: Not directly supported. User must:
1. Switch back to dashboard: `switchAgent({ agentId: "dashboard" })`
2. Then switch to another agent: `switchAgent({ agentId: "karl" })`

**Potential Enhancement**: Agents could directly call `switchAgent` to delegate to another agent.

### Pattern 3: Skill → Skill Delegation

**Current State**: Skills are independent. No built-in delegation.

**Example**: Karl's `edit-calendar-entry` requires calling `view-calendar` first (handled via instructions, not code).

## Current Architecture Strengths

1. **Unified Tool Schema**: Single `actionSkill` tool handles all skills from all agents
2. **Dynamic Context Injection**: Large data (menu, wellness) only injected when needed
3. **Context Isolation**: Skills can only execute in correct agent context
4. **JSON-Based Configuration**: Agents defined in JSON, easy to extend
5. **Comprehensive Schema**: LLM sees all possible parameters upfront

## Current Architecture Limitations

1. **Static Tool Schema**: Schema built once at connection, doesn't adapt to current agent
2. **No Agent Discovery**: Dashboard agent doesn't know available agents without hardcoding
3. **Manual Context Switching**: No automatic delegation between agents
4. **Schema Complexity**: Large unified schema may confuse LLM (all parameters visible)
5. **No Skill Chaining**: Skills can't directly call other skills

## Recommendations

### 1. Dynamic Tool Schema Per Agent

**Current**: One comprehensive schema for all agents
**Proposed**: Build schema dynamically based on `currentAgentId`

**Benefits**:
- Simpler schema per agent (less confusion)
- Better parameter validation
- Clearer tool descriptions

**Trade-offs**:
- Schema rebuild on agent switch (minimal overhead)
- Need to handle dashboard state (show all or none)

### 2. Agent Discovery System

**Current**: Hardcoded agent list
**Proposed**: Dynamic agent discovery

**Implementation**:
- `listAgents()` already exists but returns hardcoded list
- Could scan `lib/agents/` directory
- Dashboard agent could receive list of available agents in system instruction

### 3. Enhanced Delegation

**Current**: Manual `switchAgent` calls
**Proposed**: Automatic delegation patterns

**Examples**:
- Charles could delegate calendar requests to Karl
- Dashboard could intelligently route to appropriate agent
- Agents could have "delegation rules" in config

### 4. Skill Chaining

**Current**: Skills are independent
**Proposed**: Skills can call other skills

**Implementation**:
- Add `delegatesTo` field in skill config
- Handler could execute delegated skill automatically
- Example: `show-menu` could delegate to `show-wellness` if user asks about spa menu

## Code Flow Summary

### Connection Flow
```
WebSocket Open
  ↓
Authenticate User
  ↓
Check api:voice Capability
  ↓
Load ALL Agent Configs
  ↓
Build Comprehensive Tool Schema (all skills)
  ↓
Load Initial Agent Config (if agentId in query)
  ↓
Build System Instruction
  ↓
Connect to Google Live API
```

### Agent Switch Flow
```
switchAgent Tool Call
  ↓
Load Target Agent Config
  ↓
Build Agent-Specific System Instruction
  ↓
Inject Calendar Context (if Karl)
  ↓
Send System Instruction to Google Live API
  ↓
Update currentAgentId
```

### Skill Execution Flow
```
actionSkill Tool Call
  ↓
Validate currentAgentId matches agentId
  ↓
Load Agent Config
  ↓
Find Skill Definition
  ↓
Inject Dynamic Context (menu/wellness/calendar)
  ↓
Forward to Frontend for Execution
  ↓
Return Success Response
```

## Key Files Reference

- **Voice Handler**: `services/api/src/routes/v0/voice/live.ts`
- **Tool Schema Builder**: `libs/hominio-agents/src/tool-schema-builder.js`
- **System Instruction Builder**: `libs/hominio-agents/src/system-instruction-builder.js`
- **Data Context Loader**: `libs/hominio-agents/src/data-context-loader.js`
- **Action Skill Handler**: `libs/hominio-agents/src/action-skill-handler.js`
- **Agent Loader**: `libs/hominio-agents/src/agent-loader.js`
- **Agent Configs**: `libs/hominio-agents/lib/agents/{agentId}/config.json`

## Voice Configuration & Agent Voice Switching

### Current Implementation

**Location:** `services/api/src/routes/v0/voice/live.ts` (lines 182-191)

The Google Gemini Live API voice configuration is set **once at connection time**:

```typescript
const config = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: systemInstruction,
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: "Sadachbia",  // Currently hardcoded
            },
        },
    },
    // ... tools
};
```

### Voice Switching Limitations

**Research Findings:**

1. **No Mid-Call Voice Updates**: The Google Gemini Live API does **not support** changing the voice configuration during an active session. The `speechConfig` is set when `ai.live.connect()` is called and cannot be modified afterward.

2. **Session Methods Available**: The session object provides:
   - `sendClientContent()` - Send text/system messages
   - `sendRealtimeInput()` - Send audio/activity signals
   - `sendToolResponse()` - Respond to tool calls
   - `close()` - Close the session
   - **No `updateConfig()` or similar method exists**

3. **Current Voice**: Currently hardcoded to `"Sadachbia"` for all agents

### Potential Solutions

#### Option 1: Per-Agent Voice at Connection (Recommended)

**Implementation**: Set different voices based on `initialAgentId` when starting a call:

```typescript
// Map agent IDs to voice names
const agentVoiceMap = {
    'charles': 'Sadachbia',  // Current default
    'karl': 'Charon',        // Example: different voice for Karl
    'dashboard': 'Sadachbia' // Default voice
};

// In connection setup:
const voiceName = initialAgentId 
    ? agentVoiceMap[initialAgentId] || agentVoiceMap['dashboard']
    : agentVoiceMap['dashboard'];

const config = {
    // ...
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: voiceName,
            },
        },
    },
};
```

**Pros:**
- Simple to implement
- Each agent gets a distinct voice from the start
- No session interruption

**Cons:**
- Voice cannot change mid-call when switching agents
- Requires reconnecting to change voice

#### Option 2: Session Reconnection on Agent Switch

**Implementation**: When `switchAgent` is called, close and reopen the session with new voice:

```typescript
if (functionCall.name === "switchAgent") {
    const agentId = functionCall.args?.agentId;
    
    // Close current session
    session.close();
    
    // Reconnect with new agent's voice
    const newVoice = agentVoiceMap[agentId] || agentVoiceMap['dashboard'];
    const newSession = await ai.live.connect({
        model: MODEL,
        config: {
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: newVoice }
                }
            },
            // ... other config
        },
        // ... callbacks
    });
    
    ws.data.googleSession = newSession;
}
```

**Pros:**
- Voice changes when switching agents
- Each agent maintains distinct voice

**Cons:**
- **Disruptive**: Requires reconnection, interrupting conversation flow
- **Complex**: Need to preserve conversation state
- **Not seamless**: User experiences connection interruption

#### Option 3: Agent Voice Configuration in JSON

**Implementation**: Add voice configuration to agent config files:

```json
// libs/hominio-agents/lib/agents/charles/config.json
{
    "id": "charles",
    "name": "Charles",
    "voiceName": "Sadachbia",  // Add voice preference
    // ... rest of config
}

// libs/hominio-agents/lib/agents/karl/config.json
{
    "id": "karl",
    "name": "Karl",
    "voiceName": "Charon",  // Different voice for Karl
    // ... rest of config
}
```

Then load voice from config:

```typescript
const agentConfig = await loadAgentConfig(initialAgentId);
const voiceName = agentConfig.voiceName || 'Sadachbia'; // Default fallback
```

**Pros:**
- Voice configuration lives with agent config (single source of truth)
- Easy to add new agents with custom voices
- Can be changed without code changes

**Cons:**
- Still requires reconnection to change voice mid-call

### Available Voice Names

Based on Google Gemini API documentation, available prebuilt voices include:
- `"Sadachbia"` (current default)
- `"Charon"`
- `"Fenrir"`
- `"Kore"`
- `"Puck"`
- And others (check Google's documentation for complete list)

**Note**: Voice availability may vary by region and API version. Always verify available voices in the current API version.

### Recommendation

**Short-term**: Implement **Option 1** (per-agent voice at connection) combined with **Option 3** (voice in agent config). This provides:
- Distinct voices per agent
- Configuration-driven approach
- No code changes needed to add new agent voices

**Long-term**: If Google adds support for mid-call voice updates, implement **Option 2** with seamless session reconnection that preserves conversation context.

### Implementation Notes

1. **Voice Persistence**: Once a call starts with a voice, it cannot change without reconnecting
2. **User Experience**: Consider informing users that voice changes require reconnection
3. **Fallback**: Always provide a default voice name if agent config doesn't specify one
4. **Testing**: Verify voice names are valid for your API version/region

## Conclusion

The current architecture provides a solid foundation for multi-agent AI systems with:
- Clear separation between dashboard and sub-agents
- Dynamic tool definitions that aggregate all skills
- Context-aware skill execution
- JSON-based agent configuration

**Voice Configuration Status**: 
- ✅ Can set different voices per agent at connection time
- ❌ Cannot change voice mid-call (Google API limitation)
- ✅ Can configure voices via agent JSON config files

The main areas for improvement are:
1. Making tool schemas dynamic per agent
2. Adding agent discovery capabilities
3. Enhancing delegation patterns
4. Supporting skill chaining
5. **Implementing per-agent voice configuration** (voice switching requires reconnection)

