import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import orchestrate


class OrchestrationPlanTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = orchestrate.validate_snapshot({
            "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "self_pane_id": "w1:p1",
            "panes": [
                {"pane_id": "w1:p4", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"kind": "codex", "state": "blocked"}},
                {"pane_id": "w2:p1", "workspace_id": "w2", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"kind": "codex", "state": "idle"}},
                {"pane_id": "w1:p3", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/elsewhere", "agent": {"kind": "codex", "state": "done"}},
                {"pane_id": "w1:p2", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"kind": "codex", "state": "idle"}},
                {"pane_id": "w1:p1", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": None},
                {"pane_id": "w1:p5", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"kind": "codex", "state": "working"}},
            ],
        })

    def test_filters_self_other_workspace_other_cwd_and_unready_workers(self):
        self.assertEqual(orchestrate.filter_candidates(self.snapshot), [{"pane_id": "w1:p2", "state": "idle"}])

    def test_candidate_order_is_deterministic(self):
        self.snapshot["panes"].append({"pane_id": "w1:p6", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"state": "done"}})
        self.assertEqual([x["pane_id"] for x in orchestrate.filter_candidates(self.snapshot)], ["w1:p2", "w1:p6"])

    def test_missing_agent_field_fails(self):
        raw = {"workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "self_pane_id": "w1:p1", "panes": [
            {"pane_id": "w1:p1", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail"},
        ]}
        with self.assertRaisesRegex(orchestrate.PlanError, "agent is required"):
            orchestrate.validate_snapshot(raw)

    def test_session_id_is_required_and_consistent(self):
        valid = {"workspace_id": "w1", "session_id": "s1", "cwd": "/work/quail", "self_pane_id": "w1:p1",
                 "panes": [{"pane_id": "w1:p1", "workspace_id": "w1", "session_id": "s1", "cwd": "/work/quail", "agent": None}]}
        missing_root = {key: value for key, value in valid.items() if key != "session_id"}
        empty_root = {**valid, "session_id": " "}
        missing_pane = {**valid, "panes": [{key: value for key, value in valid["panes"][0].items() if key != "session_id"}]}
        mismatch = {**valid, "panes": [{**valid["panes"][0], "session_id": "s2"}]}
        empty_pane = {**valid, "panes": [{**valid["panes"][0], "session_id": " "}]}
        for raw in (missing_root, empty_root, missing_pane, mismatch, empty_pane):
            with self.subTest(snapshot=raw), self.assertRaises(orchestrate.PlanError):
                orchestrate.validate_snapshot(raw)

    def test_duplicate_panes_fail(self):
        pane = {"pane_id": "w1:p2", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"state": "idle"}}
        raw = {"workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "self_pane_id": "w1:p1", "panes": [
            {"pane_id": "w1:p1", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": None}, pane, pane,
        ]}
        with self.assertRaisesRegex(orchestrate.PlanError, "duplicate pane_id"):
            orchestrate.validate_snapshot(raw)

    def test_self_target_fails(self):
        with self.assertRaisesRegex(orchestrate.PlanError, "self pane"):
            orchestrate.filter_candidates(self.snapshot, ["w1:p1"])

    def test_multiple_target_panes_fail_single_writer_rule(self):
        with self.assertRaisesRegex(orchestrate.PlanError, "one target pane"):
            orchestrate.filter_candidates(self.snapshot, ["w1:p2", "w1:p4"])

    def test_explicit_cross_workspace_or_cwd_target_fails(self):
        for pane_id, message in (("w2:p1", "another workspace"), ("w1:p3", "different cwd")):
            with self.subTest(pane_id=pane_id), self.assertRaisesRegex(orchestrate.PlanError, message):
                orchestrate.filter_candidates(self.snapshot, [pane_id])

    def test_task_id_and_done_when_are_required(self):
        with self.assertRaisesRegex(orchestrate.PlanError, "task_id must be a non-empty"):
            orchestrate.build_plan(self.snapshot, task_id=" ", task="Review", done_when="Findings sent")
        with self.assertRaisesRegex(orchestrate.PlanError, "done_when must be a non-empty"):
            orchestrate.build_plan(self.snapshot, task_id="T-1", task="Review", done_when=" ")

    def test_multiple_candidates_receive_no_write_prompt(self):
        self.snapshot["panes"].append({"pane_id": "w1:p6", "workspace_id": "w1", "session_id": "session-local-1", "cwd": "/work/quail", "agent": {"state": "idle"}})
        plan = orchestrate.build_plan(self.snapshot, task_id="T-1", task="Inspect", done_when="Report options")
        self.assertEqual([x["pane_id"] for x in plan["candidates"]], ["w1:p2", "w1:p6"])
        self.assertTrue(all("prompt" not in candidate for candidate in plan["candidates"]))

    def test_single_explicit_target_gets_complete_prompt(self):
        plan = orchestrate.build_plan(
            self.snapshot, task_id="T-1", task="Review plan", done_when="Findings sent", target_panes=["w1:p2"],
            role="read-only reviewer", file_ownership="No writes", verification="Check filters", reply_to="orchestrator w1:p1",
        )
        prompt = plan["candidates"][0]["prompt"]
        for expected in ("Task ID: T-1", "Done when: Findings sent", "File ownership: No writes",
                         "Reply address: orchestrator w1:p1", "Session ID: session-local-1", "segments of at most 5 minutes",
                         "Only an explicit worker reply confirms acceptance", "Never answer a blocked"):
            self.assertIn(expected, prompt)

    def test_prompt_cannot_target_self_or_other_context(self):
        base = dict(task_id="T-1", task="Review", done_when="Report", role="reviewer", file_ownership="none",
                    verification="inspect", reply_to="w1:p1", workspace_id="w1", session_id="session-local-1", cwd="/work/quail",
                    self_pane_id="w1:p1", target_pane_id="w1:p2", target_cwd="/work/quail")
        with self.assertRaisesRegex(orchestrate.PlanError, "self pane"):
            orchestrate.render_prompt(**{**base, "target_pane_id": "w1:p1"})
        with self.assertRaisesRegex(orchestrate.PlanError, "declared workspace"):
            orchestrate.render_prompt(**{**base, "target_pane_id": "w2:p2"})
        with self.assertRaisesRegex(orchestrate.PlanError, "target cwd"):
            orchestrate.render_prompt(**{**base, "target_cwd": "/work/other"})

    def test_empty_candidate_set_fails(self):
        only_self = {**self.snapshot, "panes": [self.snapshot["panes"][4]]}
        with self.assertRaisesRegex(orchestrate.PlanError, "no eligible existing workers"):
            orchestrate.filter_candidates(only_self)


if __name__ == "__main__":
    unittest.main()
