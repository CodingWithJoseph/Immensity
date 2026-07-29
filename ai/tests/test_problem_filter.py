from problemfinder.pipeline.filter import ProblemFilterRunner, run_worker


def _result(verdict, **fields):
    return {
        "result": verdict,
        "flagged": False,
        "error_state": None,
        **fields,
    }


def _factory(results):
    pending = iter(results)

    class FakeCall:
        def __init__(self, result):
            self.result = result

        def run(self, title, body):
            return self.result

    def create(*_args, **_kwargs):
        return FakeCall(next(pending))

    return create


def test_non_problem_never_reaches_software_call():
    runner = ProblemFilterRunner(
        None,
        filter_call_factory=_factory([_result("no"), _result("yes")]),
    )
    result = runner.run("Idea", "Wouldn't it be cool?")
    assert result["decision"] == "reject"
    assert result["rejection_reason"] == "not_a_real_problem"
    assert result["raw_result"]["software"] is None


def test_filter_rejects_nonsoftware_problem():
    runner = ProblemFilterRunner(
        None,
        filter_call_factory=_factory(
            [
                _result("yes"),
                _result("no"),
            ]
        ),
    )
    result = runner.run("Slow work", "We copy data by hand.")
    assert result["decision"] == "reject"
    assert result["rejection_reason"] == "not_software_addressable"


def test_filter_passes_real_software_problem():
    runner = ProblemFilterRunner(
        None,
        filter_call_factory=_factory(
            [
                _result("yes"),
                _result("yes"),
            ]
        ),
    )
    assert runner.run("Manual invoices", "We copy every field.")["decision"] == "pass"


def test_worker_limit_leaves_unprocessed_rows_pending_for_the_next_run():
    class Repository:
        def __init__(self):
            self.pending = [
                {"job_id": index, "raw_post_id": index, "title": "Problem", "body": "Details"}
                for index in range(3)
            ]
            self.completed = []

        def claim(self, size):
            claimed = self.pending[:size]
            self.pending = self.pending[size:]
            return claimed

        def persist_result(self, job, _result):
            self.completed.append(job["job_id"])

        def persist_failure(self, *_args, **_kwargs):
            raise AssertionError("the contract fixture should not fail")

    class PassingRunner:
        @staticmethod
        def run(_title, _body):
            return {"decision": "pass", "rejection_reason": None}

    repository = Repository()
    result = run_worker(
        repository,
        limit=1,
        batch_size=1,
        max_minutes=1,
        dry_run=False,
        model_loader=lambda _name: object(),
        model_unloader=lambda _model: None,
        runner_factory=lambda _model: PassingRunner(),
    )

    assert result["processed"] == 1
    assert repository.completed == [0]
    assert [row["job_id"] for row in repository.pending] == [1, 2]
