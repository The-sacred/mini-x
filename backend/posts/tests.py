from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.authentication import build_access_token
from users.models import User

from .models import Comment, Post


class PostApiTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="sarah",
            email="sarah@uninet.edu",
            password="strong-pass-123",
        )
        self.reader = User.objects.create_user(
            username="mike",
            email="mike@uninet.edu",
            password="strong-pass-123",
        )
        self.post = Post.objects.create(
            author=self.author,
            content="Just finished my CS final. #Finals2025 Research Tuesday was intense.",
        )

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {build_access_token(user)}")

    def test_like_comment_and_nested_replies_are_returned(self):
        self.authenticate(self.reader)

        like_response = self.client.post(reverse("like-post", kwargs={"post_id": self.post.id}))
        self.assertEqual(like_response.status_code, status.HTTP_201_CREATED)

        comment_response = self.client.post(
            reverse("comment-create", kwargs={"post_id": self.post.id}),
            {"content": "That exam was rough."},
            format="json",
        )
        self.assertEqual(comment_response.status_code, status.HTTP_201_CREATED)
        parent_comment_id = comment_response.data["id"]

        reply_response = self.client.post(
            reverse("comment-create", kwargs={"post_id": self.post.id}),
            {"content": "At least it is over now.", "parent": parent_comment_id},
            format="json",
        )
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)

        post_detail = self.client.get(reverse("post-detail", kwargs={"pk": self.post.id}))
        self.assertEqual(post_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(post_detail.data["likes_count"], 1)
        self.assertTrue(post_detail.data["is_liked"])
        self.assertEqual(post_detail.data["comments_count"], 2)

        comments_response = self.client.get(reverse("post-comments", kwargs={"post_id": self.post.id}))
        self.assertEqual(comments_response.status_code, status.HTTP_200_OK)
        self.assertEqual(comments_response.data["count"], 1)
        self.assertEqual(comments_response.data["results"][0]["replies_count"], 1)

    def test_trending_endpoint_surfaces_ranked_topics(self):
        Post.objects.create(
            author=self.author,
            content="Library is packed today. #Finals2025 Campus Life gets louder near Student Union Elections.",
        )
        Post.objects.create(
            author=self.reader,
            content="Campus Life feels electric this week. #CampusLife #Finals2025",
        )
        Comment.objects.create(author=self.reader, post=self.post, content="Go team.")

        self.authenticate(self.reader)
        trending_response = self.client.get(reverse("trending-topics"))

        self.assertEqual(trending_response.status_code, status.HTTP_200_OK)
        trend_names = [item["name"] for item in trending_response.data["topics"]]
        self.assertIn("#Finals2025", trend_names)
        self.assertTrue(any(name in {"Campus Life", "Student Union Elections"} for name in trend_names))
