import os
import time

from flask import Blueprint, current_app, request
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    jwt_required,
)
from flask_restful import Api, Resource, abort, reqparse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from models import User, db
from sqlalchemy.exc import SQLAlchemyError

# Initialize extensions without attaching an app immediately
bcrypt = Bcrypt()
jwt = JWTManager()

auth_bp = Blueprint("auth_bp", __name__)
api = Api(auth_bp)


@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    if not current_app.config.get("JWT_BLOCKLIST_ENABLED", True):
        return False
    jti = jwt_payload["jti"]
    token_in_redis = current_app.extensions["jwt_redis_blocklist"].get(jti)
    return token_in_redis is not None


# Parsers
signUp_args = reqparse.RequestParser()
signUp_args.add_argument(
    "first_name", type=str, required=True, help="First name is required"
)
signUp_args.add_argument(
    "last_name", type=str, required=True, help="Last name is required"
)
signUp_args.add_argument("email", type=str, required=True, help="Email is required")
signUp_args.add_argument(
    "password", type=str, required=True, help="Password is required"
)
login_args = reqparse.RequestParser()
login_args.add_argument("email", type=str, required=True)
login_args.add_argument("password", type=str, required=True)


class UserRegister(Resource):
    def post(self):
        data = signUp_args.parse_args()

        email = data["email"].strip().lower()
        first_name = data["first_name"].strip()
        last_name = data["last_name"].strip()
        if not first_name or not last_name:
            abort(422, message="First and last name must not be empty.")
        if len(data["password"]) < 8:
            abort(422, message="Password must contain at least 8 characters.")

        if User.query.filter_by(email=email).first():
            abort(409, detail="User is already registered.")

        new_user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
        )
        new_user.set_password(data["password"])

        try:
            db.session.add(new_user)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Unable to register account.")

        return {
            "message": "User registered successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "role": new_user.role,
                "created_at": new_user.created_at.isoformat(),
            },
        }, 201


class Login(Resource):
    def post(self):
        data = login_args.parse_args()
        user = User.query.filter_by(email=data["email"].strip().lower()).first()

        if not user or not user.check_password(data["password"]):
            abort(401, detail="Invalid email or password")

        token = create_access_token(identity=str(user.id))
        return {
            "access_token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "created_at": user.created_at.isoformat(),
            },
        }, 200


class UserLogout(Resource):
    @jwt_required()
    def post(self):
        claims = get_jwt()
        jti = claims["jti"]
        expires_in = max(claims["exp"] - int(time.time()), 1)
        current_app.extensions["jwt_redis_blocklist"].set(jti, "", ex=expires_in)
        return {"message": "Successfully logged out"}, 200


class GoogleAuth(Resource):
    def post(self):
        payload = request.get_json(silent=True) or {}
        id_token_str = payload.get("id_token")
        if not id_token_str:
            abort(400, message="Google credential is required.")

        try:
            idinfo = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                current_app.config["GOOGLE_CLIENT_ID"],
            )

            email = idinfo["email"].strip().lower()
            user = User.query.filter_by(email=email).first()
            if not user:
                name_parts = idinfo.get("name", "Google User").split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                user = User(
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                )
                user.set_password(os.urandom(24).hex())
                db.session.add(user)
                db.session.commit()

            token = create_access_token(identity=str(user.id))
            return {
                "access_token": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "created_at": user.created_at.isoformat(),
                },
            }, 200

        except ValueError as e:
            return {"message": "Invalid token", "error": str(e)}, 400
        except SQLAlchemyError:
            db.session.rollback()
            return {"message": "Unable to complete Google sign-in."}, 500


api.add_resource(UserRegister, "/register")
api.add_resource(Login, "/login")
api.add_resource(UserLogout, "/logout")
api.add_resource(GoogleAuth, "/google")
