import asyncio
import importlib.util
import pathlib
import unittest
from unittest.mock import AsyncMock, patch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "openwebui" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


FILTER = load_module("openwebui_filter", "filter.py")
PIPE = load_module("openwebui_pipe", "pipe.py")


class OpenWebUiGlueContractTests(unittest.IsolatedAsyncioTestCase):
    def valves(self, cls, **values):
        instance = cls.Valves()
        for key, value in values.items():
            setattr(instance, key, value)
        return instance

    async def test_filter_forwards_folder_as_collection_and_injects_bounded_untrusted_evidence(self):
        filter_instance = FILTER.Filter()
        filter_instance.valves = self.valves(
            FILTER.Filter,
            GATEWAY_URL="http://127.0.0.1:8080",
            GATEWAY_TOKEN="token",
            RETRIEVAL_LIMIT=6,
        )
        response = {"matches": [{"source_label": "invoice.txt", "text": "amount due"}]}
        with patch.object(FILTER, "post_json", new=AsyncMock(return_value=response)) as post:
            body = {
                "folder_id": "folder-7",
                "messages": [{"role": "user", "content": "what is due?"}],
            }
            result = await filter_instance.inlet(body, {"id": "shell-7"})

        post.assert_awaited_once_with(
            "http://127.0.0.1:8080/v1/retrieval/query",
            "token",
            "shell-7",
            {"query": "what is due?", "collection_ids": ["folder-7"], "limit": 6},
            15.0,
        )
        self.assertIs(result, body)
        self.assertEqual(result["messages"][0]["role"], "system")
        self.assertIn("untrusted document evidence", result["messages"][0]["content"])
        self.assertIn("amount due", result["messages"][0]["content"])

    async def test_filter_bounds_injected_matches_and_text(self):
        filter_instance = FILTER.Filter()
        response = {"matches": [{"source_label": str(index), "text": "x" * 5001} for index in range(7)]}
        with patch.object(FILTER, "post_json", new=AsyncMock(return_value=response)):
            result = await filter_instance.inlet(
                {"folder_id": "folder-7", "messages": [{"role": "user", "content": "q"}]},
                None,
            )

        content = result["messages"][0]["content"]
        self.assertIn('"index":6', content)
        self.assertNotIn('"index":7', content)
        self.assertNotIn("x" * 4001, content)

    async def test_filter_without_folder_is_a_noop(self):
        filter_instance = FILTER.Filter()
        with patch.object(FILTER, "post_json", new=AsyncMock()) as post:
            body = {"messages": [{"role": "user", "content": "hello"}]}
            result = await filter_instance.inlet(body, {"id": "shell-7"})

        self.assertIs(result, body)
        post.assert_not_awaited()

    async def test_filter_fails_closed_when_scoped_retrieval_fails(self):
        filter_instance = FILTER.Filter()
        failure = FILTER.GatewayError("gateway request failed")
        with patch.object(FILTER, "post_json", new=AsyncMock(side_effect=failure)):
            with self.assertRaises(FILTER.GatewayError):
                await filter_instance.inlet(
                    {"folder_id": "folder-7", "messages": [{"role": "user", "content": "q"}]},
                    {"id": "shell-7"},
                )

    async def test_pipe_exposes_research_and_calls_answers_with_scope(self):
        pipe = PIPE.Pipe()
        pipe.valves = self.valves(
            PIPE.Pipe,
            GATEWAY_URL="http://127.0.0.1:8080",
            GATEWAY_TOKEN="token",
            EMBEDDING_MODEL_ID="embed-1",
        )
        response = {
            "answer": "The amount is due [1].",
            "citations": [{"citation": {"label": "invoice.txt", "ref": "[doc:x#seg0]"}}],
            "uncertainty": {"level": "low"},
        }
        with patch.object(PIPE, "post_json", new=AsyncMock(return_value=response)) as post:
            result = await pipe.pipe(
                {
                    "folder_id": "folder-7",
                    "messages": [{"role": "user", "content": "what is due?"}],
                },
                {"id": "shell-7"},
            )

        self.assertEqual(pipe.pipes(), [{"id": "research", "name": "Research"}])
        post.assert_awaited_once_with(
            "http://127.0.0.1:8080/v1/answers",
            "token",
            "shell-7",
            {
                "question": "what is due?",
                "collection_ids": ["folder-7"],
                "embedding_model_id": "embed-1",
            },
            15.0,
        )
        self.assertIn("The amount is due [1].", result)
        self.assertIn("invoice.txt", result)
        self.assertIn("low", result)

    async def test_pipe_without_folder_omits_collection_scope(self):
        pipe = PIPE.Pipe()
        with patch.object(
            PIPE,
            "post_json",
            new=AsyncMock(return_value={"answer": "insufficient", "citations": [], "uncertainty": {"level": "unsupported"}}),
        ) as post:
            result = await pipe.pipe({"messages": [{"role": "user", "content": "q"}]}, None)

        self.assertIn("insufficient", result)
        payload = post.await_args.args[3]
        self.assertNotIn("collection_ids", payload)
        self.assertNotIn("owner_id", payload)

    async def test_pipe_rejects_missing_question_and_malformed_response(self):
        pipe = PIPE.Pipe()
        with self.assertRaises(PIPE.GlueError):
            await pipe.pipe({"messages": []}, None)
        with patch.object(PIPE, "post_json", new=AsyncMock(return_value={"citations": []})):
            with self.assertRaises(PIPE.GlueError):
                await pipe.pipe({"messages": [{"role": "user", "content": "q"}]}, None)


if __name__ == "__main__":
    unittest.main()
