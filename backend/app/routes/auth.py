from flask import Blueprint, request
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import User


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}

    required_fields = [
        "email",
        "password",
        "first_name",
        "last_name",
    ]

    missing = [
        field
        for field in required_fields
        if not data.get(field)
    ]

    if missing:
        return {
            "error": "Missing required fields",
            "fields": missing,
        }, 400

    email = data["email"].strip().lower()

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:
        return {
            "error": "A user with this email already exists"
        }, 409

    user = User(
        email=email,
        first_name=data["first_name"].strip(),
        last_name=data["last_name"].strip(),
    )

    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    return {
        "message": "User registered successfully",
        "user": user.to_dict(),
    }, 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return {
            "error": "Email and password are required"
        }, 400

    user = User.query.filter_by(
        email=email
    ).first()

    if not user or not user.check_password(password):
        return {
            "error": "Invalid email or password"
        }, 401

    access_token = create_access_token(
        identity=str(user.id)
    )

    return {
        "access_token": access_token,
        "user": user.to_dict(),
    }