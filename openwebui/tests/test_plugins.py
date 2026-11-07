import importlib.util
import json
import pathlib
import unittest
from unittest.mock import AsyncMock, patch

PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_plugin(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


FILTER_MODULE = load_plugin("gateway_retrieval", PACKAGE_ROOT / "filters/gateway_retrieval.py")
PIPE_MODULE = load_plugin("gateway_research", PACKAGE_ROOT / "pipes/gateway_research.py")


class FilterTests(unittest.IsolatedAsyncioTestCase):
    def make_filter(self):
        plugin = FILTER_MODULE.Filter()
        plugin.valves.GATEWAY_URL = "http://127.0.0.1:8080"
        plugin.valves.GATEWAY_TOKEN = "fixture-token"
        return plugin

    async def test_inlet_forwards_scope_and_injects_bounded_untrusted_evidence(self):
        plugin = self.make_filter()
        response = {
            "matches": [
                {"source_label": str(index), "text": "x" * 5001}
                for index in range(7)
            ]
        }
        body = {
            "folder_id": "folder-alpha",
            "files": [{"id": "file-alpha"}],
            "messages": [
                {"role": "system", "content": "existing"},
                {"role": "system", "content": "[second-brain-stack: untrusted document evidence]\nold"},
                {"role": "user", "content": "What does the policy say?"},
            ],
        }
        with patch.object(FILTER_MODULE, "post_json", new=AsyncMock(return_value=response)) as post:
            result = await plugin.inlet(body, {"id": "shell-user-alpha"})

        post.assert_awaited_once_with(
            "http://127.0.0.1:8080/v1/retrieval/query",
            "fixture-token",
            "shell-user-alpha",
            {"query": "What does the policy say?", "collection_ids": ["folder-alpha"], "limit": 6},
            15.0,
        )
        self.assertIs(result, body)
        self.assertEqual(body["folder_id"], "folder-alpha")
        self.assertEqual(body["files"], [{"id": "file-alpha"}])
        self.assertEqual(body["messages"][0]["role"], "system")
        content = body["messages"][0]["content"]
        self.assertIn("untrusted document evidence", content)
        self.assertIn('"index":6', content)
        self.assertNotIn('"index":7', content)
        self.assertNotIn("x" * 4001, content)
        self.assertEqual(sum(
            message.get("content", "").startswith(FILTER_MODULE.EVIDENCE_MARKER)
            for message in body["messages"]
            if isinstance(message, dict)
        ), 1)

    async def test_inlet_without_folder_is_a_noop(self):
        plugin = self.make_filter()
        body = {"messages": [{"role": "user", "content": "hello"}]}
        with patch.object(FILTER_MODULE, "post_json", new=AsyncMock()) as post:
            result = await plugin.inlet(body)
        self.assertIs(result, body)
        post.assert_not_awaited()

    async def test_inlet_rejects_invalid_scope_identity_and_url(self):
        plugin = self.make_filter()
        with self.assertRaisesRegex(FILTER_MODULE.GatewayError, "non-empty text"):
            await plugin.inlet(
                {"folder_id": " folder-alpha ", "messages": [{"role": "user", "content": "q"}]},
                {"id": "shell-user-alpha"},
            )
        with self.assertRaisesRegex(FILTER_MODULE.GatewayError, "identity"):
            await plugin.inlet(
                {"folder_id": "folder-alpha", "messages": [{"role": "user", "content": "q"}]},
                {},
            )
        plugin.valves.GATEWAY_URL = "http://gateway.example"
        with self.assertRaisesRegex(FILTER_MODULE.GatewayError, "HTTPS"):
            await plugin.inlet(
                {"folder_id": "folder-alpha", "messages": [{"role": "user", "content": "q"}]},
                {"id": "shell-user-alpha"},
            )

    async def test_inlet_masks_gateway_failure_and_never_logs_token(self):
        plugin = self.make_filter()
        failure = FILTER_MODULE.GatewayError("gateway request failed")
        with patch.object(FILTER_MODULE, "post_json", new=AsyncMock(side_effect=failure)):
            with self.assertRaises(FILTER_MODULE.GatewayError) as raised:
                await plugin.inlet(
                    {"folder_id": "folder-alpha", "messages": [{"role": "user", "content": "q"}]},
                    {"id": "shell-user-alpha"},
                )
        self.assertEqual(str(raised.exception), "gateway request failed")
        self.assertNotIn("fixture-token", str(raised.exception))


class PipeTests(unittest.IsolatedAsyncioTestCase):
    def make_pipe(self):
        plugin = PIPE_MODULE.Pipe()
        plugin.valves.GATEWAY_URL = "http://127.0.0.1:8080"
        plugin.valves.GATEWAY_TOKEN = "fixture-token"
        plugin.valves.EMBEDDING_MODEL_ID = "embedding-fixture"
        return plugin

    async def test_pipe_calls_answers_with_metadata_scope_and_renders_grounding(self):
        plugin = self.make_pipe()
        response = {
            "answer": "The policy applies [1].",
            "citations": [{
                "citation": {"label": "policy.pdf", "ref": "[doc:policy#seg0]"},
            }],
            "unresolved_citations": [3],
            "stale_citations": ["segment-stale"],
            "uncertainty": {"level": "high"},
        }
        with patch.object(PIPE_MODULE, "post_json", new=AsyncMock(return_value=response)) as post:
            output = await plugin.pipe(
                {"folder_id": "body-folder", "messages": [{"role": "user", "content": "question"}]},
                {"id": "shell-user-beta"},
                {"folder_id": "metadata-folder"},
            )

        post.assert_awaited_once_with(
            "http://127.0.0.1:8080/v1/answers",
            "fixture-token",
            "shell-user-beta",
            {
                "question": "question",
                "collection_ids": ["metadata-folder"],
                "embedding_model_id": "embedding-fixture",
            },
            15.0,
        )
        self.assertEqual(plugin.pipes(), [{"id": "research", "name": "Research"}])
        self.assertIn("The policy applies [1].", output)
        self.assertIn("policy.pdf", output)
        self.assertIn("Unresolved citations: 3", output)
        self.assertIn("Stale citations: segment-stale", output)
        self.assertIn("Uncertainty: high", output)

    async def test_pipe_accepts_body_scope_for_stack_compatibility(self):
        plugin = self.make_pipe()
        with patch.object(
            PIPE_MODULE,
            "post_json",
            new=AsyncMock(return_value={"answer": "insufficient", "citations": [], "uncertainty": {"level": "unsupported"}}),
        ) as post:
            output = await plugin.pipe(
                {"folder_id": "body-folder", "messages": [{"role": "user", "content": "question"}]},
                {"id": "shell-user-beta"},
            )
        self.assertIn("insufficient", output)
        self.assertEqual(post.await_args.args[3]["collection_ids"], ["body-folder"])

    async def test_pipe_rejects_missing_identity_invalid_response_and_scope(self):
        plugin = self.make_pipe()
        with self.assertRaisesRegex(PIPE_MODULE.GlueError, "identity"):
            await plugin.pipe({"messages": [{"role": "user", "content": "question"}]}, {})
        with self.assertRaisesRegex(PIPE_MODULE.GlueError, "non-empty text"):
            await plugin.pipe(
                {"messages": [{"role": "user", "content": "question"}]},
                {"id": "shell-user-beta"},
                {"folder_id": " folder-beta "},
            )
        with patch.object(PIPE_MODULE, "post_json", new=AsyncMock(return_value={"citations": []})):
            with self.assertRaisesRegex(PIPE_MODULE.GlueError, "malformed"):
                await plugin.pipe(
                    {"messages": [{"role": "user", "content": "question"}]},
                    {"id": "shell-user-beta"},
                )

    async def test_pipe_rejects_non_loopback_http_and_masks_gateway_failure(self):
        plugin = self.make_pipe()
        plugin.valves.GATEWAY_URL = "http://gateway.example"
        with self.assertRaisesRegex(PIPE_MODULE.GatewayError, "HTTPS"):
            await plugin.pipe(
                {"messages": [{"role": "user", "content": "question"}]},
                {"id": "shell-user-beta"},
            )

        plugin.valves.GATEWAY_URL = "http://127.0.0.1:8080"
        failure = PIPE_MODULE.GatewayError("gateway request failed")
        with patch.object(PIPE_MODULE, "post_json", new=AsyncMock(side_effect=failure)):
            with self.assertRaises(PIPE_MODULE.GatewayError) as raised:
                await plugin.pipe(
                    {"messages": [{"role": "user", "content": "question"}]},
                    {"id": "shell-user-beta"},
                )
        self.assertNotIn("fixture-token", str(raised.exception))

    async def test_modules_do_not_log_or_embed_fixture_token_in_output(self):
        plugin = self.make_pipe()
        with patch.object(PIPE_MODULE, "post_json", new=AsyncMock(return_value={
            "answer": "safe answer",
            "citations": [],
            "uncertainty": {"level": "unsupported"},
        })):
            output = await plugin.pipe(
                {"messages": [{"role": "user", "content": "question"}]},
                {"id": "shell-user-beta"},
            )
        self.assertNotIn("fixture-token", output)
        self.assertNotIn(json.dumps(plugin.valves.__dict__), output)


if __name__ == "__main__":
    unittest.main()
