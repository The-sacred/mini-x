from django.urls import path

from .views import (
    FollowersListView,
    FollowingListView,
    FollowUserView,
    LoginView,
    ProfileView,
    RefreshTokenView,
    RegisterView,
    UnfollowUserView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token_refresh"),
    path("profile/", ProfileView.as_view(), name="user_profile"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("follow/<int:user_id>/", FollowUserView.as_view(), name="follow"),
    path("unfollow/<int:user_id>/", UnfollowUserView.as_view(), name="unfollow"),
    path("users/<int:user_id>/followers/", FollowersListView.as_view(), name="followers-list"),
    path("users/<int:user_id>/following/", FollowingListView.as_view(), name="following-list"),
]
