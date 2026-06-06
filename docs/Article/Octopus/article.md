# Building Enterprise AI Agents with Octopus: A Complete Framework for Intelligent Automation

Most AI frameworks treat agents as stateless chatbotsâ€”drop in a user message, get a response, forget it happened. But real enterprise systems demand more: agents that remember past interactions, respect tenant boundaries, integrate with business workflows, and operate reliably at scale.

Octopus changes this. Built into the BizFirst platform, Octopus is an enterprise AI agent framework that combines agent orchestration, four distinct memory systems, tool calling via the Model Context Protocol, and a rich plugin ecosystem. This article walks you through what Octopus does, how it works, and why it matters for production AI systems.

## The Problem Octopus Solves

Enterprise teams face a consistent challenge: generic LLM wrappers don't solve real business problems. Consider an HR agent handling leave requests. It needs to:

- Remember past conversations with the same employee across multiple sessions
- Query the employee database for leave balances
- Route complex requests to a human reviewer
- Integrate with approval workflows
- Respect multi-tenant isolation in a SaaS system
- Handle tool calls reliably without hallucinating function schemas

Most AI frameworks punt on these requirements. They focus on stateless inference and leave you to build memory, routing, multi-tenancy, and reliability yourself. Octopus bakes all of it in.

## Why This Solution Exists

The shift from prompt-as-program to agents-as-systems represents a maturity point in AI software. When your LLM is just answering questions, a simple chatbot wrapper suffices. When your LLM is automating workâ€”approving requests, querying databases, triggering workflowsâ€”you need infrastructure.

Octopus exists because BizFirst discovered through building production agents that you need:

1. **Composite-based architecture**: Agents, conversations, and users as persistent graph objects that hydrate from a single database lookup
2. **Four memory systems**: Each solving a different recall problem (current context, past sessions, knowledge embeddings, repeatable procedures)
3. **Tool standardization**: MCP (Model Context Protocol) so LLMs call tools in a standard way
4. **Plugin extensibility**: SQL persistence, semantic search, web automation, UI streaming, and workflow integrationâ€”all pluggable
5. **Multi-agent coordination**: Orchestrator and specialist agents working together without cascading complexity

These aren't nice-to-have features. They're load-bearing constraints on production AI systems.

## Core Features and Capabilities

### 1. Three Composite Objects as the Data Model

Octopus organizes agent state into three graph-structured composites:

- **AgentComposite**: The blueprint. Defines the LLM config, memory settings, tool registry, plugins, system prompt, and constraints. Created once, reused across conversations.
- **ConversationComposite**: The session. Contains message history, working memory context, tool call history, and references to agent and user. Lives for the duration of a conversation.
- **UserComposite**: The human. Stores identity, preferences, accessible agents, tenant membership, and conversation history. Users can run multiple concurrent conversations.

This model eliminates the "who is talking to what, and what do they know?" problem. Hydrate any conversation with one database query and you have complete context.

### 2. Four Memory Systems

Most agents have working memory (the LLM context window) and nothing else. Octopus provides four:

| Memory Type | Storage | Lifetime | Use Case |
|---|---|---|---|
| **Working** | In-process RAM | One session turn | Current LLM context window |
| **Episodic** | SQL Server | 90 days (configurable) | Past conversation history, user preferences learned over time |
| **Semantic** | Vector DB (Qdrant/PGVector) | Persistent | Knowledge baseâ€”policies, FAQs, embedded documents |
| **Procedural** | SQL Server | Persistent | Learned skill sequences, repeatable multi-step tasks |

Before each LLM call, the MemoryOrchestrator runs four parallel queriesâ€”one per memory typeâ€”and assembles results into working memory. An HR agent asking about "parental leave" retrieves the policy document (semantic), similar past conversations (episodic), and if applicable, the "onboard new employee" skill (procedural).

### 3. Model Context Protocol (MCP) for Tool Calling

Octopus uses MCPâ€”Anthropic's standardized protocol for LLM tool calling. Every tool is a schema (name, description, input parameters) plus a handler (the code that runs).

An agent's `MCPToolRegistry` holds all available tools. When an LLM response includes a tool call, the runtime looks up the handler, executes it, and appends the result to the conversation history. The LLM then continues reasoning with the tool result.

This is not hallucinationâ€”the LLM doesn't invent tool schemas. It selects from a curated registry of real, validated tools.

### 4. Plugin Ecosystem

Octopus extends through plugins implementing `IOctopusPlugin`. Five plugins ship built-in:

- **SqlServerPlugin**: SQL persistence for all memory types, agent definitions, and procedures. Required for production.
- **SemanticKernelPlugin**: Vector store integration, embedding, RAG pipeline, and reranking.
- **WebDriverPlugin**: Browser automation (Playwright-based) so agents can scrape websites and fill forms.
- **ChatbotUIPlugin**: Streaming responses, form rendering, and file uploads for end-user chat interfaces.
- **ProcessPlugin**: Flow Studio integrationâ€”agents can trigger workflows and workflows can call agents.

Each plugin has a lifecycle: register services at startup, initialize after DI container builds, clean up on shutdown. You can write custom plugins without touching core.

### 5. Multi-Agent Coordination

A single general-purpose agent struggles with depth. Multi-agent systems split the load: an orchestrator agent routes to specialists.

The orchestrator receives the user message and decides which specialist to call using a routing strategy:

- **Keyword Routing**: Fast string matching (simple, predictable)
- **Embedding Routing**: Semantic similarity against known intents (nuanced)
- **LLM Routing**: Let the LLM decide via tool call (complex reasoning)
- **Explicit Routing**: User picks the agent directly (power users)

When a specialist is selected, the conversation context transfers via handoff. The specialist agent spins up with its own memory configuration, tool registry, and system prompt. The response comes back to the user, or the orchestrator post-processes it.

## Architecture and System Design

Here's how Octopus orchestrates a single agent response:

```
1. User Message Arrives
   â†’ ConversationComposite created or resumed
   â†’ Working memory initialized

2. Memory Assembly
   â†’ Query episodic store (past sessions)
   â†’ Query semantic store (knowledge base)
   â†’ Query procedural store (matching skills)
   â†’ All run in parallel
   â†’ Results merged into context window

3. LLM Call
   â†’ Full context sent: system prompt + retrieved knowledge + history + current message
   â†’ LLM may return text or tool calls

4. Tool Execution (if needed)
   â†’ MCPToolRegistry looks up handler for each tool call
   â†’ Handlers execute (DB query, API call, workflow trigger, etc.)
   â†’ Results appended to conversation history
   â†’ Loop back to step 3 with tool results in context

5. Final Response
   â†’ LLM produces text response
   â†’ Streamed to user via Server-Sent Events
   â†’ Episode persisted to episodic memory
   â†’ Conversation closed
```

The architecture is pluggable at every layer. You provide different LLM providers via `ILLMProvider`. You plugin memory backends. You register custom tools and plugins. The core orchestration remains constant.

## Practical Example: An HR Agent Scenario

Imagine building an HR agent that handles leave requests. Here's what happens end-to-end:

1. **Setup**: Create an AgentComposite with:
   - System prompt: "You are an HR assistant. Help with leave requests, balance checks, and policy questions."
   - LLM: "gpt-4o via OpenAI provider"
   - Memory config: all four types enabled
   - Tools: `check_leave_balance`, `submit_leave_request`, `get_hr_policy`, `escalate_to_human`
   - Knowledge base: HR policies and procedures (loaded to semantic memory)

2. **User Asks**: "I have 5 days left. Can I take 3 days off starting next Monday?"

3. **Memory Assembly** (parallel):
   - Episodic: Retrieve past leave requests from this user
   - Semantic: Retrieve company leave policies
   - Procedural: Retrieve the "process leave request" skill
   - Working: Assemble all into context

4. **LLM Reasoning**:
   - LLM decides to call `check_leave_balance` with the user's ID
   - Tool executes, returns "5 days remaining"
   - LLM now decides to call `submit_leave_request` with dates and reason
   - Tool executes, request created and queued for approval
   - LLM generates response: "I've submitted your 3-day leave request for next Monday through Wednesday. Your manager will review it."

5. **Store**: Episode persisted. Next time this user talks to the agent, it remembers this conversation.

This is not a chatbot. This is a worker.

## Real-World Use Cases

**Finance**: An accounting agent that queries GL accounts, matches invoices, flags discrepancies, and triggers approval workflows for exceptions.

**Customer Support**: A support agent that searches the knowledge base, looks up account status, creates tickets, and escalates to humans when sentiment is escalating.

**IT Operations**: An ops agent that queries infrastructure, runs health checks, restarts services (with safeguards), and pages on-call engineers when needed.

**Vendor Management**: A vendor agent that onboards new vendors (multi-step procedural task), answers contract questions (semantic search), and routes compliance reviews to human reviewers.

Each agent can work independently or as part of a multi-agent team, routing complex requests to the right specialist.

## Benefits Summary

- **Stateful**: Agents remember across sessions. No context loss between turns.
- **Scalable**: Stateless LLM calls, but state managed by persistent storage. Handles thousands of concurrent conversations.
- **Safe**: Tool calling is standardized. No hallucinated function schemas. Fine-grained security guards on sensitive operations.
- **Integrated**: Plugins for SQL, semantic search, web automation, workflow triggering. Build on a foundation, not from scratch.
- **Flexible**: Four memory systems solve different recall problems. Multi-agent routing handles complexity. Custom plugins extend without core changes.
- **Observable**: Conversations, memory, tools, and plugins are all instrumentable. Debug why an agent made a decision.

## Best Practices When Using Octopus

1. **System Prompt Design**: Write tight system prompts. Include role, constraints, and what the agent should and should not do. "You are an HR assistant. Never approve leaves beyond 30 days. Always cite policy in responses."

2. **Tool Count**: Keep under 20 tools per agent. Too many confuses the LLM. Use naming conventions to group related tools (e.g., `hr_check_balance`, `hr_submit_request`).

3. **Memory Configuration**: Enable only the memory types you need. Episodic for conversational continuity, semantic for knowledge-heavy tasks, procedural for repeatable workflows, working for reasoning.

4. **Multi-Agent Design**: Use orchestrator + specialist pattern for complex domains. Specialists should be narrowly focused (HR agent handles leave, benefits, hiringâ€”not finance). Let the orchestrator handle ambiguous routing.

5. **Tool Result Sizing**: Keep tool results under 2000 tokens. Truncate large datasets. The LLM's context window is finite. Return only what the agent needs to reason about.

6. **Security Boundaries**: Wrap sensitive tools in guards. Check user role, tenant membership, and resource access before executing. The LLM is not an authorization layer.

7. **Monitoring**: Log tool calls, memory retrievals, and routing decisions. When an agent makes a bad decision, you need to trace whyâ€”which tools were available, what memory was retrieved, why the routing decision was made.

8. **Iterative Refinement**: Start with a simple agent (few tools, basic system prompt), measure what goes wrong, and refine. Add memory types incrementally. Add specialists as complexity grows.

## Conclusion

Octopus is not a chatbot framework. It's an enterprise agent runtime. If you're building agents that need to handle real workâ€”querying databases, calling APIs, triggering workflows, remembering users across sessions, and operating reliably at scaleâ€”Octopus provides the infrastructure you'd otherwise build yourself.

The composite model, four memory systems, MCP tool calling, plugin ecosystem, and multi-agent coordination are not decorative. They're solutions to the hard problems of production AI: state management, context assembly, safe tool execution, and agent specialization.

Start with the [Octopus Framework guide](https://docs.bizfirstai.com/WebSites/Octopus/) to understand the three composites and reasoning loop. Then dive into memory systems, tools, and plugins based on your needs. Build a simple agent first, measure outcomes, and extend from there.

Enterprise AI requires enterprise infrastructure. Octopus is built for that reality.
