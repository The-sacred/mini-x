import re
from collections import defaultdict

from django.utils import timezone

HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z][\w-]{1,49})")
TITLE_PHRASE_RE = re.compile(r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z']{3,}")
STOPWORDS = {
    "about",
    "after",
    "again",
    "against",
    "being",
    "campus",
    "could",
    "every",
    "first",
    "from",
    "have",
    "just",
    "library",
    "maybe",
    "more",
    "really",
    "should",
    "student",
    "study",
    "their",
    "there",
    "these",
    "thing",
    "this",
    "today",
    "uninet",
    "university",
    "which",
    "while",
    "with",
    "would",
}


def _clean_preview(content: str) -> str:
    return " ".join(content.split())


def extract_topics(content: str):
    topics = []
    seen = set()
    preview = _clean_preview(content)

    for tag in HASHTAG_RE.findall(content):
        normalized = f"#{tag.lower()}"
        label = f"#{tag}"
        if normalized not in seen:
            topics.append((normalized, label))
            seen.add(normalized)

    text_without_tags = HASHTAG_RE.sub("", preview)
    for phrase in TITLE_PHRASE_RE.findall(text_without_tags):
        normalized = phrase.lower()
        if normalized not in seen:
            topics.append((normalized, phrase))
            seen.add(normalized)

    if topics:
        return topics

    for word in WORD_RE.findall(text_without_tags):
        normalized = word.lower()
        if normalized in STOPWORDS:
            continue
        topics.append((normalized, word.title()))
        break

    return topics


def build_trending_topics(posts, limit=6):
    trend_map = defaultdict(
        lambda: {
            "name": "",
            "posts_count": 0,
            "engagement_score": 0,
            "latest_activity": None,
            "headline": "",
        }
    )

    for post in posts:
        topics = extract_topics(post.content)
        if not topics:
            continue

        engagement_score = (
            post.likes.count()
            + post.comments.filter(is_deleted=False).count() * 2
            + post.replies.filter(is_deleted=False).count() * 2
        )
        post_preview = _clean_preview(post.content)[:140]

        for normalized, label in topics:
            item = trend_map[normalized]
            item["name"] = item["name"] or label
            item["posts_count"] += 1
            item["engagement_score"] += max(engagement_score, 1)
            item["headline"] = item["headline"] or post_preview
            if item["latest_activity"] is None or post.created_at > item["latest_activity"]:
                item["latest_activity"] = post.created_at

    ranked_topics = sorted(
        trend_map.values(),
        key=lambda item: (
            item["posts_count"],
            item["engagement_score"],
            item["latest_activity"] or timezone.now(),
        ),
        reverse=True,
    )

    topics = []
    for item in ranked_topics[:limit]:
        topics.append(
            {
                "name": item["name"],
                "posts_count": item["posts_count"],
                "engagement_score": item["engagement_score"],
                "headline": item["headline"],
            }
        )

    return {
        "generated_at": timezone.now(),
        "topics": topics,
    }
