from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import build_access_token, build_refresh_token, resolve_user_from_token
from .models import Follow, User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserSerializer(user, context={"request": request}).data
        return Response(
            {
                "user": user_data,
                "access": build_access_token(user),
                "refresh": build_refresh_token(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get("username") or request.data.get("email") or request.data.get("identifier")
        password = request.data.get("password")

        if not identifier or not password:
            return Response({"error": "Username or email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        username = identifier
        if "@" in identifier:
            matched_user = User.objects.filter(email__iexact=identifier).first()
            if matched_user:
                username = matched_user.username

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "access": build_access_token(user),
                "refresh": build_refresh_token(user),
            }
        )


class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = resolve_user_from_token(refresh_token, "refresh")
        return Response({"access": build_access_token(user)})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.all().order_by("username")
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(bio__icontains=search)
            )

        if self.request.query_params.get("exclude_self") == "true" and self.request.user.is_authenticated:
            queryset = queryset.exclude(pk=self.request.user.pk)

        return queryset


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            user_to_follow = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user == user_to_follow:
            return Response({"error": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follow, created = Follow.objects.get_or_create(follower=request.user, following=user_to_follow)
        message = (
            f"You are now following {user_to_follow.username}."
            if created
            else f"You are already following {user_to_follow.username}."
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({"message": message}, status=response_status)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            follow = Follow.objects.get(follower=request.user, following_id=user_id)
        except Follow.DoesNotExist:
            return Response({"error": "You are not following this user."}, status=status.HTTP_400_BAD_REQUEST)

        username = follow.following.username
        follow.delete()
        return Response({"message": f"You have unfollowed {username}."}, status=status.HTTP_200_OK)


class FollowersListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        return User.objects.filter(following__following_id=user_id).order_by("username")


class FollowingListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        return User.objects.filter(followers__follower_id=user_id).order_by("username")
