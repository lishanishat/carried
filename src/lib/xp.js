export const XP = {
  rescue_assist: 40,
  tagin_assist: 40,
  clean_handoff: 15,
  review_help: 10,
};

export const XP_LABELS = {
  objective_confirmed: "Mission confirmed",
  rescue_assist: "Rescue assist",
  tagin_assist: "Tag-in assist",
  clean_handoff: "Clean handoff",
  review_help: "Helpful review",
};

export const STATUS_LABEL = {
  available: "Available",
  in_progress: "In progress",
  blocked: "Blocked",
  tag_in_requested: "Tag-in requested",
  under_review: "Under review",
  confirmed: "Confirmed",
  needs_revision: "Needs revision",
};

export const STATUS_STYLE = {
  available: "border-signal/35 bg-signal/10 text-signal",
  in_progress: "border-purple-400/35 bg-purple-400/10 text-purple-300",
  blocked: "border-danger/45 bg-danger/10 text-danger",
  tag_in_requested: "border-pink-400/40 bg-pink-400/10 text-pink-300",
  under_review: "border-warn/40 bg-warn/10 text-warn",
  confirmed: "border-neon/40 bg-neon/10 text-neon",
  needs_revision: "border-warn/45 bg-warn/10 text-warn",
};

export const DIFFICULTY_STYLE = {
  Easy: "text-neon",
  Medium: "text-warn",
  Hard: "text-danger",
};

export const EVENT_LABEL = {
  player_joined: "Player joined",
  role_locked: "Role locked",
  match_started: "Match started",
  objective_started: "Mission started",
  proof_submitted: "Proof submitted",
  objective_confirmed: "Mission confirmed",
  objective_rejected: "Changes requested",
  rescue_requested: "Rescue requested",
  rescue_volunteered: "Rescue accepted",
  rescue_completed: "Rescue completed",
  tagin_requested: "Tag-in requested",
  tagin_accepted: "Tag-in accepted",
  tagin_cancelled: "Tag-in cancelled",
  dependency_cleared: "Critical path cleared",
  milestone: "Milestone",
  boss_activated: "Final boss",
  match_finished: "Match complete",
};
