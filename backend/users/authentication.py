from django.core import signing
from rest_framework import authentication, exceptions

from .models import User

ACCESS_TOKEN_MAX_AGE = 60 * 60
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7
ACCESS_TOKEN_SALT = "users.auth.access"
REFRESH_TOKEN_SALT = "users.auth.refresh"


def build_token(user: User, token_type: str) -> str:
    if token_type not in {"access", "refresh"}:
        raise ValueError("Unsupported token type.")

    salt = ACCESS_TOKEN_SALT if token_type == "access" else REFRESH_TOKEN_SALT
    payload = {"user_id": user.pk, "type": token_type}
    return signing.dumps(payload, salt=salt)


def build_access_token(user: User) -> str:
    return build_token(user, "access")


def build_refresh_token(user: User) -> str:
    return build_token(user, "refresh")


def resolve_user_from_token(token: str, token_type: str) -> User:
    if token_type not in {"access", "refresh"}:
        raise exceptions.AuthenticationFailed("Unsupported token type.")

    salt = ACCESS_TOKEN_SALT if token_type == "access" else REFRESH_TOKEN_SALT
    max_age = ACCESS_TOKEN_MAX_AGE if token_type == "access" else REFRESH_TOKEN_MAX_AGE

    try:
        payload = signing.loads(token, salt=salt, max_age=max_age)
    except signing.SignatureExpired as exc:
        raise exceptions.AuthenticationFailed("Token has expired.") from exc
    except signing.BadSignature as exc:
        raise exceptions.AuthenticationFailed("Invalid token.") from exc

    if payload.get("type") != token_type:
        raise exceptions.AuthenticationFailed("Invalid token type.")

    try:
        return User.objects.get(pk=payload["user_id"], is_active=True)
    except User.DoesNotExist as exc:
        raise exceptions.AuthenticationFailed("User not found.") from exc


class SignedTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header:
            return None

        if len(header) != 2 or header[0].decode().lower() != self.keyword.lower():
            raise exceptions.AuthenticationFailed("Authorization header must use Bearer tokens.")

        token = header[1].decode()
        user = resolve_user_from_token(token, "access")
        return (user, token)
