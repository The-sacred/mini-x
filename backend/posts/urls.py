from django.urls import path

from .views import (
    CreateCommentView,
    DeleteCommentView,
    FeedView,
    LikePostView,
    PostCommentsView,
    PostDetailView,
    PostListCreateView,
    TrendingTopicsView,
    UnlikePostView,
)

urlpatterns = [
    path("posts/", PostListCreateView.as_view(), name="post-list-create"),
    path("posts/<int:pk>/", PostDetailView.as_view(), name="post-detail"),
    path("posts/<int:post_id>/like/", LikePostView.as_view(), name="like-post"),
    path("posts/<int:post_id>/unlike/", UnlikePostView.as_view(), name="unlike-post"),
    path("posts/<int:post_id>/comments/", PostCommentsView.as_view(), name="post-comments"),
    path("posts/<int:post_id>/comments/create/", CreateCommentView.as_view(), name="comment-create"),
    path("comments/<int:comment_id>/delete/", DeleteCommentView.as_view(), name="comment-delete"),
    path("feed/", FeedView.as_view(), name="feed"),
    path("trending/", TrendingTopicsView.as_view(), name="trending-topics"),
]
