// @claude-code-server/agent-manager
// Agent orchestration, process management, and protocol parsing

export { AgentManager } from './AgentManager.js';
export { AgentProcess } from './AgentProcess.js';
export { ProtocolParser } from './ProtocolParser.js';
export { StateMachine } from './StateMachine.js';
export { WorkflowEngine } from './WorkflowEngine.js';
export type { WorkflowContext } from './WorkflowEngine.js';
export { DeliverableCollector } from './DeliverableCollector.js';
export { VerificationAgent } from './VerificationAgent.js';
export type { VerificationResult, VerificationIssue } from './VerificationAgent.js';
export {
  getWorkflowDefinition,
  getPhaseDefinition,
  getTotalPhases,
  isLastPhase,
  hasReviewGate,
} from './WorkflowDefinitions.js';
