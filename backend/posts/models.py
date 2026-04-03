from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

def post_image_upload_path(instance, filename):
        return f"posts/user_{instance.author.id}/{filename}" 

class Post(models.Model):
        author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
        content = models.TextField(max_length=600)
        image = models.ImageField(upload_to=post_image_upload_path, blank=True, null=True)
        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)
        is_deleted = models.BooleanField(default=False)

        parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')


        def __str__(self):
                return f"Post by {self.author.email} at {self.created_at}"

class Comment(models.Model):
        author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
        post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
        content = models.TextField(max_length=300)
        is_deleted = models.BooleanField(default=False)
        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)

        class Meta:
                ordering = ['created_at']
                indexes = [
                        models.Index(fields=['author']),
                        models.Index(fields=['post'])
                ]


        def __str__(self) -> str:
                return self.content[:20]

class Like(models.Model):
        post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
        author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
        created_at = models.DateTimeField(auto_now_add=True)

        class Meta:
                constraints = [
                        models.UniqueConstraint(
                                fields=['post', 'author'],
                                name='unique_like')
                ]
                indexes = [
                        models.Index(fields=['post']),
                        models.Index(fields=['author'])
                ]
                
        def __str__(self):
                return f"{self.author.username} liked Post {self.post}"       

