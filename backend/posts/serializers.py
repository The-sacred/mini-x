from rest_framework import serializers

from users.models import User

from .models import Comment, Like, Post


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "bio", "profile_picture"]


class PostSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "image",
            "parent",
            "replies",
            "created_at",
            "updated_at",
            "likes_count",
            "comments_count",
            "is_liked",
        ]
        read_only_fields = [
            "id",
            "author",
            "created_at",
            "updated_at",
            "likes_count",
            "comments_count",
            "is_liked",
            "replies",
        ]

    def get_replies(self, obj):
        if not obj.replies.exists():
            return []
        serializer = PostSerializer(obj.replies.filter(is_deleted=False), many=True, context=self.context)
        return serializer.data

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(author=request.user).exists()
        return False


class LikeSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ["id", "author", "post", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "author",
            "post",
            "content",
            "parent",
            "replies",
            "replies_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at", "replies", "replies_count"]

    def get_replies(self, obj):
        replies = obj.replies.filter(is_deleted=False)
        return CommentSerializer(replies, many=True, context=self.context).data

    def get_replies_count(self, obj):
        return obj.replies.filter(is_deleted=False).count()
