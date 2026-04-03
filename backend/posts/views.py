from django.shortcuts import render
from rest_framework import generics, permissions
from .models import Post, Like, Comment
from users.models import Follow
from .serializers import PostSerializer, CommentSerializer
from .permissions import IsAuthorOrReadOnly
from rest_framework.views import APIView
from rest_framework.response import Response

# Create your views here.

class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.filter(is_deleted=False, parent=None).order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.filter(is_deleted=False)
    serializer_class = PostSerializer
    permission_classes = [IsAuthorOrReadOnly]
    lookup_field = 'pk'

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save() 


class LikePostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response({"error": "Post not found"}, status=404)

        like, created = Like.objects.get_or_create(user=request.user, post=post)

        if not created:
            return Response({"message": "Already liked"}, status=400)

        return Response({"message": "Post liked"}, status=201)


class UnlikePostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            like = Like.objects.get(user=request.user, post_id=post_id)
            like.delete()
            return Response({"message": "Post unliked"}, status=200)
        except Like.DoesNotExist:
            return Response({"error": "You haven't liked this post"}, status=400)

class CreateCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response({"error": "Post not found"}, status=404)

        content = request.data.get('content')
        parent_id = request.data.get('parent')

        if not content:
            return Response({"error": "Content is required"}, status=400)

        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id)
            except Comment.DoesNotExist:
                return Response({"error": "Parent comment not found"}, status=404)

        comment = Comment.objects.create(
            author=request.user,
            post=post,
            content=content,
            parent=parent
        )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=201)
    
class PostCommentsView(generics.ListAPIView):
    serializer_class = CommentSerializer

    def get_queryset(self): # type: ignore[override]
        post_id = self.kwargs['post_id']

        return Comment.objects.filter(
            post_id=post_id,
            parent__isnull=True,  # only top-level comments
            is_deleted=False
        ).select_related('author').prefetch_related('replies')  
          
class DeleteCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if comment.author != request.user:
            return Response({"error": "Not allowed"}, status=403)

        comment.is_deleted = True
        comment.save()

        return Response({"message": "Comment deleted"})  
      
class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): # type: ignore[override]
        user = self.request.user

        following_ids = Follow.objects.filter(
            follower=user
        ).values_list('following_id', flat=True)

        user_ids = list(following_ids) + [user.pk]

        # 🔥 If user follows no one
        if len(following_ids) == 0:
            queryset = Post.objects.filter(is_deleted=False)
        else:
            queryset = Post.objects.filter(
                author_id__in=user_ids,
                is_deleted=False
            )

        queryset = queryset.select_related('author').prefetch_related('likes')
        queryset = queryset.order_by('-created_at')

        return queryset