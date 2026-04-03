from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from .models import User, Follow
from .serializers import RegisterSerializer, UserSerializer
from django.db.models import QuerySet
from typing import Any


# Create your views here.
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny] 

class ProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

# Follow and unfollow views    
class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated] 

    def post(self, request, user_id):
        try:
            user_to_follow = User.objects.get(id= user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)       
        
        if request.user == user_to_follow:
            return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        
        follow, created = Follow.objects.get_or_create(follower=request.user, following=user_to_follow)

        if created:
            return Response({'message': f'You are now following {user_to_follow.email}.'}, status=status.HTTP_201_CREATED)
        else:   
            
            return Response({'message': f'You are already following {user_to_follow.email}.'}, status=status.HTTP_200_OK)
        

class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            follow = Follow.objects.get(follower=request.user, following_id=user_id)
            follow.delete()
            return Response({'message': f'You have unfollowed {follow.following.email}.'}, status=status.HTTP_200_OK)
        except Follow.DoesNotExist:
            return Response({'error': 'You are not following this user.'}, status=status.HTTP_400_BAD_REQUEST)
        
#Listing followers and following user
class FollowersListView(generics.ListAPIView):
    serializer_class = UserSerializer
    
    def get_queryset(self): # type: ignore[override]
        user_id = self.kwargs['user_id']
        return User.objects.filter(following__following_id=user_id)

    
class FollowingListView(generics.ListAPIView):
    serializer_class = UserSerializer

    def get_queryset(self): # type: ignore[override]
        user_id = self.kwargs['user_id']
        return User.objects.filter(follower__follower_id=user_id)
        
