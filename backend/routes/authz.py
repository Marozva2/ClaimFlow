from functools import wraps

from flask_jwt_extended import get_jwt_identity
from flask_restful import abort
from models import User, db


def current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        abort(401, message="User no longer exists.")
    return user


def roles_required(*roles):
    def decorator(function):
        @wraps(function)
        def wrapped(*args, **kwargs):
            user = current_user()
            if user.role not in roles:
                abort(403, message="You are not authorized to perform this action.")
            return function(*args, **kwargs)

        return wrapped

    return decorator


def is_staff(user):
    return user.role in ("claims_officer", "admin")
