from rest_framework import serializers
from .models import Post, Like, Comment
from users.models import User

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username']

class PostSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id',
            'author',
            'content',
            'image',
            'parent',
            'created_at',
            'updated_at',
            'likes_count',
            'is_liked'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'likes_count', 'is_liked']

    def get_replies(self, obj):
        if obj.replies.exists():
            return PostSerializer(obj.replies.filter(is_deleted=False), many=True).data
        return [] 
    
    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            return obj.likes.filter(user=user).exists()
        return False

class LikeSerializer(serializers.ModelSerializer):
    user = AuthorSerializer(read_only=True)
    

    class Meta:
        model = Like
        fields = ['id','user', 'post', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [ 'id',
            'author',
            'post',
            'content',
            'parent',
            'replies',
            'created_at',
            'updated_at'
            ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_replies(self, obj):
        replies = obj.replies.filter(is_deleted=False)
        return CommentSerializer(replies, many=True, context=self.context).data 

    def get_comments_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()   
    
