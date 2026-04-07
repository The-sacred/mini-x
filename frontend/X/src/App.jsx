import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from "react";
import { NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";

import { apiRequest, getCollection, getErrorMessage } from "./api";
import {
  Avatar,
  CompassIcon,
  ComposerCard,
  EmptyState,
  HomeIcon,
  LogoMark,
  MetricCard,
  PostCard,
  ProfileIcon,
  SearchIcon,
  SparkIcon,
  StatPill,
  TrendIcon,
} from "./components";
import {
  CAMPUS_NOTES,
  DEFAULT_AUTH_FORM,
  SESSION_KEY,
  formatCount,
  getGreeting,
  getTimelineScore,
  replacePostInList,
} from "./utils";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: HomeIcon, path: "/" },
  { id: "explore", label: "Explore", icon: CompassIcon, path: "/explore" },
  { id: "pulse", label: "Campus Pulse", icon: SparkIcon, path: "/pulse" },
  { id: "profile", label: "Profile", icon: ProfileIcon, path: "/profile" },
];

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(loadStoredSession);
  const sessionRef = useRef(session);
  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [feedTab, setFeedTab] = useState("for-you");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  const [profile, setProfile] = useState(session?.user ?? null);
  const [profileDraft, setProfileDraft] = useState({ bio: session?.user?.bio || "" });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const [allPosts, setAllPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [profilePosts, setProfilePosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [people, setPeople] = useState([]);

  const [composerText, setComposerText] = useState("");
  const [composerImageFile, setComposerImageFile] = useState(null);
  const [composerImagePreview, setComposerImagePreview] = useState("");

  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentPanels, setCommentPanels] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState({});

  const [busy, setBusy] = useState({
    auth: false,
    dashboard: false,
    compose: false,
    profile: false,
    likeId: null,
    followId: null,
    commentKey: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    sessionRef.current = session;
    saveStoredSession(session);
  }, [session]);

  useEffect(() => {
    if (!statusMessage && !errorMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatusMessage("");
      setErrorMessage("");
    }, 4800);

    return () => window.clearTimeout(timer);
  }, [statusMessage, errorMessage]);

  useEffect(() => {
    return () => {
      if (composerImagePreview) {
        URL.revokeObjectURL(composerImagePreview);
      }

      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [composerImagePreview, profileImagePreview]);

  async function requestWithAuth(path, options = {}) {
    const currentSession = sessionRef.current;
    if (!currentSession?.access) {
      return { ok: false, status: 401, data: { error: "You need to sign in again." } };
    }

    let response = await apiRequest(path, { ...options, token: currentSession.access });
    if (response.status !== 401 || !currentSession.refresh) {
      return response;
    }

    const refreshResponse = await apiRequest("/token/refresh/", {
      method: "POST",
      body: { refresh: currentSession.refresh },
    });

    if (!refreshResponse.ok || !refreshResponse.data?.access) {
      handleLogout("Your session expired. Sign in again.");
      return refreshResponse;
    }

    const nextSession = { ...currentSession, access: refreshResponse.data.access };
    sessionRef.current = nextSession;
    setSession(nextSession);
    return apiRequest(path, { ...options, token: nextSession.access });
  }

  function handleLogout(message = "") {
    setSession(null);
    setProfile(null);
    setAllPosts([]);
    setFollowingPosts([]);
    setProfilePosts([]);
    setTrending([]);
    setPeople([]);
    setCommentsByPost({});
    setCommentPanels({});
    setCommentDrafts({});
    setReplyDrafts({});
    setReplyingTo({});
    setComposerText("");
    setComposerImageFile(null);
    setComposerImagePreview("");
    setProfileImageFile(null);
    setProfileImagePreview("");
    setFeedTab("for-you");
    setSearchValue("");
    if (message) {
      setStatusMessage(message);
    }
  }

  function patchCurrentUser(nextUser) {
    setProfile(nextUser);
    setProfileDraft({ bio: nextUser?.bio || "" });
    setSession((current) => (current ? { ...current, user: nextUser } : current));
  }

  function updatePostEverywhere(freshPost) {
    setAllPosts((current) => replacePostInList(current, freshPost));
    setFollowingPosts((current) => replacePostInList(current, freshPost));
    setProfilePosts((current) => replacePostInList(current, freshPost));
  }

  function updatePersonEverywhere(userId, updater) {
    setPeople((current) => current.map((person) => (person.id === userId ? updater(person) : person)));
  }

  function updateOwnFollowingCount(delta) {
    setProfile((current) =>
      current
        ? {
            ...current,
            following_count: Math.max((current.following_count || 0) + delta, 0),
          }
        : current,
    );

    setSession((current) =>
      current
        ? {
            ...current,
            user: {
              ...current.user,
              following_count: Math.max((current.user.following_count || 0) + delta, 0),
            },
          }
        : current,
    );
  }

  function navigateTo(path, options = {}) {
    startTransition(() => {
      navigate(path, options);
    });
  }

  async function loadComments(postId) {
    const response = await requestWithAuth(`/posts/${postId}/comments/`);
    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Unable to load the discussion."));
      return;
    }

    setCommentsByPost((current) => ({
      ...current,
      [postId]: getCollection(response.data),
    }));
  }

  async function refreshPost(postId) {
    const response = await requestWithAuth(`/posts/${postId}/`);
    if (!response.ok) {
      return;
    }

    updatePostEverywhere(response.data);
  }

  const loadDashboard = useEffectEvent(async () => {
    setBusy((current) => ({ ...current, dashboard: true }));
    setErrorMessage("");

    const currentUserId = sessionRef.current?.user?.id;
    const [profileResponse, allPostsResponse, followingResponse, profilePostsResponse, trendingResponse, peopleResponse] =
      await Promise.all([
        requestWithAuth("/profile/"),
        requestWithAuth("/posts/"),
        requestWithAuth("/feed/"),
        requestWithAuth(currentUserId ? `/posts/?author=${currentUserId}` : "/posts/"),
        requestWithAuth("/trending/"),
        requestWithAuth("/users/?exclude_self=true"),
      ]);

    if (!profileResponse.ok) {
      setBusy((current) => ({ ...current, dashboard: false }));
      setErrorMessage(getErrorMessage(profileResponse.data, "We could not load your campus profile."));
      return;
    }

    patchCurrentUser(profileResponse.data);
    setAllPosts(getCollection(allPostsResponse.data));
    setFollowingPosts(getCollection(followingResponse.data));
    setProfilePosts(getCollection(profilePostsResponse.data));
    setTrending(trendingResponse.data?.topics || []);
    setPeople(getCollection(peopleResponse.data));

    if (!allPostsResponse.ok || !followingResponse.ok || !trendingResponse.ok || !peopleResponse.ok) {
      setErrorMessage("Some campus panels are still catching up, but your core feed is ready.");
    }

    setBusy((current) => ({ ...current, dashboard: false }));
  });

  useEffect(() => {
    if (!session?.access) {
      return;
    }

    loadDashboard();
  }, [session?.access]);

  useEffect(() => {
    if (session?.access || location.pathname === "/auth") {
      return;
    }

    navigate("/auth", {
      replace: true,
      state: { from: location.pathname },
    });
  }, [location.pathname, navigate, session?.access]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setBusy((current) => ({ ...current, auth: true }));
    setErrorMessage("");

    const endpoint = authMode === "signin" ? "/login/" : "/register/";
    const payload =
      authMode === "signin"
        ? {
            email: authForm.email.trim() || undefined,
            username: authForm.username.trim() || undefined,
            password: authForm.password,
          }
        : {
            email: authForm.email.trim(),
            username: authForm.username.trim(),
            password: authForm.password,
          };

    const response = await apiRequest(endpoint, {
      method: "POST",
      body: payload,
    });

    setBusy((current) => ({ ...current, auth: false }));

    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Unable to start your uniNet session."));
      return;
    }

    setSession({
      access: response.data.access,
      refresh: response.data.refresh,
      user: response.data.user,
    });
    setAuthForm(DEFAULT_AUTH_FORM);
    setStatusMessage(authMode === "signin" ? "Welcome back to campus." : "Your uniNet account is ready.");
    navigateTo(typeof location.state?.from === "string" ? location.state.from : "/", { replace: true });
  }

  function handleComposerImageChange(event) {
    const file = event.target.files?.[0] || null;
    if (composerImagePreview) {
      URL.revokeObjectURL(composerImagePreview);
    }

    setComposerImageFile(file);
    setComposerImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function handleProfileImageChange(event) {
    const file = event.target.files?.[0] || null;
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImageFile(file);
    setProfileImagePreview(file ? URL.createObjectURL(file) : "");
  }

  async function handleComposerSubmit(event) {
    event.preventDefault();
    if (!composerText.trim()) {
      setErrorMessage("Share a campus update before posting.");
      return;
    }

    setBusy((current) => ({ ...current, compose: true }));
    const formData = new FormData();
    formData.append("content", composerText.trim());
    if (composerImageFile) {
      formData.append("image", composerImageFile);
    }

    const response = await requestWithAuth("/posts/", {
      method: "POST",
      body: formData,
    });

    setBusy((current) => ({ ...current, compose: false }));

    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Your update could not be posted."));
      return;
    }

    setComposerText("");
    setComposerImageFile(null);
    if (composerImagePreview) {
      URL.revokeObjectURL(composerImagePreview);
      setComposerImagePreview("");
    }

    setAllPosts((current) => [response.data, ...current]);
    setFollowingPosts((current) => [response.data, ...current]);
    setProfilePosts((current) => [response.data, ...current]);
    patchCurrentUser({
      ...profile,
      posts_count: (profile?.posts_count || 0) + 1,
    });
    setStatusMessage("Your update is live.");

    const trendingResponse = await requestWithAuth("/trending/");
    if (trendingResponse.ok) {
      setTrending(trendingResponse.data?.topics || []);
    }
  }

  async function handleLikeToggle(post) {
    const endpoint = post.is_liked ? `/posts/${post.id}/unlike/` : `/posts/${post.id}/like/`;
    setBusy((current) => ({ ...current, likeId: post.id }));

    const optimisticPost = {
      ...post,
      is_liked: !post.is_liked,
      likes_count: Math.max((post.likes_count || 0) + (post.is_liked ? -1 : 1), 0),
    };

    updatePostEverywhere(optimisticPost);

    const response = await requestWithAuth(endpoint, { method: "POST" });
    setBusy((current) => ({ ...current, likeId: null }));

    if (!response.ok) {
      updatePostEverywhere(post);
      setErrorMessage(getErrorMessage(response.data, "Could not update that reaction."));
    }
  }

  async function handleFollowToggle(user) {
    setBusy((current) => ({ ...current, followId: user.id }));
    const endpoint = user.is_following ? `/unfollow/${user.id}/` : `/follow/${user.id}/`;
    const response = await requestWithAuth(endpoint, { method: "POST" });
    setBusy((current) => ({ ...current, followId: null }));

    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Could not update that follow action."));
      return;
    }

    const delta = user.is_following ? -1 : 1;
    updatePersonEverywhere(user.id, (current) => ({
      ...current,
      is_following: !current.is_following,
      followers_count: Math.max((current.followers_count || 0) + delta, 0),
    }));
    updateOwnFollowingCount(delta);
    setStatusMessage(user.is_following ? `You unfollowed @${user.username}.` : `You followed @${user.username}.`);
  }

  async function handleCommentSubmit(postId, parentId = null) {
    const key = parentId ? `reply-${parentId}` : `comment-${postId}`;
    const draft = parentId ? replyDrafts[parentId] : commentDrafts[postId];
    if (!draft?.trim()) {
      setErrorMessage("Add a thought before sending it.");
      return;
    }

    setBusy((current) => ({ ...current, commentKey: key }));
    const response = await requestWithAuth(`/posts/${postId}/comments/create/`, {
      method: "POST",
      body: { content: draft.trim(), parent: parentId || undefined },
    });
    setBusy((current) => ({ ...current, commentKey: "" }));

    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Could not add your reply."));
      return;
    }

    if (parentId) {
      setReplyDrafts((current) => ({ ...current, [parentId]: "" }));
      setReplyingTo((current) => ({ ...current, [parentId]: false }));
    } else {
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    }

    setStatusMessage(parentId ? "Reply posted." : "Discussion updated.");
    await Promise.all([loadComments(postId), refreshPost(postId)]);
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setBusy((current) => ({ ...current, profile: true }));

    const body = profileImageFile ? new FormData() : { bio: profileDraft.bio };
    if (body instanceof FormData) {
      body.append("bio", profileDraft.bio);
      body.append("profile_picture", profileImageFile);
    }

    const response = await requestWithAuth("/profile/", {
      method: "PATCH",
      body,
    });

    setBusy((current) => ({ ...current, profile: false }));

    if (!response.ok) {
      setErrorMessage(getErrorMessage(response.data, "Profile changes could not be saved."));
      return;
    }

    patchCurrentUser(response.data);
    setProfileImageFile(null);
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
      setProfileImagePreview("");
    }
    setStatusMessage("Profile updated.");
  }

  async function toggleComments(postId) {
    const isOpen = commentPanels[postId];
    setCommentPanels((current) => ({ ...current, [postId]: !isOpen }));
    if (!isOpen) {
      await loadComments(postId);
    }
  }

  const timelinePosts = feedTab === "for-you" ? allPosts : followingPosts;
  const cleanSearch = deferredSearch.trim().toLowerCase();
  const filteredUsers = cleanSearch
    ? people.filter((person) => {
        const haystack = `${person.username} ${person.bio || ""} ${person.email || ""}`.toLowerCase();
        return haystack.includes(cleanSearch);
      })
    : people;
  const filteredPosts = cleanSearch
    ? allPosts.filter((post) => {
        const haystack = `${post.content} ${post.author?.username || ""}`.toLowerCase();
        return haystack.includes(cleanSearch);
      })
    : allPosts;
  const spotlightPosts = [...allPosts]
    .sort((left, right) => getTimelineScore(right) - getTimelineScore(left))
    .slice(0, 3);
  const suggestedUsers = people
    .filter((person) => !person.is_following)
    .sort((left, right) => (right.followers_count || 0) - (left.followers_count || 0))
    .slice(0, 4);
  const activeView = NAV_ITEMS.find((item) => item.path === location.pathname)?.id;

  if (!session?.access) {
    return (
      <div className="auth-page">
        <div className="auth-hero">
          <div className="hero-note">Uni-first social, built for campus life.</div>
          <h1>uniNet keeps classes, clubs, and conversations in one polished stream.</h1>
          <p>
            Start a thread after lectures, amplify student events, and follow the people shaping your campus week.
          </p>
          <div className="hero-stack">
            {CAMPUS_NOTES.map((note) => (
              <div className="hero-chip" key={note}>
                <TrendIcon />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card panel">
          <div className="brand-lockup">
            <LogoMark />
            <div>
              <p className="eyebrow">University Social</p>
              <h2>Welcome to uniNet</h2>
              <p className="subtle">Sign in to connect with your campus community.</p>
            </div>
          </div>

          <div className="segmented-control">
            <button
              className={authMode === "signin" ? "active" : ""}
              onClick={() => setAuthMode("signin")}
              type="button"
            >
              Sign In
            </button>
            <button
              className={authMode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                placeholder={authMode === "signin" ? "student@university.edu" : "campus email"}
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              <span>{authMode === "signin" ? "Username (optional if email is used)" : "Username"}</span>
              <input
                autoComplete="username"
                placeholder="@johndoe"
                type="text"
                value={authForm.username}
                onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                placeholder="Enter your password"
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {(statusMessage || errorMessage) && (
              <div className={`status-banner ${errorMessage ? "error" : ""}`}>
                {errorMessage || statusMessage}
              </div>
            )}

            <button className="primary-button auth-submit" disabled={busy.auth} type="submit">
              {busy.auth ? "Loading..." : authMode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!activeView) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="app-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="app-shell">
        <aside className="sidebar panel">
          <div className="sidebar-brand">
            <LogoMark compact />
            <div>
              <p className="eyebrow">University Social</p>
              <h2>uniNet</h2>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                end={item.path === "/"}
                to={item.path}
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-profile">
            <Avatar user={profile} size="large" />
            <div>
              <strong>@{profile?.username}</strong>
              <p>{profile?.email}</p>
            </div>
          </div>

          <button className="secondary-button full-width" onClick={() => handleLogout("Signed out of uniNet.")} type="button">
            Log Out
          </button>
        </aside>

        <main className="content-column">
          <header className="topbar panel">
            <div>
              <p className="eyebrow">Campus Dashboard</p>
              <h1>{getGreeting()}, @{profile?.username}</h1>
            </div>

            <label className="search-box">
              <SearchIcon />
              <input
                placeholder="Search conversations, classmates, and interests"
                type="search"
                value={searchValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchValue(nextValue);
                  if (nextValue.trim() && location.pathname !== "/explore") {
                    navigateTo("/explore");
                  }
                }}
              />
            </label>
          </header>

          {(statusMessage || errorMessage) && (
            <div className={`status-banner page-banner ${errorMessage ? "error" : ""}`}>
              {errorMessage || statusMessage}
            </div>
          )}

          {busy.dashboard ? (
            <section className="panel loading-panel">
              <div className="spinner" />
              <p>Loading your campus spaces...</p>
            </section>
          ) : (
            <>
              {activeView === "home" && (
                <>
                  <section className="panel feed-header">
                    <div>
                      <p className="eyebrow">Feed</p>
                      <h2>Campus feed</h2>
                    </div>
                    <div className="tab-row">
                      <button
                        className={feedTab === "for-you" ? "active" : ""}
                        onClick={() => setFeedTab("for-you")}
                        type="button"
                      >
                        For You
                      </button>
                      <button
                        className={feedTab === "following" ? "active" : ""}
                        onClick={() => setFeedTab("following")}
                        type="button"
                      >
                        Following
                      </button>
                    </div>
                  </section>

                  <ComposerCard
                    composerImagePreview={composerImagePreview}
                    composerText={composerText}
                    isBusy={busy.compose}
                    onComposerImageChange={handleComposerImageChange}
                    onComposerSubmit={handleComposerSubmit}
                    onComposerTextChange={setComposerText}
                    onRemoveComposerImage={() => {
                      if (composerImagePreview) {
                        URL.revokeObjectURL(composerImagePreview);
                      }
                      setComposerImageFile(null);
                      setComposerImagePreview("");
                    }}
                    user={profile}
                  />

                  <section className="post-stack">
                    {timelinePosts.length ? (
                      timelinePosts.map((post) => (
                        <PostCard
                          key={post.id}
                          busy={busy}
                          comments={commentsByPost[post.id] || []}
                          commentDraft={commentDrafts[post.id] || ""}
                          isCommentsOpen={Boolean(commentPanels[post.id])}
                          onCommentDraftChange={(value) =>
                            setCommentDrafts((current) => ({ ...current, [post.id]: value }))
                          }
                          onCommentSubmit={() => handleCommentSubmit(post.id)}
                          onLikeToggle={() => handleLikeToggle(post)}
                          onReplyDraftChange={(commentId, value) =>
                            setReplyDrafts((current) => ({ ...current, [commentId]: value }))
                          }
                          onReplyToggle={(commentId) =>
                            setReplyingTo((current) => ({ ...current, [commentId]: !current[commentId] }))
                          }
                          onReplySubmit={(commentId) => handleCommentSubmit(post.id, commentId)}
                          onToggleComments={() => toggleComments(post.id)}
                          post={post}
                          replyDrafts={replyDrafts}
                          replyingTo={replyingTo}
                        />
                      ))
                    ) : (
                      <EmptyState
                        body="Follow classmates or publish the first update to get the conversation moving."
                        title="Your campus feed is quiet"
                      />
                    )}
                  </section>
                </>
              )}

              {activeView === "explore" && (
                <section className="explore-grid">
                  <div className="panel explore-section">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Discover</p>
                        <h2>People to know</h2>
                      </div>
                      <span className="meta-pill">{filteredUsers.length} matches</span>
                    </div>

                    <div className="user-grid">
                      {filteredUsers.length ? (
                        filteredUsers.map((user) => (
                          <article className="user-card" key={user.id}>
                            <Avatar user={user} size="large" />
                            <div className="user-copy">
                              <h3>@{user.username}</h3>
                              <p>{user.bio || "Building ideas, clubs, and campus momentum."}</p>
                            </div>
                            <div className="stat-line">
                              <span>{formatCount(user.followers_count || 0)} followers</span>
                              <span>{formatCount(user.posts_count || 0)} posts</span>
                            </div>
                            <button
                              className={`pill-button ${user.is_following ? "muted" : ""}`}
                              disabled={busy.followId === user.id}
                              onClick={() => handleFollowToggle(user)}
                              type="button"
                            >
                              {busy.followId === user.id ? "Saving..." : user.is_following ? "Following" : "Follow"}
                            </button>
                          </article>
                        ))
                      ) : (
                        <EmptyState
                          body="Try a club name, class topic, or username to find someone nearby."
                          title="No people matched that search"
                        />
                      )}
                    </div>
                  </div>

                  <div className="panel explore-section">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Conversations</p>
                        <h2>Search the campus timeline</h2>
                      </div>
                      <span className="meta-pill">{filteredPosts.length} posts</span>
                    </div>

                    <div className="post-stack compact">
                      {filteredPosts.length ? (
                        filteredPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            busy={busy}
                            comments={commentsByPost[post.id] || []}
                            commentDraft={commentDrafts[post.id] || ""}
                            isCommentsOpen={Boolean(commentPanels[post.id])}
                            onCommentDraftChange={(value) =>
                              setCommentDrafts((current) => ({ ...current, [post.id]: value }))
                            }
                            onCommentSubmit={() => handleCommentSubmit(post.id)}
                            onLikeToggle={() => handleLikeToggle(post)}
                            onReplyDraftChange={(commentId, value) =>
                              setReplyDrafts((current) => ({ ...current, [commentId]: value }))
                            }
                            onReplyToggle={(commentId) =>
                              setReplyingTo((current) => ({ ...current, [commentId]: !current[commentId] }))
                            }
                            onReplySubmit={(commentId) => handleCommentSubmit(post.id, commentId)}
                            onToggleComments={() => toggleComments(post.id)}
                            post={post}
                            replyDrafts={replyDrafts}
                            replyingTo={replyingTo}
                          />
                        ))
                      ) : (
                        <EmptyState
                          body="Search for class names, hashtags, or campus events to surface more posts."
                          title="No timeline results"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              {activeView === "pulse" && (
                <section className="pulse-layout">
                  <div className="metrics-grid">
                    <MetricCard
                      detail="Fresh stories on the public campus stream."
                      label="Live posts"
                      value={formatCount(allPosts.length)}
                    />
                    <MetricCard
                      detail="People you chose to keep close this week."
                      label="Following feed"
                      value={formatCount(followingPosts.length)}
                    />
                    <MetricCard
                      detail="Signals rising from the backend trend engine."
                      label="Trending topics"
                      value={formatCount(trending.length)}
                    />
                  </div>

                  <div className="panel pulse-callout">
                    <div>
                      <p className="eyebrow">Momentum</p>
                      <h2>{trending[0]?.name || "Campus stories are warming up"}</h2>
                      <p>
                        {trending[0]?.headline ||
                          "Once students post with tags and recognizable topics, uniNet turns them into live campus trends."}
                      </p>
                    </div>
                    <div className="pulse-tags">
                      {trending.slice(0, 5).map((topic) => (
                        <span className="topic-chip" key={topic.name}>
                          {topic.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Spotlight</p>
                        <h2>Top conversations right now</h2>
                      </div>
                    </div>
                    <div className="spotlight-list">
                      {spotlightPosts.length ? (
                        spotlightPosts.map((post) => (
                          <article className="spotlight-card" key={post.id}>
                            <div className="spotlight-top">
                              <Avatar user={post.author} />
                              <div>
                                <strong>@{post.author.username}</strong>
                                <p>{post.content}</p>
                              </div>
                              <span className="score-pill">{formatCount(getTimelineScore(post))} points</span>
                            </div>
                          </article>
                        ))
                      ) : (
                        <EmptyState
                          body="Post a class update or campus event and the pulse view will start filling out."
                          title="No hotspots yet"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              {activeView === "profile" && (
                <section className="profile-layout">
                  <div className="panel profile-card">
                    <div className="profile-head">
                      <Avatar preview={profileImagePreview} size="hero" user={profile} />
                      <div>
                        <p className="eyebrow">Your corner</p>
                        <h2>@{profile?.username}</h2>
                        <p>{profile?.email}</p>
                      </div>
                    </div>

                    <div className="profile-stats">
                      <StatPill label="Posts" value={formatCount(profile?.posts_count || 0)} />
                      <StatPill label="Following" value={formatCount(profile?.following_count || 0)} />
                      <StatPill label="Followers" value={formatCount(profile?.followers_count || 0)} />
                    </div>

                    <form className="profile-form" onSubmit={handleProfileSave}>
                      <label>
                        <span>Bio</span>
                        <textarea
                          rows="4"
                          value={profileDraft.bio}
                          onChange={(event) => setProfileDraft({ bio: event.target.value })}
                        />
                      </label>

                      <label className="file-field">
                        <span>Profile picture</span>
                        <input accept="image/*" onChange={handleProfileImageChange} type="file" />
                      </label>

                      <button className="primary-button" disabled={busy.profile} type="submit">
                        {busy.profile ? "Saving..." : "Save Profile"}
                      </button>
                    </form>
                  </div>

                  <div className="panel">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Your posts</p>
                        <h2>Everything you have shared</h2>
                      </div>
                    </div>

                    <div className="post-stack compact">
                      {profilePosts.length ? (
                        profilePosts.map((post) => (
                          <PostCard
                            key={post.id}
                            busy={busy}
                            comments={commentsByPost[post.id] || []}
                            commentDraft={commentDrafts[post.id] || ""}
                            isCommentsOpen={Boolean(commentPanels[post.id])}
                            onCommentDraftChange={(value) =>
                              setCommentDrafts((current) => ({ ...current, [post.id]: value }))
                            }
                            onCommentSubmit={() => handleCommentSubmit(post.id)}
                            onLikeToggle={() => handleLikeToggle(post)}
                            onReplyDraftChange={(commentId, value) =>
                              setReplyDrafts((current) => ({ ...current, [commentId]: value }))
                            }
                            onReplyToggle={(commentId) =>
                              setReplyingTo((current) => ({ ...current, [commentId]: !current[commentId] }))
                            }
                            onReplySubmit={(commentId) => handleCommentSubmit(post.id, commentId)}
                            onToggleComments={() => toggleComments(post.id)}
                            post={post}
                            replyDrafts={replyDrafts}
                            replyingTo={replyingTo}
                          />
                        ))
                      ) : (
                        <EmptyState
                          body="Use the composer on Home to publish your first campus note."
                          title="No profile posts yet"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        <aside className="right-rail">
          <section className="panel trend-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Trending on Campus</p>
                <h2>Live signal board</h2>
              </div>
              <TrendIcon />
            </div>

            <div className="trend-list">
              {trending.length ? (
                trending.map((topic) => (
                  <article className="trend-item" key={topic.name}>
                    <small>Trending</small>
                    <strong>{topic.name}</strong>
                    <p>{formatCount(topic.posts_count || 0)} posts</p>
                  </article>
                ))
              ) : (
                <EmptyState
                  body="Once more students post and reuse topics, this panel will light up."
                  title="Trends will show up here"
                />
              )}
            </div>
          </section>

          <section className="panel suggestion-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Campus crew</p>
                <h2>People to follow</h2>
              </div>
            </div>

            <div className="suggestion-list">
              {suggestedUsers.length ? (
                suggestedUsers.map((user) => (
                  <article className="suggestion-item" key={user.id}>
                    <Avatar user={user} />
                    <div>
                      <strong>@{user.username}</strong>
                      <p>{user.bio || "Ready to connect across classes and clubs."}</p>
                    </div>
                    <button
                      className="pill-button"
                      disabled={busy.followId === user.id}
                      onClick={() => handleFollowToggle(user)}
                      type="button"
                    >
                      {busy.followId === user.id ? "..." : user.is_following ? "Following" : "Follow"}
                    </button>
                  </article>
                ))
              ) : (
                <EmptyState
                  body="Add a few users and come back here for smarter recommendations."
                  title="Suggestions are syncing"
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
