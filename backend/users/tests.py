from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthenticationFlowTests(APITestCase):
    def test_register_login_refresh_and_profile(self):
        register_response = self.client.post(
            reverse("register"),
            {
                "username": "campusmaker",
                "email": "maker@uninet.edu",
                "password": "strong-pass-123",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", register_response.data)
        self.assertIn("refresh", register_response.data)

        access_token = register_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        profile_response = self.client.get(reverse("user_profile"))
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["username"], "campusmaker")

        login_response = self.client.post(
            reverse("login"),
            {"email": "maker@uninet.edu", "password": "strong-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data["user"]["username"], "campusmaker")

        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": register_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_user_search_can_exclude_current_user(self):
        current_user = User.objects.create_user(
            username="current",
            email="current@uninet.edu",
            password="strong-pass-123",
        )
        User.objects.create_user(
            username="campusfriend",
            email="friend@uninet.edu",
            password="strong-pass-123",
        )

        login_response = self.client.post(
            reverse("login"),
            {"username": "current", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.get(reverse("user-list"), {"search": "campus", "exclude_self": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [item["username"] for item in response.data["results"]]
        self.assertEqual(usernames, ["campusfriend"])
