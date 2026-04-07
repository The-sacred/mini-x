export const SESSION_KEY = "uninet-session";
export const DEFAULT_AUTH_FORM = { email: "", username: "", password: "" };
export const CAMPUS_NOTES = [
  "Fresh timelines built for class updates, club drops, lab wins, and event buzz.",
  "Trending on Campus now updates from real backend activity, not placeholder data.",
  "Use explore to find classmates, follow communities, and jump into discussions fast.",
];

export function formatRelativeTime(value) {
  if (!value) {
    return "Now";
  }

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  return rtf.format(diffDays, "day");
}

export function formatCount(value) {
  if (value < 1000) {
    return String(value);
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .toLowerCase();
}

export function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getTimelineScore(post) {
  return (post.likes_count || 0) + (post.comments_count || 0) * 2;
}

export function replacePostInList(list, freshPost) {
  return list.map((post) => {
    if (post.id === freshPost.id) {
      return freshPost;
    }

    if (!post.replies?.length) {
      return post;
    }

    return {
      ...post,
      replies: replacePostInList(post.replies, freshPost),
    };
  });
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}
