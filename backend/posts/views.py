from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Follow

from .models import Comment, Like, Post
from .permissions import IsAuthorOrReadOnly
from .serializers import CommentSerializer, PostSerializer
from .services import build_trending_topics


def base_post_queryset():
    return (
        Post.objects.filter(is_deleted=False)
        .select_related("author")
        .prefetch_related("likes", "comments", "replies")
    )


class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = base_post_queryset()
        author_id = self.request.query_params.get("author")
        parent = self.request.query_params.get("parent")

        if author_id:
            queryset = queryset.filter(author_id=author_id)

        if parent is None:
            queryset = queryset.filter(parent__isnull=True)
        elif parent != "all":
            queryset = queryset.filter(parent_id=parent)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthorOrReadOnly]
    lookup_field = "pk"

    def get_queryset(self):
        return base_post_queryset()

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])


class LikePostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        like, created = Like.objects.get_or_create(author=request.user, post=post)
        if not created:
            return Response({"message": "Already liked."}, status=status.HTTP_200_OK)

        return Response({"message": "Post liked."}, status=status.HTTP_201_CREATED)


class UnlikePostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        deleted, _ = Like.objects.filter(author=request.user, post_id=post_id).delete()
        if not deleted:
            return Response({"error": "You have not liked this post."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Post unliked."}, status=status.HTTP_200_OK)


class CreateCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        content = (request.data.get("content") or "").strip()
        parent_id = request.data.get("parent")

        if not content:
            return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)

        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, post=post, is_deleted=False)
            except Comment.DoesNotExist:
                return Response({"error": "Parent comment not found."}, status=status.HTTP_404_NOT_FOUND)

        comment = Comment.objects.create(
            author=request.user,
            post=post,
            content=content,
            parent=parent,
        )

        serializer = CommentSerializer(comment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostCommentsView(generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        post_id = self.kwargs["post_id"]
        return (
            Comment.objects.filter(post_id=post_id, parent__isnull=True, is_deleted=False)
            .select_related("author")
            .prefetch_related("replies")
            .order_by("created_at")
        )


class DeleteCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id, is_deleted=False)
        except Comment.DoesNotExist:
            return Response({"error": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        if comment.author != request.user:
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_deleted = True
        comment.save(update_fields=["is_deleted"])
        return Response({"message": "Comment deleted."})


class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        following_ids = list(
            Follow.objects.filter(follower=user).values_list("following_id", flat=True)
        )

        user_ids = following_ids + [user.pk]
        queryset = base_post_queryset().filter(parent__isnull=True)

        if following_ids:
            queryset = queryset.filter(author_id__in=user_ids)

        return queryset.order_by("-created_at")


class TrendingTopicsView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        window_days = int(request.query_params.get("days", 14))
        recent_cutoff = timezone.now() - timedelta(days=max(window_days, 1))
        posts = base_post_queryset().filter(parent__isnull=True, created_at__gte=recent_cutoff)
        payload = build_trending_topics(posts, limit=6)
        payload["window_days"] = window_days
        return Response(payload)
