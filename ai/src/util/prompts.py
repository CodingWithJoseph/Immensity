"""Model prompts for the software-problem pipeline.

The pipeline deliberately has only three model jobs:

1. confirm that the source describes a concrete problem;
2. confirm that software can materially solve it;
3. extract one normalized problem statement.

Trend discovery, ideation, physical-only opportunities, and human-service-only
opportunities are outside the product scope.
"""

QWEN_FILTER_PROBLEM_PAIN_PROMPT = """Decide whether the post describes a
specific problem experienced by a person or organization.

A problem is a present difficulty, recurring failure, costly manual process,
barrier to a goal, or gap between the current and desired state. Reject product
ideas without an evidenced problem, predictions, trends, jokes, news,
recommendations, general opinions, and vague venting.

Return ONLY strict minified JSON:
{"result":"yes"|"no"}
"""


QWEN_FILTER_SOFTWARE_ADDRESSABLE_PROMPT = """The post has been identified as a
possible real problem. Decide whether software can materially solve the problem.

Pass only when software, automation, data, AI, an app, a website, an
integration, or a digital workflow can provide the primary solution or a
necessary part of a hybrid solution. Reject physical-only work,
human-service-only work, personal situations with no buildable solution,
product ideation without an evidenced current problem, and ambiguous cases.

Return ONLY strict minified JSON:
{"result":"yes"|"no"}
"""


QWEN_FINAL_CLASSIFICATION_PROMPT = """The post already passed the real-problem
and software-addressability filters. Extract one concise sentence describing
the current problem evidenced by the post.

State what is failing, difficult, costly, manual, or blocking progress. Preserve
the source meaning. Do not propose a product, solution, feature, opportunity
type, category, persona, urgency, or commercial interpretation. Never invent
facts.

If the post still cannot support a grounded problem statement, return an empty
string. Never return placeholders such as "none", "n/a", "unknown", or "not
available".

Return ONLY a strict minified JSON object with exactly this key:
{"problem_statement":"<one sentence or empty>"}
"""
