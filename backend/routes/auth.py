import os

import redis
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

# Redis client for token revocation
jwt_redis_blocklist = redis.StrictRedis(
    host="localhost", port=6379, db=0, decode_responses=True
)


@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    token_in_redis = jwt_redis_blocklist.get(jti)
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
signUp_args.add_argument("confirmPassword", type=str, required=True)

login_args = reqparse.RequestParser()
login_args.add_argument("email", type=str, required=True)
login_args.add_argument("password", type=str, required=True)


class UserRegister(Resource):
    def post(self):
        data = signUp_args.parse_args()

        if User.query.filter_by(email=data["email"].lower()).first():
            abort(409, detail="User is already registered.")

        if data["password"] != data["confirmPassword"]:
            abort(422, detail="Passwords do not match")

        new_user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"].lower(),
        )
        new_user.set_password(data["password"])

        try:
            db.session.add(new_user)
            db.session.commit()
        except SQLAlchemyError as e:
            db.session.rollback()
            abort(500, detail=str(e))

        token = create_access_token(identity=str(new_user.id))
        return {
            "detail": f"User {new_user.email} successfully created",
            "access_token": token,
        }, 201


class Login(Resource):
    def post(self):
        data = login_args.parse_args()
        user = User.query.filter_by(email=data["email"].lower()).first()

        if not user or not user.check_password(data["password"]):
            abort(401, detail="Invalid email or password")

        token = create_access_token(identity=str(user.id))
        return {"access_token": token, "user_id": user.id}, 200


class UserLogout(Resource):
    @jwt_required()
    def post(self):
        jti = get_jwt()["jti"]
        jwt_redis_blocklist.set(jti, "", ex=7200)
        return {"message": "Successfully logged out"}, 200


class GoogleAuth(Resource):
    def post(self):
        id_token_str = request.json.get("id_token")

        try:
            idinfo = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                current_app.config["GOOGLE_CLIENT_ID"],
            )

            user = User.query.filter_by(email=idinfo["email"]).first()
            if not user:
                name_parts = idinfo.get("name", "Google User").split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                user = User(
                    first_name=first_name,
                    last_name=last_name,
                    email=idinfo["email"],
                )
                user.set_password(os.urandom(24).hex())
                db.session.add(user)
                db.session.commit()

            token = create_access_token(identity=str(user.id))
            return {"access_token": token, "user_id": user.id}, 200

        except ValueError as e:
            return {"message": "Invalid token", "error": str(e)}, 400
        except SQLAlchemyError as e:
            db.session.rollback()
            return {"message": "Database error", "error": str(e)}, 500


api.add_resource(UserRegister, "/register")
api.add_resource(Login, "/login")
api.add_resource(UserLogout, "/logout")
api.add_resource(GoogleAuth, "/google")
