"""Budget-gate tests for ``delegate_task``.

Verifies the hard cap short-circuit we added to ``gemini_cli.delegate_task``:
when a project has exceeded its ``spendLimitUsd``, bnmkl;lkjnb


async def test_delegate_task_blocks_when_budget_exceeded(
    active_project, monkeypatch, write_ledger, make_cost_entry
):
    # Cap at $1 but rack up $5 of cumulative cost across one session.
    projects_module.update_project(active_project.id, spend_limit_usd=1.0)
    write_ledger("s-old", [make_cost_entry(turnId="t1", costUsd=5.0, totalTokens=100)])

    monkeypatch.setattr(gemini_cli.asyncio, "create_subprocess_exec", _boom_exec)

    result = await gemini_cli.delegate_task("please help")

    assert result["budgetBlocked"] is True
    assert result["skills_used"] == []
    assert result["tools_used"] == {}
    assert "spend limit" in result["result"].lower()
    assert result["totalUsd"] == 5.0
    assert result["limitUsd"] == 1.0


async def test_delegate_task_allowed_when_under_limit(
    active_project, monkeypatch, write_ledger, make_cost_entry
):
    """A project cap that isn't reached yet must let delegation proceed.

    We assert by letting the (mocked) subprocess actually be invoked and
    checking it returns the canned stream.
    """
    projects_module.update_project(active_project.id, spend_limit_usd=10.0)
    write_ledger("s-old", [make_cost_entry(turnId="t1", costUsd=1.0, totalTokens=100)])

    called = {"count": 0}

    class _FakeProc:
        returncode = 0

        async def communicate(self):
            called["count"] += 1
            return b"", b""

    async def fake_exec(*args, **kwargs):
        return _FakeProc()

    monkeypatch.setattr(gemini_cli.asyncio, "create_subprocess_exec", fake_exec)

    result = await gemini_cli.delegate_task("go")

    assert called["count"] == 1
    assert "budgetBlocked" not in result


async def test_delegate_task_no_gate_when_limit_unset(
    active_project, monkeypatch, write_ledger, make_cost_entry
):
    """With ``spendLimitUsd=None`` (unlimited) the gate must be a no-op even
    when spend is already enormous -- preserving backwards compatibility
    with projects created before this feature."""
    write_ledger(
        "s-old", [make_cost_entry(turnId="t1", costUsd=999.0, totalTokens=100)]
    )

    class _FakeProc:
        returncode = 0

        async def communicate(self):
            return b"", b""

    async def fake_exec(*args, **kwargs):
        return _FakeProc()

    monkeypatch.setattr(gemini_cli.asyncio, "create_subprocess_exec", fake_exec)

    result = await gemini_cli.delegate_task("go")
    assert "budgetBlocked" not in result
