"""
JWT-based authentication for the demo.

Users are defined in the AUTH_USERS env var as a JSON object mapping
email/username to a werkzeug password hash. Tokens are HS256 JWTs signed
with JWT_SECRET, valid for JWT_TTL_HOURS hours (default 8).

Helper to generate a password hash:

    python -c "from werkzeug.security import generate_password_hash; \
print(generate_password_hash('your-password-here'))"

In-memory rate limit is per replica. Container App is configured with
min=0 max=1 replicas so this is sufficient for the demo. For multi-replica
deploys, replace with Redis or similar shared state.
"""

import json
import os
import time
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import jsonify, request
from werkzeug.security import check_password_hash


# ----- Config (env-driven) -----
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-me')
JWT_ALGO = 'HS256'
JWT_TTL_HOURS = int(os.getenv('JWT_TTL_HOURS', '8'))

MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 60


# ----- User store -----
def _load_users() -> dict:
    """Parse AUTH_USERS JSON env var. Returns {} on empty or invalid."""
    raw = os.getenv('AUTH_USERS', '').strip()
    if not raw:
        return {}
    try:
        users = json.loads(raw)
        if not isinstance(users, dict):
            return {}
        return users
    except json.JSONDecodeError:
        return {}


USERS = _load_users()


# ----- Rate limiting (in-memory, per replica) -----
_attempts: dict = {}


def _is_locked(username: str) -> bool:
    rec = _attempts.get(username)
    if not rec:
        return False
    count, last_ts = rec
    if count >= MAX_ATTEMPTS and (time.time() - last_ts) < LOCKOUT_SECONDS:
        return True
    if (time.time() - last_ts) > LOCKOUT_SECONDS:
        _attempts.pop(username, None)
    return False


def _record(username: str, success: bool) -> None:
    if success:
        _attempts.pop(username, None)
        return
    count, _ = _attempts.get(username, (0, 0))
    _attempts[username] = (count + 1, time.time())


# ----- Token helpers -----
def create_token(username: str) -> str:
    payload = {
        'sub': username,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def verify_token(token: str):
    """Returns (payload_dict, None) on success, (None, error_str) otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, 'expired'
    except jwt.InvalidTokenError:
        return None, 'invalid'


# ----- Public API -----
def authenticate(username: str, password: str):
    """
    Returns (token, None) on success.
    Returns (None, 'locked' | 'invalid') on failure.
    """
    if not username or not password:
        return None, 'invalid'

    if _is_locked(username):
        return None, 'locked'

    hashed = USERS.get(username)
    if not hashed or not check_password_hash(hashed, password):
        _record(username, False)
        return None, 'invalid'

    _record(username, True)
    return create_token(username), None


def require_auth(f):
    """Decorator. Require Bearer JWT on the request. Sets request.user."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or malformed Authorization header'}), 401
        token = auth_header[len('Bearer '):].strip()
        payload, err = verify_token(token)
        if err:
            return jsonify({'error': f'Token {err}'}), 401
        request.user = payload.get('sub')
        return f(*args, **kwargs)
    return wrapper
