from rest_framework import serializers

from .models import Follow, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "bio",
            "profile_picture",
            "created_at",
            "updated_at",
            "followers_count",
            "following_count",
            "posts_count",
            "is_following",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_posts_count(self, obj):
        return obj.posts.filter(is_deleted=False, parent__isnull=True).count()

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user == obj:
            return False
        return obj.followers.filter(follower=request.user).exists()


class FollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ["id", "follower", "following", "created_at"]
        read_only_fields = ["follower", "created_at"]
