from django.urls import path
from .views import RegisterView, ProfileView, FollowUserView, UnfollowUserView, FollowingListView, FollowersListView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='user_profile'),

    path('follow/<int:user_id>/', FollowUserView.as_view(), name='follow'),
    path('unfollow/<int:user_id>/', UnfollowUserView.as_view(), name='unfollow'),

    path('<int:user_id>/followers', FollowersListView.as_view()),
    path('<int:user_id>/following', FollowingListView.as_view())


]
