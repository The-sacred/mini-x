import { resolveMediaUrl } from "./api";
import { formatCount, formatRelativeTime, getInitials, getTimelineScore } from "./utils";

export function EmptyState({ body, title }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function MetricCard({ detail, label, value }) {
  return (
    <article className="panel metric-card">
      <p className="eyebrow">{label}</p>
      <h2>{value}</h2>
      <p>{detail}</p>
    </article>
  );
}

export function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Avatar({ preview = "", size = "medium", user }) {
  const image = preview || resolveMediaUrl(user?.profile_picture);
  const label = user?.username || "Campus user";
  const initials = getInitials(user?.username || "UN");

  return image ? (
    <div className={`avatar avatar-${size}`}>
      <img alt={label} src={image} />
    </div>
  ) : (
    <div className={`avatar avatar-${size} avatar-fallback`}>
      <span>{initials}</span>
    </div>
  );
}

export function LogoMark({ compact = false }) {
  return (
    <div className={`logo-mark ${compact ? "compact" : ""}`}>
      <svg fill="none" viewBox="0 0 64 64">
        <circle cx="32" cy="32" fill="url(#brand-gradient)" r="32" />
        <path d="M18 24 32 18l14 6-14 6-14-6Z" fill="white" fillOpacity="0.95" />
        <path d="M22 30v10l10 5 10-5V30" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <defs>
          <linearGradient id="brand-gradient" x1="12" x2="56" y1="10" y2="56">
            <stop stopColor="#1D4ED8" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function IconBase({ children }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export function HomeIcon() {
  return (
    <IconBase>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function CompassIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m10 14 2-7 2 7-4-2Z" fill="currentColor" />
    </IconBase>
  );
}

export function SparkIcon() {
  return (
    <IconBase>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ProfileIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function SearchIcon() {
  return (
    <IconBase>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16.2 16.2 3.3 3.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ImageIcon() {
  return (
    <IconBase>
      <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="5" />
      <path d="m6.5 15 3.2-3.2 2.7 2.6 3.6-4 2.5 2.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="9" cy="9" fill="currentColor" r="1.1" />
    </IconBase>
  );
}

export function HeartIcon() {
  return (
    <IconBase>
      <path
        d="M12 20s-6.7-4.4-8.4-8.1C2.2 9.1 3.6 6 7 6c2 0 3.3 1.1 4 2 .7-.9 2-2 4-2 3.4 0 4.8 3.1 3.4 5.9C18.7 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

export function CommentIcon() {
  return (
    <IconBase>
      <path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function TrendIcon() {
  return (
    <IconBase>
      <path d="M5 15 10 10l3 3 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M14 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ComposerCard({
  composerImagePreview,
  composerText,
  isBusy,
  onComposerImageChange,
  onComposerSubmit,
  onComposerTextChange,
  onRemoveComposerImage,
  user,
}) {
  return (
    <section className="panel composer-card">
      <div className="composer-top">
        <Avatar user={user} size="large" />
        <form className="composer-form" onSubmit={onComposerSubmit}>
          <textarea
            maxLength="600"
            placeholder="What's happening around campus?"
            rows="3"
            value={composerText}
            onChange={(event) => onComposerTextChange(event.target.value)}
          />

          {composerImagePreview && (
            <div className="media-preview">
              <img alt="Selected post" src={composerImagePreview} />
              <button onClick={onRemoveComposerImage} type="button">
                Remove
              </button>
            </div>
          )}

          <div className="composer-actions">
            <label className="icon-button ghost">
              <ImageIcon />
              <span>Add image</span>
              <input accept="image/*" onChange={onComposerImageChange} type="file" />
            </label>

            <button className="primary-button" disabled={isBusy} type="submit">
              {isBusy ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function PostCard({
  busy,
  comments,
  commentDraft,
  isCommentsOpen,
  onCommentDraftChange,
  onCommentSubmit,
  onLikeToggle,
  onReplyDraftChange,
  onReplySubmit,
  onReplyToggle,
  onToggleComments,
  post,
  replyDrafts,
  replyingTo,
}) {
  return (
    <article className="panel post-card">
      <div className="post-head">
        <Avatar user={post.author} />
        <div className="post-meta">
          <strong>@{post.author.username}</strong>
          <span>{formatRelativeTime(post.created_at)}</span>
        </div>
      </div>

      <p className="post-body">{post.content}</p>

      {post.image && (
        <div className="post-media">
          <img alt="Attached to post" src={resolveMediaUrl(post.image)} />
        </div>
      )}

      <div className="post-actions">
        <button className="action-button" onClick={onToggleComments} type="button">
          <CommentIcon />
          <span>{formatCount(post.comments_count || 0)}</span>
        </button>
        <button className={`action-button ${post.is_liked ? "active" : ""}`} onClick={onLikeToggle} type="button">
          <HeartIcon />
          <span>{busy.likeId === post.id ? "..." : formatCount(post.likes_count || 0)}</span>
        </button>
        <span className="engagement-pill">{formatCount(getTimelineScore(post))} engagement</span>
      </div>

      {isCommentsOpen && (
        <div className="comment-panel">
          <form
            className="comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCommentSubmit();
            }}
          >
            <input
              placeholder="Join the conversation"
              type="text"
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
            />
            <button className="pill-button" disabled={busy.commentKey === `comment-${post.id}`} type="submit">
              {busy.commentKey === `comment-${post.id}` ? "Sending..." : "Comment"}
            </button>
          </form>

          <div className="comment-thread">
            {comments.length ? (
              comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  busy={busy}
                  comment={comment}
                  onReplyDraftChange={onReplyDraftChange}
                  onReplySubmit={onReplySubmit}
                  onReplyToggle={onReplyToggle}
                  replyDraft={replyDrafts[comment.id] || ""}
                  replying={Boolean(replyingTo[comment.id])}
                />
              ))
            ) : (
              <p className="empty-inline">No comments yet. Start the thread.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function CommentThread({ busy, comment, onReplyDraftChange, onReplySubmit, onReplyToggle, replyDraft, replying }) {
  return (
    <article className="comment-card">
      <div className="comment-head">
        <Avatar user={comment.author} />
        <div>
          <strong>@{comment.author.username}</strong>
          <span>{formatRelativeTime(comment.created_at)}</span>
        </div>
      </div>

      <p>{comment.content}</p>

      <div className="comment-tools">
        <button className="text-button" onClick={() => onReplyToggle(comment.id)} type="button">
          {replying ? "Hide reply" : "Reply"}
        </button>
        <span>{comment.replies_count || 0} replies</span>
      </div>

      {replying && (
        <form
          className="comment-form nested"
          onSubmit={(event) => {
            event.preventDefault();
            onReplySubmit(comment.id);
          }}
        >
          <input
            placeholder={`Reply to @${comment.author.username}`}
            type="text"
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(comment.id, event.target.value)}
          />
          <button className="pill-button" disabled={busy.commentKey === `reply-${comment.id}`} type="submit">
            {busy.commentKey === `reply-${comment.id}` ? "Sending..." : "Reply"}
          </button>
        </form>
      )}

      {comment.replies?.length > 0 && (
        <div className="reply-list">
          {comment.replies.map((reply) => (
            <article className="reply-card" key={reply.id}>
              <div className="comment-head">
                <Avatar user={reply.author} size="small" />
                <div>
                  <strong>@{reply.author.username}</strong>
                  <span>{formatRelativeTime(reply.created_at)}</span>
                </div>
              </div>
              <p>{reply.content}</p>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
